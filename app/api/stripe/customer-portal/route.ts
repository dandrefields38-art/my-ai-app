import Stripe from "stripe";

import {
  getBillingStatus,
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
    const customerId =
      data
        ?.lead_engine_stripe_customer_id ||
      data
        ?.pro_ai_stripe_customer_id;

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
      (
        process.env.APP_URL ||
        process.env
          .NEXT_PUBLIC_APP_URL ||
        new URL(req.url).origin
      ).replace(
        /\/$/,
        ""
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
