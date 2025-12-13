import { z } from "zod";

export const TimeValueSchema = z.object({
  hour: z.number().int().min(0).max(23),
  minute: z.number().int().min(0).max(59),
});

export type TimeValue = z.infer<typeof TimeValueSchema>;

export const preprocessTime = (arg: unknown) => {
  if (typeof arg === "string" && /^\d{4}$/.test(arg)) {
    const hour = parseInt(arg.slice(0, 2), 10);
    const minute = parseInt(arg.slice(2, 4), 10);
    return { hour, minute };
  }
  return arg;
};

export const rhubarbTime = () => z.preprocess(preprocessTime, TimeValueSchema);

export const formatTime = (time: TimeValue): string => {
  const hour = time.hour.toString().padStart(2, "0");
  const minute = time.minute.toString().padStart(2, "0");
  return `${hour}${minute}`;
};
