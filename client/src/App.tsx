import { useState } from "react";
import ApplyFlow from "./ApplyFlow";
import ChatPanel from "./ChatPanel";
import LeadsTable from "./LeadsTable";

type Tab = "apply" | "chat" | "admin";

const TABS: { id: Tab; label: string }[] = [
  { id: "apply", label: "Apply" },
  { id: "chat", label: "Chat" },
  { id: "admin", label: "Admin" },
];

export default function App() {
  const [tab, setTab] = useState<Tab>("apply");
  const width = tab === "admin" ? "max-w-3xl" : "max-w-md";

  const tabClass = (active: boolean) =>
    `rounded-lg px-4 py-2 text-sm font-medium ${
      active ? "bg-white text-emerald-800" : "text-emerald-50 hover:bg-emerald-600"
    }`;

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-emerald-700 text-white">
        <div className={`mx-auto flex items-center justify-between gap-2 px-4 py-3 ${width}`}>
          <h1 className="text-lg font-bold">Gold Loan Portal</h1>
          <nav className="flex gap-1" aria-label="Sections">
            {TABS.map((t) => (
              <button
                key={t.id}
                className={tabClass(tab === t.id)}
                aria-current={tab === t.id ? "page" : undefined}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className={`mx-auto p-4 ${width}`}>
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          {tab === "apply" && <ApplyFlow />}
          {tab === "chat" && <ChatPanel />}
          {tab === "admin" && <LeadsTable />}
        </div>
      </main>
    </div>
  );
}