"use client";

import { useEffect, useState } from "react";
import { api } from "../../../../lib/api";

export default function LedgersPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [stats, setStats] = useState<{ credits: number; debits: number } | null>(null);
  const [loading, setLoading] = useState(true);
const [tenant, setTenant] = useState<any | null>(null);

  // Transaction form state
  const [branchId, setBranchId] = useState("");
  const [externalId, setExternalId] = useState("");
  const [description, setDescription] = useState("");
  const [source, setSource] = useState("");
  const [occurredAt, setOccurredAt] = useState("");
  const [entries, setEntries] = useState<any[]>([
    { accountCode: "", debit: 0, credit: 0, currency: "USD" },
  ]);

  // Filters for list + export
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [account, setAccount] = useState("");
  const [type, setType] = useState("");
  const [exportFormat, setExportFormat] = useState("csv");

  // ---------------- Fetch on mount ----------------
  useEffect(() => {
    Promise.all([api("/ledger/transactions"), api("/ledger/stats")])
      .then(([txs, s]) => {
        setTransactions(txs.items);
        setStats(s);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);


  useEffect(() => {
  api("/tenants/me")
    .then(setTenant)
    .catch(() => setTenant(null));
}, []);
  // ---------------- Add Transaction ----------------
 const addTransaction = async () => {
  try {
    if (!occurredAt || entries.length < 2) {
      alert("Please provide at least 2 entries (one debit, one credit)");
      return;
    }

   // const tenantId = localStorage.getItem("tenantId"); // 👈 ensure this exists
    if (!tenant) {
  alert("Tenant not loaded. Please log in again.");
  return;
}

const dto = {
  tenantId: tenant.id,   // 👈 use tenant from API
  branchId: branchId || null,
  externalId: externalId || null,
  description,
  source,
  occurredAt,
  entries,
};

    const tx = await api("/ledger/transactions", {
      method: "POST",
      body: JSON.stringify(dto),
    });

    setTransactions((prev) => [{ ...tx, entries: tx.entries ?? [] }, ...prev]);
    // reset form
    setBranchId("");
    setExternalId("");
    setDescription("");
    setSource("");
    setOccurredAt("");
    setEntries([{ accountCode: "", debit: 0, credit: 0, currency: "USD" }]);
         setTimeout(async () => {
      try {
        const latest = await api("/ledger/transactions");
        setTransactions(latest.items);
      } catch (err) {
        console.error("Failed to refresh transactions", err);
      }
    }, 2000);
  }
   catch (err) {
    console.error(err);
    alert("Failed to create transaction");
  }
};
  // ---------------- Filter Transactions ----------------
  const fetchFiltered = async () => {
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (account) params.set("account", account);
      if (type) params.set("type", type);
      const data = await api(`/ledger/transactions?${params.toString()}`);
      setTransactions(data.items);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch transactions");
    }
  };

  // ---------------- Export ----------------
  const exportLedger = async () => {
    try {
      const params = new URLSearchParams();
      if (from) params.set("dateFrom", from);
      if (to) params.set("dateTo", to);
      if (account) params.set("account", account);
      params.set("format", exportFormat);

     const blob = await api(`/ledger/export?${params.toString()}`, { raw: true });
console.log("Blob received:", blob, blob.type, blob.size);
      const url = window.URL.createObjectURL(blob);
     const a = document.createElement("a");
    a.href = url;
    a.download = `ledger.${exportFormat}`;
    document.body.appendChild(a);   // required for Chrome/Firefox
    a.click();
    document.body.removeChild(a);   // cleanup
    window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Failed to export ledger");
    }
  };

  if (loading) return <p className="p-6">Loading ledger data...</p>;
   return (
    <div className="p-6 bg-white min-h-screen text-gray-900">
      {/* Title */}
      <h1 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400 drop-shadow-lg">
        Ledger Management
      </h1>

      {/* Stats */}
      <div className="p-6 bg-gray-900 rounded-2xl shadow-xl shadow-blue-500/30 text-gray-100 mb-8">
        <h2 className="text-lg font-semibold mb-3 text-cyan-300 drop-shadow">
          Ledger Stats
        </h2>
        {stats ? (
          <p className="text-gray-300">
            <strong className="text-green-400">Credits:</strong> {stats.credits} |{" "}
            <strong className="text-red-400">Debits:</strong> {stats.debits}
          </p>
        ) : (
          <p className="text-gray-500 italic">No stats available</p>
        )}
      </div>

      {/* Add Transaction */}
      <div className="p-6 bg-gray-900 rounded-2xl shadow-xl shadow-blue-500/30 text-gray-100 mb-8">
        {/* ⚠️ Warning heading */}
        <div className="mb-4 p-3 bg-red-900/50 border border-red-500 text-red-300 rounded-lg">
          ⚠️ You must have accounts created in the Chart of Accounts.  
          Use their codes in the entries below.  
          If you use codes that do not exist, the transaction will fail.
        </div>

        <h2 className="text-lg font-semibold mb-4 text-cyan-300 drop-shadow">
          Add Transaction
        </h2>

        {/* Input Fields */}
        <div className="grid grid-cols-5 gap-3 mb-6">
          <input
            type="text"
            placeholder="Branch ID"
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className="border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="External ID"
            value={externalId}
            onChange={(e) => setExternalId(e.target.value)}
            className="border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 rounded-lg w-full focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="Source"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="date"
            value={occurredAt}
            onChange={(e) => setOccurredAt(e.target.value)}
            className="border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Entries Table */}
        <table className="w-full text-sm border border-gray-700 rounded-lg overflow-hidden mb-6">
          <thead className="bg-gray-800 text-gray-300">
            <tr>
              <th className="p-2 text-left">Account Code</th>
              <th className="p-2 text-right">Debit</th>
              <th className="p-2 text-right">Credit</th>
              <th className="p-2 text-left">Currency</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, idx) => (
              <tr key={idx} className="border-t border-gray-700 hover:bg-gray-800/60 transition">
                <td className="p-2">
                  <input
                    type="text"
                    value={entry.accountCode}
                    onChange={(e) =>
                      setEntries((prev) =>
                        prev.map((en, i) =>
                          i === idx ? { ...en, accountCode: e.target.value } : en
                        )
                      )
                    }
                    className="border border-gray-700 bg-gray-800 text-gray-100 px-2 py-1 rounded w-full focus:ring-2 focus:ring-blue-500"
                    placeholder="Code"
                  />
                </td>
                <td className="p-2">
                  <input
                    type="number"
                    value={entry.debit}
                    onChange={(e) =>
                      setEntries((prev) =>
                        prev.map((en, i) =>
                          i === idx ? { ...en, debit: Number(e.target.value) } : en
                        )
                      )
                    }
                    className="border border-gray-700 bg-gray-800 text-green-400 px-2 py-1 rounded w-full text-right focus:ring-2 focus:ring-green-400"
                  />
                </td>
                <td className="p-2">
                  <input
                    type="number"
                    value={entry.credit}
                    onChange={(e) =>
                      setEntries((prev) =>
                        prev.map((en, i) =>
                          i === idx ? { ...en, credit: Number(e.target.value) } : en
                        )
                      )
                    }
                    className="border border-gray-700 bg-gray-800 text-red-400 px-2 py-1 rounded w-full text-right focus:ring-2 focus:ring-red-400"
                  />
                </td>
                <td className="p-2">
                  <input
                    type="text"
                    value={entry.currency}
                    onChange={(e) =>
                      setEntries((prev) =>
                        prev.map((en, i) =>
                          i === idx ? { ...en, currency: e.target.value } : en
                        )
                      )
                    }
                    className="border border-gray-700 bg-gray-800 text-gray-100 px-2 py-1 rounded w-full focus:ring-2 focus:ring-blue-500"
                  />
                </td>
                <td className="p-2 text-center">
                  <button
                    onClick={() =>
                      setEntries((prev) => prev.filter((_, i) => i !== idx))
                    }
                    className="text-red-400 font-bold hover:text-red-600 transition"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={() =>
              setEntries((prev) => [
                ...prev,
                { accountCode: "", debit: 0, credit: 0, currency: "USD" },
              ])
            }
            className="px-3 py-1 bg-gray-800 rounded-lg text-gray-200 hover:bg-gray-700 transition"
          >
            + Add Entry
          </button>
          <button
            onClick={addTransaction}
            className="px-4 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition"
          >
            Save Transaction
          </button>
        </div>
      </div>

      {/* Filters + Export */}
      <div className="p-6 bg-gray-900 rounded-2xl shadow-xl shadow-blue-500/30 text-gray-100 mb-8">
        <h2 className="text-lg font-semibold mb-4 text-cyan-300 drop-shadow">
          Filter & Export
        </h2>
        <div className="flex flex-wrap gap-3 mb-4">
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="Account Code"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            className="border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All</option>
            <option value="debit">Debit</option>
            <option value="credit">Credit</option>
          </select>
          <button
            onClick={fetchFiltered}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition"
          >
            Apply
          </button>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value)}
            className="border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="csv">CSV</option>
            <option value="xlsx">XLSX</option>
          </select>
          <button
            onClick={exportLedger}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg shadow hover:bg-purple-700 transition"
          >
            Export
          </button>
        </div>
      </div>

      {/* Transactions */}
      <div className="p-6 bg-gray-900 rounded-2xl shadow-xl shadow-blue-500/30 text-gray-100">
        <h2 className="text-lg font-semibold mb-4 text-cyan-300 drop-shadow">
          Transactions
        </h2>
        {transactions.length === 0 ? (
          <p className="text-gray-500 italic">No transactions yet.</p>
        ) : (
          <table className="w-full text-sm border border-gray-700 rounded-lg overflow-hidden">
            <thead className="bg-gray-800 text-gray-300">
              <tr>
                <th className="p-2 text-left">Date</th>
                <th className="p-2 text-left">Description</th>
                <th className="p-2 text-left">Source</th>
                <th className="p-2 text-left">Branch</th>
                <th className="p-2 text-left">Entries</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr
                  key={tx.id}
                  className="border-t border-gray-700 hover:bg-gray-800/50 transition align-top"
                >
                  <td className="p-2">
                    {new Date(tx.occurredAt).toLocaleDateString()}
                  </td>
                  <td className="p-2">{tx.description}</td>
                  <td className="p-2">{tx.source}</td>
                  <td className="p-2">{tx.branchId || "-"}</td>
                  <td className="p-2">
                    <table className="w-full text-xs border border-gray-700 rounded">
                      <thead className="bg-gray-800 text-gray-400">
                        <tr>
                          <th className="p-1 text-left">Account</th>
                          <th className="p-1 text-right">Debit</th>
                          <th className="p-1 text-right">Credit</th>
                          <th className="p-1 text-left">Currency</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(tx.entries ?? []).map((en: any, i: number) => (
                          <tr key={en.id || i} className="border-t border-gray-700">
                            <td className="p-1">{en.accountId}</td>
                            <td className="p-1 text-right text-green-400">{en.debit}</td>
                            <td className="p-1 text-right text-red-400">{en.credit}</td>
                            <td className="p-1">{en.currency}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
