# 週間スケジュール画面 仕様書

## 背景

- 週間スケジュール生成機能（バックエンド）は実装済み。
- 管理者が基本スケジュールから週間シフトを生成し、作成されたシフトを閲覧できる UI が必要。
- MVP では最小限の機能（生成 + 閲覧）に絞り、編集・削除は将来対応とする。

## URL / 画面

- `/admin/weekly-schedules?week=YYYY-MM-DD` - 週間スケジュール一覧・生成画面
  - `week`: 週の開始日（月曜日）を ISO 形式で指定
  - 例: `/admin/weekly-schedules?week=2026-01-19`
  - 省略時: 今週の月曜日にリダイレクト

## ユースケース

1. **週間シフト生成**: 管理者が週の開始日（月曜日）を選択し、基本スケジュールから一括でシフトを生成する。
2. **シフト一覧閲覧**: 管理者が指定した週のシフト一覧を確認する。
3. **URL 共有**: 特定の週の URL を共有して、同じ週のシフトを直接表示できる。
4. **空状態確認**: シフトがない週では「シフトがありません」メッセージと生成ボタンを表示。

## 機能要件

### 週選択

- カレンダー or 日付ピッカーで週を選択（月曜日のみ選択可能）。
- デフォルトは今週（現在日付を含む週の月曜日）。
- 前週・次週ボタンで移動可能。
- **週を変更すると URL のクエリパラメータ `week` を更新**（`router.push` または `router.replace`）。
- URL 変更により Server Component が再レンダリングされ、データが更新される。

### シフト生成

- 「シフトを生成」ボタンで `generateWeeklyShiftsAction(weekStartDate)` を呼び出し。
- 生成結果をトーストで表示:
  - 成功: 「○件のシフトを生成しました（スキップ: △件）」
  - エラー: エラーメッセージを表示
- 生成後は一覧を自動リフレッシュ。

### シフト一覧

- 週選択に応じて `listShiftsAction({ startDate, endDate })` で取得。
- テーブル表示:
  | 列 | 内容 |
  |---|---|
  | 日付 | YYYY/MM/DD (曜日) |
  | 時間 | HH:MM - HH:MM |
  | 利用者 | 利用者名（client_id から取得） |
  | サービス区分 | サービス区分名 |
  | 担当者 | スタッフ名（未割当の場合は「未割当」バッジ） |
  | ステータス | scheduled / confirmed / completed / canceled |

- ソート: 日付 → 開始時刻 の昇順（固定）。
- フィルタ（任意）: スタッフ名での絞り込み。

### 空状態

- 「この週のシフトはまだありません」メッセージ。
- 「基本スケジュールから生成」ボタンを表示。

### ローディング・エラー

- 一覧取得中はスピナー表示。
- エラー時はインラインでエラーメッセージ表示。

## 権限

- 管理者のみアクセス可能。
- ヘルパーは `/admin` 配下にアクセス不可（既存のミドルウェアで制御済み）。

## データ/API

- 生成: `generateWeeklyShiftsAction(weekStartDate: string)`
  - 入力: ISO 形式の日付文字列（月曜日）
  - 出力: `{ created: number, skipped: number, total: number }`
- 一覧: `listShiftsAction({ startDate: string, endDate: string, staffId?: string })`
  - 出力: `ShiftRecord[]`

### 追加で必要なデータ

- 利用者名・スタッフ名を表示するため、以下のいずれかが必要:
  1. `listShiftsAction` の戻り値を拡張して関連情報を含める
  2. 別途 `clients` / `staffs` を取得して結合

→ **方針**: 一覧取得時に join してリッチなデータを返す新しい Action を作成するか、フロントで結合する。MVP では後者（フロントで結合）を採用し、パフォーマンス問題が出たら前者に移行。

## UI/UX

- daisyUI + Tailwind を使用。
- レスポンシブ対応: モバイルではカード形式、デスクトップではテーブル形式。
- 週選択は画面上部に固定。
- 生成ボタンは週選択の横に配置。

## コンポーネント構成

```
/admin/weekly-schedules/
├── page.tsx                      # ページコンポーネント
└── _components/
    ├── WeeklySchedulePage/
    │   ├── WeeklySchedulePage.tsx
    │   ├── WeeklySchedulePage.test.tsx
    │   ├── WeeklySchedulePage.stories.tsx
    │   └── index.ts
    ├── WeekSelector/
    │   ├── WeekSelector.tsx        # 週選択コンポーネント
    │   ├── WeekSelector.test.tsx
    │   ├── WeekSelector.stories.tsx
    │   └── index.ts
    ├── ShiftTable/
    │   ├── ShiftTable.tsx          # シフト一覧テーブル
    │   ├── ShiftTable.test.tsx
    │   ├── ShiftTable.stories.tsx
    │   └── index.ts
    └── GenerateButton/
        ├── GenerateButton.tsx      # シフト生成ボタン
        ├── GenerateButton.test.tsx
        ├── GenerateButton.stories.tsx
        └── index.ts
```

## ストーリー/状態

1. **通常表示**: シフトがある状態
2. **空状態**: シフトがない状態
3. **ローディング**: 一覧取得中
4. **生成中**: シフト生成処理中
5. **エラー**: API エラー発生時

## 受入基準

- [ ] 管理者が `/admin/weekly-schedules?week=2026-01-19` にアクセスできる。
- [ ] `week` パラメータ省略時は今週の月曜日にリダイレクトされる。
- [ ] `week` パラメータが不正な場合（月曜日以外、無効な日付）はエラー表示またはリダイレクト。
- [ ] 週を選択すると URL が変更され、その週のシフト一覧が表示される。
- [ ] 「シフトを生成」ボタンで基本スケジュールからシフトが生成される。
- [ ] 生成結果がトーストで表示される。
- [ ] シフトがない週では空状態が表示される。
- [ ] ローディング・エラー表示がある。
- [ ] テストと Storybook が通り、`pnpm test:ut --run` が成功する。

## 将来の拡張

- シフトの個別編集・削除
- ドラッグ&ドロップでの時間変更
- カレンダービュー（週間・月間）
- 未割当シフトのスタッフ割り当て機能
- ヘルパー向けマイカレンダー画面
