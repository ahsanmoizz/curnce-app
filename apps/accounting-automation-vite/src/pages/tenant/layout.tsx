// src/pages/tenant/layout.tsx
import React from "react";
import { Outlet } from "react-router-dom";
import TenantSidebar from "../../components/tenant/TenantSidebar";
import TenantTopbar from "../../components/tenant/TenantTopbar";
import { useTenantAccess } from "../../hooks/useTenantAccess";
import SubscribePopup from "../../components/SubscribePopup";

export default function TenantLayout() {
  const { allowed, loading, trialExpired } = useTenantAccess();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <p className="text-gray-600">Checking subscription...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50 relative">
      {/* Sidebar */}
      <TenantSidebar />

      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        {/* Top navigation bar */}
        <TenantTopbar />

        {/* Main page content */}
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Paywall popup → block access if trial expired and no active subscription */}
      {trialExpired && <SubscribePopup />}
    </div>
  );
}
