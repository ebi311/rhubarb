-- basic_schedules テーブルの start_time, end_time を text から time with time zone に変更
-- 既存データの変換: "0900" -> "09:00:00+00"

-- 一時カラムを作成
alter table public.basic_schedules
add column start_time_new time with time zone,
add column end_time_new time with time zone;

-- 既存データを変換: "HHMM" -> "HH:MM:00"
update public.basic_schedules
set 
  start_time_new = (substring(start_time, 1, 2) || ':' || substring(start_time, 3, 2) || ':00')::time with time zone,
  end_time_new = (substring(end_time, 1, 2) || ':' || substring(end_time, 3, 2) || ':00')::time with time zone;

-- 古いカラムを削除
alter table public.basic_schedules
drop column start_time,
drop column end_time;

-- 新しいカラムをリネーム
alter table public.basic_schedules
rename column start_time_new to start_time;

alter table public.basic_schedules
rename column end_time_new to end_time;

-- NOT NULL 制約を追加
alter table public.basic_schedules
alter column start_time set not null,
alter column end_time set not null;

-- チェック制約を追加（終了時刻が開始時刻より後であること）
alter table public.basic_schedules
add constraint basic_schedules_time_range_check
check (end_time > start_time);

-- staff_availabilities テーブルの start_time, end_time を text から time with time zone に変更
-- 既存データの変換: "0900" or "09:00" -> "09:00:00+00"

-- 一時カラムを作成
alter table public.staff_availabilities
add column start_time_new time with time zone,
add column end_time_new time with time zone;

-- 既存データを変換: "HHMM" または "HH:MM" -> "HH:MM:00"
update public.staff_availabilities
set 
  start_time_new = case
    when start_time ~ '^\d{4}$' then (substring(start_time, 1, 2) || ':' || substring(start_time, 3, 2) || ':00')::time with time zone
    else (start_time || ':00')::time with time zone
  end,
  end_time_new = case
    when end_time ~ '^\d{4}$' then (substring(end_time, 1, 2) || ':' || substring(end_time, 3, 2) || ':00')::time with time zone
    else (end_time || ':00')::time with time zone
  end;

-- 古いカラムを削除
alter table public.staff_availabilities
drop column start_time,
drop column end_time;

-- 新しいカラムをリネーム
alter table public.staff_availabilities
rename column start_time_new to start_time;

alter table public.staff_availabilities
rename column end_time_new to end_time;

-- NOT NULL 制約を追加
alter table public.staff_availabilities
alter column start_time set not null,
alter column end_time set not null;

-- チェック制約を追加（終了時刻が開始時刻より後であること）
alter table public.staff_availabilities
add constraint staff_availabilities_time_range_check
check (end_time > start_time);
