// src/hooks/useTenantAccess.ts
import { useEffect, useState } from "react";
import { api } from "../lib/api";

export function useTenantAccess() {
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [trialExpired, setTrialExpired] = useState(false);

  useEffect(() => {
    api("/subscription/billing/me")
      .then((data) => {
        const trialOver =
          data.trialEndsAt && new Date(data.trialEndsAt) < new Date();
        const active = data.subscription?.status === "active";

        if (trialOver && !active) {
          setTrialExpired(true);
          setAllowed(false);
        } else {
          setAllowed(true);
        }
      })
      .catch(() => {
        setAllowed(false);
      })
      .finally(() => setLoading(false));
  }, []);

  return { allowed, loading, trialExpired };
}
