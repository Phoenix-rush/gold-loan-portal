import { z } from "zod";
import { AppError } from "./errors.js";

const karat = z.union([z.literal(18), z.literal(22), z.literal(24)], {
  message: "Karat must be 18, 22 or 24",
});

const weightFields = z.object({
  netWeightGrams: z
    .number({ message: "Net weight must be a number" })
    .positive("Net weight must be greater than 0"),
  grossWeightGrams: z
    .number({ message: "Gross weight must be a number" })
    .positive("Gross weight must be greater than 0")
    .max(1000, "Gross weight cannot exceed 1000 g"),
  karat,
});

const netNotAboveGross = {
  check: (d: { netWeightGrams: number; grossWeightGrams: number }) =>
    d.netWeightGrams <= d.grossWeightGrams,
  opts: {
    message: "Net weight cannot exceed gross weight",
    path: ["netWeightGrams"],
  },
};

export const quoteSchema = weightFields.refine(netNotAboveGross.check, netNotAboveGross.opts);

export const leadSchema = weightFields
  .extend({
    name: z
      .string({ message: "Name is required" })
      .trim()
      .min(2, "Name must be at least 2 characters")
      .max(60, "Name must be at most 60 characters")
      .regex(/^[A-Za-z ]+$/, "Name can contain only letters and spaces"),
    mobileNumber: z
      .string({ message: "Mobile number is required" })
      .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
    planId: z.string({ message: "Plan is required" }).min(1, "Plan is required"),
  })
  .refine(netNotAboveGross.check, netNotAboveGross.opts);

export type QuoteBody = z.infer<typeof quoteSchema>;
export type LeadBody = z.infer<typeof leadSchema>;

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

export const chatSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(1000),
      }),
    )
    .min(1)
    .max(30),
});

export const confirmSchema = z.object({
  pendingId: z.string().min(1, "pendingId is required"),
});