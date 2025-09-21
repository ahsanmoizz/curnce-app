"use client";

import { useEffect, useState } from "react";
import { api } from "../../../lib/api";

type TaxReturn = {
  id: string;
  type: "corporate" | "gst";
  period: string;
  status: string;
  amount: number;
  filedAt?: string;
  paidAt?: string;
  payments?: TaxPayment[];
};

type TaxPayment = {
  id: string;
  taxReturnId: string;
  amount: number;
  paidDate: string;
  reference?: string;
};

export default function TaxesPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [missingAccounts, setMissingAccounts] = useState<string[]>([]);
  const [returns, setReturns] = useState<TaxReturn[]>([]);
  const [payments, setPayments] = useState<TaxPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [tab, setTab] = useState<"returns" | "payments">("returns");

  // --- Form state ---
  const [fileType, setFileType] = useState<"corporate" | "gst">("corporate");
  const [filePeriod, setFilePeriod] = useState("");
  const [payReturnId, setPayReturnId] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState("");
  const [payReference, setPayReference] = useState("");

  // ---- Fetch data ----
  useEffect(() => {
    const loadData = async () => {
      try {
        const accountsRes = await api("/accounts");
        setAccounts(accountsRes);

        // ✅ Fix: allow ANY liability account that has "tax" in name
        const hasTaxLiability = accountsRes.some(
          (a: any) => a.type === "LIABILITY" && a.name?.toLowerCase().includes("tax")
        );
        const hasCash = accountsRes.some(
          (a: any) => a.type === "ASSET" && a.name?.toLowerCase().includes("cash")
        );

        const missing: string[] = [];
        if (!hasTaxLiability) missing.push("Tax Liability (LIABILITY)");
        if (!hasCash) missing.push("Cash (ASSET)");

        setMissingAccounts(missing);

        if (missing.length > 0) {
          setLoading(false);
          return;
        }

        const list = await api("/tax/returns");
        setReturns(list);
        const allPayments = list.flatMap((r: any) => r.payments || []);
        setPayments(allPayments);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // ---- Handlers ----
  async function handleFileTax(formData: FormData) {
    setMessage("");
    try {
      const payload = { type: fileType, period: filePeriod };
      const res = await api("/tax/file", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setMessage("Filed return ✓ id=" + res.id);
      setReturns((prev) => [res, ...prev]);
    } catch (err: any) {
      console.error(err);
      setMessage("Filing failed: " + (err.message || String(err)));
    }
  }

  async function handlePayTax(formData: FormData) {
    setMessage("");
    try {
      const payload = {
        taxReturnId: payReturnId,
        amount: Number(payAmount),
        paidDate: payDate,
        reference: payReference || undefined,
      };
      const res = await api("/tax/pay", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setMessage("Payment recorded ✓ id=" + res.id);
      setPayments((prev) => [res, ...prev]);
      setReturns((prev) =>
        prev.map((r) => (r.id === payReturnId ? { ...r, status: "paid" } : r))
      );
      setPayReturnId("");
      setPayAmount("");
      setPayDate("");
      setPayReference("");
    } catch (err: any) {
      console.error(err);
      setMessage("Payment failed: " + (err.message || String(err)));
    }
  }

  // ---- Block if missing accounts ----
  if (!loading && missingAccounts.length > 0) {
    return (
      <div className="p-6 bg-white min-h-screen text-gray-900">
        <h1 className="text-2xl font-bold mb-6 bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-transparent">
          Tax Management
        </h1>
        <div className="p-6 bg-yellow-100 border border-yellow-300 rounded-lg text-yellow-800 font-medium">
          ⚠️ The following required accounts are missing:
          <ul className="list-disc list-inside mt-2">
            {missingAccounts.map((acc) => (
              <li key={acc}>{acc}</li>
            ))}
          </ul>
          <p className="mt-3">
            Please create these accounts before filing or paying taxes.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="p-6 bg-white min-h-screen text-gray-900">
      <h1 className="text-2xl font-bold mb-6 bg-gradient-to-r from-blue-500 to-cyan-400 bg-clip-text text-transparent">
        Tax Management
      </h1>

      {message && (
        <div className="mb-6 bg-indigo-900/40 text-indigo-300 p-3 rounded-xl border border-indigo-700 shadow shadow-indigo-500/30 text-sm">
          {message}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 flex gap-4">
        {["returns", "payments"].map((t) => (
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

      {/* File Returns */}
      {tab === "returns" && (
        <div className="bg-gray-900 rounded-2xl shadow-xl shadow-blue-500/30 p-6 text-gray-100">
          <h2 className="text-lg font-semibold mb-4 text-cyan-300 drop-shadow">
            File Tax Return
          </h2>
          <form
            action={async (fd) => {
              await handleFileTax(fd);
            }}
            className="flex flex-wrap gap-4 mb-6"
          >
            <select
              value={fileType}
              onChange={(e) => setFileType(e.target.value as any)}
              className="border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 rounded-lg"
            >
              <option value="corporate">Corporate</option>
              <option value="gst">GST</option>
            </select>
            <input
              value={filePeriod}
              onChange={(e) => setFilePeriod(e.target.value)}
              placeholder="2023-08 or 2023-Q1"
              className="border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 rounded-lg"
            />
            <button className="bg-gradient-to-r from-green-600 to-emerald-500 text-white px-4 py-2 rounded-lg hover:scale-105 transition">
              File Return
            </button>
          </form>

          <table className="w-full text-sm">
            <thead className="bg-gray-800 text-gray-300">
              <tr>
                <th className="p-3 text-left">ID</th>
                <th className="p-3 text-left">Type</th>
                <th className="p-3 text-left">Period</th>
                <th className="p-3 text-left">Amount</th>
                <th className="p-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {returns.map((r) => (
                <tr
                  key={r.id}
                  className="border-t border-gray-700 hover:bg-gray-800/50 transition"
                >
                  <td className="p-3">{r.id}</td>
                  <td className="p-3">{r.type}</td>
                  <td className="p-3">{r.period}</td>
                  <td className="p-3 text-green-400">${r.amount.toFixed(2)}</td>
                  <td className="p-3">{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Payments */}
      {tab === "payments" && (
        <div className="bg-gray-900 rounded-2xl shadow-xl shadow-blue-500/30 p-6 text-gray-100">
          <h2 className="text-lg font-semibold mb-4 text-cyan-300 drop-shadow">
            Record Tax Payment
          </h2>
          <form
            action={async (fd) => {
              await handlePayTax(fd);
            }}
            className="flex flex-wrap gap-4 mb-6"
          >
            <select
              value={payReturnId}
              onChange={(e) => setPayReturnId(e.target.value)}
              className="border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 rounded-lg"
            >
              <option value="">Select Return</option>
              {returns.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.type} — {r.period}
                </option>
              ))}
            </select>
            <input
              type="number"
              step="0.01"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              placeholder="Amount"
              className="border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 rounded-lg"
            />
            <input
              type="date"
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
              className="border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 rounded-lg"
            />
            <input
              value={payReference}
              onChange={(e) => setPayReference(e.target.value)}
              placeholder="Reference"
              className="border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 rounded-lg"
            />
            <button className="bg-gradient-to-r from-green-600 to-emerald-500 text-white px-4 py-2 rounded-lg hover:scale-105 transition">
              Record Payment
            </button>
          </form>

          <table className="w-full text-sm">
            <thead className="bg-gray-800 text-gray-300">
              <tr>
                <th className="p-3 text-left">Return</th>
                <th className="p-3 text-left">Amount</th>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Reference</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr
                  key={p.id}
                  className="border-t border-gray-700 hover:bg-gray-800/50 transition"
                >
                  <td className="p-3">{p.taxReturnId}</td>
                  <td className="p-3 text-green-400">${p.amount.toFixed(2)}</td>
                  <td className="p-3">
                    {new Date(p.paidDate).toLocaleDateString()}
                  </td>
                  <td className="p-3">{p.reference || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
