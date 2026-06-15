import {
  getBillingStatus,
  getLeadEngineEntitlements,
  getProAiEntitlements,
  isActiveStripeStatus,
} from "@/lib/billing";
import { requiredEnv } from "@/lib/env";
import { requireApiAuth } from "@/lib/security";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import Stripe from "stripe";

const stripe =
  new Stripe(
    requiredEnv
      .stripeSecretKey(),
    {
      apiVersion:
        "2025-08-27.basil" as any,
    }
  );

const getCustomerId = (
  value:
    | string
    | Stripe.Customer
    | Stripe.DeletedCustomer
    | null
    | undefined
) =>
  typeof value === "string"
    ? value
    : value?.id || null;

const findActiveLeadEngineSubscription =
  async ({
    userId,
    email,
    customerId,
  }: {
    userId: string;
    email?: string | null;
    customerId?: string | null;
  }) => {
    const customerIds =
      new Set<string>();

    if (customerId) {
      customerIds.add(customerId);
    }

    if (email) {
      const customers =
        await stripe.customers.list({
          email,
          limit: 10,
        });

      customers.data.forEach(
        (customer) =>
          customerIds.add(
            customer.id
          )
      );
    }

    for (const id of customerIds) {
      const subscriptions =
        await stripe.subscriptions.list(
          {
            customer: id,
            status: "all",
            limit: 100,
          }
        );

      const activeSubscription =
        subscriptions.data.find(
          (subscription) =>
            subscription.metadata
              ?.product ===
              "lead_engine_pro" &&
            (!subscription.metadata
              ?.userId ||
              subscription.metadata
                .userId === userId) &&
            isActiveStripeStatus(
              subscription.status
            )
        );

      if (activeSubscription) {
        return activeSubscription;
      }
    }

    return null;
  };

const syncLeadEngineSubscription =
  async (
    userId: string,
    subscription: Stripe.Subscription
  ) => {
    const { error } =
      await supabaseAdmin
        .from("users")
        .upsert(
          {
            id: userId,
            lead_engine_plan:
              "lead_engine_pro",
            lead_engine_subscription_status:
              subscription.status,
            lead_engine_stripe_customer_id:
              getCustomerId(
                subscription.customer
              ),
            lead_engine_stripe_subscription_id:
              subscription.id,
            lead_engine_trial_ends_at:
              subscription.trial_end
                ? new Date(
                    subscription.trial_end *
                      1000
                  ).toISOString()
                : null,
          },
          {
            onConflict:
              "id",
          }
        );

    if (error) {
      throw error;
    }
  };

export async function GET(
  req: Request
) {
  const auth =
    await requireApiAuth(
      req,
      {
        rateLimit: {
          key:
            "billing-status",
          limit:
            60,
          windowMs:
            60 * 1000,
        },
      }
    );

  if (auth.response) {
    return auth.response;
  }

  try {
    const billing =
      await getBillingStatus(
        auth.user!.id
      );
    let syncedBilling =
      billing;

    if (
      !billing.hasLeadEnginePro
    ) {
      const { data: userBilling } =
        await supabaseAdmin
          .from("users")
          .select(
            "lead_engine_stripe_customer_id"
          )
          .eq(
            "id",
            auth.user!.id
          )
          .maybeSingle();
      const activeSubscription =
        await findActiveLeadEngineSubscription(
          {
            userId:
              auth.user!.id,
            email:
              auth.user!.email,
            customerId:
              userBilling
                ?.lead_engine_stripe_customer_id ||
              null,
          }
        );

      if (activeSubscription) {
        await syncLeadEngineSubscription(
          auth.user!.id,
          activeSubscription
        );
        syncedBilling =
          await getBillingStatus(
            auth.user!.id
          );
      }
    }

    return Response.json({
      billing: syncedBilling,
      entitlements: {
        proAi:
          getProAiEntitlements(
            syncedBilling
          ),
        leadEngine:
          getLeadEngineEntitlements(
            syncedBilling
          ),
      },
    });
  } catch (error) {
    console.log(
      "BILLING STATUS ERROR:",
      error
    );

    return Response.json(
      {
        error:
          "Failed to load billing status.",
      },
      {
        status: 500,
      }
    );
  }
}
