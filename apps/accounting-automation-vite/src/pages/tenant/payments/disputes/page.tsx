"use client";

import { useEffect, useState } from "react";
import { api } from "../../../../lib/api";

export default function DisputesPage() {
  const [disputeId, setDisputeId] = useState("");
  const [dispute, setDispute] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  // --- File Dispute form state ---
  const [customerId, setCustomerId] = useState("");
  const [txId, setTxId] = useState("");
  const [reason, setReason] = useState("");

  // --- Resolve Dispute form state ---
  const [status, setStatus] = useState("");
  const [resolution, setResolution] = useState("");

  // --- Get Dispute by ID ---
  const fetchDispute = async (id: string) => {
    try {
      setLoading(true);
      const d = await api(`/disputes/${id}`);
      setDispute(d);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch dispute");
    } finally {
      setLoading(false);
    }
  };

  // --- File Dispute ---
  const fileDispute = async () => {
    try {
      if (!customerId || !txId || !reason) {
        alert("Please fill all fields");
        return;
      }
      const dto = { customerId, txId, reason };
      const d = await api("/disputes", {
        method: "POST",
        body: JSON.stringify(dto),
      });
      setDispute(d);
      setDisputeId(d.id);
      alert(`Dispute filed: ${d.id}`);
      setCustomerId("");
      setTxId("");
      setReason("");
    } catch (err) {
      console.error(err);
      alert("Failed to file dispute");
    }
  };

  // --- Resolve Dispute ---
  const resolveDispute = async () => {
    try {
      if (!disputeId || !status) {
        alert("Dispute ID and status required");
        return;
      }
      const dto = { status, resolution };
      const updated = await api(`/disputes/${disputeId}/resolve`, {
        method: "POST",
        body: JSON.stringify(dto),
      });
      setDispute(updated);
      alert(`Dispute ${disputeId} resolved to ${status}`);
      setStatus("");
      setResolution("");
    } catch (err) {
      console.error(err);
      alert("Failed to resolve dispute");
    }
  };
  return (
  <div className="p-6 bg-white min-h-screen text-gray-900">
    {/* Title */}
    <h1 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-emerald-400 drop-shadow-lg">
      Disputes
    </h1>

    {/* File Dispute Section */}
    <div className="mb-6 bg-gray-900 rounded-2xl shadow-xl shadow-green-500/30 p-6 text-gray-100">
      <h2 className="text-lg font-semibold mb-4 text-green-300 drop-shadow">
        File a Dispute
      </h2>
      <div className="flex flex-wrap gap-3 mb-3">
        <input
          type="text"
          placeholder="Customer ID"
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          className="p-2 rounded bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-green-400 outline-none w-40"
        />
        <input
          type="text"
          placeholder="Transaction ID"
          value={txId}
          onChange={(e) => setTxId(e.target.value)}
          className="p-2 rounded bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-green-400 outline-none w-56"
        />
        <input
          type="text"
          placeholder="Reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="p-2 rounded bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-green-400 outline-none w-60"
        />
        <button
          onClick={fileDispute}
          className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-400 text-white rounded-lg shadow hover:scale-105 transition"
        >
          File
        </button>
      </div>
    </div>

    {/* Resolve Dispute Section */}
    <div className="mb-6 bg-gray-900 rounded-2xl shadow-xl shadow-blue-500/30 p-6 text-gray-100">
      <h2 className="text-lg font-semibold mb-4 text-cyan-300 drop-shadow">
        Resolve Dispute
      </h2>
      <div className="flex flex-wrap gap-3 mb-3">
        <input
          type="text"
          placeholder="Dispute ID"
          value={disputeId}
          onChange={(e) => setDisputeId(e.target.value)}
          className="p-2 rounded bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-cyan-400 outline-none w-56"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="p-2 rounded bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-cyan-400 outline-none w-40"
        >
          <option value="">-- Select Status --</option>
          <option value="resolved">Resolved</option>
          <option value="rejected">Rejected</option>
        </select>
        <input
          type="text"
          placeholder="Resolution (e.g. refund_customer)"
          value={resolution}
          onChange={(e) => setResolution(e.target.value)}
          className="p-2 rounded bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-cyan-400 outline-none w-56"
        />
        <button
          onClick={resolveDispute}
          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-lg shadow hover:scale-105 transition"
        >
          Resolve
        </button>
      </div>
    </div>

    {/* Get Dispute Section */}
    <div className="bg-gray-900 rounded-2xl shadow-xl shadow-purple-500/30 p-6 text-gray-100">
      <h2 className="text-lg font-semibold mb-4 text-purple-300 drop-shadow">
        Get Dispute
      </h2>
      <div className="flex gap-3 mb-3">
        <input
          type="text"
          placeholder="Dispute ID"
          value={disputeId}
          onChange={(e) => setDisputeId(e.target.value)}
          className="p-2 rounded bg-gray-800 border border-gray-700 focus:ring-2 focus:ring-purple-400 outline-none w-56"
        />
        <button
          onClick={() => fetchDispute(disputeId)}
          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-lg shadow hover:scale-105 transition"
        >
          Fetch
        </button>
      </div>

      {loading ? (
        <p className="text-gray-400">Loading dispute...</p>
      ) : dispute ? (
        <div className="p-4 border border-gray-700 rounded-lg bg-gray-800">
          <p>
            <strong>ID:</strong> {dispute.id}
          </p>
          <p>
            <strong>Status:</strong> {dispute.status}
          </p>
          <p>
            <strong>Reason:</strong> {dispute.reason}
          </p>
          <p>
            <strong>Resolution:</strong> {dispute.resolution || "—"}
          </p>
          <p>
            <strong>TxID:</strong> {dispute.txId}
          </p>
          <p>
            <strong>Customer:</strong> {dispute.customerId}
          </p>
        </div>
      ) : (
        <p className="text-gray-500 italic">No dispute selected.</p>
      )}
    </div>
  </div>
);

}