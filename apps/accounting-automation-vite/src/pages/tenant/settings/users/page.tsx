"use client";

import { useEffect, useState } from "react";
import { api } from "../../../../lib/api";

export default function UsersSettingsPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/v1/settings/users")
      .then(setUsers)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleInvite() {
    const name = prompt("Enter user name");
    if (!name) return;

    try {
      await api("/v1/settings/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      alert("User invited");
      // refresh list
      setLoading(true);
      api("/v1/settings/users")
        .then(setUsers)
        .catch(console.error)
        .finally(() => setLoading(false));
    } catch (err) {
      console.error("Invite failed", err);
      alert("Invite failed");
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">User Management</h1>
      <div className="bg-white shadow rounded-lg p-4">
        <button
          onClick={handleInvite}
          className="mb-4 px-4 py-2 bg-blue-600 text-white rounded-md"
        >
          Invite User
        </button>
        {loading ? (
          <p>Loading users...</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="p-2 text-left">Name</th>
                <th className="p-2 text-left">Role</th>
                <th className="p-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b">
                  <td className="p-2">{u.name}</td>
                  <td className="p-2">{u.role}</td>
                  <td
                    className={`p-2 ${
                      u.status === "Active"
                        ? "text-green-600"
                        : "text-yellow-600"
                    }`}
                  >
                    {u.status}
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
