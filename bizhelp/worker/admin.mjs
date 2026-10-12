// admin.suriwiki.com 워커 — 정적 리포트는 ASSETS가 그대로 서빙하고, /upload/* 와 /api/* 만 이 워커가 처리한다.
// 업로드 구조(키워드 슬러그 = 메인 키워드 단위): 사업자등록증 · 사이트 정보(전화/블로그/유튜브/참고) · 카테고리별 사진·영상 · 메모 · 갤러리.
// 저장소: D1(DB) = 정보·메타데이터·메모, R2(FILES) = 파일 본문.
// 보안: authorize() 한 곳에서 접근을 통제한다. 지금은 로그인이 없다(나중에 Cloudflare Access JWT 검증을 이 함수에 넣는다).
//       네이버·구글 계정 비밀번호처럼 제3자 비밀번호는 받지도 저장하지도 않는다.
import SITES from './sites-meta.json';

const MAX_IMAGE = 50 * 1024 * 1024;
const MAX_VIDEO = 100 * 1024 * 1024;
const MAX_LICENSE = 10 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
const LICENSE_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
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
    db.prepare('CREATE INDEX IF NOT EXISTS files_slug_cat ON files (slug, category, created_at)'),
    db.prepare('CREATE TABLE IF NOT EXISTS memos (id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT, category TEXT, content TEXT, created_at INTEGER)'),
  ]);
  schemaReady = true;
}

const categoriesOf = (slug) => (SITES[slug]?.subs || []).map((name, i) => ({ id: `cat${i + 1}`, name }));
const clean = (v, max = 300) => String(v ?? '').trim().slice(0, max);
const uid = () => crypto.randomUUID().replace(/-/g, '');

export default {
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

    if (!path.startsWith('/api/')) return env.ASSETS.fetch(request);
    if (!(await authorize(request, env))) return err(403, 'forbidden');
    await ensureSchema(env.DB);

    // 키워드 사이트 빌드가 읽어가는 공개 정보(전화번호·블로그·유튜브). 사업자등록증·메모·파일은 포함하지 않는다.
    if (path === '/api/export/profiles' && request.method === 'GET') {
      const { results } = await env.DB.prepare('SELECT slug, phone, blog, youtube, reference, updated_at FROM profile').all();
      return json({ ok: true, profiles: results });
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
    const profile = (await db.prepare('SELECT phone, blog, youtube, reference FROM profile WHERE slug=?').bind(slug).first()) || {};
    const lic = await db.prepare('SELECT name, type, size, ocr_text, updated_at FROM license WHERE slug=?').bind(slug).first();
    const counts = (await db.prepare('SELECT category, COUNT(*) n FROM files WHERE slug=? GROUP BY category').bind(slug).all()).results;
    return json({ ok: true, keyword: SITES[slug].keyword, categories: categoriesOf(slug), profile, license: lic || null, counts });
  }

  // ── 사이트 정보 저장
  if (rest === 'profile' && method === 'PUT') {
    const b = await request.json();
    await db.prepare('INSERT INTO profile (slug, phone, blog, youtube, reference, updated_at) VALUES (?,?,?,?,?,?) ON CONFLICT(slug) DO UPDATE SET phone=excluded.phone, blog=excluded.blog, youtube=excluded.youtube, reference=excluded.reference, updated_at=excluded.updated_at')
      .bind(slug, clean(b.phone, 30), clean(b.blog), clean(b.youtube), clean(b.reference), Date.now()).run();
    return json({ ok: true });
  }

  // ── 사업자등록증
  if (rest === 'license') {
    if (method === 'GET') {
      const lic = await db.prepare('SELECT file_key, name, type FROM license WHERE slug=?').bind(slug).first();
      if (!lic) return err(404, 'no license');
      const obj = await env.FILES.get(lic.file_key);
      if (!obj) return err(404, 'missing');
      return new Response(obj.body, { headers: { 'content-type': lic.type, 'cache-control': 'private, no-store', 'x-robots-tag': 'noindex', 'content-disposition': `inline; filename*=UTF-8''${encodeURIComponent(lic.name)}` } });
    }
    if (method === 'PUT') {
      const type = (request.headers.get('content-type') || '').split(';')[0];
      const size = Number(request.headers.get('content-length') || 0);
      if (!LICENSE_TYPES.includes(type)) return err(415, 'JPG, PNG, PDF만 가능합니다');
      if (!size || size > MAX_LICENSE) return err(413, '최대 10MB입니다');
      const name = clean(decodeURIComponent(url.searchParams.get('name') || 'license'), 120);
      const old = await db.prepare('SELECT file_key FROM license WHERE slug=?').bind(slug).first();
      const key = `${slug}/license/${uid()}`;
      await env.FILES.put(key, request.body, { httpMetadata: { contentType: type } });
      await db.prepare('INSERT INTO license (slug, file_key, name, type, size, ocr_text, updated_at) VALUES (?,?,?,?,?,NULL,?) ON CONFLICT(slug) DO UPDATE SET file_key=excluded.file_key, name=excluded.name, type=excluded.type, size=excluded.size, ocr_text=NULL, updated_at=excluded.updated_at')
        .bind(slug, key, name, type, size, Date.now()).run();
      if (old?.file_key) await env.FILES.delete(old.file_key);
      return json({ ok: true });
    }
    if (method === 'DELETE') {
      const old = await db.prepare('SELECT file_key FROM license WHERE slug=?').bind(slug).first();
      if (old?.file_key) await env.FILES.delete(old.file_key);
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
    if (!isImg && !isVid) return err(415, '사진(JPG·PNG·GIF·WebP) 또는 동영상(MP4·WebM·MOV·AVI)만 가능합니다');
    if (!size || size > (isImg ? MAX_IMAGE : MAX_VIDEO)) return err(413, isImg ? '사진은 최대 50MB입니다' : '동영상은 최대 100MB입니다');
    const id = uid();
    const key = `${slug}/f/${id}`;
    const name = clean(decodeURIComponent(url.searchParams.get('name') || 'file'), 160);
    const grp = clean(decodeURIComponent(url.searchParams.get('group') || ''), 80);
    await env.FILES.put(key, request.body, { httpMetadata: { contentType: type } });
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
      const obj = await env.FILES.get(row.file_key, { range: request.headers });
      if (!obj) return err(404, 'missing');
      const headers = new Headers({ 'content-type': row.type, 'cache-control': 'private, max-age=3600', 'x-robots-tag': 'noindex', 'accept-ranges': 'bytes' });
      if (obj.range) { const { offset = 0, length = obj.size } = obj.range; headers.set('content-range', `bytes ${offset}-${offset + length - 1}/${obj.size}`); return new Response(obj.body, { status: 206, headers }); }
      return new Response(obj.body, { headers });
    }
    if (method === 'DELETE') {
      await env.FILES.delete(row.file_key);
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
