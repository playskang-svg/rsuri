-- 지역 페이지 본문 콘텐츠 2단 모델
--
-- 왜 만드는가: LANDING 페이지 1,479건 중 본문(suri_pages.guide)이 있는 건 6건뿐이었다.
-- 나머지 1,473건은 meta_title 한 줄만 있어서, 템플릿의 모든 섹션이 `{guide && ...}`에
-- 걸려 통째로 렌더링되지 않았다. 화면에 남는 건 브레드크럼 + h1 + 지역 나열뿐 —
-- "지역만 나열되고 콘텐츠가 없다"는 문제의 실제 원인이다.
--
-- 기존 모델은 "지역별 실제 CASE가 있어야 페이지를 발행한다"는 전제였는데, 그 전제로는
-- 조합 페이지가 영원히 6건을 못 넘는다. 벤치마크(koreajipsurimaster.com)의 지역 페이지를
-- 실제로 뜯어보면 지역별 CASE를 요구하지 않는다. 콘텐츠를 두 층으로 나눠 쓴다:
--
--   1) 키워드 단위 자산  — 서비스 종류·진행 절차·증상 체크리스트·전문업체 이유·공통 FAQ.
--                          그 키워드의 모든 지역 페이지가 그대로 상속한다.
--   2) 지역 단위 변주    — 히어로 한 줄·"이 지역에서 많이 받는 의뢰"·롱폼 본문·지역 FAQ.
--                          지역마다 실제로 다른 텍스트가 들어가는 자리다.
--
-- 이 구조라면 키워드 하나에 자산을 한 번 쓰고 지역 변주만 채우면 그 키워드의 지역 페이지
-- 전부가 즉시 내용 있는 페이지가 된다.

-- ── 1) 키워드 단위 자산 ──
--
-- 별도 테이블 대신 jsonb 한 컬럼인 이유: 이 값은 항상 키워드와 1:1이고 통째로만 읽고
-- 통째로만 쓴다. 개별 항목을 조건 검색하거나 부분 갱신할 일이 없어서 정규화 이득이 없고,
-- 조회 쪽(lib/supabase.ts)이 테이블 수만큼 라운드트립을 늘리지 않아도 된다.
--
-- 형태 (web/lib/types.ts의 KeywordContent와 1:1):
--   {
--     "tagline":  "히어로 아래 한 줄 소개",
--     "services": [{ "title": "...", "desc": "..." }, ...],   -- 서비스 안내 카드
--     "process":  [{ "title": "...", "desc": "..." }, ...],   -- 진행 절차 단계
--     "symptoms": ["...", ...],                               -- 이런 증상이면 의심하세요
--     "why_pro":  ["...", ...],                               -- 전문 업체가 유리한 이유
--     "faqs":     [{ "q": "...", "a": "..." }, ...]           -- 키워드 공통 FAQ
--   }
alter table public.suri_repair_keywords
  add column if not exists content jsonb;

-- ── 2) 지역 단위 변주 ──
--
-- guide 컬럼에 합치지 않고 새 컬럼으로 두는 이유: guide에는 초기 CASE 기반 6개 페이지의
-- 본문(symptoms/steps/prevention_tips/faqs)이 이미 들어 있다. 같은 컬럼에 형태가 다른
-- 값을 섞으면 두 세대의 스키마가 한 자리에서 뒤엉켜, 읽는 쪽이 매번 어느 세대인지
-- 판별해야 한다. 컬럼을 나누면 기존 6건은 건드리지 않고 그대로 렌더링되고,
-- 신규 콘텐츠는 local 한 곳만 보면 된다.
--
-- 형태 (web/lib/types.ts의 PageLocal과 1:1):
--   {
--     "hero_line":     "강남구·서초구·송파구 — 아파트 부분 도배 위주",
--     "top_requests":  [{ "title": "결로 곰팡이", "desc": "..." }, ...],
--     "longform":      { "lead": "...", "sections": [{ "title": "...", "body": "..." }, ...] },
--     "region_faq":    { "q": "강남구 어디까지 출장 가능한가요?", "a": "역삼·논현·..." }
--   }
alter table public.suri_pages
  add column if not exists local jsonb;

-- 콘텐츠가 채워진 페이지만 골라내는 조회(관리 화면의 "본문 없는 페이지" 목록,
-- 생성 스크립트의 재실행 대상 선별)가 1,479행 전체 스캔이 되지 않게 한다.
create index if not exists suri_pages_local_missing_idx
  on public.suri_pages (repair_keyword_id)
  where local is null;
