"use client";

import { supabase } from "@/lib/supabase";

let sessionPromise:
  | ReturnType<typeof supabase.auth.getSession>
  | null = null;
let sessionExpiresAt = 0;

export async function getCachedSession(
  force = false
) {
  const now = Date.now();

  if (
    !force &&
    sessionPromise &&
    now < sessionExpiresAt
  ) {
    return sessionPromise;
  }

  sessionPromise =
    supabase.auth.getSession();
  sessionExpiresAt =
    now + 30_000;

  return sessionPromise;
}

export async function getAuthHeaders(): Promise<
  Record<string, string>
> {
  const {
    data: { session },
  } = await getCachedSession();

  return session?.access_token
    ? {
        Authorization:
          `Bearer ${session.access_token}`,
      }
    : {};
}

export async function redirectIfSignedOut(
  router: {
    replace: (href: string) => void;
  },
  next = "/login"
) {
  const {
    data: { session },
  } = await getCachedSession();

  if (!session) {
    router.replace(next);
  }

  return session;
}
