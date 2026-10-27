export interface FieldError { field: string; message: string }

export class ApiError extends Error {
  status: number;
  code: string;
  fields: FieldError[];
  extra: Record<string, any>;

  constructor(
    status: number,
    code: string,
    message: string,
    fields: FieldError[] = [],
    extra: Record<string, any> = {},
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
    this.extra = extra;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/v1${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const e = data?.error ?? {};
    const { code, message, fields, ...extra } = e;
    throw new ApiError(res.status, code ?? "UNKNOWN", message ?? "Request failed", fields ?? [], extra);
  }
  return data as T;
}

export interface PlanQuote { planId: string; planName: string; eligibleLoanRupees: number }
export interface QuoteResult { pureGoldGrams: number; goldValueRupees: number; plans: PlanQuote[] }
export interface LeadResult {
  applicationId: string; status: string; planName: string;
  eligibleLoanRupees: number; goldValueRupees: number; pureGoldGrams: number;
}
export interface LeadRow {
  applicationId: string; name: string; mobileNumber: string; netWeightGrams: number;
  karat: number; planId: string; planName: string; eligibleLoanRupees: number;
  status: string; createdAt: string;
}

export const getQuote = (b: { netWeightGrams: number; grossWeightGrams: number; karat: number }) =>
  request<QuoteResult>("/quotes", { method: "POST", body: JSON.stringify(b) });

export const createLead = (b: Record<string, unknown>) =>
  request<LeadResult>("/leads", { method: "POST", body: JSON.stringify(b) });

export const getLeads = (planId?: string) =>
  request<{ leads: LeadRow[] }>(`/leads${planId ? `?planId=${planId}` : ""}`);

export const getSchemes = () =>
  request<{ schemes: { id: string; name: string; annualInterestRatePercent: number; maxLtvPercent: number; tenureMonths: number }[] }>("/loan-schemes");

export interface ChatMessage { role: "user" | "assistant"; content: string }
export interface PendingSummary {
  pendingId: string; name: string; mobileNumber: string;
  netWeightGrams: number; grossWeightGrams: number; karat: number;
  planName: string; pureGoldGrams: number; goldValueRupees: number; eligibleLoanRupees: number;
}

export const sendChat = (messages: ChatMessage[]) =>
  request<{ reply: string; pending: PendingSummary | null }>("/chat", {
    method: "POST",
    body: JSON.stringify({ messages }),
  });

export const confirmPending = (pendingId: string) =>
  request<LeadResult>("/chat/confirm", {
    method: "POST",
    body: JSON.stringify({ pendingId }),
  });