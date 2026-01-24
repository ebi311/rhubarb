-- Add canceled_category column to shifts table
ALTER TABLE shifts
ADD COLUMN canceled_category TEXT;

-- Add comment
COMMENT ON COLUMN shifts.canceled_category IS 'キャンセル理由カテゴリ（client: 利用者都合, staff: スタッフ都合, other: その他）';
