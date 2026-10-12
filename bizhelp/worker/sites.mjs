// <키워드slug>.suriwiki.com/<지역slug>  →  정적 에셋 /s/<키워드slug>/<지역slug>/
// 커스텀 도메인으로 붙은 호스트만 이 워커에 도달한다(와일드카드 라우트 없음).
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const host = url.hostname.toLowerCase();
    if (!host.endsWith('.suriwiki.com')) return new Response('Not found', { status: 404 });
    const sub = host.slice(0, -'.suriwiki.com'.length);
    if (!/^[a-z0-9-]+$/.test(sub)) return new Response('Not found', { status: 404 });
    // /upload 는 관리자 업로드 페이지로 보낸다(내용은 이 호스트에 두지 않는다).
    if (/^\/upload\/?$/.test(url.pathname)) return Response.redirect(`https://admin.suriwiki.com/upload/${sub}/`, 302);
    // 확장자 없는 경로는 끝에 /를 붙여 에셋을 바로 조회한다(안 그러면 ASSETS가 내부 경로(/s/<sub>/…/)로 리다이렉트한다).
    if (!url.pathname.endsWith('/') && !/\.[a-z0-9]+$/i.test(url.pathname)) url.pathname += '/';
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
