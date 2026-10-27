export interface FormValues {
  name: string;
  mobile: string;
  gross: string;
  net: string;
  karat: string; // "18" | "22" | "24" | ""
  planId: string;
}

export const EMPTY_FORM: FormValues = {
  name: "", mobile: "", gross: "", net: "", karat: "", planId: "",
};

export type Errors = Partial<Record<keyof FormValues, string>>;

export function parseNum(s: string): number | null {
  if (s.trim() === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

// server ke field names -> form ke field names (Step 3 mein kaam aayega)
export const SERVER_FIELD_MAP: Record<string, keyof FormValues> = {
  name: "name",
  mobileNumber: "mobile",
  grossWeightGrams: "gross",
  netWeightGrams: "net",
  karat: "karat",
  planId: "planId",
};

export function validate(v: FormValues): Errors {
  const e: Errors = {};

  const name = v.name.trim();
  if (!name) e.name = "Name is required";
  else if (name.length < 2) e.name = "Name must be at least 2 characters";
  else if (name.length > 60) e.name = "Name must be at most 60 characters";
  else if (!/^[A-Za-z ]+$/.test(name)) e.name = "Use letters and spaces only";

  if (!v.mobile) e.mobile = "Mobile number is required";
  else if (!/^[6-9]\d{9}$/.test(v.mobile))
    e.mobile = "Enter a valid 10-digit mobile number starting with 6-9";

  const gross = parseNum(v.gross);
  const net = parseNum(v.net);

  if (gross === null) e.gross = "Gross weight is required";
  else if (gross <= 0) e.gross = "Must be greater than 0";
  else if (gross > 1000) e.gross = "Cannot exceed 1000 g";
  else if (!/^\d+(\.\d{1,3})?$/.test(v.gross)) e.gross = "Up to 3 decimal places";

  if (net === null) e.net = "Net weight is required";
  else if (net <= 0) e.net = "Must be greater than 0";
  else if (!/^\d+(\.\d{1,3})?$/.test(v.net)) e.net = "Up to 3 decimal places";
  else if (gross !== null && !e.gross && net > gross)
    e.net = "Net weight cannot exceed gross weight";

  if (!["18", "22", "24"].includes(v.karat)) e.karat = "Select a karat";

  return e;
}