import { SupabaseClient } from "@supabase/supabase-js";
import { Staff, StaffSchema } from "@/models/staff";
import { Database } from "@/backend/types/supabase";

type StaffRow = Database["public"]["Tables"]["staffs"]["Row"];

export class StaffRepository {
  constructor(private supabase: SupabaseClient<Database>) {}

  private toDomain(row: StaffRow): Staff {
    return StaffSchema.parse({
      ...row,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
    });
  }

  async findByEmail(email: string): Promise<Staff | null> {
    // デバッグ用: 実行されるクエリの情報を出力
    console.log("=== findByEmail Debug ===");
    console.log("Looking for email:", email);
    console.log("Supabase client auth state:", await this.supabase.auth.getUser());
    
    const { data, error, status } = await this.supabase
      .from("staffs")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    console.log("findByEmail result:", { 
      data, 
      error: error ? {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      } : null, 
      status 
    });
    
    if (error) throw error;
    if (!data) return null;

    return this.toDomain(data);
  }

  async findByAuthUserId(authUserId: string): Promise<Staff | null> {
    const { data, error } = await this.supabase
      .from("staffs")
      .select("*")
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return this.toDomain(data);
  }

  async updateAuthUserId(id: string, authUserId: string): Promise<void> {
    const { error } = await this.supabase
      .from("staffs")
      .update({ auth_user_id: authUserId })
      .eq("id", id);

    if (error) throw error;
  }
}
