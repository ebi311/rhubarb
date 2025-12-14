import { SupabaseClient } from "@supabase/supabase-js";
import { ClientRepository } from "@/backend/repositories/clientRepository";
import { StaffRepository } from "@/backend/repositories/staffRepository";
import { ClientInputSchema, type Client, type ClientInput } from "@/models/client";
import { Database } from "@/backend/types/supabase";

export class ServiceError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

export type StatusFilter = "active" | "suspended" | "all";

export class ClientService {
  private clientRepository: ClientRepository;
  private staffRepository: StaffRepository;

  constructor(private supabase: SupabaseClient<Database>) {
    this.clientRepository = new ClientRepository(supabase);
    this.staffRepository = new StaffRepository(supabase);
  }

  private async getStaff(userId: string) {
    const staff = await this.staffRepository.findByAuthUserId(userId);
    if (!staff) throw new ServiceError(404, "Staff not found");
    return staff;
  }

  private async getAdminStaff(userId: string) {
    const staff = await this.getStaff(userId);
    if (staff.role !== "admin") throw new ServiceError(403, "Forbidden");
    return staff;
  }

  async getClients(userId: string, status: StatusFilter = "active"): Promise<Client[]> {
    const staff = await this.getStaff(userId);
    if (!["active", "suspended", "all"].includes(status)) {
      throw new ServiceError(400, "Invalid status parameter");
    }
    return this.clientRepository.findAll(staff.office_id, status);
  }

  async createClient(userId: string, input: ClientInput): Promise<Client> {
    const staff = await this.getAdminStaff(userId);
    const validation = ClientInputSchema.safeParse(input);
    if (!validation.success) {
      throw new ServiceError(400, "Validation error", validation.error.issues);
    }

    return this.clientRepository.create({
      office_id: staff.office_id,
      name: validation.data.name,
      address: validation.data.address,
    });
  }

  async updateClient(userId: string, id: string, input: ClientInput): Promise<Client> {
    const staff = await this.getAdminStaff(userId);
    const existing = await this.clientRepository.findById(id);
    if (!existing) throw new ServiceError(404, "Client not found");
    if (existing.office_id !== staff.office_id) throw new ServiceError(403, "Forbidden");

    const validation = ClientInputSchema.safeParse(input);
    if (!validation.success) {
      throw new ServiceError(400, "Validation error", validation.error.issues);
    }

    return this.clientRepository.update(id, validation.data);
  }

  async suspendClient(userId: string, id: string): Promise<Client> {
    const staff = await this.getAdminStaff(userId);
    const existing = await this.clientRepository.findById(id);
    if (!existing) throw new ServiceError(404, "Client not found");
    if (existing.office_id !== staff.office_id) throw new ServiceError(403, "Forbidden");

    return this.clientRepository.suspend(id);
  }

  async resumeClient(userId: string, id: string): Promise<Client> {
    const staff = await this.getAdminStaff(userId);
    const existing = await this.clientRepository.findById(id);
    if (!existing) throw new ServiceError(404, "Client not found");
    if (existing.office_id !== staff.office_id) throw new ServiceError(403, "Forbidden");

    return this.clientRepository.resume(id);
  }
}
