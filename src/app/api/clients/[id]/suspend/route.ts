import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { ClientRepository } from "@/backend/repositories/clientRepository";

/**
 * PATCH /api/clients/[id]/suspend
 * 契約を中断
 */
export async function PATCH(
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

    // Repositoryを使用して契約中断
    const client = await repository.suspend(id);

    return NextResponse.json({ data: client, error: null });
  } catch (error) {
    console.error("PATCH /api/clients/[id]/suspend error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
