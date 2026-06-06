"use client";

import {
  useEffect,
  useState,
} from "react";
import {
  useRouter,
} from "next/navigation";

import { clearCachedSession } from "@/lib/authClient";
import { supabase } from "@/lib/supabase";

const getSafeNext = (
  value: string | null
) =>
  value?.startsWith("/") &&
  !value.startsWith("//")
    ? value
    : "/chat";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] =
    useState<string | null>(
      null
    );

  useEffect(() => {
    let active = true;

    const completeAuth =
      async () => {
        const next =
          getSafeNext(
            new URLSearchParams(
              window.location.search
            ).get(
              "next"
            )
          );

        try {
          const code =
            new URLSearchParams(
              window.location.search
            ).get(
              "code"
            );

          if (code) {
            const {
              error:
                exchangeError,
            } =
              await supabase.auth.exchangeCodeForSession(
                code
              );

            if (exchangeError) {
              throw exchangeError;
            }
          }

          const hashParams =
            new URLSearchParams(
              window.location.hash.replace(
                /^#/,
                ""
              )
            );
          const accessToken =
            hashParams.get(
              "access_token"
            );
          const refreshToken =
            hashParams.get(
              "refresh_token"
            );

          if (
            accessToken &&
            refreshToken
          ) {
            const {
              error:
                sessionError,
            } =
              await supabase.auth.setSession(
                {
                  access_token:
                    accessToken,
                  refresh_token:
                    refreshToken,
                }
              );

            if (sessionError) {
              throw sessionError;
            }

            window.history.replaceState(
              window.history.state,
              "",
              `${window.location.pathname}${window.location.search}`
            );
          }

          const {
            data: {
              session,
            },
            error:
              getSessionError,
          } =
            await supabase.auth.getSession();

          if (getSessionError) {
            throw getSessionError;
          }

          if (!session) {
            throw new Error(
              "No Supabase session was stored after login."
            );
          }

          clearCachedSession();
          router.replace(next);
        } catch (err) {
          if (!active) {
            return;
          }

          setError(
            err instanceof Error
              ? err.message
              : "Login could not be completed."
          );
        }
      };

    void completeAuth();

    return () => {
      active = false;
    };
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050505] p-6 text-white">
      <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-white/[0.04] p-6 text-center">
        <div className="text-lg font-medium">
          {error
            ? "Login needs another try"
            : "Signing you in..."}
        </div>
        {error && (
          <p className="mt-3 text-sm leading-6 text-white/50">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}
