-- 利用者テーブルに契約ステータスカラムを追加

-- 契約ステータスの型定義
create type public.contract_status as enum ('active', 'suspended');

-- カラムの追加
alter table public.clients
  add column contract_status public.contract_status not null default 'active';

-- インデックスの追加（契約中の利用者の検索を高速化）
create index idx_clients_contract_status on public.clients(office_id, contract_status);

-- コメント
comment on column public.clients.contract_status is '契約ステータス: active=契約中, suspended=中断中';
