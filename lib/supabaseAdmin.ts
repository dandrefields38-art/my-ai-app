import { createClient } from "@supabase/supabase-js";
import { requiredEnv } from "@/lib/env";

export const supabaseAdmin = createClient(
  requiredEnv.supabaseUrl(),
  requiredEnv.supabaseServiceRoleKey()
);
