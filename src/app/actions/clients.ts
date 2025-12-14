"use server";

import { createClient } from "@/utils/supabase/server";
import { ClientService, ServiceError, type StatusFilter } from "@/backend/services/clientService";
import { type ClientInput, type Client } from "@/models/client";

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

export const getClientsAction = async (
  status: StatusFilter = "active",
): Promise<ActionResult<Client[]>> => {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return errorResult("Unauthorized", 401);
  const service = new ClientService(supabase);
  try {
    const clients = await service.getClients(user.id, status);
    return successResult(clients);
  } catch (e) {
    if (e instanceof ServiceError) {
      return errorResult(e.message, e.status, e.details);
    }
    throw e;
  }
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
  const service = new ClientService(supabase);
  try {
    const client = await service.createClient(user.id, input);
    return successResult(client, 201);
  } catch (e) {
    if (e instanceof ServiceError) {
      return errorResult(e.message, e.status, e.details);
    }
    throw e;
  }
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
  const service = new ClientService(supabase);
  try {
    const client = await service.updateClient(user.id, id, input);
    return successResult(client);
  } catch (e) {
    if (e instanceof ServiceError) {
      return errorResult(e.message, e.status, e.details);
    }
    throw e;
  }
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
  const service = new ClientService(supabase);
  try {
    const client = await service.suspendClient(user.id, id);
    return successResult(client);
  } catch (e) {
    if (e instanceof ServiceError) {
      return errorResult(e.message, e.status, e.details);
    }
    throw e;
  }
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
  const service = new ClientService(supabase);
  try {
    const client = await service.resumeClient(user.id, id);
    return successResult(client);
  } catch (e) {
    if (e instanceof ServiceError) {
      return errorResult(e.message, e.status, e.details);
    }
    throw e;
  }
};
