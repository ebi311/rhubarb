import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import {
  getClientsAction,
  createClientAction,
  updateClientAction,
  suspendClientAction,
  resumeClientAction,
} from "./clients";
import { createClient } from "@/utils/supabase/server";
import { ClientService, ServiceError } from "@/backend/services/clientService";

vi.mock("@/utils/supabase/server");
vi.mock("@/backend/services/clientService", async () => {
  const actual = await vi.importActual<typeof import("@/backend/services/clientService")>(
    "@/backend/services/clientService",
  );
  return {
    ...actual,
    ClientService: vi.fn(),
  };
});

const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
};

const mockService = {
  getClients: vi.fn(),
  createClient: vi.fn(),
  updateClient: vi.fn(),
  suspendClient: vi.fn(),
  resumeClient: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  (createClient as Mock).mockResolvedValue(mockSupabase);
  (ClientService as unknown as Mock).mockImplementation(function () {
    return mockService;
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
    mockService.getClients.mockRejectedValue(new ServiceError(404, "Staff not found"));

    const result = await getClientsAction();
    expect(result.status).toBe(404);
    expect(result.error).toBe("Staff not found");
  });

  it("不正なstatusは400", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    mockService.getClients.mockRejectedValue(new ServiceError(400, "Invalid status parameter"));

    const result = await getClientsAction("invalid" as any);
    expect(result.status).toBe(400);
    expect(result.error).toBe("Invalid status parameter");
  });

  it("利用者一覧を取得できる", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
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

    mockService.getClients.mockResolvedValue(mockClients);

    const result = await getClientsAction("all");

    expect(mockService.getClients).toHaveBeenCalledWith("user-1", "all");
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
    mockService.createClient.mockRejectedValue(new ServiceError(403, "Forbidden"));

    const result = await createClientAction({ name: "山田", address: "東京" });
    expect(result.status).toBe(403);
    expect(result.error).toBe("Forbidden");
  });

  it("バリデーションエラーは400", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    mockService.createClient.mockRejectedValue(new ServiceError(400, "Validation error", [1]));

    const result = await createClientAction({ name: "", address: "" });
    expect(result.status).toBe(400);
    expect(result.error).toBe("Validation error");
    expect(result.details).toBeDefined();
  });

  it("正常作成できる", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    const mockClient = {
      id: "client-1",
      name: "山田",
      address: "東京",
      contract_status: "active",
      office_id: "office-1",
      created_at: new Date(),
      updated_at: new Date(),
    };

    mockService.createClient.mockResolvedValue(mockClient);

    const result = await createClientAction({ name: "山田", address: "東京" });

    expect(mockService.createClient).toHaveBeenCalledWith("user-1", {
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
    mockService.updateClient.mockRejectedValue(new ServiceError(403, "Forbidden"));

    const result = await updateClientAction("client-1", { name: "山田", address: "東京" });
    expect(result.status).toBe(403);
  });

  it("他事業所は403", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    mockService.updateClient.mockRejectedValue(new ServiceError(403, "Forbidden"));

    const result = await updateClientAction("client-1", { name: "山田", address: "東京" });
    expect(result.status).toBe(403);
  });

  it("バリデーションエラーは400", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    mockService.updateClient.mockRejectedValue(new ServiceError(400, "Validation error", [1]));

    const result = await updateClientAction("client-1", { name: "", address: "" });
    expect(result.status).toBe(400);
    expect(result.error).toBe("Validation error");
  });

  it("正常更新できる", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    const mockUpdated = {
      id: "client-1",
      name: "更新",
      address: "大阪",
      contract_status: "active",
      office_id: "office-1",
      created_at: new Date(),
      updated_at: new Date(),
    };

    mockService.updateClient.mockResolvedValue(mockUpdated);

    const result = await updateClientAction("client-1", { name: "更新", address: "大阪" });

    expect(mockService.updateClient).toHaveBeenCalledWith("user-1", "client-1", {
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
    mockService.suspendClient.mockRejectedValue(new ServiceError(403, "Forbidden"));

    const result = await suspendClientAction("client-1");
    expect(result.status).toBe(403);
  });

  it("正常に中断できる", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    const mockClient = {
      id: "client-1",
      name: "山田",
      address: "東京",
      contract_status: "suspended",
      office_id: "office-1",
      created_at: new Date(),
      updated_at: new Date(),
    };

    mockService.suspendClient.mockResolvedValue(mockClient);

    const result = await suspendClientAction("client-1");

    expect(mockService.suspendClient).toHaveBeenCalledWith("user-1", "client-1");
    expect(result.data).toEqual(mockClient);
  });
});

describe("resumeClientAction", () => {
  it("正常に再開できる", async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    const mockClient = {
      id: "client-1",
      name: "山田",
      address: "東京",
      contract_status: "active",
      office_id: "office-1",
      created_at: new Date(),
      updated_at: new Date(),
    };

    mockService.resumeClient.mockResolvedValue(mockClient);

    const result = await resumeClientAction("client-1");

    expect(mockService.resumeClient).toHaveBeenCalledWith("user-1", "client-1");
    expect(result.data).toEqual(mockClient);
  });
});
