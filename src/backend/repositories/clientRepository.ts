import { SupabaseClient } from "@supabase/supabase-js";
import { Client, ClientSchema, ClientInput } from "@/models/client";
import { Database } from "@/backend/types/supabase";

type ClientRow = Database["public"]["Tables"]["clients"]["Row"];
type ClientInsert = Database["public"]["Tables"]["clients"]["Insert"];
type ClientUpdate = Database["public"]["Tables"]["clients"]["Update"];

export class ClientRepository {
  constructor(private supabase: SupabaseClient<Database>) {}

  private toDomain(row: ClientRow): Client {
    return ClientSchema.parse({
      ...row,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
    });
  }

  /**
   * 事業所の利用者一覧を取得
   * @param officeId 事業所ID
   * @param status フィルター（'active' | 'suspended' | 'all'）
   * @returns 利用者の配列
   */
  async findAll(
    officeId: string,
    status: "active" | "suspended" | "all" = "active"
  ): Promise<Client[]> {
    let query = this.supabase
      .from("clients")
      .select("*")
      .eq("office_id", officeId)
      .order("name", { ascending: true });

    if (status !== "all") {
      query = query.eq("contract_status", status);
    }

    const { data, error } = await query;

    if (error) throw error;
    if (!data) return [];

    return data.map((row) => this.toDomain(row));
  }

  /**
   * 利用者を1件取得
   * @param id 利用者ID
   * @returns 利用者 or null
   */
  async findById(id: string): Promise<Client | null> {
    const { data, error } = await this.supabase
      .from("clients")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return this.toDomain(data);
  }

  /**
   * 利用者を作成
   * @param data 作成データ
   * @returns 作成された利用者
   */
  async create(data: {
    office_id: string;
    name: string;
    address: string;
  }): Promise<Client> {
    const insertData: ClientInsert = {
      office_id: data.office_id,
      name: data.name,
      address: data.address,
      contract_status: "active", // デフォルトで契約中
    };

    const { data: created, error } = await this.supabase
      .from("clients")
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;
    if (!created) throw new Error("Failed to create client");

    return this.toDomain(created);
  }

  /**
   * 利用者を更新
   * @param id 利用者ID
   * @param data 更新データ
   * @returns 更新された利用者
   */
  async update(id: string, data: ClientInput): Promise<Client> {
    const updateData: ClientUpdate = {
      name: data.name,
      address: data.address,
      // contract_statusは専用メソッド（suspend/resume）でのみ更新
    };

    const { data: updated, error } = await this.supabase
      .from("clients")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    if (!updated) throw new Error("Client not found");

    return this.toDomain(updated);
  }

  /**
   * 契約を中断
   * @param id 利用者ID
   * @returns 更新された利用者
   */
  async suspend(id: string): Promise<Client> {
    const { data: updated, error } = await this.supabase
      .from("clients")
      .update({ contract_status: "suspended" })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    if (!updated) throw new Error("Client not found");

    return this.toDomain(updated);
  }

  /**
   * 契約を再開
   * @param id 利用者ID
   * @returns 更新された利用者
   */
  async resume(id: string): Promise<Client> {
    const { data: updated, error } = await this.supabase
      .from("clients")
      .update({ contract_status: "active" })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    if (!updated) throw new Error("Client not found");

    return this.toDomain(updated);
  }

  /**
   * 契約中の利用者のみ取得（スケジュール作成用）
   * @param officeId 事業所ID
   * @returns 契約中の利用者の配列
   */
  async findActiveClients(officeId: string): Promise<Client[]> {
    return this.findAll(officeId, "active");
  }
}
