"use client";

import { useEffect, useState } from "react";
import { api } from "../../../../lib/api";

export default function SupportTicketsPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // --- Create Ticket form state ---
  const [newTicket, setNewTicket] = useState({
    subject: "",
    category: "",
    priority: "medium",
  });

  // --- Reply & Status update ---
  const [message, setMessage] = useState("");
  const [newStatus, setNewStatus] = useState("");

  // ---------------- LOADERS ----------------
  async function loadTickets(status?: string) {
    try {
      const items = await api(`/support/tickets${status ? `?status=${status}` : ""}`);
      setTickets(items);
    } catch (err) {
      console.error(err);
      alert("Error loading tickets");
    }
  }

  async function loadTicket(id: string) {
    setLoading(true);
    try {
      const t = await api(`/support/ticket/${id}`);
      setSelectedTicket(t);
      setNewStatus(t.status);
    } catch (err) {
      console.error(err);
      alert("Error loading ticket");
    } finally {
      setLoading(false);
    }
  }

  // ---------------- ACTIONS ----------------
  async function createTicket(e: React.FormEvent) {
    e.preventDefault();
    try {
      const t = await api("/support/ticket", {
        method: "POST",
        body: JSON.stringify(newTicket),
        headers: { "Content-Type": "application/json" },
      });
      alert("Ticket created");
      setTickets([t, ...tickets]);
      setNewTicket({ subject: "", category: "", priority: "medium" });
    } catch (err) {
      console.error(err);
      alert("Error creating ticket");
    }
  }

  async function addMessage() {
    if (!selectedTicket || !message.trim()) return;
    try {
      await api(`/support/ticket/${selectedTicket.id}/message`, {
        method: "POST",
        body: JSON.stringify({ content: message }),
        headers: { "Content-Type": "application/json" },
      });
      await loadTicket(selectedTicket.id);
      setMessage("");
    } catch (err) {
      console.error(err);
      alert("Error sending message");
    }
  }

  async function updateStatus() {
    if (!selectedTicket || !newStatus) return;
    try {
      await api(`/support/ticket/${selectedTicket.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
        headers: { "Content-Type": "application/json" },
      });
      await loadTicket(selectedTicket.id);
    } catch (err) {
      console.error(err);
      alert("Error updating status");
    }
  }

  // ---------------- EFFECTS ----------------
  useEffect(() => {
    loadTickets();
  }, []);

  // ---------------- RENDER ----------------
return (
  <div className="p-6 bg-white min-h-screen text-gray-900">
    {/* Title */}
    <h1 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400 drop-shadow-lg">
      Support Tickets
    </h1>

    <div className="flex gap-6">
      {/* Left Column */}
      <div className="w-1/3 space-y-6">
        {/* Create Ticket */}
        <div className="bg-gray-900 rounded-2xl shadow-xl shadow-blue-500/30 p-6 text-gray-100">
          <h2 className="text-lg font-semibold mb-4 text-cyan-300 drop-shadow">
            Create Ticket
          </h2>
          <form onSubmit={createTicket} className="space-y-3">
            <input
              placeholder="Subject"
              value={newTicket.subject}
              onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 text-gray-100 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 transition"
            />
            <input
              placeholder="Category (optional)"
              value={newTicket.category}
              onChange={(e) => setNewTicket({ ...newTicket, category: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 text-gray-100 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 transition"
            />
            <select
              value={newTicket.priority}
              onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 text-gray-100 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 transition"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
            <button
              type="submit"
              className="w-full py-2 bg-gradient-to-r from-indigo-600 to-cyan-500 rounded-xl shadow-md hover:scale-105 transition text-white"
            >
              Create
            </button>
          </form>
        </div>

        {/* Tickets List */}
        <div className="bg-gray-900 rounded-2xl shadow-xl shadow-blue-500/30 p-6 text-gray-100">
          <h2 className="text-lg font-semibold mb-4 text-cyan-300 drop-shadow">
            Tickets
          </h2>
          {tickets.length === 0 ? (
            <p className="text-gray-400 italic">No tickets yet</p>
          ) : (
            <ul className="space-y-2">
              {tickets.map((t) => (
                <li
                  key={t.id}
                  className={`p-3 rounded-lg border cursor-pointer transition ${
                    selectedTicket?.id === t.id
                      ? "bg-cyan-900/40 border-cyan-500"
                      : "border-gray-700 hover:bg-gray-800/70"
                  }`}
                  onClick={() => loadTicket(t.id)}
                >
                  <p className="font-medium">
                    {t.subject}{" "}
                    <span className="text-xs text-gray-400">({t.priority})</span>
                  </p>
                  <p className="text-sm text-gray-400">Status: {t.status}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Right Column */}
      <div className="flex-1 bg-gray-900 rounded-2xl shadow-xl shadow-blue-500/30 p-6 text-gray-100">
        {loading ? (
          <p className="text-gray-400">Loading...</p>
        ) : selectedTicket ? (
          <>
            <h2 className="text-xl font-bold mb-2 text-blue-400 drop-shadow">
              {selectedTicket.subject}
            </h2>
            <p className="text-sm text-gray-400 mb-2">
              Category: {selectedTicket.category || "N/A"} | Priority:{" "}
              {selectedTicket.priority}
            </p>
            <p className="text-sm text-gray-400 mb-4">
              Status: {selectedTicket.status}
            </p>

            {/* Status Update */}
            <div className="flex gap-2 mb-4">
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="bg-gray-800 border border-gray-700 text-gray-100 px-3 py-2 rounded-lg focus:ring-2 focus:ring-yellow-500 transition"
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
              <button
                onClick={updateStatus}
                className="px-4 py-2 bg-gradient-to-r from-yellow-600 to-amber-500 rounded-xl text-white shadow-md hover:scale-105 transition"
              >
                Update
              </button>
            </div>

            {/* Messages */}
            <div className="space-y-3 mb-4">
              {selectedTicket.messages.map((m: any) => (
                <div
                  key={m.id}
                  className="p-3 rounded-lg border border-gray-700 bg-gray-800/70"
                >
                  <p>
                    <span className="font-semibold text-cyan-400">{m.senderId}</span>
                    : {m.content}
                  </p>
                  <p className="text-xs text-gray-500">{m.createdAt}</p>
                </div>
              ))}
            </div>

            {/* Reply Box */}
            <div className="space-y-2">
              <textarea
                placeholder="Message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-gray-100 px-3 py-2 rounded-lg focus:ring-2 focus:ring-green-500 transition"
              />
              <button
                onClick={addMessage}
                className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-500 text-white rounded-xl shadow-md hover:scale-105 transition"
              >
                Send
              </button>
            </div>
          </>
        ) : (
          <p className="text-gray-400 italic">Select a ticket to view</p>
        )}
      </div>
    </div>
  </div>
);
}
