-- Fix infinite recursion in staffs RLS policy
-- Drop the problematic policy
drop policy if exists "Admins can manage staffs in their office" on public.staffs;

-- Create a helper function to check if user is admin
create or replace function public.is_admin_in_office(target_office_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from public.staffs
    where auth_user_id = auth.uid()
      and office_id = target_office_id
      and role = 'admin'
  );
$$;

-- Create corrected policies using the helper function
create policy "Admins can view staffs in their office"
on public.staffs
for select
to authenticated
using (
  public.is_admin_in_office(office_id)
);

create policy "Admins can insert staffs in their office"
on public.staffs
for insert
to authenticated
with check (
  public.is_admin_in_office(office_id)
);

create policy "Admins can update staffs in their office"
on public.staffs
for update
to authenticated
using (
  public.is_admin_in_office(office_id)
)
with check (
  public.is_admin_in_office(office_id)
);

create policy "Admins can delete staffs in their office"
on public.staffs
for delete
to authenticated
using (
  public.is_admin_in_office(office_id)
);
