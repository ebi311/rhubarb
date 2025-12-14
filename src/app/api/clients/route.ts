import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { ClientRepository } from "@/backend/repositories/clientRepository";
import { ClientInputSchema } from "@/models/client";

/**
 * GET /api/clients
 * 利用者一覧を取得
 * @query status - フィルター（active | suspended | all）デフォルト: active
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ユーザーの事業所IDを取得
    const { data: staff, error: staffError } = await supabase
      .from("staffs")
      .select("office_id")
      .eq("auth_user_id", user.id)
      .single();

    if (staffError || !staff) {
      return NextResponse.json(
        { error: "Staff not found" },
        { status: 404 }
      );
    }

    // クエリパラメータからstatusを取得
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status") || "active";

    // statusの検証
    if (!["active", "suspended", "all"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status parameter" },
        { status: 400 }
      );
    }

    // Repositoryを使用してデータ取得
    const repository = new ClientRepository(supabase);
    const clients = await repository.findAll(
      staff.office_id,
      status as "active" | "suspended" | "all"
    );

    return NextResponse.json({ data: clients, error: null });
  } catch (error) {
    console.error("GET /api/clients error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/clients
 * 利用者を作成
 * @body name - 氏名
 * @body address - 住所
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

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

    // Repositoryを使用してデータ作成
    const repository = new ClientRepository(supabase);
    const client = await repository.create({
      office_id: staff.office_id,
      name: validation.data.name,
      address: validation.data.address,
    });

    return NextResponse.json({ data: client, error: null }, { status: 201 });
  } catch (error) {
    console.error("POST /api/clients error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
