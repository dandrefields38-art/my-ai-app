const readEnv = (
  key: string
) => {
  const value =
    process.env[key];

  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}`
    );
  }

  return value;
};

const requireValue = (
  key: string,
  value: string | undefined
) => {
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}`
    );
  }

  return value;
};

export const requiredEnv = {
  supabaseUrl: () =>
    requireValue(
      "NEXT_PUBLIC_SUPABASE_URL",
      process.env
        .NEXT_PUBLIC_SUPABASE_URL
    ),
  supabaseAnonKey: () =>
    requireValue(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      process.env
        .NEXT_PUBLIC_SUPABASE_ANON_KEY
    ),
  supabaseServiceRoleKey: () =>
    readEnv(
      "SUPABASE_SERVICE_ROLE_KEY"
    ),
  openaiApiKey: () =>
    readEnv(
      "OPENAI_API_KEY"
    ),
  stripeSecretKey: () =>
    readEnv(
      "STRIPE_SECRET_KEY"
    ),
  stripePriceId: () =>
    readEnv(
      "STRIPE_PRICE_ID"
    ),
  leadEngineStripePriceId: () =>
    readEnv(
      "STRIPE_LEAD_ENGINE_PRO_PRICE_ID"
    ),
  stripeWebhookSecret: () =>
    getOptionalEnv(
      "STRIPE_WEBHOOK_SECRET"
    ),
  apolloApiKey: () =>
    readEnv(
      "APOLLO_API_KEY"
    ),
};

export const getOptionalEnv = (
  key: string
) =>
  process.env[key] || "";
