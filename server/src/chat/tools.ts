import { AppError } from "../errors.js";
import { leadSchema, quoteSchema, parseOrThrow } from "../schemas.js";
import { listSchemes, quoteAllPlans } from "../services/quoteService.js";
import { prepareLead, maskMobile } from "../services/leadService.js";
import { savePending } from "./pending.js";
import type { PendingSummary } from "./pending.js";

export const toolDeclarations = [
  {
    functionDeclarations: [
      {
        name: "get_loan_schemes",
        description:
          "List the available gold loan plans with interest rate, tenure and max LTV. Use this before describing any plan.",
      },
      {
        name: "calculate_quote",
        description:
          "Calculate pure gold, gold value and eligible loan for every plan. The only source of any amount. IMPORTANT: Only call this when the user has explicitly provided BOTH net weight AND gross weight as two separate numbers. Never assume they are equal.",
        parameters: {
          type: "OBJECT",
          properties: {
            netWeightGrams: { type: "NUMBER", description: "Net weight of gold in grams" },
            grossWeightGrams: { type: "NUMBER", description: "Gross weight in grams (>= net weight, max 1000)" },
            karat: { type: "INTEGER", description: "Gold purity: 18, 22 or 24" },
          },
          required: ["netWeightGrams", "grossWeightGrams", "karat"],
        },
      },
      {
        name: "submit_application",
        description:
          "Prepare a loan application. This does NOT submit it: it shows the user a confirmation card they must approve. Call only when every field has been given by the user.",
        parameters: {
          type: "OBJECT",
          properties: {
            name: { type: "STRING", description: "Applicant full name" },
            mobileNumber: { type: "STRING", description: "10-digit Indian mobile number" },
            netWeightGrams: { type: "NUMBER" },
            grossWeightGrams: { type: "NUMBER" },
            karat: { type: "INTEGER", description: "18, 22 or 24" },
            planId: { type: "STRING", description: "Plan id from get_loan_schemes, e.g. PLAN_EMI_01" },
          },
          required: ["name", "mobileNumber", "netWeightGrams", "grossWeightGrams", "karat", "planId"],
        },
      },
    ],
  },
];

export interface ToolCtx {
  pending?: PendingSummary;
}

// logs mein mobile masked
function safeArgs(args: any) {
  if (args && typeof args === "object" && typeof args.mobileNumber === "string") {
    return { ...args, mobileNumber: maskMobile(args.mobileNumber) };
  }
  return args;
}

export async function executeTool(name: string, args: unknown, ctx: ToolCtx) {
  console.log(`[chat] tool ${name}`, JSON.stringify(safeArgs(args)));
  try {
    switch (name) {
      case "get_loan_schemes":
        return { schemes: await listSchemes() };

      case "calculate_quote": {
        const a = parseOrThrow(quoteSchema, args);
        return await quoteAllPlans(a);
      }

      case "submit_application": {
        const a = parseOrThrow(leadSchema, args);
        const { plan, q } = await prepareLead(a); // 404 / 409 yahin pakde jayenge
        ctx.pending = savePending(a, {
          name: a.name,
          mobileNumber: a.mobileNumber,
          netWeightGrams: a.netWeightGrams,
          grossWeightGrams: a.grossWeightGrams,
          karat: a.karat,
          planName: plan.name,
          pureGoldGrams: q.pureGoldGrams,
          goldValueRupees: q.goldValueRupees,
          eligibleLoanRupees: q.eligibleLoanRupees,
        });
        return {
          status: "AWAITING_USER_CONFIRMATION",
          note: "Nothing is submitted yet. A summary card is shown to the user with Confirm and Cancel buttons. Tell the user to review it and press Confirm.",
        };
      }

      default:
        return { error: { code: "UNKNOWN_TOOL", message: `No such tool: ${name}` } };
    }
  } catch (e) {
    if (e instanceof AppError) {
      return { error: { code: e.code, message: e.message, fields: e.fields, ...e.extra } };
    }
    console.error("[chat] tool failed", e);
    return { error: { code: "TOOL_FAILED", message: "The tool failed. Try again later." } };
  }
}