# 週間スケジュール画面 タスク

## ゴール

- `/admin/weekly-schedules?week=YYYY-MM-DD` に週間スケジュール画面を実装する。
- 管理者が基本スケジュールから週間シフトを生成し、閲覧できる。
- 編集・削除機能は将来タスクとして今回は対象外とする。

## 実装ステップ

### ステップ1: ヘルパー関数の準備

- [x] 1.1. `getMonday(date: Date): Date` - 指定日を含む週の月曜日を取得
- [x] 1.2. `parseSearchParams(params: SearchParams): ParsedSearchParams` - searchParams をパース
- [x] 1.3. 上記ヘルパーのテストを作成・実行

#### parseSearchParams 仕様

```typescript
// 入力: Next.js page の searchParams
type SearchParams = {
	week?: string;
	// 将来の拡張用パラメータをここに追加
};

// 出力: パース済みオブジェクト
type ParsedSearchParams = {
	weekStartDate: Date | null; // null: パラメータなし or 無効
	isValid: boolean; // true: 有効な月曜日
	error?: 'invalid_date' | 'not_monday'; // エラー種別
};
```

- `week` 未指定時: `weekStartDate = null`, `isValid = false`, `error = undefined`
- 日付として無効: `weekStartDate = null`, `isValid = false`, `error = 'invalid_date'`
- 月曜日以外: `weekStartDate = パース結果`, `isValid = false`, `error = 'not_monday'`
- 有効な月曜日: `weekStartDate = パース結果`, `isValid = true`

※ `YYYY-MM-DD` 形式への変換は `formatJstDateString` を使用

### ステップ2: ページルーティングとリダイレクト

- [x] 2.1. `/admin/weekly-schedules/page.tsx` を作成
- [x] 2.2. `week` パラメータ省略時は今週の月曜日にリダイレクト
- [x] 2.3. 不正な `week` パラメータ（月曜日以外、無効な日付）時のエラーハンドリング
- [x] 2.4. 管理者のみアクセス可能な認可チェック（ミドルウェアでログイン必須）
- [x] 2.5. ページのテストを作成

### ステップ3: WeekSelector コンポーネント

- [x] 3.1. テストを作成
- [x] 3.2. コンポーネントを実装
- [x] 3.3. Storybook ストーリーを作成

#### 仕様

| props          | 型                     | 説明                     |
| -------------- | ---------------------- | ------------------------ |
| `currentWeek`  | `Date`                 | 現在選択中の週（月曜日） |
| `onWeekChange` | `(date: Date) => void` | 週変更時のコールバック   |

#### 機能

- 現在の週を `YYYY年MM月DD日 〜 MM月DD日` 形式で表示
- 「前週」「次週」ボタンで週を移動
- ボタンクリック時に `onWeekChange` を呼び出し、親が URL を更新

#### 状態

- 通常表示

### ステップ4: GenerateButton コンポーネント

- [ ] 4.1. テストを作成
- [ ] 4.2. コンポーネントを実装
- [ ] 4.3. Storybook ストーリーを作成

#### 仕様

| props           | 型                                 | 説明                     |
| --------------- | ---------------------------------- | ------------------------ |
| `weekStartDate` | `Date`                             | 生成対象の週（月曜日）   |
| `onGenerated`   | `(result: GenerateResult) => void` | 生成完了時のコールバック |
| `disabled`      | `boolean`                          | ボタン無効化             |

#### 機能

- 「シフトを生成」ボタンを表示
- クリック時に `generateWeeklyShiftsAction` を呼び出し
- 処理中はローディングスピナー表示
- 成功時: `onGenerated` を呼び出し、トースト表示
- エラー時: トーストでエラー表示

#### 状態

- 通常、ローディング中、無効

### ステップ5: ShiftTable コンポーネント

- [ ] 5.1. テストを作成
- [ ] 5.2. コンポーネントを実装
- [ ] 5.3. Storybook ストーリーを作成

#### 仕様

| props     | 型                  | 説明               |
| --------- | ------------------- | ------------------ |
| `shifts`  | `ShiftDisplayRow[]` | 表示用シフトデータ |
| `loading` | `boolean`           | ローディング状態   |

#### ShiftDisplayRow 型

```typescript
type ShiftDisplayRow = {
	id: string;
	date: Date;
	startTime: { hour: number; minute: number };
	endTime: { hour: number; minute: number };
	clientName: string;
	serviceTypeName: string;
	staffName: string | null; // null の場合は「未割当」表示
	status: 'scheduled' | 'confirmed' | 'completed' | 'canceled';
};
```

#### テーブル列

| 列           | 内容                           | 幅    |
| ------------ | ------------------------------ | ----- |
| 日付         | `YYYY/MM/DD (曜日)`            | 120px |
| 時間         | `HH:MM - HH:MM`                | 100px |
| 利用者       | 利用者名                       | 自動  |
| サービス区分 | サービス区分名                 | 120px |
| 担当者       | スタッフ名 or 「未割当」バッジ | 120px |
| ステータス   | ステータスバッジ               | 100px |

#### 機能

- ソート: 日付 → 開始時刻 の昇順（固定、サーバー側でソート済み）
- 未割当の場合は警告色の「未割当」バッジを表示
- ステータスに応じた色分けバッジ

#### 状態

- 通常表示、空状態、ローディング

### ステップ6: 空状態コンポーネント

- [ ] 6.1. テストを作成
- [ ] 6.2. コンポーネントを実装
- [ ] 6.3. Storybook ストーリーを作成

#### 仕様

| props           | 型           | 説明                 |
| --------------- | ------------ | -------------------- |
| `weekStartDate` | `Date`       | 対象の週             |
| `onGenerate`    | `() => void` | 生成ボタンクリック時 |

#### 機能

- 「この週のシフトはまだありません」メッセージ表示
- 「基本スケジュールから生成」ボタン

### ステップ7: WeeklySchedulePage コンポーネント

- [ ] 7.1. テストを作成
- [ ] 7.2. コンポーネントを実装
- [ ] 7.3. Storybook ストーリーを作成

#### 仕様

| props           | 型                               | 説明                       |
| --------------- | -------------------------------- | -------------------------- |
| `weekStartDate` | `Date`                           | 選択中の週（月曜日）       |
| `initialShifts` | `ShiftDisplayRow[]`              | 初期データ（SSR）          |
| `clients`       | `{ id: string; name: string }[]` | 利用者一覧（名前解決用）   |
| `staffs`        | `{ id: string; name: string }[]` | スタッフ一覧（名前解決用） |

#### 機能

- WeekSelector, GenerateButton, ShiftTable を統合
- 週変更時に `router.push` で URL を更新
- 生成完了時に `router.refresh()` でデータ再取得

#### レイアウト

```
┌─────────────────────────────────────────────┐
│ 週間スケジュール                              │
├─────────────────────────────────────────────┤
│ [◀前週] 2026年01月19日〜01月25日 [次週▶] [生成] │
├─────────────────────────────────────────────┤
│ 日付      時間       利用者  区分   担当  状態 │
│ 01/19(月) 09:00-10:00 田中様  身体   山田  予定 │
│ 01/19(月) 11:00-12:00 鈴木様  生活   -     未割当│
│ ...                                          │
└─────────────────────────────────────────────┘
```

### ステップ8: ページ統合とデータ取得

- [ ] 8.1. `page.tsx` でデータ取得ロジックを実装
- [ ] 8.2. `listShiftsAction` で週のシフトを取得
- [ ] 8.3. clients / staffs の名前解決データを取得
- [ ] 8.4. Suspense でローディング状態を処理
- [ ] 8.5. エラーハンドリングを実装

### ステップ9: 統合テストと仕上げ

- [ ] 9.1. 全コンポーネントのテストが通ることを確認
- [ ] 9.2. `pnpm test:ut --run` で全テストが成功することを確認
- [ ] 9.3. Storybook で全状態を確認
- [ ] 9.4. アクセシビリティチェック（label、フォーカス順序）
- [ ] 9.5. レスポンシブ表示の確認

## ファイル構成

```
src/app/admin/weekly-schedules/
├── page.tsx
├── page.test.tsx
├── helpers.ts                  # getMonday, formatWeekParam, parseWeekParam
├── helpers.test.ts
└── _components/
    ├── WeeklySchedulePage/
    │   ├── WeeklySchedulePage.tsx
    │   ├── WeeklySchedulePage.test.tsx
    │   ├── WeeklySchedulePage.stories.tsx
    │   └── index.ts
    ├── WeekSelector/
    │   ├── WeekSelector.tsx
    │   ├── WeekSelector.test.tsx
    │   ├── WeekSelector.stories.tsx
    │   └── index.ts
    ├── GenerateButton/
    │   ├── GenerateButton.tsx
    │   ├── GenerateButton.test.tsx
    │   ├── GenerateButton.stories.tsx
    │   └── index.ts
    ├── ShiftTable/
    │   ├── ShiftTable.tsx
    │   ├── ShiftTable.test.tsx
    │   ├── ShiftTable.stories.tsx
    │   └── index.ts
    └── EmptyState/
        ├── EmptyState.tsx
        ├── EmptyState.test.tsx
        ├── EmptyState.stories.tsx
        └── index.ts
```

## 作業方針 (TDD)

- 各ステップで先にテストを作成し、失敗を確認してから実装
- UI コンポーネントは `src/app/admin/weekly-schedules/_components/` 配下に配置
- 各コンポーネントディレクトリに `index.ts` でエクスポート
- Storybook ファイルは `<ComponentName>.stories.tsx` として同ディレクトリに配置

## 受入条件

- 仕様ドキュメントの要件と本タスクのテストがすべて満たされる。
- `pnpm test:ut --run` が成功する。
- 権限チェックが機能し、非管理者はアクセスできない。
