// <키워드slug>.suriwiki.com/<지역slug>  →  정적 에셋 /s/<키워드slug>/<지역slug>/
// 공용 파일(css, favicon, robots)은 접두사 없이 그대로 서빙한다.
const SHARED = ['/css/', '/favicon.svg', '/robots.txt'];
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const host = url.hostname.toLowerCase();
    const sub = host.endsWith('.suriwiki.com') ? host.slice(0, -'.suriwiki.com'.length) : '';
    if (!/^[a-z0-9-]+$/.test(sub) || sub === 'www') return new Response('Not found', { status: 404 });
    if (!SHARED.some((p) => url.pathname.startsWith(p))) url.pathname = `/s/${sub}${url.pathname}`;
    const res = await env.ASSETS.fetch(new Request(url, request));
    return res;
  },
};
