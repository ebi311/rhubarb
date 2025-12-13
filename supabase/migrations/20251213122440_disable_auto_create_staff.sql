-- Disable auto-creation of staff records on user signup
-- Only pre-registered users in staffs table should be able to log in

-- Drop the trigger that automatically creates staff records
drop trigger if exists on_auth_user_created on auth.users;

-- Drop the function (keep it commented for future reference)
drop function if exists public.handle_new_user();

-- Note: To allow a new user to log in:
-- 1. Insert a record in staffs table with their email address and auth_user_id as NULL
-- 2. When they log in with Google, update the auth_user_id in staffs table
--
-- Example:
-- INSERT INTO public.staffs (office_id, auth_user_id, name, role, email)
-- VALUES (
--   '<office-id>',
--   NULL,
--   'ユーザー名',
--   'helper',
--   'user@example.com'
-- );
