// admin.suriwiki.com 워커 — 정적 리포트는 ASSETS가 그대로 서빙하고, /upload/* 와 /api/* 만 이 워커가 처리한다.
// 업로드 구조(키워드 슬러그 = 메인 키워드 단위): 사업자등록증 · 사이트 정보(전화/블로그/유튜브/참고) · 카테고리별 사진·영상 · 메모 · 갤러리.
// 저장소: D1(DB) = 정보·메타데이터·메모. 파일 본문은 R2(FILES)가 있으면 R2, 없으면 D1(blobs 테이블, base64)에 둔다.
//       D1 방식은 카드 등록 없이 쓰는 임시 방식이라 사진·사업자등록증(1.2MB 이하, 화면에서 자동 축소)만 받고 동영상은 받지 않는다.
// 보안: authorize() 한 곳에서 접근을 통제한다. 지금은 로그인이 없다(나중에 Cloudflare Access JWT 검증을 이 함수에 넣는다).
//       네이버·구글 계정 비밀번호처럼 제3자 비밀번호는 받지도 저장하지도 않는다.
import SITES from './sites-meta.json';
import { DEFAULT_PROFILE } from '../scripts/site-defaults.mjs';
import REGISTRY from '../registry/sites.json';

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
    db.prepare('CREATE TABLE IF NOT EXISTS ba_captions (slug TEXT, region TEXT, slot INTEGER, caption TEXT, PRIMARY KEY (slug, region, slot))'),
    db.prepare('CREATE TABLE IF NOT EXISTS region_intro (slug TEXT, region TEXT, intro TEXT, PRIMARY KEY (slug, region))'),
    db.prepare('CREATE TABLE IF NOT EXISTS shares (id TEXT PRIMARY KEY, created_at INTEGER)'),
    db.prepare('CREATE TABLE IF NOT EXISTS page_seen (page_key TEXT PRIMARY KEY, first_seen TEXT)'),
    db.prepare('CREATE TABLE IF NOT EXISTS rank_log (page_key TEXT, check_date TEXT, rank_position INTEGER, PRIMARY KEY (page_key, check_date))'),
    db.prepare('CREATE INDEX IF NOT EXISTS files_slug_cat ON files (slug, category, created_at)'),
    db.prepare('CREATE TABLE IF NOT EXISTS memos (id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT, category TEXT, content TEXT, created_at INTEGER)'),
  ]);
  for (const col of ['company', 'ceo', 'regno', 'address', 'kakao', 'services', 'instagram', 'threads', 'website', 'hours']) { try { await db.prepare(`ALTER TABLE profile ADD COLUMN ${col} TEXT`).run(); } catch (_) { /* 이미 있음 */ } }
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

// ── 리포트: 사이트·페이지 목록은 registry(실제 배포 대상), 처음 만든 날은 D1(page_seen), 순위는 D1(rank_log)
const kstDate = (t = Date.now()) => new Date(t + 9 * 3600e3).toISOString().slice(0, 10);
const addDays = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
const PAGES = [...REGISTRY.pages].sort((a, b) => (a.site + a.page_path).localeCompare(b.site + b.page_path));
const pageKey = (p) => `${p.site}${p.page_path}`;

async function buildReport(env) {
  const db = env.DB, today = kstDate();
  const dates = Array.from({ length: 16 }, (_, i) => addDays(today, -i)); // 최신순
  // 새로 생긴 페이지는 처음 본 날을 기록한다(이미 있으면 그대로 둔다)
  for (let i = 0; i < PAGES.length; i += 80) await db.batch(PAGES.slice(i, i + 80).map((p) => db.prepare('INSERT OR IGNORE INTO page_seen (page_key, first_seen) VALUES (?,?)').bind(pageKey(p), today)));
  const seen = new Map((await db.prepare('SELECT page_key, first_seen FROM page_seen').all()).results.map((r) => [r.page_key, r.first_seen]));
  const logs = (await db.prepare('SELECT page_key, check_date, rank_position FROM rank_log WHERE check_date >= ?').bind(dates[dates.length - 1]).all()).results;
  const id = new Map(PAGES.map((p, i) => [pageKey(p), i + 1]));
  const checkedToday = new Set(logs.filter((r) => r.check_date === today).map((r) => r.page_key)).size;
  const lastCheck = (await db.prepare('SELECT MAX(check_date) d FROM rank_log').first())?.d || null;
  return {
    success: true, business_name: REGISTRY.business_name, generated_at: today, dates, site_meta: REGISTRY.site_meta,
    keywords: PAGES.map((p) => ({ id: id.get(pageKey(p)), keyword: p.h1_title, site: p.site, page_path: p.page_path, created_at: seen.get(pageKey(p)) || today })),
    ranks: logs.filter((r) => r.rank_position && id.has(r.page_key)).map((r) => ({ tracking_id: id.get(r.page_key), check_date: r.check_date, rank_position: r.rank_position })),
    pages: PAGES.map((p) => ({ ...p, first_seen: seen.get(pageKey(p)) || today })),
    rank_status: { configured: !!(env.NAVER_CLIENT_ID && env.NAVER_CLIENT_SECRET), noindex: !!REGISTRY.noindex, last_check: lastCheck, checked_today: checkedToday, total: PAGES.length },
  };
}

// 네이버 검색 Open API(웹문서) 상위 100건에서 우리 페이지 주소를 찾아 순위를 기록한다. 한 번에 30건만(서브요청 한도) — 30분마다 돌며 오늘 안 잰 페이지부터 처리한다.
async function collectRanks(env) {
  if (!env.NAVER_CLIENT_ID || !env.NAVER_CLIENT_SECRET) return { skipped: 'no-keys' };
  const db = env.DB, today = kstDate();
  await ensureSchema(db);
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

const regionsOf = (slug) => REGISTRY.pages.filter((p) => p.site.split('.')[0] === slug).map((p) => ({ slug: p.region_slug, name: p.region })).sort((a, b) => a.name.localeCompare(b.name, 'ko'));
const categoriesOf = (slug) => (SITES[slug]?.subs || []).map((name, i) => ({ id: `cat${i + 1}`, name }));
const clean = (v, max = 300) => String(v ?? '').trim().slice(0, max);
const uid = () => crypto.randomUUID().replace(/-/g, '');

export default {
  async scheduled(_event, env, ctx) { ctx.waitUntil(collectRanks(env)); },
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // 업로드 페이지: /upload/<slug>[/]
    const up = path.match(/^\/upload\/([a-z0-9-]+)\/?$/);
    if (up) {
      if (!SITES[up[1]]) return new Response('Not found', { status: 404 });
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

    if (path === '/api/share' && request.method === 'PUT') return saveShare(env, request);

    // 리포트 화면이 읽는 실제 집계(사이트·페이지·순위)
    if (path === '/api/report' && request.method === 'GET') return json(await buildReport(env));

    // 키워드 사이트 빌드가 읽어가는 공사 전/후 사진 목록(파일 본문은 /api/s/<slug>/ba/<사례>/<전후>)
    if (path === '/api/export/ba' && request.method === 'GET') return json({ ok: true, items: (await env.DB.prepare('SELECT slug, region, slot, phase, type, updated_at FROM ba_photos').all()).results, captions: (await env.DB.prepare('SELECT slug, region, slot, caption FROM ba_captions').all()).results, intros: (await env.DB.prepare('SELECT slug, region, intro FROM region_intro').all()).results });

    // 키워드 사이트 빌드가 읽어가는 공개 정보(전화·카카오톡·블로그·유튜브·사업자 정보·관련 서비스). 사업자등록증·메모·파일은 포함하지 않는다.
    if (path === '/api/export/profiles' && request.method === 'GET') {
      const { results } = await env.DB.prepare(`SELECT slug, ${PROFILE_COLS}, updated_at FROM profile`).all();
      return json({ ok: true, profiles: results.map(shapeProfile) });
    }

    const m = path.match(/^\/api\/s\/([a-z0-9-]+)\/(.*)$/);
    if (!m || !SITES[m[1]]) return err(404, 'not found');
    const slug = m[1];
    const rest = m[2].replace(/\/$/, '');
    try {
      return await route(request, env, url, slug, rest);
    } catch (e) {
      return err(500, String(e?.message || e).slice(0, 200));
    }
  },
};

async function route(request, env, url, slug, rest) {
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
    return json({ ok: true, storage: env.FILES ? 'r2' : 'd1', maxFile: maxBytes(env, 'image'), video: !!env.FILES, keyword: SITES[slug].keyword, categories: categoriesOf(slug), regions: regionsOf(slug), profile, defaults: DEFAULT_PROFILE, license: lic || null, counts, ba, captions, intros });
  }

  // ── 사진 설명(캡션)과 지역 소개 문구: 키워드 사이트 전후 비교·지역 페이지에 표시된다(범위: 공통 '' 또는 지역)
  if (rest === 'ba-caption' && method === 'PUT') {
    const b = await request.json(), region = clean(b.region, 40), slot = Number(b.slot);
    if (![1, 2, 3, 4].includes(slot) || (region && !regionsOf(slug).some((r) => r.slug === region))) return err(400, '잘못된 요청입니다');
    const cap = clean(b.caption, 60);
    await (cap ? db.prepare('INSERT OR REPLACE INTO ba_captions (slug, region, slot, caption) VALUES (?,?,?,?)').bind(slug, region, slot, cap) : db.prepare('DELETE FROM ba_captions WHERE slug=? AND region=? AND slot=?').bind(slug, region, slot)).run();
    return json({ ok: true });
  }
  if (rest === 'region-intro' && method === 'PUT') {
    const b = await request.json(), region = clean(b.region, 40);
    if (!region || !regionsOf(slug).some((r) => r.slug === region)) return err(400, '지역을 선택하세요');
    const intro = clean(b.intro, 1200);
    await (intro ? db.prepare('INSERT OR REPLACE INTO region_intro (slug, region, intro) VALUES (?,?,?)').bind(slug, region, intro) : db.prepare('DELETE FROM region_intro WHERE slug=? AND region=?').bind(slug, region)).run();
    return json({ ok: true });
  }

  // ── 공사 전/후 사진: 작업 사례 1~4 × 전/후 한 장씩. 범위 = 전체 공통(region '') 또는 특정 지역 페이지. 전·후 둘 다 있는 사례만 쓰고, 지역에 없으면 공통 → 기본 사진 순으로 대신한다.
  const bam = rest.match(/^ba\/(?:([a-z0-9-]+)\/)?([1-4])\/(before|after)$/);
  if (bam) {
    const region = bam[1] || '', slot = Number(bam[2]), phase = bam[3], key = `ba/${slug}/${region}/${slot}/${phase}`;
    if (region && !regionsOf(slug).some((r) => r.slug === region)) return err(404, '없는 지역입니다');
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
    if (!categoriesOf(slug).some((c) => c.id === category)) return err(400, '카테고리를 선택하세요');
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
    if (!categoriesOf(slug).some((c) => c.id === category)) return err(400, '카테고리 오류');
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
      const category = categoriesOf(slug).some((c) => c.id === b.category) ? b.category : '';
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
