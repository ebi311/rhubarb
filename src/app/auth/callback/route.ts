import { createSupabaseClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { AuthService } from "@/backend/services/authService";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // 認証成功後、スタッフとの紐付け処理を行う
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user && user.email) {
        const authService = new AuthService(supabase);
        const isSuccess = await authService.handlePostLogin(
          user.email,
          user.id
        );

        if (isSuccess) {
          return NextResponse.redirect(`${origin}${next}`);
        } else {
          // スタッフが見つからない場合、ログアウトさせてエラー画面へ
          await supabase.auth.signOut();
          return NextResponse.redirect(`${origin}/login?error=unauthorized`);
        }
      }
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
