# 利用者管理機能

## 概要

訪問介護サービスを受ける利用者の情報を管理する機能。
契約ステータス管理により、誤ったスケジュール作成を防止する。

## データモデル

### clients テーブル

| カラム          | 型          | 必須 | デフォルト | 説明               |
| --------------- | ----------- | ---- | ---------- | ------------------ |
| id              | UUID        | ✓    | 自動生成   | 主キー             |
| office_id       | UUID        | ✓    | -          | 所属オフィス（FK） |
| name            | TEXT        | ✓    | -          | 利用者氏名         |
| address         | TEXT        | ✓    | -          | 訪問先住所         |
| contract_status | ENUM        | ✓    | 'active'   | 契約ステータス     |
| created_at      | TIMESTAMPTZ | ✓    | now()      | 作成日時           |
| updated_at      | TIMESTAMPTZ | ✓    | now()      | 更新日時           |

### 契約ステータス (contract_status)

| 値        | 説明               | UI 表示 |
| --------- | ------------------ | ------- |
| active    | 契約中（通常状態） | 契約中  |
| suspended | 契約中断中         | 中断中  |

## ビジネスルール

1. `suspended` 状態の利用者は新規スケジュール作成時に選択不可
2. 既存スケジュールは保持されるが、警告表示される
3. 削除機能は提供しない（履歴保持のため）

### 状態遷移

```
active ←→ suspended
```

- `active → suspended`: 契約を中断する
- `suspended → active`: 契約を再開する

## API / Server Actions

### `listClientsAction(filters?)`

- 利用者一覧を取得
- フィルタ: `{ status?: 'active' | 'suspended' | 'all' }`
- デフォルト: `status = 'active'`

### `createClientAction(input)`

- 利用者を新規作成
- 入力: `{ name, address }`
- 自動的に `contract_status = 'active'` で作成

### `updateClientAction(id, input)`

- 利用者を更新
- 入力: `{ name, address }`

### `suspendClientAction(id)`

- 契約を中断（`contract_status = 'suspended'`）

### `resumeClientAction(id)`

- 契約を再開（`contract_status = 'active'`）

## バリデーション（Zod）

```typescript
const ClientInputSchema = z.object({
	name: z.string().min(1).max(100).trim(),
	address: z.string().min(1).max(200).trim(),
});
```

## RLS ポリシー

- 管理者: 自オフィスの利用者を全操作可能
- ヘルパー: 自オフィスの利用者を閲覧のみ可能

## 関連ファイル

- `src/app/actions/clientActions.ts`
- `src/backend/services/clientService.ts`
- `src/backend/repositories/clientRepository.ts`
- `src/models/serviceUser.ts`

## 関連ユースケース

- [UC03: 利用者管理](../use-cases/UC03-client-management.md)
