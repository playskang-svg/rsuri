# 수리위키 사이트빌더 — 인수인계 문서

작성 2026-10-13. 이 문서만 읽고 운영·수정·배포를 이어받을 수 있게 정리했다. 세부 규칙의 원본은 `bizhelp/README.md`, 저장소 공통 규칙은 루트 `CLAUDE.md`다. 둘이 다르면 README가 최신이다.

---

## 1. 한 줄 요약

수리·시공 업체용 **키워드 홈페이지 분양 시스템**. 메인 키워드 1개 = 사이트 1개(`<주소>.suriwiki.com`), 지역마다 페이지 1개(`/<지역>`), 상담 안내(`/sangdam`). 관리자가 그룹(키워드·서브키워드·지역)을 만들고, 업체가 업로드 페이지에서 사진·연락처를 올리면, 매일 정기 배포 때 정적 페이지로 굳는다.

**현재 상태: 공개 전 샘플 운영.** `registry/sites.json`의 `"noindex": true`로 전 호스트가 검색 차단돼 있다. 실제 고객·매출 없음.

## 2. 주소와 구성

| 주소 | 정체 | 원본 |
|---|---|---|
| admin.suriwiki.com | 관리센터(로그인 없음): 업체·업로드 허브(수리위키 연동 상태 포함) · 제작 리포트, 업로드 페이지, API, 실시간 렌더 | `worker/admin.mjs`, `src/`, `wrangler.jsonc` |
| admin.suriwiki.com/demo/ | 대시보드(`/`)로 302 (2026-10-23 로그인 폐지) | `worker/admin.mjs` |
| admin.suriwiki.com/upload/<주소>/ | 업체용 관리 페이지(사진·연락처·지역 추가·템플릿) | `src/upload/index.html` |
| <주소>.suriwiki.com | 키워드 사이트 8개 | `scripts/page-template.mjs` + 그룹 데이터 |
| builder.suriwiki.com | 사이트빌더 홍보 페이지 | `promo/index.html` |
| make.bizhelp.kr | 애드블스 메이크(구축·교육) 회사 페이지 | `promo/make/index.html` |

워커는 2개다.

- **bizhelp-admin** (`worker/admin.mjs`): D1 `suriwiki-admin`(바인딩 `DB`), 정적 에셋 `dist/`. cron 없음(네이버 순위 수집은 2026-10-23 제거).
- **suriwiki-keyword-sites** (`worker/sites.mjs`, 설정은 빌드가 생성하는 `wrangler.sites.generated.jsonc`): 호스트 → `/s/<주소>/…` 정적 에셋. 서비스 바인딩 `ADMIN`으로 지역 목록이 배포본과 다르면 관리자 실시간 렌더로 대신 응답(관리자 무응답 시 정적 페이지로 복귀). 다른 존 도메인은 `FIXED = { 'make.bizhelp.kr': 'make' }`.

도메인은 호스트마다 **개별 커스텀 도메인**이다. 와일드카드 라우트·DNS는 쓰지 않는다(기존 서브도메인을 가로챈 사고가 있었다). 배포 워크플로가 먼저 호스트 충돌을 검사한다.

## 3. 저장소 지도 (`bizhelp/`)

| 경로 | 내용 |
|---|---|
| `scripts/build.mjs` | 빌드 진입점. `dist/`(관리자), `dist-sites/`(사이트 전부 + builder·make), `_headers`, 사이트맵·robots, `wrangler.sites.generated.jsonc`, `sites-hosts.txt` 생성 |
| `scripts/page-template.mjs` | 홈·지역·상담 페이지 렌더. 관리자 미리보기·실시간 렌더도 같은 코드 |
| `scripts/templates.mjs` | 템플릿 4종(consult·gallery·guide·simple): 섹션 순서·히어로 변형·사진 칸 수·테마 CSS |
| `scripts/group-model.mjs` | 주소·키워드·지역 검증 규칙(워커와 빌드가 공유). 지역 카탈로그 37곳 |
| `scripts/site-defaults.mjs` | 푸터 기본 상호·연락처(업체 입력값이 우선) |
| `scripts/seo-check.mjs` | 빌드 결과 SEO 점검(`npm run seo`) |
| `registry/sites.json` | 그룹 시드·`noindex` 스위치. 빌드는 `/api/export/groups`를 먼저 읽고 실패하면 이 파일로 대체 |
| `promo/` | builder·make 페이지 원본과 이미지. `promo/reviews.json`은 실제 후기만(비면 섹션 생략) |
| `site-images/<주소>/` | 사이트별 기본 사진(webp) |
| `worker/` | 두 워커 코드 |

## 4. 데이터 (D1 `suriwiki-admin`)

테이블은 워커가 처음 요청 때 `CREATE TABLE IF NOT EXISTS`로 만든다(`worker/admin.mjs` 상단).

| 테이블 | 용도 |
|---|---|
| `groups` | 메인 키워드 그룹(=사이트). 서브키워드·지역·내용·템플릿 |
| `regions_extra` | 카탈로그 밖에서 추가된 지역 |
| `profile` | 업체 입력(전화·블로그·유튜브·상호·대표·사업자번호·채널 등) |
| `files`, `blobs` | 업로드 파일 메타데이터와 본문(R2 바인딩이 없어 D1 base64, 1.2MB 이하) |
| `license` | 사업자등록증(OCR 텍스트는 사이트로 내보내지 않음) |
| `ba_photos`, `ba_captions`, `region_intro` | 전후 사진·설명·지역 소개 |
| `memos` | 업로드 페이지 메모 |
| `page_seen` | 리포트용 첫 발견일 |
| `rank_log` | 예전 네이버 순위 기록(2026-10-23부터 쓰지 않음, 보관만) |
| `shares` | 리포트 이미지 공유(화면 버튼은 제거 예정, 아래 7장) |
| `kv` | 잡다한 키값(예: 마지막 배포 요청 시각) |

빌드가 읽는 공개 내보내기: `/api/export/groups`, `/api/export/profiles`, `/api/export/ba`.
관리 API(로그인 없음): `/api/hub`, `/api/report`, `/api/groups`(+`/import`), `/api/regions`, `/api/deploy`, `/api/share`. 업체용: `/api/s/<주소>/…`(정보·파일·전후 사진·지역·템플릿·미리보기).

## 5. 빌드와 배포

```bash
cd bizhelp
node scripts/build.mjs        # 로컬 빌드 (외부 데이터 없으면 registry/sites.json 사용)
npm run seo                   # 빌드 결과 SEO 점검. 문제 0건이어야 정상
```

배포는 **GitHub Actions만** 한다(로컬 `wrangler deploy` 금지). 워크플로: 루트 `.github/workflows/suriwiki-deploy.yml`.

| 트리거 | 동작 |
|---|---|
| `main` 푸시(`bizhelp/**` 변경) | admin job → sites job 순서로 배포 |
| 매일 05:00 KST cron | 업체가 올린 사진·정보를 정적 페이지에 반영 |
| workflow_dispatch | 수동 즉시 배포(GitHub 앱 → Actions → Run workflow) |
| PR | 빌드 검증만, 배포 안 함 |

동시성 그룹은 `deploy-suriwiki-${event_name}-${ref}`. PR 검증과 main 배포가 같은 그룹이면 머지 직후 배포가 취소되던 문제를 이렇게 풀었다.

## 6. 시크릿·변수

저장소 Settings → Secrets / Variables. 값은 문서·코드·채팅에 적지 않는다.

| 이름 | 종류 | 상태 | 용도 |
|---|---|---|---|
| `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` | Secret | 등록됨 | 배포 |
| `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET` | Secret | 폐지(2026-10-23) | 네이버 순위 수집을 없애 쓰지 않는다 |
| `ADMIN_PASSWORD`, `SESSION_SECRET` | Secret | 폐지(2026-10-23) | 로그인을 없애 쓰지 않는다 |
| `GH_DISPATCH_TOKEN` | Secret | 선택(현재 화면에서 안 씀) | 예전 '지금 반영' 버튼용 |
| `SEO_NAVER_VERIFY`, `SEO_GOOGLE_VERIFY` | Variable | **미등록** | 검색엔진 소유확인 메타 태그 |

선택 시크릿은 등록돼 있을 때만 admin 워커 시크릿으로 올라간다. 실제 등록 여부는 저장소 설정 화면에서 확인할 것(이 문서는 코드 기준으로 썼다).

## 7. 자주 하는 운영 작업

- **새 사이트(그룹) 만들기**: 대시보드 '＋ 새 메인키워드 그룹' 또는 '📥 키워드 일괄 등록'(`메인키워드 | 서브키워드 3~8개 | 지역 | 주소이름`). 저장만 되고 다음 배포 때 생성. 새 주소는 첫 배포에서 도메인이 연결된다.
- **지역 추가**: 업체가 업로드 페이지 '지역 페이지 만들기'에서 직접. 실시간 렌더로 바로 보이고 다음 배포에 정적으로 굳는다.
- **템플릿 추가**: `scripts/templates.mjs`에 항목 1개. 사이트별 차이는 코드가 아니라 그룹 내용으로 푼다.
- **홍보 페이지 수정**: `promo/` HTML. 수치는 플레이스홀더(`{{SITES}}` 등)로 빌드 때 실제 값이 들어간다. 후기·가격을 지어 넣지 않는다.
- **급하게 반영**: Actions에서 `suriwiki-deploy` Run workflow.
- **검색 공개 전환**(사용자 결정 사항): ① 서치어드바이저·서치콘솔 확인 값을 Variables에 등록 → ② `registry/sites.json`의 `noindex`를 `false`로 바꿔 머지·배포 → ③ 각 호스트 `/sitemap.xml` 제출.

## 8. 장애 대응

| 증상 | 원인·대응 |
|---|---|
| 배포 실패: `504 Gateway Timeout`, `malformed response`, `POST /versions 504` | Cloudflare API 장애. 코드 문제 아님. 사이트는 이전 버전이 계속 서비스된다. cloudflarestatus.com 확인 후 복구되면 1회 재실행. 반복 재시도 금지 |
| 머지했는데 배포가 'cancelled' | 동시성 그룹 충돌. 현재 설정이면 재발하지 않아야 함. 나면 수동 실행 |
| 업로드 페이지 미리보기가 안 열림 | 과거 원인: 팝업 HTML의 닫히지 않은 div. 구조를 바꿀 때 모달이 `body` 직계인지 확인 |
| 지역을 만들었는데 안 보임 | 관리자 워커 응답 확인(`/render/<주소>/_state`). 무응답이면 정적 페이지로 복귀하므로 다음 배포를 기다린다 |
| 호스트 충돌로 sites job 중단 | 같은 이름의 도메인이 계정의 다른 워커에 붙어 있음. 그쪽을 정리하거나 주소 이름을 바꾼다 |

## 9. 확정된 사실

- 회사: 애드블스(adbles), 대표 박서희, 사업자등록번호 479-93-02093.
- make.bizhelp.kr 연락처: 전화 010-5516-0301, 카카오톡 ID `newtr`, cosmos0302@naver.com(카카오 채널은 쓰지 않음).
- builder.suriwiki.com·키워드 사이트 기본값: 카카오 채널 `pf.kakao.com/_bcVPX`, 010-4684-8838(`scripts/site-defaults.mjs`).
- 2026-10-12 결정: 대시보드 '지금 반영' 버튼 제거(저장만, 반영은 정기 배포). 리포트 '클립보드로 저장'·'이미지업로드URL' 버튼 제거.
- 규모(2026-10-13 빌드 기준): 키워드 사이트 8개, 지역 페이지 151개, 빌드 페이지 167개(+builder·make), 템플릿 4종, 지역 카탈로그 37곳.

## 10. 남은 일 (우선순위 순)

1. **접근 통제** — 2026-10-23 운영자 요청으로 대시보드 비밀번호까지 없앴다. 지금은 주소만 알면 누구나 대시보드·업로드 페이지에 접근. 실제 업체 자료(사업자등록증 등)를 받기 전에 필수. `worker/admin.mjs`의 `authorize()` 한 곳에 붙이면 된다.
2. **검색 공개 결정** — 7장 순서대로. 공개 전까지 순위 수집은 0으로 나온다.
3. **열린 PR 정리** — `playskang-svg/rsuri#73`(리포트 공유 버튼 제거, CI 통과·머지 대기).
4. **실제 후기** — `promo/reviews.json`. 실제 후기만.
5. **배포 자동 재시도** — Cloudflare 일시 장애 시 실패 알림이 반복된다. 워크플로에 짧은 재시도를 넣는 것을 검토.
6. 쓰지 않는 서버 기능 정리 여부 결정: `/api/deploy`, `/api/share`.

## 11. 관련 자료

- `bizhelp/README.md` — 기능별 상세 규칙과 결정 기록
- 루트 `CLAUDE.md` — 저장소 공통 규칙(로컬·클라우드 동시 작업, 배포 원칙)
- `playskang-svg/adbles-agents`의 `agents/keyword-site-builder/` — 이 시스템을 다루는 Claude 스킬(구조·절차·함정). 해당 PR(`playskang-svg/adbles-agents#19`)이 머지돼야 main에 들어간다.
