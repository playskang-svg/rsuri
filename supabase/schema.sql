-- ============================================================
-- SuriWiki — Supabase Schema (v1)
-- 참고 문서: docs/PRD.md 4번 "데이터 모델"
--
-- 설계 원칙 (supabase-postgres-best-practices 스킬 적용):
--   - PK는 bigint identity (schema-primary-keys — 랜덤 UUID는 인덱스 단편화 유발)
--   - 모든 FK 컬럼에 명시적 인덱스 (schema-foreign-key-indexes — Postgres는 FK 자동 인덱싱 안 함)
--   - 소문자 snake_case 식별자만 사용, quote 없음 (schema-lowercase-identifiers)
--   - text/timestamptz/numeric/boolean 사용, varchar(n)·timestamp·float 금지 (schema-data-types)
--   - RLS: anon/authenticated는 SELECT만, 쓰기는 service_role 전용
--     (service_role은 Supabase에서 RLS를 우회하므로 별도 write policy 불필요)
--
-- 이후 컬럼 추가/제약 변경 시 이 파일을 직접 고치지 말고 새 마이그레이션에서
-- `do $$ ... $$` 멱등 패턴으로 ALTER — schema-constraints (Postgres는
-- `ADD CONSTRAINT IF NOT EXISTS`를 지원하지 않음).
-- ============================================================

-- ------------------------------------------------------------
-- 1. suri_regions — 지역 트리 (자기참조, 시/도 > 시/군/구 > 동)
-- ------------------------------------------------------------
create table public.suri_regions (
  id bigint generated always as identity primary key,
  parent_id bigint references public.suri_regions (id) on delete cascade,
  level text not null check (level in ('SIDO', 'SIGUNGU', 'DONG')),
  slug text not null,
  display_name text not null,
  lat numeric(9, 6),
  lng numeric(9, 6),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- 동명 지역(중구 등 전국에 여러 개)이 흔해서 전역 유니크가 아니라
  -- 같은 부모 밑에서만 유니크해야 한다 — keyword-tree 스킬에서 확인된 함정
  unique (parent_id, slug)
);
create index suri_regions_parent_id_idx on public.suri_regions (parent_id);

-- ------------------------------------------------------------
-- 2. suri_categories — 공종 대분류 (주방/싱크대, 누수/방수 등 9종)
-- ------------------------------------------------------------
create table public.suri_categories (
  id bigint generated always as identity primary key,
  slug text not null unique,
  display_name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 3. suri_repair_keywords — 공사명 메인 키워드 사전
-- ------------------------------------------------------------
create table public.suri_repair_keywords (
  id bigint generated always as identity primary key,
  category_id bigint not null references public.suri_categories (id) on delete restrict,
  slug text not null unique,
  display_name text not null,
  description text,
  default_phone text,
  menu_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index suri_repair_keywords_category_id_idx on public.suri_repair_keywords (category_id);

-- ------------------------------------------------------------
-- 4. suri_cases — 현장 사실 원자료 (사람이 입력, 내부 전용 — anon에 노출 안 됨)
-- ------------------------------------------------------------
create table public.suri_cases (
  id bigint generated always as identity primary key,
  region_id bigint not null references public.suri_regions (id) on delete restrict,
  repair_keyword_id bigint not null references public.suri_repair_keywords (id) on delete restrict,
  building_type text,
  problem text not null,
  judgment text,
  work_performed text not null,
  result text,
  limitations text,
  completed_on date,
  is_approved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index suri_cases_region_id_idx on public.suri_cases (region_id);
create index suri_cases_repair_keyword_id_idx on public.suri_cases (repair_keyword_id);

-- ------------------------------------------------------------
-- 5. suri_pages — 발행 단위 (핵심 테이블). 여기 decision이 CREATE/UPDATE가
--    아니면 사이트에 실제로 존재하지 않는다 (keyword-tree의 pseo_page_listings +
--    CT·MOD 가이드 10장 저장값을 합친 것).
-- ------------------------------------------------------------
create table public.suri_pages (
  id bigint generated always as identity primary key,
  page_type text not null check (page_type in ('CATEGORY', 'TOPIC', 'CASE', 'WIKI', 'AREA', 'LANDING')),
  content_type text not null check (content_type in ('CT1', 'CT2', 'CT3', 'CT4', 'CT5', 'CT6')),
  -- WIKI/CASE/CATEGORY/TOPIC은 이 slug로 식별(/wiki/{slug} 등).
  -- LANDING/AREA는 region_id의 조상 경로로 URL이 파생되므로 slug가 필요 없어 null 허용.
  slug text,
  region_id bigint references public.suri_regions (id) on delete restrict,
  repair_keyword_id bigint references public.suri_repair_keywords (id) on delete restrict,
  category_id bigint references public.suri_categories (id) on delete restrict,
  source_case_id bigint references public.suri_cases (id) on delete set null,
  search_intent text not null,
  required_modules text[] not null default '{}',
  selected_modules text[] not null default '{}',
  module_order text[] not null default '{}',
  meta_title text,
  meta_description text,
  decision text not null default 'HOLD' check (decision in ('CREATE', 'UPDATE', 'MERGE', 'HOLD')),
  merged_into_page_id bigint references public.suri_pages (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- 같은 키워드×지역×페이지타입 조합이 중복 발행되지 않도록
  unique (repair_keyword_id, region_id, page_type)
);
create index suri_pages_region_id_idx on public.suri_pages (region_id);
create index suri_pages_repair_keyword_id_idx on public.suri_pages (repair_keyword_id);
create index suri_pages_category_id_idx on public.suri_pages (category_id);
create index suri_pages_source_case_id_idx on public.suri_pages (source_case_id);
create index suri_pages_merged_into_page_id_idx on public.suri_pages (merged_into_page_id);
create index suri_pages_decision_idx on public.suri_pages (decision);
-- slug는 null을 여러 개 허용하면서(LANDING/AREA), 실제 값이 있으면(WIKI/CASE/...) 타입 내에서 유니크
create unique index suri_pages_type_slug_idx on public.suri_pages (page_type, slug);

-- ------------------------------------------------------------
-- 6. suri_page_sections — 페이지 본문 (CT·MOD 모듈 단위 블록)
-- ------------------------------------------------------------
create table public.suri_page_sections (
  id bigint generated always as identity primary key,
  page_id bigint not null references public.suri_pages (id) on delete cascade,
  module_code text not null check (module_code ~ '^M(0[1-9]|1[0-9]|2[0-4])$'), -- M01~M24
  sort_order int not null default 0,
  heading text,
  body text not null,
  created_at timestamptz not null default now()
);
create index suri_page_sections_page_id_idx on public.suri_page_sections (page_id);

-- ------------------------------------------------------------
-- 7. suri_page_images — 이미지 세트 (BEFORE/PROCESS/AFTER 등 역할 분류)
-- ------------------------------------------------------------
create table public.suri_page_images (
  id bigint generated always as identity primary key,
  page_id bigint not null references public.suri_pages (id) on delete cascade,
  role text not null check (role in ('BEFORE', 'PROCESS', 'AFTER', 'MATERIAL', 'TOOL', 'EXCLUDE')),
  url text not null,
  overlay_note text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index suri_page_images_page_id_idx on public.suri_page_images (page_id);

-- ------------------------------------------------------------
-- 8. suri_local_pros — 지역별 기사/업체 (CTA에 노출되는 연락처)
-- ------------------------------------------------------------
create table public.suri_local_pros (
  id bigint generated always as identity primary key,
  region_id bigint not null references public.suri_regions (id) on delete cascade,
  name text not null,
  shop_name text,
  phone text not null,
  rating numeric(3, 2),
  review_count int not null default 0,
  completed_jobs int not null default 0,
  badges text[] not null default '{}',
  intro text,
  master_grade text,
  safety_certified boolean not null default false,
  created_at timestamptz not null default now()
);
create index suri_local_pros_region_id_idx on public.suri_local_pros (region_id);

-- ============================================================
-- Row Level Security
-- 원칙: anon/authenticated = SELECT만 허용. INSERT/UPDATE/DELETE 정책은
-- 만들지 않는다 — RLS가 켜진 테이블에서 매칭되는 정책이 없으면 기본 거부된다.
-- 쓰기는 scripts/*.mjs가 service_role 키로 수행(RLS 우회, 코드 내부 전용).
-- ============================================================

-- 참조 데이터 — 전체 공개
alter table public.suri_regions enable row level security;
create policy suri_regions_public_read on public.suri_regions
  for select to anon, authenticated using (true);

alter table public.suri_categories enable row level security;
create policy suri_categories_public_read on public.suri_categories
  for select to anon, authenticated using (true);

alter table public.suri_repair_keywords enable row level security;
create policy suri_repair_keywords_public_read on public.suri_repair_keywords
  for select to anon, authenticated using (true);

alter table public.suri_local_pros enable row level security;
create policy suri_local_pros_public_read on public.suri_local_pros
  for select to anon, authenticated using (true);

-- suri_cases — 내부 전용 원자료. anon/authenticated 대상 정책을 두지 않는다
-- (RLS만 켜두면 매칭 정책이 없어 전체 차단 = service_role만 접근 가능).
alter table public.suri_cases enable row level security;

-- suri_pages — decision이 HOLD(보류/미승인)면 공개하지 않는다
alter table public.suri_pages enable row level security;
create policy suri_pages_public_read on public.suri_pages
  for select to anon, authenticated
  using (decision <> 'HOLD');

-- suri_page_sections / suri_page_images — 부모 페이지가 공개 상태일 때만 노출
alter table public.suri_page_sections enable row level security;
create policy suri_page_sections_public_read on public.suri_page_sections
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.suri_pages p
      where p.id = suri_page_sections.page_id and p.decision <> 'HOLD'
    )
  );

alter table public.suri_page_images enable row level security;
create policy suri_page_images_public_read on public.suri_page_images
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.suri_pages p
      where p.id = suri_page_images.page_id and p.decision <> 'HOLD'
    )
  );
