"use client";

import {
  useState,
} from "react";

import {
  Check,
  CheckCircle2,
  Crown,
  Loader2,
  Sparkles,
  Target,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

type PlanId =
  | "pro-ai"
  | "lead-engine-pro";

const plans = [
  {
    id: "pro-ai",
    name: "Pro AI",
    price: "$20",
    interval: "month",
    eyebrow:
      "General AI workspace",
    description:
      "Higher limits for chat, files, and everyday AI productivity.",
    icon: Crown,
    accent:
      "from-violet-300 to-fuchsia-300",
    features: [
      "More AI usage",
      "Image and PDF workflows",
      "Priority AI productivity tools",
      "Best for daily operators",
    ],
  },
  {
    id: "lead-engine-pro",
    name: "Lead Engine Pro",
    price: "$150",
    interval: "month",
    eyebrow:
      "Dedicated prospecting",
    description:
      "A standalone lead generation product for prospecting workflows.",
    icon: Target,
    accent:
      "from-emerald-200 to-cyan-200",
    badge:
      "3-day free trial",
    features: [
      "Larger lead searches",
      "Lead intelligence",
      "Saved leads and CSV export",
      "Prospecting workflow tools",
    ],
  },
] satisfies Array<{
  id: PlanId;
  name: string;
  price: string;
  interval: string;
  eyebrow: string;
  description: string;
  icon: typeof Sparkles;
  accent: string;
  badge?: string;
  features: string[];
}>;

const includedPlan = {
    name: "Pro AI",
    price: "Core AI",
    description:
      "Free includes starter usage so you can keep exploring before upgrading.",
    features: [
      "AI chat",
      "Limited uploads",
      "Starter lead searches",
    ],
};

export default function UpgradePage() {
  const [selectedPlan, setSelectedPlan] =
    useState<PlanId>("pro-ai");
  const [loading, setLoading] =
    useState(false);
  const [error, setError] =
    useState<string | null>(
      null
    );

  const startCheckout =
    async () => {
      setLoading(true);
      setError(null);

      try {
        const {
          data: {
            session,
          },
        } =
          await supabase.auth.getSession();

        if (!session) {
          window.location.href =
            `/login?next=${encodeURIComponent(
              window.location.pathname +
                window.location.search
            )}`;
          return;
        }

        const headers = {
          "Content-Type":
            "application/json",
          ...(session?.access_token
            ? {
                Authorization:
                  `Bearer ${session.access_token}`,
              }
            : {}),
        };

        console.log(
          "Lead Engine checkout client auth:",
          {
            selected_plan:
              selectedPlan,
            session_exists:
              Boolean(session),
            token_exists:
              Boolean(
                session?.access_token
              ),
            authorization_header_present:
              "Authorization" in
              headers,
          }
        );

        const res =
          await fetch(
            selectedPlan ===
              "lead-engine-pro"
              ? "/api/stripe/lead-engine-checkout"
              : "/api/checkout",
            {
              method:
                "POST",
              headers,
              body:
                JSON.stringify({}),
            }
          );
        const data =
          await res.json();

        if (data.url) {
          window.location.href =
            data.url;
          return;
        }

        setError(
          data.error ||
            "Checkout did not return a payment link."
        );
      } catch {
        setError(
          "Checkout could not be opened. Check your connection and try again."
        );
      } finally {
        setLoading(false);
      }
    };

  const selectedPlanData =
    plans.find(
      (
        plan
      ) =>
        plan.id ===
        selectedPlan
    ) || plans[0];

  return (
    <main className="h-screen overflow-y-auto bg-[#050505] p-4 text-white md:p-6">
      <section className="min-h-full rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.018))] p-5 md:p-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.18em] text-white/40">
                Pricing
              </div>
              <h1 className="mt-3 text-4xl font-semibold tracking-normal md:text-5xl">
                Choose your Inquire plan
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-white/50">
                Pick the workspace that matches your next workflow. Change the selection any time before checkout.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/55">
              <span className="text-white">
                Free included:
              </span>{" "}
              {includedPlan.features.join(
                " · "
              )}
            </div>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            {plans.map(
              (
                plan
              ) => {
                const Icon =
                  plan.icon;
                const selected =
                  selectedPlan ===
                  plan.id;

                return (
                  <button
                    type="button"
                    key={
                      plan.id
                    }
                    onClick={() =>
                      setSelectedPlan(
                        plan.id
                      )
                    }
                    aria-pressed={
                      selected
                    }
                    className={`group relative overflow-hidden rounded-2xl border p-5 text-left content-transition ${
                      selected
                        ? "border-white/45 bg-white/[0.075] shadow-[0_0_0_1px_rgba(255,255,255,0.16),0_22px_70px_rgba(168,85,247,0.22)]"
                        : "border-white/10 bg-black/20 hover:border-white/20 hover:bg-white/[0.045]"
                    }`}
                  >
                    <div
                      className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${plan.accent} ${
                        selected
                          ? "opacity-100"
                          : "opacity-35"
                      }`}
                    />
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${plan.accent} text-black`}
                        >
                          <Icon
                            size={22}
                          />
                        </div>
                        <div>
                          <div className="text-sm text-white/45">
                            {
                              plan.eyebrow
                            }
                          </div>
                          <h2 className="mt-1 text-2xl font-semibold">
                            {plan.name}
                          </h2>
                        </div>
                      </div>

                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full border ${
                          selected
                            ? "border-white bg-white text-black"
                            : "border-white/15 text-white/30"
                        }`}
                      >
                        {selected && (
                          <CheckCircle2
                            size={18}
                          />
                        )}
                      </div>
                    </div>

                    <div className="mt-7 flex items-end gap-2">
                      <div className="text-4xl font-semibold">
                        {plan.price}
                      </div>
                      <div className="pb-1 text-sm text-white/40">
                        /{plan.interval}
                      </div>
                    </div>
                    {plan.badge && (
                      <div className="mt-3 inline-flex h-7 items-center rounded-full border border-emerald-200/20 bg-emerald-300/10 px-3 text-xs font-medium text-emerald-100">
                        {plan.badge}
                      </div>
                    )}
                    <p className="mt-3 text-sm leading-6 text-white/50">
                      {
                        plan.description
                      }
                    </p>
                    <div className="mt-5 space-y-3">
                      {plan.features.map(
                        (
                          feature
                        ) => (
                          <div
                            key={
                              feature
                            }
                            className="flex items-center gap-2 text-sm text-white/70"
                          >
                            <Check
                              size={16}
                              className="text-emerald-200"
                            />
                            {feature}
                          </div>
                        )
                      )}
                    </div>
                  </button>
                );
              }
            )}
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4 md:flex md:items-center md:justify-between md:gap-5">
            <div>
              <div className="text-sm text-white/45">
                Selected plan
              </div>
              <div className="mt-1 text-xl font-semibold">
                {
                  selectedPlanData.name
                }{" "}
                <span className="text-white/40">
                  ·{" "}
                  {
                    selectedPlanData.price
                  }
                  /
                  {
                    selectedPlanData.interval
                  }
                </span>
              </div>
              {error && (
                <div className="mt-2 text-sm text-red-200">
                  {error}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={
                startCheckout
              }
              disabled={loading}
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-5 font-medium text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60 md:mt-0 md:w-auto"
            >
              {loading && (
                <Loader2
                  size={17}
                  className="animate-spin"
                />
              )}
              Continue to Checkout
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
