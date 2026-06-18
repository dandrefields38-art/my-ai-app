"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  CheckCircle2,
  CreditCard,
  Crown,
  Target,
} from "lucide-react";

import {
  getAuthHeaders,
  getCachedSession,
} from "@/lib/authClient";
import {
  getCachedBilling,
  loadBillingState,
  refreshBillingState,
  type BillingState,
} from "@/lib/billingStore";

export default function BillingPage() {
  const initialBilling =
    getCachedBilling();
  const [billing, setBilling] =
    useState<BillingState | null>(
      initialBilling.billing
    );
  const [loading, setLoading] =
    useState(
      !initialBilling.loaded
    );
  const [activationStatus, setActivationStatus] =
    useState<
      | "idle"
      | "activating"
      | "processed"
      | "delayed"
    >("idle");
  const [checkoutSessionId, setCheckoutSessionId] =
    useState<string | null>(
      null
    );
  const [portalError, setPortalError] =
    useState<string | null>(
      null
    );

  useEffect(() => {
    let alive = true;

    const loadBilling =
      async () => {
        const nextBilling =
          await loadBillingState();

        if (alive) {
          setBilling(nextBilling);
          setLoading(false);
        }
      };

    void loadBilling();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const params =
      new URLSearchParams(
        window.location.search
      );

    if (
      params.get("checkout") !==
        "lead-engine-success" ||
      activationStatus !==
        "idle"
    ) {
      return;
    }

    setCheckoutSessionId(
      params.get("session_id")
    );

    if (
      billing?.hasLeadEnginePro
    ) {
      setActivationStatus(
        "processed"
      );
      return;
    }

    setActivationStatus(
      "activating"
    );
  }, [
    activationStatus,
    billing?.hasLeadEnginePro,
  ]);

  useEffect(() => {
    if (
      activationStatus !==
      "activating"
    ) {
      return;
    }

    if (
      billing?.hasLeadEnginePro
    ) {
      setActivationStatus(
        "processed"
      );
      return;
    }

    let alive = true;
    let attempts = 0;
    let timer:
      | ReturnType<
          typeof setTimeout
        >
      | null = null;

    const verifySession =
      async () => {
        if (!checkoutSessionId) {
          return;
        }

        try {
          const headers =
            await getAuthHeaders();

          if (
            !headers.Authorization
          ) {
            return;
          }

          await fetch(
            "/api/stripe/lead-engine-checkout/verify",
            {
              method:
                "POST",
              headers: {
                "Content-Type":
                  "application/json",
                ...headers,
              },
              body:
                JSON.stringify({
                  sessionId:
                    checkoutSessionId,
                }),
            }
          );
        } catch {
          // Billing polling below owns the user-visible fallback state.
        }
      };

    const pollBilling =
      async () => {
        attempts += 1;
        await verifySession();

        const nextBilling =
          await refreshBillingState();

        if (!alive) {
          return;
        }

        setBilling(nextBilling);
        setLoading(false);

        if (
          nextBilling
            ?.hasLeadEnginePro
        ) {
          setActivationStatus(
            "processed"
          );
          return;
        }

        if (attempts >= 15) {
          setActivationStatus(
            "delayed"
          );
          return;
        }

        timer = setTimeout(
          pollBilling,
          2000
        );
      };

    void pollBilling();

    return () => {
      alive = false;

      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [
    activationStatus,
    billing?.hasLeadEnginePro,
    checkoutSessionId,
  ]);

  const startLeadEngineCheckout =
    async () => {
      const {
        data: { session },
      } = await getCachedSession();

      if (!session) {
        window.location.href =
          `/login?next=${encodeURIComponent(
            "/billing"
          )}`;
        return;
      }

      const headers =
        await getAuthHeaders();
      const res =
        await fetch(
          "/api/stripe/lead-engine-checkout",
          {
            method:
              "POST",
            headers: {
              "Content-Type":
                "application/json",
              ...headers,
            },
          }
        );
      const data =
        await res.json();

      if (data.url) {
        window.location.href =
          data.url;
      }
    };

  const openPortal =
    async () => {
      setPortalError(null);

      try {
        const {
          data: { session },
        } = await getCachedSession();

        if (!session) {
          window.location.href =
            `/login?next=${encodeURIComponent(
              "/billing"
            )}`;
          return;
        }

        const headers =
          await getAuthHeaders();
        const res =
          await fetch(
            "/api/stripe/customer-portal",
            {
              method:
                "POST",
              headers: {
                "Content-Type":
                  "application/json",
                ...headers,
              },
            }
          );
        const data =
          await res.json();

        if (data.url) {
          window.location.href =
            data.url;
          return;
        }

        setPortalError(
          data.error ||
            "Stripe Customer Portal is not available for this account yet."
        );
      } catch {
        setPortalError(
          "Stripe Customer Portal could not be opened. Check your connection and try again."
        );
      }
    };

  const leadEngineDisplay =
    getLeadEngineDisplay(
      billing
    );

  return (
    <main className="h-screen overflow-y-auto bg-[#050505] p-4 text-white md:p-6">
      <section className="min-h-full rounded-[30px] border border-white/10 bg-white/[0.03] p-6 md:p-8">
        <div className="max-w-5xl">
          <div className="flex items-center gap-2 text-sm uppercase text-emerald-200/75">
            <CreditCard size={16} />
            Billing
          </div>
          <h1 className="mt-2 text-4xl font-semibold">
            Subscription Status
          </h1>
          <p className="mt-3 max-w-2xl text-white/45">
            Manage Inquire product access across Pro AI and Lead Engine Pro.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <article className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.06]">
                  <Crown size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">
                    Pro AI
                  </h2>
                  <p className="text-sm text-white/45">
                    Existing AI subscription
                  </p>
                </div>
              </div>
              <StatusLine
                loading={loading}
                label={
                  billing?.proAiPlan ===
                  "pro"
                    ? "Active"
                    : "Free"
                }
                detail={
                  billing?.proAiStatus ||
                  "free"
                }
              />
            </article>

            <article className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-300/15 text-emerald-100">
                  <Target size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">
                    Lead Engine Pro
                  </h2>
                  <p className="text-sm text-white/50">
                    $150/month with a 3-day free trial
                  </p>
                </div>
              </div>
              <StatusLine
                loading={loading}
                label={
                  leadEngineDisplay.label
                }
                detail={
                  leadEngineDisplay.detail
                }
              />
              {activationStatus ===
                "activating" && (
                <p className="mt-3 text-sm text-emerald-100/80">
                  Activating your Lead Engine Pro trial...
                </p>
              )}
              {activationStatus ===
                "delayed" && (
                <p className="mt-3 text-sm text-amber-100/80">
                  Your checkout was successful, but activation is still processing. Refresh in a moment.
                </p>
              )}
              {billing
                ?.leadEngineTrialEndsAt && (
                <p className="mt-3 text-sm text-emerald-100/75">
                  Trial ends{" "}
                  {new Date(
                    billing
                      .leadEngineTrialEndsAt
                  ).toLocaleDateString()}
                </p>
              )}
              {billing
                ?.hasLeadEnginePro ? (
                <button
                  type="button"
                  onClick={
                    openPortal
                  }
                  className="mt-5 h-11 rounded-2xl bg-white px-4 font-medium text-black transition hover:bg-white/90"
                >
                  Manage Subscription
                </button>
              ) : (
                <button
                  type="button"
                  onClick={
                    startLeadEngineCheckout
                  }
                  className="mt-5 h-11 rounded-2xl bg-emerald-300 px-4 font-medium text-black transition hover:bg-emerald-200"
                >
                  Start Lead Engine Pro Trial
                </button>
              )}
              {portalError && (
                <p className="mt-3 text-sm text-red-200">
                  {portalError}
                </p>
              )}
            </article>
          </div>
        </div>
      </section>
    </main>
  );
}

function getLeadEngineDisplay(
  billing: BillingState | null
) {
  if (
    billing?.leadEngineStatus ===
    "trialing"
  ) {
    return {
      label:
        "Trial Active",
      detail:
        `${getTrialDaysRemaining(
          billing
            .leadEngineTrialEndsAt
        )} days remaining`,
    };
  }

  if (
    billing?.leadEngineStatus ===
      "active" ||
    billing?.hasLeadEnginePro
  ) {
    return {
      label:
        "Active",
      detail:
        billing
          ?.leadEngineStatus ||
        "active",
    };
  }

  return {
    label:
      "Inactive",
    detail:
      billing
        ?.leadEngineStatus ||
      "free",
  };
}

function getTrialDaysRemaining(
  trialEndsAt: string | null
) {
  if (!trialEndsAt) {
    return 3;
  }

  const msRemaining =
    new Date(
      trialEndsAt
    ).getTime() -
    Date.now();

  return Math.max(
    0,
    Math.ceil(
      msRemaining /
        (24 * 60 * 60 * 1000)
    )
  );
}

function StatusLine({
  loading,
  label,
  detail,
}: {
  loading: boolean;
  label: string;
  detail: string;
}) {
  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      {loading ? (
        <div className="skeleton h-6 w-32 rounded-lg" />
      ) : (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <CheckCircle2
              size={18}
              className="text-emerald-200"
            />
            <span className="font-medium">
              {label}
            </span>
          </div>
          <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase text-white/55">
            {detail}
          </span>
        </div>
      )}
    </div>
  );
}
