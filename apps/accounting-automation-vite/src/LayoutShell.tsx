// src/LayoutShell.tsx
import React from "react";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import { useAuth } from "./hooks/useAuth";

/**
 * LayoutShell - render sidebar/topbar for authenticated users (dev-mode).
 * If not authenticated, children are rendered directly (public pages like /auth/login)
 */
export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const { role } = useAuth();
  const isAuthenticated = Boolean(role);

  if (!isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Topbar />
        <main className="flex-1 p-6 bg-gray-50">{children}</main>
      </div>
    </div>
  );
}
