import { prisma } from "../db.js";
import { AppError } from "../errors.js";
import { computeQuote } from "./quoteMath.js";
import type { LeadBody } from "../schemas.js";

const DUPLICATE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export const toApplicationId = (id: number) => `GL-${1000 + id}`;

export const maskMobile = (m: string) => `${m.slice(0, 4)}XXXX${m.slice(-2)}`;

export async function prepareLead(input: LeadBody) {
  const plan = await prisma.loanScheme.findFirst({
    where: { id: input.planId, isActive: true },
  });
  if (!plan) {
    throw new AppError(404, "PLAN_NOT_FOUND", `Loan plan ${input.planId} not found`);
  }

  const since = new Date(Date.now() - DUPLICATE_WINDOW_MS);
  const existing = await prisma.lead.findFirst({
    where: { mobileNumber: input.mobileNumber, createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
  });
  if (existing) {
    throw new AppError(
      409,
      "DUPLICATE_APPLICATION",
      "An application from this mobile number already exists in the last 7 days",
      [],
      {
        applicationId: toApplicationId(existing.id),
        appliedAt: existing.createdAt.toISOString(),
      },
    );
  }

  const q = computeQuote({
    netWeightGrams: input.netWeightGrams,
    karat: input.karat,
    maxLtvBp: plan.maxLtvBp,
  });
  return { plan, q };
}

export async function createLead(input: LeadBody) {
  const { plan, q } = await prepareLead(input);

  const lead = await prisma.lead.create({
    data: {
      name: input.name,
      mobileNumber: input.mobileNumber,
      grossWeightMg: Math.round(input.grossWeightGrams * 1000),
      netWeightMg: Math.round(input.netWeightGrams * 1000),
      karat: input.karat,
      planId: plan.id,
      pureGoldMg: Math.round(q.pureGoldGrams * 1000),
      goldValuePaise: Math.round(q.goldValueRupees * 100),
      loanRupees: q.eligibleLoanRupees,
      status: "SUBMITTED",
    },
  });

  return {
    applicationId: toApplicationId(lead.id),
    status: lead.status,
    planId: plan.id,
    planName: plan.name,
    pureGoldGrams: q.pureGoldGrams,
    goldValueRupees: q.goldValueRupees,
    eligibleLoanRupees: q.eligibleLoanRupees,
    createdAt: lead.createdAt.toISOString(),
  };
}

export async function listLeads(planId?: string) {
  const leads = await prisma.lead.findMany({
    where: planId ? { planId } : {},
    orderBy: { createdAt: "desc" },
    include: { plan: true },
  });
  return leads.map((l) => ({
    applicationId: toApplicationId(l.id),
    name: l.name,
    mobileNumber: maskMobile(l.mobileNumber), // hamesha masked
    netWeightGrams: l.netWeightMg / 1000,
    karat: l.karat,
    planId: l.planId,
    planName: l.plan.name,
    eligibleLoanRupees: l.loanRupees,
    status: l.status,
    createdAt: l.createdAt.toISOString(),
  }));
}