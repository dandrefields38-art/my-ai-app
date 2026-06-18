import Stripe from "stripe";

import {
  getBillingStatus,
  isActiveStripeStatus,
} from "@/lib/billing";
import { requiredEnv } from "@/lib/env";
import { requireApiAuth } from "@/lib/security";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const stripe =
  new Stripe(
    requiredEnv
      .stripeSecretKey(),
    {
      apiVersion:
        "2025-08-27.basil" as any,
    }
  );

const normalizeAppUrl = (
  value: string
) => {
  const trimmed =
    value.trim().replace(
      /\/+$/,
      ""
    );

  if (
    trimmed.startsWith(
      "http://"
    ) ||
    trimmed.startsWith(
      "https://"
    )
  ) {
    return trimmed;
  }

  return `https://${trimmed}`;
};

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

export async function POST(
  req: Request
) {
  const auth =
    await requireApiAuth(
      req,
      {
        rateLimit: {
          key:
            "stripe-customer-portal",
          limit:
            10,
          windowMs:
            10 * 60 * 1000,
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
    const { data } =
      await supabaseAdmin
        .from("users")
        .select(
          "pro_ai_stripe_customer_id,lead_engine_stripe_customer_id"
        )
        .eq(
          "id",
          auth.user!.id
        )
        .maybeSingle();
    const leadEngineCustomerId =
      data
        ?.lead_engine_stripe_customer_id;
    const proAiCustomerId =
      data
        ?.pro_ai_stripe_customer_id;
    let customerId =
      leadEngineCustomerId ||
      proAiCustomerId;

    if (
      billing.hasLeadEnginePro &&
      !leadEngineCustomerId
    ) {
      const subscription =
        await findActiveLeadEngineSubscription(
          {
            userId:
              auth.user!.id,
            email:
              auth.user!.email,
            customerId:
              proAiCustomerId,
          }
        );

      if (subscription) {
        await syncLeadEngineSubscription(
          auth.user!.id,
          subscription
        );
        customerId =
          getCustomerId(
            subscription.customer
          );
      }
    }

    if (!customerId) {
      return Response.json(
        {
          error:
            "No Stripe customer is connected to this account yet.",
          billing,
        },
        {
          status: 400,
        }
      );
    }

    const appUrl =
      normalizeAppUrl(
        process.env.APP_URL ||
        process.env
          .NEXT_PUBLIC_APP_URL ||
        new URL(req.url).origin
      );
    const portal =
      await stripe.billingPortal.sessions.create(
        {
          customer:
            customerId,
          return_url:
            `${appUrl}/settings/billing`,
        }
      );

    return Response.json({
      url:
        portal.url,
    });
  } catch (error) {
    console.log(
      "STRIPE PORTAL ERROR:",
      error
    );

    return Response.json(
      {
        error:
          "Failed to open Stripe Customer Portal.",
      },
      {
        status: 500,
      }
    );
  }
}
