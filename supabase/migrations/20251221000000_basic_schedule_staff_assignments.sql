alter table public.basic_schedules
  add column if not exists deleted_at timestamptz;

alter table public.basic_schedules
  drop column if exists staff_id;

create table public.basic_schedule_staff_assignments (
  id uuid primary key default gen_random_uuid(),
  basic_schedule_id uuid not null references public.basic_schedules(id) on delete cascade,
  staff_id uuid not null references public.staffs(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (basic_schedule_id, staff_id)
);

alter table public.basic_schedule_staff_assignments enable row level security;

create trigger on_update_basic_schedule_staff_assignments
  before update on public.basic_schedule_staff_assignments
  for each row
  execute procedure public.handle_updated_at();

create policy "Admins manage basic schedule staff assignments in their office"
  on public.basic_schedule_staff_assignments
  to authenticated
  using (
    exists (
      select 1
      from public.basic_schedules as bs
      join public.clients as c on c.id = bs.client_id
      join public.staffs as s on s.office_id = c.office_id
      where bs.id = basic_schedule_staff_assignments.basic_schedule_id
        and s.auth_user_id = auth.uid()
        and s.role = 'admin'
    )
  );

create policy "Staffs read basic schedule staff assignments in their office"
  on public.basic_schedule_staff_assignments
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.basic_schedules as bs
      join public.clients as c on c.id = bs.client_id
      join public.staffs as s on s.office_id = c.office_id
      where bs.id = basic_schedule_staff_assignments.basic_schedule_id
        and s.auth_user_id = auth.uid()
    )
  );
