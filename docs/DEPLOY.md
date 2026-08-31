# 배포 설정 (Cloudflare Pages + GitHub Actions)

배포는 **`git push origin main`으로만** 한다 (CLAUDE.md 규칙). 로컬에서 `wrangler`로
직접 배포하지 않는다 — `.github/workflows/deploy.yml`이 push를 받아 빌드하고 배포한다.

정적 export라서 **Supabase 데이터만 바꾸면 사이트에 반영되지 않는다.** 콘텐츠를 바꾼 뒤에는
코드 push가 없더라도 GitHub Actions에서 `Deploy to Cloudflare Pages` 워크플로를
`Run workflow`(workflow_dispatch)로 한 번 돌려야 새 콘텐츠가 나간다.

---

## 최초 1회 설정 (사람이 해야 하는 것)

### 1. Cloudflare Pages 프로젝트 생성

Cloudflare 대시보드 > Workers & Pages > Create > Pages > **Upload assets** 쪽으로 만들거나,
CLI가 있다면:

```bash
npx wrangler pages project create suriwiki --production-branch main
```

프로젝트 이름은 워크플로의 `--project-name=suriwiki`와 반드시 같아야 한다.
(주의: Cloudflare 프로젝트명은 연결할 도메인과 별개다. 커스텀 도메인을 붙였다고 해서
프로젝트명이 `suriwiki.com`이 되지 않는다 — keyword-tree 스킬에서 확인된 함정.)

### 2. Cloudflare API 토큰 발급

대시보드 > My Profile > API Tokens > Create Token > **Edit Cloudflare Workers** 템플릿
(또는 커스텀으로 `Account / Cloudflare Pages / Edit` 권한).

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

Cloudflare Pages 프로젝트 > Custom domains > Set up a domain > `suriwiki.com`.
도메인이 Cloudflare에 등록되어 있으면 DNS가 자동 설정되고, 외부 등록기관이면
안내되는 CNAME을 해당 등록기관에 추가한다.

---

## 확인

첫 push 후 Actions 탭에서 워크플로가 초록색으로 끝나는지 확인하고,
Cloudflare Pages 프로젝트의 배포 URL(`suriwiki.pages.dev`)로 접속해 본다.

## 알려진 제약 — 파일 수 상한

Cloudflare Pages 무료 플랜은 **배포 1건당 파일 2만 개**가 상한이다.
지금은 페이지가 십여 개라 한참 여유가 있지만, 지역×키워드 조합이 늘어나면
페이지당 3개 파일(html + RSC 페이로드 + OG 이미지)이 붙어 빠르게 증가한다.
상한에 근접하면 keyword-tree 스킬 5번의 **키워드별 프로젝트 분할 배포**
(`split-by-keyword.mjs` / `deploy-all.mjs` 패턴)로 전환한다 — 나중에 붙이는 것보다
미리 설계하는 편이 훨씬 쉽다.
