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
- 업로드 페이지의 '사이트 정보'(상호·대표자·사업자등록번호·주소·연락처, 채널 6종: 카카오톡·인스타그램·블로그·유튜브·스레드·웹사이트)를 입력하면 입력값이 우선하고, 비운 항목만 기본값으로 채운다. 대표자·사업자등록번호·주소·채널 링크는 입력한 것만 아이콘으로 표시한다
- 푸터(모든 페이지)·상담 페이지·홈 JSON-LD에 반영. 다음 배포(매일 05:00 KST 또는 수동 실행) 때 적용
- 사업자등록증 OCR 텍스트는 사이트로 내보내지 않는다(오인식 방지). 사람이 입력한 값만 노출한다

## 리포트(admin.suriwiki.com) 데이터
- 사이트·페이지 목록: `registry/sites.json`(실제로 배포되는 사이트와 페이지). 순위·처음 만든 날은 코드에 넣지 않고 D1에서 집계한다(`/api/report`)
- 처음 만든 날: 리포트가 처음 본 날을 `page_seen`에 기록. 순위: `rank_log`
- 순위 수집: 네이버 검색 Open API(웹문서) 상위 100건에서 페이지 주소를 찾는다. 30분마다 30페이지씩 처리(cron). GitHub 시크릿 `NAVER_CLIENT_ID`·`NAVER_CLIENT_SECRET`을 등록하면 다음 배포 때 워커 시크릿으로 올라가고, 없으면 수집하지 않으며 리포트에 그 상태를 표시한다
- 주의: Open API의 웹문서 순위는 네이버 통합검색 화면 순위와 같지 않다(참고용). 키워드 사이트가 noindex인 동안에는 순위가 잡히지 않는다
- '이미지업로드URL': 리포트를 캡처해 JPEG로 `/api/share`에 올리고 `/share/<id>.jpg` 주소를 돌려준다(D1 저장, 최근 30개)

## 공사 전/후 사진
- 업로드 페이지 '공사 전/후 사진': 작업 사례 1~4 × 전/후 한 장씩. 적용 범위를 '전체 지역 공통' 또는 특정 지역 페이지로 고른다
- 우선순위: 지역 페이지에 올린 쌍 > 공통 쌍 > 기본 사진. 전·후를 둘 다 올린 사례만 쓴다(한쪽만 있으면 기본 사진 유지)
- 저장: D1(`ba_photos` + `blobs`, 1.2MB 이하로 브라우저가 축소). 키워드 사이트 빌드가 `/api/export/ba`와 `/api/s/<slug>/ba/...`를 읽어 `img/`에 복사한다(지역별은 `img/r/<지역>/`)
- 반영은 다음 배포 때(매일 05:00 KST 또는 수동 실행)


## 키워드 사이트 구조 (참고: 네이버 1페이지 노출 사이트의 섹션 구성)
- 홈: 헤더 → 히어로(대표 이미지 + 작업 전/후 썸네일) → 신뢰 배지 → 작업 항목 → 증상 → 전후 비교 슬라이더 4개 → 진행 절차 → 서비스 지역 → FAQ(+FAQPage 구조화 데이터) → 체크하고 문자 보내기 → CTA → 푸터 → 하단 고정 바(문자·전화)
- 지역 페이지(`/<지역>`): 같은 구성 + 지역 소개 · 가까운 지역 · 지역 전용 사진/설명(업로드 시). 문자 보내기에서 해당 지역이 미리 선택된다
- 그룹 정의: `registry/sites.json`의 `site_meta[사이트].content` = { headline, lead, symptoms[], guide{서브키워드→{target,time,point}} }. 소요 시간은 일반적인 작업 기준이며 금액은 적지 않는다
- 업로드 페이지 입력이 반영되는 곳: 상호·대표자·사업자등록번호·주소·영업시간·연락처·채널 → 푸터/헤더/문자 번호/구조화 데이터, 전/후 사진·설명 → 히어로 썸네일·전후 비교(지역별 우선), 지역 소개 → 해당 지역 페이지 '안내'
- '최종수정일'은 `registry/sites.json`의 `updated`(내용을 바꿀 때 갱신)

## 메인 키워드 그룹 (대시보드 → 업로드 → 키워드 사이트 연동)
- 그룹 하나 = 메인 키워드 = 사이트 하나(분양 단위). 원본은 D1 `groups` 테이블이고, 처음에는 `registry/sites.json`의 8개가 시드로 들어간다
- 대시보드(admin.suriwiki.com)의 '＋ 새 메인키워드 그룹'에서 주소 이름·메인 키워드·서브 키워드(3~8)·지역을 고르면(내용 칸은 선택) 같은 규칙으로 함께 생긴다
  - 사이트 `https://<주소>.suriwiki.com` (홈 + 선택한 지역마다 `/<지역>` + `/sangdam`), 업로드 페이지 `/upload/<주소>`, 리포트 카드
  - 규칙은 `scripts/group-model.mjs` 한 곳(워커 검증·빌드가 공유). 지역 카탈로그 37곳, 예약 주소(admin·www 등)와 형식 검증
  - 내용(대표 문구·소개·증상·서브 키워드별 안내)을 비우면 키워드로 자동 생성하고, 증상·안내 칸이 비면 해당 부분은 건너뛴다
- 반영: 배포 때 생성된다(매일 05:00 KST, 푸시, 수동 실행). 새 주소는 첫 배포에서 커스텀 도메인이 연결된다. 배포 워크플로가 호스트 충돌을 먼저 검사한다
- '지금 반영' 버튼: GitHub 시크릿 `GH_DISPATCH_TOKEN`(저장소 Actions 쓰기 권한 토큰)을 등록하면 켜진다. 60초에 한 번만 받는다. 미등록이면 버튼이 안내 문구를 보여 준다
- 빌드는 `/api/export/groups`를 읽고, 실패하면 `registry/sites.json`으로 대체한다
- 주의: 아직 로그인이 없다(authorize 자리). 그룹 생성·수정·배포 요청은 로그인 보호를 붙이기 전까지 누구나 가능하다

## 사이트 템플릿 4종 (사이트 빌더)
- `scripts/templates.mjs`: 기본 상담형(consult) · 사진 중심형(gallery) · 정보 안내형(guide) · 간편 원페이지형(simple). 템플릿 = 섹션 순서(홈/지역) + 히어로 변형(image·plain·split) + 사진 칸 수 + 테마 CSS. 새 템플릿은 항목 하나를 추가하면 된다. 엔진은 `scripts/page-template.mjs`
- 선택은 업로드 페이지 맨 위 '디자인 템플릿' 카드에서: 미리보기(입력한 내용·사진으로 PC/모바일) → 선택. 저장 값은 D1 `groups.template`(기본 consult)이고, 대시보드 카드에 🎨 템플릿 이름이 표시된다
- 템플릿을 바꿔도 입력한 내용·사진은 유지된다. 업로드 화면의 '공사 전/후' 칸 수만 템플릿(2·4·8개)에 맞춰진다. 칸 수를 넘는 사진은 보관만 되고 사이트에는 나오지 않는다
- 미리보기는 워커가 빌드와 같은 템플릿 코드를 실행한다(`/api/s/<주소>/preview?template=&region=`, 저장하지 않음). 기본 사진은 `dist/site-images`로 함께 배포된다
- 그룹 수정(대시보드)은 템플릿 선택을 바꾸지 않는다. 템플릿 변경은 `/api/s/<주소>/template`
- 사이트별 일부 변경은 코드가 아니라 그룹 내용(문구·증상·안내·사진 설명·지역 소개)으로 한다

## 키워드 일괄 등록 · 지역 추가
- 대시보드 '📥 키워드 일괄 등록': 한 줄에 그룹 하나 — `메인키워드 | 서브키워드(쉼표 3~8개) | 지역(쉼표) | 주소 이름(선택)`. 엑셀에서 복사해 붙여 넣어도 된다(탭 구분). '검증'은 저장하지 않고 결과만 보여 주고, '등록'에서 만든다. 같은 키워드가 이미 있으면 그 그룹을 갱신(내용은 유지)하고, 주소 이름을 비우면 한글에서 자동으로 만든다(`scripts/group-model.mjs romanize`)
- 목록(37곳)에 없는 지역은 '자동 추가'를 켜면 D1 `regions_extra`에 더해지고 지역 페이지가 만들어진다. 지역 주소는 한글에서 자동으로 만들고, 그룹 수정 화면의 '＋ 지역 추가'로도 더할 수 있다
- API: `POST /api/groups/import {rows, apply, auto_regions}`, `POST /api/regions {name, slug?}`. 빌드는 `/api/export/groups`에서 그룹과 추가 지역을 함께 읽는다
- 등록 후 '지금 반영'(배포)까지 이어진다(GH_DISPATCH_TOKEN 등록 시)

## 대시보드 로그인
- 대시보드(`/`)와 관리 API(report·groups·regions·deploy·share)는 로그인해야 열린다. 비밀번호 하나, 세션은 서명된 쿠키 7일, 5회 틀리면 10분 잠금. 오른쪽 위 '로그아웃'
- 업로드 페이지(`/upload/<주소>`)와 그 API, 사이트 빌드용 내보내기(`/api/export/*`), 공유 이미지(`/share/*`)는 열려 있다. 업로드 페이지 로그인은 분양 시점에 따로 만든다
- 기본 비밀번호는 코드에 해시로만 들어 있다. 바꾸려면 GitHub 시크릿 `ADMIN_PASSWORD`(선택: `SESSION_SECRET`)를 등록하면 다음 배포 때 워커 시크릿으로 올라가고 그 값이 우선한다

## 둘러보기 대시보드 · 홍보 페이지

- `https://admin.suriwiki.com/demo/` — 로그인 없이 보는 읽기 전용 대시보드. 같은 `index.html`에 `window.SW_DEMO=1`을 넣어 서빙하고, 데이터는 `/api/demo/report`(읽기 전용, 관리 API 아님)에서 읽는다. 그룹 생성·수정·일괄 등록·지금 반영·이미지 공유·로그아웃 버튼은 만들지 않는다.
- `https://builder.suriwiki.com/` — 사이트빌더 홍보 페이지. 원본은 `promo/index.html`, 빌드가 `{{SITES}}`·`{{PAGES}}`·`{{REGIONS}}`·`{{TEMPLATES}}`·`{{CASES}}`·`{{MARQUEE}}`·`{{TEMPLATE_ROWS}}`를 배포 시점의 실제 값으로 채워 `dist-sites/s/builder/`에 쓴다(추측 수치 없음). 후기 섹션(`{{REVIEWS}}`)은 `promo/reviews.json`에 실제 후기(`{name, rating 1~5, text, keyword?, date?}`)가 있을 때만 생성된다. `builder`는 그룹 주소 이름으로 예약.
