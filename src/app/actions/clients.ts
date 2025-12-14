"use server";

import { createClient } from "@/utils/supabase/server";
import { ClientRepository } from "@/backend/repositories/clientRepository";
import {
  ClientInputSchema,
  type ClientInput,
  type Client,
} from "@/models/client";

export type ActionResult<T> = {
  data: T | null;
  error: string | null;
  status: number;
  details?: unknown;
};

const errorResult = <T>(
  error: string,
  status: number,
  details?: unknown,
): ActionResult<T> => ({ data: null, error, status, details });

const successResult = <T>(data: T, status = 200): ActionResult<T> => ({
  data,
  error: null,
  status,
});

export type StatusFilter = "active" | "suspended" | "all";

export const getClientsAction = async (
  status: StatusFilter = "active",
): Promise<ActionResult<Client[]>> => {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return errorResult("Unauthorized", 401);

  const { data: staff, error: staffError } = await supabase
    .from("staffs")
    .select("office_id")
    .eq("auth_user_id", user.id)
    .single();

  if (staffError || !staff) return errorResult("Staff not found", 404);

  if (!["active", "suspended", "all"].includes(status)) {
    return errorResult("Invalid status parameter", 400);
  }

  const repository = new ClientRepository(supabase);
  const clients = await repository.findAll(staff.office_id, status);
  return successResult(clients);
};

export const createClientAction = async (
  input: ClientInput,
): Promise<ActionResult<Client>> => {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return errorResult("Unauthorized", 401);

  const { data: staff, error: staffError } = await supabase
    .from("staffs")
    .select("office_id, role")
    .eq("auth_user_id", user.id)
    .single();

  if (staffError || !staff) return errorResult("Staff not found", 404);
  if (staff.role !== "admin") return errorResult("Forbidden", 403);

  const validation = ClientInputSchema.safeParse(input);
  if (!validation.success) {
    return errorResult("Validation error", 400, validation.error.issues);
  }

  const repository = new ClientRepository(supabase);
  const client = await repository.create({
    office_id: staff.office_id,
    name: validation.data.name,
    address: validation.data.address,
  });

  return successResult(client, 201);
};

export const updateClientAction = async (
  id: string,
  input: ClientInput,
): Promise<ActionResult<Client>> => {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return errorResult("Unauthorized", 401);

  const { data: staff, error: staffError } = await supabase
    .from("staffs")
    .select("office_id, role")
    .eq("auth_user_id", user.id)
    .single();

  if (staffError || !staff) return errorResult("Staff not found", 404);
  if (staff.role !== "admin") return errorResult("Forbidden", 403);

  const repository = new ClientRepository(supabase);
  const existingClient = await repository.findById(id);
  if (!existingClient) return errorResult("Client not found", 404);
  if (existingClient.office_id !== staff.office_id) {
    return errorResult("Forbidden", 403);
  }

  const validation = ClientInputSchema.safeParse(input);
  if (!validation.success) {
    return errorResult("Validation error", 400, validation.error.issues);
  }

  const client = await repository.update(id, validation.data);
  return successResult(client);
};

export const suspendClientAction = async (
  id: string,
): Promise<ActionResult<Client>> => {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return errorResult("Unauthorized", 401);

  const { data: staff, error: staffError } = await supabase
    .from("staffs")
    .select("office_id, role")
    .eq("auth_user_id", user.id)
    .single();

  if (staffError || !staff) return errorResult("Staff not found", 404);
  if (staff.role !== "admin") return errorResult("Forbidden", 403);

  const repository = new ClientRepository(supabase);
  const existingClient = await repository.findById(id);
  if (!existingClient) return errorResult("Client not found", 404);
  if (existingClient.office_id !== staff.office_id) {
    return errorResult("Forbidden", 403);
  }

  const client = await repository.suspend(id);
  return successResult(client);
};

export const resumeClientAction = async (
  id: string,
): Promise<ActionResult<Client>> => {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return errorResult("Unauthorized", 401);

  const { data: staff, error: staffError } = await supabase
    .from("staffs")
    .select("office_id, role")
    .eq("auth_user_id", user.id)
    .single();

  if (staffError || !staff) return errorResult("Staff not found", 404);
  if (staff.role !== "admin") return errorResult("Forbidden", 403);

  const repository = new ClientRepository(supabase);
  const existingClient = await repository.findById(id);
  if (!existingClient) return errorResult("Client not found", 404);
  if (existingClient.office_id !== staff.office_id) {
    return errorResult("Forbidden", 403);
  }

  const client = await repository.resume(id);
  return successResult(client);
};
