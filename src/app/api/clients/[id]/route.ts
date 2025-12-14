import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { ClientRepository } from "@/backend/repositories/clientRepository";
import { ClientInputSchema } from "@/models/client";

/**
 * PUT /api/clients/[id]
 * 利用者情報を更新
 * @body name - 氏名
 * @body address - 住所
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ユーザーの事業所IDとロールを取得
    const { data: staff, error: staffError } = await supabase
      .from("staffs")
      .select("office_id, role")
      .eq("auth_user_id", user.id)
      .single();

    if (staffError || !staff) {
      return NextResponse.json(
        { error: "Staff not found" },
        { status: 404 }
      );
    }

    // 管理者権限チェック
    if (staff.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 利用者が存在するか、かつ自分の事業所のものかをチェック
    const repository = new ClientRepository(supabase);
    const existingClient = await repository.findById(id);

    if (!existingClient) {
      return NextResponse.json(
        { error: "Client not found" },
        { status: 404 }
      );
    }

    if (existingClient.office_id !== staff.office_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // リクエストボディの取得とバリデーション
    const body = await request.json();
    const validation = ClientInputSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    // Repositoryを使用してデータ更新
    const client = await repository.update(id, validation.data);

    return NextResponse.json({ data: client, error: null });
  } catch (error) {
    console.error("PUT /api/clients/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
