// /components/Topbar.tsx
"use client";

import { BellIcon, UserCircleIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../hooks/useAuth";

export default function Topbar() {
  const { user, role, loginAs, logout } = useAuth();

  return (
    <header className="h-14 bg-white border-b flex items-center justify-between px-6 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="text-lg font-semibold">Dashboard</div>
      </div>

      <div className="flex items-center gap-4">
        <button className="relative">
          <BellIcon className="h-6 w-6 text-gray-600" />
          <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full"></span>
        </button>

        {/* quick dev role switcher */}
        <div className="flex items-center gap-3">
          {role ? (
            <>
              <div className="text-sm">
                <div className="font-medium">{user?.email}</div>
                <div className="text-xs text-gray-500">{role.toUpperCase()}</div>
              </div>
              <button
                onClick={() => {
                  // quick dev toggle: switch role
                  if (role === "tenant") loginAs("owner");
                  else loginAs("tenant");
                }}
                className="px-3 py-1 text-sm rounded-md bg-gray-100"
              >
                Switch Role
              </button>
              <button
                onClick={() => logout()}
                className="px-3 py-1 text-sm rounded-md bg-red-50 text-red-600"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <button onClick={() => loginAs("tenant")} className="px-3 py-1 rounded-md bg-blue-600 text-white">
                Login Tenant (dev)
              </button>
              <button onClick={() => loginAs("owner")} className="px-3 py-1 rounded-md bg-gray-50">
                Login Owner (dev)
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
