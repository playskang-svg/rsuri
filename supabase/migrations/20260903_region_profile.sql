-- 지역별 주거 특성 프로필.
--
-- 지역 페이지 본문을 페이지마다 통째로 저장하지 않고, 이 프로필 + 키워드 문장 풀에서
-- 빌드 때 조립한다(web/lib/compose-local.ts). 페이지가 1,479건이라 완성본을 저장하면
-- 같은 문장이 수백 번 중복 저장되고, 문장 하나를 고치려면 전 페이지를 다시 써야 한다.
-- 실제로 문수리 67지역분 완성본은 196KB였는데, 재료만 저장하니 32KB가 됐다.
--
-- 형태 (web/lib/types.ts의 RegionProfile과 1:1):
--   { "type": "seoul-apt", "near": "노원구·도봉구·중랑구",
--     "note": "상계·중계 대단지가 1980년대 후반 준공으로 …",
--     "dongs": "상계·중계·하계·공릉·월계" }
--
-- type은 주거 형태 분류이고, 키워드 문장 풀에서 어떤 변주를 고를지 결정한다. 그 유형에
-- 맞는 문장이 풀에 없으면 조립을 포기한다 — 그 동네와 상관없는 문장이 붙는 것보다
-- 아무것도 안 나오는 편이 낫다.
--
-- 값은 scripts/data/region-profiles.json이 원천이다.
-- 다시 만들려면: node scripts/build-page-content.mjs
alter table public.suri_regions
  add column if not exists profile jsonb;
