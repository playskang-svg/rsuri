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
- 키워드 사이트: `https://<키워드slug>.suriwiki.com/` (사이트 메인) · `/<지역slug>` (지역 페이지) · `/sangdam` (상담 안내).
  기준 사이트(wrapping.koreajipsurimaster.com)의 홈/지역 페이지 구조를 그대로 따른다(`scripts/page-template.mjs`, Tailwind CDN + 동일 CSS).
  키워드마다 **개별 커스텀 도메인**으로 배포한다(`wrangler.sites.generated.jsonc`는 빌드가 생성). 와일드카드 라우트/DNS는 쓰지 않는다 — 기존 서브도메인(battery 등)을 가로챈 사고가 있었다.
  배포 전 호스트 충돌 검사(계정의 기존 워커 도메인) + wrangler의 기존 DNS 레코드 거부로 이중 방어한다.
  `data.sample=true`인 동안은 noindex·robots 차단. 실제 공개 시 `sample:false`.
  메타: 홈 title=키워드, description·keywords에 키워드/서브키워드, canonical·og·JSON-LD(Breadcrumb·FAQ·ItemList).
  사진은 자리표시자(데이터에 이미지 경로를 넣으면 교체 예정). 연락처·사업자정보·가격·소요시간은 확인된 데이터가 없어 넣지 않았다.
- 사이트 1개 = 메인 키워드 1개 = 서브도메인 1개. 페이지 1개 = `{지역} {메인키워드}` = `/<지역slug>`. 서브 키워드는 별도 페이지 없이 키워드 페이지가 품는다(대표 서비스 카드 6개).
- 데이터: `site_meta[site] = {main_keyword, slug, sub_keywords[], url}` + `pages[].region / region_slug / page_url`.
- 배포: 저장소 루트 `.github/workflows/suriwiki-deploy.yml` (main 머지 시, `bizhelp/**` 변경만). 시크릿은 rsuri의 `CLOUDFLARE_API_TOKEN/ACCOUNT_ID`.
- 페이지 템플릿: `scripts/page-template.mjs`, 스타일: `src/css/keyword-page.css`. 본문은 샘플 문구이며 가격·연락처·사업자 정보는 넣지 않았다.

## 업로드 페이지 (`/upload/<키워드slug>`)
`https://admin.suriwiki.com/upload/<키워드slug>` — 메인 키워드(사이트) 단위로 운영자가 정보와 파일을 올리는 페이지. `in.koreazib.com/upload/team/team19` 구조를 따라 만들었다.
- 사업자등록증(JPG/PNG/PDF ≤10MB, 브라우저 안에서 OCR로 텍스트 추출·항목 파싱, 전체 복사)
- 사이트 정보: 사이트 노출 전화번호 · 블로그 · 유튜브 · 참고 사이트
- 카테고리 = 그 키워드의 서브 키워드 6개. 사진(≤50MB)·동영상(≤100MB) 다중/폴더(묶음)/붙여넣기/카메라 업로드, 진행률, 세션 카운터
- 메모(카테고리별, 입력 후 자동 저장), 갤러리(탭·페이지·삭제·선택/폴더 묶음 카테고리 이동·라이트박스)
- **네이버·구글 계정 비밀번호 입력란은 만들지 않았다**(제3자 비밀번호를 웹 폼에 저장하지 않는다).
- 저장소: D1(정보·메타데이터·메모). 파일 본문은 R2 바인딩이 있으면 R2, 없으면 D1 `blobs` 테이블(base64)에 둔다. D1 방식은 사진·사업자등록증 1.2MB 이하(화면에서 자동 축소)만 받고 동영상은 받지 않는다. R2는 결제 수단 등록 후 `wrangler.jsonc`의 주석 처리된 `r2_buckets`를 켜면 원본·동영상까지 열린다
- `<키워드slug>.suriwiki.com/upload` 는 관리자 업로드 페이지로 302 리다이렉트한다
- API: `worker/admin.mjs` (`/api/s/<slug>/…`, 공개 내보내기 `/api/export/profiles`는 전화·블로그·유튜브·참고 사이트만)
- **연동**: 키워드 사이트 빌드(`sites` job, 매일 05:00 KST + 배포 시)가 `/api/export/profiles`를 읽어 푸터 연락처(tel 링크)·상담 페이지 전화 버튼·블로그/유튜브 링크·JSON-LD(telephone, sameAs)에 반영한다. 값이 없는 사이트는 아무것도 그리지 않는다.
- **보안은 아직 없다**: 누구나 URL을 알면 접근할 수 있다. `authorize()`(worker/admin.mjs) 한 곳에 Cloudflare Access JWT 검증을 넣으면 된다. 그 전에는 실제 사업자등록증 등 민감 파일을 올리지 않는다.

## 푸터 사업자 정보·연락처
- 기본값은 `scripts/site-defaults.mjs` 한 곳: 상호 수리위키, 연락처 010-4684-8838, 카카오톡 채널 https://pf.kakao.com/_bcVPX
- 업로드 페이지의 '사이트 정보'(상호·대표자·사업자등록번호·주소·연락처·카카오톡·블로그·유튜브·관련 서비스 링크)를 입력하면 입력값이 우선하고, 비운 항목만 기본값으로 채운다. 대표자·사업자등록번호·주소·블로그·유튜브·관련 서비스는 입력했을 때만 표시한다
- 푸터(모든 페이지)·상담 페이지·홈 JSON-LD에 반영. 다음 배포(매일 05:00 KST 또는 수동 실행) 때 적용
- 사업자등록증 OCR 텍스트는 사이트로 내보내지 않는다(오인식 방지). 사람이 입력한 값만 노출한다
