import { randomUUID } from "node:crypto";
import { AppError } from "../errors.js";
import { createLead, maskMobile } from "../services/leadService.js";
import type { LeadBody } from "../schemas.js";

export interface PendingSummary {
  pendingId: string;
  name: string;
  mobileNumber: string;
  netWeightGrams: number;
  grossWeightGrams: number;
  karat: number;
  planName: string;
  pureGoldGrams: number;
  goldValueRupees: number;
  eligibleLoanRupees: number;
}

const TTL_MS = 10 * 60 * 1000;
const store = new Map<string, { payload: LeadBody; expiresAt: number }>();

export function savePending(payload: LeadBody, rest: Omit<PendingSummary, "pendingId">): PendingSummary {
  const pendingId = randomUUID();
  store.set(pendingId, { payload, expiresAt: Date.now() + TTL_MS });
  for (const [id, v] of store) if (v.expiresAt < Date.now()) store.delete(id);
  return { pendingId, ...rest };
}

// ek hi baar chalega: double submit nahi hoga
export async function confirmPending(pendingId: string) {
  const entry = store.get(pendingId);
  store.delete(pendingId);
  if (!entry || entry.expiresAt < Date.now()) {
    throw new AppError(
      404,
      "PENDING_NOT_FOUND",
      "This confirmation has expired. Please ask Loan Assist to prepare the application again.",
    );
  }
  console.log(`[chat] confirmed application for ${maskMobile(entry.payload.mobileNumber)}`);
  return createLead(entry.payload);
}