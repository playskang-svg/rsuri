/** @type {import('next').NextConfig} */
const nextConfig = {
  // 완전 정적 export — docs/PRD.md 2번 "핵심 결정: 기술 스택" 참고.
  // 서버 없이 지역×키워드 조합마다 정적 HTML을 만들어 Cloudflare Pages에 올린다.
  output: 'export',
  images: {
    // next/image의 온디맨드 최적화 API는 정적 export에서 동작하지 않는다.
    unoptimized: true,
  },
}

export default nextConfig
