import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { GET, POST } from "./route";
import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { ClientRepository } from "@/backend/repositories/clientRepository";

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



describe("GET /api/clients", () => {
  const mockSupabase = {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  };

  const mockRepository = {
    findAll: vi.fn(),
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

    const request = new NextRequest("http://localhost:3000/api/clients");
    await GET(request);

    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: "Unauthorized" },
      { status: 401 }
    );
  });

  it("スタッフが見つからない場合は403を返す", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: "Not found" },
          }),
        }),
      }),
    });

    const request = new NextRequest("http://localhost:3000/api/clients");
    await GET(request);

    expect(NextResponse.json).toHaveBeenCalledWith(
      { error: "Staff not found" },
      { status: 404 }
    );
  });

  it("利用者一覧を正常に取得できる", async () => {
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

    const mockClients = [
      {
        id: "client-1",
        name: "山田太郎",
        address: "東京都",
        contractStatus: "active",
        officeId: "office-1",
        createdAt: new Date("2025-12-14"),
        updatedAt: new Date("2025-12-14"),
      },
    ];

    mockRepository.findAll.mockResolvedValue(mockClients);

    const request = new NextRequest("http://localhost:3000/api/clients");
    await GET(request);

    expect(mockRepository.findAll).toHaveBeenCalledWith("office-1", "active");
    expect(NextResponse.json).toHaveBeenCalledWith({ data: mockClients, error: null });
  });

  it("status=activeで契約中のみ取得できる", async () => {
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

    mockRepository.findAll.mockResolvedValue([]);

    const request = new NextRequest(
      "http://localhost:3000/api/clients?status=active"
    );
    await GET(request);

    expect(mockRepository.findAll).toHaveBeenCalledWith("office-1", "active");
    expect(NextResponse.json).toHaveBeenCalledWith({ data: expect.any(Array), error: null });
  });

  it("status=suspendedで中断中のみ取得できる", async () => {
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

    mockRepository.findAll.mockResolvedValue([]);

    const request = new NextRequest(
      "http://localhost:3000/api/clients?status=suspended"
    );
    await GET(request);

    expect(mockRepository.findAll).toHaveBeenCalledWith("office-1", "suspended");
    expect(NextResponse.json).toHaveBeenCalledWith({ data: expect.any(Array), error: null });
  });
});

describe("POST /api/clients", () => {
  const mockSupabase = {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  };

  const mockRepository = {
    create: vi.fn(),
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

    const request = new NextRequest("http://localhost:3000/api/clients", {
      method: "POST",
      body: JSON.stringify({ name: "テスト太郎", address: "東京都" }),
    });

    await POST(request);

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

    const request = new NextRequest("http://localhost:3000/api/clients", {
      method: "POST",
      body: JSON.stringify({ name: "テスト太郎", address: "東京都" }),
    });

    await POST(request);

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

    const request = new NextRequest("http://localhost:3000/api/clients", {
      method: "POST",
      body: JSON.stringify({ name: "", address: "東京都" }),
    });

    await POST(request);

    expect(NextResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "Validation error",
        details: expect.any(Array),
      }),
      { status: 400 }
    );
  });

  it("利用者を正常に作成できる", async () => {
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

    const mockClient = {
      id: "client-1",
      name: "テスト太郎",
      address: "東京都渋谷区",
      contractStatus: "active",
      officeId: "office-1",
      createdAt: new Date("2025-12-14"),
      updatedAt: new Date("2025-12-14"),
    };

    mockRepository.create.mockResolvedValue(mockClient);

    const request = new NextRequest("http://localhost:3000/api/clients", {
      method: "POST",
      body: JSON.stringify({ name: "テスト太郎", address: "東京都渋谷区" }),
    });

    await POST(request);

    expect(mockRepository.create).toHaveBeenCalledWith({
      name: "テスト太郎",
      address: "東京都渋谷区",
      office_id: "office-1",
    });
    expect(NextResponse.json).toHaveBeenCalledWith(
      { data: mockClient, error: null },
      { status: 201 }
    );
  });
});
