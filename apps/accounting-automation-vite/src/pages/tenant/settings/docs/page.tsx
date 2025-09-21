"use client";

import { useState, useEffect } from "react";
import { api } from "../../../../lib/api";

export default function DocsPage() {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // 🔥 tenantId URL me nahi bhejna, JWT se backend khud lega

  // Load documents (list)
  async function loadDocs() {
    setLoading(true);
    setError(null);
    try {
      const res = await api(`/corpdocs`);
      setDocs(Array.isArray(res) ? res : []);
    } catch (err: any) {
      console.error("Failed to load docs:", err);
      setError(err?.message || "Failed to load documents");
    } finally {
      setLoading(false);
    }
  }

  // Upload handler
  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Please select a file first");
      return;
    }
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);

      await api(`/corpdocs/upload`, {
        method: "POST",
        body: formData,
      });
      setFile(null);
      await loadDocs();
    } catch (err: any) {
      console.error("Upload failed:", err);
      setError(err?.message || "Failed to upload file");
    }
  }

  // View document details
  async function handleView(id: string) {
    setError(null);
    try {
      const doc = await api(`/corpdocs/${id}`);
      setSelectedDoc(doc);
    } catch (err: any) {
      console.error("Failed to load document:", err);
      setError(err?.message || "Failed to load document");
    }
  }

  useEffect(() => {
    loadDocs();
  }, []);
return (
  <div className="p-6 bg-white min-h-screen text-gray-900">
    {/* Title */}
    <h1 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400 drop-shadow-lg">
      Documents
    </h1>

    {/* Error */}
    {error && (
      <div className="mb-4 rounded-xl bg-red-900/30 border border-red-700 p-4 text-red-200 shadow-lg">
        {error}
      </div>
    )}

    {/* Upload */}
    <div className="mb-6 bg-gray-900 rounded-2xl shadow-xl shadow-blue-500/30 p-6 text-gray-100">
      <h2 className="font-medium text-cyan-300 mb-3 border-b border-gray-700 pb-2 drop-shadow">
        Upload Document
      </h2>
      <form onSubmit={handleUpload} className="flex items-center gap-3">
        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="border border-gray-700 bg-gray-800 text-gray-100 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 transition"
        />
        <button
          type="submit"
          className="px-5 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-lg shadow-lg hover:opacity-90 transition"
        >
          Upload
        </button>
      </form>
    </div>

    {/* List */}
    <div className="mb-6 bg-gray-900 rounded-2xl shadow-xl shadow-blue-500/30 p-6 text-gray-100">
      <h2 className="font-medium text-cyan-300 mb-3 border-b border-gray-700 pb-2 drop-shadow">
        Documents List
      </h2>
      {loading ? (
        <p className="text-gray-400 italic">Loading...</p>
      ) : docs.length === 0 ? (
        <p className="text-gray-500 italic">No documents found.</p>
      ) : (
        <ul className="space-y-3">
          {docs.map((d) => (
            <li
              key={d.id}
              className="p-4 border border-gray-700 rounded-xl flex justify-between items-center bg-gray-800 hover:bg-gray-700/50 transition"
            >
              <div className="text-sm">
                <p><span className="text-cyan-300">ID:</span> {d.id}</p>
                <p><span className="text-cyan-300">Name:</span> {d.name}</p>
                <p><span className="text-cyan-300">Type:</span> {d.type}</p>
              </div>
              <button
                onClick={() => handleView(d.id)}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-lg shadow-lg hover:opacity-90 transition"
              >
                View
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>

    {/* Selected Doc */}
    {selectedDoc && (
      <div className="bg-gray-900 rounded-2xl shadow-xl shadow-blue-500/30 p-6 text-gray-100">
        <h2 className="font-medium text-cyan-300 mb-3 border-b border-gray-700 pb-2 drop-shadow">
          Document Details
        </h2>
        <p><span className="text-cyan-300">ID:</span> {selectedDoc.id}</p>
        <p><span className="text-cyan-300">Name:</span> {selectedDoc.name}</p>
        <p><span className="text-cyan-300">Type:</span> {selectedDoc.type}</p>
        <p><span className="text-cyan-300">SHA256:</span> {selectedDoc.sha256}</p>
        <p><span className="text-cyan-300">S3 Key:</span> {selectedDoc.s3Key}</p>
      </div>
    )}
  </div>
);

}
