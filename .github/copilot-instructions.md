# Rhubarb Copilot Instructions

訪問介護事業所向けシフト管理 Web アプリ。日本語で応答すること。

## アーキテクチャ概要

レイヤードアーキテクチャを採用。データフローは以下の順序で流れる：

```
[Server Actions] → [Service] → [Repository] → [Supabase]
src/app/actions/   src/backend/services/   src/backend/repositories/
```

- **Server Actions** (`src/app/actions/`): `'use server'` を宣言。認証チェック後に Service を呼び出し、`ActionResult<T>` を返す
- **Service** (`src/backend/services/`): ビジネスロジック。Repository を DI で受け取り、`ServiceError` をスローしてエラーを通知
- **Repository** (`src/backend/repositories/`): Supabase クエリをカプセル化。Zod スキーマでドメインモデルに変換
- **Models** (`src/models/`): Zod スキーマでエンティティと Value Object を定義（例: staff.ts, valueObjects/）

## コーディングパターン

### ActionResult パターン（Server Actions の戻り値）

```typescript
// src/app/actions/utils/actionResult.ts を参照
export type ActionResult<T> = {
	data: T | null;
	error: string | null;
	status: number;
	details?: unknown;
};
```

クライアントでは `useActionResultHandler` フックでトースト通知と結果処理を統一：

```typescript
const { handleActionResult } = useActionResultHandler();
const result = await someAction();
handleActionResult(result, { successMessage: '保存しました', onSuccess: (data) => { ... } });
```

### ServiceError パターン（Service 層のエラー）

```typescript
// src/backend/services/basicScheduleService.ts の ServiceError を使用
throw new ServiceError(404, 'Staff not found');
throw new ServiceError(400, 'Validation error', zodError.issues);
```

### Zod スキーマによるバリデーション

- エンティティは `*Schema` で定義し、`z.infer<typeof *Schema>` で型を導出
- Action 用の入力・出力スキーマは `*ActionSchemas.ts` に分離（例: staffActionSchemas.ts）

## コマンド

```bash
pnpm dev              # 開発サーバー起動
pnpm test:ut --run    # ユニットテスト（単発実行）
pnpm test:storybook --run  # Storybook テスト
pnpm storybook        # Storybook 起動 (port 6006)
pnpm supa:start       # ローカル Supabase 起動
pnpm supa:reset       # Supabase リセット（マイグレーション再適用）
pnpm supa:types       # Supabase から型定義を生成 → src/backend/types/supabase.ts
pnpm format           # Prettier でフォーマット
```

## コンポーネント配置規則

コンポーネントは必ず **本体 + テスト + Storybook + index.ts** をセットで作成：

```
src/app/{path}/_components/{ComponentName}/
├── {ComponentName}.tsx           # コンポーネント本体
├── {ComponentName}.test.tsx      # Vitest + Testing Library (React)
├── {ComponentName}.stories.tsx   # Storybook ストーリー
└── index.ts                      # named export
```

- 汎用コンポーネント: `src/app/_components/`
- ページ固有: `src/app/{feature}/_components/`
- スタイル: Tailwind CSS + daisyUI

## 開発プロセス

1. 要件は `docs/MVP.md` を参照
2. ドキュメントは `docs/` に保存
3. **TDD**: テストを先に書き、最小限の実装で動作確認しながら進める
4. 関数は Arrow Function を原則使用（クラスメソッド除く）
5. `as any` は原則禁止（UT, Storybook で型が重要でない場合のみ例外）

## テストルール

### UUID の注意事項

- Zod v4 の `z.uuid()` は **RFC 4122/9562 準拠** を厳格にバリデーションする
- `aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee` のような非準拠 UUID はバリデーションエラーになる
- テストでは `src/test/helpers/testIds.ts` の `TEST_IDS` 定数または `createTestId()` を使用すること

```typescript
// ✅ OK: TEST_IDS を使用
import { TEST_IDS } from '@/test/helpers/testIds';
const clientId = TEST_IDS.CLIENT_1;

// ✅ OK: createTestId() で動的生成
import { createTestId } from '@/test/helpers/testIds';
const clientId = createTestId();

// ❌ NG: 非準拠の UUID リテラル
const clientId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
```

### テスト修正時の原則

1. エラーメッセージをそのまま対処せず、**変更した Props/型定義との整合性** を最初に確認する
2. モックオブジェクトは実際の型定義（Zod スキーマの `z.infer`）に合わせる
3. テストが3回連続で失敗したら、一度立ち止まって **エラーの根本原因を分析** してから修正する

## Git ルール

コミット前に `pnpm format` を実行。メッセージは日本語で：

```
feat: スタッフ一覧の検索機能を追加

サービス種別でのフィルタリングを実装。
```

プレフィックス: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

## Supabase 注意点

- RLS (Row Level Security) が有効。認証前のデータアクセスには Admin Client が必要
- マイグレーションは `supabase/migrations/` に追加（ファイル名: `{timestamp}_{description}.sql`）
- トラブル時は `docs/troubleshooting/supabase-rls-debugging.md` を参照

## ライブラリ

- 日付操作: Day.js
- フォーム: react-hook-form + @hookform/resolvers (Zod)
- 通知: react-toastify
- コピーレフトライセンスのライブラリは使用禁止
