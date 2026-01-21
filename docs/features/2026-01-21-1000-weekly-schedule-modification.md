# 週間スケジュール変更機能 仕様書

## 概要

- フェーズ: MVP フェーズ2 拡張
- 前提: 週間スケジュール生成・一覧表示機能が実装済み
- 目的: 生成されたシフトに対して、実運用で発生する変更（担当者変更・キャンセルなど）に対応する
- ゴール: ユーザーの意図が明確で、誤操作を防ぐUIで、シフト変更を可能にする

## 背景・課題

### 実運用で発生する変更パターン

1. **担当ヘルパーの変更**
   - 元の担当者が急病・都合悪化 → 別のヘルパーに交代
   - 未割当シフトにヘルパーを割り当て
   - 例: 「山田さんが急に休むので、佐藤さんに変更」

2. **利用者都合でのキャンセル**
   - 利用者の体調不良・入院・予定変更
   - シフトは残すがステータスを canceled に
   - 例: 「田中さんが入院したので、今週の訪問はすべてキャンセル」

3. **完了記録**（将来対応）
   - scheduled → completed へのステータス変更
   - 実施記録として残す

### 従来の CRUD の問題点

- 単純な「編集」ボタンでは、ユーザーが「何をしたいのか」が不明瞭
- すべてのフィールドを編集可能にすると誤操作のリスク
- 利用者変更は想定していないのに、編集フォームで変更できてしまう
- 変更理由や変更履歴が記録されない

### 提案するアプローチ

**ユースケース駆動UI**: 各変更パターンに対して専用のアクション・ダイアログを用意し、ユーザーの意図を明確にする。

## ユースケース詳細

### UC1: 担当ヘルパーの変更

- **トリガー**: シフト行の「担当者変更」ボタン
- **入力**:
  - 新しい担当スタッフ（スタッフピッカー）
  - 変更理由（任意テキスト）
- **処理**:
  - `staff_id` を更新
  - `is_unassigned` を false に設定
  - 変更理由を `notes` または別テーブル（shift_logs）に記録
- **制約**:
  - 新しい担当者は同じ時間帯に他のシフトがないこと（バリデーション）
  - サービス種別に対応した資格を持っていること（任意）
- **成功メッセージ**: 「○○さん → △△さんに変更しました」（○○: 元の担当者名、△△: 新しい担当者名）

### UC2: シフトのキャンセル

- **トリガー**: シフト行の「キャンセル」ボタン
- **入力**:
  - キャンセル理由（必須テキスト）
  - キャンセル理由カテゴリ（選択式: 利用者都合 / スタッフ都合 / その他）
- **処理**:
  - `status` を `canceled` に更新
  - キャンセル理由を記録
- **制約**:
  - completed 状態のシフトはキャンセル不可
- **成功メッセージ**: 「シフトをキャンセルしました」
- **確認ダイアログ**: 「このシフトをキャンセルしますか？」

### UC3: 未割当シフトへの割り当て

- **トリガー**: 未割当シフトの「割り当て」ボタン
- **入力**:
  - 担当スタッフ（スタッフピッカー）
- **処理**:
  - `staff_id` を設定
  - `is_unassigned` を false に設定
- **制約**: UC1 と同様
- **成功メッセージ**: 「未割当 → ○○さんに割り当てました」

## UI 設計

### シフト一覧テーブルの拡張

各シフト行に「アクション」列を追加し、ステータスと状態に応じたボタンを表示する。

| 日付 | 時間        | 利用者   | サービス | 担当者   | ステータス | アクション                |
| ---- | ----------- | -------- | -------- | -------- | ---------- | ------------------------- |
| 1/20 | 10:00-11:00 | 田中太郎 | 身体介護 | 山田花子 | scheduled  | [担当者変更] [キャンセル] |
| 1/20 | 14:00-15:00 | 鈴木次郎 | 生活援助 | 未割当   | scheduled  | [割り当て] [キャンセル]   |
| 1/21 | 09:00-10:00 | 佐藤三郎 | 身体介護 | 田中一郎 | scheduled  | [担当者変更] [キャンセル] |
| 1/21 | 11:00-12:00 | 高橋四郎 | 生活援助 | 山田花子 | canceled   | -                         |

### ボタン表示ロジック

| ステータス | is_unassigned | 表示ボタン                |
| ---------- | ------------- | ------------------------- |
| scheduled  | true          | [割り当て] [キャンセル]   |
| scheduled  | false         | [担当者変更] [キャンセル] |
| canceled   | -             | （操作不可）              |
| completed  | -             | （操作不可）              |

### ダイアログ仕様

#### 1. 担当者変更ダイアログ

- **タイトル**: 「担当者を変更」
- **内容**:
  - 現在の情報（読み取り専用）
    - 日付・時間
    - 利用者名
    - サービス区分
    - 現在の担当者（または「未割当」）
  - 新しい担当者（スタッフピッカー、必須）
  - 変更理由（テキストエリア、任意）
- **ボタン**: [キャンセル] [変更する]
- **バリデーション**:
  - 新しい担当者が選択されていること
  - 選択したスタッフが同時間帯に他のシフトがないこと（警告表示）

#### 2. キャンセルダイアログ

- **タイトル**: 「シフトをキャンセル」
- **内容**:
  - シフト情報（読み取り専用）
  - キャンセル理由カテゴリ（ラジオボタン、必須）
    - ○ 利用者都合
    - ○ スタッフ都合
    - ○ その他
  - キャンセル理由詳細（テキストエリア、必須）
- **ボタン**: [戻る] [キャンセルする]
- **確認**: 「このシフトをキャンセルしますか？この操作は取り消せません。」

#### 3. 割り当てダイアログ

- **タイトル**: 「担当者を割り当て」
- **内容**: 担当者変更ダイアログと同様（現在の担当者が「未割当」）

### モバイル対応

- デスクトップ: 行ごとにアクションボタンを表示
- モバイル: カード形式で、カードをタップしてアクションメニューを表示（ドロップダウンまたはモーダル）

## データモデル拡張

### Shift テーブルへの追加（任意）

| カラム          | 型          | 説明                     |
| --------------- | ----------- | ------------------------ |
| notes           | text        | 変更理由・備考（簡易版） |
| canceled_at     | timestamptz | キャンセル日時           |
| canceled_reason | text        | キャンセル理由           |

### 変更履歴テーブル（将来対応）

```sql
CREATE TABLE shift_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  action_type text NOT NULL, -- 'staff_changed' / 'canceled' / 'created'
  changed_by UUID NOT NULL REFERENCES staffs(id),
  old_values jsonb,
  new_values jsonb,
  reason text,
  created_at timestamptz DEFAULT now()
);
```

## API / Service 拡張

### ShiftService

```typescript
class ShiftService {
	// 担当者変更
	async changeStaffAssignment(
		userId: string,
		shiftId: string,
		newStaffId: string,
		reason?: string,
	): Promise<void>;

	// シフトキャンセル
	async cancelShift(
		userId: string,
		shiftId: string,
		reason: string,
		category: 'client' | 'staff' | 'other',
	): Promise<void>;

	// バリデーション: スタッフの時間重複チェック
	async validateStaffAvailability(
		staffId: string,
		startTime: Date,
		endTime: Date,
		excludeShiftId?: string,
	): Promise<{ available: boolean; conflictingShifts?: ShiftRecord[] }>;
}
```

### Server Actions

```typescript
// src/app/actions/shifts.ts

// 担当者変更
changeShiftStaffAction(
  shiftId: string,
  newStaffId: string,
  reason?: string
): Promise<ActionResult<void>>

// シフトキャンセル
cancelShiftAction(
  shiftId: string,
  reason: string,
  category: 'client' | 'staff' | 'other'
): Promise<ActionResult<void>>

// スタッフの時間重複チェック
validateStaffAvailabilityAction(
  staffId: string,
  startTime: string,
  endTime: string,
  excludeShiftId?: string
): Promise<ActionResult<{ available: boolean; conflictingShifts?: ShiftRecord[] }>>
```

## バリデーション規則

### 担当者変更

- 新しい担当者が選択されていること
- 新しい担当者が同時間帯に他のシフトを持っていないこと（警告のみ、強制ではない）
- シフトが canceled / completed でないこと

### キャンセル

- キャンセル理由が入力されていること
- シフトが completed でないこと

## エラーハンドリング

| 状況                         | HTTP Status | メッセージ                  |
| ---------------------------- | ----------- | --------------------------- |
| シフトが存在しない           | 404         | Shift not found             |
| 権限なし                     | 403         | Forbidden                   |
| 不正なステータス遷移         | 400         | Invalid status transition   |
| 時間重複（エラー扱いの場合） | 409         | Staff has conflicting shift |

## セキュリティ・権限

- 管理者のみシフト変更可能
- RLS: 管理者は自事業所のシフトのみ変更可能
- ヘルパーは閲覧のみ（変更不可）

## UI/UX フロー例

### 担当者変更のフロー

1. ユーザーが「担当者変更」ボタンをクリック
2. ダイアログが開く
3. スタッフピッカーで新しい担当者を選択
4. （オプション）変更理由を入力
5. 「変更する」ボタンをクリック
6. バックエンドで時間重複チェック
7. 重複がある場合は警告表示「○○さんは XX:XX-XX:XX に別のシフトがあります。それでも変更しますか？」
8. 確認後、変更を実行
9. トースト表示「山田花子さん → 佐藤太郎さんに変更しました」
10. 一覧がリフレッシュされる

## コンポーネント構成

```
/admin/weekly-schedules/
└── _components/
    ├── ShiftTable/
    │   ├── ShiftTable.tsx                  # アクション列を追加
    │   └── ShiftActionButtons.tsx          # NEW: アクションボタン
    ├── ChangeStaffDialog/                  # NEW: 担当者変更ダイアログ
    │   ├── ChangeStaffDialog.tsx
    │   ├── ChangeStaffDialog.test.tsx
    │   ├── ChangeStaffDialog.stories.tsx
    │   └── index.ts
    ├── CancelShiftDialog/                  # NEW: キャンセルダイアログ
    │   ├── CancelShiftDialog.tsx
    │   ├── CancelShiftDialog.test.tsx
    │   ├── CancelShiftDialog.stories.tsx
    │   └── index.ts
    └── StaffConflictWarning/               # NEW: 時間重複警告
        ├── StaffConflictWarning.tsx
        ├── StaffConflictWarning.test.tsx
        ├── StaffConflictWarning.stories.tsx
        └── index.ts
```

## 実装順序

1. **バックエンド**
   - ShiftRepository の更新メソッド追加
   - ShiftService の各メソッド実装
   - Server Actions 実装
   - テスト作成

2. **フロントエンド - ダイアログ**
   - ChangeStaffDialog 実装（スタッフピッカー統合）
   - CancelShiftDialog 実装
   - StaffConflictWarning 実装

3. **フロントエンド - 統合**
   - ShiftActionButtons コンポーネント実装
   - ShiftTable にアクション列追加
   - 各ダイアログとの接続
   - リフレッシュロジック実装

4. **テスト・検証**
   - E2E テスト
   - Storybook ストーリー作成
   - ユーザビリティテスト

## テスト要件

### ShiftService テスト

- 担当者変更: 正常に更新される、理由が記録される
- キャンセル: ステータスが canceled になる、理由が記録される
- バリデーション: 不正なステータス遷移は拒否される
- 時間重複チェック: 重複がある場合は検出される

### コンポーネントテスト

- ダイアログの開閉
- フォーム入力とバリデーション
- アクション実行後のトースト表示
- エラーハンドリング

## 受入基準

- [ ] 管理者がシフトの担当者を変更できる
- [ ] 変更時に時間重複がチェックされ、警告が表示される
- [ ] 管理者がシフトをキャンセルでき、理由が記録される
- [ ] 未割当シフトに担当者を割り当てられる
- [ ] 各アクションのボタンが適切なステータスで表示される
- [ ] キャンセル・完了したシフトは変更不可
- [ ] トースト通知で結果が表示される（「○○さん → △△さんに変更しました」形式）
- [ ] テストと Storybook が通る

## 将来の拡張

- 時間の変更（start_time / end_time の編集）
- 一括操作（複数シフトの同時キャンセル・担当者変更）
- 変更履歴の表示（shift_logs）
- ヘルパーからのシフト変更リクエスト（承認フロー）
- 自動マッチング（未割当シフトに適切なスタッフを提案）
- 通知機能（担当者変更時にヘルパーに通知）

## UX のポイント

1. **意図の明確化**: 「編集」ではなく「担当者変更」「キャンセル」など、具体的なアクション名
2. **誤操作防止**: 確認ダイアログと明確なメッセージ
3. **コンテキスト表示**: 変更対象のシフト情報を常に表示
4. **段階的開示**: 基本操作のみを表示し、詳細は必要に応じて表示
5. **即座のフィードバック**: トースト通知で結果を即座に伝える
6. **バリデーションの透明性**: 時間重複などの制約を事前に可視化
