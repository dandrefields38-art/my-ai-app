"use client";

import {
  useState,
} from "react";

import { supabase } from "@/lib/supabase";

import {
  Sparkles,
} from "lucide-react";

export default function LoginPage() {
  const [loadingAction, setLoadingAction] =
    useState<
      "google" | "email" | null
    >(null);

  const signInWithGoogle =
    async () => {
      const redirectTo =
        getRedirectTo();

      setLoadingAction(
        "google"
      );

      await supabase.auth.signInWithOAuth(
        {
          provider:
            "google",

          options: {
            redirectTo:
              redirectTo,
          },
        }
      );
    };

  const signInWithEmail =
    async (
      e: any
    ) => {
      e.preventDefault();
      const redirectTo =
        getRedirectTo();

      setLoadingAction(
        "email"
      );

      const email =
        e.target.email.value;

      await supabase.auth.signInWithOtp(
        {
          email,

          options: {
            emailRedirectTo:
              redirectTo,
          },
        }
      );

      alert(
        "Check your email for login link."
      );

      setLoadingAction(
        null
      );
    };

  return (
    <main className="page-transition flex min-h-screen items-center justify-center bg-[#050505] p-6 text-white">
      <div className="content-transition w-full max-w-md rounded-[36px] border border-white/10 bg-white/[0.03] p-8 shadow-2xl backdrop-blur-3xl">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-3xl bg-gradient-to-br from-purple-400 to-purple-700 flex items-center justify-center">
            <Sparkles className="text-white" />
          </div>

          <div>
            <h1 className="text-3xl font-semibold">
              Inquire
            </h1>

            <p className="text-white/40">
              AI Workspace
            </p>
          </div>
        </div>

        {/* GOOGLE */}
        <button
          onClick={
            signInWithGoogle
          }
          disabled={
            loadingAction !== null
          }
          className="mb-6 h-14 w-full rounded-2xl bg-white font-medium text-black transition hover:scale-[1.01] disabled:scale-100 disabled:opacity-60"
        >
          {loadingAction ===
          "google"
            ? "Connecting..."
            : "Continue with Google"}
        </button>

        <div className="text-center text-white/40 mb-6">
          or
        </div>

        {/* EMAIL */}
        <form
          onSubmit={
            signInWithEmail
          }
          className="space-y-4"
        >
          <input
            name="email"
            type="email"
            placeholder="Enter your email"
            required
            className="w-full h-14 rounded-2xl bg-white/[0.04] border border-white/10 px-5 outline-none"
          />

          <button
            disabled={
              loadingAction !==
              null
            }
            className="h-14 w-full rounded-2xl bg-blue-600 font-medium transition hover:bg-blue-500 disabled:opacity-60"
          >
            {loadingAction ===
            "email"
              ? "Sending..."
              : "Send Login Link"}
          </button>
        </form>
      </div>
    </main>
  );
}

function getRedirectTo() {
  const params =
    new URLSearchParams(
      window.location.search
    );
  const next =
    params.get("next");
  const safeNext =
    next?.startsWith("/") &&
    !next.startsWith("//")
      ? next
      : "/chat";

  const callbackUrl =
    new URL(
      "/auth/callback",
      window.location.origin
    );
  callbackUrl.searchParams.set(
    "next",
    safeNext
  );

  return callbackUrl.toString();
}
