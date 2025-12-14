import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { PATCH } from "./route";
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

describe("PATCH /api/clients/[id]/resume", () => {
  const mockSupabase = {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  };

  const mockRepository = {
    findById: vi.fn(),
    resume: vi.fn(),
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
      "http://localhost:3000/api/clients/client-1/resume",
      { method: "PATCH" }
    );

    await PATCH(request, { params: Promise.resolve({ id: "client-1" }) });

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
      "http://localhost:3000/api/clients/client-1/resume",
      { method: "PATCH" }
    );

    await PATCH(request, { params: Promise.resolve({ id: "client-1" }) });

    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: "Forbidden" },
      { status: 403 }
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
      "http://localhost:3000/api/clients/client-999/resume",
      { method: "PATCH" }
    );

    await PATCH(request, { params: Promise.resolve({ id: "client-999" }) });

    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: "Client not found" },
      { status: 404 }
    );
  });

  it("他の事業所の利用者は再開できない（403）", async () => {
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
      contractStatus: "suspended",
      officeId: "office-2", // 異なる事業所
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const request = new NextRequest(
      "http://localhost:3000/api/clients/client-1/resume",
      { method: "PATCH" }
    );

    await PATCH(request, { params: Promise.resolve({ id: "client-1" }) });

    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: "Forbidden" },
      { status: 403 }
    );
  });

  it("契約を正常に再開できる", async () => {
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
      contract_status: "suspended",
      office_id: "office-1",
      created_at: new Date(),
      updated_at: new Date(),
    });

    const mockResumedClient = {
      id: "client-1",
      name: "山田太郎",
      address: "東京都",
      contract_status: "active",
      office_id: "office-1",
      created_at: new Date(),
      updated_at: new Date(),
    };

    mockRepository.resume.mockResolvedValue(mockResumedClient);

    const request = new NextRequest(
      "http://localhost:3000/api/clients/client-1/resume",
      { method: "PATCH" }
    );

    await PATCH(request, { params: Promise.resolve({ id: "client-1" }) });

    expect(mockRepository.resume).toHaveBeenCalledWith("client-1");
    expect(NextResponse.json).toHaveBeenCalledWith({ data: mockResumedClient, error: null });
  });

  it("既に契約中の利用者も正常に処理できる（冪等性）", async () => {
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
      contract_status: "active", // 既に契約中
      office_id: "office-1",
      created_at: new Date(),
      updated_at: new Date(),
    });

    const mockClient = {
      id: "client-1",
      name: "山田太郎",
      address: "東京都",
      contract_status: "active",
      office_id: "office-1",
      created_at: new Date(),
      updated_at: new Date(),
    };

    mockRepository.resume.mockResolvedValue(mockClient);

    const request = new NextRequest(
      "http://localhost:3000/api/clients/client-1/resume",
      { method: "PATCH" }
    );

    await PATCH(request, { params: Promise.resolve({ id: "client-1" }) });

    expect(mockRepository.resume).toHaveBeenCalledWith("client-1");
    expect(NextResponse.json).toHaveBeenCalledWith({ data: mockClient, error: null });
  });
});
