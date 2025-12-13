create type public.user_role as enum ('admin', 'helper');

create table public.staffs (
  id uuid not null default gen_random_uuid() primary key,
  office_id uuid not null references public.offices(id) on delete cascade,
  auth_user_id uuid references auth.users(id) on delete set null,
  name text not null,
  role user_role not null default 'helper',
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  
  constraint staffs_auth_user_id_key unique (auth_user_id)
);

alter table public.staffs enable row level security;

-- RLS Policies
-- 1. 管理者は自分の事業所のスタッフを全操作可能
-- 2. ヘルパーは自分の情報のみ閲覧・更新可能（要件によるが一旦自分のみ）

create policy "Admins can manage staffs in their office"
on public.staffs
to authenticated
using (
  exists (
    select 1 from public.staffs as s
    where s.auth_user_id = auth.uid()
    and s.office_id = staffs.office_id
    and s.role = 'admin'
  )
);

create policy "Users can read own staff profile"
on public.staffs
for select
to authenticated
using (
  auth_user_id = auth.uid()
);

-- トリガーの適用
create trigger on_update_staffs
  before update on public.staffs
  for each row
  execute procedure public.handle_updated_at();
