"use client";

import {useEffect, useState } from "react";
import { api } from "../../../../lib/api";

// ---------------- Types ----------------
type TrialBalanceRow = {
  account: string;
  debit: number;
  credit: number;
};

type FinancialReport = {
  title: string;
  data: Record<string, number | string>[];
};

type ExportFormat = "csv" | "xlsx" | "pdf" | "json";

// ---------------- Component ----------------
export default function ReportsPage() {
  const [trialBalance, setTrialBalance] = useState<TrialBalanceRow[]>([]);
  const [balanceSheet, setBalanceSheet] = useState<FinancialReport | null>(null);
  const [incomeStatement, setIncomeStatement] = useState<FinancialReport | null>(null);
  const [cashFlow, setCashFlow] = useState<FinancialReport | null>(null);
  const [budgetVariance, setBudgetVariance] = useState<FinancialReport | null>(null);
const [alerts, setAlerts] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
 const [tab, setTab] = useState<
  | "trial-balance"
  | "balance-sheet"
  | "income-statement"
  | "cash-flow"
  | "budget-variance"
  | "close-period"
  | "exports"
>("trial-balance");
useEffect(() => {
  api("/alerts")
    .then(setAlerts)
    .catch(() => setAlerts([]));
}, []);
  // ---- Helpers ----
  async function fetchTrialBalance(start: string, end: string) {
    setLoading(true);
    try {
     const data = await api(`/reporting/trial-balance?start=${start}&end=${end}`);

      setTrialBalance(data);
    } finally {
      setLoading(false);
    }
  }

  async function fetchBalanceSheet(asOf: string) {
    setLoading(true);
    try {
      const data = await api(`/reporting/balance-sheet?asOf=${asOf}`);
      setBalanceSheet(data);
    } finally {
      setLoading(false);
    }
  }

  async function fetchIncomeStatement(start: string, end: string) {
    setLoading(true);
    try {
      const data = await api(`/reporting/income-statement?start=${start}&end=${end}`);
      setIncomeStatement(data);
    } finally {
      setLoading(false);
    }
  }

  async function fetchCashFlow(start: string, end: string) {
    setLoading(true);
    try {
      const data = await api(`/reporting/cash-flow?start=${start}&end=${end}`);
      setCashFlow(data);
    } finally {
      setLoading(false);
    }
  }

  async function fetchBudgetVariance(year: number, period: string) {
    setLoading(true);
    try {
      const data = await api(`/reporting/budget-variance?year=${year}&period=${period}`);
      setBudgetVariance(data);
    } finally {
      setLoading(false);
    }
  }

  async function downloadReport(type: "ledger" | "payments" | "compliance", format: ExportFormat) {
   const url = `/reporting/${type}-report?format=${format}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });

    if (!res.ok) {
      alert(`Failed to download ${type} report`);
      return;
    }

    if (format === "json") {
      const data = await res.json();
      console.log(`${type} JSON report:`, data);
      return;
    }

    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = window.URL.createObjectURL(blob);
    a.download = `${type}-report.${format}`;
    a.click();
  }
// ---------------- Reports ----------------
return (
  <div className="p-6 bg-white min-h-screen text-gray-900">
    {/* Alerts */}
    {alerts.length > 0 && (
      <div className="mb-6 bg-red-900/70 border border-red-500 rounded-2xl shadow-xl shadow-red-500/30 p-6 text-red-200">
        <h2 className="text-lg font-bold mb-2 text-red-400 drop-shadow">Compliance Alerts</h2>
        <ul className="list-disc pl-6 space-y-1">
          {alerts.map((a, i) => (
            <li key={i}>{a.message}</li>
          ))}
        </ul>
      </div>
    )}

    {/* Title */}
    <h1 className="text-3xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400 drop-shadow-lg">
      Financial Reports
    </h1>

    {/* Tabs */}
    <div className="flex flex-wrap gap-3 mb-8">
      {[
        "trial-balance",
        "balance-sheet",
        "income-statement",
        "cash-flow",
        "close-period",
        "budget-variance",
        "exports",
      ].map((t) => (
        <button
          key={t}
          onClick={() => setTab(t as any)}
          className={`px-4 py-2 rounded-xl font-medium transition transform hover:scale-105 shadow-md ${
            tab === t
              ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg"
              : "bg-gray-900 text-gray-200 hover:bg-gray-800"
          }`}
        >
          {t.replace("-", " ").toUpperCase()}
        </button>
      ))}
    </div>

    {loading && <p className="text-gray-500">Loading...</p>}

    {!loading && (
      <>
        {/* Trial Balance */}
        {tab === "trial-balance" && (
          <div className="bg-gray-900 rounded-2xl shadow-xl shadow-blue-500/30 p-6 text-gray-100">
            <h2 className="text-xl font-semibold mb-4 text-cyan-300 drop-shadow">
              Trial Balance
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                fetchTrialBalance(fd.get("start") as string, fd.get("end") as string);
              }}
              className="mb-6 flex gap-3"
            >
              <input type="date" name="start" required className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500" />
              <input type="date" name="end" required className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500" />
              <button className="bg-gradient-to-r from-green-600 to-emerald-500 text-white px-4 py-2 rounded-lg font-medium shadow-md hover:scale-105 transition">
                Fetch
              </button>
            </form>

            <table className="w-full text-sm border border-gray-700 rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-gray-800 text-gray-300">
                  <th className="p-3 text-left">Account</th>
                  <th className="p-3 text-left">Debit</th>
                  <th className="p-3 text-left">Credit</th>
                </tr>
              </thead>
              <tbody>
                {trialBalance.map((row, i) => (
                  <tr key={i} className="border-t border-gray-700 hover:bg-gray-800/60">
                    <td className="p-3">{row.account}</td>
                    <td className="p-3 text-green-400">${row.debit.toFixed(2)}</td>
                    <td className="p-3 text-red-400">${row.credit.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Balance Sheet */}
        {tab === "balance-sheet" && (
          <div className="bg-gray-900 rounded-2xl shadow-xl shadow-blue-500/30 p-6 text-gray-100">
            <h2 className="text-xl font-semibold mb-4 text-cyan-300 drop-shadow">
              Balance Sheet
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                fetchBalanceSheet(fd.get("asOf") as string);
              }}
              className="mb-4 flex gap-3"
            >
              <input type="date" name="asOf" required className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-cyan-500" />
              <button className="bg-gradient-to-r from-green-600 to-emerald-500 text-white px-4 py-2 rounded-lg shadow hover:scale-105 transition">
                Fetch
              </button>
            </form>
            {balanceSheet && (
              <pre className="bg-gray-800 p-4 rounded-lg text-gray-300 text-sm overflow-x-auto">
                {JSON.stringify(balanceSheet, null, 2)}
              </pre>
            )}
          </div>
        )}

        {/* Income Statement */}
        {tab === "income-statement" && (
          <div className="bg-gray-900 rounded-2xl shadow-xl shadow-blue-500/30 p-6 text-gray-100">
            <h2 className="text-xl font-semibold mb-4 text-cyan-300 drop-shadow">
              Income Statement
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                fetchIncomeStatement(fd.get("start") as string, fd.get("end") as string);
              }}
              className="mb-4 flex gap-3"
            >
              <input type="date" name="start" required className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2" />
              <input type="date" name="end" required className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2" />
              <button className="bg-gradient-to-r from-green-600 to-emerald-500 text-white px-4 py-2 rounded-lg">
                Fetch
              </button>
            </form>
            {incomeStatement && (
              <pre className="bg-gray-800 p-4 rounded-lg text-gray-300 text-sm overflow-x-auto">
                {JSON.stringify(incomeStatement, null, 2)}
              </pre>
            )}
          </div>
        )}

        {/* Cash Flow */}
        {tab === "cash-flow" && (
          <div className="bg-gray-900 rounded-2xl shadow-xl shadow-blue-500/30 p-6 text-gray-100">
            <h2 className="text-xl font-semibold mb-4 text-cyan-300 drop-shadow">
              Cash Flow
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                fetchCashFlow(fd.get("start") as string, fd.get("end") as string);
              }}
              className="mb-4 flex gap-3"
            >
              <input type="date" name="start" required className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2" />
              <input type="date" name="end" required className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2" />
              <button className="bg-gradient-to-r from-green-600 to-emerald-500 text-white px-4 py-2 rounded-lg">
                Fetch
              </button>
            </form>
            {cashFlow && (
              <pre className="bg-gray-800 p-4 rounded-lg text-gray-300 text-sm overflow-x-auto">
                {JSON.stringify(cashFlow, null, 2)}
              </pre>
            )}
          </div>
        )}

        {/* Budget Variance */}
        {tab === "budget-variance" && (
          <div className="bg-gray-900 rounded-2xl shadow-xl shadow-blue-500/30 p-6 text-gray-100">
            <h2 className="text-xl font-semibold mb-4 text-cyan-300 drop-shadow">
              Budget Variance
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                fetchBudgetVariance(Number(fd.get("year")), fd.get("period") as string);
              }}
              className="mb-4 flex gap-3"
            >
              <input type="number" name="year" placeholder="Year" required className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2" />
              <input name="period" placeholder="Period" required className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2" />
              <button className="bg-gradient-to-r from-green-600 to-emerald-500 text-white px-4 py-2 rounded-lg">
                Fetch
              </button>
            </form>
            {budgetVariance && (
              <pre className="bg-gray-800 p-4 rounded-lg text-gray-300 text-sm overflow-x-auto">
                {JSON.stringify(budgetVariance, null, 2)}
              </pre>
            )}
          </div>
        )}

        {/* Close Period */}
        {tab === "close-period" && (
          <div className="bg-gray-900 rounded-2xl shadow-xl shadow-blue-500/30 p-6 text-gray-100">
            <h2 className="text-xl font-semibold mb-4 text-cyan-300 drop-shadow">
              Close Period
            </h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
              try {
  setLoading(true);
  const result = await api("/reporting/close-period", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      period: fd.get("period"),
      startDate: fd.get("startDate"),
      endDate: fd.get("endDate"),
    }),
  });
  alert("Period closed successfully!");
  console.log("Close Period result:", result);
} catch (err) {
  console.error(err);
  alert("Failed to close period");
} finally {
  setLoading(false);   // <-- ensure loading reset
}

              }}
              className="mb-4 flex gap-3"
            >
              <input name="period" placeholder="Period (e.g. Q1-2025)" required className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2" />
              <input type="date" name="startDate" required className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2" />
              <input type="date" name="endDate" required className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2" />
              <button className="bg-gradient-to-r from-green-600 to-emerald-500 text-white px-4 py-2 rounded-lg">
                Close
              </button>
            </form>
          </div>
        )}

        {/* Exports */}
        {tab === "exports" && (
          <div className="bg-gray-900 rounded-2xl shadow-xl shadow-blue-500/30 p-6 text-gray-100">
            <h2 className="text-xl font-semibold mb-6 text-cyan-300 drop-shadow">
              Export Reports
            </h2>
            {["ledger", "payments", "compliance"].map((type) => (
              <div key={type} className="mb-6">
                <h3 className="font-medium mb-3 text-gray-200">{type.toUpperCase()} Report</h3>
                {["csv", "xlsx", "pdf", "json"].map((f) => (
                  <button
                    key={f}
                    onClick={() => downloadReport(type as any, f as ExportFormat)}
                    className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-4 py-2 rounded-lg mr-3 mb-2 shadow-md hover:scale-105 transition"
                  >
                    {f.toUpperCase()}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </>
    )}
  </div>
);

}
