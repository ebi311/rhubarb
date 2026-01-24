# 週間スケジュール変更機能 タスク分解

## 概要

週間スケジュール一覧に、ユースケース駆動のシフト変更機能を追加する。
担当者変更・キャンセル・未割当への割り当てを実装し、ユーザーの意図が明確なUIを提供する。

参照: [週間スケジュール変更機能 仕様書](/workspaces/app/docs/features/2026-01-21-1000-weekly-schedule-modification.md)

## フェーズ1: バックエンド基盤（Repository & Service）

### 目標

シフト変更に必要な Repository と Service のメソッドを実装し、単体テストで動作を保証する。

### タスク

- [x] **ShiftRepository の拡張**
  - [x] `updateStaffAssignment(shiftId, staffId, notes)` メソッド追加
  - [x] `cancelShift(shiftId, reason, category, canceledAt)` メソッド追加
  - [x] `findById(shiftId)` メソッド追加（詳細取得用）
  - [x] `findConflictingShifts(staffId, startTime, endTime, excludeShiftId?)` メソッド追加
  - [x] 単体テスト作成（各メソッドの正常系・異常系）

- [x] **ShiftService の実装**
  - [x] `changeStaffAssignment(userId, shiftId, newStaffId, reason?)` メソッド実装
    - [x] 認可チェック（管理者のみ）
    - [x] シフトの存在確認
    - [x] ステータス検証（canceled/completed は変更不可）
    - [x] 元の担当者名を取得
    - [x] Repository 呼び出し
  - [x] `cancelShift(userId, shiftId, reason, category)` メソッド実装
    - [x] 認可チェック（管理者のみ）
    - [x] シフトの存在確認
    - [x] ステータス検証（completed は変更不可）
    - [x] Repository 呼び出し
  - [x] `validateStaffAvailability(staffId, startTime, endTime, excludeShiftId?)` メソッド実装
    - [x] Repository で重複シフトを検索
    - [x] 結果を返却
  - [x] 単体テスト作成（全メソッド）
    - [x] 正常系
    - [x] 権限エラー
    - [x] ステータスエラー
    - [x] 存在しないシフト

### レビュー & コミット

✅ バックエンドロジックが完成し、すべてのテストが通ることを確認してコミット。

---

## フェーズ2: Server Actions

### 目標

Service を呼び出す Server Actions を実装し、ActionResult パターンでエラーハンドリングを行う。

### タスク

- [x] **shifts.ts Action の作成**
  - [x] `changeShiftStaffAction(shiftId, newStaffId, reason?)` 実装
    - [x] 入力スキーマ定義（Zod）
    - [x] 認証チェック
    - [x] Service 呼び出し
    - [x] ServiceError → ActionResult 変換
    - [x] 元の担当者名と新担当者名を返却（メッセージ用）
  - [x] `cancelShiftAction(shiftId, reason, category)` 実装
    - [x] 入力スキーマ定義（Zod）
    - [x] 認証チェック
    - [x] Service 呼び出し
    - [x] ServiceError → ActionResult 変換
  - [x] `validateStaffAvailabilityAction(staffId, startTime, endTime, excludeShiftId?)` 実装
    - [x] 入力スキーマ定義（Zod）
    - [x] 認証チェック
    - [x] Service 呼び出し
    - [x] 結果を ActionResult で返却
  - [x] 単体テスト作成（全 Action）
    - [x] 正常系
    - [x] バリデーションエラー
    - [x] 未認証エラー

### レビュー & コミット

✅ Server Actions が完成し、すべてのテストが通ることを確認してコミット。

---

## フェーズ3: ダイアログコンポーネント（担当者変更）

### 目標

担当者変更ダイアログとスタッフの時間重複警告コンポーネントを実装する。

### タスク

- [x] **StaffConflictWarning コンポーネント**
  - [x] コンポーネント本体作成
    - [x] 重複シフト一覧を表示
    - [x] 警告メッセージ表示
  - [x] テスト作成
  - [x] Storybook ストーリー作成
    - [x] 通常状態
    - [x] 重複あり状態
  - [x] index.ts でエクスポート

- [x] **ChangeStaffDialog コンポーネント**
  - [x] コンポーネント本体作成
    - [x] シフト情報表示（読み取り専用）
    - [x] スタッフピッカー統合
    - [x] 変更理由入力（テキストエリア、任意）
    - [x] 時間重複チェック（`validateStaffAvailabilityAction` 呼び出し）
    - [x] StaffConflictWarning 表示
    - [x] `changeShiftStaffAction` 呼び出し
    - [x] トースト通知（「〇〇さん → △△さんに変更しました」）
  - [x] テスト作成
    - [x] ダイアログの開閉
    - [x] スタッフ選択とバリデーション
    - [x] 時間重複チェック
    - [x] アクション実行
  - [x] Storybook ストーリー作成
    - [x] 通常表示
    - [x] 時間重複警告あり
    - [x] ローディング中
    - [x] エラー表示
  - [x] index.ts でエクスポート

### レビュー & コミット

✅ 担当者変更ダイアログが完成し、すべてのテストと Storybook が動作することを確認してコミット。

---

## フェーズ4: ダイアログコンポーネント（キャンセル・割り当て）

### 目標

キャンセルダイアログを実装する（割り当てダイアログは担当者変更ダイアログと共通化）。

### タスク

- [x] **CancelShiftDialog コンポーネント**
  - [x] コンポーネント本体作成
    - [x] シフト情報表示（読み取り専用）
    - [x] キャンセル理由カテゴリ選択（ラジオボタン）
    - [x] キャンセル理由詳細入力（テキストエリア、必須）
    - [x] 確認ダイアログ
    - [x] `cancelShiftAction` 呼び出し
    - [x] トースト通知（「シフトをキャンセルしました」）
  - [x] テスト作成
    - [x] ダイアログの開閉
    - [x] カテゴリ選択とバリデーション
    - [x] 理由入力とバリデーション
    - [x] アクション実行
  - [x] Storybook ストーリー作成
    - [x] 通常表示
    - [x] バリデーションエラー
    - [x] ローディング中
  - [x] index.ts でエクスポート

### レビュー & コミット

✅ キャンセルダイアログが完成し、すべてのテストと Storybook が動作することを確認してコミット。

---

## フェーズ5: 復元機能（キャンセル取り消し）

### 目標

キャンセル済みシフトを復元する機能を実装する。Repository、Service、Action、Dialog の各レイヤーを追加する。

### タスク

- [x] **ShiftRepository の拡張**
  - [x] `restoreShift(shiftId)` メソッド追加
    - [x] status を `scheduled` に更新
    - [x] canceled_at, cancel_reason, cancel_category を null に設定
  - [x] 単体テスト作成（正常系・異常系）

- [x] **ShiftService の拡張**
  - [x] `restoreShift(userId, shiftId)` メソッド実装
    - [x] 認可チェック（管理者のみ）
    - [x] シフトの存在確認
    - [x] ステータス検証（canceled のみ復元可能）
    - [x] Repository 呼び出し
  - [x] 単体テスト作成
    - [x] 正常系
    - [x] 権限エラー
    - [x] ステータスエラー（canceled 以外は拒否）
    - [x] 存在しないシフト

- [x] **Server Action の追加**
  - [x] `restoreShiftAction(shiftId)` 実装
    - [x] 入力スキーマ定義（Zod）
    - [x] 認証チェック
    - [x] Service 呼び出し
    - [x] ServiceError → ActionResult 変換
  - [x] 単体テスト作成
    - [x] 正常系
    - [x] バリデーションエラー
    - [x] 未認証エラー

- [x] **RestoreShiftDialog コンポーネント**
  - [x] コンポーネント本体作成
    - [x] シフト情報表示（読み取り専用）
    - [x] キャンセル理由表示（参考情報）
    - [x] 時間重複チェック（`validateStaffAvailabilityAction` 呼び出し）
    - [x] StaffConflictWarning 表示（該当時）
    - [x] 確認ダイアログ（window.confirm）
    - [x] `restoreShiftAction` 呼び出し
    - [x] トースト通知（「シフトを復元しました」）
  - [x] テスト作成
    - [x] ダイアログの開閉
    - [x] キャンセル理由の表示
    - [x] 時間重複警告の表示
    - [x] アクション実行
  - [x] Storybook ストーリー作成
    - [x] 通常表示
    - [x] 時間重複警告あり
    - [x] ローディング中
  - [x] index.ts でエクスポート

### レビュー & コミット

✅ 復元機能が完成し、すべてのテストと Storybook が動作することを確認してコミット。

---

## フェーズ6: ShiftTable 統合とアクションボタン

### 目標

ShiftTable にアクション列を追加し、各ダイアログを統合する。

### タスク

- [x] **ShiftActionButtons コンポーネント**
  - [x] コンポーネント本体作成
    - [x] ステータスと is_unassigned に応じたボタン表示ロジック
    - [x] 担当者変更ボタン（scheduled かつ is_unassigned=false）
    - [x] 割り当てボタン（scheduled かつ is_unassigned=true）
    - [x] キャンセルボタン（scheduled のみ）
    - [x] 復元ボタン（canceled のみ）
    - [x] 各ボタンクリックでダイアログを開く
  - [x] テスト更新（復元ボタンのテスト追加）
  - [x] Storybook ストーリー更新（canceled ステータスのパターン追加）
  - [x] index.ts でエクスポート

- [x] **ShiftTable の拡張**
  - [x] アクション列を追加
  - [x] ShiftActionButtons を配置
  - [x] ダイアログの状態管理（どのダイアログが開いているか）
  - [x] ChangeStaffDialog を配置
  - [x] CancelShiftDialog を配置
  - [x] RestoreShiftDialog を配置
  - [x] アクション完了後のリフレッシュ処理
  - [x] テスト更新（復元ダイアログのテスト追加）
  - [x] Storybook ストーリー更新（復元フロー追加）

### レビュー & コミット

ShiftTable にアクション機能（復元含む）が統合され、すべてのテストと Storybook が動作することを確認してコミット。

---

## フェーズ7: E2E テストと最終調整

### 目標

実際の画面でユーザーフローをテストし、最終調整を行う。

### タスク

- [x] **手動テスト**
  - [x] 担当者変更フロー
    - [x] scheduled シフトの担当者を変更
    - [x] 時間重複がある場合の警告表示
    - [x] トーストメッセージの確認（「〇〇さん → △△さんに変更しました」）
  - [x] 未割当シフトへの割り当てフロー
    - [x] 未割当シフトに担当者を割り当て
    - [x] トーストメッセージの確認（「未割当 → 〇〇さんに割り当てました」）
  - [x] キャンセルフロー
    - [x] scheduled シフトをキャンセル
    - [x] 理由入力の必須チェック
    - [x] 確認ダイアログの表示
    - [x] トーストメッセージの確認
  - [x] 復元フロー
    - [x] canceled シフトを復元
    - [x] キャンセル理由の表示確認
    - [x] 時間重複がある場合の警告表示
    - [x] 確認ダイアログの表示
    - [x] トーストメッセージの確認（「シフトを復元しました」）
    - [x] 復元後のステータスが scheduled になっていること
  - [x] エッジケース
    - [x] canceled シフトは復元ボタンのみ表示されること
    - [x] completed シフトはボタンが表示されないこと

- [ ] **UI/UX 調整**
  - [x] レスポンシブ対応の確認（モバイル・デスクトップ）
  - [x] ローディング状態の確認
  - [x] エラーメッセージの確認
  - [x] アクセシビリティチェック（キーボード操作）

- [x] **ドキュメント更新**
  - [x] README に機能説明を追加（必要に応じて）
  - [x] 受入基準の最終確認

### レビュー & コミット

すべてのテストが通り、ユーザーフローが正常に動作することを確認して最終コミット。

---

## 完了条件

以下がすべて満たされていること：

- [x] `pnpm test:ut --run` がすべて通る
- [x] `pnpm storybook` で全コンポーネントが正常に表示される
- [x] 管理者がシフトの担当者を変更できる
- [x] 変更時に時間重複がチェックされ、警告が表示される
- [x] 管理者がシフトをキャンセルでき、理由が記録される
- [x] 未割当シフトに担当者を割り当てられる
- [x] 管理者がキャンセル済みシフトを復元できる
- [x] 復元時に時間重複がチェックされ、警告が表示される
- [x] 各アクションのボタンが適切なステータスで表示される
- [x] 完了したシフトは変更不可
- [x] トースト通知で結果が表示される（「〇〇さん → △△さんに変更しました」形式）
- [x] レスポンシブ対応がされている
- [x] すべてのコードがコミットされている

## 備考

- TDD アプローチで実装すること（テストを先に書く）
- 各フェーズでコミットし、レビューのタイミングを設ける
- `as any` は原則禁止（UT で型が重要でない場合のみ例外）
- Arrow Function を使用（クラスメソッド除く）
- コミットメッセージは日本語で、プレフィックスを付ける（feat, fix, test, refactor など）
