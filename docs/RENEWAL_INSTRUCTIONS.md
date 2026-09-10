# 수리위키 리뉴얼 지시문

리뉴얼 작업의 기준 문서. 아래 여덟 항목이 이번 개편의 범위이자 완료 조건이다.
구현 중 이 문서와 다른 결정을 내리면 이 문서를 먼저 갱신하고 코드를 고친다.

- 대상: `playskang-svg/rsuri` (수리위키, suriwiki.com)
- 현재 구조: Next.js 16 App Router `output:'export'` + Supabase Postgres + Cloudflare Workers 배포
- 관련 문서: [PRD.md](PRD.md) · [CONTENT_MODEL.md](CONTENT_MODEL.md) · [DEPLOY.md](DEPLOY.md)

---

## 1. 관리자 페이지 완전 제거, 콘텐츠는 하드코딩 방식

관리자 페이지를 남김 없이 걷어낸다. 콘텐츠는 화면에서 입력하지 않고 저장소 안의 파일로 관리한다.

제거 대상
- `web/app/admin/page.tsx` (1,790줄)
- `web/app/admin/layout.tsx`
- 관리 화면 전용으로만 쓰이던 Supabase 쓰기 경로, `is_admin()` 기반 정책 중 관리 화면 전용 분기
- 관리 화면에서만 호출되던 재배포 트리거 (`feat: 관리자에서 버튼 하나로 사이트 재배포`로 들어온 경로)

대체 경로
- 콘텐츠 원본은 `scripts/data/keyword-content/<slug>.json`, `scripts/data/region-profiles.json`, `scripts/data/base-keywords.json`
- 반영은 `node scripts/build-page-content.mjs <slug>` → 생성된 SQL 검토 → DB 반영 (승인 후)
- 배포는 네 경로 모두 관리 화면 없이 성립한다 — `main` push(자동) · 매일 05:00 KST cron(자동) · Actions `workflow_dispatch`(수동) · Claude 세션에 요청. 휴대폰만으로 완결된다

관리 화면의 '사이트 재배포' 버튼이 사라지면서 콘텐츠만 바뀐 경우의 재빌드 경로가 수동 트리거뿐이 되므로, `deploy.yml`에 매일 자동 재빌드(cron)를 넣어 대체했다.

Supabase Edge Function `redeploy`는 저장소 밖(Supabase 프로젝트)에 있어 코드 삭제로는 사라지지 않는다. GitHub 토큰을 보유한 함수이므로, 호출자가 없어진 뒤에는 Supabase 대시보드에서 별도로 삭제한다.

주의: 관리 화면이 만들어 둔 데이터는 남는다. `level:'CUSTOM'`, `slug:'custom-{타임스탬프}'` 형식으로 들어간 `suri_regions` 행과 중복 지역 행(강남구·마포구·서초구·송파구·양천구·영등포구가 각 두 번)은 화면을 지운다고 사라지지 않는다. 6번 항목의 URL 보존 원칙에 맞춰 정리 대상을 따로 목록화한 뒤 처리한다.

## 2. 백엔드 Supabase 유지, 키워드별 자동 페이지 생성 DB 구조 보존

Supabase는 그대로 쓴다. 프로젝트 `suriwiki` (`xparlhzbactezsvuteto`, ap-northeast-2) 유지.

보존할 8개 테이블 — 스키마 변경 금지, 컬럼 삭제 금지
`suri_regions` · `suri_categories` · `suri_repair_keywords` · `suri_cases` · `suri_pages` · `suri_page_sections` · `suri_page_images` · `suri_local_pros`

특히 다음 세 가지는 키워드×지역 자동 생성의 축이므로 반드시 유지한다.
- `suri_repair_keywords.content` + `content.local_pool` — 키워드 자산과 문장 풀
- `suri_regions.profile` — 지역 유형·인접·특성·대표 동
- `suri_pages.decision` (CREATE/UPDATE/MERGE/HOLD) — 발행 통제. RLS가 `decision <> 'HOLD'`로 걸려 있어 재료 없는 페이지가 색인되지 않는다

조립 로직 `web/lib/compose-local.ts`도 유지한다. 같은 (키워드, 지역)이면 몇 번 빌드해도 같은 결과가 나와야 한다는 규칙은 리뉴얼 후에도 동일하다.

## 3. 프론트엔드 디자인·레이아웃·사진·콘텐츠 전면 개선

`web/app`, `web/app/_components`, `web/app/globals.css` 전체가 개편 대상이다. 1~2번이 정한 경계(관리 화면 제거, DB 스키마 보존) 안에서는 제약 없이 새로 만든다.

사진은 현재 0장이다. `suri_page_images`·`suri_keyword_images` 모두 비어 있어 전/후 비교 섹션이 렌더링되지 않는다. 실사가 확보되면 키워드 단위로 등록하는 것만으로 전 지역 페이지에 붙는다. 실사가 없는 동안 전/후 비교 자리에 스톡 사진을 넣지 않는다 — 같은 현장이 아니라 비교가 성립하지 않는다. 대신 `web/public/illustrations/` 의 SVG 도해를 확장해 채운다.

## 4. 콘텐츠와 키워드는 최초 기획 자료 기준으로 재작성

기준 자료
- `Suriwiki_CT_MOD_모듈형_콘텐츠_생성_가이드_v0.3.docx` — CT1~CT6 콘텐츠 타입, M01~M24 모듈
- `src/data/mockWikiData.ts` — 9개 공종 대분류, 초기 카피 원본
- `docs/PRD.md` 5번 (콘텐츠 아키텍처)

지금 사이트에 올라간 문장이 아니라 위 자료를 원본으로 놓고 다시 쓴다. 재작성 시 지킬 규칙
- 키워드 자산(`content`)에는 지역명을 절대 넣지 않는다. 모든 지역이 상속하므로 지역명이 박히면 상속받는 순간 틀린 글이 된다
- `local_pool.angles`는 `region-profiles.json`의 8개 지역 유형을 전부 채운다. 빠진 유형은 조립이 실패해 빈 페이지가 된다
- `local_pool.sections` 중 하나에 `"final": true` (문의 안내)를 둔다
- 근거 없는 문장은 지어내지 않는다. 필수 모듈의 근거가 없으면 CT를 바꾸거나 `HOLD`로 둔다
- 전기·가스·구조·심한 누수·고소작업이면 M16(안전·중단 기준)을 필수로 승격

현재 콘텐츠가 채워진 키워드는 3개(`door-repair`, `stair-restoration`, `wallpaper-restoration`)다. 나머지는 `HOLD` 상태이며, 재작성 결과가 갖춰지는 키워드부터 `CREATE`로 되돌려 순차 발행한다.

## 5. 작업 순서 — 구조와 디자인 확정 후 콘텐츠 채우기

콘텐츠부터 쓰지 않는다. 순서를 지킨다.

1. 관리자 제거와 라우트 정리 (1번, 6번)
2. 레이아웃 뼈대와 디자인 토큰 확정 (3번, 7번)
3. 모바일 반응형 검증 (8번)
4. 확정된 틀에 맞춰 키워드별 콘텐츠 재작성 (4번)
5. 키워드 단위로 `HOLD` → `CREATE` 전환 후 발행

이유: 콘텐츠 JSON의 필드 구조가 템플릿 섹션 구성에 묶여 있다. 틀이 흔들리는 상태에서 문장을 쌓으면 키워드 수만큼 재작업이 난다.

## 6. 기존 SEO 요소(페이지 이름·URL 구조)는 최대한 유지

이미 색인된 자산이다. 소폭 수정은 가능하나 전면 교체는 금지한다.

유지할 URL 구조
```
/                                       홈
/{repair-keyword}                       키워드 허브
/{repair-keyword}/{시도}/{시군구}/{동}   지역 LANDING (핵심 발행 단위)
/category/{category-slug}               공종 대분류 허브
/case/{case-slug}                       현장 CASE
/sitemap                                전 페이지 색인
```

- `web/app/[keyword]/`, `web/app/[keyword]/[...path]/`, `web/app/category/[category]/`, `web/app/case/[slug]/`, `web/app/sitemap/` 의 경로 형태를 바꾸지 않는다
- 키워드 slug와 지역 slug를 바꾸지 않는다. 바꾸면 색인된 URL이 전부 깨진다
- `web/app/_pending/wiki/`는 보류 상태 유지. 첫 WIKI 페이지가 생기면 `git mv`로 복구
- `robots.txt`, `rss.xml`, `scripts/generate-sitemap.mjs`, 네이버 소유권 인증 메타(`layout.tsx`의 `naver-site-verification`)는 그대로 둔다
- 부득이하게 URL을 바꿔야 하면 변경 목록을 먼저 제출하고 승인 후 진행한다

`<title>`과 메타 설명 문구는 개선해도 된다. 바꾸면 안 되는 건 경로다.

## 7. 폰트와 전반적 비주얼 톤 개선 — 참고 사이트 기준 적용

참고 사이트: `koreajipsurimaster.com` (네이비+골드 계열)

이는 방향 전환이다. 현재 `globals.css`의 디자인 토큰은 "도면지 백색 + 먹색 + 구리 액센트"로, 주석에 "참고사이트와 의도적으로 다른 방향"이라고 명시돼 있다. 이번 리뉴얼은 그 결정을 뒤집고 참고 사이트 톤에 맞춘다.

작업 범위
- `web/app/globals.css`의 `:root` 색상 토큰 재정의 (`--paper`, `--ink`, `--copper`, `--teal` 등 전체)
- 폰트 재선정. 현재는 Google Fonts CDN으로 Noto Serif KR + Noto Sans KR을 불러오고 `body`는 Pretendard를 먼저 찾는데 실제 로드가 없어 폴백에 의존한다. 이 불일치를 해소한다 — 쓸 폰트를 실제로 로드하거나, 로드하는 폰트만 쓰도록 정리
- 시그니처 요소(`.diag-card` 등) 톤 재조정

참고 사이트를 베끼는 것이 아니라 톤과 신뢰감의 기준으로 삼는다.

## 8. 모바일 완전 반응형 — 가독성과 레이아웃 최적화

유입의 대부분이 모바일이다. 모바일을 기준으로 설계하고 데스크톱을 확장으로 둔다.

기준
- 360px 폭에서 가로 스크롤이 발생하지 않는다
- 본문 가독성 확보 — 한국어 기준 본문 16px 이상, 줄간 1.6 이상
- 탭 타깃 최소 44×44px
- 모바일 고정 상담바(하단 CTA)는 유지하되 본문 마지막 요소를 가리지 않게 한다
- 표·긴 코드·도해는 각자 `overflow-x:auto` 컨테이너 안에 넣는다. 페이지 본문 자체가 가로로 밀리면 안 된다
- 이미지·SVG 도해에 `max-width:100%`

검증은 실제 렌더 기준으로 한다. 360 / 390 / 768 / 1280px 네 폭에서 홈·키워드 허브·지역 LANDING·CASE·사이트맵을 확인한다.

---

## 항목 간 충돌 정리

1번(관리자 제거·하드코딩)과 2번(DB 구조 보존)은 모순이 아니다. 경계는 이렇다.

| 구분 | 처리 |
|---|---|
| 콘텐츠를 **넣는 방법** | 화면 입력 폐기, 저장소 JSON → 스크립트 → SQL 경로로 일원화 (1번) |
| 콘텐츠가 **사는 곳** | Supabase 그대로. 테이블·컬럼·RLS 유지 (2번) |
| 빌드가 **읽는 곳** | Supabase (anon 읽기). `web/lib/supabase.ts` 유지 |

즉 "하드코딩"은 콘텐츠 원본을 저장소가 갖는다는 뜻이지, DB를 걷어내고 컴포넌트에 문장을 박는다는 뜻이 아니다. 후자로 가면 키워드×지역 자동 생성이 무너지고 2번을 정면으로 위반한다.

## 완료 조건

- 관리자 라우트가 빌드 산출물에 존재하지 않는다
- `npm run build`(web)가 통과하고 정적 페이지 수가 리뉴얼 전보다 줄지 않는다
- 기존 색인 URL이 그대로 200을 반환한다
- 360px에서 가로 스크롤이 없다
- 재작성된 키워드가 `CREATE`로 발행되고 실제 페이지에 본문이 렌더링된다
