// <키워드slug>.suriwiki.com/<지역slug>  →  정적 에셋 /s/<키워드slug>/<지역slug>/
// 커스텀 도메인으로 붙은 호스트만 이 워커에 도달한다(와일드카드 라우트 없음).
//
// 지역 페이지 만들기(업로드 페이지)로 지역이 더해지거나 빠지면, 마지막 배포(정적 페이지)와 지금(D1)의 지역 목록이 달라진다.
// 그때만 관리자 워커(서비스 바인딩 ADMIN)의 실시간 렌더(/render/…)로 홈·지역·상담 페이지를 대신 보여 준다. 다음 배포 때 정적 페이지로 굳고 다시 같아진다.
// 관리자 쪽이 응답하지 않으면 언제나 정적 페이지로 돌아간다.
const ADMIN = 'https://admin.suriwiki.com';
const FRESH_SEC = 60;
const mem = new Map(); // 같은 워커 인스턴스 안의 1분 캐시: key → { t, v }
const remember = async (key, fn) => {
  const hit = mem.get(key);
  if (hit && Date.now() - hit.t < FRESH_SEC * 1000) return hit.v;
  const v = await fn().catch(() => null);
  mem.set(key, { t: Date.now(), v });
  return v;
};

async function staticRegions(env, origin, sub) {
  return remember(`m:${sub}`, async () => {
    const r = await env.ASSETS.fetch(new Request(`${origin}/s/${sub}/regions.json`));
    if (!r.ok) return null;
    const j = await r.json(); return Array.isArray(j) ? [...j].sort() : null;
  });
}
async function liveRegions(env, sub) {
  if (!env.ADMIN) return null;
  return remember(`s:${sub}`, async () => {
    const r = await env.ADMIN.fetch(new Request(`${ADMIN}/render/${sub}/_state`));
    if (!r.ok) return null;
    const j = await r.json(); return Array.isArray(j.regions) ? [...j.regions].sort() : null;
  });
}

// 지금 지역 목록이 정적 페이지와 다르면 실시간 렌더 응답(없으면 null)
async function liveHtml(env, ctx, request, origin, sub, pathname) {
  const live = await liveRegions(env, sub), built = await staticRegions(env, origin, sub);
  if (!live || !built || live.join(',') === built.join(',')) return null;
  const seg = pathname.replace(/^\/+|\/+$/g, '');
  if (seg.includes('/')) return null;
  const target = seg === '' ? `/render/${sub}/` : `/render/${sub}/${seg}`;
  const cache = caches.default, ck = new Request(`https://render-cache.invalid${target}`);
  const hit = await cache.match(ck); if (hit) return hit;
  const r = await env.ADMIN.fetch(new Request(`${ADMIN}${target}`));
  if (r.status === 404) return new Response(null, { status: 404 }); // 없는 지역(빠진 지역 포함): 정적 페이지가 남아 있어도 보여 주지 않는다
  if (!r.ok) return null;
  const res = new Response(r.body, { status: 200, headers: r.headers });
  ctx.waitUntil(cache.put(ck, res.clone()));
  return res;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const host = url.hostname.toLowerCase();
    if (!host.endsWith('.suriwiki.com')) return new Response('Not found', { status: 404 });
    const sub = host.slice(0, -'.suriwiki.com'.length);
    if (!/^[a-z0-9-]+$/.test(sub)) return new Response('Not found', { status: 404 });
    // /upload 는 관리자 업로드 페이지로 보낸다(내용은 이 호스트에 두지 않는다).
    if (/^\/upload\/?$/.test(url.pathname)) return Response.redirect(`https://admin.suriwiki.com/upload/${sub}/`, 302);
    const isHtml = !/\.[a-z0-9]+$/i.test(url.pathname);
    // 확장자 없는 경로는 끝에 /를 붙여 에셋을 바로 조회한다(안 그러면 ASSETS가 내부 경로(/s/<sub>/…/)로 리다이렉트한다).
    const origPath = url.pathname;
    if (isHtml && !url.pathname.endsWith('/')) url.pathname += '/';
    // 홍보 페이지(builder)는 그룹이 아니므로 실시간 렌더 대상이 아니다
    if (isHtml && sub !== 'builder' && request.method === 'GET') {
      const dyn = await liveHtml(env, ctx, request, url.origin, sub, origPath).catch(() => null);
      if (dyn) { if (dyn.status === 404) return env.ASSETS.fetch(new Request(`${url.origin}/s/${sub}/__missing__/`)); return dyn; }
    }
    if (url.pathname !== '/favicon.svg') url.pathname = `/s/${sub}${url.pathname}`;
    const res = await env.ASSETS.fetch(new Request(url, request));
    // 방어: 리다이렉트가 오더라도 내부 접두사는 바깥에 노출하지 않는다.
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      const loc = new URL(res.headers.get('location'), request.url);
      loc.pathname = loc.pathname.replace(`/s/${sub}`, '') || '/';
      return new Response(null, { status: res.status, headers: { location: loc.toString() } });
    }
    return res;
  },
};
