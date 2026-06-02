"use client";

import { supabase } from "@/lib/supabase";

import {
  Sparkles,
} from "lucide-react";

export default function LoginPage() {
  const signInWithGoogle =
    async () => {
      await supabase.auth.signInWithOAuth(
        {
          provider:
            "google",

          options: {
            redirectTo:
              "http://localhost:3000/chat",
          },
        }
      );
    };

  const signInWithEmail =
    async (
      e: any
    ) => {
      e.preventDefault();

      const email =
        e.target.email.value;

      await supabase.auth.signInWithOtp(
        {
          email,

          options: {
            emailRedirectTo:
              "http://localhost:3000/chat",
          },
        }
      );

      alert(
        "Check your email for login link."
      );
    };

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-[36px] border border-white/10 bg-white/[0.03] backdrop-blur-3xl p-8 shadow-2xl">
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
          className="w-full h-14 rounded-2xl bg-white text-black font-medium hover:scale-[1.02] transition mb-6"
        >
          Continue with Google
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

          <button className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-500 transition font-medium">
            Send Login Link
          </button>
        </form>
      </div>
    </main>
  );
}