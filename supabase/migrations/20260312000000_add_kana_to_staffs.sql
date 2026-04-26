-- staffs テーブルに kana カラムを追加（text, nullable）
-- かな（ふりがな）検索を可能にするため

alter table public.staffs
  add column kana text;

comment on column public.staffs.kana is 'スタッフ名のふりがな（検索用）';
