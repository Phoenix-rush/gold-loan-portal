import { useEffect, useMemo, useState } from "react";
import { getSchemes, createLead, ApiError } from "./api";
import type { LeadResult } from "./api";
import { useQuote } from "./useQuote";
import { validate, parseNum, EMPTY_FORM, SERVER_FIELD_MAP } from "./validation";
import type { FormValues, Errors } from "./validation";
import { Field, inputClass } from "./Field";
import { inr } from "./format";

type Scheme = {
  id: string;
  name: string;
  annualInterestRatePercent: number;
  maxLtvPercent: number;
  tenureMonths: number;
};

// sirf digits aur ek dot allow
const cleanDecimal = (s: string) => {
  const x = s.replace(/[^\d.]/g, "");
  const i = x.indexOf(".");
  return i === -1 ? x : x.slice(0, i + 1) + x.slice(i + 1).replace(/\./g, "");
};

export default function ApplyFlow() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [values, setValues] = useState<FormValues>(EMPTY_FORM);
  const [touched, setTouched] = useState<Partial<Record<keyof FormValues, boolean>>>({});
  const [schemes, setSchemes] = useState<Scheme[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<LeadResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [serverErrors, setServerErrors] = useState<Errors>({});

  useEffect(() => {
    getSchemes()
      .then((r) => setSchemes(r.schemes))
      .catch(() => {});
  }, []);

  const errors = useMemo(() => validate(values), [values]);
  const detailsValid = Object.keys(errors).length === 0;

  const quoteReady = !errors.gross && !errors.net && !errors.karat;
  const { quote, loading, error: quoteError } = useQuote(
    quoteReady ? parseNum(values.net) : null,
    quoteReady ? parseNum(values.gross) : null,
    quoteReady ? Number(values.karat) : null,
  );

  const set = (key: keyof FormValues, value: string) => {
    setValues((v) => ({ ...v, [key]: value }));
    setTouched((t) => ({ ...t, [key]: true }));
    setServerErrors((s) => ({ ...s, [key]: undefined }));
  };
  const blur = (key: keyof FormValues) => setTouched((t) => ({ ...t, [key]: true }));
  const err = (key: keyof FormValues) =>
    touched[key] ? (errors[key] ?? serverErrors[key]) : undefined;

  const selectedPlan = quote?.plans.find((p) => p.planId === values.planId);

  async function submit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const r = await createLead({
        name: values.name.trim(),
        mobileNumber: values.mobile,
        netWeightGrams: Number(values.net),
        grossWeightGrams: Number(values.gross),
        karat: Number(values.karat),
        planId: values.planId,
      });
      setResult(r);
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        const when = e.extra.appliedAt
          ? new Date(e.extra.appliedAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
            })
          : "recently";
        setSubmitError(
          `You already applied on ${when}, application ${e.extra.applicationId}.`,
        );
      } else if (e instanceof ApiError && e.status === 400 && e.fields.length) {
        const mapped: Errors = {};
        for (const f of e.fields) {
          const key = SERVER_FIELD_MAP[f.field];
          if (key) mapped[key] = f.message;
        }
        setServerErrors(mapped);
        setTouched({ name: true, mobile: true, gross: true, net: true, karat: true });
        setSubmitError("Please fix the highlighted fields.");
        setStep(1);
      } else if (e instanceof ApiError) {
        setSubmitError(e.message);
      } else {
        setSubmitError("Network problem. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setValues(EMPTY_FORM);
    setTouched({});
    setServerErrors({});
    setResult(null);
    setSubmitError(null);
    setStep(1);
  }

  return (
    <div>
      <Stepper step={step} />

      {/* STEP 1: Details */}
      {step === 1 && (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setTouched({ name: true, mobile: true, gross: true, net: true, karat: true });
            if (detailsValid) {
              setSubmitError(null);
              setStep(2);
            }
          }}
          noValidate
        >
          {submitError && (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {submitError}
            </p>
          )}

          <Field label="Full name" htmlFor="name" error={err("name")}>
            <input
              id="name"
              autoComplete="name"
              value={values.name}
              onChange={(e) => set("name", e.target.value)}
              onBlur={() => blur("name")}
              aria-invalid={!!err("name")}
              aria-describedby="name-err"
              className={inputClass(!!err("name"))}
            />
          </Field>

          <Field label="Mobile number" htmlFor="mobile" error={err("mobile")}>
            <input
              id="mobile"
              type="tel"
              inputMode="numeric"
              maxLength={10}
              autoComplete="tel-national"
              value={values.mobile}
              onChange={(e) => set("mobile", e.target.value.replace(/\D/g, ""))}
              onBlur={() => blur("mobile")}
              aria-invalid={!!err("mobile")}
              aria-describedby="mobile-err"
              className={inputClass(!!err("mobile"))}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Gross weight (g)" htmlFor="gross" error={err("gross")}>
              <input
                id="gross"
                inputMode="decimal"
                value={values.gross}
                onChange={(e) => set("gross", cleanDecimal(e.target.value))}
                onBlur={() => blur("gross")}
                aria-invalid={!!err("gross")}
                aria-describedby="gross-err"
                className={inputClass(!!err("gross"))}
              />
            </Field>
            <Field label="Net weight (g)" htmlFor="net" error={err("net")}>
              <input
                id="net"
                inputMode="decimal"
                value={values.net}
                onChange={(e) => set("net", cleanDecimal(e.target.value))}
                onBlur={() => blur("net")}
                aria-invalid={!!err("net")}
                aria-describedby="net-err"
                className={inputClass(!!err("net"))}
              />
            </Field>
          </div>

          <Field label="Karat" htmlFor="karat-group" error={err("karat")}>
            <div
              id="karat-group"
              role="group"
              aria-label="Karat"
              className="grid grid-cols-3 gap-2"
            >
              {["18", "22", "24"].map((k) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={values.karat === k}
                  onClick={() => set("karat", k)}
                  className={`rounded-lg border py-2.5 font-medium ${
                    values.karat === k
                      ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                      : "border-slate-300 bg-white text-slate-700"
                  }`}
                >
                  {k}K
                </button>
              ))}
            </div>
          </Field>

          <div aria-live="polite" className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
            {!quoteReady && "Enter weights and karat to see a live estimate."}
            {quoteReady && loading && "Calculating…"}
            {quoteReady && !loading && quoteError && (
              <span className="text-red-600">{quoteError}</span>
            )}
            {quoteReady && !loading && quote && (
              <>
                Pure gold <b>{quote.pureGoldGrams} g</b> · Value{" "}
                <b>{inr(quote.goldValueRupees)}</b>
              </>
            )}
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-emerald-600 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            disabled={!detailsValid}
          >
            Continue
          </button>
        </form>
      )}

      {/* STEP 2: Live quote + plan cards */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700" aria-live="polite">
            {loading && "Updating quote…"}
            {!loading && quote && (
              <>
                {values.net} g · {values.karat}K → pure gold <b>{quote.pureGoldGrams} g</b>,
                value <b>{inr(quote.goldValueRupees)}</b>
              </>
            )}
            {!loading && quoteError && <span className="text-red-600">{quoteError}</span>}
          </div>

          <div role="radiogroup" aria-label="Loan plan" className="space-y-3">
            {quote?.plans.map((p) => {
              const s = schemes.find((x) => x.id === p.planId);
              const selected = values.planId === p.planId;
              return (
                <button
                  key={p.planId}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => set("planId", p.planId)}
                  className={`w-full rounded-xl border-2 p-4 text-left transition ${
                    selected ? "border-emerald-600 bg-emerald-50" : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-baseline justify-between">
                    <span className="font-semibold">{p.planName}</span>
                    {selected && (
                      <span className="text-xs font-semibold text-emerald-700">SELECTED</span>
                    )}
                  </div>
                  <div className="mt-1 text-2xl font-bold text-slate-900">
                    {inr(p.eligibleLoanRupees)}
                  </div>
                  {s && (
                    <div className="mt-1 text-xs text-slate-500">
                      {s.annualInterestRatePercent}% p.a. · {s.tenureMonths} months · up to{" "}
                      {s.maxLtvPercent}% LTV
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 rounded-lg border border-slate-300 py-3 font-medium"
            >
              Back
            </button>
            <button
              type="button"
              disabled={!selectedPlan}
              onClick={() => {
                setSubmitError(null);
                setStep(3);
              }}
              className="flex-1 rounded-lg bg-emerald-600 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Success */}
      {step === 3 && result && (
        <div className="space-y-4 text-center" role="status">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700">
            ✓
          </div>
          <h2 className="text-xl font-bold">Application submitted</h2>
          <p className="text-slate-600">Your application ID</p>
          <p className="text-3xl font-bold tracking-wide text-emerald-700">
            {result.applicationId}
          </p>
          <p className="text-sm text-slate-500">
            Preliminary offer: {inr(result.eligibleLoanRupees)} on {result.planName}. Subject to
            verification.
          </p>
          <button
            onClick={reset}
            className="w-full rounded-lg bg-emerald-600 py-3 font-semibold text-white"
          >
            New application
          </button>
        </div>
      )}

      {/* STEP 3: Review + confirm */}
      {step === 3 && !result && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold">Review and confirm</h2>
          <dl className="divide-y divide-slate-100 rounded-lg border border-slate-200 text-sm">
            {[
              ["Name", values.name.trim()],
              ["Mobile", values.mobile],
              ["Gross / Net weight", `${values.gross} g / ${values.net} g`],
              ["Karat", `${values.karat}K`],
              ["Pure gold", quote ? `${quote.pureGoldGrams} g` : "-"],
              ["Gold value", quote ? inr(quote.goldValueRupees) : "-"],
              ["Plan", selectedPlan?.planName ?? "-"],
              ["Eligible loan", selectedPlan ? inr(selectedPlan.eligibleLoanRupees) : "-"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 px-3 py-2">
                <dt className="text-slate-500">{k}</dt>
                <dd className="text-right font-medium">{v}</dd>
              </div>
            ))}
          </dl>

          {submitError && (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {submitError}
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={submitting}
              className="flex-1 rounded-lg border border-slate-300 py-3 font-medium"
            >
              Back
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={submitting || !selectedPlan}
              className="flex-1 rounded-lg bg-emerald-600 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {submitting ? "Submitting…" : "Confirm & submit"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Stepper({ step }: { step: number }) {
  const labels = ["Details", "Quote", "Confirm"];
  return (
    <ol className="mb-6 flex items-center justify-between text-sm" aria-label="Progress">
      {labels.map((l, i) => {
        const n = i + 1;
        const active = n === step;
        const done = n < step;
        return (
          <li
            key={l}
            className="flex items-center gap-2"
            aria-current={active ? "step" : undefined}
          >
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                active || done ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-600"
              }`}
            >
              {n}
            </span>
            <span className={active ? "font-semibold text-slate-900" : "text-slate-500"}>
              {l}
            </span>
          </li>
        );
      })}
    </ol>
  );
}