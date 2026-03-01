---
name: code-implement
description: React コンポーネントを作成するときのガイドライン
---

## 型安全性

- **`as any` 禁止**（UTでテスト上意味がない場合のみ例外）
- なるべく `as known as XXXX` での変換を避ける。技術的に難しい、実装が複雑になり分かりづらいときは例外として良い。
- Zodスキーマで I/O をバリデーションする

```typescript
// src/models/customer.ts パターン
export const CustomerSchema = z.object({
  id: z.number(),
  state: CustomerStateSchema.catch(DEFAULT_CUSTOMER_STATE),
  // ...
});
export type Customer = z.infer<typeof CustomerSchema>;

// ラベル・カラーは Record で管理
export const CUSTOMER_STATE_LABELS: Record<CustomerState, string> = { ... };
export const CUSTOMER_STATE_COLORS: Record<CustomerState, string> = { ... };
```

## eslint ルール

- `// eslint-disable-*` は原則禁止。やむを得ない場合は、開発者に **なぜルールを無効化する必要があるのか** を説明し、許可を得ること。

## 複雑性回避

- switch/if連続 → `Record` マップで置換
- 早期リターンでネスト回避
- 単一責任: 1コンポーネント = 1責務

## API通信パターン

`src/lib/api/` の構造:

- `core.ts`: 低レベルfetch、エラー判定
- `types.ts`: `ApiResponse<T>`, `AuthError` 等の型
- `{domain}.ts`: ドメイン別APIクライアント（customer, questionnaire等）

```typescript
// ApiResponse型を統一使用
type ApiResponse<T> = ApiSuccessResponse<T> | AuthError;
```

## 日付処理

`src/lib/dateUtils.ts` の `jst()` ラッパーを使用（SSR/CSRのTZ差異を吸収）:

```typescript
import { jst } from '@/lib/dateUtils';
const now = jst(); // 現在時刻（JST）
const date = jst('2025-12-02'); // JSTとして解釈
```

## React コンポーネント

### ファイル構成

各コンポーネントは **4ファイルセット** で `_components/` 配下に配置:

```
{ComponentName}/
├── {ComponentName}.tsx
├── {ComponentName}.spec.tsx   # Vitest + Testing Library
├── {ComponentName}.stories.tsx
└── index.ts
```

- Next.js の page.tsx, layout.tsx
  - 上記の形でなくて良い。また、それらは、Storybookは必要ない
  - テストは必要に応じて書く

### スタイリング: Tailwind CSS + daisyUI

- 動的スタイル生成を避け、ユーティリティクラスを使用
- daisyUI カラー（`primary`, `base-100` 等）でテーマ対応
- 参照: `.github/instructions/daisyui.instructions.md`

### スタイル

CSS は、TailwindCSS + daisyUI を導入している。

スタイルは、`global.css` 以外、CSSファイルでの実装は禁止し、TailwindCSS による `className` の指定でスタイルを適用する。

> 参考
>
> - [Tailwind CSS](https://tailwindcss.com/docs/installation/using-vite)
> - [daisyUI](https://daisyui.com/docs/intro/)

### Storybook での既存のコンポーネントの確認

- #tool:storybook-mcp を利用して、既存のコンポーネントの確認を行い、共通できるものは利用する。
- 汎化すると開発効率が上がる物があれば、ユーザーに提案する

### コンポーネント設計パターン

```tsx
// ✅ 定数・ヘルパーはコンポーネント外に配置
const STATUS_LABELS: Record<Status, string> = { ... };
const getTitle = (path: string) => { ... };
const containerClass = classNames('p-4', 'bg-base-100', ...); // クラス名が7~8個以上あるなど、長くなる場合

// ✅ Arrow Function + 明示的な型
const MyComponent: FC<Props> = ({ prop }) => {
  // 複雑なロジックはカスタムフックへ分離
  return <div>...</div>;
};
```

### フォーム

- フォームは、`react-hook-form` を使用して実装する
- ただし、コントロールの数が２つ程度の簡単なフォームは、`useState` 等で実装しても良い
- 参照: `.github/skills/create-react-component-vitest/SKILL.md`

## Git コミット規則

`CONTRIBUTING.md` を参照すること

## 関連 SKILL

- `code-implement`: コード実装のガイドライン
- `create-react-component-vitest`: React Component のテストを書くときのガイド
- `create-story`: React Component の Storybook の Story を書くときのガイド
- `create-viewst`: UT を書くときのガイド
