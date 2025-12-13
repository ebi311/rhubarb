import { z } from "zod";

export const OfficeSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1, { message: "事業所名は必須です" }),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

export type Office = z.infer<typeof OfficeSchema>;
