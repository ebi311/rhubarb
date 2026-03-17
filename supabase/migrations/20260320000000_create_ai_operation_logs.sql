create table public.ai_operation_logs (
id uuid not null default gen_random_uuid() primary key,
office_id uuid not null references public.offices (id) on delete cascade,
-- Supabase Auth のユーザー UUID を保持する。
-- 監査ログはユーザー削除後も保持する必要があるため、auth.users への FK は張らない。
actor_user_id uuid not null,
source text not null,
operation_type text not null,
targets jsonb not null,
proposal jsonb,
request jsonb,
result jsonb,
created_at timestamptz not null default now(),
constraint ai_operation_logs_source_check check (source = 'ai_chat'),
constraint ai_operation_logs_operation_type_check
check (operation_type in ('change_shift_staff', 'update_shift_time')),
constraint ai_operation_logs_targets_type_check
check (jsonb_typeof(targets) = 'object')
);

comment on table public.ai_operation_logs is
'AI操作の監査ログ。RLS方針: INSERT は service role のみ、SELECT は同一オフィスの admin のみ、UPDATE/DELETE は不許可。';

comment on column public.ai_operation_logs.actor_user_id is
'Supabase Auth のユーザー UUID。監査ログをユーザー削除後も保持するため、auth.users への FK は張らない。';

create index ai_operation_logs_office_created_at_idx
on public.ai_operation_logs (office_id, created_at desc);

alter table public.ai_operation_logs enable row level security;

create policy "Admins can read ai operation logs in their office"
on public.ai_operation_logs
for select

to authenticated
using (
public.is_admin_in_office(office_id)
);
