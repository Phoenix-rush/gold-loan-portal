import { z } from "zod";
import { AppError } from "./errors.js";

const karat = z.union([z.literal(18), z.literal(22), z.literal(24)], {
  message: "Karat must be 18, 22 or 24",
});

export const quoteSchema = z
  .object({
    netWeightGrams: z
      .number({ message: "Net weight must be a number" })
      .positive("Net weight must be greater than 0"),
    grossWeightGrams: z
      .number({ message: "Gross weight must be a number" })
      .positive("Gross weight must be greater than 0")
      .max(1000, "Gross weight cannot exceed 1000 g"),
    karat,
  })
  .refine((d) => d.netWeightGrams <= d.grossWeightGrams, {
    message: "Net weight cannot exceed gross weight",
    path: ["netWeightGrams"],
  });

export type QuoteBody = z.infer<typeof quoteSchema>;

export function parseOrThrow<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const fields = result.error.issues.map((i) => ({
      field: i.path.join("."),
      message: i.message,
    }));
    throw new AppError(400, "VALIDATION_ERROR", "Invalid request", fields);
  }
  return result.data;
}