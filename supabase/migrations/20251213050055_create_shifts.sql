create type public.shift_status as enum ('scheduled', 'confirmed', 'completed', 'canceled');

create table public.shifts (
  id uuid not null default gen_random_uuid() primary key,
  client_id uuid not null references public.clients(id) on delete cascade,
  service_type_id uuid not null references public.service_types(id) on delete restrict,
  staff_id uuid references public.staffs(id) on delete set null,
  date date not null,
  start_time time not null,
  end_time time not null,
  status shift_status not null default 'scheduled',
  is_unassigned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.shifts enable row level security;

-- RLS Policies
-- 1. 管理者は自分の事業所のシフトを全操作可能
create policy "Admins can manage shifts in their office"
on public.shifts
to authenticated
using (
  exists (
    select 1 from public.clients as c
    where c.id = shifts.client_id
    and exists (
      select 1 from public.staffs as s
      where s.auth_user_id = auth.uid()
      and s.office_id = c.office_id
      and s.role = 'admin'
    )
  )
);

-- 2. ヘルパーは自分の事業所のシフトを閲覧可能
-- (自分の担当シフトだけでなく、全体の状況が見える必要があるか？要件によるが、
--  MVP要件の「リアルタイム・マイカレンダー」は自分のシフトのみ。
--  しかし「ビュー切り替え」は管理者機能。
--  一旦、ヘルパーは「自分の担当シフト」のみ見れるように制限するのが安全。)

create policy "Staffs can read own shifts"
on public.shifts
for select
to authenticated
using (
  -- 自分が担当者である
  (staff_id is not null and exists (
    select 1 from public.staffs as s
    where s.id = shifts.staff_id
    and s.auth_user_id = auth.uid()
  ))
  OR
  -- または、管理者が「全体のシフト」を見るためのポリシーは上記Adminポリシーでカバーされるが、
  -- ヘルパーが「空きシフト」を探すなどの要件がある場合は別途検討が必要。
  -- MVPでは「自分の最新の確定シフトのみ」とあるので、自分担当のみでOK。
  false
);

-- トリガーの適用
create trigger on_update_shifts
  before update on public.shifts
  for each row
  execute procedure public.handle_updated_at();
