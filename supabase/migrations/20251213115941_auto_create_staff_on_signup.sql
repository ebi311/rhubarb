-- Function to automatically create a staff record when a user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
declare
  default_office_id uuid;
begin
  -- Get the first office (or create logic to determine which office)
  select id into default_office_id
  from public.offices
  limit 1;

  -- If no office exists, we can't create a staff record
  if default_office_id is null then
    raise exception 'No office found. Please create an office first.';
  end if;

  -- Insert new staff record
  insert into public.staffs (
    office_id,
    auth_user_id,
    name,
    role,
    email
  ) values (
    default_office_id,
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'helper', -- Default role is helper, can be changed to admin manually
    new.email
  );

  return new;
end;
$$;

-- Trigger to run after a new user is created
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
