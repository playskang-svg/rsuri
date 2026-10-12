// <키워드slug>.suriwiki.com/<지역slug>  →  정적 에셋 /s/<키워드slug>/<지역slug>/
// 커스텀 도메인으로 붙은 호스트만 이 워커에 도달한다(와일드카드 라우트 없음).
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const host = url.hostname.toLowerCase();
    if (!host.endsWith('.suriwiki.com')) return new Response('Not found', { status: 404 });
    const sub = host.slice(0, -'.suriwiki.com'.length);
    if (!/^[a-z0-9-]+$/.test(sub)) return new Response('Not found', { status: 404 });
    if (url.pathname !== '/favicon.svg') url.pathname = `/s/${sub}${url.pathname}`;
    return env.ASSETS.fetch(new Request(url, request));
  },
};
