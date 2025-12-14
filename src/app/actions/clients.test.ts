import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  getClientsAction,
  createClientAction,
  updateClientAction,
  suspendClientAction,
  resumeClientAction,
} from "./clients";
import { createClient } from "@/utils/supabase/server";
import { ClientRepository } from "@/backend/repositories/clientRepository";

vi.mock("@/utils/supabase/server");
vi.mock("@/backend/repositories/clientRepository");

const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
};

const mockRepository = {
  findAll: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  suspend: vi.fn(),
  resume: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  (createClient as Mock).mockResolvedValue(mockSupabase);
  (ClientRepository as unknown as Mock).mockImplementation(function () {
    return mockRepository;
  });
});

describe("getClientsAction", () => {
  it("未認証の場合は401", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await getClientsAction();

    expect(result).toEqual({ data: null, error: "Unauthorized", status: 401 });
  });

  it("スタッフ未登録の場合は404", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null, error: new Error("not found") }) }),
      }),
    });

    const result = await getClientsAction();
    expect(result.status).toBe(404);
    expect(result.error).toBe("Staff not found");
  });

  it("不正なstatusは400", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { office_id: "office-1" }, error: null }) }),
      }),
    });

    const result = await getClientsAction("invalid" as any);
    expect(result.status).toBe(400);
    expect(result.error).toBe("Invalid status parameter");
  });

  it("利用者一覧を取得できる", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { office_id: "office-1" }, error: null }) }),
      }),
    });

    const mockClients = [
      {
        id: "client-1",
        name: "山田太郎",
        address: "東京都",
        contract_status: "active",
        office_id: "office-1",
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];

    mockRepository.findAll.mockResolvedValue(mockClients);

    const result = await getClientsAction("all");

    expect(mockRepository.findAll).toHaveBeenCalledWith("office-1", "all");
    expect(result).toEqual({ data: mockClients, error: null, status: 200 });
  });
});

describe("createClientAction", () => {
  it("未認証は401", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await createClientAction({ name: "", address: "" });
    expect(result.status).toBe(401);
  });

  it("管理者以外は403", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { office_id: "office-1", role: "staff" }, error: null }) }),
      }),
    });

    const result = await createClientAction({ name: "山田", address: "東京" });
    expect(result.status).toBe(403);
    expect(result.error).toBe("Forbidden");
  });

  it("バリデーションエラーは400", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { office_id: "office-1", role: "admin" }, error: null }) }),
      }),
    });

    const result = await createClientAction({ name: "", address: "" });
    expect(result.status).toBe(400);
    expect(result.error).toBe("Validation error");
    expect(result.details).toBeDefined();
  });

  it("正常作成できる", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { office_id: "office-1", role: "admin" }, error: null }) }),
      }),
    });

    const mockClient = {
      id: "client-1",
      name: "山田",
      address: "東京",
      contract_status: "active",
      office_id: "office-1",
      created_at: new Date(),
      updated_at: new Date(),
    };

    mockRepository.create.mockResolvedValue(mockClient);

    const result = await createClientAction({ name: "山田", address: "東京" });

    expect(mockRepository.create).toHaveBeenCalledWith({
      office_id: "office-1",
      name: "山田",
      address: "東京",
    });
    expect(result.status).toBe(201);
    expect(result.data).toEqual(mockClient);
  });
});

describe("updateClientAction", () => {
  it("未認証は401", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await updateClientAction("client-1", { name: "", address: "" });
    expect(result.status).toBe(401);
  });

  it("管理者以外は403", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { office_id: "office-1", role: "staff" }, error: null }) }),
      }),
    });

    const result = await updateClientAction("client-1", { name: "山田", address: "東京" });
    expect(result.status).toBe(403);
  });

  it("他事業所は403", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { office_id: "office-1", role: "admin" }, error: null }) }),
      }),
    });

    mockRepository.findById.mockResolvedValue({
      id: "client-1",
      name: "山田",
      address: "東京",
      contract_status: "active",
      office_id: "office-2",
      created_at: new Date(),
      updated_at: new Date(),
    });

    const result = await updateClientAction("client-1", { name: "山田", address: "東京" });
    expect(result.status).toBe(403);
  });

  it("バリデーションエラーは400", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { office_id: "office-1", role: "admin" }, error: null }) }),
      }),
    });

    mockRepository.findById.mockResolvedValue({
      id: "client-1",
      name: "山田",
      address: "東京",
      contract_status: "active",
      office_id: "office-1",
      created_at: new Date(),
      updated_at: new Date(),
    });

    const result = await updateClientAction("client-1", { name: "", address: "" });
    expect(result.status).toBe(400);
    expect(result.error).toBe("Validation error");
  });

  it("正常更新できる", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { office_id: "office-1", role: "admin" }, error: null }) }),
      }),
    });

    mockRepository.findById.mockResolvedValue({
      id: "client-1",
      name: "山田",
      address: "東京",
      contract_status: "active",
      office_id: "office-1",
      created_at: new Date(),
      updated_at: new Date(),
    });

    const mockUpdated = {
      id: "client-1",
      name: "更新",
      address: "大阪",
      contract_status: "active",
      office_id: "office-1",
      created_at: new Date(),
      updated_at: new Date(),
    };

    mockRepository.update.mockResolvedValue(mockUpdated);

    const result = await updateClientAction("client-1", { name: "更新", address: "大阪" });

    expect(mockRepository.update).toHaveBeenCalledWith("client-1", {
      name: "更新",
      address: "大阪",
    });
    expect(result.data).toEqual(mockUpdated);
    expect(result.status).toBe(200);
  });
});

describe("suspendClientAction", () => {
  it("管理者以外は403", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { office_id: "office-1", role: "staff" }, error: null }) }),
      }),
    });

    const result = await suspendClientAction("client-1");
    expect(result.status).toBe(403);
  });

  it("正常に中断できる", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { office_id: "office-1", role: "admin" }, error: null }) }),
      }),
    });

    mockRepository.findById.mockResolvedValue({
      id: "client-1",
      name: "山田",
      address: "東京",
      contract_status: "active",
      office_id: "office-1",
      created_at: new Date(),
      updated_at: new Date(),
    });

    const mockClient = {
      id: "client-1",
      name: "山田",
      address: "東京",
      contract_status: "suspended",
      office_id: "office-1",
      created_at: new Date(),
      updated_at: new Date(),
    };

    mockRepository.suspend.mockResolvedValue(mockClient);

    const result = await suspendClientAction("client-1");

    expect(mockRepository.suspend).toHaveBeenCalledWith("client-1");
    expect(result.data).toEqual(mockClient);
  });
});

describe("resumeClientAction", () => {
  it("正常に再開できる", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { office_id: "office-1", role: "admin" }, error: null }) }),
      }),
    });

    mockRepository.findById.mockResolvedValue({
      id: "client-1",
      name: "山田",
      address: "東京",
      contract_status: "suspended",
      office_id: "office-1",
      created_at: new Date(),
      updated_at: new Date(),
    });

    const mockClient = {
      id: "client-1",
      name: "山田",
      address: "東京",
      contract_status: "active",
      office_id: "office-1",
      created_at: new Date(),
      updated_at: new Date(),
    };

    mockRepository.resume.mockResolvedValue(mockClient);

    const result = await resumeClientAction("client-1");

    expect(mockRepository.resume).toHaveBeenCalledWith("client-1");
    expect(result.data).toEqual(mockClient);
  });
});
