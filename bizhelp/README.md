# admin.suriwiki.com — 사이트 제작 현황 리포트

정적 사이트(Cloudflare Workers assets). `src/index.html` 한 페이지가 `src/data/report.json`을 읽어 렌더링한다.

## 섹션 순서 (고정)
1. 카운트 카드 4종: 메인사이트 · 세부사이트 · 총 제작 항목 · 네이버 유효키워드(30위 이내)
2. 유효키워드 목록 버튼/패널 → 클립보드로 저장 · 이미지업로드URL
3. 🆕 새로운 1위 키워드 → 🥇 검색 1위 키워드
4. 사이트별 페이지 목록 (카드 8색 순환, 이번주 신규 분리, 타이틀·H1 일치 점)

## 데이터 스키마 (`src/data/report.json`)
`dates[]`(최신순), `keywords[{id,keyword,site,page_path,created_at}]`, `ranks[{tracking_id,check_date,rank_position}]`,
`pages[{site,page_path,page_url,h1_title,page_title,first_seen,pending?}]`, `business_name`, `sample`.
현재는 `npm run sample`이 만든 가짜 데이터다. 실제 데이터 연결 시 `DATA_URL`(src/js/report.js)만 API로 바꾼다.

## 주의
- 업체 데이터가 들어가면 반드시 인증(Cloudflare Access 등)을 붙인다. 지금은 noindex만 걸려 있다.
- `이미지업로드URL`은 아직 미연결.

## 배포
main 푸시 → GitHub Actions → `wrangler deploy`. 시크릿: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID (suriwiki.com 존이 있는 계정).

## 키워드 구조 (사이트 → 키워드 페이지 → 서브키워드)
- 관리자: `https://admin.suriwiki.com` (`dist/`, `wrangler.jsonc`, 커스텀 도메인 — DNS는 배포 때 자동 생성).
- 열릴 페이지: `https://<키워드slug>.suriwiki.com/<지역slug>` 구조. **아직 배포하지 않는다.** `dist-sites/` 는 샘플 생성물이며, 와일드카드 라우트/DNS는 기존 서브도메인(battery 등)을 가로채므로 쓰지 않는다. 배포할 때는 키워드마다 개별 커스텀 도메인을 붙이고, 기존 서브도메인과 이름이 겹치는지 배포 전에 검사한다.
- 사이트 1개 = 메인 키워드 1개 = 서브도메인 1개. 페이지 1개 = `{지역} {메인키워드}` = `/<지역slug>`. 서브 키워드는 별도 페이지 없이 키워드 페이지가 품는다(대표 서비스 카드 6개).
- 데이터: `site_meta[site] = {main_keyword, slug, sub_keywords[], url}` + `pages[].region / region_slug / page_url`.
- 배포: 저장소 루트 `.github/workflows/bizhelp-deploy.yml` (main 머지 시, `bizhelp/**` 변경만). 시크릿은 rsuri의 `CLOUDFLARE_API_TOKEN/ACCOUNT_ID`.
- 페이지 템플릿: `scripts/page-template.mjs`, 스타일: `src/css/keyword-page.css`. 본문은 샘플 문구이며 가격·연락처·사업자 정보는 넣지 않았다.
