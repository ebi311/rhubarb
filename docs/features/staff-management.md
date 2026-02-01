# スタッフ管理機能

## 概要

担当者（スタッフ）の登録・更新・削除、およびサービス区分権限の管理機能。

## データモデル

### staffs テーブル

| カラム       | 型          | 必須 | 説明                      |
| ------------ | ----------- | ---- | ------------------------- |
| id           | UUID        | ✓    | 主キー                    |
| office_id    | UUID        | ✓    | 所属オフィス（FK）        |
| auth_user_id | UUID        |      | Supabase Auth ユーザー ID |
| name         | TEXT        | ✓    | 氏名                      |
| email        | TEXT        |      | メールアドレス            |
| role         | ENUM        | ✓    | `admin` / `helper`        |
| note         | TEXT        |      | 備考（最大 500 文字）     |
| created_at   | TIMESTAMPTZ | ✓    | 作成日時                  |
| updated_at   | TIMESTAMPTZ | ✓    | 更新日時                  |

### staff_service_type_abilities テーブル

| カラム          | 型          | 説明                         |
| --------------- | ----------- | ---------------------------- |
| id              | UUID        | 主キー                       |
| staff_id        | UUID        | スタッフ（FK、CASCADE 削除） |
| service_type_id | UUID        | サービス区分（FK）           |
| created_at      | TIMESTAMPTZ | 作成日時                     |
| updated_at      | TIMESTAMPTZ | 更新日時                     |

- `UNIQUE (staff_id, service_type_id)` 制約

## ビジネスルール

1. `service_type_ids` 省略時は全サービス区分を担当可能として保存
2. `service_type_ids` は同一オフィス内の ServiceType のみ許可
3. 管理者のみサービス区分権限を変更可能
4. `note` は 500 文字まで、空文字は null 保存

## API / Server Actions

### `listStaffsAction()`

- 自オフィスのスタッフ一覧を取得
- 戻り値: `ActionResult<Staff[]>`

### `createStaffAction(input)`

- スタッフを新規作成
- 入力: `{ name, email?, role, note?, service_type_ids? }`
- 戻り値: `ActionResult<Staff>`

### `updateStaffAction(id, input)`

- スタッフを更新
- 入力: `{ name, email?, role, note?, service_type_ids? }`
- 戻り値: `ActionResult<Staff>`

### `deleteStaffAction(id)`

- スタッフを削除
- 戻り値: `ActionResult<void>`

## バリデーション（Zod）

```typescript
const StaffInputSchema = z.object({
	name: z.string().min(1).max(100),
	email: z.string().email().optional().nullable(),
	role: z.enum(['admin', 'helper']),
	note: z.string().max(500).optional().nullable(),
	service_type_ids: z.array(z.string().uuid()).optional(),
});
```

## エラーケース

| コード | 説明                          |
| ------ | ----------------------------- |
| 400    | バリデーション失敗            |
| 403    | 管理者権限なし                |
| 404    | スタッフ/サービス区分が不存在 |
| 409    | 重複またはユニーク制約違反    |

## 関連ファイル

- `src/app/actions/staffActions.ts`
- `src/backend/services/staffService.ts`
- `src/backend/repositories/staffRepository.ts`
- `src/models/staff.ts`
- `src/models/staffActionSchemas.ts`

## 関連ユースケース

- [UC02: スタッフ管理](../use-cases/UC02-staff-management.md)
