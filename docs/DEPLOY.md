# 배포 설정 (Cloudflare Workers + GitHub Actions)

배포는 **`git push origin main`으로만** 한다 (CLAUDE.md 규칙). 로컬에서 `wrangler`로
직접 배포하지 않는다 — `.github/workflows/deploy.yml`이 push를 받아 빌드하고 배포한다.

정적 export라서 **Supabase 데이터만 바꾸면 사이트에 반영되지 않는다.** 콘텐츠를 바꾼 뒤에는
코드 push가 없더라도 GitHub Actions에서 `Deploy to Cloudflare Workers` 워크플로를
`Run workflow`(workflow_dispatch)로 한 번 돌려야 새 콘텐츠가 나간다.

## 왜 Pages가 아니라 Workers인가

Cloudflare 공식 문서가 Pages 문서 최상단에 "새 프로젝트는 Workers로 시작하라"고 직접
안내한다 (Workers가 주력 플랫폼이고 Pages 사용 사례를 대부분 커버). 실무적으로도:

| | 무료 | 유료 |
|---|---|---|
| **Workers** 정적 자산 (버전당 파일 수) | 20,000 | **100,000** |
| **Pages** (배포당 파일 수) | 20,000 | 20,000 (프로젝트 100개 한도) |

파일 10만 개 한도를 쓰려면 **Wrangler 4.34.0 이상**이어야 한다 (`web/package.json`에
`wrangler` devDependency로 고정해 둠).

이 차이가 중요한 이유: keyword-tree 스킬은 Pages의 2만 개 한도 때문에 "키워드별로 별도
프로젝트에 나눠 배포"하는 복잡한 구조(`split-by-keyword.mjs`, `deploy-all.mjs`)를 써야 했다.
Workers 유료 플랜이면 그 분할 없이 훨씬 오래 버틸 수 있다.

---

## 최초 1회 설정 (사람이 해야 하는 것)

### 1. ~~프로젝트 생성~~ — 불필요

Workers는 대시보드에서 미리 만들어 둘 필요가 없다. 첫 배포 때
`web/wrangler.jsonc`의 `name`(`suriwiki`)으로 Worker가 자동 생성된다.

### 2. Cloudflare API 토큰 발급

대시보드 > My Profile > API Tokens > Create Token > **Edit Cloudflare Workers** 템플릿.

Account ID는 대시보드 우측 사이드바 또는 Workers & Pages 개요에서 확인.

### 3. GitHub Secrets 등록

저장소 > Settings > Secrets and variables > Actions > New repository secret

| Secret 이름 | 값 | 비고 |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | 2번에서 발급한 토큰 | 절대 커밋 금지 |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare 계정 ID | |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xparlhzbactezsvuteto.supabase.co` | 공개값 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `web/.env.example` 참고 | 공개 가능(RLS로 보호), 관리 편의상 Secret으로 둠 |

`service_role` 키는 **여기 넣지 않는다.** 빌드는 읽기만 하므로 anon 키면 충분하고,
service_role은 로컬 시딩 스크립트 전용이다.

### 4. 도메인 연결 (suriwiki.com)

Workers & Pages > `suriwiki` Worker > Settings > Domains & Routes > **Add** > Custom domain
에서 `suriwiki.com`을 추가한다. 도메인이 Cloudflare에 등록되어 있으면 DNS가 자동 설정된다.

---

## 확인

첫 push 후 Actions 탭에서 워크플로가 초록색으로 끝나는지 확인하고,
`suriwiki.<계정서브도메인>.workers.dev`로 접속해 본다.

로컬에서 설정만 미리 검증하려면(업로드 없음):

```bash
cd web && npm run build && npx wrangler deploy --dry-run
```

## 정적 자산 라우팅

`web/wrangler.jsonc`에서 명시적으로 설정한다. Pages는 `404.html`/`index.html`을 보고
알아서 추측했지만 Workers는 오설정을 막으려고 명시를 요구한다:

- `not_found_handling: "404-page"` — 매칭 안 되는 경로에 Next가 만든 `404.html`을 반환.
  (SPA가 아니므로 `single-page-application`을 쓰면 안 된다)
- `html_handling: "auto-trailing-slash"` — `/foo` → `/foo.html` 매핑과 후행 슬래시 정규화

## 파일 수 감시

현재 정적 자산 **206개** (페이지 30개 기준 — HTML 외에 Next.js 청크·RSC 페이로드 포함).
페이지가 늘면 파일도 함께 늘어나므로, 배포 로그의 "Read N files from the assets directory"
숫자를 가끔 확인한다. 무료 2만 / 유료 10만에 근접하면 그때 분할 배포를 검토한다.
