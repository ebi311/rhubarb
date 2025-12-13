create table public.service_types (
  id uuid not null default gen_random_uuid() primary key,
  name text not null,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.service_types enable row level security;

-- RLS Policies
-- マスタデータとして、認証済みユーザー全員に読み取り権限を付与
create policy "Enable read access for authenticated users"
on public.service_types
for select
to authenticated
using (true);

-- トリガーの適用
create trigger on_update_service_types
  before update on public.service_types
  for each row
  execute procedure public.handle_updated_at();

-- 初期データの投入 (MVP要件)
insert into public.service_types (name, display_order) values
  ('身体介護', 10),
  ('生活支援', 20),
  ('通院サポート', 30);
