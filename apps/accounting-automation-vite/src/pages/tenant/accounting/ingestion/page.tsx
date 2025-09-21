"use client";

import { useEffect, useState } from "react";
import { api } from "../../../../lib/api";

type Transaction = {
  id: string;
  description: string;
  externalId?: string;
  source: string;
  occurredAt: string;
  amount: number | string;
  currency: string;
};

type Alert = {
  id: string;
  level: string;
  code: string;
  message: string;
  createdAt: string;
};

export default function IngestionPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"upload" | "transactions" | "alerts">("upload");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [accounts, setAccounts] = useState<any[]>([]);
  const [missingAccounts, setMissingAccounts] = useState<string[]>([]);

  // ---- Fetch data ----
  async function fetchTransactions() {
    const data = await api("/ingestion/transactions?page=1&limit=20");
    setTransactions(data.items || []);
  }

  async function fetchAlerts() {
    const data = await api("/ingestion/alerts?page=1&limit=20");
    setAlerts(data.items || []);
  }

  // ---- Updated useEffect with accounts check ----
  useEffect(() => {
    const load = async () => {
      try {
        const accs = await api("/accounts");
        setAccounts(accs);

        const cash = accs.some(
          (a: any) =>
            a.name?.toLowerCase().includes("cash") && a.type === "ASSET"
        );
        const travel = accs.some((a: any) =>
          a.name?.toLowerCase().includes("travel")
        );
        const revenue = accs.some((a: any) => a.type === "INCOME");

        const missing: string[] = [];
        if (!cash) missing.push("Cash (ASSET)");
        if (!travel) missing.push("Travel Expense");
        if (!revenue) missing.push("Revenue (INCOME)");

        setMissingAccounts(missing);

        await Promise.all([fetchTransactions(), fetchAlerts()]);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ---- Handlers ----
  async function handleUpload(formData: FormData) {
    try {
      const data = await api("/ingestion/bank-csv", {
        method: "POST",
        body: formData, // ✅ browser sets content-type automatically
      });
      alert(`Imported ${data.imported} transactions`);
      await fetchTransactions();
      await fetchAlerts();
    } catch (err: any) {
      console.error("Upload failed:", err);
      alert(err.message || "Upload failed");
    }
  }

  async function confirmSelected() {
    if (selected.size === 0) return;
    try {
      const data = await api("/ingestion/confirm", {
        method: "POST",
        body: JSON.stringify({ txIds: Array.from(selected) }),
        headers: { "Content-Type": "application/json" },
      });
      if (data.status === "ok") {
        alert("Transactions confirmed successfully!");
      } else {
        alert("Confirmation failed. Please try again.");
      }
      setSelected(new Set());
      await fetchTransactions();
    } catch (err: any) {
      console.error("Confirm failed:", err);
      alert(err.message || "Confirm failed");
    }
  }

  async function classifyTx(txId: string) {
    try {
      const data = await api("/ingestion/classify", {
        method: "POST",
        body: JSON.stringify({ txId }),
        headers: { "Content-Type": "application/json" },
      });
      const cat = data.category || "unknown";
      const conf =
        data.confidence !== undefined ? `${data.confidence}` : "N/A";
      alert(`Classified: ${cat} (conf ${conf})`);
    } catch (err: any) {
      console.error("Classification failed:", err);
      alert(err.message || "Classification failed");
    }
  }

  // ---- Missing Accounts Warning ----
  if (!loading && missingAccounts.length > 0) {
    return (
      <div className="p-6 bg-white min-h-screen text-gray-900">
        <h1 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400">
          Bank Ingestion
        </h1>
        <div className="p-6 bg-yellow-100 border border-yellow-300 rounded-lg text-yellow-800">
          ⚠️ The following required accounts are missing:
          <br />
          <ul className="list-disc list-inside mt-2">
            {missingAccounts.map((acc) => (
              <li key={acc}>{acc}</li>
            ))}
          </ul>
          <p className="mt-3">
            Please create these accounts before confirming transactions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white min-h-screen text-gray-900">
      <h1 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400 drop-shadow-lg">
        Bank Ingestion
      </h1>

      {/* Tabs */}
      <div className="flex gap-3 mb-6">
        {["upload", "transactions", "alerts"].map((t) => (
          <button
            key={t}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              tab === t
                ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
            onClick={() => setTab(t as any)}
          >
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <>
          {/* Upload CSV */}
          {tab === "upload" && (
            <div className="bg-gray-900 rounded-2xl shadow-xl shadow-blue-500/30 p-6 text-gray-100">
              <h2 className="font-semibold mb-4 text-lg text-cyan-300 drop-shadow">
                Upload Bank CSV
              </h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  handleUpload(fd);
                  e.currentTarget.reset();
                }}
                className="flex items-center gap-3"
              >
                <input
                  type="file"
                  name="file"
                  required
                  className="border border-gray-700 bg-gray-800 text-gray-100 p-2 rounded-lg"
                />
                <button className="bg-gradient-to-r from-green-600 to-emerald-500 hover:scale-105 transition text-white px-4 py-2 rounded-lg font-medium">
                  Upload
                </button>
              </form>
            </div>
          )}

          {/* Transactions */}
          {tab === "transactions" && (
            <div className="bg-gray-900 rounded-2xl shadow-xl shadow-blue-500/30 p-6 text-gray-100">
              <h2 className="font-semibold mb-4 text-lg text-cyan-300 drop-shadow">
                Transactions
              </h2>
              <button
                onClick={confirmSelected}
                disabled={selected.size === 0}
                className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-4 py-2 rounded-lg mb-4 disabled:opacity-50 hover:scale-105 transition"
              >
                Confirm Selected
              </button>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700 text-gray-300">
                    <th></th>
                    <th className="p-2 text-left">Date</th>
                    <th className="p-2 text-left">Description</th>
                    <th className="p-2 text-left">Amount</th>
                    <th className="p-2 text-left">Currency</th>
                    <th className="p-2 text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t) => (
                    <tr
                      key={t.id}
                      className="border-b border-gray-700 hover:bg-gray-700/50 transition"
                    >
                      <td className="p-2">
                        <input
                          type="checkbox"
                          checked={selected.has(t.id)}
                          onChange={(e) => {
                            const copy = new Set(selected);
                            if (e.target.checked) copy.add(t.id);
                            else copy.delete(t.id);
                            setSelected(copy);
                          }}
                        />
                      </td>
                      <td className="p-2">
                        {new Date(t.occurredAt).toLocaleDateString()}
                      </td>
                      <td className="p-2">{t.description}</td>
                      <td className="p-2 text-green-400">
                        {Number(t.amount).toFixed(2)}
                      </td>
                      <td className="p-2">{t.currency}</td>
                      <td className="p-2">
                        <button
                          onClick={() => classifyTx(t.id)}
                          className="px-3 py-1 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-500 text-white hover:scale-105 transition"
                        >
                          Classify
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Alerts */}
          {tab === "alerts" && (
            <div className="bg-gray-900 rounded-2xl shadow-xl shadow-blue-500/30 p-6 text-gray-100">
              <h2 className="font-semibold mb-4 text-lg text-cyan-300 drop-shadow">
                Alerts
              </h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700 text-gray-300">
                    <th className="p-2 text-left">Level</th>
                    <th className="p-2 text-left">Code</th>
                    <th className="p-2 text-left">Message</th>
                    <th className="p-2 text-left">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((a) => (
                    <tr
                      key={a.id}
                      className="border-b border-gray-700 hover:bg-gray-700/50 transition"
                    >
                      <td className="p-2">{a.level}</td>
                      <td className="p-2">{a.code}</td>
                      <td className="p-2">{a.message}</td>
                      <td className="p-2">
                        {new Date(a.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
