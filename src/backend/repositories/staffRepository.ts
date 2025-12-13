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
    const { data, error } = await this.supabase
      .from("staffs")
      .select("*")
      .eq("email", email)
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
