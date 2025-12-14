# Supabase RLS と認証のトラブルシューティング

## 問題: データが存在するのに null が返される

### 症状

- DB に存在するデータを `email` で検索しているのに `data = null` となる
- エラーは発生しない (error も null)
- status は 200 または 406

### よくある原因

#### 1. RLS (Row Level Security) ポリシーの制約

**問題:**

- `staffs` テーブルに RLS ポリシーが設定されている
- 現在の認証コンテキストでは該当ポリシーが許可していない

**確認方法:**

```typescript
// 認証状態を確認
const { data: { user } } = await supabase.auth.getUser();
console.log('Current user:', user);
```

**解決方法:**

- **ログイン処理など、認証前にアクセスが必要な場合**: Service Role Key を使用
- **通常の認証後の処理**: 適切なポリシーを設定

#### 2. 認証コンテキストの問題

**ログイン直後の処理で発生しやすい問題:**

- OAuth コールバック処理中は認証状態が確立していない可能性がある
- セッションが完全に確立する前にクエリを実行している

**解決方法:**

```typescript
// authService.ts で Admin Client を使用
import { createAdminClient } from "@/utils/supabase/admin";

const adminClient = createAdminClient();
const staffRepository = new StaffRepository(adminClient);
```

### デバッグ方法

#### 1. 詳細なログを追加

```typescript
console.log("=== Query Debug ===");
console.log("Email:", email);
console.log("Auth state:", await supabase.auth.getUser());

const { data, error, status } = await supabase
  .from("staffs")
  .select("*")
  .eq("email", email)
  .maybeSingle();

console.log("Result:", {
  data,
  error: error ? {
    message: error.message,
    details: error.details,
    hint: error.hint,
    code: error.code
  } : null,
  status
});
```

#### 2. Supabase Studio でクエリログを確認

1. https://supabase.com/dashboard にアクセス
2. プロジェクトを選択
3. **Logs** → **Postgres Logs**
4. 実際に実行された SQL を確認

#### 3. RLS ポリシーを一時的に無効化してテスト

```sql
-- 開発環境でのみ実行すること!
ALTER TABLE public.staffs DISABLE ROW LEVEL SECURITY;

-- テスト後は必ず有効化
ALTER TABLE public.staffs ENABLE ROW LEVEL SECURITY;
```

#### 4. psql で直接クエリを実行

```bash
# Supabase CLI を使用
supabase db psql

-- クエリを実行
SELECT * FROM public.staffs WHERE email = 'test@example.com';
```

### Service Role Key の使用

#### いつ使うべきか

- サーバーサイドでのみ実行される処理
- 認証前にユーザー情報を取得する必要がある場合
- 管理者権限が必要な操作

#### 使ってはいけない場合

- クライアントサイドのコード
- ブラウザに露出する可能性のあるコード

#### 実装例

```typescript
// utils/supabase/admin.ts
import { createClient } from "@supabase/supabase-js";

export const createAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Missing environment variables");
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};
```

### 環境変数の設定

`.env.local` ファイルに追加:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Service Role Key の取得方法:**

1. Supabase Dashboard → Settings → API
2. "Project API keys" セクション
3. `service_role` の `secret` をコピー

### セキュリティのベストプラクティス

1. **Service Role Key は絶対にクライアントサイドに露出させない**
2. **Server Actions や API Routes でのみ使用**
3. **環境変数に保存し、バージョン管理にコミットしない**
4. **必要最小限の場所でのみ使用**
5. **本番環境では適切な RLS ポリシーを設定**

## チェックリスト

データが取得できない場合、以下を確認:

- [ ] テーブルに該当データが存在するか (Supabase Studio で確認)
- [ ] RLS が有効になっているか
- [ ] 現在の認証状態 (user が null でないか)
- [ ] RLS ポリシーの条件を満たしているか
- [ ] ログイン処理の場合、Service Role Key を使用しているか
- [ ] 環境変数が正しく設定されているか
