# Task: StaffPickerDialog implementation

## 背景

- 仕様: [基本スケジュール向けスタッフ選択ダイアログ 仕様書](../features/2026-01-03-0900-basic-schedule-staff-selector-dialog.md)
- 基本スケジュールフォームで許可スタッフだけをリスト化し、検索/フィルタの効いた UI で選択したい。

## 要件

1. `StaffPickerDialog` コンポーネントを新設し、モーダル内でスタッフ一覧の検索・フィルタ・選択を提供する。
2. `daisyUI modal` ベースで実装し、既存フォームから呼び出して `onSelect`, `onClear`, `onClose` を扱えるようにする。
3. Vitest + Testing Library で単体テストを追加。
4. Storybook で 3 パターン（Default/Empty/Selected）を用意。

## 実装タスク

| ID  | タイトル                     | ステップ                                                                                                                                                            | 成果物           |
| --- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| T1  | コンポーネント雛形           | 1) ディレクトリ `src/app/admin/basic-schedules/_components/StaffPickerDialog` 作成<br />2) `StaffPickerDialog.tsx` に Props 型とモーダルレイアウト枠を実装          | UI skeleton      |
| T2  | 検索・フィルタ・テーブル実装 | 1) キーワード/役割/サービス区分の state を追加<br />2) `useMemo` でフィルタリング、ハイライト処理<br />3) 行クリック/ラジオ操作で `onSelect` 呼出                   | 機能完成         |
| T3  | Storybook & UT               | 1) `StaffPickerDialog.test.tsx` 作成（フィルタ・選択・clear）<br />2) `StaffPickerDialog.stories.tsx` に Default/Empty/WithSelected<br />3) `index.ts` エクスポート | テスト/Story     |
| T4  | 既存フォームへの統合         | 1) 基本スケジュールフォーム（対象ファイル TBD）で新ダイアログを利用<br />2) `onSelect` で `staff_id` をセット、`onClear` で null<br />3) CRUD フローのテスト更新    | フォーム連携完成 |
| T5  | リグレッション確認           | 1) `pnpm test:ut --run src/app/admin/basic-schedules/...`<br />2) Storybook で UI 目視                                                                              | 動作確認ログ     |

## 受入基準

- 基本スケジュール UI で担当者選択がダイアログ経由になり、許可スタッフのみが表示される。
- 検索/フィルタが機能し、選択/クリアでフォーム値が更新される。
- 追加したテストと Storybook がパスし、docs/task に作業ログを記録。
