-- shifts テーブルを timestamptz ベースに変更
-- date, start_time (text), end_time (text) → start_time (timestamptz), end_time (timestamptz)

-- 1. 既存データをバックアップ用に一時テーブルに退避（本番では必要に応じて対応）
-- 2. カラムを追加・変換・削除

-- 新しいカラムを追加
alter table public.shifts 
  add column start_time_new timestamptz,
  add column end_time_new timestamptz;

-- 既存データがある場合は変換（date + start_time/end_time を組み合わせて timestamptz に）
-- start_time/end_time は "HHMM" 形式の文字列
update public.shifts
set 
  start_time_new = (date::date + (substring(start_time from 1 for 2) || ':' || substring(start_time from 3 for 2))::time)::timestamptz,
  end_time_new = (date::date + (substring(end_time from 1 for 2) || ':' || substring(end_time from 3 for 2))::time)::timestamptz
where start_time_new is null;

-- 古いカラムを削除
alter table public.shifts
  drop column date,
  drop column start_time,
  drop column end_time;

-- 新しいカラムをリネーム
alter table public.shifts
  rename column start_time_new to start_time;
alter table public.shifts
  rename column end_time_new to end_time;

-- NOT NULL 制約を追加
alter table public.shifts
  alter column start_time set not null,
  alter column end_time set not null;

-- インデックスを追加（日付範囲検索用）
create index idx_shifts_start_time on public.shifts (start_time);
create index idx_shifts_staff_start_time on public.shifts (staff_id, start_time);
