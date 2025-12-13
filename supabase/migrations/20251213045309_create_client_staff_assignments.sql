create table public.client_staff_assignments (
  id uuid not null default gen_random_uuid() primary key,
  client_id uuid not null references public.clients(id) on delete cascade,
  staff_id uuid not null references public.staffs(id) on delete cascade,
  service_type_id uuid not null references public.service_types(id) on delete cascade,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- 同じ利用者・スタッフ・サービスの組み合わせはユニークにする
  constraint client_staff_service_unique unique (client_id, staff_id, service_type_id)
);

alter table public.client_staff_assignments enable row level security;

-- RLS Policies
-- 1. 管理者は自分の事業所の割り当てを全操作可能
create policy "Admins can manage assignments in their office"
on public.client_staff_assignments
to authenticated
using (
  exists (
    select 1 from public.clients as c
    where c.id = client_staff_assignments.client_id
    and exists (
      select 1 from public.staffs as s
      where s.auth_user_id = auth.uid()
      and s.office_id = c.office_id
      and s.role = 'admin'
    )
  )
);

-- 2. ヘルパーは自分の事業所の割り当てを閲覧可能
create policy "Staffs can read assignments in their office"
on public.client_staff_assignments
for select
to authenticated
using (
  exists (
    select 1 from public.clients as c
    where c.id = client_staff_assignments.client_id
    and exists (
      select 1 from public.staffs as s
      where s.auth_user_id = auth.uid()
      and s.office_id = c.office_id
    )
  )
);

-- トリガーの適用
create trigger on_update_client_staff_assignments
  before update on public.client_staff_assignments
  for each row
  execute procedure public.handle_updated_at();
