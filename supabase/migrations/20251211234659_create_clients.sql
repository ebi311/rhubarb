create table public.clients (
  id uuid not null default gen_random_uuid() primary key,
  office_id uuid not null references public.offices(id) on delete cascade,
  name text not null,
  address text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.clients enable row level security;

-- RLS Policies
-- 1. 管理者は自分の事業所の利用者を全操作可能
-- 2. ヘルパーは自分の事業所の利用者を閲覧可能（シフト確認のため）

create policy "Admins can manage clients in their office"
on public.clients
to authenticated
using (
  exists (
    select 1 from public.staffs as s
    where s.auth_user_id = auth.uid()
    and s.office_id = clients.office_id
    and s.role = 'admin'
  )
);

create policy "Staffs can read clients in their office"
on public.clients
for select
to authenticated
using (
  exists (
    select 1 from public.staffs as s
    where s.auth_user_id = auth.uid()
    and s.office_id = clients.office_id
  )
);

-- トリガーの適用
create trigger on_update_clients
  before update on public.clients
  for each row
  execute procedure public.handle_updated_at();
