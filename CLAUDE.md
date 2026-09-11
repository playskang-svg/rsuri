# 수리위키 (rsuri) — 작업 규칙

이 파일은 저장소에 커밋된다. 로컬·클라우드 어느 쪽에서 작업하든 같은 규칙을 본다.
(과거에는 `CLAUDE.md`가 로컬에만 있어 클라우드 세션이 규칙을 볼 수 없었다. 그래서 커밋 대상으로 올렸다.)

## 1. 로컬 ↔ 클라우드 동시 개발 — 반드시 지킨다

두 환경에서 동시에 개발한다. GitHub 저장소가 유일한 정본이다.

**클라우드 세션(Claude Code on the web, GitHub Actions)의 의무**
- 작업이 한 단위 끝나면 **즉시 커밋하고 push한다.** 세션 끝까지 모아두지 않는다. 컨테이너는 회수되면 사라지므로, push하지 않은 작업은 없는 작업이다
- push 대상은 지정된 작업 브랜치. `main` 직접 push 금지
- push 후 PR이 없으면 draft PR을 연다

**로컬 세션의 의무**
- 작업 시작 전 반드시 `bash scripts/sync.sh`를 돌린다. 클라우드가 올린 작업이 즉시 로컬에 반영된다
- 로컬에서 커밋한 것도 바로 push한다

**동시 편집 충돌 방지**
- 같은 파일을 양쪽에서 동시에 고치지 않는다. 한쪽이 작업 중이면 다른 쪽은 pull만 한다
- 충돌이 나면 rebase가 아니라 merge로 푼다. 양쪽 체크아웃이 깨지지 않는다

**클라우드는 로컬 디스크에 직접 쓸 수 없다.** 클라우드 세션은 격리된 컨테이너에서 돌아 사용자 PC의 파일에 접근할 수 없다. "즉시 자동 업데이트"는 클라우드가 즉시 push하고 로컬이 `sync.sh`로 당겨오는 방식으로 성립한다.

## 2. 배포

배포는 GitHub Actions가 한다. 로컬에서 `wrangler`로 직접 배포하지 않는다.

| 트리거 | 언제 | 휴대폰에서 |
|---|---|---|
| `main` push | 코드가 바뀔 때 — 자동 | PR 머지만 하면 됨 |
| 매일 05:00 KST (cron) | 콘텐츠(Supabase)만 바뀌었을 때 — 자동 | 아무것도 안 해도 됨 |
| `workflow_dispatch` | 즉시 반영이 필요할 때 — 수동 | GitHub 앱 → Actions → Run workflow |
| Claude 세션에 요청 | 즉시 반영이 필요할 때 | "배포해줘" 한 마디 |

정적 export라 **Supabase 데이터만 바꾸면 사이트에 반영되지 않는다.** 재빌드가 있어야 한다. 위 cron이 그 역할을 하고, 급하면 수동 트리거를 쓴다.

**배포는 전 과정이 GitHub·Cloudflare에서 일어난다.** 로컬 PC도, 관리자 화면도 필요하지 않다 — 휴대폰만으로 완결된다.

필요한 GitHub Secrets 4개 (등록 완료, 최근 38회 배포 전부 성공)
`NEXT_PUBLIC_SUPABASE_URL` · `NEXT_PUBLIC_SUPABASE_ANON_KEY` · `CLOUDFLARE_API_TOKEN` · `CLOUDFLARE_ACCOUNT_ID`

## 3. 콘텐츠 반영 경로

2026-09-11부터 사이트 구조와 본문의 원본은 **저장소 파일**이다. 빌드는 DB를 읽지 않는다.

```
scripts/data/keyword-groups.md      운영자가 준 키워드 그룹 — 그룹 = 허브, "지역 키워드" 한 줄 = 지역 페이지
scripts/data/keyword-map.json       그룹 → slug·분야·계열, 별칭(같은 의도 합치기), 지역 표기 → slug
scripts/data/keyword-content/*.json 계열 공통 본문 + 지역 문장 풀
scripts/data/keyword-notes.json     키워드별 한 줄·증상·FAQ
scripts/data/region-profiles.json   지역 프로필
scripts/data/field-photos.json      실제 현장 사진·개념도 → 키워드
scripts/data/legacy-*.{txt,json}    옛 색인 주소 → 새 주소 301
        ↓  web/npm run build 가 scripts/build-site-data.mjs · build-redirects.mjs 를 먼저 돌린다
      web/lib/site-data.json · web/public/_redirects (생성물, 커밋 안 함)
        ↓  main 머지 → GitHub Actions → Cloudflare
      사이트
```

사진은 **그 수리와 맞는 실사만** 쓴다. 맞는 사진이 없으면 사진 칸을 비운다(스톡 사진 금지 — 운영자 지적).
실사는 `cwebp -metadata none`으로 다시 인코딩해 위치 정보를 지운 뒤 `web/public/photos/field/`에 둔다.

## 4. 건드리면 안 되는 것

- **URL 구조와 slug** — 이미 색인된 자산이다. 변경은 사전 승인 후에만 (`docs/RENEWAL_INSTRUCTIONS.md` 6번). 없애는 주소는 `scripts/data/legacy-*`에 넣어 301로 보낸다
- **`suri_*` 8개 테이블 스키마** — 키워드×지역 자동 생성의 기반 (`docs/RENEWAL_INSTRUCTIONS.md` 2번)
- **`.github/workflows/agents-*.yml`** — 중앙 저장소(`playskang-svg/adbles-agents`)의 템플릿에서 생성된다. 여기서 고치면 다음 sync에 덮어써진다. 원본은 `adbles-agents/templates/workflows/`
- **`web/public/sitemap.xml`, `web/public/rss.xml`** — 빌드가 생성한다. 커밋하면 배포마다 diff가 생긴다

`deploy.yml`은 중앙 템플릿 대상이 아니므로 이 저장소에서 고쳐도 된다.

## 5. 스택

- `web/` — Next.js 16 App Router, `output:'export'` 완전 정적. **실제 사이트는 이쪽이다**
- `src/` — 폐기된 구 Vite SPA. 히스토리 보존용으로 남아 있을 뿐, 신규 개발하지 않는다. `src/data/mockWikiData.ts`만 콘텐츠 원본으로 참조한다
- Supabase Postgres (`suriwiki`, ap-northeast-2) — 2026-09-11부터 빌드에 쓰지 않는다(구조·본문은 저장소 파일이 원본). 옛 데이터 보관용
- Cloudflare Workers 정적 자산

## 6. 진행 중인 작업

**리뉴얼** — 지시문: `docs/RENEWAL_INSTRUCTIONS.md`. 여덟 항목이 범위이자 완료 조건이다.
순서를 지킨다: 구조·디자인 확정 → 모바일 검증 → 콘텐츠 채우기.

관련 문서: [PRD.md](docs/PRD.md) · [CONTENT_MODEL.md](docs/CONTENT_MODEL.md) · [DEPLOY.md](docs/DEPLOY.md)
