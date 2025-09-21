"use client";

import { useEffect, useState } from "react";
import { api } from "../../../lib/api";

type Wallet = {
  id: string;
  name: string;
  balance: number;
  currency: string;
};
type Transfer = {
  id: string;
  fromWalletId: string;
  toWalletId: string;
  amount: number;
  currency: string;
  status: string;
  txHash?: string;
  createdAt?: string; // optional
};

export default function FundsPage() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);

  // ---- Form state ----
  const [fromWalletId, setFromWalletId] = useState("");
  const [toWalletId, setToWalletId] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");

  // ---- Fetch wallets and transfers ----
  useEffect(() => {
    Promise.all([api("/wallets"), api("/funds")]) // adjust if /funds GET route exists
      .then(([wallets, transfers]) => {
        setWallets(wallets);
        setTransfers(transfers);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // ---- Handlers ----
  async function handleTransfer(e: React.FormEvent) {
    e.preventDefault();
    try {
      const body = { fromWalletId, toWalletId, amount: Number(amount), currency };
      const transfer = await api("/funds/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setTransfers((prev) => [transfer, ...prev]);
      alert("Transfer initiated");
      setFromWalletId("");
      setToWalletId("");
      setAmount("");
    } catch (err) {
      console.error(err);
      alert("Failed to transfer funds");
    }
  }

  async function refreshStatus(id: string) {
    try {
      const status = await api(`/funds/status/${id}`);
      setTransfers((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...status } : t))
      );
    } catch (err) {
      console.error(err);
      alert("Failed to refresh status");
    }
  }

  return (
  <div className="p-6 bg-white min-h-screen text-gray-900">
    {/* Title */}
    <h1 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400 drop-shadow-lg">
      Funds Transfers
    </h1>

    {/* Transfer Form */}
    <form
      onSubmit={handleTransfer}
      className="mb-6 bg-gray-900 rounded-2xl shadow-xl shadow-blue-500/30 p-6 text-gray-100 flex flex-wrap gap-4"
    >
      <select
        value={fromWalletId}
        onChange={(e) => setFromWalletId(e.target.value)}
        required
        className="border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 transition w-48"
      >
        <option value="">From Wallet</option>
        {wallets.map((w) => (
          <option key={w.id} value={w.id}>
            {w.name} ({w.balance} {w.currency})
          </option>
        ))}
      </select>

      <select
        value={toWalletId}
        onChange={(e) => setToWalletId(e.target.value)}
        required
        className="border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 transition w-48"
      >
        <option value="">To Wallet</option>
        {wallets.map((w) => (
          <option key={w.id} value={w.id}>
            {w.name} ({w.balance} {w.currency})
          </option>
        ))}
      </select>

      <input
        type="number"
        step="0.01"
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        required
        className="border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 transition w-28"
      />

      <input
        type="text"
        placeholder="Currency"
        value={currency}
        onChange={(e) => setCurrency(e.target.value)}
        required
        className="border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 transition w-24"
      />

      <button className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-lg hover:scale-105 transition">
        Transfer
      </button>
    </form>

    {/* Transfers List */}
    <div className="bg-gray-900 rounded-2xl shadow-xl shadow-blue-500/30 p-6 text-gray-100">
      <h2 className="text-lg font-semibold text-cyan-300 mb-4">Transfers</h2>
      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : transfers.length === 0 ? (
        <p className="text-gray-400 italic">No transfers found.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 text-gray-300">
              <th className="p-3 text-left">ID</th>
              <th className="p-3 text-left">From</th>
              <th className="p-3 text-left">To</th>
              <th className="p-3 text-right">Amount</th>
              <th className="p-3 text-left">Currency</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Tx Hash</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {transfers.map((t) => (
              <tr
                key={t.id}
                className="border-b border-gray-700 hover:bg-gray-700/40 transition"
              >
                <td className="p-3">{t.id}</td>
                <td className="p-3">{t.fromWalletId}</td>
                <td className="p-3">{t.toWalletId}</td>
                <td className="p-3 text-right text-green-400 font-medium">
                  {t.amount}
                </td>
                <td className="p-3">{t.currency}</td>
                <td className="p-3">{t.status}</td>
                <td className="p-3">{t.txHash || "—"}</td>
                <td className="p-3">
                  <button
                    onClick={() => refreshStatus(t.id)}
                    className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded transition"
                  >
                    Refresh
                  </button>
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
