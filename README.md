# （仮称）シンプル・シフト・AI アシスタント

訪問介護事業所向けのシフト管理 Web アプリケーションです。
「予定のすっぽかし」と「変更時の調整負担」を解消し、現場管理者の作業効率化を支援します。

## 📖 プロダクト概要

20 名程度のヘルパーを抱える在宅介護事業所をターゲットとしています。
既存の高機能システムから切り離された、**AI による変更調整の容易性**に特化したシンプルで使いやすいツールを目指しています。

詳細な仕様は `docs/` ディレクトリを参照してください。

- [MVP 定義](docs/MVP.md)
- [物理アーキテクチャ](docs/physical-architecture.md)
- [モジュール構造](docs/module-structure.md)

## ✨ 主な機能 (MVP)

1.  **予定の一元化と見える化**
    - 基本スケジュールの一括登録
    - ヘルパー向けリアルタイム・マイカレンダー（スマホ対応）
    - 管理者向けビュー切り替え（担当者別 / 利用者別）

2.  **週間・月間予定の作成と変更の容易性**
    - ドラッグ＆ドロップによる直感的な変更登録
    - 変更内容のヘルパーへの自動通知

3.  **AI による変更調整の指示**
    - 欠員発生時の AI 代行者シミュレーション
    - 負荷バランサー警告

## 🛠️ 技術スタック

- **Frontend / Backend**: [Next.js](https://nextjs.org/) (App Router), [React Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/), [daisyUI](https://daisyui.com/)
- **Database & Auth**: [Supabase](https://supabase.com/)
- **Hosting**: [Vercel](https://vercel.com/)
- **Testing**: [Vitest](https://vitest.dev/), [Testing Library](https://testing-library.com/)

## 🚀 開発環境のセットアップ

### 前提条件

- Node.js (LTS 推奨)
- pnpm

### インストール

```bash
pnpm install
```

### 開発サーバーの起動

```bash
pnpm dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いて確認してください。

### テストの実行

```bash
pnpm test:ut --run
```

## 📂 ディレクトリ構成

```text
src/
├── app/                   # Next.js App Router
│   ├── _components/       # アプリケーション全体で利用する汎用コンポーネント
│   │   └── hooks/         # 汎用的な Custom Hooks
│   ├── _servers/          # アプリケーション全体で利用する Server Actions
│   ├── [feature]/
│   │   ├── _components/   # 各ページ/機能固有のコンポーネント
│   │   └── server.ts      # 各ページ/機能固有の Server Actions
│   └── ...
├── backend/               # バックエンドビジネスロジック（ビジネスコンテキストごとに分割）
├── models/                # ビジネスエンティティスキーマ (Zod)
└── utils/                 # 汎用ユーティリティ（非 React）
docs/                      # 設計ドキュメント
supabase/                  # Supabase 設定ファイル
```

### コンポーネントの配置ルール

- **構成単位**: コンポーネント本体、テスト、Storybook をセットとし、コンポーネント名のディレクトリに格納する。

````text
```text
# コンポーネント配置テンプレート（ツリー）

src/
└── app/
  ├── _components/                         # アプリ全体で使う汎用コンポーネント群
  │   └── {ComponentName}/
  │       ├── {ComponentName}.tsx          # コンポーネント本体（Arrow Function 原則）
  │       ├── {ComponentName}.stories.tsx  # Storybook ストーリー
  │       ├── {ComponentName}.test.tsx     # Vitest + Testing Library のユニットテスト
  │       ├── index.ts                     # named export（import 重複回避）
  │       ├── types.ts                     # 型定義（必要な場合）
  │       └── subcomponents/               # サブ責務はサブコンポーネントに分割
  │           └── {SubComponent}/
  │               ├── {SubComponent}.tsx
  │               ├── {SubComponent}.test.tsx
  │               └── index.ts
  │
  ├── [feature]/                           # 機能／ページ単位のディレクトリ例
  │   ├── page.tsx
  │   └── _components/                     # ページ固有コンポーネント
  │       └── {PageComponent}/
  │           ├── {PageComponent}.tsx
  │           ├── {PageComponent}.stories.tsx
  │           ├── {PageComponent}.test.tsx
  │           └── index.ts
  │
  └── ...                                  # その他ページ／機能

# 備考（ルールの要点）
- コンポーネントごとに「実装 / stories / test / index」をセットで配置する。
- Storybook は {ComponentName}.stories.tsx に保存する。
- テストは {ComponentName}.test.tsx（Vitest + Testing Library）。
- 汎用コンポーネントは src/app/_components、ページ固有は該当ページ配下の _components に配置する。
- サブ責務がある場合は subcomponents フォルダで分割する。
- 実装は TypeScript の厳密な型付けを行い、Arrow Function を原則として使用する。
````

````

- **配置場所**:
  - 汎用的なもの: `src/app/_components`
  - ページ固有のもの: 各ページパス配下の `_components`

## 📝 ライセンス

[MIT](LICENSE)

## 🔔 Copilot Chat Hooks 完了通知（Pushover）

`copilot chat` の完了 Hook からスマートフォン通知するためのスクリプトを追加しています。

```bash
chmod +x scripts/copilot-hook-pushover.sh
export PUSHOVER_APP_TOKEN="your_app_token"
export PUSHOVER_USER_KEY="your_user_key"
````

Hook の完了イベントで `scripts/copilot-hook-pushover.sh` を実行するよう設定してください。  
任意で `PUSHOVER_TITLE` / `PUSHOVER_DEVICE` / `PUSHOVER_PRIORITY` / `PUSHOVER_SOUND` も指定できます。
