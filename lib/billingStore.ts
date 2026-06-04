"use client";

import { getAuthHeaders } from "@/lib/authClient";

export type BillingState = {
  proAiPlan: string;
  proAiStatus: string;
  leadEnginePlan: string;
  leadEngineStatus: string;
  leadEngineTrialEndsAt: string | null;
  hasLeadEnginePro: boolean;
};

let cachedBilling: BillingState | null =
  null;
let loaded = false;
let loadedAt = 0;
let pending:
  | Promise<BillingState | null>
  | null = null;
const BILLING_CACHE_FRESHNESS_MS =
  60_000;

export function getCachedBilling() {
  return {
    billing: cachedBilling,
    loaded,
    isFresh:
      loaded &&
      Date.now() - loadedAt <
        BILLING_CACHE_FRESHNESS_MS,
  };
}

export function setCachedBilling(
  billing: BillingState | null
) {
  cachedBilling = billing;
  loaded = true;
  loadedAt = Date.now();
}

export async function loadBillingState(
  force = false
) {
  if (
    !force &&
    loaded &&
    Date.now() - loadedAt <
      BILLING_CACHE_FRESHNESS_MS
  ) {
    return cachedBilling;
  }

  if (
    !force &&
    pending
  ) {
    return pending;
  }

  pending = (async () => {
    try {
      const headers =
        await getAuthHeaders();
      const res =
        await fetch(
          "/api/billing",
          { headers }
        );
      const data =
        await res.json();

      setCachedBilling(
        data.billing || null
      );

      return cachedBilling;
    } finally {
      pending = null;
    }
  })();

  return pending;
}

export function refreshBillingState() {
  return loadBillingState(true);
}
