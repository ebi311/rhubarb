# 基本スケジュール機能

## 概要

週次で繰り返される基本スケジュールの登録・更新・削除機能。
基本スケジュールは週間シフト生成の元データとなる。

## データモデル

### basic_schedules テーブル

| カラム          | 型          | 必須 | 説明                                |
| --------------- | ----------- | ---- | ----------------------------------- |
| id              | UUID        | ✓    | 主キー                              |
| office_id       | UUID        | ✓    | 所属オフィス（FK）                  |
| client_id       | UUID        | ✓    | 利用者（FK）                        |
| service_type_id | UUID        | ✓    | サービス区分（FK）                  |
| staff_id        | UUID        | ✓    | デフォルト担当者（FK）              |
| weekday         | ENUM        | ✓    | 曜日（SUN/MON/TUE/WED/THU/FRI/SAT） |
| start_time      | TIME        | ✓    | 開始時刻                            |
| end_time        | TIME        | ✓    | 終了時刻                            |
| note            | TEXT        |      | 備考（最大 500 文字）               |
| deleted_at      | TIMESTAMPTZ |      | 論理削除日時                        |
| created_at      | TIMESTAMPTZ | ✓    | 作成日時                            |
| updated_at      | TIMESTAMPTZ | ✓    | 更新日時                            |

## ビジネスルール

1. **利用者制約**: `contract_status = 'active'` のみ選択可
2. **スタッフ制約**: `ClientStaffAssignment` に登録されたスタッフのみ選択可
3. **時間制約**: `start_time < end_time`（夜跨ぎは非対応）
4. **重複禁止**: 同一スタッフ・同一曜日で時間が重複するスケジュールは作成不可
5. **論理削除**: 物理削除ではなく `deleted_at` を設定
6. **削除済み編集禁止**: `deleted_at` が設定されたレコードは編集不可

## API / Server Actions

### `listBasicSchedulesAction(filters?)`

- 基本スケジュール一覧を取得
- フィルタ: `{ weekday?, clientId?, serviceTypeId?, includeDeleted? }`
- `includeDeleted` のデフォルトは `false`

### `getBasicScheduleAction(id)`

- 基本スケジュールを 1 件取得

### `createBasicScheduleAction(input)`

- 基本スケジュールを作成
- 入力: `{ clientId, serviceTypeId, staffId, weekday, startTime, endTime, note? }`

### `updateBasicScheduleAction(id, input)`

- 基本スケジュールを更新
- `clientId` は変更不可

### `deleteBasicScheduleAction(id)`

- 基本スケジュールを論理削除（`deleted_at` を設定）

## バリデーション（Zod）

```typescript
const BasicScheduleInputSchema = z
	.object({
		clientId: z.string().uuid(),
		serviceTypeId: z.string().uuid(),
		staffId: z.string().uuid(),
		weekday: z.enum(['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']),
		startTime: TimeValueSchema,
		endTime: TimeValueSchema,
		note: z.string().max(500).optional().nullable(),
	})
	.refine(/* start < end のチェック */);
```

## エラーケース

| コード | 説明                        |
| ------ | --------------------------- |
| 400    | バリデーション失敗          |
| 403    | 管理者権限なし              |
| 404    | スケジュール/利用者が不存在 |
| 409    | 重複または許可リスト違反    |

## 関連ファイル

- `src/app/actions/basicScheduleActions.ts`
- `src/backend/services/basicScheduleService.ts`
- `src/backend/repositories/basicScheduleRepository.ts`
- `src/models/basicSchedule.ts`
- `src/models/basicScheduleActionSchemas.ts`

## 関連ユースケース

- [UC04: 基本スケジュール管理](../use-cases/UC04-basic-schedule-management.md)
