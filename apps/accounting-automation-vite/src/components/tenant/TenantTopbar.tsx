// src/components/TenantTopbar.tsx  (or replace your file)
"use client";

import React, { useState, useEffect } from "react";
import { Bell, User,  X } from "lucide-react";
import { api } from "../../lib/api";
import { useNavigate } from "react-router-dom"; // ⬅️ TOP par import
import { useAuth } from "../../hooks/useAuth"; 



function initials(name?: string) {
  if (!name) return "T";
  return name.split(" ").map(s => s[0]).slice(0,2).join("").toUpperCase();
}

function ProfileModal({
  open,
  onClose,
  tenant,
  user,
  onTenantUpdated,
}: {
  open: boolean;
  onClose: () => void;
  tenant: any;
  user: any;
  onTenantUpdated: (t: any) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(tenant?.name || "");
  const [preview, setPreview] = useState<string | null>(tenant?.profilePicture || null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setName(tenant?.name || "");
    setPreview(tenant?.profilePicture || null);
  }, [tenant]);

  if (!open) return null;

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
  };

  async function save() {
    try {
      setMsg(null);
      const res = await api(`/tenants/${tenant.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name, profilePicture: preview }),
      });
      if (res.error) throw new Error(res.error);
      onTenantUpdated(res);
      setMsg("Saved");
      setEditing(false);
    } catch (err: any) {
      setMsg(err.message || "Save failed");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg bg-gray-900 border border-gray-700 rounded-md shadow-lg p-6 text-gray-200">
        <div className="flex items-center gap-4">
          {preview ? (
            <img src={preview} alt="tenant" className="w-16 h-16 rounded-full object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center text-white font-semibold">
              {initials(tenant?.name)}
            </div>
          )}
          <div>
            <div className="text-lg font-semibold">{tenant?.name}</div>
            <div className="text-sm text-gray-400">{user?.email}</div>
          </div>
        </div>

        <div className="mt-4">
          <label className="text-sm text-gray-300">Tenant Name</label>
          <input value={name} onChange={(e)=>setName(e.target.value)} className="w-full mt-1 p-2 bg-gray-800 border border-gray-700 rounded-md text-gray-200" />
        </div>

        <div className="mt-4">
          <label className="text-sm text-gray-300">Change Logo</label>
          <input type="file" accept="image/*" onChange={handleFile} className="block mt-2 text-sm" />
        </div>

        <div className="mt-4 flex items-center gap-2">
          {editing ? (
            <>
              <button onClick={save} className="px-3 py-2 bg-indigo-600 rounded">Save</button>
              <button onClick={()=>{setEditing(false); setName(tenant?.name); setPreview(tenant?.profilePicture)}} className="px-3 py-2 rounded border">Cancel</button>
            </>
          ) : (
            <>
              <button onClick={()=>setEditing(true)} className="px-3 py-2 bg-indigo-600 rounded">Edit</button>
              <button onClick={onClose} className="px-3 py-2 rounded border">Close</button>
            </>
          )}
        </div>

        <div className="mt-6 border-t border-gray-700 pt-4">
          <h3 className="text-sm font-semibold text-gray-300">Account</h3>
          <p className="text-sm text-gray-400 mt-2">Name: {user?.name}</p>
          <p className="text-sm text-gray-400">Email: {user?.email}</p>

          <ChangePasswordSection />
        </div>

        {msg && <div className="mt-4 text-sm text-yellow-400">{msg}</div>}
      </div>
    </div>
  );
}

/**
 * ChangePasswordSection implements:
 * - change with current password (POST /auth/change-password)
 * - OR request email verification -> verify token -> change password via token
 */
function ChangePasswordSection() {
  const [mode, setMode] = useState<"current"|"verify">("current");
  const [current, setCurrent] = useState("");
  const [newPass, setNewPass] = useState("");
  const [msg, setMsg] = useState<string|null>(null);
 const { user } = useAuth(); 
  // verify-by-email flow:
  const [verificationSent, setVerificationSent] = useState(false);
  const [devToken, setDevToken] = useState<string|null>(null); // debug token returned by server in dev only
  const [enteredToken, setEnteredToken] = useState("");
  const [preAuthToken, setPreAuthToken] = useState<string|null>(null);

  async function changeWithCurrent() {
    setMsg(null);
    try {
      const res = await api("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ current, newPass }),
      });
      if (res.error) throw new Error(res.error);
      setMsg("Password changed");
      setCurrent(""); setNewPass("");
    } catch (err: any) {
      setMsg(err.message || "Failed");
    }
  }

  async function requestVerification() {
  setMsg(null);
  try {
    const res = await api("/auth/request-password-change", {
      method: "POST",
      body: JSON.stringify({ email: user?.email }),  // 👈 send current user's email
    });
    if (res.error) throw new Error(res.error);
    setVerificationSent(true);
    if (res.debugToken) setDevToken(res.debugToken);
    setMsg("Verification email/link sent (check server logs in dev)");
  } catch (err: any) {
    setMsg(err.message || "Failed to request verification");
  }
}

  async function verifyToken() {
    setMsg(null);
    try {
      const res = await api("/auth/verify-password-token", {
        method: "POST",
        body: JSON.stringify({ token: enteredToken }),
      });
      if (res.error) throw new Error(res.error);
      setPreAuthToken(res.preAuthToken);
      setMsg("Token verified, enter new password below.");
    } catch (err: any) {
      setMsg(err.message || "Invalid token");
    }
  }

  async function changeWithPreAuth() {
    setMsg(null);
    try {
      const res = await api("/auth/change-password/verified", {
        method: "POST",
        body: JSON.stringify({ preAuthToken, newPassword: newPass }),
      });
      if (res.error) throw new Error(res.error);
      setMsg("Password changed successfully");
      setPreAuthToken(null); setNewPass("");
    } catch (err: any) {
      setMsg(err.message || "Failed to change password");
    }
  }

  return (
    <div className="mt-3">
      <h4 className="text-sm font-medium text-gray-200">Change password</h4>

      <div className="mt-2 flex gap-2">
        <button onClick={()=>setMode("current")} className={`px-3 py-1 rounded ${mode==="current" ? "bg-indigo-600" : "bg-gray-800"}`}>Current password</button>
        <button onClick={()=>setMode("verify")} className={`px-3 py-1 rounded ${mode==="verify" ? "bg-indigo-600" : "bg-gray-800"}`}>Verify via email</button>
      </div>

      {mode === "current" ? (
        <div className="mt-3 space-y-2">
          <input value={current} onChange={e=>setCurrent(e.target.value)} placeholder="Current password" type="password" className="w-full p-2 bg-gray-800 border border-gray-700 rounded" />
          <input value={newPass} onChange={e=>setNewPass(e.target.value)} placeholder="New password" type="password" className="w-full p-2 bg-gray-800 border border-gray-700 rounded" />
          <button onClick={changeWithCurrent} className="px-4 py-2 bg-indigo-600 rounded">Change</button>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {!verificationSent ? (
            <button onClick={requestVerification} className="px-4 py-2 bg-indigo-600 rounded">Request verification (email)</button>
          ) : (
            <>
              <p className="text-sm text-gray-400">We sent a verification link/token to your email. (Dev: token may be returned in response)</p>
              {devToken && <div className="text-xs text-yellow-300 break-all">Dev token: {devToken}</div>}
              <input value={enteredToken} onChange={e=>setEnteredToken(e.target.value)} placeholder="Paste token from email (or dev token)" className="w-full p-2 bg-gray-800 border border-gray-700 rounded" />
              <button onClick={verifyToken} className="px-4 py-2 bg-indigo-600 rounded">Verify token</button>

              {preAuthToken && (
                <>
                  <input value={newPass} onChange={e=>setNewPass(e.target.value)} placeholder="New password" type="password" className="w-full p-2 bg-gray-800 border border-gray-700 rounded" />
                  <button onClick={changeWithPreAuth} className="px-4 py-2 bg-green-600 rounded">Set new password</button>
                </>
              )}
            </>
          )}
        </div>
      )}

      {msg && <div className="mt-2 text-sm text-yellow-300">{msg}</div>}
    </div>
  );
}

export default function TenantTopbar() {
  const [tenant, setTenant] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [profileOpen, setProfileOpen] = useState(false);
const navigate = useNavigate();

  useEffect(() => {
    api("/tenants/me")
      .then(setTenant)
      .catch(() => setTenant(null));

    api("/auth/me")
      .then((m) => setUser(m.user))
      .catch(() => setUser(null));

    api("/notifications")
      .then(setNotifications)
      .catch(() => setNotifications([]));
  }, []);

  function handleNew() {
    window.location.href = "/transactions/new";
  }

  return (
    <>
      <header className="h-16 bg-gradient-to-r from-gray-900 via-black to-gray-950 border-b border-gray-800 flex items-center justify-between px-6 shadow-md">
        <div className="flex items-center gap-4 ml-auto">
          {/* Tenant display */}
          <div className="flex items-center gap-3">
            <div onClick={()=>setProfileOpen(true)} className="flex items-center gap-2 cursor-pointer">
              {tenant?.profilePicture ? (
                <img src={tenant.profilePicture} className="w-8 h-8 rounded-full object-cover" alt="tenant" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-semibold">
                  {initials(tenant?.name)}
                </div>
              )}
              <div className="text-sm text-gray-200 hidden sm:block">{tenant?.name || "My Organization"}</div>
            </div>
          </div>

          {/* AI Automation Cube */}
<div className="relative w-20 h-20 [perspective:1000px]">
  <div className="absolute w-full h-full animate-spin-3d [transform-style:preserve-3d] [animation-delay:2s]">
    {/* Front */}
    <div className="absolute inset-0 flex items-center justify-center bg-indigo-600 text-white text-sm font-semibold rounded-md [transform:translateZ(40px)]">
      AI
    </div>
    {/* Back */}
    <div className="absolute inset-0 flex items-center justify-center bg-purple-600 text-white text-sm font-semibold rounded-md [transform:rotateY(180deg)_translateZ(40px)]">
      Automation
    </div>
    {/* Left */}
    <div className="absolute inset-0 flex items-center justify-center bg-pink-600 text-white text-sm font-semibold rounded-md [transform:rotateY(-90deg)_translateZ(40px)]">
      Fast
    </div>
    {/* Right */}
    <div className="absolute inset-0 flex items-center justify-center bg-blue-600 text-white text-sm font-semibold rounded-md [transform:rotateY(90deg)_translateZ(40px)]">
      Easy
    </div>
  </div>
</div>



          {/* Notifications */}
          <div className="relative">
            <button onClick={()=>setNotifOpen(o => !o)} className="relative p-2 rounded-full hover:bg-gray-800 transition">
              <Bell className="w-5 h-5 text-gray-300" />
              {notifications.length > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full shadow" />}
            </button>

            {notifOpen && (
  <div className="absolute right-0 mt-2 w-80 bg-gray-900 border border-gray-700 rounded-md shadow-lg z-50">
    <div className="flex items-center justify-between p-2 font-semibold text-indigo-400 border-b border-gray-700">
      <div>Notifications</div>
      <button onClick={() => setNotifOpen(false)} className="text-gray-400 hover:text-gray-200 p-1 rounded">
        <X className="w-4 h-4" />
      </button>
    </div>

    {notifications.length === 0 ? (
      <p className="p-2 text-sm text-gray-400">No new notifications</p>
    ) : (
      <ul className="max-h-64 overflow-y-auto">
        {notifications.map((n, i) => (
          <li key={i} className="px-4 py-2 text-sm text-gray-200 hover:bg-gray-800">
            {n.message}
          </li>
        ))}
      </ul>
    )}
 <button
  onClick={() => {
    setNotifOpen(false); 
    navigate("/tenant/settings/notifications"); // ✅ same route as in sidebar
  }}
  className="w-full text-left px-4 py-2 text-sm text-indigo-400 hover:bg-gray-800"
>
  View all
</button>
  </div>
)}
          </div>

          {/* User Menu */}
          <div className="relative flex items-center gap-2 px-3 py-1.5 rounded-md">
  <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-semibold shadow-md">
    <User className="w-4 h-4" />
  </div>
  <span className="text-sm font-medium text-gray-200 hidden sm:inline">
    {user?.name || "Tenant Admin"}
  </span>
</div>

        </div>
      </header>

      <ProfileModal
        open={profileOpen}
        onClose={()=>setProfileOpen(false)}
        tenant={tenant || {}}
        user={user || {}}
        onTenantUpdated={(t:any)=>{ setTenant(t); setProfileOpen(false); }}
      />
    </>
  );
}
