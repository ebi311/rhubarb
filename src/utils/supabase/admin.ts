import { createClient } from "@supabase/supabase-js";
import { Database } from "@/backend/types/supabase";

/**
 * Admin用Supabaseクライアント
 * Service Role Keyを使用するため、RLS (Row Level Security) をバイパスできる
 * 
 * 注意: このクライアントはサーバーサイドでのみ使用すること
 * クライアントサイドに露出させないこと
 */
export const createAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required"
    );
  }

  return createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};
