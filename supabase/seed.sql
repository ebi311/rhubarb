-- 既存データのクリア（順序重要）
truncate table public.shifts cascade;
truncate table public.basic_schedules cascade;
truncate table public.client_staff_assignments cascade;
truncate table public.staff_availabilities cascade;
truncate table public.clients cascade;
truncate table public.staffs cascade;
truncate table public.offices cascade;
-- auth.users は truncate しない（システム全体に影響するため）。テストユーザーのみ削除する方針もあるが、ここではID指定で競合しないように挿入する。

-- 変数定義の代わりに、固定UUIDを使用する
-- Office: aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa
-- Admin User: bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb
-- Helper1 User: cccccccc-cccc-cccc-cccc-cccccccccccc
-- Helper2 User: dddddddd-dddd-dddd-dddd-dddddddddddd
-- Client1: eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee
-- Client2: ffffffff-ffff-ffff-ffff-ffffffffffff

-- 1. Auth Users (パスワードは 'password123')
-- 注意: ローカル開発環境でのみ動作することを想定
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud, confirmation_token)
VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'admin@example.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), 'authenticated', 'authenticated', ''),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'helper1@example.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), 'authenticated', 'authenticated', ''),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'helper2@example.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), 'authenticated', 'authenticated', '')
ON CONFLICT (id) DO NOTHING; -- すでに存在する場合は何もしない

-- 2. Offices
INSERT INTO public.offices (id, name)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'ひまわりケア');

-- 3. Staffs
INSERT INTO public.staffs (id, office_id, auth_user_id, name, role, email)
VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '管理者 花子', 'admin', 'admin@example.com'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'ヘルパー 太郎', 'helper', 'helper1@example.com'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'ヘルパー 次郎', 'helper', 'helper2@example.com');

-- 4. Clients
INSERT INTO public.clients (id, office_id, name, address)
VALUES
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '利用者 A子', '東京都世田谷区1-1-1'),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '利用者 B男', '東京都世田谷区2-2-2');

-- 5. Staff Availabilities (稼働可能シフト)
-- 太郎: 月・水・金の午前中
-- 次郎: 火・木の午後
INSERT INTO public.staff_availabilities (staff_id, day_of_week, start_time, end_time, priority)
VALUES
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Mon', '0900', '1200', 'High'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Wed', '0900', '1200', 'High'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Fri', '0900', '1200', 'High'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Tue', '1300', '1700', 'High'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Thu', '1300', '1700', 'High');

-- 6. Client Staff Assignments (担当許可)
-- サービスIDを取得するための準備
DO $$
DECLARE
  service_body uuid;
  service_life uuid;
BEGIN
  SELECT id INTO service_body FROM public.service_types WHERE name = '身体介護' LIMIT 1;
  SELECT id INTO service_life FROM public.service_types WHERE name = '生活支援' LIMIT 1;

  -- A子さん(eeee...)は、太郎(cccc...)の身体介護OK
  INSERT INTO public.client_staff_assignments (client_id, staff_id, service_type_id, note)
  VALUES ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'cccccccc-cccc-cccc-cccc-cccccccccccc', service_body, '相性良し');

  -- B男さん(ffff...)は、次郎(dddd...)の生活支援OK
  INSERT INTO public.client_staff_assignments (client_id, staff_id, service_type_id, note)
  VALUES ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'dddddddd-dddd-dddd-dddd-dddddddddddd', service_life, '指名あり');
END $$;

-- 7. Basic Schedules (基本スケジュール)
DO $$
DECLARE
  service_body uuid;
  service_life uuid;
BEGIN
  SELECT id INTO service_body FROM public.service_types WHERE name = '身体介護' LIMIT 1;
  SELECT id INTO service_life FROM public.service_types WHERE name = '生活支援' LIMIT 1;

  -- A子さん: 月曜 10:00-11:00 身体介護 (担当: 太郎)
  INSERT INTO public.basic_schedules (client_id, service_type_id, staff_id, day_of_week, start_time, end_time)
  VALUES ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', service_body, 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Mon', '1000', '1100');

  -- B男さん: 火曜 14:00-15:00 生活支援 (担当: 次郎)
  INSERT INTO public.basic_schedules (client_id, service_type_id, staff_id, day_of_week, start_time, end_time)
  VALUES ('ffffffff-ffff-ffff-ffff-ffffffffffff', service_life, 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Tue', '1400', '1500');
END $$;

-- 8. Shifts (シフト実体) - 直近の日付で作成
-- 注意: seed.sql は静的なので、実行時の日付に依存するデータを入れるのは工夫が必要。
-- ここでは、現在日付から計算して挿入する。
DO $$
DECLARE
  service_body uuid;
  service_life uuid;
  today date := current_date;
BEGIN
  SELECT id INTO service_body FROM public.service_types WHERE name = '身体介護' LIMIT 1;
  SELECT id INTO service_life FROM public.service_types WHERE name = '生活支援' LIMIT 1;

  -- 明日のシフト (A子さん)
  INSERT INTO public.shifts (client_id, service_type_id, staff_id, date, start_time, end_time, status)
  VALUES ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', service_body, 'cccccccc-cccc-cccc-cccc-cccccccccccc', today + 1, '1000', '1100', 'scheduled');

  -- 明後日のシフト (B男さん)
  INSERT INTO public.shifts (client_id, service_type_id, staff_id, date, start_time, end_time, status)
  VALUES ('ffffffff-ffff-ffff-ffff-ffffffffffff', service_life, 'dddddddd-dddd-dddd-dddd-dddddddddddd', today + 2, '1400', '1500', 'confirmed');
END $$;
