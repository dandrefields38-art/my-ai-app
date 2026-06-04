"use client";

import {
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import {
  BarChart3,
  Lock,
  Target,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

export default function LeadIntelligencePage() {
  const [allowed, setAllowed] =
    useState<boolean | null>(
      null
    );
  const [statusMessage, setStatusMessage] =
    useState("");

  useEffect(() => {
    const checkAccess =
      async () => {
        const {
          data: {
            session,
          },
        } =
          await supabase.auth.getSession();

        try {
          const res =
            await fetch(
              "/api/lead-engine/intelligence",
              {
                headers:
                  session?.access_token
                    ? {
                        Authorization:
                          `Bearer ${session.access_token}`,
                      }
                    : {},
              }
            );

          if (
            res.status === 403
          ) {
            setAllowed(false);
            setStatusMessage(
              "Lead Engine Pro unlocks this workspace."
            );
            return;
          }

          setAllowed(res.ok);
          setStatusMessage(
            res.ok
              ? ""
              : "Lead Intelligence is unavailable right now."
          );
        } catch {
          setAllowed(false);
          setStatusMessage(
            "Lead Intelligence is unavailable right now."
          );
        }
      };

    checkAccess();
  }, []);

  return (
    <main className="h-screen overflow-y-auto bg-[#050505] p-4 text-white md:p-6">
      <section className="min-h-full rounded-[30px] border border-white/10 bg-white/[0.03] p-6 md:p-8">
        <div className="max-w-5xl">
          <div className="flex items-center gap-2 text-sm uppercase text-emerald-200/75">
            <Target size={16} />
            Lead Engine Pro
          </div>
          <h1 className="mt-2 text-4xl font-semibold">
            Lead Intelligence
          </h1>
          <p className="mt-3 max-w-2xl text-white/45">
            Premium lead scoring, contact coverage analysis, segmentation, and next-action guidance.
          </p>

          {allowed === null && (
            <div className="mt-8 space-y-3">
              <div className="skeleton h-24 rounded-2xl" />
              <div className="skeleton h-24 rounded-2xl" />
            </div>
          )}

          {allowed === false && (
            <div className="mt-8 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-300/15 text-emerald-100">
                  <Lock size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">
                    Lead Engine Pro Required
                  </h2>
                  <p className="mt-1 text-sm text-white/55">
                    {statusMessage ||
                      "Start the 3-day trial to unlock premium Lead Intelligence."}
                  </p>
                </div>
              </div>
              <Link
                href="/billing"
                className="mt-5 inline-flex h-11 items-center rounded-2xl bg-emerald-300 px-4 font-medium text-black transition hover:bg-emerald-200"
              >
                View Billing
              </Link>
            </div>
          )}

          {allowed === true && (
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {[
                "Lead scoring insights",
                "Contact coverage",
                "Segment analysis",
                "Next-best-action planning",
              ].map(
                (
                  item
                ) => (
                  <article
                    key={
                      item
                    }
                    className="rounded-2xl border border-white/10 bg-black/20 p-5"
                  >
                    <BarChart3
                      className="text-emerald-200"
                      size={22}
                    />
                    <h2 className="mt-4 text-xl font-semibold">
                      {item}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-white/50">
                      Generate a lead search to populate this intelligence module with live lead data.
                    </p>
                  </article>
                )
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
