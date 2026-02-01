# 基本スケジュール編集・削除機能 仕様

## 背景

- 基本スケジュールの新規登録と一覧表示は実装済み。
- 登録済みのスケジュール内容の変更（編集）および削除機能が必要。
- 管理者が誤って登録した内容を修正したり、不要になったスケジュールを削除できることを目的とする。

## URL / 画面

- 編集画面: `/admin/basic-schedules/[id]/edit`

## ユースケース

1. **編集**
   - 管理者が一覧 (`/admin/basic-schedules`) の任意の行をクリックする。
   - 編集画面に遷移し、現在の登録内容がフォームに入力された状態で表示される。
   - 利用者フィールドは変更不可となっており、その他の内容（曜日、時間、担当者など）を修正する。
   - 「更新する」ボタンをクリックする。
   - 更新が成功すると、トースト通知が表示され、一覧画面へリダイレクトされる。

2. **削除**
   - 編集画面の下部にある「削除する」ボタンをクリックする。
   - 確認ダイアログが表示される。
   - 「削除」を実行すると、論理削除され、一覧画面へリダイレクトされる。

## 機能要件

### 1. 編集画面表示

- **データ取得**:
  - URLパラメータの `id` を基に基本スケジュールを取得する。
  - 存在しないIDの場合は `404 Not Found` を表示する。
- **初期表示**:
  - 既存の `BasicScheduleForm` コンポーネントを使用。
  - 取得したデータをフォームの初期値 (`defaultValues`) として設定する。
  - 入力項目の仕様は新規登録時と同じだが、**利用者は変更不可（disabledまたはreadonly）**とする。利用者を基準にスケジュールが管理されるためである。

### 2. 更新機能

- **アクション**:
  - `updateBasicScheduleAction(id, input)` を使用する。
  - Action内部でバリデーションと `BasicScheduleService.update` を実行。
- **バリデーション**:
  - 新規登録時と同等のバリデーションルール（Zodスキーマ）を適用。
  - 整合性チェック（終了時刻が開始時刻より後など）。

### 3. 削除機能

- **UI配置**:
  - フォーム最下部（またはヘッダー右側）に「削除」ボタンを配置。
  - 誤操作防止のため、危険色（赤など）を使用し、クリック時に確認ダイアログ（ブラウザ標準 `confirm` またはモーダル）を表示する。
- **アクション**:
  - `deleteBasicScheduleAction(id)` を使用する。
  - 物理削除ではなく、`deleted_at` カラムを更新する論理削除（Soft Delete）。

## 技術的実現方針

### フロントエンド

- **共通コンポーネント化**:
  - `admin/basic-schedules/_components/BasicScheduleForm` を改修。
  - `mode` プロップス ('create' | 'edit') や `onSubmit` ハンドラを受け取れるようにし、新規・編集の両方で使えるようにする。
  - 編集モード時は利用者選択フィールドを無効化する。
  - 現在 `createBasicScheduleAction` がハードコードされている部分を分離・抽象化する。

- **一覧コンポーネント**:
  - `admin/basic-schedules/_components/BasicScheduleTable` を改修。
  - 行クリックで編集画面へ遷移するようにイベントハンドラを追加または `Link` コンポーネント化する。

- **ページコンポーネント**:
  - `admin/basic-schedules/[id]/edit/page.tsx`
  - Server Component として実装。
  - `params.id` を取得し、`BasicScheduleService` 経由でデータをフェッチ。
  - データが見つからない場合は `notFound()` を返す。
  - データを `BasicScheduleForm` 用の初期値オブジェクトに変換して渡す。

### バックエンド

- **Server Actions**:
  - `src/app/actions/basicSchedules.ts` に実装済みの `updateBasicScheduleAction` と `deleteBasicScheduleAction` を利用する。
- **Repository**:
  - `BasicScheduleRepository` の `update`, `softDelete`, `findById` は実装済み。

## データフロー

1. **表示時**:
   Request -> Page(Server) -> Service -> Repository -> DB
   DB -> Repository -> Domain Model -> Service -> Page -> Form Component

2. **更新時**:
   Form Submit -> Server Action -> Service -> Repository -> DB
   Result -> Client (Toast & Redirect)

## 受入基準

- `/admin/basic-schedules/[id]/edit` にアクセスすると、対象データが入った状態でフォームが表示される。
- 内容を変更して保存すると、正しく更新され、一覧に戻った際に変更が反映されている。
- 削除ボタンから削除を実行すると、一覧からデータが消える（物理的には残る）。
- 存在しないIDでアクセスした際に 404 ページが表示される。
- Storybook でフォームの編集モードの表示確認ができる。
- ユニットテスト (`pnpm test:ut`) が通る。
