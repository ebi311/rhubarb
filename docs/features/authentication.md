# 認証機能

## 概要

Supabase Auth を使用した Google アカウントによる認証機能。
ユーザーは Google アカウントでログインし、`staffs` テーブルのレコードと紐付けられる。

## 技術仕様

### 認証プロバイダ

- Supabase Auth + Google OAuth

### 認証フロー

1. `/login` で「Google でログイン」ボタンをクリック
2. Supabase が Google OAuth 画面にリダイレクト
3. Google 認証後、`/auth/callback` にリダイレクト
4. コールバック処理でセッション確立

### スタッフ紐付け

```
認証成功
  ↓
メールアドレスで staffs テーブル検索
  ↓
┌─ 存在する ────────────────────┐
│  auth_user_id 未設定?          │
│  ├─ Yes → 紐付け実行           │
│  └─ No  → そのまま続行         │
│  → ダッシュボードへリダイレクト │
└───────────────────────────────┘
┌─ 存在しない ──────────────────┐
│  → エラー表示 + ログアウト     │
└───────────────────────────────┘
```

### ルート保護

- Middleware (`src/middleware.ts`) で保護
- 未認証ユーザー → `/login` にリダイレクト
- 認証済みユーザーが `/login` → `/` にリダイレクト

## データモデル

### staffs テーブル（認証関連カラム）

| カラム       | 型   | 説明                                 |
| ------------ | ---- | ------------------------------------ |
| auth_user_id | UUID | Supabase Auth の user.id（紐付け後） |
| email        | TEXT | Google アカウントのメールアドレス    |

## API / Server Actions

### `/auth/callback` (Route Handler)

- Supabase コールバック処理
- スタッフ紐付け処理
- リダイレクト制御

### `signOutAction()` (Server Action)

- セッション破棄
- `/login` へリダイレクト

## セキュリティ

- RLS は `auth.uid()` でアクセス制御
- 管理者: 自オフィスのデータを CRUD 可能
- ヘルパー: 自分の情報のみ閲覧可能

## 関連ファイル

- `src/middleware.ts` - ルート保護
- `src/app/auth/callback/route.ts` - OAuth コールバック
- `src/app/auth/actions.ts` - 認証関連 Server Actions
- `src/app/login/page.tsx` - ログイン画面

## 関連ユースケース

- [UC01: 認証](../use-cases/UC01-authentication.md)
