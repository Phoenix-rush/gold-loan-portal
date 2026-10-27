import { useEffect, useState } from "react";
import { getLeads, getSchemes } from "./api";
import type { LeadRow } from "./api";
import { inr } from "./format";

export default function LeadsTable() {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [plans, setPlans] = useState<{ id: string; name: string }[]>([]);
  const [planId, setPlanId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSchemes().then((r) => setPlans(r.schemes)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    getLeads(planId || undefined)
      .then((r) => { setLeads(r.leads); setError(null); })
      .catch(() => setError("Could not load leads"))
      .finally(() => setLoading(false));
  }, [planId]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <label htmlFor="planFilter" className="text-sm text-slate-600">Plan</label>
        <select
          id="planFilter" value={planId} onChange={(e) => setPlanId(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All plans</option>
          {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {loading && <p className="text-sm text-slate-500">Loading…</p>}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {!loading && !error && leads.length === 0 && (
        <p className="text-sm text-slate-500">No leads yet.</p>
      )}

      {leads.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                {["ID", "Name", "Mobile", "Net (g)", "Plan", "Loan", "Status"].map((h) => (
                  <th key={h} scope="col" className="whitespace-nowrap px-3 py-2">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leads.map((l) => (
                <tr key={l.applicationId}>
                  <td className="whitespace-nowrap px-3 py-2 font-medium">{l.applicationId}</td>
                  <td className="whitespace-nowrap px-3 py-2">{l.name}</td>
                  <td className="whitespace-nowrap px-3 py-2 font-mono">{l.mobileNumber}</td>
                  <td className="px-3 py-2">{l.netWeightGrams}</td>
                  <td className="whitespace-nowrap px-3 py-2">{l.planName}</td>
                  <td className="whitespace-nowrap px-3 py-2">{inr(l.eligibleLoanRupees)}</td>
                  <td className="px-3 py-2">
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                      {l.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}