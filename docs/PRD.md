# SuriWiki PRD — 지역×키워드 조합형 집수리 정보 사이트

- 문서 상태: v1.0 draft (9번 Open Questions 확정 전까지는 초안)
- 근거 문서:
  - `Suriwiki_CT_MOD_모듈형_콘텐츠_생성_가이드_v0.3.docx` (콘텐츠 설계 — 이하 "CT·MOD 가이드")
  - `keyword-tree` 스킬 (`~/.claude/skills/keyword-tree`) — 기술 아키텍처 청사진
  - 기존 `rsuri` 스캐폴드 코드 분석 (`src/`, `server.ts`, `package.json`)
- 이 문서의 목적: 이후 모든 세션이 같은 스택·같은 데이터 모델·같은 페이지 생성 규칙으로 일관되게 작업하기 위한 기준선. 구현 중 이 문서와 다른 결정을 내리면 이 문서를 먼저 갱신하고 코드를 짠다.

---

## 1. 목표

지역(전국 시/도 > 시/군/구 > 동) × 수리 키워드(공사명 메인, 9개 대분류 30여 종)를 조합해 대량의 정적 페이지를 만드는 pSEO 집수리 정보 사이트.

세 가지 조건을 동시에 만족해야 한다:

1. **조합마다 실질적으로 다른 콘텐츠** — 지역명만 바꾼 복붙이 아니라, 실제 근거(CASE)와 검색 의도가 다른 글. (CT·MOD 가이드 07장 "동일 CASE에서 여러 LANDING을 만들 때는 검색 질문·첫 답변·핵심 모듈 조합 중 하나 이상이 실질적으로 달라야 한다")
2. **네이버·구글 크롤러가 URL 단위로 읽을 수 있는 정적 HTML** — 클라이언트 렌더링 SPA로는 달성 불가 (3번 참조)
3. **클릭을 유도하는 CTA** — 전화/문자/사진상담(M24 모듈). 제휴 링크·쿠팡파트너스 모델이 아니다 (`keyword_tree_affli_coupas` 스킬이 아니라 기본 `keyword-tree` 스킬이 맞는 이유).

---

## 2. 핵심 결정: 기술 스택

| 레이어 | 선택 | 근거 |
|---|---|---|
| 프레임워크 | **Next.js 14 App Router**, `output: 'export'` (완전 정적 export) | `keyword-tree` 스킬에서 실제 pSEO 사이트(`pseo-site/`)로 이미 검증된 패턴. 서버 없이 지역×키워드 수만 페이지를 안정적으로 생성 |
| 데이터 | **Supabase Postgres** (아래 4번 스키마) | 키워드/지역/콘텐츠를 코드 밖 데이터로 분리 → 코드 수정 없이 콘텐츠만 갈아끼울 수 있음. anon key로 빌드 시 읽기, `service_role`은 로컬 Node 스크립트에서만 |
| 배포 | **Cloudflare Workers 정적 자산**, GitHub Actions가 `main` push를 감지해 빌드+배포 | CLAUDE.md 규칙 "배포는 `git push origin main`으로만 한다"를 지키면서 CI가 `wrangler deploy`를 실행. **keyword-tree는 Pages를 쓰지만 채택하지 않았다** — Cloudflare 공식 문서가 신규 프로젝트는 Workers로 시작하라고 안내하고, 파일 한도가 유료 기준 Pages 2만 vs Workers 10만이라 keyword-tree가 쓰던 "키워드별 프로젝트 분할 배포"(`split-by-keyword.mjs`/`deploy-all.mjs`)를 아예 안 만들어도 된다. 자세한 근거는 [DEPLOY.md](DEPLOY.md) |
| 콘텐츠 생성 | **Node 시딩 스크립트**(`scripts/*.mjs`) + AI 보조 초안, 별도 어드민 UI는 만들지 않음 | `keyword-tree`가 이미 이 패턴으로 데이터를 채운다. 지금 단계에서 커스텀 대시보드를 새로 만드는 것보다 데이터 파이프라인이 우선순위가 높음 ("효율적인 스택") |
| 스타일 | Tailwind CSS | 기존 스캐폴드와 CT·MOD 가이드 문서 스타일 모두 Tailwind 전제와 자연스럽게 맞음(기존 `src/`도 Tailwind 사용 중) |

이미지 처리(OG 썸네일)·빌드 파이프라인·알려진 함정은 `keyword-tree` 스킬 3~7장을 그대로 따른다(여기서 재설명하지 않음).

---

## 3. 기존 Vite+React 스캐폴드 처리 방침

`src/App.tsx`, `src/components/*`, `server.ts`를 직접 읽고 확인한 사실:

- **라우팅이 없다.** `currentView`/`selectedPageId`는 React state일 뿐 URL에 반영되지 않는다. 지역×키워드 페이지가 전부 같은 URL(`/`)에서 렌더링된다 — 크롤러가 페이지 단위로 색인할 URL 자체가 없어 목표 2번을 구조적으로 달성할 수 없다.
- `useEffect`로 `document.title`/meta description을 마운트 후 JS로 갱신하는데, 이는 네이버 크롤러 기준으로는 사실상 보이지 않는다.
- 반면 `src/types.ts`(`WikiKeywordPage`, `RegionItem`, `RepairCategory`, `LocalMasterPro` 등)와 `src/data/mockWikiData.ts`(9개 공종 카테고리, 10개 지역, 완성도 높은 목업 5페이지)는 콘텐츠 모델과 실제 한국어 카피 품질이 좋고, CT·MOD 가이드의 LANDING 개념과 거의 그대로 대응된다(`combinedKeyword` = 키워드+지역, `geoMeta.keywords/lsiKeywords/canonicalUrl`은 이미 SEO 메타를 선반영해 둠).

**결정(확정, 2026-08-31)**: SPA 자체(App.tsx/컴포넌트/server.ts)는 공개 사이트의 기반으로 채택하지 않는다. `mockWikiData.ts`는 4번 스키마로 옮기는 **시드 데이터 원본**으로 재사용한다. 코드는 저장소에 남기되(히스토리 보존, 강제 삭제하지 않음) 신규 개발은 여기서 진행하지 않는다.

---

## 4. 데이터 모델 — `keyword-tree` 5테이블 + CT·MOD 확장

`keyword-tree`의 스키마(`pseo_keywords`/`pseo_keyword_variants`/`pseo_content_sections`/`pseo_regions`/`pseo_page_listings`)는 "키워드 × 지역 = 페이지 1개, 이웃 지역과 겹치지 않게 버전 해시로 선택"만 다룬다. CT·MOD 가이드는 여기에 "하나의 현장 CASE에서 서로 다른 검색 의도를 가진 여러 페이지(LANDING/WIKI/CASE)를 파생시키는" 축을 하나 더 요구한다. 둘을 합친 제안 스키마:

| 테이블 | 역할 | 핵심 컬럼 | 대응 |
|---|---|---|---|
| `suri_regions` | 지역 트리 (자기참조) | `parent_id`, `slug`((parent_id,slug) 복합유니크), `level`(SIDO/SIGUNGU/DONG) | `pseo_regions` 그대로 |
| `suri_categories` | 공종 대분류 9종 | `slug`, `display_name` (주방/싱크대, 누수/방수 …) | 신규 — 기존 `RepairCategory` 타입 |
| `suri_repair_keywords` | 공사명 메인 키워드 사전 | `category_id`, `slug`, `display_name`, `phone`(CTA 기본값) | `pseo_keywords`에 대응 |
| `suri_cases` | 현장 사실 원자료 (사람 입력) | `region_id`, `repair_keyword_id`, `problem`/`judgment`/`work`/`result`(현장 사실), `evidence_ids`(사진) | 신규 — CT·MOD의 "원천 CASE" |
| `suri_pages` | **발행 단위** (키워드×지역 실제 페이지) | `page_type`(CATEGORY/TOPIC/CASE/WIKI/AREA/LANDING), `content_type`(CT1~6), `search_intent`, `source_case_id`, `region_id`(nullable — TOPIC 등 지역무관), `repair_keyword_id`, `required_modules`/`selected_modules`/`module_order`, `slug`, `decision`(CREATE/UPDATE/MERGE/HOLD) | `pseo_keyword_variants` + `pseo_page_listings` + CT·MOD 10장 저장값 병합 |
| `suri_page_sections` | 페이지 본문 (모듈별 블록) | `page_id`, `module_code`(M01~M24), `order`, `body` | `pseo_content_sections` |
| `suri_page_images` | 이미지 세트 | `page_id`, `role`(BEFORE/PROCESS/AFTER/MATERIAL/TOOL), `url`, `overlay_note` | 신규 — CT·MOD 04장 |
| `suri_local_pros` | 지역별 기사/업체 (CTA용) | `region_id`, `name`, `phone`, `badges`, `rating` | 신규 — 기존 `LocalMasterPro` 타입 |

**지역 dedup(수평축)**은 `keyword-tree`의 `pickVariant` 해시 방식을 그대로 쓴다(같은 검색의도라도 이웃 동네끼리 문장이 안 겹치게). **의도 다양화(수직축)**는 CT·MOD의 CT/모듈 선택 규칙으로 처리한다(같은 CASE라도 LANDING/WIKI/CASE가 서로 다른 질문에 답하게). 이 두 축이 이 사이트 아키텍처의 핵심이고, `keyword-tree` 원본에는 수직축이 없었다는 점이 가장 큰 확장 포인트다.

`supabase/schema.sql` 실제 DDL은 PRD 승인 후 다음 단계에서 작성한다(이 문서는 방향까지만).

---

## 5. 콘텐츠 아키텍처 요약 (원문: CT·MOD 가이드 v0.3)

### Content Type (중심 CT는 페이지당 1개)

| CT | 타입 | 핵심 질문 | 주요 활용 |
|---|---|---|---|
| CT1 | 문제·해결형 | 왜 생겼고 어떻게 해결하는가 | LANDING·WIKI |
| CT2 | 절차·튜토리얼형 | 무엇을 준비하고 어떤 순서로 | WIKI |
| CT3 | 정보·지식형 | 대상·재료·공구는 무엇인가 | WIKI·TOPIC |
| CT4 | 비교·선택형 | A와 B는 무엇이 다른가 | WIKI·LANDING |
| CT5 | 진단·판단형 | 수리 vs 교체 무엇이 필요한가 | LANDING·WIKI·TOPIC |
| CT6 | 사례·현장형 | 실제 현장에서 무엇을 했는가 | CASE·LANDING |

### Module 24종은 원문(가이드 02~03장) 그대로 채택 — 여기서 재복사하지 않음

구현 시 반드시 지킬 규칙만 요약:
- 필수 모듈의 실제 근거가 없으면 문장을 지어내지 말고 CT를 바꾸거나 `HOLD` 처리
- 옵션 모듈은 보통 2~4개만, 실제 CASE 정보가 있는 것만
- 전기·가스·구조·심한 누수·고소작업이면 M16(안전·중단 기준)을 자동 필수로 승격
- CASE 기반 WIKI/LANDING은 M19(실제 CASE 근거)·M20(사진·오버레이) 우선

---

## 6. URL / 라우팅 (제안 — 세부 확정은 다음 단계)

`keyword-tree`의 `/{keyword}/{...region-path}` 패턴을 기본으로 하되, CT·MOD의 지역-무관 페이지 타입을 위해 세그먼트를 추가해야 한다:

```
/                                          홈
/{repair-keyword}                         허브 (해당 키워드의 전지역 카드) — keyword-tree 그대로
/{repair-keyword}/{시도}/{시군구}/{동}     LANDING (핵심 발행 단위) — keyword-tree 그대로
/wiki/{topic-slug}                         WIKI/TOPIC (지역 무관 CT2/CT3/CT4) — 신규
/case/{case-slug}                          CASE 원문 (CT6, 현장 그대로) — 신규
/category/{category-slug}                  9개 공종 대분류 허브 — 신규
```

`/wiki`, `/case`, `/category` 세 세그먼트의 정확한 계층(예: WIKI를 지역 하위에도 노출할지)은 아직 미확정 — 구현 착수 전 별도로 좁힌다.

---

## 7. 사람 vs AI 역할 (CT·MOD 가이드 05장 그대로 채택)

| 담당 | 업무 |
|---|---|
| 사람 | 현장 사실(지역/공간/대상/문제/판단/작업/결과) 입력, 원본 사진 업로드 및 공개범위 표시, 최종 확인·승인 |
| AI | CASE 구조화, 키워드·LANDING 후보 추천(6~8개), CT·모듈 조립, 이미지 세트 구성, 기존 URL과 중복·품질 검수 후 CREATE/UPDATE/MERGE/HOLD 판정 |

지금 단계에서는 이 워크플로를 사람이 Claude Code 세션에서 직접 수행(CASE 사실을 프롬프트로 전달 → Claude가 구조화해 `suri_cases`/`suri_pages` 시딩 스크립트 생성)하고, 전용 입력 UI(가이드 06장)는 MVP 이후로 미룬다.

---

## 8. 로드맵

1. ~~PRD 정의~~ (이 문서)
2. ~~Supabase 프로젝트 생성 + `supabase/schema.sql` 작성~~ — 완료. 프로젝트 `suriwiki`(`xparlhzbactezsvuteto`, ap-northeast-2)에 8테이블 + RLS 적용 완료. `suri_cases`의 "RLS enabled, no policy" 보안 lint는 의도된 설계(anon 완전 차단, service_role 전용) — 오탐 아님
3. `mockWikiData.ts` → 시드 스크립트(`scripts/seed.mjs`)로 이관 — **부분 완료**
   - 완료(구조 데이터, execute_sql로 직접 반영): `suri_regions` 23행(서울/경기 풀트리 + 대구·충청남·충청북 SIDO만 placeholder, 부산 등 범위 밖 지역 제외), `suri_categories` 9행 전체, `suri_repair_keywords` 32행 전체(사전만 — 아직 CASE 없는 26개 포함)
   - 작성 완료, 실행 대기(`scripts/seed.mjs`, `npm run seed`): mock의 실제 CASE 6건(wiki-1~6, 전부 서울/경기 — 범위 밖 지역 없음) → CASE당 LANDING(CT1)+CASE(CT6) 페이지 2개, 총 12페이지 + 지역 마스터(CTA). `SUPABASE_SERVICE_ROLE_KEY`가 `.env.local`에 없어 아직 미실행 — 키 확보 후 `npm run seed` 한 번이면 끝
   - 카테고리 범위(9종 전체 vs 축소)는 여전히 미확정이지만, 사전 자체는 비용이 낮아 우선 9종 전체를 넣어둠 — 실제 페이지는 어차피 CASE가 있는 것만 생성되므로 나중에 축소해도 손실 없음
4. ~~Next.js 앱 스캐폴드~~ — 완료, 빌드 검증까지 마침. `web/` 디렉터리(루트 구 Vite 앱과 별도 패키지).
   - Next.js **16.3.3**(App Router, `output:'export'`) + React 19 사용 — 원래 keyword-tree 문서 예시는 14.2.35였지만, `npm audit`에서 그 버전에 걸린 high-severity CVE 다수(주로 서버 런타임 대상: Server Actions SSRF, 미들웨어 캐시 포이즈닝 등 — 정적 export라 실제 노출은 제한적이지만)가 16.3.3에서만 해결돼 새 스캐폴드라 부담 없이 최신으로 올림. 대신 Next 15+의 **`params`가 Promise로 바뀐 breaking change**를 전체 동적 라우트(`[keyword]`, `[keyword]/[...path]`, `category/[category]`, `case/[slug]`, `wiki/[slug]`)에 반영해야 했음(await params) — keyword-tree 원문 예시 코드를 그대로 베끼면 이 부분에서 깨지니 유의
   - 라우팅은 PRD 6번 구조 그대로: `/`, `/{keyword}`, `/{keyword}/{시도}/{시군구}/{동}`, `/category/{slug}`, `/case/{slug}`, `/wiki/{slug}`
   - `lib/supabase.ts`가 6개 테이블을 고정 쿼리로 읽고(`.range()` 페이지네이션 포함) 메모리에서 조립 — keyword-tree 3번 전략 그대로. `pickVariant`(지역간 콘텐츠 중복 방지용 해시 선택)는 이식하지 않음 — 우리 모델은 애초에 실제 CASE가 있는 조합만 `decision=CREATE/UPDATE`로 발행하므로 keyword-tree가 겪던 "대량 생성 시 이웃 지역과 중복" 문제 자체가 구조적으로 발생하지 않음
   - `scripts/generate-sitemap.mjs`로 빌드 전 정적 sitemap.xml 생성(`app/sitemap.ts` + `output:'export'` 조합이 깨지는 keyword-tree의 알려진 함정 회피)
   - **빌드 검증**: 임시 테스트 페이지(LANDING/CASE/WIKI 각 1개, `[TEST]` 접두사로 표시)를 잠깐 넣어 `npm run build` → 16개 정적 페이지 전부 생성 확인(지역 조상 체인 breadcrumb, 섹션 본문 렌더링까지 실제 HTML에서 확인) 후 바로 삭제 — DB는 다시 구조 데이터만 있는 빈 상태
   - **아직 안 한 것**: OG 썸네일 이미지 생성(`api/og/...`, next/og+sharp+로컬 폰트) — mock 데이터에 실제 이미지가 없어 후순위로 미룸. 실제 CASE 콘텐츠(`npm run seed`)도 여전히 service_role 키 대기 중
   - 빌드 중 "multiple lockfiles" 경고 발생(루트의 구 Vite 앱 lockfile과 `web/`의 lockfile이 둘 다 잡힘) — 에러는 아니고 무시 가능, 나중에 구 스캐폴드 정리 시 자연히 없어짐
5. Cloudflare Workers + GitHub Actions 배포 파이프라인 — **워크플로 작성 완료, 시크릿 등록 대기**
   - `.github/workflows/deploy.yml`: `main` push(및 수동 `workflow_dispatch`)로 `web/`를 빌드하고 `wrangler-action`으로 Cloudflare Workers에 배포. CLAUDE.md의 "배포는 `git push origin main`으로만" 규칙 준수
   - `web/wrangler.jsonc`: 자산 전용 Worker(`main` 없음 → `assets.binding`도 두지 않음). Pages와 달리 Workers는 라우팅을 명시해야 해서 `not_found_handling: "404-page"`(SPA 아님) + `html_handling: "auto-trailing-slash"` 지정. `npx wrangler deploy --dry-run`으로 설정 검증 완료(자산 206개 인식)
   - Worker는 대시보드에서 미리 만들 필요가 없다 — 첫 배포 때 `name`으로 자동 생성됨
   - 설정 절차와 필요한 GitHub Secrets 4개는 [DEPLOY.md](DEPLOY.md) 참고. `service_role` 키는 CI에 넣지 않는다(빌드는 읽기 전용이라 anon으로 충분)
   - **정적 export의 함정**: Supabase 데이터만 바꾸면 사이트에 반영되지 않는다. 콘텐츠 변경 후에는 코드 push가 없어도 `workflow_dispatch`로 재빌드해야 한다 — 그래서 수동 트리거를 넣어둠
   - **`/wiki/{slug}` 라우트는 현재 비활성**: `output:'export'`는 동적 라우트마다 최소 1개 경로를 요구하는데 WIKI/TOPIC 페이지가 아직 0개라 활성 상태면 빌드가 통째로 깨진다. Next.js의 private 폴더 규칙을 이용해 `web/app/_pending/wiki/`로 옮겨둠(코드는 그대로 보존, 검증 완료). 첫 WIKI 페이지가 생기면 `git mv web/app/_pending/wiki web/app/wiki` 한 번이면 복구됨
   - 도메인 `suriwiki.com` 연결도 DEPLOY.md 4번 절차대로 사람이 진행
6. `CLAUDE.md` 5번 섹션(기술스택/빌드/배포) 확정 반영

---

## 9. Open Questions / 확정 로그

- [x] 기존 SPA(`src/App.tsx` 등): **폐기하고 콘텐츠만 시드로 이관** — 확정
- [x] 도메인: **suriwiki.com**으로 최종 연결 예정(mock 데이터의 `suriwiki.kr` 표기는 틀림 — 시드 이관 시 `.com`으로 교정) — 확정
- [x] **Supabase**: 신규 프로젝트 생성 완료 — `suriwiki` (ref: `xparlhzbactezsvuteto`, org: `vyxtrcvtlepxbozdqmtf`, region: `ap-northeast-2`, 무료 티어 $0/월)
- [x] **Cloudflare**: 계정 보유 확인 — Pages 프로젝트/API 토큰 발급은 로드맵 5번에서 진행(로컬에 `wrangler` 미설치라 CLI로 직접 확인은 못 함)
- [x] **MVP 지역 범위**: keyword-tree처럼 전국 지역 트리를 처음부터 다 채우지 않는다 — **서울특별시·경기도·대구광역시·충청남도·충청북도**(4개 시/도, "충청"은 남/북 둘 다로 해석)만 우선 시딩, 나머지는 필요시 추가. 기존 mock 데이터의 부산(해운대구) 지역은 이번 범위 밖 — 시드 이관 시 제외
- [x] MVP 카테고리 범위: **사전(9종 전체)은 우선 다 넣고, 실제 발행 페이지는 CASE가 있는 키워드만** — 카테고리/키워드 사전은 저장 비용이 거의 없어 축소할 이유가 없고, 실제 페이지 생성은 어차피 `decision`(CREATE/UPDATE/MERGE/HOLD)으로 개별 통제되므로 사전 범위와 발행 범위는 독립적 — 확정
