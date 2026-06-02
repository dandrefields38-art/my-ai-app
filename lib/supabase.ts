import { createClient } from "@supabase/supabase-js";
import { requiredEnv } from "@/lib/env";

export const supabase =
  createClient(
    requiredEnv
      .supabaseUrl(),

    requiredEnv
      .supabaseAnonKey(),

    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    }
  );
