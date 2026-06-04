"use client";

import {
  useEffect,
} from "react";

import {
  useRouter,
} from "next/navigation";

import { redirectIfSignedOut } from "@/lib/authClient";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router =
    useRouter();

  useEffect(() => {
    void redirectIfSignedOut(
      router
    );
  }, [router]);

  return <>{children}</>;
}
