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

### 4. 도메인 연결 (suriwiki.com) — **아직 연결 안 됨**

현재 사이트는 `https://suriwiki.playskang.workers.dev`에서만 서비스된다.
`suriwiki.com`은 여전히 기존 Vercel 사이트를 가리킨다.

**시도했다가 실패한 이유** (2026-09-01): `wrangler.jsonc`에 `custom_domain`을 켜고
배포했더니 Cloudflare가 거부했다.

```
Hostname 'suriwiki.com' already has externally managed DNS records
(A, CNAME, etc). Delete them first. [code: 100117]
```

`custom_domain`은 **기존 DNS 레코드를 자동으로 덮어쓰지 않는다.** 실수로 남의
사이트를 가로채는 걸 막는 안전장치다. 그래서 수동 삭제가 선행되어야 한다.

**같이 겪은 함정**: `routes`를 선언하는 순간 wrangler가 `workers_dev`를 기본으로
비활성화해서, 커스텀 도메인은 실패하고 workers.dev도 꺼져 **사이트가 완전히
접속 불가(404)가 됐다.** 그래서 지금은 `workers_dev: true`를 명시해 두었다.

#### 연결 절차

1. Cloudflare **DNS > Records**에서 `suriwiki.com`의 `A` 레코드 2개
   (`64.29.17.65`, `216.198.79.65` — Vercel) 삭제
   > ⚠️ 삭제하는 순간 기존 Vercel 사이트는 이 도메인에서 내려간다.
2. `web/wrangler.jsonc`에서 주석 처리된 `routes` 블록의 주석을 해제
3. 같은 파일의 `workers_dev`를 `false`로 변경
   (apex와 workers.dev에 같은 콘텐츠가 노출되면 중복 콘텐츠가 되어 SEO에 불리)
4. 커밋 → `main` 머지 → 배포. Cloudflare가 DNS 레코드와 인증서를 자동 생성한다.

#### www.suriwiki.com 처리 (별도 작업 필요)

`www`는 **일부러 Worker에 붙이지 않았다.** 같은 Worker에 apex와 www를 둘 다 붙이면
동일 콘텐츠가 두 주소로 색인돼 중복 콘텐츠가 되고, SEO가 목적인 이 사이트에는 해롭다.
대신 www를 apex로 301 리다이렉트시킨다.

`www`의 DNS는 **Cloudflare가 관리**한다(네임서버가 Cloudflare). 따라서 Vercel 쪽에서
도메인을 제거해도 이 CNAME은 사라지지 않는다 — Cloudflare에서 직접 손봐야 한다:

1. **DNS** > Records에서 기존 `www` CNAME(Vercel 대상)을 삭제
2. 같은 자리에 프록시(주황 구름) 켠 `AAAA` 레코드 `www` → `100::` 추가
   (실제 오리진이 없을 때 쓰는 Cloudflare 표준 placeholder — 리다이렉트 룰이
   트래픽을 가로챌 수 있게 하는 용도)
3. **Rules** > Redirect Rules에서 규칙 생성:
   - 조건: `Hostname` equals `www.suriwiki.com`
   - 동작: Dynamic redirect, `concat("https://suriwiki.com", http.request.uri.path)`, 상태 코드 **301**

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
