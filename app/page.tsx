"use client";

import {
  useEffect,
} from "react";

import {
  useRouter,
} from "next/navigation";

import { supabase } from "@/lib/supabase";

export default function Home() {
  const router =
    useRouter();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser =
    async () => {
      const {
        data: { session },
      } =
        await supabase.auth.getSession();

      if (session) {
        router.replace(
          "/chat"
        );
      } else {
        router.replace(
          "/login"
        );
      }
    };

  return (
    <main className="page-transition flex h-screen items-center justify-center bg-[#050505] p-6 text-white">
      <div className="w-full max-w-md rounded-[32px] border border-white/10 bg-white/[0.03] p-8">
        <div className="flex items-center gap-4">
          <div className="skeleton h-14 w-14 rounded-3xl" />
          <div className="space-y-3">
            <div className="skeleton h-8 w-32 rounded-xl" />
            <div className="skeleton h-4 w-24 rounded-lg" />
          </div>
        </div>
        <div className="skeleton mt-8 h-14 rounded-2xl" />
        <div className="skeleton mt-4 h-14 rounded-2xl" />
      </div>
    </main>
  );
}
