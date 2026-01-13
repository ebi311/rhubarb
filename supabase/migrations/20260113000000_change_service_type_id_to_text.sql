-- service_types テーブルの id を UUID から text に変更
-- 固定の3種類のサービス種別を視覚的にわかりやすいコードで管理

-- 1. 依存テーブルの外部キー制約を一時的に削除
alter table public.basic_schedules
  drop constraint if exists basic_schedules_service_type_id_fkey;

alter table public.shifts
  drop constraint if exists shifts_service_type_id_fkey;

alter table public.client_staff_assignments
  drop constraint if exists client_staff_assignments_service_type_id_fkey;

alter table public.staff_service_type_abilities
  drop constraint if exists staff_service_type_abilities_service_type_id_fkey;

-- 2. 新しい text 型の id カラムを追加し、マッピングを行う
alter table public.service_types
  add column new_id text;

-- 既存データのマッピング
update public.service_types
set new_id = case name
  when '身体介護' then 'physical-care'
  when '生活支援' then 'life-support'
  when '通院サポート' then 'commute-support'
end;

-- 3. 依存テーブルの service_type_id を更新
alter table public.basic_schedules
  add column new_service_type_id text;

update public.basic_schedules bs
set new_service_type_id = (
  select new_id from public.service_types st where st.id = bs.service_type_id
);

alter table public.basic_schedules
  drop column service_type_id;

alter table public.basic_schedules
  rename column new_service_type_id to service_type_id;

alter table public.basic_schedules
  alter column service_type_id set not null;


alter table public.shifts
  add column new_service_type_id text;

update public.shifts s
set new_service_type_id = (
  select new_id from public.service_types st where st.id = s.service_type_id
);

alter table public.shifts
  drop column service_type_id;

alter table public.shifts
  rename column new_service_type_id to service_type_id;

alter table public.shifts
  alter column service_type_id set not null;


alter table public.client_staff_assignments
  add column new_service_type_id text;

update public.client_staff_assignments csa
set new_service_type_id = (
  select new_id from public.service_types st where st.id = csa.service_type_id
);

-- ユニーク制約を一時的に削除
alter table public.client_staff_assignments
  drop constraint if exists client_staff_service_unique;

alter table public.client_staff_assignments
  drop column service_type_id;

alter table public.client_staff_assignments
  rename column new_service_type_id to service_type_id;

alter table public.client_staff_assignments
  alter column service_type_id set not null;

-- ユニーク制約を再作成
alter table public.client_staff_assignments
  add constraint client_staff_service_unique unique (client_id, staff_id, service_type_id);


alter table public.staff_service_type_abilities
  add column new_service_type_id text;

update public.staff_service_type_abilities ssta
set new_service_type_id = (
  select new_id from public.service_types st where st.id = ssta.service_type_id
);

-- ユニーク制約を一時的に削除
alter table public.staff_service_type_abilities
  drop constraint if exists staff_service_type_unique;

alter table public.staff_service_type_abilities
  drop column service_type_id;

alter table public.staff_service_type_abilities
  rename column new_service_type_id to service_type_id;

alter table public.staff_service_type_abilities
  alter column service_type_id set not null;

-- ユニーク制約を再作成
alter table public.staff_service_type_abilities
  add constraint staff_service_type_unique unique (staff_id, service_type_id);


-- 4. service_types テーブルの id カラムを text に変更
-- 古いカラムを削除し、新しいカラムを primary key にする
alter table public.service_types
  drop constraint service_types_pkey;

alter table public.service_types
  drop column id;

alter table public.service_types
  rename column new_id to id;

alter table public.service_types
  alter column id set not null;

alter table public.service_types
  add primary key (id);

-- display_order も更新
update public.service_types set display_order = 10 where id = 'physical-care';
update public.service_types set display_order = 20 where id = 'life-support';
update public.service_types set display_order = 30 where id = 'commute-support';

-- 5. 外部キー制約を再作成
alter table public.basic_schedules
  add constraint basic_schedules_service_type_id_fkey
  foreign key (service_type_id) references public.service_types(id) on delete restrict;

alter table public.shifts
  add constraint shifts_service_type_id_fkey
  foreign key (service_type_id) references public.service_types(id) on delete restrict;

alter table public.client_staff_assignments
  add constraint client_staff_assignments_service_type_id_fkey
  foreign key (service_type_id) references public.service_types(id) on delete cascade;

alter table public.staff_service_type_abilities
  add constraint staff_service_type_abilities_service_type_id_fkey
  foreign key (service_type_id) references public.service_types(id) on delete cascade;
