// admin.suriwiki.com 워커 — 정적 리포트는 ASSETS가 그대로 서빙하고, /upload/* 와 /api/* 만 이 워커가 처리한다.
// 업로드 구조(키워드 슬러그 = 메인 키워드 단위): 사업자등록증 · 사이트 정보(전화/블로그/유튜브/참고) · 카테고리별 사진·영상 · 메모 · 갤러리.
// 저장소: D1(DB) = 정보·메타데이터·메모. 파일 본문은 R2(FILES)가 있으면 R2, 없으면 D1(blobs 테이블, base64)에 둔다.
//       D1 방식은 카드 등록 없이 쓰는 임시 방식이라 사진·사업자등록증(1.2MB 이하, 화면에서 자동 축소)만 받고 동영상은 받지 않는다.
// 보안: authorize() 한 곳에서 접근을 통제한다. 지금은 로그인이 없다(나중에 Cloudflare Access JWT 검증을 이 함수에 넣는다).
//       네이버·구글 계정 비밀번호처럼 제3자 비밀번호는 받지도 저장하지도 않는다.
import { DEFAULT_PROFILE, resolveProfile } from '../scripts/site-defaults.mjs';
import SITE_IMAGES from './site-images-index.json';
import { TEMPLATES, DEFAULT_TEMPLATE, templateOf, templateList, setImages, homePage, regionPage, sangdamPage } from '../scripts/templates.mjs';
import REGISTRY from '../registry/sites.json';
import { allRegions, regionOf, setExtraRegions, extraRegions, romanize, RESERVED_REGION_SLUGS, normalizeGroup, groupPages, groupsToRegistry, registryToGroups, groupHost } from '../scripts/group-model.mjs';

const MAX_IMAGE = 50 * 1024 * 1024;
const MAX_VIDEO = 100 * 1024 * 1024;
const MAX_LICENSE = 10 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
const LICENSE_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const D1_MAX = 1_200_000; // D1 한 행 한도(2MB)에 base64를 넣기 위한 원본 상한
const PAGE_SIZE = 24;

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const err = (status, message) => json({ ok: false, error: message }, status);

// TODO(보안): Cloudflare Access 연동 시 여기서 Cf-Access-Jwt-Assertion 을 검증한다.
async function authorize(_request, _env) { return true; }

let schemaReady = false;
async function ensureSchema(db) {
  if (schemaReady) return;
  await db.batch([
    db.prepare('CREATE TABLE IF NOT EXISTS profile (slug TEXT PRIMARY KEY, phone TEXT, blog TEXT, youtube TEXT, reference TEXT, updated_at INTEGER)'),
    db.prepare('CREATE TABLE IF NOT EXISTS license (slug TEXT PRIMARY KEY, file_key TEXT, name TEXT, type TEXT, size INTEGER, ocr_text TEXT, updated_at INTEGER)'),
    db.prepare('CREATE TABLE IF NOT EXISTS files (id TEXT PRIMARY KEY, slug TEXT, category TEXT, name TEXT, type TEXT, size INTEGER, file_key TEXT, grp TEXT, created_at INTEGER)'),
    db.prepare('CREATE TABLE IF NOT EXISTS blobs (key TEXT PRIMARY KEY, type TEXT, data TEXT)'),
    db.prepare('CREATE TABLE IF NOT EXISTS ba_photos (slug TEXT, region TEXT, slot INTEGER, phase TEXT, type TEXT, size INTEGER, updated_at INTEGER, PRIMARY KEY (slug, region, slot, phase))'),
    db.prepare('CREATE TABLE IF NOT EXISTS groups (slug TEXT PRIMARY KEY, main_keyword TEXT, en TEXT, subs TEXT, regions TEXT, content TEXT, status TEXT, created_at INTEGER, updated_at INTEGER)'),
    db.prepare('CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT)'),
    db.prepare('CREATE TABLE IF NOT EXISTS regions_extra (slug TEXT PRIMARY KEY, name TEXT UNIQUE)'),
    db.prepare('CREATE TABLE IF NOT EXISTS ba_captions (slug TEXT, region TEXT, slot INTEGER, caption TEXT, PRIMARY KEY (slug, region, slot))'),
    db.prepare('CREATE TABLE IF NOT EXISTS region_intro (slug TEXT, region TEXT, intro TEXT, PRIMARY KEY (slug, region))'),
    db.prepare('CREATE TABLE IF NOT EXISTS shares (id TEXT PRIMARY KEY, created_at INTEGER)'),
    db.prepare('CREATE TABLE IF NOT EXISTS page_seen (page_key TEXT PRIMARY KEY, first_seen TEXT)'),
    db.prepare('CREATE TABLE IF NOT EXISTS rank_log (page_key TEXT, check_date TEXT, rank_position INTEGER, PRIMARY KEY (page_key, check_date))'),
    db.prepare('CREATE INDEX IF NOT EXISTS files_slug_cat ON files (slug, category, created_at)'),
    db.prepare('CREATE TABLE IF NOT EXISTS memos (id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT, category TEXT, content TEXT, created_at INTEGER)'),
  ]);
  for (const col of ['company', 'ceo', 'regno', 'address', 'kakao', 'services', 'instagram', 'threads', 'website', 'hours']) { try { await db.prepare(`ALTER TABLE profile ADD COLUMN ${col} TEXT`).run(); } catch (_) { /* 이미 있음 */ } }
  try { await db.prepare('ALTER TABLE groups ADD COLUMN template TEXT').run(); } catch (_) { /* 이미 있음 */ }
  await seedGroups(db);
  schemaReady = true;
}

// ── 파일 본문 저장: R2가 있으면 R2, 없으면 D1(blobs)
const b64enc = (buf) => { const u = new Uint8Array(buf); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s); };
const b64dec = (str) => { const s = atob(str); const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; };
const maxBytes = (env, kind) => (env.FILES ? { image: MAX_IMAGE, video: MAX_VIDEO, license: MAX_LICENSE }[kind] : D1_MAX);
async function putObj(env, db, key, request, type) {
  if (env.FILES) { await env.FILES.put(key, request.body, { httpMetadata: { contentType: type } }); return true; }
  const buf = await request.arrayBuffer();
  if (!buf.byteLength || buf.byteLength > D1_MAX) return false;
  await db.prepare('INSERT OR REPLACE INTO blobs (key, type, data) VALUES (?,?,?)').bind(key, type, b64enc(buf)).run();
  return true;
}
async function getObj(env, db, key, range) {
  if (env.FILES) return env.FILES.get(key, range ? { range } : undefined);
  const row = await db.prepare('SELECT data FROM blobs WHERE key=?').bind(key).first();
  if (!row) return null;
  const u = b64dec(row.data);
  return { body: u, size: u.byteLength };
}
async function delObj(env, db, key) {
  if (env.FILES) await env.FILES.delete(key); else await db.prepare('DELETE FROM blobs WHERE key=?').bind(key).run();
}

// 사이트 정보(푸터에 노출): 전화·카카오톡·블로그·유튜브·사업자 정보·관련 서비스 링크
const PROFILE_COLS = 'phone, blog, youtube, reference, company, ceo, regno, address, hours, kakao, instagram, threads, website, services';
const isUrl = (v) => /^https?:\/\//i.test(String(v || '').trim());
// 주소 입력 보정: 'blog.naver.com/abc' 처럼 https:// 없이 적어도 받아 주고, 주소 형태가 아니면 버린다.
const normUrl = (v) => { const t = clean(v, 300); if (!t) return ''; const u = isUrl(t) ? t : (/^[^\s/]+\.[^\s/]+/.test(t) ? `https://${t}` : ''); try { return u && new URL(u).hostname.includes('.') ? u : ''; } catch (_) { return ''; } };
const parseServices = (v) => { try { const a = JSON.parse(v || '[]'); return Array.isArray(a) ? a : []; } catch (_) { return []; } };
const cleanServices = (a) => (Array.isArray(a) ? a : []).map((x) => ({ name: clean(x?.name, 30), url: clean(x?.url, 300) })).filter((x) => x.name && isUrl(x.url)).slice(0, 8);
const shapeProfile = (row) => { const r = row || {}; return { ...r, services: parseServices(r.services) }; };

// ── 그룹(메인 키워드 = 사이트 1개 = 분양 단위): D1이 원본. 처음에는 registry/sites.json 의 8개를 시드로 넣는다.
async function seedGroups(db) {
  if ((await db.prepare('SELECT COUNT(*) n FROM groups').first()).n) return;
  const now = Date.now();
  await db.batch(registryToGroups(REGISTRY).map((g) => db.prepare('INSERT OR IGNORE INTO groups (slug, main_keyword, en, subs, regions, content, status, created_at, updated_at, template) VALUES (?,?,?,?,?,?,?,?,?,?)').bind(g.slug, g.main_keyword, g.en, JSON.stringify(g.subs), JSON.stringify(g.regions), JSON.stringify(g.content || {}), 'active', now, now, g.template || DEFAULT_TEMPLATE)));
}
const shapeGroup = (r) => ({ slug: r.slug, main_keyword: r.main_keyword, en: r.en || '', subs: JSON.parse(r.subs || '[]'), regions: JSON.parse(r.regions || '[]'), content: JSON.parse(r.content || '{}'), status: r.status, created_at: r.created_at, updated_at: r.updated_at, template: TEMPLATES[r.template] ? r.template : DEFAULT_TEMPLATE });
// 추가 지역을 먼저 읽어 카탈로그에 반영한 뒤 그룹을 읽는다(그룹이 쓰는 지역 주소를 풀려면 필요)
const loadGroups = async (db) => { setExtraRegions((await db.prepare('SELECT slug, name FROM regions_extra').all()).results); return (await db.prepare("SELECT * FROM groups WHERE status='active' ORDER BY created_at, slug").all()).results.map(shapeGroup); };
const getGroup = async (db, slug) => (await loadGroups(db)).find((g) => g.slug === slug) || null;
const regionsOf = (g) => g.regions.filter((r) => regionOf(r)).map((r) => ({ slug: r, name: regionOf(r).name })).sort((a, b) => a.name.localeCompare(b.name, 'ko'));
const categoriesOf = (g) => (g?.subs || []).map((name, i) => ({ id: `cat${i + 1}`, name }));

// 미리보기 렌더: 빌드와 같은 템플릿 코드를 워커에서 실행한다. 사진은 업로드한 것(없으면 기본 사진, 그것도 없으면 빈 칸).
// opt.live: 키워드 사이트 호스트에서 쓰는 실시간 렌더(사진 주소를 관리자 주소로 절대화, 링크 막기 없음). opt.kind: 'sangdam' 이면 상담 페이지
const LIVE_ORIGIN = 'https://admin.suriwiki.com';
async function renderPreview(env, g, tplId, regionSlug, opt = {}) {
  const db = env.DB, slug = g.slug, host = groupHost(slug);
  const profile = resolveProfile(shapeProfile(await db.prepare(`SELECT ${PROFILE_COLS} FROM profile WHERE slug=?`).bind(slug).first()));
  const ba = (await db.prepare('SELECT region, slot, phase, updated_at FROM ba_photos WHERE slug=?').bind(slug).all()).results;
  const caps = (await db.prepare('SELECT region, slot, caption FROM ba_captions WHERE slug=?').bind(slug).all()).results;
  const intros = (await db.prepare('SELECT region, intro FROM region_intro WHERE slug=?').bind(slug).all()).results;
  const has = (r, n, ph) => ba.find((x) => (x.region || '') === r && x.slot === n && x.phase === ph);
  const defaults = SITE_IMAGES[slug] || [];
  const reg = groupsToRegistry([g], REGISTRY), meta = { ...reg.site_meta[host], template: tplId }, pages = reg.pages;
  const names = new Set(defaults), src = {};
  const O = opt.live ? LIVE_ORIGIN : '';
  for (const n of defaults) src[n] = `${O}/site-images/${slug}/${n}.webp`;
  for (let n = 1; n <= 8; n++) {
    const r = regionSlug && has(regionSlug, n, 'before') && has(regionSlug, n, 'after') ? regionSlug : (has('', n, 'before') && has('', n, 'after') ? '' : null);
    if (r === null) continue;
    for (const ph of ['before', 'after']) { names.add(`ba-${n}-${ph}`); src[`ba-${n}-${ph}`] = `${O}/api/s/${slug}/ba/${r ? r + '/' : ''}${n}/${ph}?v=${has(r, n, ph).updated_at}`; }
  }
  setImages([...names], src);
  const captions = {}; for (const c of caps) if (!c.region) captions[c.slot] = c.caption; if (regionSlug) for (const c of caps) if (c.region === regionSlug) captions[c.slot] = c.caption;
  const media = { captions, intro: (intros.find((x) => x.region === regionSlug) || {}).intro || '' };
  const page = regionSlug ? pages.find((p) => p.region_slug === regionSlug) : null;
  let html = opt.kind === 'sangdam' ? sangdamPage({ site: host, meta, data: reg, profile, pages, media }) : page ? regionPage({ site: host, meta, page, pages, data: reg, profile, media }) : homePage({ site: host, meta, pages, data: reg, profile, media });
  if (opt.live) return html;
  html = html.replace('</body>', `<script>document.addEventListener('click',function(e){var a=e.target.closest('a');if(!a)return;var h=a.getAttribute('href')||'';if(h.charAt(0)==='/'&&h.indexOf('//')!==0){e.preventDefault();}},true);</script></body>`);
  return html;
}

// ── 리포트: 사이트·페이지 목록은 그룹(D1)(실제 배포 대상), 처음 만든 날은 D1(page_seen), 순위는 D1(rank_log)
const kstDate = (t = Date.now()) => new Date(t + 9 * 3600e3).toISOString().slice(0, 10);
const addDays = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
const pageKey = (p) => `${p.site}${p.page_path}`;

async function buildReport(env) {
  const db = env.DB, today = kstDate();
  const reg = groupsToRegistry(await loadGroups(db), REGISTRY), PAGES = reg.pages;
  const dates = Array.from({ length: 16 }, (_, i) => addDays(today, -i)); // 최신순
  // 새로 생긴 페이지는 처음 본 날을 기록한다(이미 있으면 그대로 둔다)
  for (let i = 0; i < PAGES.length; i += 80) await db.batch(PAGES.slice(i, i + 80).map((p) => db.prepare('INSERT OR IGNORE INTO page_seen (page_key, first_seen) VALUES (?,?)').bind(pageKey(p), today)));
  const seen = new Map((await db.prepare('SELECT page_key, first_seen FROM page_seen').all()).results.map((r) => [r.page_key, r.first_seen]));
  const logs = (await db.prepare('SELECT page_key, check_date, rank_position FROM rank_log WHERE check_date >= ?').bind(dates[dates.length - 1]).all()).results;
  const id = new Map(PAGES.map((p, i) => [pageKey(p), i + 1]));
  const checkedToday = new Set(logs.filter((r) => r.check_date === today).map((r) => r.page_key)).size;
  const lastCheck = (await db.prepare('SELECT MAX(check_date) d FROM rank_log').first())?.d || null;
  return {
    success: true, business_name: reg.business_name, generated_at: today, dates, site_meta: reg.site_meta,
    keywords: PAGES.map((p) => ({ id: id.get(pageKey(p)), keyword: p.h1_title, site: p.site, page_path: p.page_path, created_at: seen.get(pageKey(p)) || today })),
    ranks: logs.filter((r) => r.rank_position && id.has(r.page_key)).map((r) => ({ tracking_id: id.get(r.page_key), check_date: r.check_date, rank_position: r.rank_position })),
    pages: PAGES.map((p) => ({ ...p, first_seen: seen.get(pageKey(p)) || today })),
    templates: templateList(),
    rank_status: { configured: !!(env.NAVER_CLIENT_ID && env.NAVER_CLIENT_SECRET), noindex: !!reg.noindex, last_check: lastCheck, checked_today: checkedToday, total: PAGES.length },
  };
}

// 네이버 검색 Open API(웹문서) 상위 100건에서 우리 페이지 주소를 찾아 순위를 기록한다. 한 번에 30건만(서브요청 한도) — 30분마다 돌며 오늘 안 잰 페이지부터 처리한다.
async function collectRanks(env) {
  if (!env.NAVER_CLIENT_ID || !env.NAVER_CLIENT_SECRET) return { skipped: 'no-keys' };
  const db = env.DB, today = kstDate();
  await ensureSchema(db);
  const PAGES = groupsToRegistry(await loadGroups(db), REGISTRY).pages;
  const done = new Set((await db.prepare('SELECT page_key FROM rank_log WHERE check_date=?').bind(today).all()).results.map((r) => r.page_key));
  const todo = PAGES.filter((p) => !done.has(pageKey(p))).slice(0, 30);
  const writes = []; let stopped = '';
  for (const p of todo) {
    const res = await fetch(`${env.NAVER_API_BASE || 'https://openapi.naver.com'}/v1/search/webkr.json?query=${encodeURIComponent(p.h1_title)}&display=100&start=1`, { headers: { 'X-Naver-Client-Id': env.NAVER_CLIENT_ID, 'X-Naver-Client-Secret': env.NAVER_CLIENT_SECRET } });
    if (!res.ok) { stopped = `naver ${res.status}`; break; } // 한도·키 오류면 이번 회차는 멈추고 다음에 이어서
    const items = (await res.json()).items || [];
    const host = new URL(p.page_url).hostname, path = p.page_path.replace(/\/+$/, '');
    const idx = items.findIndex((it) => { try { const u = new URL(it.link); return u.hostname === host && u.pathname.replace(/\/+$/, '') === path; } catch (_) { return false; } });
    writes.push(db.prepare('INSERT OR REPLACE INTO rank_log (page_key, check_date, rank_position) VALUES (?,?,?)').bind(pageKey(p), today, idx >= 0 ? idx + 1 : null));
  }
  if (writes.length) await db.batch(writes);
  return { checked: writes.length, remaining: todo.length - writes.length, stopped };
}

// ── 리포트 이미지 공유: 브라우저가 캡처한 JPEG(1.2MB 이하)를 D1에 저장하고 주소를 돌려준다. 최근 30개만 보관한다.
async function saveShare(env, request) {
  const type = (request.headers.get('content-type') || '').split(';')[0];
  if (type !== 'image/jpeg') return err(415, 'JPEG 이미지만 가능합니다');
  const buf = await request.arrayBuffer();
  if (!buf.byteLength || buf.byteLength > D1_MAX) return err(413, '이미지가 너무 큽니다');
  const id = uid(), db = env.DB;
  await db.batch([
    db.prepare('INSERT INTO blobs (key, type, data) VALUES (?,?,?)').bind(`share/${id}`, type, b64enc(buf)),
    db.prepare('INSERT INTO shares (id, created_at) VALUES (?,?)').bind(id, Date.now()),
  ]);
  const old = (await db.prepare('SELECT id FROM shares ORDER BY created_at DESC LIMIT -1 OFFSET 30').all()).results;
  if (old.length) await db.batch(old.flatMap((r) => [db.prepare('DELETE FROM blobs WHERE key=?').bind(`share/${r.id}`), db.prepare('DELETE FROM shares WHERE id=?').bind(r.id)]));
  return json({ ok: true, id, url: `https://admin.suriwiki.com/share/${id}.jpg` });
}
async function readShare(env, id) {
  const row = await env.DB.prepare('SELECT data FROM blobs WHERE key=?').bind(`share/${id}`).first();
  if (!row) return new Response('Not found', { status: 404 });
  return new Response(b64dec(row.data), { headers: { 'content-type': 'image/jpeg', 'cache-control': 'public, max-age=31536000, immutable', 'x-robots-tag': 'noindex' } });
}

// ── 대시보드 로그인: 비밀번호 하나(기본값은 코드에 해시로만 둔다). 워커 시크릿 ADMIN_PASSWORD(또는 ADMIN_PASSWORD_HASH)를 등록하면 그 값이 우선한다.
//    세션은 서명된 쿠키(7일). 대시보드(/)와 관리 API(report·groups·regions·deploy·share)만 보호하고, 업로드 페이지와 사이트 빌드용 내보내기는 열려 있다.
const DEFAULT_ADMIN_HASH = '8aa65ead2de522e1fd71426b4774bbb5f8f1ca8947e95081d74de0ba79b72083';
const ADMIN_API = /^\/api\/(report|groups|regions|deploy|share)(\/|$)/;
const enc = new TextEncoder();
const toHex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
const sha256Hex = async (str) => toHex(await crypto.subtle.digest('SHA-256', enc.encode(str)));
const adminHash = async (env) => (env.ADMIN_PASSWORD ? sha256Hex(`suriwiki-admin:${env.ADMIN_PASSWORD}`) : String(env.ADMIN_PASSWORD_HASH || DEFAULT_ADMIN_HASH).toLowerCase());
const hmacHex = async (key, msg) => { const k = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']); return toHex(await crypto.subtle.sign('HMAC', k, enc.encode(msg))); };
const safeEq = (a, b) => { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; };
const sessionKey = async (env) => String(env.SESSION_SECRET || (await adminHash(env)));
async function makeSession(env) { const exp = Date.now() + 7 * 864e5; return `${exp}.${await hmacHex(await sessionKey(env), String(exp))}`; }
async function isAdmin(request, env) {
  const m = /(?:^|;\s*)admin_session=(\d+)\.([0-9a-f]{64})/.exec(request.headers.get('cookie') || '');
  if (!m || Number(m[1]) < Date.now()) return false;
  return safeEq(m[2], await hmacHex(await sessionKey(env), m[1]));
}
const cookie = (url, value, maxAge) => `admin_session=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${url.protocol === 'https:' ? '; Secure' : ''}`;
async function login(request, env, url) {
  const ip = request.headers.get('cf-connecting-ip') || 'local', key = `login_fail:${ip}`, now = Date.now();
  const [cnt, ts] = String((await env.DB.prepare('SELECT v FROM kv WHERE k=?').bind(key).first())?.v || '0|0').split('|').map(Number);
  if (cnt >= 5 && now - ts < 10 * 60e3) return json({ ok: false, error: '시도가 너무 많습니다. 10분 뒤에 다시 시도하세요.' }, 429);
  const b = await request.json().catch(() => ({}));
  const ok = typeof b.password === 'string' && b.password.length > 0 && safeEq(await sha256Hex(`suriwiki-admin:${b.password}`), await adminHash(env));
  if (!ok) { await env.DB.prepare('INSERT OR REPLACE INTO kv (k, v) VALUES (?,?)').bind(key, `${now - ts < 10 * 60e3 ? cnt + 1 : 1}|${now}`).run(); return json({ ok: false, error: '비밀번호가 맞지 않습니다.' }, 401); }
  await env.DB.prepare('DELETE FROM kv WHERE k=?').bind(key).run();
  const res = json({ ok: true }); res.headers.append('set-cookie', cookie(url, await makeSession(env), 7 * 86400)); return res;
}
const loginPage = () => new Response(`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>수리위키 관리자 로그인</title>
<style>*{box-sizing:border-box}body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#0b1e3f,#12356b);font-family:Pretendard,"Noto Sans KR",system-ui,sans-serif;padding:16px}
.c{background:#fff;border-radius:18px;padding:30px 26px;width:100%;max-width:360px;box-shadow:0 24px 60px rgba(0,0,0,.35)}h1{font-size:20px;margin:0 0 4px;color:#0f172a}p{margin:0 0 18px;font-size:13px;color:#64748b}
input{width:100%;padding:12px 14px;border:1px solid #cbd5e1;border-radius:10px;font-size:16px}button{width:100%;margin-top:12px;padding:13px;border:0;border-radius:10px;background:#1e3a8a;color:#fff;font-size:16px;font-weight:800;cursor:pointer}
.e{color:#dc2626;font-size:13px;min-height:20px;margin-top:10px}</style></head><body><form class="c" id="f"><h1>수리위키 관리자</h1><p>비밀번호를 입력하세요</p>
<input type="password" id="pw" autocomplete="current-password" autofocus placeholder="비밀번호"><button type="submit">로그인</button><div class="e" id="e"></div></form>
<script>document.getElementById('f').addEventListener('submit',async function(ev){ev.preventDefault();var e=document.getElementById('e');e.textContent='';
var r=await fetch('/api/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({password:document.getElementById('pw').value})});var j=await r.json().catch(function(){return{}});
if(j.ok){location.reload();}else{e.textContent=j.error||'로그인하지 못했습니다';}});</script></body></html>`, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow' } });

const clean = (v, max = 300) => String(v ?? '').trim().slice(0, max);
const uid = () => crypto.randomUUID().replace(/-/g, '');

export default {
  async scheduled(_event, env, ctx) { ctx.waitUntil(collectRanks(env)); },
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // 대시보드(/)는 로그인해야 열린다
    if (path === '/' || path === '/index.html') {
      if (!(await isAdmin(request, env))) return loginPage();
      const res = await env.ASSETS.fetch(request);
      const h = new Headers(res.headers); h.set('cache-control', 'no-store'); h.set('x-robots-tag', 'noindex, nofollow');
      return new Response(res.body, { status: res.status, headers: h });
    }

    // 둘러보기(읽기 전용) 대시보드: 로그인 없이 현황만 본다. 그룹 생성·수정·반영·공유는 숨기고, API도 읽기 전용 경로만 쓴다.
    if (path === '/demo' || path === '/demo/') {
      const res = await env.ASSETS.fetch(new Request(new URL('/', url), request));
      const html = (await res.text()).replace('</head>', '<script>window.SW_DEMO=1</script></head>');
      return new Response(html, { status: res.status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow' } });
    }

    // 키워드 사이트 실시간 렌더(로그인 불필요): 사이트 워커가, 지금 D1에 있는 지역 목록이 마지막 배포와 다를 때 이 주소로 홈·지역·상담 페이지를 받아 간다.
    //  /render/<주소>/_state → 지금 지역 목록,  /render/<주소>/ → 홈,  /render/<주소>/sangdam → 상담,  /render/<주소>/<지역>/ → 지역 페이지
    const rm = path.match(/^\/render\/([a-z0-9-]+)(?:\/([a-z0-9_-]+))?\/?$/);
    if (rm && request.method === 'GET') {
      await ensureSchema(env.DB);
      const lg = await getGroup(env.DB, rm[1]); if (!lg) return new Response('Not found', { status: 404 });
      const hdr = { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=60', ...(REGISTRY.noindex !== false ? { 'x-robots-tag': 'noindex, nofollow' } : {}) };
      if (rm[2] === '_state') return new Response(JSON.stringify({ ok: true, slug: lg.slug, regions: regionsOf(lg).map((r) => r.slug).sort() }), { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=30' } });
      if (rm[2] === 'sangdam') return new Response(await renderPreview(env, lg, lg.template, '', { live: true, kind: 'sangdam' }), { headers: hdr });
      if (rm[2] && !regionsOf(lg).some((r) => r.slug === rm[2])) return new Response('Not found', { status: 404 });
      return new Response(await renderPreview(env, lg, lg.template, rm[2] || '', { live: true }), { headers: hdr });
    }

    // 업로드 페이지: /upload/<slug>[/]
    const up = path.match(/^\/upload\/([a-z0-9-]+)\/?$/);
    if (up) {
      await ensureSchema(env.DB);
      if (!(await getGroup(env.DB, up[1]))) return new Response('Not found', { status: 404 });
      if (!(await authorize(request, env))) return new Response('Forbidden', { status: 403 });
      const page = await env.ASSETS.fetch(new Request(new URL('/upload/', url), request));
      const headers = new Headers(page.headers);
      headers.set('x-robots-tag', 'noindex, nofollow');
      headers.set('cache-control', 'no-store');
      return new Response(page.body, { status: page.status, headers });
    }
    if (path === '/upload' || path === '/upload/') return Response.redirect(`${url.origin}/`, 302);

    // 공유된 리포트 이미지(공개 주소)
    const sh = path.match(/^\/share\/([a-f0-9]{32})\.jpg$/);
    if (sh && request.method === 'GET') { await ensureSchema(env.DB); return readShare(env, sh[1]); }

    if (!path.startsWith('/api/')) return env.ASSETS.fetch(request);
    if (!(await authorize(request, env))) return err(403, 'forbidden');
    await ensureSchema(env.DB);

    if (path === '/api/login' && request.method === 'POST') return login(request, env, url);
    if (path === '/api/logout' && request.method === 'POST') { const res = json({ ok: true }); res.headers.append('set-cookie', cookie(url, '', 0)); return res; }
    // 관리 API는 로그인한 대시보드만 쓸 수 있다
    if (ADMIN_API.test(path) && !(await isAdmin(request, env))) return json({ ok: false, error: '로그인이 필요합니다', login: true }, 401);

    if (path === '/api/share' && request.method === 'PUT') return saveShare(env, request);


    // ── 그룹(메인 키워드 단위) 관리: 대시보드가 만들고 고친다. 만들면 사이트·업로드 페이지·지역 페이지가 같은 규칙으로 함께 생긴다.
    if (path === '/api/groups' && request.method === 'GET') {
      const gs = await loadGroups(env.DB);
      return json({ ok: true, regions: allRegions(), groups: gs.map((x) => ({ slug: x.slug, main_keyword: x.main_keyword, host: groupHost(x.slug), subs: x.subs, region_count: x.regions.length, template: x.template })), deploy: { enabled: !!env.GH_DISPATCH_TOKEN } });
    }
    const gm = path.match(/^\/api\/groups\/([a-z0-9-]+)$/);
    if (gm && request.method === 'GET') { const x = await getGroup(env.DB, gm[1]); return x ? json({ ok: true, group: x }) : err(404, '없는 그룹입니다'); }
    if (gm && request.method === 'PUT') {
      let body; try { body = await request.json(); } catch (_) { return err(400, '요청 형식이 올바르지 않습니다'); }
      const r = normalizeGroup(body, { slug: gm[1] });
      if (r.error) return err(400, r.error);
      const exists = await env.DB.prepare('SELECT status FROM groups WHERE slug=?').bind(r.value.slug).first();
      const v = r.value, now = Date.now();
      await env.DB.prepare('INSERT INTO groups (slug, main_keyword, en, subs, regions, content, status, created_at, updated_at, template) VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(slug) DO UPDATE SET main_keyword=excluded.main_keyword, en=excluded.en, subs=excluded.subs, regions=excluded.regions, content=excluded.content, status=\'active\', updated_at=excluded.updated_at')
        .bind(v.slug, v.main_keyword, v.en, JSON.stringify(v.subs), JSON.stringify(v.regions), JSON.stringify(v.content), 'active', now, now, TEMPLATES[body.template] ? body.template : DEFAULT_TEMPLATE).run();
      return json({ ok: true, created: !exists, group: v, host: groupHost(v.slug), upload: `/upload/${v.slug}/` });
    }

    // ── 지역 추가: 카탈로그에 없는 지역을 더한다. 주소(slug)는 비우면 한글에서 자동으로 만든다. 지역 페이지 주소는 /<slug>
    async function addRegion(name, slugIn, persist = true) {
      name = String(name || '').trim(); if (name.length < 1 || name.length > 12) return { error: '지역 이름은 1~12자로 입력하세요' };
      await loadGroups(env.DB);
      const hit = allRegions().find((r) => r.name === name); if (hit) return { region: hit, existed: true };
      const slug = String(slugIn || romanize(name)).toLowerCase();
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return { error: `'${name}'의 주소(영문)를 만들 수 없습니다. 영문 주소를 직접 입력하세요` };
      if (RESERVED_REGION_SLUGS.includes(slug) || regionOf(slug)) return { error: `지역 주소 '${slug}'는 이미 쓰이고 있습니다. 다른 주소를 입력하세요` };
      if (persist) await env.DB.prepare('INSERT INTO regions_extra (slug, name) VALUES (?,?)').bind(slug, name).run();
      setExtraRegions([...extraRegions(), { slug, name }]);
      return { region: { slug, name }, existed: false };
    }
    if (path === '/api/regions' && request.method === 'POST') {
      const b = await request.json().catch(() => ({}));
      const r = await addRegion(b.name, b.slug); if (r.error) return err(400, r.error);
      return json({ ok: true, region: r.region, existed: r.existed, regions: allRegions() });
    }
    // ── 키워드 일괄 등록: rows[{main_keyword, subs, regions(이름 또는 주소), slug?, en?, template?}]. apply=false 면 검증 결과만 돌려준다.
    if (path === '/api/groups/import' && request.method === 'POST') {
      const b = await request.json().catch(() => ({}));
      const rows = Array.isArray(b.rows) ? b.rows.slice(0, 200) : [];
      if (!rows.length) return err(400, '등록할 줄이 없습니다');
      const apply = b.apply === true, auto = b.auto_regions === true;
      const existing = await loadGroups(env.DB);
      const byKw = new Map(existing.map((x) => [x.main_keyword, x.slug])), taken = new Set(existing.map((x) => x.slug));
      const results = [], toWrite = [], newRegions = [];
      for (const [i, row] of rows.entries()) {
        const out = { line: i + 1, main_keyword: String(row.main_keyword || '').trim(), ok: false };
        try {
          const names = Array.isArray(row.regions) ? row.regions : String(row.regions || '').split(/[,，、|]/);
          const slugs = [], unknown = [], added = [];
          for (const raw of names.map((x) => String(x).trim()).filter(Boolean)) {
            const hit = allRegions().find((r) => r.slug === raw.toLowerCase() || r.name === raw);
            if (hit) { slugs.push(hit.slug); continue; }
            if (!auto) { unknown.push(raw); continue; }
            const r = await addRegion(raw, '', false); if (r.error) { unknown.push(raw); continue; }
            slugs.push(r.region.slug); if (!r.existed) added.push(r.region);
          }
          if (unknown.length) { out.error = `목록에 없는 지역: ${unknown.join(', ')} (자동 추가를 켜거나 지역을 먼저 추가하세요)`; results.push(out); continue; }
          // 같은 키워드가 이미 있으면 그 그룹을 갱신하고, 없으면 새로 만든다. 주소 이름은 입력 > 기존 > 한글 자동
          let slug = String(row.slug || '').trim().toLowerCase() || byKw.get(out.main_keyword) || romanize(out.main_keyword);
          const isUpdate = byKw.get(out.main_keyword) === slug;
          if (!isUpdate && taken.has(slug)) { let n = 2; while (taken.has(`${slug}-${n}`)) n++; slug = `${slug}-${n}`; }
          const r = normalizeGroup({ main_keyword: out.main_keyword, en: row.en, subs: row.subs, regions: slugs, content: row.content }, { slug });
          if (r.error) { out.error = r.error; results.push(out); continue; }
          Object.assign(out, { ok: true, slug: r.value.slug, action: isUpdate ? 'update' : 'create', region_count: r.value.regions.length, new_regions: added.map((x) => x.name), host: groupHost(r.value.slug) });
          taken.add(r.value.slug); byKw.set(out.main_keyword, r.value.slug);
          toWrite.push({ v: r.value, isUpdate, template: TEMPLATES[row.template] ? row.template : null }); newRegions.push(...added);
        } catch (e) { out.error = String(e.message || e).slice(0, 120); }
        results.push(out);
      }
      if (apply && toWrite.length) {
        const now = Date.now();
        const seenNew = new Set();
        for (const r of newRegions) if (!seenNew.has(r.slug)) { seenNew.add(r.slug); await env.DB.prepare('INSERT OR IGNORE INTO regions_extra (slug, name) VALUES (?,?)').bind(r.slug, r.name).run(); }
        await env.DB.batch(toWrite.map(({ v, isUpdate, template }) => env.DB.prepare('INSERT INTO groups (slug, main_keyword, en, subs, regions, content, status, created_at, updated_at, template) VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(slug) DO UPDATE SET main_keyword=excluded.main_keyword, en=excluded.en, subs=excluded.subs, regions=excluded.regions, content=CASE WHEN excluded.content=\'{"headline":"","lead":"","symptoms":[],"guide":{}}\' THEN groups.content ELSE excluded.content END, status=\'active\', updated_at=excluded.updated_at')
          .bind(v.slug, v.main_keyword, v.en, JSON.stringify(v.subs), JSON.stringify(v.regions), JSON.stringify(v.content), 'active', now, now, template || DEFAULT_TEMPLATE)));
      }
      return json({ ok: true, applied: apply, summary: { total: rows.length, ok: results.filter((x) => x.ok).length, failed: results.filter((x) => !x.ok).length, created: results.filter((x) => x.action === 'create').length, updated: results.filter((x) => x.action === 'update').length, new_regions: apply ? newRegions.length : 0 }, results });
    }

    // 사이트 빌드가 읽는 그룹 정의 전체(공개 정보만)
    if (path === '/api/export/groups' && request.method === 'GET') { const groups = await loadGroups(env.DB); return json({ ok: true, groups, regions: extraRegions() }); }
    // 지금 반영: GitHub Actions 배포를 바로 실행한다(토큰이 등록된 경우). 연타를 막으려고 60초에 한 번만 받는다.
    if (path === '/api/deploy' && request.method === 'POST') {
      if (!env.GH_DISPATCH_TOKEN) return json({ ok: false, error: 'not_configured', message: '지금 반영 기능은 GitHub 토큰(GH_DISPATCH_TOKEN) 등록 후 사용할 수 있습니다. 등록 전에는 매일 05:00(KST) 자동 배포 때 반영됩니다.' }, 200);
      const last = Number((await env.DB.prepare("SELECT v FROM kv WHERE k='deploy_at'").first())?.v || 0);
      if (Date.now() - last < 60000) return json({ ok: false, error: 'too_soon', message: '방금 배포를 요청했습니다. 1분 뒤에 다시 시도하세요.' }, 200);
      const r = await fetch('https://api.github.com/repos/playskang-svg/rsuri/actions/workflows/suriwiki-deploy.yml/dispatches', { method: 'POST', headers: { authorization: `Bearer ${env.GH_DISPATCH_TOKEN}`, accept: 'application/vnd.github+json', 'user-agent': 'suriwiki-admin', 'x-github-api-version': '2022-11-28' }, body: JSON.stringify({ ref: 'main' }) });
      if (r.status !== 204) return json({ ok: false, error: 'github', message: `GitHub 요청이 거절되었습니다(${r.status}). 토큰 권한(Actions 쓰기)을 확인하세요.` }, 200);
      await env.DB.prepare("INSERT OR REPLACE INTO kv (k, v) VALUES ('deploy_at', ?)").bind(String(Date.now())).run();
      return json({ ok: true, message: '배포를 시작했습니다. 보통 2~3분 뒤 반영됩니다.' });
    }

    // 리포트 화면이 읽는 실제 집계(사이트·페이지·순위)
    if (path === '/api/report' && request.method === 'GET') return json(await buildReport(env));
    // 둘러보기 대시보드용 읽기 전용 리포트(로그인 불필요). 사이트·순위 현황만 담긴다.
    if (path === '/api/demo/report' && request.method === 'GET') return json(await buildReport(env));

    // 키워드 사이트 빌드가 읽어가는 공사 전/후 사진 목록(파일 본문은 /api/s/<slug>/ba/<사례>/<전후>)
    if (path === '/api/export/ba' && request.method === 'GET') return json({ ok: true, items: (await env.DB.prepare('SELECT slug, region, slot, phase, type, updated_at FROM ba_photos').all()).results, captions: (await env.DB.prepare('SELECT slug, region, slot, caption FROM ba_captions').all()).results, intros: (await env.DB.prepare('SELECT slug, region, intro FROM region_intro').all()).results });

    // 키워드 사이트 빌드가 읽어가는 공개 정보(전화·카카오톡·블로그·유튜브·사업자 정보·관련 서비스). 사업자등록증·메모·파일은 포함하지 않는다.
    if (path === '/api/export/profiles' && request.method === 'GET') {
      const { results } = await env.DB.prepare(`SELECT slug, ${PROFILE_COLS}, updated_at FROM profile`).all();
      return json({ ok: true, profiles: results.map(shapeProfile) });
    }

    const m = path.match(/^\/api\/s\/([a-z0-9-]+)\/(.*)$/);
    const g = m ? await getGroup(env.DB, m[1]) : null;
    if (!m || !g) return err(404, 'not found');
    const slug = m[1];
    const rest = m[2].replace(/\/$/, '');
    try {
      return await route(request, env, url, slug, rest, g);
    } catch (e) {
      return err(500, String(e?.message || e).slice(0, 200));
    }
  },
};

async function route(request, env, url, slug, rest, g) {
  const db = env.DB;
  const method = request.method;

  // ── 개요(카테고리, 정보, 사업자등록증 상태)
  if (rest === 'overview' && method === 'GET') {
    const profile = shapeProfile(await db.prepare(`SELECT ${PROFILE_COLS} FROM profile WHERE slug=?`).bind(slug).first());
    const lic = await db.prepare('SELECT name, type, size, ocr_text, updated_at FROM license WHERE slug=?').bind(slug).first();
    const counts = (await db.prepare('SELECT category, COUNT(*) n FROM files WHERE slug=? GROUP BY category').bind(slug).all()).results;
    const ba = (await db.prepare('SELECT region, slot, phase, type, size, updated_at FROM ba_photos WHERE slug=?').bind(slug).all()).results;
    const captions = (await db.prepare('SELECT region, slot, caption FROM ba_captions WHERE slug=?').bind(slug).all()).results;
    const intros = (await db.prepare('SELECT region, intro FROM region_intro WHERE slug=?').bind(slug).all()).results;
    return json({ ok: true, storage: env.FILES ? 'r2' : 'd1', maxFile: maxBytes(env, 'image'), video: !!env.FILES, keyword: g.main_keyword, categories: categoriesOf(g), regions: regionsOf(g), profile, defaults: DEFAULT_PROFILE, license: lic || null, counts, ba, captions, intros, template: templateOf(g.template).id, templates: templateList() });
  }


  // ── 지역 페이지 만들기: 지역명을 넣고 만들면 이 사이트의 지역 목록에 더해지고 '<지역> <키워드>' 페이지가 생긴다.
  //    주소 이름(영문)은 한글에서 자동으로 만든다. 사이트 워커가 지금 지역 목록과 마지막 배포를 비교해 새 페이지를 바로 보여 주고, 다음 배포 때 정식 페이지로 굳는다.
  if (rest === 'regions' && method === 'POST') {
    const b = await request.json().catch(() => ({}));
    const name = String(b.name || '').trim().replace(/\s+/g, ' ');
    if (!/^[가-힣A-Za-z0-9 ]{1,10}$/.test(name) || /^[0-9 ]+$/.test(name)) return err(400, '지역 이름은 한글·영문 1~10자로 입력하세요 (예: 광주)');
    const day = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10), rk = `region_add:${slug}:${day}`;
    const used = Number((await db.prepare('SELECT v FROM kv WHERE k=?').bind(rk).first())?.v || 0);
    if (used >= 30) return err(429, '오늘은 지역을 더 만들 수 없습니다(하루 30개). 내일 다시 시도하세요');
    await loadGroups(db);
    let region = allRegions().find((x) => x.name === name), created = false;
    if (!region) {
      const base = romanize(name).replace(/[^a-z0-9-]/g, '').replace(/^-+|-+$/g, '');
      if (!base) return err(400, `'${name}'의 주소를 만들 수 없습니다. 한글이나 영문으로 입력하세요`);
      let sl = base, n = 2; while (regionOf(sl) || RESERVED_REGION_SLUGS.includes(sl)) sl = `${base}-${n++}`;
      await db.prepare('INSERT INTO regions_extra (slug, name) VALUES (?,?)').bind(sl, name).run();
      setExtraRegions([...extraRegions(), { slug: sl, name }]); region = { slug: sl, name }; created = true;
    }
    const existed = g.regions.includes(region.slug);
    if (!existed) {
      if (g.regions.length >= 80) return err(400, '지역은 사이트당 80개까지 만들 수 있습니다');
      const next = [...g.regions, region.slug];
      await db.prepare('UPDATE groups SET regions=?, updated_at=? WHERE slug=?').bind(JSON.stringify(next), Date.now(), slug).run();
      g.regions = next;
      await db.prepare('INSERT OR REPLACE INTO kv (k, v) VALUES (?,?)').bind(rk, String(used + 1)).run();
    }
    return json({ ok: true, existed, created, region, url: `https://${groupHost(slug)}/${region.slug}/`, title: `${region.name} ${g.main_keyword}`, regions: regionsOf(g) });
  }
  const rdel = rest.match(/^regions\/([a-z0-9-]+)$/);
  if (rdel && method === 'DELETE') {
    if (!g.regions.includes(rdel[1])) return err(404, '없는 지역입니다');
    if (g.regions.length <= 1) return err(400, '지역은 최소 1개가 있어야 합니다');
    const next = g.regions.filter((x) => x !== rdel[1]);
    await db.prepare('UPDATE groups SET regions=?, updated_at=? WHERE slug=?').bind(JSON.stringify(next), Date.now(), slug).run();
    g.regions = next;
    return json({ ok: true, regions: regionsOf(g) });
  }

  // ── 템플릿 선택: 사이트의 디자인·구성을 바꾼다. 입력해 둔 내용·사진은 그대로 유지되고, 업로드 화면의 사진 칸 수만 템플릿에 맞춰진다.
  if (rest === 'template' && method === 'PUT') {
    const b = await request.json();
    if (!TEMPLATES[b.template]) return err(400, '없는 템플릿입니다');
    await db.prepare('UPDATE groups SET template=?, updated_at=? WHERE slug=?').bind(b.template, Date.now(), slug).run();
    return json({ ok: true, template: b.template });
  }
  // 미리보기: 입력한 내용·사진으로 선택 전 템플릿을 그려서 보여 준다(저장하지 않는다). ?template=<id>&region=<지역slug>
  if (rest === 'preview' && method === 'GET') {
    const tplId = url.searchParams.get('template') || g.template, region = url.searchParams.get('region') || '';
    if (!TEMPLATES[tplId]) return err(400, '없는 템플릿입니다');
    const html = await renderPreview(env, g, tplId, region);
    return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow' } });
  }

  // ── 사진 설명(캡션)과 지역 소개 문구: 키워드 사이트 전후 비교·지역 페이지에 표시된다(범위: 공통 '' 또는 지역)
  if (rest === 'ba-caption' && method === 'PUT') {
    const b = await request.json(), region = clean(b.region, 40), slot = Number(b.slot);
    if (!(slot >= 1 && slot <= 8) || (region && !regionsOf(g).some((r) => r.slug === region))) return err(400, '잘못된 요청입니다');
    const cap = clean(b.caption, 60);
    await (cap ? db.prepare('INSERT OR REPLACE INTO ba_captions (slug, region, slot, caption) VALUES (?,?,?,?)').bind(slug, region, slot, cap) : db.prepare('DELETE FROM ba_captions WHERE slug=? AND region=? AND slot=?').bind(slug, region, slot)).run();
    return json({ ok: true });
  }
  if (rest === 'region-intro' && method === 'PUT') {
    const b = await request.json(), region = clean(b.region, 40);
    if (!region || !regionsOf(g).some((r) => r.slug === region)) return err(400, '지역을 선택하세요');
    const intro = clean(b.intro, 1200);
    await (intro ? db.prepare('INSERT OR REPLACE INTO region_intro (slug, region, intro) VALUES (?,?,?)').bind(slug, region, intro) : db.prepare('DELETE FROM region_intro WHERE slug=? AND region=?').bind(slug, region)).run();
    return json({ ok: true });
  }

  // ── 공사 전/후 사진: 작업 사례 1~4 × 전/후 한 장씩. 범위 = 전체 공통(region '') 또는 특정 지역 페이지. 전·후 둘 다 있는 사례만 쓰고, 지역에 없으면 공통 → 기본 사진 순으로 대신한다.
  const bam = rest.match(/^ba\/(?:([a-z0-9-]+)\/)?([1-8])\/(before|after)$/);
  if (bam) {
    const region = bam[1] || '', slot = Number(bam[2]), phase = bam[3], key = `ba/${slug}/${region}/${slot}/${phase}`;
    if (region && !regionsOf(g).some((r) => r.slug === region)) return err(404, '없는 지역입니다');
    if (method === 'PUT') {
      const type = (request.headers.get('content-type') || '').split(';')[0];
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(type)) return err(415, '사진(JPG·PNG·WebP)만 가능합니다');
      const buf = await request.arrayBuffer();
      if (!buf.byteLength || buf.byteLength > D1_MAX) return err(413, '사진은 최대 1.2MB입니다(화면에서 자동으로 줄어듭니다)');
      await db.batch([
        db.prepare('INSERT OR REPLACE INTO blobs (key, type, data) VALUES (?,?,?)').bind(key, type, b64enc(buf)),
        db.prepare('INSERT OR REPLACE INTO ba_photos (slug, region, slot, phase, type, size, updated_at) VALUES (?,?,?,?,?,?,?)').bind(slug, region, slot, phase, type, buf.byteLength, Date.now()),
      ]);
      return json({ ok: true });
    }
    if (method === 'GET') {
      const row = await db.prepare('SELECT type, data FROM blobs WHERE key=?').bind(key).first();
      if (!row) return err(404, 'not found');
      return new Response(b64dec(row.data), { headers: { 'content-type': row.type, 'cache-control': 'private, max-age=60', 'x-robots-tag': 'noindex' } });
    }
    if (method === 'DELETE') {
      await db.batch([db.prepare('DELETE FROM blobs WHERE key=?').bind(key), db.prepare('DELETE FROM ba_photos WHERE slug=? AND region=? AND slot=? AND phase=?').bind(slug, region, slot, phase)]);
      return json({ ok: true });
    }
  }

  // ── 사이트 정보 저장
  if (rest === 'profile' && method === 'PUT') {
    const b = await request.json();
    await db.prepare('INSERT INTO profile (slug, phone, blog, youtube, reference, company, ceo, regno, address, hours, kakao, instagram, threads, website, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(slug) DO UPDATE SET phone=excluded.phone, blog=excluded.blog, youtube=excluded.youtube, reference=excluded.reference, company=excluded.company, ceo=excluded.ceo, regno=excluded.regno, address=excluded.address, hours=excluded.hours, kakao=excluded.kakao, instagram=excluded.instagram, threads=excluded.threads, website=excluded.website, updated_at=excluded.updated_at')
      .bind(slug, clean(b.phone, 30), normUrl(b.blog), normUrl(b.youtube), clean(b.reference), clean(b.company, 60), clean(b.ceo, 40), clean(b.regno, 20), clean(b.address, 200), clean(b.hours, 60), normUrl(b.kakao), normUrl(b.instagram), normUrl(b.threads), normUrl(b.website), Date.now()).run();
    return json({ ok: true });
  }

  // ── 사업자등록증
  if (rest === 'license') {
    if (method === 'GET') {
      const lic = await db.prepare('SELECT file_key, name, type FROM license WHERE slug=?').bind(slug).first();
      if (!lic) return err(404, 'no license');
      const obj = await getObj(env, db, lic.file_key);
      if (!obj) return err(404, 'missing');
      return new Response(obj.body, { headers: { 'content-type': lic.type, 'cache-control': 'private, no-store', 'x-robots-tag': 'noindex', 'content-disposition': `inline; filename*=UTF-8''${encodeURIComponent(lic.name)}` } });
    }
    if (method === 'PUT') {
      const type = (request.headers.get('content-type') || '').split(';')[0];
      const size = Number(request.headers.get('content-length') || 0);
      if (!LICENSE_TYPES.includes(type)) return err(415, 'JPG, PNG, PDF만 가능합니다');
      if (!size || size > maxBytes(env, 'license')) return err(413, env.FILES ? '최대 10MB입니다' : '최대 1.2MB입니다(사진은 자동으로 줄어듭니다. PDF는 용량을 줄여 올려주세요)');
      const name = clean(decodeURIComponent(url.searchParams.get('name') || 'license'), 120);
      const old = await db.prepare('SELECT file_key FROM license WHERE slug=?').bind(slug).first();
      const key = `${slug}/license/${uid()}`;
      if (!(await putObj(env, db, key, request, type))) return err(413, '파일이 너무 큽니다');
      await db.prepare('INSERT INTO license (slug, file_key, name, type, size, ocr_text, updated_at) VALUES (?,?,?,?,?,NULL,?) ON CONFLICT(slug) DO UPDATE SET file_key=excluded.file_key, name=excluded.name, type=excluded.type, size=excluded.size, ocr_text=NULL, updated_at=excluded.updated_at')
        .bind(slug, key, name, type, size, Date.now()).run();
      if (old?.file_key) await delObj(env, db, old.file_key);
      return json({ ok: true });
    }
    if (method === 'DELETE') {
      const old = await db.prepare('SELECT file_key FROM license WHERE slug=?').bind(slug).first();
      if (old?.file_key) await delObj(env, db, old.file_key);
      await db.prepare('DELETE FROM license WHERE slug=?').bind(slug).run();
      return json({ ok: true });
    }
  }
  if (rest === 'license/text' && method === 'PUT') { // 추출한 텍스트 저장(수동 입력 포함)
    const b = await request.json();
    await db.prepare('UPDATE license SET ocr_text=? WHERE slug=?').bind(clean(b.text, 5000), slug).run();
    return json({ ok: true });
  }

  // ── 파일 업로드: PUT /files?category=cat1&name=...&group=폴더명
  if (rest === 'files' && method === 'PUT') {
    const type = (request.headers.get('content-type') || '').split(';')[0];
    const size = Number(request.headers.get('content-length') || 0);
    const category = clean(url.searchParams.get('category'), 10);
    if (!categoriesOf(g).some((c) => c.id === category)) return err(400, '카테고리를 선택하세요');
    const isImg = IMAGE_TYPES.includes(type), isVid = VIDEO_TYPES.includes(type);
    if (!isImg && !(isVid && env.FILES)) return err(415, env.FILES ? '사진(JPG·PNG·GIF·WebP) 또는 동영상(MP4·WebM·MOV·AVI)만 가능합니다' : '지금은 사진(JPG·PNG·GIF·WebP)만 올릴 수 있습니다. 동영상은 파일 저장소를 연결하면 열립니다');
    if (!size || size > (env.FILES ? (isImg ? MAX_IMAGE : MAX_VIDEO) : D1_MAX)) return err(413, env.FILES ? (isImg ? '사진은 최대 50MB입니다' : '동영상은 최대 100MB입니다') : '사진은 최대 1.2MB입니다(화면에서 자동으로 줄어듭니다)');
    const id = uid();
    const key = `${slug}/f/${id}`;
    const name = clean(decodeURIComponent(url.searchParams.get('name') || 'file'), 160);
    const grp = clean(decodeURIComponent(url.searchParams.get('group') || ''), 80);
    if (!(await putObj(env, db, key, request, type))) return err(413, '파일이 너무 큽니다');
    await db.prepare('INSERT INTO files (id, slug, category, name, type, size, file_key, grp, created_at) VALUES (?,?,?,?,?,?,?,?,?)').bind(id, slug, category, name, type, size, key, grp, Date.now()).run();
    return json({ ok: true, id });
  }
  if (rest === 'files' && method === 'GET') {
    const category = clean(url.searchParams.get('category'), 10);
    const page = Math.max(1, Number(url.searchParams.get('page') || 1));
    const where = category ? 'slug=? AND category=?' : 'slug=?';
    const binds = category ? [slug, category] : [slug];
    const total = (await db.prepare(`SELECT COUNT(*) n FROM files WHERE ${where}`).bind(...binds).first()).n;
    const { results } = await db.prepare(`SELECT id, category, name, type, size, grp, created_at FROM files WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`).bind(...binds, PAGE_SIZE, (page - 1) * PAGE_SIZE).all();
    return json({ ok: true, files: results, total, page, pageSize: PAGE_SIZE });
  }
  const f = rest.match(/^file\/([a-f0-9]{32})$/);
  if (f) {
    const row = await db.prepare('SELECT file_key, type, name FROM files WHERE id=? AND slug=?').bind(f[1], slug).first();
    if (!row) return err(404, 'not found');
    if (method === 'GET') {
      const obj = await getObj(env, db, row.file_key, request.headers);
      if (!obj) return err(404, 'missing');
      const headers = new Headers({ 'content-type': row.type, 'cache-control': 'private, max-age=3600', 'x-robots-tag': 'noindex', 'accept-ranges': 'bytes' });
      if (obj.range) { const { offset = 0, length = obj.size } = obj.range; headers.set('content-range', `bytes ${offset}-${offset + length - 1}/${obj.size}`); return new Response(obj.body, { status: 206, headers }); }
      return new Response(obj.body, { headers });
    }
    if (method === 'DELETE') {
      await delObj(env, db, row.file_key);
      await db.prepare('DELETE FROM files WHERE id=?').bind(f[1]).run();
      return json({ ok: true });
    }
  }
  if (rest === 'files/move' && method === 'POST') { // 선택한 파일 또는 폴더(묶음) 단위 카테고리 이동
    const b = await request.json();
    const category = clean(b.category, 10);
    if (!categoriesOf(g).some((c) => c.id === category)) return err(400, '카테고리 오류');
    if (b.group) await db.prepare('UPDATE files SET category=? WHERE slug=? AND grp=?').bind(category, slug, clean(b.group, 80)).run();
    for (const id of (Array.isArray(b.ids) ? b.ids : []).slice(0, 200)) if (/^[a-f0-9]{32}$/.test(id)) await db.prepare('UPDATE files SET category=? WHERE id=? AND slug=?').bind(category, id, slug).run();
    return json({ ok: true });
  }

  // ── 메모
  if (rest === 'memos') {
    if (method === 'GET') {
      const { results } = await db.prepare('SELECT id, category, content, created_at FROM memos WHERE slug=? ORDER BY created_at DESC LIMIT 200').bind(slug).all();
      return json({ ok: true, memos: results });
    }
    if (method === 'POST') {
      const b = await request.json();
      const content = clean(b.content, 4000);
      if (!content) return err(400, '내용이 없습니다');
      const category = categoriesOf(g).some((c) => c.id === b.category) ? b.category : '';
      const r = await db.prepare('INSERT INTO memos (slug, category, content, created_at) VALUES (?,?,?,?)').bind(slug, category, content, Date.now()).run();
      return json({ ok: true, id: r.meta.last_row_id });
    }
  }
  const mm = rest.match(/^memos\/(\d+)$/);
  if (mm && method === 'DELETE') {
    await db.prepare('DELETE FROM memos WHERE id=? AND slug=?').bind(Number(mm[1]), slug).run();
    return json({ ok: true });
  }
  return err(404, 'not found');
}
