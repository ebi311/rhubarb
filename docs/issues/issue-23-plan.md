# Issue #23: 基本スケジュールの一括登録・編集機能 実装計画

**作成日時**: 2026-02-08  
**Issue**: [#23 基本スケジュールの登録フォームで、複数の予定を登録できる](https://github.com/ebi311/rhubarb/issues/23)  
**ブランチ**: `feature/issue-23-batch-schedule-editor`

## 概要

1週間分の基本スケジュールをまとめて登録・編集できる新規画面を実装する。

## 要件サマリ

| 項目                   | 内容                                                           |
| ---------------------- | -------------------------------------------------------------- |
| **対象画面**           | 利用者ごとの一括編集画面（新規）                               |
| **URL**                | `/admin/basic-schedules/clients/[clientId]/edit`               |
| **グリッド表示**       | 曜日を列として、各曜日に登録済み予定をカード形式で一覧表示     |
| **入力フォーム**       | 「新規追加」ボタンでモーダルフォームを表示                     |
| **編集操作**           | グリッド内の既存カードをクリックで編集フォームをプリフィル表示 |
| **変更インジケーター** | 追加・変更・削除状態を視覚的に区別表示                         |
| **二段階保存**         | フォーム→グリッド反映（ローカル）、確定ボタン→サーバー保存     |

## アーキテクチャ設計

### 1. 状態管理: `useReducer` パターン

```typescript
// 編集状態の型定義
type EditStatus = 'unchanged' | 'new' | 'modified' | 'deleted';

type EditableSchedule = {
	id: string; // 新規は一時ID (temp-xxx)
	originalId?: string; // 既存の場合は元のID
	status: EditStatus;
	data: {
		weekday: DayOfWeek;
		serviceTypeId: string;
		staffIds: string[];
		startTime: string;
		endTime: string;
		note: string | null;
	};
};

type EditorState = {
	clientId: string;
	clientName: string;
	schedules: EditableSchedule[];
	selectedScheduleId: string | null;
	isFormOpen: boolean;
	isSaving: boolean;
};

type EditorAction =
	| { type: 'LOAD_SCHEDULES'; payload: BasicScheduleRecord[] }
	| { type: 'ADD_SCHEDULE'; payload: EditableSchedule['data'] }
	| {
			type: 'UPDATE_SCHEDULE';
			payload: { id: string; data: EditableSchedule['data'] };
	  }
	| { type: 'DELETE_SCHEDULE'; payload: string }
	| { type: 'RESTORE_SCHEDULE'; payload: string }
	| { type: 'OPEN_FORM'; payload?: string }
	| { type: 'CLOSE_FORM' }
	| { type: 'SET_SAVING'; payload: boolean };
```

### 2. コンポーネント構成

```
src/app/admin/basic-schedules/clients/[clientId]/edit/
 page.tsx                              # Server Component (データ取得)
 _components/
    ├── ClientWeeklyScheduleEditor/       # メインエディタ
    │   ├── ClientWeeklyScheduleEditor.tsx
    │   ├── ClientWeeklyScheduleEditor.test.tsx
    │   ├── ClientWeeklyScheduleEditor.stories.tsx
    │   ├── editorReducer.ts              # 状態管理reducer
    │   ├── editorReducer.test.ts
    │   ├── types.ts                      # 型定義
    │   └── index.ts
    │
    ├── ScheduleEditFormModal/            # 編集モーダル
    │   ├── ScheduleEditFormModal.tsx
    │   ├── ScheduleEditFormModal.test.tsx
    │   ├── ScheduleEditFormModal.stories.tsx
    │   └── index.ts
    │
    ├── ScheduleCard/                     # グリッド内カード
    │   ├── ScheduleCard.tsx
    │   ├── ScheduleCard.test.tsx
    │   ├── ScheduleCard.stories.tsx
    │   └── index.ts
    │
    └── DayColumn/                        # 曜日列
        ├── DayColumn.tsx
        ├── DayColumn.test.tsx
        ├── DayColumn.stories.tsx
        └── index.ts
```

### 3. API層

#### 既存Actionの活用

- `listBasicSchedulesAction({ client_id })`: 利用者の既存スケジュール取得
- `createBasicScheduleAction`: 新規追加
- `updateBasicScheduleAction`: 更新
- `deleteBasicScheduleAction`: 削除

#### 新規: 一括保存Action

```typescript
// src/app/actions/basicSchedules.ts に追加
export const batchSaveBasicSchedulesAction = async (
  clientId: string,
  operations: {
    create: BasicScheduleInput[];
    update: { id: string; input: BasicScheduleInput }[];
    delete: string[];
  }
): Promise<ActionResult<{ created: number; updated: number; deleted: number }>>
```

## 実装タスク

### フェーズ1: 基盤準備 (Day 1)

#### 1.1 型定義・Reducerの実装

**ファイル**:

- `src/app/admin/basic-schedules/clients/[clientId]/edit/_components/ClientWeeklyScheduleEditor/types.ts`
- `src/app/admin/basic-schedules/clients/[clientId]/edit/_components/ClientWeeklyScheduleEditor/editorReducer.ts`
- `src/app/admin/basic-schedules/clients/[clientId]/edit/_components/ClientWeeklyScheduleEditor/editorReducer.test.ts`

**作業内容**:

- EditorState、EditorAction の型定義
- editorReducer 関数の実装
- 全アクションタイプのユニットテスト

**受入基準**:

- 全アクションが正しく状態を更新する
- ユニットテストがパスする

---

#### 1.2 ScheduleCard コンポーネント

**ファイル**:

- `src/app/admin/basic-schedules/clients/[clientId]/edit/_components/ScheduleCard/`

**作業内容**:

- 時間帯、サービス区分、担当者名の表示
- ステータスインジケーター（badge）
  - `new` → `badge-success` "新規"
  - `modified` → `badge-warning` "変更"
  - `deleted` → `badge-error` "削除" + 取り消し線
- クリックイベントハンドラ
- 削除ボタン（soft delete用）

**受入基準**:

- 全ステータスの表示が正しい
- Storybookで各状態を確認可能

---

### フェーズ2: グリッド表示 (Day 2)

#### 2.1 DayColumn コンポーネント

**ファイル**:

- `src/app/admin/basic-schedules/clients/[clientId]/edit/_components/DayColumn/`

**作業内容**:

- 曜日ラベルヘッダー
- 縦に並ぶScheduleCardリスト
- 「＋追加」ボタン
- 空状態の表示

**受入基準**:

- カードが正しく縦に並ぶ
- 追加ボタンがクリック可能

---

#### 2.2 ClientWeeklyScheduleEditor コンポーネント

**ファイル**:

- `src/app/admin/basic-schedules/clients/[clientId]/edit/_components/ClientWeeklyScheduleEditor/`

**作業内容**:

- useReducer による状態管理
- 7曜日のDayColumnを横に配置（CSS Grid）
- 利用者名ヘッダー
- 「登録する」/「更新する」確定ボタン
- レスポンシブ対応（横スクロール）

**受入基準**:

- グリッドが正しく表示される
- 状態変更が反映される

---

### フェーズ3: 編集フォーム (Day 3)

#### 3.1 ScheduleEditFormModal コンポーネント

**ファイル**:

- `src/app/admin/basic-schedules/clients/[clientId]/edit/_components/ScheduleEditFormModal/`

**作業内容**:

- daisyUI modal を使用
- react-hook-form + Zod でバリデーション
- 入力項目:
  - 曜日 (select)
  - 開始時刻・終了時刻 (time input)
  - サービス区分 (select)
  - 担当者 (StaffPickerDialog 再利用)
  - 備考 (textarea)
- 「反映」ボタン：グリッドに変更を反映
- 「キャンセル」ボタン

**受入基準**:

- 新規追加と既存編集の両モードで動作
- バリデーションエラーが表示される
- 「反映」でモーダルが閉じ、グリッドに反映される

---

### フェーズ4: サーバー保存 (Day 4)

#### 4.1 一括保存Action

**ファイル**:

- `src/app/actions/basicSchedules.ts`（追加）
- `src/app/actions/basicSchedules.test.ts`（追加）
- `src/backend/services/basicScheduleService.ts`（追加メソッド）

**作業内容**:

- `batchSaveBasicSchedulesAction` 実装
- BasicScheduleService に `batchSave` メソッド追加
- トランザクション的な処理（全操作成功 or ロールバック）
- エラーハンドリング（部分失敗時の対応）

**受入基準**:

- 複数の追加・更新・削除が一括で処理される
- 1件でも失敗した場合、全体がロールバックされる
- 成功時に件数が返される

---

#### 4.2 保存処理の統合

**ファイル**:

- `src/app/admin/basic-schedules/clients/[clientId]/edit/_components/ClientWeeklyScheduleEditor/useBatchSave.ts`

**作業内容**:

- 確定ボタンクリック時の保存処理
- 変更検出ロジック（unchanged以外を抽出）
- 保存中のローディング表示
- 成功時のトースト通知と画面遷移
- エラー時のトースト通知

**受入基準**:

- 変更がある場合のみ保存APIが呼ばれる
- 保存成功後、一覧画面にリダイレクト

---

### フェーズ5: ページ統合・ナビゲーション (Day 5)

#### 5.1 ページの実装

**ファイル**:

- `src/app/admin/basic-schedules/clients/[clientId]/edit/page.tsx`

**作業内容**:

- 利用者情報の取得
- 既存スケジュールの取得
- ClientWeeklyScheduleEditor への props 渡し
- パンくずリスト設定

**受入基準**:

- `/admin/basic-schedules/clients/[clientId]/edit` でアクセス可能
- 既存データが正しくロードされる

---

#### 5.2 ナビゲーション追加

**ファイル**:

- `src/app/admin/basic-schedules/_components/BasicScheduleGrid/BasicScheduleGrid.tsx`（修正）
- `src/app/admin/clients/_components/ClientTable/ClientTable.tsx`（修正）

**作業内容**:

- BasicScheduleGrid の利用者名から一括編集画面へのリンク追加
- ClientTable に「基本スケジュール編集」ボタン追加

**受入基準**:

- グリッド/テーブルから一括編集画面に遷移できる

---

### フェーズ6: テスト・ドキュメント (Day 6)

#### 6.1 E2Eテスト

**ファイル**:

- 将来的に実装（本計画では範囲外）

#### 6.2 ドキュメント更新

**ファイル**:

- `docs/screens/admin-basic-schedules-batch-edit.md`（新規）
- `docs/features/basic-schedule.md`（更新）

**作業内容**:

- 画面仕様ドキュメントの作成
- 機能ドキュメントに一括編集の説明追加

---

## ファイル変更一覧

### 新規作成ファイル

| パス                                                                                            | 説明                              |
| ----------------------------------------------------------------------------------------------- | --------------------------------- |
| `src/app/admin/basic-schedules/clients/[clientId]/edit/page.tsx`                                | ページコンポーネント              |
| `src/app/admin/basic-schedules/clients/[clientId]/edit/_components/ClientWeeklyScheduleEditor/` | メインエディタ（8ファイル）       |
| `src/app/admin/basic-schedules/clients/[clientId]/edit/_components/ScheduleEditFormModal/`      | 編集モーダル（4ファイル）         |
| `src/app/admin/basic-schedules/clients/[clientId]/edit/_components/ScheduleCard/`               | カードコンポーネント（4ファイル） |
| `src/app/admin/basic-schedules/clients/[clientId]/edit/_components/DayColumn/`                  | 曜日列コンポーネント（4ファイル） |
| `docs/screens/admin-basic-schedules-batch-edit.md`                                              | 画面仕様ドキュメント              |

### 変更ファイル

| パス                                                                                | 変更内容                             |
| ----------------------------------------------------------------------------------- | ------------------------------------ |
| `src/app/actions/basicSchedules.ts`                                                 | `batchSaveBasicSchedulesAction` 追加 |
| `src/app/actions/basicSchedules.test.ts`                                            | 一括保存のテスト追加                 |
| `src/backend/services/basicScheduleService.ts`                                      | `batchSave` メソッド追加             |
| `src/app/admin/basic-schedules/_components/BasicScheduleGrid/BasicScheduleGrid.tsx` | 一括編集リンク追加                   |
| `docs/features/basic-schedule.md`                                                   | 一括編集の説明追加                   |

---

## 技術的考慮事項

### 1. 一時IDの管理

    };\ `temp-{uuid}` 形式の一時IDを付与し、サーバー保存後に実IDに置換する。

### 2. 重複チェック

- フロントエンド: 同一スタッフ・同一曜日の時間重複をリアルタイムで警告
- バックエンド: 既存の `assertNoOverlap` ロジックを活用

### 3. 楽観的UI

- グリッドへの変更は即座に反映
- サーバー保存失敗時はエラー表示し、状態を維持

### 4. レスポンシブ対応

- デスクトップ: 7列グリッド表示
- タブレット/モバイル: 横スクロール or 曜日タブ切り替え

---

## 実装順序（依存関係考慮）

```
1. types.ts, editorReducer.ts（状態管理基盤）
   ↓
2. ScheduleCard（最小表示単位）
   ↓
3. DayColumn（カードのコンテナ）
   ↓
4. ClientWeeklyScheduleEditor（グリッド全体）
   ↓
5. ScheduleEditFormModal（編集UI）
   ↓
6. batchSaveBasicSchedulesAction（保存API）
   ↓
7. page.tsx（ページ統合）
   ↓
8. ナビゲーション追加
   ↓
9. ドキュメント
```

---

## テスト計画

| 対象                            | テスト種別 | 概要                         |
| ------------------------------- | ---------- | ---------------------------- |
| `editorReducer`                 | Unit Test  | 全アクションの状態遷移       |
| `ScheduleCard`                  | Unit Test  | 表示・クリック・削除ボタン   |
| `DayColumn`                     | Unit Test  | カード配置・追加ボタン       |
| `ClientWeeklyScheduleEditor`    | Unit Test  | 統合表示・状態管理           |
| `ScheduleEditFormModal`         | Unit Test  | フォーム入力・バリデーション |
| `batchSaveBasicSchedulesAction` | Unit Test  | 一括保存・ロールバック       |
| 全コンポーネント                | Storybook  | 各状態の視覚確認             |

---

## 見積り

| フェーズ                | 所要時間（目安） |
| ----------------------- | ---------------- |
| フェーズ1: 基盤準備     | 3-4時間          |
| フェーズ2: グリッド表示 | 4-5時間          |
| フェーズ3: 編集フォーム | 3-4時間          |
| フェーズ4: サーバー保存 | 3-4時間          |
| フェーズ5: ページ統合   | 2-3時間          |
| フェーズ6: ドキュメント | 1-2時間          |
| **合計**                | **16-22時間**    |
