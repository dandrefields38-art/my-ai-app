export type ProductTier =
  | "free"
  | "pro_ai"
  | "lead_engine_pro";

export type ProductEntitlements = {
  tier: ProductTier;
  label: string;
  maxLeadResults: number;
  hasLeadEngine: boolean;
  hasLeadIntelligence: boolean;
};

export const productEntitlements: Record<
  ProductTier,
  ProductEntitlements
> = {
  free: {
    tier: "free",
    label: "Free",
    maxLeadResults: 10,
    hasLeadEngine: true,
    hasLeadIntelligence: false,
  },
  pro_ai: {
    tier: "pro_ai",
    label: "Pro AI",
    maxLeadResults: 25,
    hasLeadEngine: true,
    hasLeadIntelligence: false,
  },
  lead_engine_pro: {
    tier: "lead_engine_pro",
    label: "Lead Engine Pro",
    maxLeadResults: 100,
    hasLeadEngine: true,
    hasLeadIntelligence: true,
  },
};

export const normalizeProductTier = (
  plan: string | null | undefined
): ProductTier => {
  if (
    plan === "lead_engine_pro" ||
    plan === "lead-engine-pro"
  ) {
    return "lead_engine_pro";
  }

  if (
    plan === "pro" ||
    plan === "pro_ai" ||
    plan === "pro-ai"
  ) {
    return "pro_ai";
  }

  return "free";
};

export const hasLeadEnginePro = (
  plan: string | null | undefined,
  status?: string | null
) => {
  const normalized =
    normalizeProductTier(plan);

  if (
    normalized !==
    "lead_engine_pro"
  ) {
    return false;
  }

  if (!status) {
    return true;
  }

  return [
    "active",
    "trialing",
  ].includes(status);
};

export const getLeadEngineTier = (
  plan: string | null | undefined,
  status?: string | null
) =>
  hasLeadEnginePro(plan, status)
    ? productEntitlements
        .lead_engine_pro
    : productEntitlements.free;

export const getProductEntitlements = (
  plan: string | null | undefined
) =>
  productEntitlements[
    normalizeProductTier(plan)
  ];
