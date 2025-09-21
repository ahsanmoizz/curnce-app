"use client";

import { useEffect, useState } from "react";
import { api } from "../../../../lib/api";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/notifications")
      .then(setNotifications)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const markRead = async (id: string) => {
    await api(`/v1/notifications/${id}/read`, { method: "PATCH" });
    setNotifications(await api("/v1/notifications"));
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Notifications</h1>
      <div className="bg-white rounded-lg shadow p-4">
        {loading ? (
          <p>Loading notifications...</p>
        ) : (
          <ul className="divide-y">
            {notifications.map((n) => (
              <li key={n.id} className="p-2 flex justify-between">
                <span>{n.message}</span>
                <button
                  onClick={() => markRead(n.id)}
                  className="text-indigo-600 hover:underline"
                >
                  Mark Read
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
