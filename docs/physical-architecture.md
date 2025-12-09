# 🏗️ 物理アーキテクチャ設計書 (Phase 1: Core Shift Management)

## 1. 全体方針

- **アーキテクチャパターン:** Serverless Monolith (Next.js App Router)
- **デプロイメント:** Vercel (Frontend & Serverless Functions) + Supabase (Database & Auth)
- **フェーズ定義:** 本構成は「AI 自動生成」および「プッシュ通知」を含まない、**管理機能と閲覧機能の確立**を目的とする。

## 2. コンポーネント構成

### A. Application Server (Next.js on Vercel)

UI 描画、認証ハンドリング、およびビジネスロジック（Server Actions）を集約する。

- **Framework:** Next.js (App Router)
- **Hosting:** Vercel
- **主な役割:**
  - **Helper UI (Mobile):** 自身のシフト閲覧、プロフィール確認。
  - **Admin UI (PC):** シフト作成・編集（D&D）、スタッフ管理、マスタデータ管理。
  - **Backend Logic:** Server Actions を使用し、API エンドポイントを明示的に作成せずに DB 操作を行う（Type safety の確保）。
  - **Auth Middleware:** Next.js Middleware を使用し、ページ遷移ごとのセッション検証とリダイレクト処理を行う。

### B. Database & Auth (Supabase)

データの永続化とアイデンティティ管理を担当。

- **Service:** Supabase (Managed PostgreSQL)
- **主な役割:**
  - **PostgreSQL:** リレーショナルデータの管理。
  - **Supabase Auth:** ユーザー管理（Sign up/in, Password reset）。
  - **Row Level Security (RLS):**
    - `shifts` テーブル等に対し、「`user_id` が一致する行のみ閲覧可能（ヘルパー）」、「全データの閲覧・編集可能（管理者）」といったポリシーを DB レベルで適用。
    - Next.js 側の実装ミスによるデータ漏洩を水際で防ぐ。

## 3. テクニカルスタック選定 (Phase 1)

| レイヤー      | 技術スタック                       | 選定理由 (Next.js Expert 視点)                                                                 |
| :------------ | :--------------------------------- | :--------------------------------------------------------------------------------------------- |
| **Language**  | TypeScript                         | 型安全性による保守性向上。DB 型定義は Supabase CLI で自動生成。                                |
| **Frontend**  | Next.js / Tailwind CSS / shadcn/ui | Server Components によるパフォーマンス最適化と、豊富なコンポーネント資産の活用。               |
| **State**     | React Server Components (RSC)      | クライアントサイドの状態管理（Redux 等）を極力排除し、サーバーから直接データを取得・描画する。 |
| **Backend**   | Server Actions                     | フォーム送信やデータ更新を関数として記述。BFF 層を薄く保つ。                                   |
| **ORM/Query** | Supabase JS Client (Type-safe)     | Prisma 等の ORM はオーバーヘッド回避のため一旦保留し、公式クライアントを採用。                 |

## 4. データフロー (基本 CRUD)

1.  **Request:** ユーザー（管理者）が画面上でシフトを変更し保存。
2.  **Action:** `Server Action` が発火。Vercel 上の Serverless Function が実行される。
3.  **Validation:** Zod 等で入力値を検証。
4.  **Auth/DB:** Supabase Client (Server-side) が Cookie 内のトークンを使って DB へリクエスト。
5.  **Policy:** PostgreSQL の RLS ポリシーが権限をチェックし、データを更新。
6.  **Revalidate:** 処理完了後、`revalidatePath` を実行し、キャッシュをパージして最新データを画面に反映。

## 5. 将来の拡張性 (Deferred Features)

本フェーズでは実装しないが、以下の接続を見越して設計する。

- **AI Logic:**
  - 将来、Python (FastAPI) 等の AI ワーカーを追加する際、Supabase への接続情報を共有するだけで連携可能。データ構造は「AI が計算しやすい正規化」を意識しておく。
- **Notifications:**
  - 将来、Supabase の `Database Webhooks` または `Edge Functions` をトリガーとして、メール配信 (Resend) やプッシュ通知を実装可能。. **View:** Main App が結果を受け取り、管理者の画面に「候補リスト」として表示。
