-- 既存データのクリア(順序重要)
truncate table public.shifts cascade;
truncate table public.basic_schedules cascade;
truncate table public.client_staff_assignments cascade;
truncate table public.staff_availabilities cascade;
truncate table public.clients cascade;
truncate table public.staffs cascade;
truncate table public.offices cascade;

-- 注意: シードデータは開発環境でのテスト用です
-- 実際のユーザーは Google 認証後に自動的に staffs テーブルに作成されます

-- UUIDs for seed data
-- Office: 019b179f-c74d-75ef-a328-55a8f65a0d8a
-- Helper1: 019b179f-c7db-7248-bcdc-745cfa30edad
-- Helper2: 019b179f-c863-774e-ad83-4adc56163d05
-- Client1 (active): 019b179f-c8ec-7098-a1d7-7d2dc84f4b8d
-- Client2 (active): 019b179f-c977-717a-ab85-8d61b628550e
-- Client3 (suspended): 019b179f-ca00-7291-bb3a-9f2e8c5d1a7b
-- Client4 (active): 019b179f-ca8a-7453-a912-1e3f4d6b8c2e

-- 1. Offices
INSERT INTO public.offices (id, name)
VALUES
  ('019b179f-c74d-75ef-a328-55a8f65a0d8a', 'ひまわりケア');

-- 2. 既存の auth.users に対応する staffs レコードを作成
-- Google ログイン済みユーザーがいる場合、そのユーザーを管理者として登録
DO $$
DECLARE
  first_user_id uuid;
  first_user_email text;
BEGIN
  -- 最初の認証済みユーザーを取得
  SELECT id, email INTO first_user_id, first_user_email
  FROM auth.users
  WHERE deleted_at IS NULL
  ORDER BY created_at ASC
  LIMIT 1;

  -- ユーザーが存在する場合、管理者として登録
  IF first_user_id IS NOT NULL THEN
    INSERT INTO public.staffs (office_id, auth_user_id, name, role, email)
    VALUES (
      '019b179f-c74d-75ef-a328-55a8f65a0d8a',
      first_user_id,
      coalesce(
        (SELECT raw_user_meta_data->>'full_name' FROM auth.users WHERE id = first_user_id),
        split_part(first_user_email, '@', 1)
      ),
      'admin',
      first_user_email
    )
    ON CONFLICT (auth_user_id) DO UPDATE
    SET role = 'admin'; -- 既存ユーザーは管理者に昇格
  END IF;
END $$;

-- 3. テスト用ヘルパースタッフ（auth_user_id なし）
INSERT INTO public.staffs (id, office_id, auth_user_id, name, role, email)
VALUES
  ('019b179f-c7db-7248-bcdc-745cfa30edad', '019b179f-c74d-75ef-a328-55a8f65a0d8a', NULL, 'ヘルパー 太郎', 'helper', NULL),
  ('019b179f-c863-774e-ad83-4adc56163d05', '019b179f-c74d-75ef-a328-55a8f65a0d8a', NULL, 'ヘルパー 次郎', 'helper', NULL);

-- 4. Clients
INSERT INTO public.clients (id, office_id, name, address, contract_status)
VALUES
  -- 契約中の利用者
  ('019b179f-c8ec-7098-a1d7-7d2dc84f4b8d', '019b179f-c74d-75ef-a328-55a8f65a0d8a', '利用者 A子', '東京都世田谷区1-1-1', 'active'),
  ('019b179f-c977-717a-ab85-8d61b628550e', '019b179f-c74d-75ef-a328-55a8f65a0d8a', '利用者 B男', '東京都世田谷区2-2-2', 'active'),
  ('019b179f-ca8a-7453-a912-1e3f4d6b8c2e', '019b179f-c74d-75ef-a328-55a8f65a0d8a', '利用者 C美', '東京都世田谷区4-4-4', 'active'),
  -- 契約中断中の利用者
  ('019b179f-ca00-7291-bb3a-9f2e8c5d1a7b', '019b179f-c74d-75ef-a328-55a8f65a0d8a', '利用者 D郎', '東京都世田谷区3-3-3', 'suspended');

-- 5. Staff Availabilities (稼働可能シフト)
-- 太郎: 月・水・金の午前中
-- 次郎: 火・木の午後
INSERT INTO public.staff_availabilities (staff_id, day_of_week, start_time, end_time, priority)
VALUES
  ('019b179f-c7db-7248-bcdc-745cfa30edad', 'Mon', '0900', '1200', 'High'),
  ('019b179f-c7db-7248-bcdc-745cfa30edad', 'Wed', '0900', '1200', 'High'),
  ('019b179f-c7db-7248-bcdc-745cfa30edad', 'Fri', '0900', '1200', 'High'),
  ('019b179f-c863-774e-ad83-4adc56163d05', 'Tue', '1300', '1700', 'High'),
  ('019b179f-c863-774e-ad83-4adc56163d05', 'Thu', '1300', '1700', 'High');

-- 6. Client Staff Assignments (担当許可)
-- サービスIDを直接使用（text型に変更後）

-- A子さんは、太郎の身体介護OK
INSERT INTO public.client_staff_assignments (client_id, staff_id, service_type_id, note)
VALUES ('019b179f-c8ec-7098-a1d7-7d2dc84f4b8d', '019b179f-c7db-7248-bcdc-745cfa30edad', 'physical-care', '相性良し');

-- B男さんは、次郎の生活支援OK
INSERT INTO public.client_staff_assignments (client_id, staff_id, service_type_id, note)
VALUES ('019b179f-c977-717a-ab85-8d61b628550e', '019b179f-c863-774e-ad83-4adc56163d05', 'life-support', '指名あり');

-- 7. Basic Schedules (基本スケジュール)
DO $$
DECLARE
  schedule_id_1 uuid := gen_random_uuid();
  schedule_id_2 uuid := gen_random_uuid();
BEGIN
  -- A子さん: 月曜 10:00-11:00 身体介護 (担当: 太郎)
  INSERT INTO public.basic_schedules (id, client_id, service_type_id, day_of_week, start_time, end_time)
  VALUES (schedule_id_1, '019b179f-c8ec-7098-a1d7-7d2dc84f4b8d', 'physical-care', 'Mon', '1000', '1100');
  
  INSERT INTO public.basic_schedule_staff_assignments (basic_schedule_id, staff_id)
  VALUES (schedule_id_1, '019b179f-c7db-7248-bcdc-745cfa30edad');

  -- B男さん: 火曜 14:00-15:00 生活支援 (担当: 次郎)
  INSERT INTO public.basic_schedules (id, client_id, service_type_id, day_of_week, start_time, end_time)
  VALUES (schedule_id_2, '019b179f-c977-717a-ab85-8d61b628550e', 'life-support', 'Tue', '1400', '1500');
  
  INSERT INTO public.basic_schedule_staff_assignments (basic_schedule_id, staff_id)
  VALUES (schedule_id_2, '019b179f-c863-774e-ad83-4adc56163d05');
END $$;

-- 8. Shifts (シフト実体) - 直近の日付で作成
-- 注意: seed.sql は静的なので、実行時の日付に依存するデータを入れるのは工夫が必要。
-- ここでは、現在日付から計算して挿入する。
-- start_time, end_time は timestamptz で保存
DO $$
DECLARE
  today date := current_date;
BEGIN
  -- 明日のシフト (A子さん) 10:00-11:00
  INSERT INTO public.shifts (client_id, service_type_id, staff_id, start_time, end_time, status)
  VALUES (
    '019b179f-c8ec-7098-a1d7-7d2dc84f4b8d', 
    'physical-care', 
    '019b179f-c7db-7248-bcdc-745cfa30edad', 
    (today + 1)::timestamp + interval '10 hours',
    (today + 1)::timestamp + interval '11 hours',
    'scheduled'
  );

  -- 明後日のシフト (B男さん) 14:00-15:00
  INSERT INTO public.shifts (client_id, service_type_id, staff_id, start_time, end_time, status)
  VALUES (
    '019b179f-c977-717a-ab85-8d61b628550e', 
    'life-support', 
    '019b179f-c863-774e-ad83-4adc56163d05', 
    (today + 2)::timestamp + interval '14 hours',
    (today + 2)::timestamp + interval '15 hours',
    'confirmed'
  );
END $$;
