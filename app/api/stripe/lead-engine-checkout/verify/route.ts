import Stripe from "stripe";

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

export async function POST(
  req: Request
) {
  const auth =
    await requireApiAuth(
      req,
      {
        rateLimit: {
          key:
            "lead-engine-checkout-verify",
          limit:
            30,
          windowMs:
            60 * 1000,
        },
      }
    );

  if (auth.response) {
    return auth.response;
  }

  try {
    const body =
      (await req.json()) as {
        sessionId?: string;
      };
    const sessionId =
      body.sessionId?.trim();

    if (!sessionId) {
      return Response.json(
        {
          error:
            "Missing checkout session.",
        },
        {
          status: 400,
        }
      );
    }

    const session =
      await stripe.checkout.sessions.retrieve(
        sessionId,
        {
          expand: [
            "subscription",
          ],
        }
      );
    const subscription =
      typeof session.subscription ===
      "string"
        ? null
        : session.subscription;
    const metadataUserId =
      session.metadata?.userId ||
      subscription?.metadata?.userId;
    const metadataProduct =
      session.metadata?.product ||
      subscription?.metadata?.product;

    if (
      metadataUserId !==
        auth.user!.id ||
      metadataProduct !==
        "lead_engine_pro"
    ) {
      return Response.json(
        {
          error:
            "Checkout session does not belong to this account.",
        },
        {
          status: 403,
        }
      );
    }

    const stripeStatus =
      subscription?.status ||
      (session.status === "complete"
        ? "trialing"
        : session.status ||
          "open");
    const isActive =
      [
        "active",
        "trialing",
      ].includes(stripeStatus);

    if (
      session.status ===
        "complete" &&
      isActive
    ) {
      const { error } =
        await supabaseAdmin
          .from("users")
          .upsert(
            {
              id:
                auth.user!.id,
              lead_engine_plan:
                "lead_engine_pro",
              lead_engine_subscription_status:
                stripeStatus,
              lead_engine_stripe_customer_id:
                getCustomerValue(
                  session.customer
                ),
              lead_engine_stripe_subscription_id:
                getSubscriptionValue(
                  session.subscription
                ),
              lead_engine_trial_ends_at:
                subscription?.trial_end
                  ? new Date(
                      subscription
                        .trial_end *
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
    }

    return Response.json({
      ok: true,
      activated:
        session.status ===
          "complete" &&
        isActive,
      status:
        stripeStatus,
      checkoutStatus:
        session.status,
    });
  } catch (error) {
    console.log(
      "LEAD ENGINE CHECKOUT VERIFY ERROR:",
      error
    );

    return Response.json(
      {
        error:
          "Checkout activation could not be verified yet.",
      },
      {
        status: 500,
      }
    );
  }
}
