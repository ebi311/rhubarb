create table public.basic_schedules (
  id uuid not null default gen_random_uuid() primary key,
  client_id uuid not null references public.clients(id) on delete cascade,
  service_type_id uuid not null references public.service_types(id) on delete restrict,
  staff_id uuid references public.staffs(id) on delete set null,
  day_of_week day_of_week not null,
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.basic_schedules enable row level security;

-- RLS Policies
-- 1. 管理者は自分の事業所の基本スケジュールを全操作可能
create policy "Admins can manage basic schedules in their office"
on public.basic_schedules
to authenticated
using (
  exists (
    select 1 from public.clients as c
    where c.id = basic_schedules.client_id
    and exists (
      select 1 from public.staffs as s
      where s.auth_user_id = auth.uid()
      and s.office_id = c.office_id
      and s.role = 'admin'
    )
  )
);

-- 2. ヘルパーは自分の事業所の基本スケジュールを閲覧可能
create policy "Staffs can read basic schedules in their office"
on public.basic_schedules
for select
to authenticated
using (
  exists (
    select 1 from public.clients as c
    where c.id = basic_schedules.client_id
    and exists (
      select 1 from public.staffs as s
      where s.auth_user_id = auth.uid()
      and s.office_id = c.office_id
    )
  )
);

-- トリガーの適用
create trigger on_update_basic_schedules
  before update on public.basic_schedules
  for each row
  execute procedure public.handle_updated_at();
