# 機能仕様書: 利用者管理

**作成日**: 2025-12-13  
**対象フェーズ**: フェーズ1 - 基本スケジュール登録機能  
**優先度**: High（基本スケジュール作成の前提条件）

---

## 1. 機能概要

### 1.1 目的

訪問介護サービスを受ける利用者の情報を管理する機能を提供します。
利用者情報は基本スケジュールやシフト作成時に必須の情報であり、契約ステータス管理により誤ったスケジュール作成を防止します。

### 1.2 ビジネス価値

- 利用者情報を一元管理できる
- 契約中断・再開により、スケジュール作成時のミスを防止
- 記録を削除せずに保持することでコンプライアンスを担保
- 基本スケジュールや担当許可リストの基盤データとなる

### 1.3 ユーザーストーリー

**As a** 事業所管理者  
**I want to** 利用者情報を登録・編集し、契約ステータスを管理できる  
**So that** 正確なスケジュールを作成でき、契約中断中の利用者を誤ってスケジュールに含めることを防げる

---

## 2. エンティティ定義

### 2.1 Client エンティティ

| 項目名         | 物理名          | 型          | 必須 | デフォルト値      | 説明                            |
| :------------- | :-------------- | :---------- | :--- | :---------------- | :------------------------------ |
| 利用者ID       | id              | UUID        | ✓    | gen_random_uuid() | 主キー                          |
| 事業所ID       | office_id       | UUID        | ✓    | -                 | 外部キー (offices.id)           |
| 氏名           | name            | TEXT        | ✓    | -                 | 利用者の氏名                    |
| 住所           | address         | TEXT        | ✓    | -                 | 訪問先住所                      |
| 契約ステータス | contract_status | ENUM        | ✓    | 'active'          | active=契約中, suspended=中断中 |
| 作成日時       | created_at      | TIMESTAMPTZ | ✓    | now()             | レコード作成日時                |
| 更新日時       | updated_at      | TIMESTAMPTZ | ✓    | now()             | レコード更新日時                |

### 2.2 制約条件

- **主キー**: `id`
- **外部キー**: `office_id` → `offices(id)` ON DELETE CASCADE
- **インデックス**: `(office_id, contract_status)` - 契約中の利用者検索を高速化

### 2.3 契約ステータス (contract_status)

```sql
CREATE TYPE contract_status AS ENUM ('active', 'suspended');
```

| 値        | 説明               | UI表示 |
| :-------- | :----------------- | :----- |
| active    | 契約中（通常状態） | 契約中 |
| suspended | 契約中断中         | 中断中 |

**状態遷移**:

- `active` → `suspended`: 契約を中断する
- `suspended` → `active`: 契約を再開する

**ビジネスルール**:

- `suspended`状態の利用者は新規スケジュール作成時に選択できない
- 既存のスケジュールは保持されるが、警告表示される
- 削除機能は提供しない（履歴保持のため）

### 2.4 RLS (Row Level Security) ポリシー

既存のRLSポリシー（`create_clients.sql`で定義済み）:

- 管理者: 自分の事業所の利用者を全操作可能
- ヘルパー: 自分の事業所の利用者を閲覧可能

---

## 3. API仕様

### 3.1 エンドポイント一覧

| メソッド | パス                       | 説明           | 認証 | 権限       |
| :------- | :------------------------- | :------------- | :--- | :--------- |
| GET      | `/api/clients`             | 利用者一覧取得 | 必須 | 全ユーザー |
| GET      | `/api/clients/:id`         | 利用者詳細取得 | 必須 | 全ユーザー |
| POST     | `/api/clients`             | 利用者作成     | 必須 | 管理者のみ |
| PUT      | `/api/clients/:id`         | 利用者更新     | 必須 | 管理者のみ |
| PATCH    | `/api/clients/:id/suspend` | 契約中断       | 必須 | 管理者のみ |
| PATCH    | `/api/clients/:id/resume`  | 契約再開       | 必須 | 管理者のみ |

**注意**: DELETE エンドポイントは提供しない（記録保持のため）

### 3.2 リクエスト/レスポンス詳細

#### GET `/api/clients`

**クエリパラメータ**:

- `status`: フィルター（`active`, `suspended`, `all`）デフォルト: `active`

**レスポンス例**:

```json
{
	"data": [
		{
			"id": "019b179f-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
			"office_id": "019b179f-yyyy-yyyy-yyyy-yyyyyyyyyyyy",
			"name": "山田太郎",
			"address": "東京都千代田区丸の内1-1-1",
			"contract_status": "active",
			"created_at": "2025-12-13T10:00:00Z",
			"updated_at": "2025-12-13T10:00:00Z"
		},
		{
			"id": "019b179f-zzzz-zzzz-zzzz-zzzzzzzzzzzz",
			"office_id": "019b179f-yyyy-yyyy-yyyy-yyyyyyyyyyyy",
			"name": "佐藤花子",
			"address": "東京都渋谷区神南1-2-3",
			"contract_status": "suspended",
			"created_at": "2025-12-13T10:00:00Z",
			"updated_at": "2025-12-13T11:00:00Z"
		}
	],
	"error": null
}
```

#### POST `/api/clients`

**リクエストボディ**:

```json
{
	"name": "鈴木一郎",
	"address": "東京都新宿区西新宿2-8-1"
}
```

**バリデーションルール**:

- `name`: 必須、1文字以上100文字以内、空白のみは不可
- `address`: 必須、1文字以上200文字以内、空白のみは不可
- `contract_status`: 自動的に`active`で作成

**レスポンス例（成功）**:

```json
{
	"data": {
		"id": "019b179f-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
		"office_id": "019b179f-yyyy-yyyy-yyyy-yyyyyyyyyyyy",
		"name": "鈴木一郎",
		"address": "東京都新宿区西新宿2-8-1",
		"contract_status": "active",
		"created_at": "2025-12-13T12:00:00Z",
		"updated_at": "2025-12-13T12:00:00Z"
	},
	"error": null
}
```

#### PUT `/api/clients/:id`

**リクエストボディ**:

```json
{
	"name": "山田太郎（更新後）",
	"address": "東京都千代田区丸の内1-1-2"
}
```

**注意**: `contract_status`は専用のエンドポイント（suspend/resume）でのみ変更可能

#### PATCH `/api/clients/:id/suspend`

**リクエストボディ**: なし

**レスポンス例**:

```json
{
	"data": {
		"id": "019b179f-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
		"contract_status": "suspended",
		"updated_at": "2025-12-13T13:00:00Z"
	},
	"error": null
}
```

**ビジネスルール**:

- 既に`suspended`の場合はエラーを返さず成功とする（冪等性）
- 既存のスケジュールは削除しないが、警告を表示する仕組みが必要

#### PATCH `/api/clients/:id/resume`

**リクエストボディ**: なし

**レスポンス例**: suspend と同様

---

## 4. UI仕様

### 4.1 画面構成

#### 4.1.1 利用者一覧画面 (`/admin/clients`)

**レイアウト**:

```
+--------------------------------------------------+
| ヘッダー (Header)                                  |
+--------------------------------------------------+
| 利用者管理                                          |
|                                                    |
| [+ 新規登録]  フィルター: [全て▼] [契約中] [中断中] |
|                                                    |
| +----------------------------------------------+  |
| | 氏名     | 住所           | ステータス | 操作 |  |
| +----------------------------------------------+  |
| | 山田太郎 | 千代田区...    | 契約中    | [編集] |  |
| | 佐藤花子 | 渋谷区...      | 🔶中断中  | [編集] |  |
| | 鈴木一郎 | 新宿区...      | 契約中    | [編集] |  |
| +----------------------------------------------+  |
+--------------------------------------------------+
```

**コンポーネント構成**:

- `ClientListPage`: ページ全体
  - `Header`: 共通ヘッダー
  - `ClientFilterTabs`: ステータスフィルター（タブまたはドロップダウン）
  - `ClientTable`: テーブル表示
    - `ClientRow`: 各行
      - `StatusBadge`: ステータスバッジ
      - `EditButton`: 編集ボタン
  - `CreateButton`: 新規登録ボタン
  - `ClientModal`: 作成・編集用モーダル

**ステータス表示**:

- `active`: 「契約中」（緑色バッジ、またはバッジなし）
- `suspended`: 「中断中」（オレンジ色バッジ、警告アイコン付き）

#### 4.1.2 利用者作成・編集モーダル

**レイアウト（作成時）**:

```
+----------------------------------+
| 利用者の新規登録                  |
+----------------------------------+
| 氏名 *                            |
| [入力フィールド]                  |
|                                   |
| 住所（訪問先）*                   |
| [テキストエリア]                  |
|                                   |
|           [キャンセル] [登録]     |
+----------------------------------+
```

**レイアウト（編集時）**:

```
+----------------------------------+
| 利用者情報の編集                  |
+----------------------------------+
| 氏名 *                            |
| [入力フィールド]                  |
|                                   |
| 住所（訪問先）*                   |
| [テキストエリア]                  |
|                                   |
| 契約ステータス                     |
| ● 契約中  ○ 中断中                |
|                                   |
| ⚠️ 契約を中断すると、この利用者は  |
| 新規スケジュール作成時に選択      |
| できなくなります                   |
|                                   |
|           [キャンセル] [保存]     |
+----------------------------------+
```

**daisyUI コンポーネント使用例**:

- モーダル: `modal`, `modal-box`
- フォーム: `form-control`, `label`, `input`, `textarea`
- ラジオボタン: `radio`, `radio-primary`
- バッジ: `badge`, `badge-success`, `badge-warning`
- アラート: `alert`, `alert-warning`
- ボタン: `btn`, `btn-primary`, `btn-ghost`
- テーブル: `table`, `table-zebra`
- タブ: `tabs`, `tab`, `tab-active`

### 4.2 ユーザーインタラクション

1. **一覧表示**:
   - デフォルトは「契約中」のみ表示
   - フィルター切り替えで「全て」「契約中」「中断中」を表示
   - データがない場合は「利用者がまだ登録されていません」と表示
   - 中断中の利用者は視覚的に目立つ表示（オレンジバッジ）

2. **新規登録**:
   - 「新規登録」ボタンクリック → モーダル表示
   - 必須項目入力 → 「登録」ボタンクリック
   - バリデーション成功 → データ作成 → モーダル閉じる → 一覧更新
   - 自動的に`contract_status: active`で作成

3. **編集**:
   - 「編集」ボタンクリック → モーダル表示（既存データ入力済み）
   - 編集 → 「保存」ボタンクリック
   - バリデーション成功 → データ更新 → モーダル閉じる → 一覧更新

4. **契約中断・再開**:
   - 編集モーダル内でラジオボタンで切り替え
   - 中断選択時は警告メッセージを表示
   - 保存時に専用APIを呼び出し

5. **削除機能**:
   - **提供しない**（記録保持のため）
   - 誤操作防止のためUIにも表示しない

### 4.3 エラーハンドリング

| エラーケース             | UI表示                                   |
| :----------------------- | :--------------------------------------- |
| 必須項目未入力           | フィールド下に赤文字でエラーメッセージ   |
| ネットワークエラー       | トーストで「通信エラーが発生しました」   |
| 権限エラー               | トーストで「この操作の権限がありません」 |
| 既に中断中の利用者を中断 | エラーにせず成功として扱う（冪等性）     |

---

## 5. バリデーション仕様

### 5.1 クライアントサイド（Zod）

```typescript
import { z } from 'zod';

export const clientSchema = z.object({
	name: z
		.string()
		.min(1, '氏名は必須です')
		.max(100, '氏名は100文字以内で入力してください')
		.refine((val) => val.trim().length > 0, '氏名に空白のみは使用できません'),
	address: z
		.string()
		.min(1, '住所は必須です')
		.max(200, '住所は200文字以内で入力してください')
		.refine((val) => val.trim().length > 0, '住所に空白のみは使用できません'),
});

export const contractStatusSchema = z.enum(['active', 'suspended']);

export type ClientInput = z.infer<typeof clientSchema>;
export type ContractStatus = z.infer<typeof contractStatusSchema>;
```

### 5.2 サーバーサイド

- Zod スキーマによる検証（クライアントと同じ）
- RLSポリシーによる事業所権限チェック
- 契約ステータス変更時の冪等性チェック

---

## 6. データベース操作（Repository層）

### 6.1 ClientRepository インターフェース

```typescript
export interface ClientRepository {
	/**
	 * 事業所の利用者一覧を取得
	 * @param officeId 事業所ID
	 * @param status フィルター（'active' | 'suspended' | 'all'）
	 * @returns 利用者の配列
	 */
	findAll(
		officeId: string,
		status?: 'active' | 'suspended' | 'all',
	): Promise<Client[]>;

	/**
	 * 利用者を1件取得
	 * @param id 利用者ID
	 * @returns 利用者 or null
	 */
	findById(id: string): Promise<Client | null>;

	/**
	 * 利用者を作成
	 * @param data 作成データ
	 * @returns 作成された利用者
	 */
	create(data: ClientCreateInput): Promise<Client>;

	/**
	 * 利用者を更新
	 * @param id 利用者ID
	 * @param data 更新データ
	 * @returns 更新された利用者
	 */
	update(id: string, data: ClientUpdateInput): Promise<Client>;

	/**
	 * 契約を中断
	 * @param id 利用者ID
	 * @returns 更新された利用者
	 */
	suspend(id: string): Promise<Client>;

	/**
	 * 契約を再開
	 * @param id 利用者ID
	 * @returns 更新された利用者
	 */
	resume(id: string): Promise<Client>;

	/**
	 * 契約中の利用者のみ取得（スケジュール作成用）
	 * @param officeId 事業所ID
	 * @returns 契約中の利用者の配列
	 */
	findActiveClients(officeId: string): Promise<Client[]>;
}
```

---

## 7. テスト仕様

### 7.1 単体テスト（Repository層）

**テストファイル**: `src/backend/repositories/ClientRepository.test.ts`

**テストケース**:

1. `findAll()`:
   - 正常系: 全件取得できる
   - 正常系: statusフィルターが機能する（active, suspended, all）
   - 正常系: 他の事業所のデータは含まれない

2. `findById()`:
   - 正常系: 指定IDのデータを取得できる
   - 正常系: 存在しないIDの場合nullを返す

3. `create()`:
   - 正常系: 新規作成できる（デフォルトでactive）
   - 異常系: 必須項目不足でエラー

4. `update()`:
   - 正常系: 氏名・住所を更新できる
   - 正常系: contract_statusは更新しない
   - 異常系: 存在しないIDでエラー

5. `suspend()`:
   - 正常系: activeからsuspendedに変更できる
   - 正常系: 既にsuspendedの場合も成功（冪等性）

6. `resume()`:
   - 正常系: suspendedからactiveに変更できる
   - 正常系: 既にactiveの場合も成功（冪等性）

7. `findActiveClients()`:
   - 正常系: activeの利用者のみ取得
   - 正常系: suspendedは含まれない

### 7.2 単体テスト（Component層）

**テストファイル**:

- `src/app/admin/clients/_components/ClientTable/ClientTable.test.tsx`
- `src/app/admin/clients/_components/ClientModal/ClientModal.test.tsx`
- `src/app/admin/clients/_components/StatusBadge/StatusBadge.test.tsx`

**テストケース（ClientTable）**:

1. データが表示される
2. ステータスバッジが正しく表示される
3. フィルター切り替えが機能する
4. データがない場合のメッセージ表示
5. 編集ボタンクリックでモーダルが開く

**テストケース（ClientModal）**:

1. 新規作成モードで空のフォームが表示される
2. 編集モードで既存データが入力済みで表示される
3. 編集モードで契約ステータス切り替えが表示される
4. 中断選択時に警告メッセージが表示される
5. バリデーションエラーが表示される
6. 保存ボタンクリックでデータが送信される

**テストケース（StatusBadge）**:

1. activeで「契約中」が表示される
2. suspendedで「中断中」が表示される
3. 適切なスタイルが適用される

---

## 8. 実装ステップ

### ステップ1: マイグレーションとシードデータ

- [x] マイグレーションファイル作成（`add_contract_status_to_clients.sql`）
- [x] マイグレーション適用確認
- [x] シードデータ更新（契約中・中断中の両パターン）

### ステップ2: 型定義とZodスキーマ

- [x] `Client` 型定義
- [x] `ContractStatus` 型定義
- [x] Zodスキーマ定義（`clientSchema`）
- [x] テスト作成・実行

### ステップ3: Repository層実装

- [x] `ClientRepository` インターフェース定義
- [x] Supabase実装クラス作成
- [x] 単体テスト作成・実行（TDD）

### ステップ4: API Route実装

- [x] GET `/api/clients` 実装
- [x] POST `/api/clients` 実装
- [x] PUT `/api/clients/:id` 実装
- [x] PATCH `/api/clients/:id/suspend` 実装
- [x] PATCH `/api/clients/:id/resume` 実装
- [x] APIテスト作成・実行

### ステップ5: UI Components実装

- [x] `StatusBadge` コンポーネント作成
- [x] `ClientFilterTabs` コンポーネント作成
- [x] `ClientTable` コンポーネント作成
- [x] `ClientModal` コンポーネント作成
- [x] Storybook作成
- [x] 単体テスト作成・実行

### ステップ6: ページ実装

- [x] `/admin/clients` ページ作成
- [x] データフェッチングとエラーハンドリング
- [x] ページテスト作成・実行

### ステップ7: 統合確認

- [x] ローカル環境での動作確認
- [x] 全テスト実行（`pnpm test:ut --run`）
- [x] Storybookでの表示確認

---

## 9. 完了条件

- [x] 利用者の一覧表示ができる（契約中・中断中のフィルタリング）
- [x] 利用者の新規登録ができる（デフォルトで契約中）
- [x] 利用者の編集ができる（氏名・住所）
- [x] 契約の中断・再開ができる
- [x] 削除機能は存在しない（UI・API共に）
- [x] 中断中の利用者が視覚的に識別できる
- [x] バリデーションが正しく機能する
- [x] 全ての単体テストが通過する
- [x] Storybookで各コンポーネントが正しく表示される
- [ ] 他の事業所のデータは表示・操作できない（RLS）

---

## 10. 備考

### 10.1 削除機能を提供しない理由

1. **コンプライアンス**: 介護記録は法的に一定期間の保存義務がある
2. **監査対応**: 過去の契約履歴を追跡可能にする必要がある
3. **データ整合性**: 関連するスケジュールやシフトデータの参照整合性を保つ
4. **誤操作防止**: 誤って削除してしまうリスクを排除

### 10.2 将来拡張の検討事項

- 利用者に複数の連絡先を紐付け（家族、ケアマネージャーなど）
- 利用者の詳細情報（生年月日、介護度、特記事項など）
- 契約履歴の記録（中断・再開の日時とメモ）
- 利用者のアーカイブ機能（長期間中断中のデータを別表示）
- 一括インポート機能（CSVなど）

### 10.3 関連ドキュメント

- [MVP定義](../MVP.md)
- [ビジネスエンティティ定義](../BusinessEntity.md)
- [実装ロードマップ](../mvp-implementation-roadmap.md)
