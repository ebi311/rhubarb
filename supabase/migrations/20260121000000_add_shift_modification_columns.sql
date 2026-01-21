-- Add columns for shift modification tracking
ALTER TABLE shifts
ADD COLUMN notes TEXT,
ADD COLUMN canceled_reason TEXT,
ADD COLUMN canceled_at TIMESTAMPTZ;

-- Add comment
COMMENT ON COLUMN shifts.notes IS '変更理由や備考';
COMMENT ON COLUMN shifts.canceled_reason IS 'キャンセル理由';
COMMENT ON COLUMN shifts.canceled_at IS 'キャンセル日時';
