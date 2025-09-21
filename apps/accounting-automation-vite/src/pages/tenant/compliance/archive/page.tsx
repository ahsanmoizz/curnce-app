"use client";

import { useEffect, useState } from "react";
import { api } from "../../../../lib/api";

type ArchivedDoc = {
  id: string;
  name: string;
  s3Url: string;
  fileHash: string;
  txHash?: string;
  createdAt: string;
};

export default function ArchivePage() {
  const [docs, setDocs] = useState<ArchivedDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"list" | "upload" | "hash">("list");

  // ---- Fetch data ----
  async function fetchDocs() {
    setLoading(true);
    try {
      const res = await api("/archive/list");
      setDocs(res);
    } catch (err) {
      console.error("❌ Failed to fetch archive:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDocs();
  }, []);

  // ---- Handlers ----
  async function handleUpload(formData: FormData) {
    await api("/archive/upload", { method: "POST", body: formData });
    alert("✅ File uploaded");
    fetchDocs();
  }

  async function handleHash(formData: FormData) {
    const body = {
      docHash: formData.get("docHash"),
    };
    const res = await api("/archive/hash", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    alert(`✅ Hash anchored: ${res.txHash}`);
  }

  return (
    <div className="p-6 bg-white min-h-screen text-gray-900">
      {/* Title */}
      <h1 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-cyan-400 drop-shadow-lg">
        Archive
      </h1>

      {/* Tabs */}
      <div className="flex gap-4 mb-6">
        {["list", "upload", "hash"].map((t) => (
          <button
            key={t}
            className={`px-4 py-2 rounded-xl font-medium transition shadow-md ${
              tab === t
                ? "bg-gradient-to-r from-indigo-500 to-cyan-500 text-white shadow-cyan-500/40"
                : "bg-gray-900 text-gray-300 hover:bg-gray-800"
            }`}
            onClick={() => setTab(t as any)}
          >
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      {/* List Tab */}
      {tab === "list" && (
        <div className="bg-gray-900 rounded-2xl shadow-xl shadow-indigo-500/30 p-6 text-gray-100">
          <h2 className="text-lg font-semibold mb-4 text-cyan-300 drop-shadow">
            Archived Documents
          </h2>
          {loading ? (
            <p className="text-gray-500">Loading...</p>
          ) : docs.length === 0 ? (
            <p className="text-gray-400 italic">No documents uploaded yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 text-gray-300">
                  <th className="p-3 text-left">Name</th>
                  <th className="p-3 text-left">Hash</th>
                  <th className="p-3 text-left">TxHash</th>
                  <th className="p-3 text-left">Created</th>
                  <th className="p-3 text-left">Link</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((d) => (
                  <tr
                    key={d.id}
                    className="border-b border-gray-700 hover:bg-gray-700/50 transition"
                  >
                    <td className="p-3">{d.name}</td>
                    <td className="p-3 font-mono text-xs text-cyan-400">
                      {d.fileHash.slice(0, 12)}…
                    </td>
                    <td className="p-3 font-mono text-xs text-indigo-400">
                      {d.txHash ? `${d.txHash.slice(0, 12)}…` : "—"}
                    </td>
                    <td className="p-3 text-gray-400">
                      {new Date(d.createdAt).toLocaleString()}
                    </td>
                    <td className="p-3">
                      <a
                        href={d.s3Url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cyan-400 hover:underline"
                      >
                        View
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Upload Tab */}
      {tab === "upload" && (
        <div className="bg-gray-900 rounded-2xl shadow-xl shadow-green-500/30 p-6 text-gray-100">
          <h2 className="text-lg font-semibold mb-4 text-green-300 drop-shadow">
            Upload Document
          </h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              handleUpload(form);
              e.currentTarget.reset();
            }}
            className="space-y-4"
          >
            <input
              type="file"
              name="file"
              required
              className="w-full border border-gray-700 bg-gray-800 rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-green-400"
            />
            <button className="px-4 py-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-400 text-white font-medium shadow-md hover:scale-105 transition">
              Upload
            </button>
          </form>
        </div>
      )}

      {/* Hash Tab */}
      {tab === "hash" && (
        <div className="bg-gray-900 rounded-2xl shadow-xl shadow-purple-500/30 p-6 text-gray-100">
          <h2 className="text-lg font-semibold mb-4 text-purple-300 drop-shadow">
            Anchor Hash
          </h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              handleHash(form);
              e.currentTarget.reset();
            }}
            className="space-y-4"
          >
            <input
              type="text"
              name="docHash"
              placeholder="Document SHA256 hash"
              required
              className="w-full border border-gray-700 bg-gray-800 rounded-xl p-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
            <button className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium shadow-md hover:scale-105 transition">
              Anchor Hash
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
