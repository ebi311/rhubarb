# 週間スケジュール機能

## 概要

基本スケジュールから週単位のシフトを生成し、変更・キャンセルなどの操作を行う機能。

## データモデル

### shifts テーブル

| カラム            | 型          | 必須 | 説明                          |
| ----------------- | ----------- | ---- | ----------------------------- |
| id                | UUID        | ✓    | 主キー                        |
| office_id         | UUID        | ✓    | 所属オフィス（FK）            |
| basic_schedule_id | UUID        |      | 元の基本スケジュール（FK）    |
| client_id         | UUID        | ✓    | 利用者（FK）                  |
| service_type_id   | UUID        | ✓    | サービス区分（FK）            |
| staff_id          | UUID        |      | 担当者（FK、未割当時は null） |
| date              | DATE        | ✓    | シフト日付                    |
| start_time        | TIME        | ✓    | 開始時刻                      |
| end_time          | TIME        | ✓    | 終了時刻                      |
| status            | ENUM        | ✓    | ステータス                    |
| is_unassigned     | BOOLEAN     | ✓    | 未割当フラグ                  |
| cancel_category   | ENUM        |      | キャンセル理由カテゴリ        |
| cancel_reason     | TEXT        |      | キャンセル理由詳細            |
| canceled_at       | TIMESTAMPTZ |      | キャンセル日時                |
| note              | TEXT        |      | 備考                          |
| created_at        | TIMESTAMPTZ | ✓    | 作成日時                      |
| updated_at        | TIMESTAMPTZ | ✓    | 更新日時                      |

### シフトステータス

| 値        | 説明                   |
| --------- | ---------------------- |
| scheduled | 予定済み（デフォルト） |
| confirmed | 確定済み               |
| completed | 完了                   |
| canceled  | キャンセル済み         |

### キャンセル理由カテゴリ

| 値            | 説明         |
| ------------- | ------------ |
| client_reason | 利用者都合   |
| staff_reason  | スタッフ都合 |
| other         | その他       |

## ビジネスルール

1. **生成単位**: 月曜日を起点とした週単位
2. **重複防止**: 同じ基本スケジュール・同じ日付のシフトは重複生成しない
3. **担当者変更**: 同時間帯に他のシフトがないことをチェック
4. **キャンセル制約**: `completed` 状態のシフトはキャンセル不可
5. **復元制約**: `canceled` 状態のシフトのみ復元可能

## API / Server Actions

### 生成

#### `generateWeeklyShiftsAction(weekStartDate)`

- 基本スケジュールから週間シフトを一括生成
- 入力: ISO 形式の日付文字列（月曜日）
- 戻り値: `{ created: number, skipped: number, total: number }`

### 一覧

#### `listShiftsAction(filters)`

- シフト一覧を取得
- フィルタ: `{ startDate, endDate, staffId? }`

### 変更操作

#### `assignStaffToShiftAction(shiftId, staffId, reason?)`

- 担当者を変更または割り当て
- 変更理由を記録

#### `cancelShiftAction(shiftId, category, reason)`

- シフトをキャンセル
- キャンセル理由カテゴリと詳細を必須入力

#### `restoreShiftAction(shiftId)`

- キャンセルしたシフトを復元
- ステータスを `scheduled` に戻す

## UI アクションロジック

| ステータス | is_unassigned | 表示ボタン                |
| ---------- | ------------- | ------------------------- |
| scheduled  | true          | [割り当て] [キャンセル]   |
| scheduled  | false         | [担当者変更] [キャンセル] |
| canceled   | -             | [復元]                    |
| completed  | -             | （操作不可）              |

## エラーケース

| コード | 説明               |
| ------ | ------------------ |
| 400    | バリデーション失敗 |
| 403    | 管理者権限なし     |
| 404    | シフトが不存在     |
| 409    | 担当者の時間重複   |

## 関連ファイル

- `src/app/actions/shiftActions.ts`
- `src/backend/services/shiftService.ts`
- `src/backend/repositories/shiftRepository.ts`
- `src/models/shift.ts`
- `src/models/shiftActionSchemas.ts`

## 関連ユースケース

- [UC05: 週間スケジュール管理](../use-cases/UC05-weekly-schedule-management.md)
