-- CT·MOD 전문가 가이드 v0.6 최소 저장값과 M25~M28 지원.
-- 기존 테이블·컬럼은 유지하고 v0.6 필드만 추가한다.

alter table public.suri_pages
  add column if not exists evidence_ids text[] not null default '{}',
  add column if not exists image_set jsonb not null default '[]'::jsonb,
  add column if not exists region_profile_id bigint references public.suri_regions (id) on delete restrict;

create index if not exists suri_pages_region_profile_id_idx
  on public.suri_pages (region_profile_id);

alter table public.suri_page_sections
  drop constraint if exists suri_page_sections_module_code_check;

alter table public.suri_page_sections
  add constraint suri_page_sections_module_code_check
  check (module_code ~ '^M(0[1-9]|1[0-9]|2[0-8])$');

comment on column public.suri_pages.evidence_ids is
  'v0.6: 사진·CASE·참고 근거 ID';
comment on column public.suri_pages.image_set is
  'v0.6: LANDING별 사용 이미지와 편집본 연결';
comment on column public.suri_pages.region_profile_id is
  'v0.6 M28: 페이지가 공유 참조하는 구·동·생활권 단위 지역 프로필';
