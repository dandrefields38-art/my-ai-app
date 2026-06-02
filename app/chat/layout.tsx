"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import { supabase } from "@/lib/supabase";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router =
    useRouter();

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser =
    async () => {
      const {
        data: { session },
      } =
        await supabase.auth.getSession();

      if (!session) {
        router.push(
          "/login"
        );
      } else {
        setLoading(false);
      }
    };

  if (loading) {
    return (
      <main className="h-screen bg-black text-white flex items-center justify-center">
        Loading...
      </main>
    );
  }

  return children;
}