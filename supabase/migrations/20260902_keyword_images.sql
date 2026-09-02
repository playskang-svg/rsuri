-- suri_keyword_images — 키워드 단위 사진 세트
--
-- 왜 만드는가: 키워드 × 지역 조합 페이지가 이미 1,300건을 넘는다. 페이지마다 시공 전/후
-- 사진을 일일이 올리는 건 운영상 불가능하다. 그래서 사진을 '키워드' 단위로 한 번만 등록하고,
-- 그 키워드에 붙은 모든 지역 페이지가 같은 세트를 상속받게 한다.
-- 특정 지역 페이지만 다른 사진을 쓰고 싶으면 기존 suri_page_images에 올리면 그쪽이 우선한다.
--
-- 한 '세트' = set_no가 같은 행들의 묶음 = 시공 전 1장 + 시공 후 1장(+ 과정 사진 여러 장)
-- + 세트 설명(caption). caption은 세트 안의 모든 행에 같은 값으로 저장한다 —
-- 어느 행을 먼저 읽어도 같은 설명이 나오게 해서 조회 쪽 조립을 단순하게 유지한다.

create table if not exists public.suri_keyword_images (
  id bigint generated always as identity primary key,
  repair_keyword_id bigint not null references public.suri_repair_keywords (id) on delete cascade,
  set_no int not null default 1,
  role text not null check (role in ('BEFORE', 'AFTER', 'PROCESS')),
  url text not null,
  caption text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists suri_keyword_images_repair_keyword_id_idx
  on public.suri_keyword_images (repair_keyword_id);

-- 한 세트에 BEFORE 는 한 장, AFTER 도 한 장뿐이다. 관리 화면에서 업로드가 느릴 때
-- 버튼을 두 번 누르면 실제로 BEFORE 가 두 장 들어가고, 전/후 슬라이더가 어느 쪽을
-- 쓸지 알 수 없게 된다(조회 순서에 따라 결과가 달라진다). DB 에서 막는다.
-- PROCESS 는 한 세트에 여러 장이 정상이라 전체 유니크로 걸면 안 된다 —
-- BEFORE/AFTER 에만 적용되는 부분 유니크 인덱스를 쓴다.
create unique index if not exists suri_keyword_images_set_role_uniq
  on public.suri_keyword_images (repair_keyword_id, set_no, role)
  where role in ('BEFORE', 'AFTER');

-- RLS 관례: 읽기는 전체 공개(정적 빌드가 anon 키로 읽는다), 쓰기는 운영자만.
alter table public.suri_keyword_images enable row level security;

-- create policy 에는 if not exists 가 없다. 두 번 붙여 넣어도 죽지 않게 먼저 지운다.
drop policy if exists suri_keyword_images_public_read on public.suri_keyword_images;
create policy suri_keyword_images_public_read on public.suri_keyword_images
  for select to anon, authenticated using (true);

drop policy if exists suri_keyword_images_admin_all on public.suri_keyword_images;
create policy suri_keyword_images_admin_all on public.suri_keyword_images
  for all to authenticated using (is_admin()) with check (is_admin());
