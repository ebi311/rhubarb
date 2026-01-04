# 基本スケジュール作成UI 実装タスク

## 背景

- 仕様: [基本スケジュール CRUD 仕様書](../features/2025-12-18-1030-basic-schedule.md)
- デフォルト担当者選択 UI の仕様: [基本スケジュール向けスタッフ選択ダイアログ 仕様書](../features/2026-01-03-0900-basic-schedule-staff-selector-dialog.md)
- 登録済みスタッフから許可済みのみをフィルタして選択できる `StaffPickerDialog` が実装済み。これを基本スケジュール作成フォームへ組み込み、`createBasicScheduleAction` へ渡す。

## 要件

1. `/admin/basic-schedules` に基本スケジュール作成専用ページを追加し、必要なマスタ（契約中利用者・サービス区分・スタッフ・ClientStaffAssignment）をサーバーコンポーネントで取得する。
2. クライアント側フォームで `react-hook-form` + `zod` により入力バリデーションを行い、`createBasicScheduleAction` を呼び出す。
3. デフォルト担当者フィールドは `StaffPickerDialog` をモーダルで起動し、利用者×サービス区分のホワイトリストでフィルタしたスタッフのみ表示する。未選択クリアも可能にする。
4. 送信後はトーストで結果を通知し、成功時はフォームを初期化する。Router の刷新や一覧表示は後続タスクで対応する。
5. UI コンポーネント（フォーム本体）には UT と Storybook を用意する。ページ全体は別タスクでリファクタリング予定のため、今回は単一ファイル構成で良い。

## タスク分解

| ID  | タイトル                           | 実装ステップ                                                                                                                                                                                       | 成果物 / 受入条件                                            |
| --- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| T1  | 許可リスト取得アクションの実装     | 1) `listClientStaffAssignmentsAction` を追加<br />2) Supabase RLS 越しに `client_staff_assignments` を取得し、管理者のみ利用可にする<br />3) Vitest で認可/データ整形のテストを作成                | - Action が認証/権限/正常系テストを持つ                      |
| T2  | ページコンテナの作成               | 1) `/admin/basic-schedules/page.tsx` を追加<br />2) Service Users/Service Types/Staffs/Assignments を並列取得<br />3) エラーは console.warn で記録しつつ空配列フォールバック                       | - ページでフォームコンポーネントに必要データを渡せる         |
| T3  | 基本スケジュール作成フォームの実装 | 1) `BasicScheduleForm` コンポーネントを `use client` で作成<br />2) 入力項目（利用者/サービス区分/曜日/時間/備考/担当者）と送信ロジックを実装<br />3) `StaffPickerDialog` を統合し、ステートを管理 | - フォームUIが要件どおりに動作し、Actionに変換した値を渡せる |
| T4  | UT / Storybook                     | 1) `BasicScheduleForm.test.tsx` で必須項目検証と Action 呼び出しをモックで確認<br />2) `BasicScheduleForm.stories.tsx` で初期/担当者選択済み/スタッフ不在状態を用意                                | - テスト/Storybook が追加され `pnpm test:ut --run` が通る    |
| T5  | リグレッション確認・記録           | 1) `pnpm typecheck` & `pnpm test:ut --run src/app/admin/basic-schedules/_components/BasicScheduleForm` を実行<br />2) 手動でダイアログ起動を確認し、docs/task にログを追記                         | - ログを追記し、確認済みであることを明記                     |

## 備考

- 一覧表示や既存スケジュールの編集機能は別タスクで実装予定。
- ページの責務分割（フォーム/ヘッダー/紹介コピーなど）は後続のリファクタで対応する。

## 作業ログ

- 2026-01-04 13:15: `/admin/basic-schedules` フォーム実装に合わせて `pnpm typecheck` と `pnpm test:ut --run` を実行し、StaffPickerDialog 連携を手動確認。
