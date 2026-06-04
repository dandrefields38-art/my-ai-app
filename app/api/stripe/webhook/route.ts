import { NextResponse } from "next/server";
import Stripe from "stripe";

import { requiredEnv } from "@/lib/env";
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

const getSubscriptionValue = (
  value:
    | string
    | Stripe.Subscription
    | null
    | undefined
) =>
  typeof value === "string"
    ? value
    : value?.id || null;

const getCustomerValue = (
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

const upsertUser = async (
  userId: string,
  values: Record<
    string,
    unknown
  >
) => {
  const { error } =
    await supabaseAdmin
      .from("users")
      .upsert(
        {
          id:
            userId,
          ...values,
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

const handleCheckoutCompleted =
  async (
    session: Stripe.Checkout.Session
  ) => {
    const userId =
      session.metadata?.userId;
    const product =
      session.metadata?.product;

    if (!userId) {
      return;
    }

    if (
      product ===
      "lead_engine_pro"
    ) {
      await upsertUser(
        userId,
        {
          lead_engine_plan:
            "lead_engine_pro",
          lead_engine_subscription_status:
            session.status ===
            "complete"
              ? "trialing"
              : session.status ||
                "active",
          lead_engine_stripe_customer_id:
            getCustomerValue(
              session.customer
            ),
          lead_engine_stripe_subscription_id:
            getSubscriptionValue(
              session.subscription
            ),
        }
      );
      return;
    }

    await upsertUser(
      userId,
      {
        plan:
          "pro",
        pro_ai_subscription_status:
          "active",
        pro_ai_stripe_customer_id:
          getCustomerValue(
            session.customer
          ),
        pro_ai_stripe_subscription_id:
          getSubscriptionValue(
            session.subscription
          ),
      }
    );
  };

const handleSubscriptionChange =
  async (
    subscription: Stripe.Subscription
  ) => {
    const userId =
      subscription.metadata?.userId;
    const product =
      subscription.metadata?.product;

    if (!userId) {
      return;
    }

    if (
      product ===
      "lead_engine_pro"
    ) {
      await upsertUser(
        userId,
        {
          lead_engine_plan:
            [
              "active",
              "trialing",
            ].includes(
              subscription.status
            )
              ? "lead_engine_pro"
              : "free",
          lead_engine_subscription_status:
            subscription.status,
          lead_engine_stripe_customer_id:
            getCustomerValue(
              subscription.customer
            ),
          lead_engine_stripe_subscription_id:
            subscription.id,
          lead_engine_trial_ends_at:
            subscription.trial_end
              ? new Date(
                  subscription
                    .trial_end *
                    1000
                ).toISOString()
              : null,
        }
      );
      return;
    }

    await upsertUser(
      userId,
      {
        plan:
          [
            "active",
            "trialing",
          ].includes(
            subscription.status
          )
            ? "pro"
            : "free",
        pro_ai_subscription_status:
          subscription.status,
        pro_ai_stripe_customer_id:
          getCustomerValue(
            subscription.customer
          ),
        pro_ai_stripe_subscription_id:
          subscription.id,
      }
    );
  };

export async function POST(
  req: Request
) {
  try {
    const body =
      await req.text();
    const webhookSecret =
      requiredEnv
        .stripeWebhookSecret();
    let event:
      | Stripe.Event
      | null =
      null;

    if (webhookSecret) {
      const signature =
        req.headers.get(
          "stripe-signature"
        );

      if (!signature) {
        return NextResponse.json(
          {
            error:
              "Missing Stripe signature.",
          },
          {
            status: 400,
          }
        );
      }

      event =
        stripe.webhooks.constructEvent(
          body,
          signature,
          webhookSecret
        );
    } else {
      event =
        JSON.parse(
          body
        ) as Stripe.Event;
    }

    if (
      event.type ===
      "checkout.session.completed"
    ) {
      await handleCheckoutCompleted(
        event.data
          .object as Stripe.Checkout.Session
      );
    }

    if (
      event.type ===
        "customer.subscription.created" ||
      event.type ===
        "customer.subscription.updated" ||
      event.type ===
        "customer.subscription.deleted"
    ) {
      await handleSubscriptionChange(
        event.data
          .object as Stripe.Subscription
      );
    }

    return NextResponse.json({
      received:
        true,
    });
  } catch (error) {
    console.log(
      "STRIPE WEBHOOK ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Webhook failed.",
      },
      {
        status: 500,
      }
    );
  }
}
