create type public.day_of_week as enum ('Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun');
create type public.availability_priority as enum ('High', 'Low');

create table public.staff_availabilities (
  id uuid not null default gen_random_uuid() primary key,
  staff_id uuid not null references public.staffs(id) on delete cascade,
  day_of_week day_of_week not null,
  start_time time not null,
  end_time time not null,
  priority availability_priority not null default 'High',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.staff_availabilities enable row level security;

-- RLS Policies
-- 1. 管理者は自分の事業所のスタッフの稼働可能枠を全操作可能
-- 2. ヘルパーは自分の稼働可能枠のみ閲覧・更新可能

create policy "Admins can manage availabilities in their office"
on public.staff_availabilities
to authenticated
using (
  exists (
    select 1 from public.staffs as s
    where s.id = staff_availabilities.staff_id
    and exists (
      select 1 from public.staffs as admin
      where admin.auth_user_id = auth.uid()
      and admin.office_id = s.office_id
      and admin.role = 'admin'
    )
  )
);

create policy "Users can manage own availabilities"
on public.staff_availabilities
to authenticated
using (
  exists (
    select 1 from public.staffs as s
    where s.id = staff_availabilities.staff_id
    and s.auth_user_id = auth.uid()
  )
);

-- トリガーの適用
create trigger on_update_staff_availabilities
  before update on public.staff_availabilities
  for each row
  execute procedure public.handle_updated_at();
