import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";

// 🟢 wagmi + react-query
import { WagmiProvider } from "wagmi";
import { config } from "../src/pages/WagmiConfig";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Auth pages
import LoginPage from "./pages/auth/login/page";
import RegisterPage from "./pages/auth/register/page";
import TwoFactorPage from "./pages/auth/2fa/page";
import LandingPage from "./pages/LandingPage";
import Documentation from "./pages/Documentation";
import TwoFactorVerifyPage from "./pages/auth/verify/page";
// Tenant routes
import TenantRoutes from "./pages/tenant/tenantRoutes";

// ✅ Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <p className="p-6">Loading...</p>;
  if (!user) return <Navigate to="/auth/login" replace />;

  return <>{children}</>;
}

const queryClient = new QueryClient();

export default function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
       <Routes>
  {/* Landing Page */}
  <Route path="/" element={<LandingPage />} />

  {/* Auth Routes */}
  <Route path="/auth/login" element={<LoginPage />} />
  <Route path="/auth/register" element={<RegisterPage />} />
  <Route path="/auth/2fa" element={<TwoFactorPage />} />
  <Route path="/auth/verify" element={<TwoFactorVerifyPage />} />
  <Route path="/docs" element={<Documentation />} />

  {/* Tenant Area */}
  <Route
    path="/tenant/*"
    element={
      <ProtectedRoute>
        <TenantRoutes />
      </ProtectedRoute>
    }
  />

  {/* Fallback */}
  <Route path="*" element={<Navigate to="/auth/login" replace />} />
</Routes>
        </AuthProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
