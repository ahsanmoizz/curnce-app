"use client";

import { useEffect, useState } from "react";
import { api } from "../../../../lib/api";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [channels, setChannels] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // For creating/updating channel
  const [channelForm, setChannelForm] = useState({
    id: "",
    type: "email",
    target: "",
    meta: "",
    enabled: true,
  });

  // ----------------- LOADERS -----------------
  async function loadAll() {
    setLoading(true);
    try {
      const [notifs, chans, logsRes, summaryRes, statsRes] = await Promise.all([
        api("/notifications"),
        api("/notifications/channels"),
        api("/notifications/logs"),
        api("/notifications/summary"),
        api("/notifications/stats"),
      ]);
      setNotifications(notifs);
      setChannels(chans);
      setLogs(logsRes);
      setSummary(summaryRes);
      setStats(statsRes);
    } catch (err) {
      console.error(err);
      alert("Error loading notifications data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  // ----------------- ACTIONS -----------------
  async function markRead(id: string) {
    try {
      await api(`/notifications/${id}/read`, { method: "PATCH" });
      loadAll();
    } catch (err) {
      console.error(err);
      alert("Error marking as read");
    }
  }

  async function sendTest() {
    try {
      await api("/notifications/test", { method: "POST" });
      alert("Test notification sent");
      loadAll();
    } catch (err) {
      console.error(err);
      alert("Error sending test notification");
    }
  }

  async function saveChannel(e: React.FormEvent) {
    e.preventDefault();
    try {
      const body = { ...channelForm, meta: channelForm.meta ? JSON.parse(channelForm.meta) : null };
      await api("/notifications/channels", {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
      });
      alert("Channel saved");
      setChannelForm({ id: "", type: "email", target: "", meta: "", enabled: true });
      loadAll();
    } catch (err) {
      console.error(err);
      alert("Error saving channel (check meta JSON)");
    }
  }

  async function deleteChannel(id: string) {
    try {
      await api(`/notifications/channels/${id}`, { method: "DELETE" });
      alert("Channel disabled");
      loadAll();
    } catch (err) {
      console.error(err);
      alert("Error deleting channel");
    }
  }

  async function retryFailed() {
    try {
      await api("/notifications/retry", { method: "POST" });
      alert("Retry triggered");
      loadAll();
    } catch (err) {
      console.error(err);
      alert("Error retrying failed notifications");
    }
  }

  // ----------------- RENDER -----------------
 return (
  <div className="p-6 bg-white min-h-screen text-gray-900">
    {/* Title */}
    <h1 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400 drop-shadow-lg">
      Notifications
    </h1>

    {/* Summary */}
    {summary && (
      <div className="mb-6 bg-gray-900 rounded-2xl shadow-xl shadow-blue-500/30 p-6 text-gray-100">
        <h2 className="font-medium text-cyan-300 mb-2 border-b border-gray-700 pb-2 drop-shadow">
          Summary
        </h2>
        <p>
          <span className="text-cyan-400">Compliance Count:</span>{" "}
          {summary.complianceCount}
        </p>
      </div>
    )}

    {/* Stats */}
    {stats.length > 0 && (
      <div className="mb-6 bg-gray-900 rounded-2xl shadow-xl shadow-blue-500/30 p-6 text-gray-100">
        <h2 className="font-medium text-cyan-300 mb-2 border-b border-gray-700 pb-2 drop-shadow">
          Stats (Monthly Compliance)
        </h2>
        <ul className="space-y-1 text-sm">
          {stats.map((row, i) => (
            <li
              key={i}
              className="hover:text-cyan-200 transition flex justify-between"
            >
              <span>{row.month}</span>
              <span className="font-semibold text-blue-400">{row.count}</span>
            </li>
          ))}
        </ul>
      </div>
    )}

    {/* Notifications */}
    <div className="mb-6 bg-gray-900 rounded-2xl shadow-xl shadow-blue-500/30 p-6 text-gray-100">
      <h2 className="font-medium text-cyan-300 mb-2 border-b border-gray-700 pb-2 drop-shadow">
        In-App Notifications
      </h2>
      {loading ? (
        <p className="text-gray-400 italic">Loading...</p>
      ) : (
        <ul className="space-y-3">
          {notifications.map((n) => (
            <li
              key={n.id}
              className="p-4 border border-gray-700 rounded-xl flex justify-between items-center bg-gray-800 hover:bg-gray-700/50 transition"
            >
              <div className="text-sm">
                <p>
                  <strong className="text-blue-400">{n.title}</strong>{" "}
                  <span className="text-gray-400">({n.type})</span> – {n.message}
                </p>
                <p className="text-sm text-cyan-300">
                  Status: {n.read ? "✅ Read" : "📩 Unread"}
                </p>
              </div>
              {!n.read && (
                <button
                  onClick={() => markRead(n.id)}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-lg shadow-lg hover:opacity-90 transition"
                >
                  Mark Read
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>

    {/* Channels */}
    <div className="mb-6 bg-gray-900 rounded-2xl shadow-xl shadow-blue-500/30 p-6 text-gray-100">
      <h2 className="font-medium text-cyan-300 mb-2 border-b border-gray-700 pb-2 drop-shadow">
        Notification Channels
      </h2>
      <form onSubmit={saveChannel} className="space-y-3 mb-4">
        <input
          placeholder="Channel ID (leave blank for new)"
          value={channelForm.id}
          onChange={(e) =>
            setChannelForm({ ...channelForm, id: e.target.value })
          }
          className="border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 w-full rounded-lg focus:ring-2 focus:ring-blue-500 transition"
        />
        <select
          value={channelForm.type}
          onChange={(e) =>
            setChannelForm({ ...channelForm, type: e.target.value })
          }
          className="border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 w-full rounded-lg focus:ring-2 focus:ring-blue-500 transition"
        >
          <option value="email">Email</option>
          <option value="sms">SMS</option>
          <option value="slack">Slack</option>
          <option value="webhook">Webhook</option>
        </select>
        <input
          placeholder="Target (email, phone, webhook URL)"
          value={channelForm.target}
          onChange={(e) =>
            setChannelForm({ ...channelForm, target: e.target.value })
          }
          className="border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 w-full rounded-lg focus:ring-2 focus:ring-blue-500 transition"
        />
        <textarea
          placeholder='Meta JSON (optional, e.g. {"templateHtml": "<h1>Hi</h1>"})'
          value={channelForm.meta}
          onChange={(e) =>
            setChannelForm({ ...channelForm, meta: e.target.value })
          }
          className="border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 w-full rounded-lg focus:ring-2 focus:ring-blue-500 transition"
        />
        <label className="flex items-center gap-2 text-gray-300">
          <input
            type="checkbox"
            checked={channelForm.enabled}
            onChange={(e) =>
              setChannelForm({ ...channelForm, enabled: e.target.checked })
            }
          />
          <span>Enabled</span>
        </label>
        <button
          type="submit"
          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-lg shadow-lg hover:opacity-90 transition"
        >
          Save Channel
        </button>
      </form>
      <ul className="space-y-3">
        {channels.map((ch) => (
          <li
            key={ch.id}
            className="p-4 border border-gray-700 rounded-xl flex justify-between items-center bg-gray-800 hover:bg-gray-700/50 transition"
          >
            <p>
              <span className="text-cyan-400">{ch.type}</span> → {ch.target} [
              {ch.enabled ? "enabled" : "disabled"}]
            </p>
            <button
              onClick={() => deleteChannel(ch.id)}
              className="px-4 py-2 bg-gradient-to-r from-red-600 to-pink-500 text-white rounded-lg shadow-lg hover:opacity-90 transition"
            >
              Disable
            </button>
          </li>
        ))}
      </ul>
    </div>

    {/* Logs */}
    <div className="bg-gray-900 rounded-2xl shadow-xl shadow-blue-500/30 p-6 text-gray-100">
      <h2 className="font-medium text-cyan-300 mb-2 border-b border-gray-700 pb-2 drop-shadow">
        Notification Logs
      </h2>
      <button
        onClick={retryFailed}
        className="mb-3 px-4 py-2 bg-gradient-to-r from-yellow-600 to-orange-500 text-white rounded-lg shadow-lg hover:opacity-90 transition"
      >
        Retry Failed
      </button>
      <ul className="space-y-3 max-h-64 overflow-y-auto pr-2">
        {logs.map((log) => (
          <li
            key={log.id}
            className="p-4 border border-gray-700 rounded-xl bg-gray-800 hover:bg-gray-700/50 transition"
          >
            <p>
              <strong className="text-blue-400">{log.event}</strong> via{" "}
              <span className="text-cyan-300">{log.channel?.type}</span> →{" "}
              {log.status}
            </p>
            {log.lastError && (
              <p className="text-red-400">Error: {log.lastError}</p>
            )}
            <p className="text-sm text-gray-400">Attempts: {log.attempts}</p>
          </li>
        ))}
      </ul>
    </div>
  </div>
);


}
