-- clients.address カラムを NULL 許可に変更
-- 基本スケジュール登録時に新規利用者を簡易登録できるようにするため
ALTER TABLE public.clients ALTER COLUMN address DROP NOT NULL;
