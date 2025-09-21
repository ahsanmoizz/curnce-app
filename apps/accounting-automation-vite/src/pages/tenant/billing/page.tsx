// src/pages/tenant/TenantBillingPage.tsx
"use client";

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../../../lib/api"; // ✅ adjust path if needed

type Plan = {
  id: string;
  name: string;
  price: number;
  interval: string;
};

type Subscription = {
  id: string;
  status: string;
  renewalDate: string;
  plan?: Plan;
};

export default function TenantBillingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
  const success = searchParams.get("success");
  const canceled = searchParams.get("canceled");

  if (canceled) {
    alert("❌ Checkout canceled");
    navigate("/tenant/billing", { replace: true });
    return;
  }

 if (success) {
    // PayPal sends ?token=ORDER_ID when returning from checkout
    const orderId = searchParams.get("token");

    if (orderId) {
      (async () => {
        try {
          await api("/subscription/paypal/capture", {
            method: "POST",
            body: JSON.stringify({ orderId }),
          });
          alert("✅ Subscription activated!");
        } catch (err) {
          console.error("Capture failed", err);
          alert("⚠️ Payment approved but not captured. Contact support.");
        } finally {
          // Clean URL & reload billing page
          navigate("/tenant/billing", { replace: true });
        }
      })();
    } else {
      alert("⚠️ Missing PayPal orderId in URL");
      navigate("/tenant/billing", { replace: true });
    }
  }
}, [searchParams, navigate]);




  // ✅ Fetch current subscription
  useEffect(() => {
    api("/subscription/billing/me")
      .then((data) => {
        setSubscription(data.subscription);
        if (data.trialEndsAt && new Date(data.trialEndsAt) > new Date()) {
          console.log("Trial valid until", data.trialEndsAt);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // ✅ Fetch plans
  useEffect(() => {
    api("/subscription/plans").then(setPlans).catch(console.error);
  }, []);

  // ✅ Subscribe flow
  const handleSubscribe = async (planId: string) => {
  try {
    const res = await api(`/subscription/paypal/create-order/${planId}`, {
      method: "POST",
    });

    if (res.approvalUrl) {
      window.location.href = res.approvalUrl;
    } else {
      alert("Failed to create PayPal order");
    }
  } catch (err) {
    console.error(err);
    alert("Subscription failed");
  }
};

  const statusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "text-green-600 font-semibold";
      case "canceled":
        return "text-red-600 font-semibold";
      case "trialing":
        return "text-yellow-600 font-semibold";
      default:
        return "text-gray-600";
    }
  };

  return (
    <div className="p-6 bg-white min-h-screen text-gray-900">
      <h1 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400 drop-shadow-lg">
        Billing & Subscription
      </h1>

      {loading || polling ? (
  <p className="text-gray-500 animate-pulse">
    {polling ? "Finalizing your subscription..." : "Loading subscription..."}
  </p>
) : !subscription ? (
        <div>
          <p className="mb-6 text-gray-500">
            No active subscription. Please choose a plan below:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="p-6 bg-gray-900 rounded-2xl shadow-xl shadow-blue-500/30 text-gray-100 flex flex-col"
              >
                <h2 className="text-lg font-semibold mb-2 text-cyan-300 drop-shadow">
                  {plan.name}
                </h2>
                <p className="text-2xl font-bold mb-4 text-blue-300 drop-shadow-sm">
                  ${plan.price}/{plan.interval}
                </p>
                <button
                  onClick={() => handleSubscribe(plan.id)}
                  className="mt-auto bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-4 py-2 rounded-lg font-medium hover:scale-105 transition"
                >
                  Subscribe
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-gray-900 shadow-xl shadow-blue-500/30 rounded-2xl p-6 max-w-lg text-gray-100">
          <h2 className="text-lg font-semibold mb-4 text-cyan-300 drop-shadow">
            Current Subscription
          </h2>
          <p className="mb-2">
            <span className="font-medium">Plan:</span>{" "}
            <span className="text-blue-300 font-semibold">
              {subscription.plan?.name}
            </span>{" "}
            (${subscription.plan?.price}/{subscription.plan?.interval})
          </p>
          <p className={`mb-2 ${statusColor(subscription.status)}`}>
            <span className="font-medium">Status:</span> {subscription.status}
          </p>
          <p>
            <span className="font-medium">Renews:</span>{" "}
            {subscription.renewalDate
              ? new Date(subscription.renewalDate).toLocaleDateString()
              : "—"}
          </p>
        </div>
      )}
    </div>
  );
}
