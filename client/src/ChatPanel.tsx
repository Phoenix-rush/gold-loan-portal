import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { sendChat, confirmPending, ApiError } from "./api";
import type { ChatMessage, PendingSummary } from "./api";
import { inr } from "./format";

type PendingState = "active" | "done" | "cancelled" | "closed";

interface UiMessage extends ChatMessage {
  pending?: PendingSummary;
  pendingState?: PendingState;
  isError?: boolean;
}

const GREETING =
  "Hi! I'm Loan Assist. Tell me your gold's weight and karat and I'll check what you can borrow.";

const setState = (list: UiMessage[], index: number, state: PendingState): UiMessage[] =>
  list.map((m, i) => (i === index ? { ...m, pendingState: state } : m));

export default function ChatPanel() {
  const [msgs, setMsgs] = useState<UiMessage[]>([{ role: "assistant", content: GREETING }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, busy]);

  // greeting aur error bubbles server ko nahi jaate
  const history = (list: UiMessage[]): ChatMessage[] =>
    list
      .slice(1)
      .filter((m) => !m.isError)
      .map(({ role, content }) => ({ role, content }));

  async function send(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput("");

    // naya message aate hi purana card inactive (user ne mind change kiya)
    const next: UiMessage[] = [
      ...msgs.map((m) => (m.pendingState === "active" ? { ...m, pendingState: "closed" as const } : m)),
      { role: "user", content: text },
    ];
    setMsgs(next);
    setBusy(true);
    try {
      const r = await sendChat(history(next));
      const bubble: UiMessage = { role: "assistant", content: r.reply };
      if (r.pending) {
        bubble.pending = r.pending;
        bubble.pendingState = "active";
      }
      setMsgs((m) => [...m, bubble]);
    } catch (err) {
      setMsgs((m) => [
        ...m,
        {
          role: "assistant",
          content: err instanceof ApiError ? err.message : "Network problem. Please try again.",
          isError: true,
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  async function confirm(index: number, p: PendingSummary) {
    setBusy(true);
    try {
      const r = await confirmPending(p.pendingId);
      setMsgs((m) => [
        ...setState(m, index, "done"),
        {
          role: "assistant",
          content: `Done! Your application ID is ${r.applicationId}. Preliminary offer: ${inr(r.eligibleLoanRupees)} on ${r.planName}, subject to verification.`,
        },
      ]);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        const when = err.extra.appliedAt
          ? new Date(err.extra.appliedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
          : "recently";
        setMsgs((m) => [
          ...setState(m, index, "closed"),
          { role: "assistant", content: `You already applied on ${when}, application ${err.extra.applicationId}.` },
        ]);
      } else if (err instanceof ApiError) {
        setMsgs((m) => [...setState(m, index, "closed"), { role: "assistant", content: err.message }]);
      } else {
        setMsgs((m) => [...m, { role: "assistant", content: "Network problem. Please try Confirm again.", isError: true }]);
      }
    } finally {
      setBusy(false);
    }
  }

  function cancel(index: number) {
    setMsgs((m) => [
      ...setState(m, index, "cancelled"),
      { role: "assistant", content: "No problem, nothing was submitted. Would you like to change any detail?" },
    ]);
  }

  return (
    <div className="flex h-[70vh] flex-col">
      <div role="log" aria-live="polite" className="flex-1 space-y-3 overflow-y-auto pr-1">
        {msgs.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div className="max-w-[85%] space-y-2">
              <div
                className={`whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm ${
                  m.role === "user"
                    ? "bg-emerald-600 text-white"
                    : m.isError
                      ? "bg-red-50 text-red-700"
                      : "bg-slate-100 text-slate-800"
                }`}
              >
                {m.content}
              </div>

              {m.pending && (
                <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
                  <p className="mb-2 font-semibold">Review application</p>
                  <dl className="space-y-1">
                    {(
                      [
                        ["Name", m.pending.name],
                        ["Mobile", m.pending.mobileNumber],
                        ["Gross / Net", `${m.pending.grossWeightGrams} g / ${m.pending.netWeightGrams} g`],
                        ["Karat", `${m.pending.karat}K`],
                        ["Pure gold", `${m.pending.pureGoldGrams} g`],
                        ["Gold value", inr(m.pending.goldValueRupees)],
                        ["Plan", m.pending.planName],
                        ["Eligible loan", inr(m.pending.eligibleLoanRupees)],
                      ] as const
                    ).map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-3">
                        <dt className="text-slate-500">{k}</dt>
                        <dd className="text-right font-medium">{v}</dd>
                      </div>
                    ))}
                  </dl>
                  {m.pendingState === "active" ? (
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => cancel(i)}
                        disabled={busy}
                        className="flex-1 rounded-lg border border-slate-300 py-2 font-medium disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => confirm(i, m.pending!)}
                        disabled={busy}
                        className="flex-1 rounded-lg bg-emerald-600 py-2 font-semibold text-white disabled:opacity-50"
                      >
                        Confirm
                      </button>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-slate-500">
                      {m.pendingState === "done" && "Submitted"}
                      {m.pendingState === "cancelled" && "Cancelled"}
                      {m.pendingState === "closed" && "No longer active"}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {busy && <p className="text-sm text-slate-500">Thinking…</p>}
        <div ref={endRef} />
      </div>

      <form onSubmit={send} className="mt-3 flex gap-2">
        <input
          aria-label="Message"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message…"
          maxLength={1000}
          className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="rounded-lg bg-emerald-600 px-4 font-semibold text-white disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}