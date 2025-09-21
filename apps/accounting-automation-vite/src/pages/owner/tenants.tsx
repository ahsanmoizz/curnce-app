"use client";
import { useEffect, useState } from "react";
import { ownerApi } from "./lib/ownerApi";

export default function TenantsPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ownerApi.tenants.list()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-xl font-bold mb-6">Tenants</h1>
      {loading ? (
        <p>Loading tenants...</p>
      ) : (
        <table className="w-full border text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left">ID</th>
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.map((tenant) => (
              <tr key={tenant.id} className="border-b">
                <td className="p-2">{tenant.id}</td>
                <td className="p-2">{tenant.name}</td>
                <td className="p-2">{tenant.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
