# Supabase のロールと RLS の仕組み

## PostgreSQL ロールの種類

Supabase では、以下の3つの PostgreSQL ロールが自動的に設定されています：

| ロール          | 説明                   | API Key                  | RLS          |
| --------------- | ---------------------- | ------------------------ | ------------ |
| `anon`          | 匿名（未認証）ユーザー | ANON_KEY（未ログイン時） | 適用される   |
| `authenticated` | 認証済みユーザー       | ANON_KEY（ログイン後）   | 適用される   |
| `service_role`  | 管理者（サーバー専用） | SERVICE_ROLE_KEY         | **バイパス** |

## ロールの決定タイミング

### 1. API Key によるロール設定

```typescript
// ケース1: 未認証状態（'anon' ロール）
const supabase = createClient(
	process.env.NEXT_PUBLIC_SUPABASE_URL!,
	process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, // ← 'anon' ロールで接続
);

// ケース2: ログイン後（'authenticated' ロールに自動変更）
await supabase.auth.signInWithPassword({ email, password });
// ↑ JWT トークンが Cookie に保存され、以降のリクエストで 'authenticated' ロール

// ケース3: Service Role（'service_role' ロール）
const adminClient = createClient(
	process.env.NEXT_PUBLIC_SUPABASE_URL!,
	process.env.SUPABASE_SERVICE_ROLE_KEY!, // ← 'service_role' ロール、RLS バイパス
);
```

### 2. リクエストごとの認証フロー

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. ブラウザから Next.js サーバーへリクエスト                    │
│    - Cookie に JWT トークンが含まれる                           │
└─────────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. Middleware が実行される (src/middleware.ts)                 │
│    - updateSession() が呼ばれる                                 │
└─────────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. Supabase Client が作成される                                 │
│    const supabase = createServerClient(URL, ANON_KEY, {...})    │
└─────────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. JWT トークンから認証状態を確認                               │
│    const { data: { user } } = await supabase.auth.getUser()     │
│    - JWT が有効 → 'authenticated' ロールで接続                  │
│    - JWT が無効/なし → 'anon' ロールで接続                      │
└─────────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. PostgreSQL で RLS ポリシーが評価される                       │
│    - auth.uid() = JWT の sub クレーム（ユーザーID）             │
│    - RLS ポリシーの条件が実行される                             │
└─────────────────────────────────────────────────────────────────┘
```

## 現在のプロジェクトでの実装

### ファイル構成

```
src/
├── middleware.ts              # すべてのリクエストで実行
├── utils/supabase/
│   ├── server.ts              # サーバーコンポーネント用（authenticated）
│   ├── client.ts              # クライアントコンポーネント用（authenticated）
│   ├── admin.ts               # サーバー専用（service_role）
│   └── middleware.ts          # セッション更新用
└── backend/
    └── services/
        └── authService.ts     # ログイン処理（admin.ts を使用）
```

### 1. Middleware での認証状態確認

**src/middleware.ts:**

```typescript
export async function middleware(request: NextRequest) {
	return await updateSession(request);
}
```

**src/utils/supabase/middleware.ts:**

```typescript
export async function updateSession(request: NextRequest) {
  // 1. Supabase Client を作成（ANON_KEY）
  const supabase = createServerClient(URL, ANON_KEY, { ... });

  // 2. Cookie の JWT トークンを検証
  const { data: { user } } = await supabase.auth.getUser();
  //    ↑ この時点で PostgreSQL に auth.uid() が設定される

  // 3. 認証状態に応じたリダイレクト
  if (!user && !request.nextUrl.pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}
```

**重要：** `auth.getUser()` を呼ぶと、内部的に以下が実行されます：

1. Cookie から JWT トークンを取得
2. JWT を検証（署名確認、有効期限確認）
3. PostgreSQL の `auth.uid()` に JWT の `sub`（ユーザーID）を設定
4. 以降の DB クエリで `auth.uid()` が使用可能になる

### 2. RLS ポリシーでの使用

**supabase/migrations/20251213090133_fix_staffs_rls_policy.sql:**

```sql
-- Helper function: 現在のユーザーが管理者かチェック
create or replace function public.is_admin_in_office(target_office_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from public.staffs
    where auth_user_id = auth.uid()  -- ← ここで JWT の sub が使われる
      and office_id = target_office_id
      and role = 'admin'
  );
$$;

-- RLS Policy: 管理者のみ閲覧可能
create policy "Admins can view staffs in their office"
on public.staffs
for select
to authenticated  -- ← 'authenticated' ロールのみ適用
using (
  public.is_admin_in_office(office_id)
);
```

### 3. auth.uid() の仕組み

`auth.uid()` は PostgreSQL の関数で、以下のように動作します：

```sql
-- Supabase が内部的に実行している
CREATE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE
AS $$
  SELECT
    coalesce(
      nullif(current_setting('request.jwt.claim.sub', true), ''),
      (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
    )::uuid;
$$;
```

**流れ：**

1. JWT トークンが PostgreSQL に渡される
2. JWT の `sub` クレーム（ユーザーID）が `request.jwt.claim.sub` に設定される
3. `auth.uid()` を呼ぶと、その値が返される

### 4. 3つのクライアントの使い分け

#### A. Server Client（認証済みユーザー）

```typescript
// src/utils/supabase/server.ts
import { createServerClient } from "@supabase/ssr";

export async function createClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, // ← authenticated ロール
    { cookies: { ... } }
  );
}
```

**使用場所：**

- Server Components
- Server Actions
- Route Handlers
- **ログイン後の通常のデータ取得**

**RLS：** 適用される（`auth.uid()` が有効）

#### B. Client Client（認証済みユーザー）

```typescript
// src/utils/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
	return createBrowserClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, // ← authenticated ロール
	);
}
```

**使用場所：**

- Client Components
- ブラウザでの操作

**RLS：** 適用される（`auth.uid()` が有効）

#### C. Admin Client（管理者）

```typescript
// src/utils/supabase/admin.ts
import { createClient } from '@supabase/supabase-js';

export const createAdminClient = () => {
	return createClient(
		process.env.NEXT_PUBLIC_SUPABASE_URL!,
		process.env.SUPABASE_SERVICE_ROLE_KEY!, // ← service_role ロール
		{
			auth: {
				autoRefreshToken: false,
				persistSession: false,
			},
		},
	);
};
```

**使用場所：**

- **ログイン前のユーザー情報取得**（authService）
- 管理者専用の操作
- バッチ処理

**RLS：** **バイパス**される（すべてのデータにアクセス可能）

⚠️ **重要：** クライアントサイドには絶対に露出させない！

## 実際の例：ログイン処理

### 問題があった実装

```typescript
// src/backend/services/authService.ts（修正前）
export class AuthService {
	constructor(private supabase: SupabaseClient<Database>) {
		// ANON_KEY を使用 → 'authenticated' ロール
		// しかし、ログイン直後は auth.uid() がまだ設定されていない
		this.staffRepository = new StaffRepository(supabase);
	}

	async handlePostLogin(email: string, authUserId: string): Promise<boolean> {
		// ❌ RLS ポリシーで弾かれる！
		// auth.uid() が null なので、is_admin_in_office() が false を返す
		const staff = await this.staffRepository.findByEmail(email);
		// → data = null になる
	}
}
```

### 修正後の実装

```typescript
// src/backend/services/authService.ts（修正後）
export class AuthService {
	constructor(private supabase: SupabaseClient<Database>) {
		// SERVICE_ROLE_KEY を使用 → 'service_role' ロール
		// RLS をバイパスできる
		const adminClient = createAdminClient();
		this.staffRepository = new StaffRepository(adminClient);
	}

	async handlePostLogin(email: string, authUserId: string): Promise<boolean> {
		// ✅ RLS をバイパスしてデータ取得可能
		const staff = await this.staffRepository.findByEmail(email);
		// → 正しくデータが返される
	}
}
```

## アプリケーションロール vs PostgreSQL ロール

### PostgreSQL ロール（Supabase が管理）

- `anon`
- `authenticated`
- `service_role`

これらは **接続時に自動的に決定** され、変更できません。

### アプリケーションロール（開発者が管理）

```sql
-- カスタムロールを enum で定義
create type public.user_role as enum ('admin', 'helper');

-- staffs テーブルに保存
create table public.staffs (
  role user_role not null default 'helper', -- ← アプリケーションロール
  ...
);
```

これは **DB のカラムとして保存** され、RLS ポリシーで使用できます。

### 使い分け

```sql
-- ✅ 正しい使い方
create policy "Admins can view staffs"
on public.staffs
for select
to authenticated                    -- ← PostgreSQL ロール（認証済みユーザー）
using (
  exists (
    select 1 from public.staffs
    where auth_user_id = auth.uid()
      and role = 'admin'            -- ← アプリケーションロール（管理者権限）
  )
);

-- ❌ 間違った使い方
to admin                            -- ← 'admin' という PostgreSQL ロールは存在しない
```

## デバッグ方法

### 1. 現在のロールを確認

```typescript
// ログに出力
const {
	data: { user },
} = await supabase.auth.getUser();
console.log('Current user:', user);
console.log('Auth UID:', user?.id);
```

### 2. PostgreSQL で確認

```sql
-- 現在の PostgreSQL ロール
SELECT current_user;
-- → 'authenticated' または 'anon' または 'service_role'

-- auth.uid() の値
SELECT auth.uid();
-- → ログイン済みなら UUID、未ログインなら NULL
```

### 3. RLS ポリシーをテスト

```sql
-- 特定のユーザーとしてクエリを実行
SET request.jwt.claim.sub = 'user-uuid-here';

-- クエリを実行してデータが取得できるか確認
SELECT * FROM public.staffs WHERE email = 'test@example.com';
```

## まとめ

| 項目                           | 内容                                                  |
| ------------------------------ | ----------------------------------------------------- |
| **ロールの決定**               | API Key によって自動的に決定される                    |
| **認証状態の保持**             | JWT トークン（Cookie）で保持される                    |
| **ロールの切り替えタイミング** | ログイン時に自動的に `anon` → `authenticated` に変更  |
| **auth.uid() の設定**          | `auth.getUser()` を呼ぶと JWT から設定される          |
| **RLS の評価**                 | すべての DB クエリで自動的に評価される                |
| **service_role の使用**        | サーバーサイドで RLS をバイパスする必要がある場合のみ |

**重要なポイント：**

1. 開発者が明示的にロールを設定する必要はない
2. API Key と JWT トークンで自動的に決定される
3. RLS ポリシーは PostgreSQL レベルで透過的に適用される
4. `auth.uid()` を使ってユーザー固有のデータアクセス制御ができる
