create table public.offices (
  id uuid not null default gen_random_uuid() primary key,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.offices enable row level security;

create policy "Enable read access for authenticated users"
on public.offices
for select
to authenticated
using (true);

-- 自動更新トリガー関数の作成（初回のみで良いが、ここに含める）
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- トリガーの適用
create trigger on_update_offices
  before update on public.offices
  for each row
  execute procedure public.handle_updated_at();
