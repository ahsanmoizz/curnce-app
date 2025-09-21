"use client";

import { useEffect, useState } from "react";
import { api } from "../../../../lib/api";

export default function RefundsPage() {
  const [refunds, setRefunds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // --- Form state ---
  const [customerId, setCustomerId] = useState("");
  const [originalTransactionId, setOriginalTransactionId] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [currency, setCurrency] = useState("USD");
  const [reason, setReason] = useState("");
  const [destination, setDestination] = useState("original");

  const [refundId, setRefundId] = useState(""); // used for approve/release/fetch

  // Fetch refunds on mount
  useEffect(() => {
    api("/refunds")
      .then(setRefunds)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // --- Request Refund ---
  const requestRefund = async () => {
    try {
      if (!customerId || !originalTransactionId || !amount || !currency) {
        alert("Please fill all required fields");
        return;
      }
      const dto = { customerId, originalTransactionId, amount, currency, reason, destination };
      const refund = await api("/refunds/request", {
        method: "POST",
        body: JSON.stringify(dto),
      });
      setRefunds((prev) => [refund, ...prev]);
      setCustomerId("");
      setOriginalTransactionId("");
      setAmount("");
      setCurrency("USD");
      setReason("");
      setDestination("original");
      alert("Refund requested!");
    } catch (err) {
      console.error(err);
      alert("Failed to request refund");
    }
  };

  // --- Approve Refund ---
  const approveRefund = async () => {
    try {
      if (!refundId) {
        alert("Enter refund ID to approve");
        return;
      }
      const result = await api(`/refunds/${refundId}/approve`, { method: "PATCH" });
      setRefunds((prev) =>
        prev.map((r) => (r.id === refundId ? { ...r, status: "approved" } : r))
      );
      alert(`Refund approved: ${result.refundId}`);
    } catch (err) {
      console.error(err);
      alert("Failed to approve refund");
    }
  };

  // --- Release Refund ---
  const releaseRefund = async () => {
    try {
      if (!refundId) {
        alert("Enter refund ID to release");
        return;
      }
      const result = await api(`/refunds/${refundId}/release`, { method: "PATCH" });
      setRefunds((prev) =>
        prev.map((r) => (r.id === refundId ? { ...r, status: "released" } : r))
      );
      alert(`Refund released: ${result.id}`);
    } catch (err) {
      console.error(err);
      alert("Failed to release refund");
    }
  };

  // --- Get Refund By ID ---
  const getRefund = async () => {
    try {
      if (!refundId) {
        alert("Enter refund ID to fetch");
        return;
      }
      const r = await api(`/refunds/${refundId}`);
      alert(`Refund fetched: ${JSON.stringify(r, null, 2)}`);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch refund");
    }
  };

  // --- Seed Refund ---
  const seedRefund = async () => {
    try {
      const result = await api("/refunds/seed", { method: "POST", body: JSON.stringify({}) });
      setRefunds((prev) => [result.seed, ...prev]);
      alert("Seed refund created");
    } catch (err) {
      console.error(err);
      alert("Failed to seed refund");
    }
  };

  if (loading) return <p className="p-6">Loading refunds...</p>;
return (
  <div className="p-6 bg-white min-h-screen text-gray-900">
    {/* Title */}
    <h1 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-green-400 drop-shadow-lg">
      Refunds Management
    </h1>

    {/* Refunds List */}
    <div className="mb-6 bg-gray-900 rounded-2xl shadow-xl shadow-emerald-500/30 p-6 text-gray-100">
      <h2 className="text-xl font-bold mb-4 text-emerald-300 drop-shadow">
        Refunds
      </h2>
      {refunds.length === 0 ? (
        <p className="text-gray-400 italic">No refunds yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 text-gray-300">
              <th className="p-3 text-left">ID</th>
              <th className="p-3 text-left">Customer</th>
              <th className="p-3 text-left">Original Tx</th>
              <th className="p-3 text-right">Amount</th>
              <th className="p-3 text-left">Currency</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Reason</th>
            </tr>
          </thead>
          <tbody>
            {refunds.map((r) => (
              <tr
                key={r.id}
                className="border-b border-gray-700 hover:bg-gray-700/50 transition"
              >
                <td className="p-3">{r.id}</td>
                <td className="p-3">{r.customerId}</td>
                <td className="p-3">{r.originalTransactionId}</td>
                <td className="p-3 text-right text-emerald-400 font-medium">
                  {r.amount}
                </td>
                <td className="p-3">{r.currency}</td>
                <td className="p-3">{r.status}</td>
                <td className="p-3">{r.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>

    {/* Request Refund Form */}
    <div className="mb-6 bg-gray-900 rounded-2xl shadow-xl shadow-emerald-500/30 p-6 text-gray-100">
      <h3 className="font-semibold mb-4 text-emerald-300 drop-shadow">
        Request Refund
      </h3>
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Customer ID"
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          className="p-2 rounded bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-emerald-400 outline-none w-40"
        />
        <input
          type="text"
          placeholder="Original Tx ID"
          value={originalTransactionId}
          onChange={(e) => setOriginalTransactionId(e.target.value)}
          className="p-2 rounded bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-emerald-400 outline-none w-40"
        />
        <input
          type="number"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="p-2 rounded bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-emerald-400 outline-none w-32"
        />
        <input
          type="text"
          placeholder="Currency"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="p-2 rounded bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-emerald-400 outline-none w-24"
        />
        <input
          type="text"
          placeholder="Reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="p-2 rounded bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-emerald-400 outline-none w-40"
        />
        <select
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          className="p-2 rounded bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-emerald-400 outline-none"
        >
          <option value="original">Original</option>
          <option value="wallet:custom">Wallet</option>
        </select>
        <button
          onClick={requestRefund}
          className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-400 text-white rounded-lg shadow hover:scale-105 transition"
        >
          Request
        </button>
      </div>
    </div>

    {/* Manage Refund */}
    <div className="mb-6 bg-gray-900 rounded-2xl shadow-xl shadow-blue-500/30 p-6 text-gray-100">
      <h3 className="font-semibold mb-4 text-cyan-300 drop-shadow">
        Manage Refund
      </h3>
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Refund ID"
          value={refundId}
          onChange={(e) => setRefundId(e.target.value)}
          className="p-2 rounded bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-cyan-400 outline-none w-60"
        />
        <button
          onClick={approveRefund}
          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-lg shadow hover:scale-105 transition"
        >
          Approve
        </button>
        <button
          onClick={releaseRefund}
          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-lg shadow hover:scale-105 transition"
        >
          Release
        </button>
        <button
          onClick={getRefund}
          className="px-4 py-2 bg-gradient-to-r from-gray-600 to-gray-500 text-white rounded-lg shadow hover:scale-105 transition"
        >
          Fetch
        </button>
      </div>
    </div>

    {/* Seed Refund */}
    <div className="bg-gray-900 rounded-2xl shadow-xl shadow-yellow-500/30 p-6 text-gray-100">
      <button
        onClick={seedRefund}
        className="px-6 py-2 bg-gradient-to-r from-orange-500 to-yellow-400 text-white font-semibold rounded-lg shadow hover:scale-105 transition"
      >
        Seed Refund
      </button>
    </div>
  </div>
);

}