import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { PUT } from "./route";
import { ClientRepository } from "@/backend/repositories/clientRepository";
import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// モック設定
vi.mock("@/utils/supabase/server");
vi.mock("@/backend/repositories/clientRepository");

// NextResponse.json のモック関数を事前に定義
const mockJsonFn = vi.hoisted(() => 
  vi.fn((body, init) => ({
    json: async () => body,
    status: init?.status || 200,
  }))
);

vi.mock("next/server", async () => {
  const actual = await vi.importActual("next/server");
  return {
    ...actual,
    NextResponse: {
      json: mockJsonFn,
    },
  };
});

describe("PUT /api/clients/[id]", () => {
  const mockSupabase = {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  };

  const mockRepository = {
    findById: vi.fn(),
    update: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (createClient as Mock).mockResolvedValue(mockSupabase);
    (ClientRepository as unknown as Mock).mockImplementation(function () {
      return mockRepository;
    });
  });

  it("未認証の場合は401を返す", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const request = new NextRequest(
      "http://localhost:3000/api/clients/client-1",
      {
        method: "PUT",
        body: JSON.stringify({ name: "更新太郎", address: "大阪府" }),
      }
    );

    await PUT(request, { params: Promise.resolve({ id: "client-1" }) });

    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: "Unauthorized" },
      { status: 401 }
    );
  });

  it("管理者以外は403を返す", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: "staff-1", office_id: "office-1", role: "staff" },
            error: null,
          }),
        }),
      }),
    });

    const request = new NextRequest(
      "http://localhost:3000/api/clients/client-1",
      {
        method: "PUT",
        body: JSON.stringify({ name: "更新太郎", address: "大阪府" }),
      }
    );

    await PUT(request, { params: Promise.resolve({ id: "client-1" }) });

    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: "Forbidden" },
      { status: 403 }
    );
  });

  it("バリデーションエラーの場合は400を返す", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: "staff-1", office_id: "office-1", role: "admin" },
            error: null,
          }),
        }),
      }),
    });

    mockRepository.findById.mockResolvedValue({
      id: "client-1",
      name: "山田太郎",
      address: "東京都",
      contract_status: "active",
      office_id: "office-1",
      created_at: new Date(),
      updated_at: new Date(),
    });

    const request = new NextRequest(
      "http://localhost:3000/api/clients/client-1",
      {
        method: "PUT",
        body: JSON.stringify({ name: "", address: "大阪府" }),
      }
    );

    await PUT(request, { params: Promise.resolve({ id: "client-1" }) });

    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "Validation error",
        details: expect.any(Array),
      }),
      { status: 400 }
    );
  });

  it("利用者が見つからない場合は404を返す", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: "staff-1", office_id: "office-1", role: "admin" },
            error: null,
          }),
        }),
      }),
    });

    mockRepository.findById.mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost:3000/api/clients/client-999",
      {
        method: "PUT",
        body: JSON.stringify({ name: "更新太郎", address: "大阪府" }),
      }
    );

    await PUT(request, { params: Promise.resolve({ id: "client-999" }) });

    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: "Client not found" },
      { status: 404 }
    );
  });

  it("他の事業所の利用者は更新できない（403）", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: "staff-1", office_id: "office-1", role: "admin" },
            error: null,
          }),
        }),
      }),
    });

    mockRepository.findById.mockResolvedValue({
      id: "client-1",
      name: "山田太郎",
      address: "東京都",
      contractStatus: "active",
      officeId: "office-2", // 異なる事業所
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const request = new NextRequest(
      "http://localhost:3000/api/clients/client-1",
      {
        method: "PUT",
        body: JSON.stringify({ name: "更新太郎", address: "大阪府" }),
      }
    );

    await PUT(request, { params: Promise.resolve({ id: "client-1" }) });

    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: "Forbidden" },
      { status: 403 }
    );
  });

  it("利用者を正常に更新できる", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: "staff-1", office_id: "office-1", role: "admin" },
            error: null,
          }),
        }),
      }),
    });

    mockRepository.findById.mockResolvedValue({
      id: "client-1",
      name: "山田太郎",
      address: "東京都",
      contract_status: "active",
      office_id: "office-1",
      created_at: new Date(),
      updated_at: new Date(),
    });

    const mockUpdatedClient = {
      id: "client-1",
      name: "更新太郎",
      address: "大阪府大阪市",
      contract_status: "active",
      office_id: "office-1",
      created_at: new Date(),
      updated_at: new Date(),
    };

    mockRepository.update.mockResolvedValue(mockUpdatedClient);

    const request = new NextRequest(
      "http://localhost:3000/api/clients/client-1",
      {
        method: "PUT",
        body: JSON.stringify({ name: "更新太郎", address: "大阪府大阪市" }),
      }
    );

    await PUT(request, { params: Promise.resolve({ id: "client-1" }) });

    expect(mockRepository.update).toHaveBeenCalledWith("client-1", {
      name: "更新太郎",
      address: "大阪府大阪市",
    });
    expect(NextResponse.json).toHaveBeenCalledWith({ data: mockUpdatedClient, error: null });
  });
});
