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
- **配置場所**:
  - 汎用的なもの: `src/app/_components`
  - ページ固有のもの: 各ページパス配下の `_components`

## 📝 ライセンス

[MIT](LICENSE)
