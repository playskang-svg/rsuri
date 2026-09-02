-- suri_regions.level 에 'CUSTOM' 을 허용한다.
--
-- 왜 필요한가:
--   관리 화면의 "자유 지역 추가"와 scripts/seed-base-keywords.mjs 는 시/도 트리에 붙지 않는
--   최상위 지역을 level='CUSTOM' 으로 만든다. 운영 DB 에는 대시보드에서 손으로 이미 반영돼
--   있지만 저장소에 그 기록이 없다. 그래서 supabase/schema.sql 로 새 DB(스테이징·복구본)를
--   만들면 CHECK 제약이 여전히 SIDO/SIGUNGU/DONG 세 개라 시드가 23514 로 죽는다.
--   더 나쁜 건 죽는 지점이다 — 키워드는 이미 들어간 뒤라서 지역·페이지만 0건인
--   반쯤 반영된 DB 가 남는다. 그 사고를 막으려고 실제 상태를 파일로 남긴다.
--
-- 프로젝트 규칙상 schema.sql 을 직접 고치지 않고 마이그레이션으로 기록한다.
-- Postgres 는 ADD CONSTRAINT IF NOT EXISTS 가 없어서, 이미 CUSTOM 을 허용하는
-- DB(= 현재 운영 DB)에서 다시 돌려도 아무 일도 일어나지 않도록 do $$ ... $$ 로 감쌌다.

do $$
declare
  current_def text;
begin
  select pg_get_constraintdef(c.oid)
    into current_def
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
   where n.nspname = 'public'
     and t.relname = 'suri_regions'
     and c.conname = 'suri_regions_level_check';

  -- 이미 CUSTOM 을 포함하면 손대지 않는다(운영 DB 가 여기에 해당).
  if current_def is not null and current_def like '%CUSTOM%' then
    return;
  end if;

  if current_def is not null then
    alter table public.suri_regions drop constraint suri_regions_level_check;
  end if;

  alter table public.suri_regions
    add constraint suri_regions_level_check
    check (level in ('SIDO', 'SIGUNGU', 'DONG', 'CUSTOM'));
end
$$;
