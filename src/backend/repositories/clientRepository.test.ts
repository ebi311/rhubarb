import { describe, it, expect, beforeEach, vi } from "vitest";
import { ClientRepository } from "./clientRepository";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/backend/types/supabase";

describe("ClientRepository", () => {
  let supabase: SupabaseClient<Database>;
  let repository: ClientRepository;
  const testOfficeId = "019b179f-c74d-75ef-a328-55a8f65a0d8a";

  const mockClientRow = {
    id: "019b179f-c8ec-7098-a1d7-7d2dc84f4b8d",
    office_id: testOfficeId,
    name: "テスト 太郎",
    address: "東京都テスト区1-1-1",
    contract_status: "active" as const,
    created_at: "2025-12-13T10:00:00Z",
    updated_at: "2025-12-13T10:00:00Z",
  };

  const mockSuspendedClientRow = {
    ...mockClientRow,
    id: "019b179f-ca00-7291-bb3a-9f2e8c5d1a7b",
    name: "テスト 中断",
    contract_status: "suspended" as const,
  };

  beforeEach(() => {
    // Supabaseクライアントのモックを作成
    supabase = {
      from: vi.fn(),
    } as any;
    repository = new ClientRepository(supabase);
  });

  describe("findAll", () => {
    it("事業所の全利用者を取得できる", async () => {
      const mockData = [mockClientRow, mockSuspendedClientRow];
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({ data: mockData, error: null });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        order: mockOrder,
      });

      const clients = await repository.findAll(testOfficeId, "all");

      expect(supabase.from).toHaveBeenCalledWith("clients");
      expect(mockSelect).toHaveBeenCalledWith("*");
      expect(mockEq).toHaveBeenCalledWith("office_id", testOfficeId);
      expect(mockOrder).toHaveBeenCalledWith("name", { ascending: true });
      expect(clients).toHaveLength(2);
      expect(clients[0].name).toBe("テスト 太郎");
    });

    it("statusフィルターで契約中の利用者のみ取得できる", async () => {
      const mockData = [mockClientRow];
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockEq2 = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockReturnValue({
        eq: mockEq2,
      });

      mockEq2.mockResolvedValue({ data: mockData, error: null });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        order: mockOrder,
      });

      const clients = await repository.findAll(testOfficeId, "active");

      expect(mockEq).toHaveBeenCalledWith("office_id", testOfficeId);
      expect(mockOrder).toHaveBeenCalledWith("name", { ascending: true });
      expect(mockEq2).toHaveBeenCalledWith("contract_status", "active");
      expect(clients).toHaveLength(1);
      expect(clients[0].contract_status).toBe("active");
    });

    it("statusフィルターで中断中の利用者のみ取得できる", async () => {
      const mockData = [mockSuspendedClientRow];
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockEq2 = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockReturnValue({
        eq: mockEq2,
      });

      mockEq2.mockResolvedValue({ data: mockData, error: null });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        order: mockOrder,
      });

      const clients = await repository.findAll(testOfficeId, "suspended");

      expect(mockEq).toHaveBeenCalledWith("office_id", testOfficeId);
      expect(mockOrder).toHaveBeenCalledWith("name", { ascending: true });
      expect(mockEq2).toHaveBeenCalledWith("contract_status", "suspended");
      expect(clients).toHaveLength(1);
      expect(clients[0].contract_status).toBe("suspended");
    });

    it("データがない場合は空配列を返す", async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        order: mockOrder,
      });

      const clients = await repository.findAll(testOfficeId, "all");

      expect(clients).toEqual([]);
    });

    it("エラー時は例外をスローする", async () => {
      const mockError = new Error("Database error");
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockResolvedValue({ data: null, error: mockError });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        order: mockOrder,
      });

      await expect(repository.findAll(testOfficeId, "all")).rejects.toThrow(
        "Database error"
      );
    });
  });

  describe("findById", () => {
    it("指定IDの利用者を取得できる", async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: mockClientRow, error: null });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        maybeSingle: mockMaybeSingle,
      });

      const client = await repository.findById(mockClientRow.id);

      expect(supabase.from).toHaveBeenCalledWith("clients");
      expect(mockSelect).toHaveBeenCalledWith("*");
      expect(mockEq).toHaveBeenCalledWith("id", mockClientRow.id);
      expect(client).not.toBeNull();
      expect(client?.id).toBe(mockClientRow.id);
      expect(client?.name).toBe(mockClientRow.name);
    });

    it("存在しないIDの場合nullを返す", async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        maybeSingle: mockMaybeSingle,
      });

      const client = await repository.findById("00000000-0000-0000-0000-000000000000");

      expect(client).toBeNull();
    });
  });

  describe("create", () => {
    it("新規利用者を作成できる", async () => {
      const input = {
        office_id: testOfficeId,
        name: "テスト 太郎",
        address: "東京都テスト区1-1-1",
      };

      const mockInsert = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({ data: mockClientRow, error: null });

      (supabase.from as any).mockReturnValue({
        insert: mockInsert,
      });
      mockInsert.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        single: mockSingle,
      });

      const client = await repository.create(input);

      expect(supabase.from).toHaveBeenCalledWith("clients");
      expect(mockInsert).toHaveBeenCalledWith({
        office_id: input.office_id,
        name: input.name,
        address: input.address,
        contract_status: "active",
      });
      expect(client.id).toBeDefined();
      expect(client.name).toBe(input.name);
      expect(client.contract_status).toBe("active");
    });

    it("エラー時は例外をスローする", async () => {
      const input = {
        office_id: testOfficeId,
        name: "テスト 太郎",
        address: "東京都テスト区1-1-1",
      };

      const mockError = new Error("Insert failed");
      const mockInsert = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({ data: null, error: mockError });

      (supabase.from as any).mockReturnValue({
        insert: mockInsert,
      });
      mockInsert.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        single: mockSingle,
      });

      await expect(repository.create(input)).rejects.toThrow("Insert failed");
    });
  });

  describe("update", () => {
    it("利用者情報を更新できる", async () => {
      const updatedRow = {
        ...mockClientRow,
        name: "テスト 更新後",
        address: "東京都テスト区2-2-2",
      };

      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({ data: updatedRow, error: null });

      (supabase.from as any).mockReturnValue({
        update: mockUpdate,
      });
      mockUpdate.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        single: mockSingle,
      });

      const updated = await repository.update(mockClientRow.id, {
        name: "テスト 更新後",
        address: "東京都テスト区2-2-2",
      });

      expect(supabase.from).toHaveBeenCalledWith("clients");
      expect(mockUpdate).toHaveBeenCalledWith({
        name: "テスト 更新後",
        address: "東京都テスト区2-2-2",
      });
      expect(mockEq).toHaveBeenCalledWith("id", mockClientRow.id);
      expect(updated.name).toBe("テスト 更新後");
      expect(updated.address).toBe("東京都テスト区2-2-2");
    });

    it("エラー時は例外をスローする", async () => {
      const mockError = new Error("Update failed");
      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({ data: null, error: mockError });

      (supabase.from as any).mockReturnValue({
        update: mockUpdate,
      });
      mockUpdate.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        single: mockSingle,
      });

      await expect(
        repository.update(mockClientRow.id, {
          name: "テスト",
          address: "東京都テスト区",
        })
      ).rejects.toThrow("Update failed");
    });
  });

  describe("suspend", () => {
    it("activeからsuspendedに変更できる", async () => {
      const suspendedRow = {
        ...mockClientRow,
        contract_status: "suspended" as const,
      };

      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({ data: suspendedRow, error: null });

      (supabase.from as any).mockReturnValue({
        update: mockUpdate,
      });
      mockUpdate.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        single: mockSingle,
      });

      const suspended = await repository.suspend(mockClientRow.id);

      expect(mockUpdate).toHaveBeenCalledWith({ contract_status: "suspended" });
      expect(mockEq).toHaveBeenCalledWith("id", mockClientRow.id);
      expect(suspended.contract_status).toBe("suspended");
    });

    it("既にsuspendedの場合も成功する（冪等性）", async () => {
      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({ data: mockSuspendedClientRow, error: null });

      (supabase.from as any).mockReturnValue({
        update: mockUpdate,
      });
      mockUpdate.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        single: mockSingle,
      });

      const suspended = await repository.suspend(mockSuspendedClientRow.id);

      expect(suspended.contract_status).toBe("suspended");
    });
  });

  describe("resume", () => {
    it("suspendedからactiveに変更できる", async () => {
      const activeRow = {
        ...mockSuspendedClientRow,
        contract_status: "active" as const,
      };

      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({ data: activeRow, error: null });

      (supabase.from as any).mockReturnValue({
        update: mockUpdate,
      });
      mockUpdate.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        single: mockSingle,
      });

      const resumed = await repository.resume(mockSuspendedClientRow.id);

      expect(mockUpdate).toHaveBeenCalledWith({ contract_status: "active" });
      expect(mockEq).toHaveBeenCalledWith("id", mockSuspendedClientRow.id);
      expect(resumed.contract_status).toBe("active");
    });

    it("既にactiveの場合も成功する（冪等性）", async () => {
      const mockUpdate = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSelect = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({ data: mockClientRow, error: null });

      (supabase.from as any).mockReturnValue({
        update: mockUpdate,
      });
      mockUpdate.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        single: mockSingle,
      });

      const resumed = await repository.resume(mockClientRow.id);

      expect(resumed.contract_status).toBe("active");
    });
  });

  describe("findActiveClients", () => {
    it("契約中の利用者のみ取得できる", async () => {
      const mockData = [mockClientRow];
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockEq2 = vi.fn().mockReturnThis();
      const mockOrder = vi.fn().mockReturnValue({
        eq: mockEq2,
      });

      mockEq2.mockResolvedValue({ data: mockData, error: null });

      (supabase.from as any).mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({
        eq: mockEq,
      });
      mockEq.mockReturnValue({
        order: mockOrder,
      });

      const clients = await repository.findActiveClients(testOfficeId);

      expect(mockEq).toHaveBeenCalledWith("office_id", testOfficeId);
      expect(mockEq2).toHaveBeenCalledWith("contract_status", "active");
      expect(clients).toHaveLength(1);
      expect(clients[0].contract_status).toBe("active");
    });
  });
});
