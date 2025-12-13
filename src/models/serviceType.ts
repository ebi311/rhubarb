import { z } from "zod";

export const ServiceTypeSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1, { message: "名称は必須です" }),
  display_order: z.number().int().default(0),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export type ServiceType = z.infer<typeof ServiceTypeSchema>;
