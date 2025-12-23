alter table public.staffs
  add column if not exists note text;

create table public.staff_service_type_abilities (
  id uuid not null default gen_random_uuid() primary key,
  staff_id uuid not null references public.staffs(id) on delete cascade,
  service_type_id uuid not null references public.service_types(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_service_type_unique unique (staff_id, service_type_id)
);

alter table public.staff_service_type_abilities enable row level security;

create policy "Admins can manage staff service abilities in their office"
on public.staff_service_type_abilities
for all
to authenticated
using (
  exists (
    select 1
    from public.staffs as admin_staff
    join public.staffs as target_staff on target_staff.id = staff_service_type_abilities.staff_id
    where admin_staff.auth_user_id = auth.uid()
      and admin_staff.role = 'admin'
      and admin_staff.office_id = target_staff.office_id
  )
)
with check (
  exists (
    select 1
    from public.staffs as admin_staff
    join public.staffs as target_staff on target_staff.id = staff_service_type_abilities.staff_id
    where admin_staff.auth_user_id = auth.uid()
      and admin_staff.role = 'admin'
      and admin_staff.office_id = target_staff.office_id
  )
);

create policy "Staffs can read abilities in their office"
on public.staff_service_type_abilities
for select
to authenticated
using (
  exists (
    select 1
    from public.staffs as viewer
    join public.staffs as target_staff on target_staff.id = staff_service_type_abilities.staff_id
    where viewer.auth_user_id = auth.uid()
      and viewer.office_id = target_staff.office_id
  )
);

create trigger on_update_staff_service_type_abilities
  before update on public.staff_service_type_abilities
  for each row
  execute procedure public.handle_updated_at();
