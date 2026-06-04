import {
  getLeadEngineTier,
  getProductEntitlements,
  hasLeadEnginePro,
} from "@/lib/productTiers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type BillingStatus = {
  userId: string;
  proAiPlan: string;
  proAiStatus: string;
  leadEnginePlan: string;
  leadEngineStatus: string;
  leadEngineTrialEndsAt: string | null;
  hasLeadEnginePro: boolean;
};

const activeStatuses = [
  "active",
  "trialing",
];

export const getBillingStatus =
  async (
    userId: string
  ): Promise<BillingStatus> => {
    const { data, error } =
      await supabaseAdmin
        .from("users")
        .select(
          "id,plan,pro_ai_subscription_status,lead_engine_plan,lead_engine_subscription_status,lead_engine_trial_ends_at"
        )
        .eq("id", userId)
        .maybeSingle();

    if (error) {
      throw error;
    }

    const proAiPlan =
      data?.plan || "free";
    const proAiStatus =
      data
        ?.pro_ai_subscription_status ||
      (
        proAiPlan === "pro"
          ? "active"
          : "free"
      );
    const leadEnginePlan =
      data?.lead_engine_plan ||
      "free";
    const leadEngineStatus =
      data
        ?.lead_engine_subscription_status ||
      "free";

    return {
      userId,
      proAiPlan,
      proAiStatus,
      leadEnginePlan,
      leadEngineStatus,
      leadEngineTrialEndsAt:
        data
          ?.lead_engine_trial_ends_at ||
        null,
      hasLeadEnginePro:
        hasLeadEnginePro(
          leadEnginePlan,
          leadEngineStatus
        ),
    };
  };

export const isActiveStripeStatus = (
  status: string | null | undefined
) =>
  activeStatuses.includes(
    String(status || "")
  );

export const getLeadEngineEntitlements =
  (
    billing: BillingStatus
  ) =>
    getLeadEngineTier(
      billing.leadEnginePlan,
      billing.leadEngineStatus
    );

export const getProAiEntitlements =
  (
    billing: BillingStatus
  ) =>
    getProductEntitlements(
      billing.proAiPlan
    );
