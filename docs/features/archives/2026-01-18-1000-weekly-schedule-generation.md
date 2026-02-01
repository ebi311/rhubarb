# 週間スケジュール生成機能 仕様書

## 概要

- フェーズ: MVP フェーズ2 / リアルタイム・マイカレンダーの基盤
- 目的: 基本スケジュール（週次繰り返し）から、指定された週の Shift を自動生成する。
- ゴール:
  - 管理者が特定の週を指定して Shift を一括生成できるようにする。
  - ヘルパーが自身の確定シフトをカレンダーで閲覧できる基盤を整備する。
  - 既存シフトとの重複を防ぎ、安全に生成できるようにする。

## スコープ

### 対象

- 週間スケジュール生成（基本スケジュール → Shift）
  - 開始日を指定して、その週（7日間）のシフトを生成
  - 基本スケジュールの曜日を対応する日付に変換
  - 担当スタッフの割り当て（basic_schedule_staff_assignments の先頭を使用）
- Shift の一覧取得（日付範囲・スタッフ指定）
- ShiftRepository / WeeklyScheduleService / Server Actions
- 単体テスト (Repository, Service)

### 対象外（将来）

- シフトの個別編集・削除 UI
- 生成済みシフトの再生成（上書き・差分更新）
- 未割当シフトの AI マッチング
- プッシュ通知

## 登場人物 / 権限

- **管理者（オフィス管理者ロール）**
  - 週間スケジュール生成が可能
  - シフト一覧の全体表示が可能
- **ヘルパー（スタッフロール）**
  - 自分に割り当てられたシフトのみ閲覧可能（RLS で制御）

## データモデル

### Shift (テーブル `shifts`)

| カラム          | 型                | 説明                                         |
| --------------- | ----------------- | -------------------------------------------- |
| id              | UUID (PK)         | シフト ID                                    |
| client_id       | UUID (FK clients) | 利用者                                       |
| service_type_id | text (FK)         | サービス区分                                 |
| staff_id        | UUID (FK staffs)  | 担当スタッフ（null 可：未割当）              |
| start_time      | timestamptz       | 開始日時（タイムゾーン付き）                 |
| end_time        | timestamptz       | 終了日時（タイムゾーン付き）                 |
| status          | shift_status enum | scheduled / confirmed / completed / canceled |
| is_unassigned   | boolean           | 未割当フラグ                                 |
| created_at      | timestamptz       | 作成日時                                     |
| updated_at      | timestamptz       | 更新日時                                     |

**注意**: `date` カラムは廃止。`start_time` から日付部分を導出する。

### ドメインモデル (Service層以降)

Repository で DB から取得する際に、`start_time`/`end_time` の timestamptz から以下を導出:

- `date`: `start_time` の日付部分
- `time.start`: `start_time` の時刻部分 (`{ hour, minute }`)
- `time.end`: `end_time` の時刻部分 (`{ hour, minute }`)

### 生成ロジック

1. 開始日（週の初日: 月曜日）を指定
2. 基本スケジュール（`deleted_at IS NULL`）を全取得
3. 各基本スケジュールの `day_of_week` を、開始日からのオフセットで日付に変換
   - Mon → 開始日 + 0
   - Tue → 開始日 + 1
   - Wed → 開始日 + 2
   - Thu → 開始日 + 3
   - Fri → 開始日 + 4
   - Sat → 開始日 + 5
   - Sun → 開始日 + 6
4. 既存シフト（同一 client_id, date, start_time, end_time）が存在する場合はスキップ
5. `staff_ids` の先頭を `staff_id` として設定（空の場合は `null` + `is_unassigned = true`）
6. status は `scheduled` で作成

## API / Service 要件

### WeeklyScheduleService

```typescript
class WeeklyScheduleService {
	// 週間シフト生成
	async generateWeeklyShifts(
		userId: string,
		weekStartDate: Date, // 週の開始日（月曜日）
	): Promise<GenerateResult>;

	// シフト一覧取得
	async listShifts(
		userId: string,
		filters: {
			startDate: Date;
			endDate: Date;
			staffId?: string;
		},
	): Promise<ShiftRecord[]>;
}

interface GenerateResult {
	created: number; // 作成されたシフト数
	skipped: number; // 既存のためスキップされた数
	total: number; // 処理対象の基本スケジュール数
}
```

### Server Actions

```typescript
// src/app/actions/weeklySchedules.ts

// 週間シフト生成
generateWeeklyShiftsAction(weekStartDate: string): Promise<ActionResult<GenerateResult>>

// シフト一覧取得（自分のシフト用）
listMyShiftsAction(filters: { startDate: string; endDate: string }): Promise<ActionResult<ShiftRecord[]>>

// シフト一覧取得（管理者用：全体）
listShiftsAction(filters: { startDate: string; endDate: string; staffId?: string }): Promise<ActionResult<ShiftRecord[]>>
```

## バリデーション規則

- `weekStartDate`: 有効な日付であること、月曜日であること
- `startDate` / `endDate`: 有効な日付であること、`startDate <= endDate`
- `staffId`: UUID 形式（オプション）

## エラーハンドリング

| 状況                       | HTTP Status | メッセージ                     |
| -------------------------- | ----------- | ------------------------------ |
| 未認証                     | 401         | Unauthorized                   |
| 権限なし（ヘルパーが生成） | 403         | Forbidden                      |
| 不正な週開始日             | 400         | Week start date must be Monday |
| バリデーションエラー       | 400         | Validation error               |

## RLS 考慮事項

既存の `shifts` テーブルの RLS ポリシー:

- 管理者: 自事業所のシフトを全操作可能
- ヘルパー: 自分が担当のシフトのみ SELECT 可能

シフト生成時は管理者権限が必要なため、Service 側で認可チェックを行う。

## テスト要件

### ShiftRepository テスト

- シフト作成: 正常に INSERT される
- シフト一覧: 日付範囲・スタッフでフィルタされる
- 既存チェック: 同一条件のシフト存在確認

### WeeklyScheduleService テスト

- 正常生成: 基本スケジュールから正しい日付でシフト生成
- 曜日変換: Mon〜Sun が正しいオフセットで変換される
- 重複スキップ: 既存シフトがあればスキップ
- 未割当: staff_ids が空なら is_unassigned = true
- 権限: 管理者のみ生成可能、ヘルパーは 403

## 受入基準

1. 管理者が週の開始日を指定してシフト生成を実行できる
2. 基本スケジュールの曜日が正しい日付に変換される
3. 既に同一シフトが存在する場合はスキップされる
4. 担当スタッフが未設定の場合は is_unassigned = true で作成される
5. ヘルパーは自分のシフトのみ取得できる
6. `pnpm test:ut --run` で全テストが通る
