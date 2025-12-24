# 担当者管理フロントエンド実装タスク

## 概要

- 目的: [docs/features/2025-12-22-1100-staff-management-extension.md](../features/2025-12-22-1100-staff-management-extension.md) で定義した担当者サービス区分権限 + 備考機能を管理画面で操作できる UI を提供する。
- 対象: 管理者 (office admin) 向けのスタッフ管理ページ。Server Actions (`src/app/actions/staffs.ts`) を利用して CRUD + 権限設定 + 備考を操作する。
- アウトカム: 管理者がブラウザ上でスタッフの一覧を確認し、サービス区分権限と備考を含む登録・更新・削除を行える。全操作は TDD (Vitest + Testing Library) と Storybook で裏付けられる。

## 前提 / 制約

- UI 実装は `src/app/admin/staffs` 配下に追加し、共有コンポーネントは `src/app/admin/staffs/_components/` に配置する。
- デザインは Tailwind CSS + daisyUI 5 を使用する (既定テーマ / 変数遵守)。
- Server Actions との通信は `actionResult` を介したパターンを踏襲する。
- コンポーネント実装時は **UT と Storybook を同時並行で作成** する。各コンポーネントごとに `*.test.tsx` / `*.stories.tsx` をセットで追加し、実装とテスト/レンダリング確認を一気通貫で進める。
- 日付操作は不要。シフトとは独立している。

## 要件まとめ

1. **一覧表示**
   - スタッフ名 / ロール / メール / サービス区分一覧 / 備考 / 更新日時を表示。
   - サービス区分は Chip / Badge で視認性を確保。
   - 空の備考は "―" 表示。
2. **検索・絞り込み (MVP 範囲)**
   - テキスト検索 (名前・メール) とロール絞り込み。クライアントサイド filter で可。
3. **作成 / 編集フォーム**
   - 入力項目: 氏名 (必須)、メール (任意)、ロール (admin/helper)、備考 (max 500)、担当サービス区分 (checkbox / multiselect)。
   - 未選択時は Server Action 側で全区分付与されるが、UI でも全選択/解除を提供する。
4. **削除**
   - 削除確認モーダルを表示し、成功後はトースト通知。
5. **フィードバック**
   - Server Action からのバリデーションエラーをフォームにバインド。
   - API 進行中はボタン loading、成功/失敗トースト。
6. **アクセシビリティ / UX**
   - フォーム入力は `aria-*` 付与、キーボード操作可能。
   - DaisyUI コンポーネントの variant を活用し、モバイルレスポンシブにする。

## 実装する機能 (Functions)

| #   | 機能                      | 説明                                                                                                    |
| --- | ------------------------- | ------------------------------------------------------------------------------------------------------- |
| F1  | StaffListPage             | `/admin/staffs` SSR ページ。`listStaffsAction` を呼び出し、一覧 + フィルタを表示。                      |
| F2  | StaffTable コンポーネント | スタッフ一覧テーブル。サービス区分バッジ、備考ツールチップ、空状態を含む。                              |
| F3  | StaffFilterBar            | 名前/メール検索とロールタブ。フィルタ結果を親へ通知。                                                   |
| F4  | StaffFormModal            | 作成/編集用モーダル。フォーム (react-hook-form + zod resolver) で create/update Action を呼ぶ。         |
| F5  | ServiceTypeSelector       | チェックボックスリスト + "全選択" トグル。フォーム配列を扱う。                                          |
| F6  | DeleteStaffDialog         | 削除確認モーダル。`deleteStaffAction` を呼び出し、結果トースト。                                        |
| F7  | Toast/Feedback Hook       | 成功/失敗メッセージを標準化。`useActionResultHandler` (仮) を追加。                                     |
| F8  | Storybook Stories         | F2〜F6 の UI ケース (empty, loading, error) を作成し、UI regression を防ぐ。                            |
| F9  | Unit Tests                | F2〜F6 それぞれの振る舞い検証 (フィルタロジック、フォームバリデーション、API 呼び出し成功/失敗パス等)。 |

## タスク一覧

| 状態 | #   | タスク                               | 詳細                                                                                                                                                                                                                                                                                                                                                                                             |
| ---- | --- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [x]  | 1   | 要件詳細化 & API I/F 定義            | - StaffRecord を UI モデルにマッピングする補助関数を定義。<br />- Server Actions の戻り値/エラーフォーマットを整理して TypeScript type を確定。<br />- ダイアログ/モーダルの表示状態管理方針を決定 (URL Query or local state)。<br />→ 記録: [docs/features/2025-12-22-1100-staff-management-extension.md](../features/2025-12-22-1100-staff-management-extension.md) の「フロントエンド仕様」節 |
| [ ]  | 2   | StaffListPage ベース実装             | - `src/app/admin/staffs/page.tsx` (or +page) を作成。<br />- `listStaffsAction` を呼び、`StaffTable` + `StaffFilterBar` を配置。<br />- Suspense/エラーハンドリングを設け、データ未取得時 Skeleton を表示。                                                                                                                                                                                      |
| [ ]  | 3   | StaffTable / ServiceTypeBadge        | - DaisyUI table + badge で UI 実装。<br />- props: `staffs: StaffViewModel[]`、`onEdit`, `onDelete`。<br />- UT: 行数、空状態、バッジ表示、備考 tooltip を検証。<br />- Story: default / empty / overflow cases。                                                                                                                                                                                |
| [ ]  | 4   | StaffFilterBar                       | - Text input + role tabs (All/admin/helper) を実装。<br />- props: `onChange(filters)`、`initialFilters`。<br />- UT: フィルタ入力イベント、ロール切替。<br />- Story: default / with preset。                                                                                                                                                                                                   |
| [ ]  | 5   | StaffFormModal + ServiceTypeSelector | - react-hook-form + zod resolver でフォーム構築。<br />- ServiceTypeSelector: 全選択/解除ボタン、チェックボックスリスト。<br />- Server Action 呼び出し: `createStaffAction` / `updateStaffAction` をモード別に使用。<br />- エラー表示: フィールド + Global。<br />- UT: 入力検証、API 呼び出しモード切替、loading state。<br />- Story: Create / Edit / Validation error。                     |
| [ ]  | 6   | DeleteStaffDialog                    | - モーダル + danger ボタン。<br />- `deleteStaffAction` 呼び出しと結果トースト。<br />- UT: confirm ボタンで API 呼び出し、キャンセル時未呼び出し。<br />- Story: default。                                                                                                                                                                                                                      |
| [ ]  | 7   | Toast/Feedback Hook                  | - `useActionResultHandler` (仮) フックで `ActionResult` を解釈し、`toast` (daisyUI toast) を表示。<br />- UT: success/error ハンドリング。<br />- 既存 toast があれば再利用。                                                                                                                                                                                                                    |
| [ ]  | 8   | ページ統合 & e2e シナリオ            | - F2〜F7 を結線、フィルタ + CRUD フローを確認。<br />- Vitest コンポーネントテスト (page) で happy path を再現 (モック Server Action)。<br />- スモークテスト: 作成→編集→削除の順で state 更新。                                                                                                                                                                                                 |
| [ ]  | 9   | ドキュメント / リリースノート更新    | - README もしくは `docs/features` に UI 操作手順を追記 (必要なら軽微な追記)。<br />- 動作確認ログ (テストコマンド、Storybook 起動) を記録。                                                                                                                                                                                                                                                      |

## 詳細設計メモ

### StaffViewModel

```ts
export type StaffViewModel = {
	id: string;
	name: string;
	role: 'admin' | 'helper';
	email: string | null;
	note: string | null;
	serviceTypes: {
		id: string;
		name: string;
	}[]; // listStaffsAction には name が無いため、ServiceType 一覧取得 API が別途必要か要検討
	updatedAt: string;
};
```

> **補足**: サービス区分名称を表示するには追加データが必要。`service_types` を別途取得するか、`listStaffsAction` に埋め込む拡張を検討 (API 要件にフィードバック)。暫定的に `service_type_ids` を表示しつつ、名前取得の改善を後続タスクに切り出す案も可。

### フォーム検証

- zod schema: `StaffInputSchema` を流用。
- `resolver` で server エラー時は `setError('root', ...)`。
- 備考は textarea + 500 文字カウンタ。
- サービス区分は checkbox list (daisyUI `form-control`).

### トースト

- DaisyUI `toast toast-end toast-top` を利用。
- 成功: `alert alert-success`、失敗: `alert alert-error`。
- `useToastStore` (既存) がなければ軽量な Zustand or React state を作成。

## テスト / 検証

- UT: `pnpm test:ut --run` (コンポーネント単位)。
- Storybook: `pnpm storybook` でスタイル確認。
- UI 操作手順書 (最終確認チェックリスト例):
  1. `/admin/staffs` で一覧が表示される。
  2. 検索で名前に一致するスタッフのみ表示される。
  3. 作成モーダルから新規登録 → 成功トースト → テーブルに反映。
  4. 編集モーダルで note を更新 → 成功トースト。
  5. 削除確認 → 成功トースト → テーブルから消える。
  6. 500 文字超過時、フォーム上にエラーメッセージ。

---

このタスク文書をベースに、要件 → 機能 → タスクの順で進めてください。各タスク完了時は当ファイルを更新し、チェックボックスを `[x]` にしてください。
