# タスク: Google 認証の実装

## 前提条件

- Supabase プロジェクトで Google プロバイダーが有効化されていること。
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` が環境変数に設定されていること。

## ステップ

### 1. Supabase 設定 (手動)

- [x] Supabase Dashboard > Authentication > Providers > Google を有効化。
- [x] Client ID と Secret を設定。
- [x] Redirect URL に `http://localhost:3000/auth/callback` を追加。

### 2. ログインページの実装

- [x] `src/app/login/page.tsx` を作成。
- [x] `src/app/login/_components/LoginButton.tsx` を作成 (Client Component)。
  - `supabase.auth.signInWithOAuth()` を呼び出す。

### 3. 認証コールバックの実装

- [x] `src/app/auth/callback/route.ts` を作成。
  - Authorization Code Flow を実装 (`exchangeCodeForSession`).
  - ログイン成功後、`staffs` テーブルとの紐付け処理を実行 (Server Side)。
    - メールアドレスで検索。
    - `auth_user_id` を更新。
    - スタッフが見つからない場合はログアウトさせてエラー表示 (または専用のエラーページへ)。

### 4. ミドルウェアの実装

- [x] `src/middleware.ts` を作成。
  - `updateSession` (Supabase SSR) を使用してセッション管理。
  - ルート保護ロジックの実装。

### 5. ログアウト機能の実装

- [x] ヘッダーまたはサイドバーにログアウトボタンを配置。
  - `supabase.auth.signOut()` を呼び出す Server Action または Client Component。

### 6. 動作確認

- [x] 未ログイン状態でトップページにアクセス -> ログインページへリダイレクト。
- [x] Google ログイン実行 -> スタッフ登録済みならトップページへ。
- [x] スタッフ未登録のアカウントでログイン -> エラー画面へ。
