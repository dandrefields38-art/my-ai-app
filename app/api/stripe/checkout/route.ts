import Stripe from "stripe";
import { NextResponse } from "next/server";
import { requiredEnv } from "@/lib/env";
import { requireApiAuth } from "@/lib/security";

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
    value.trim();
  const withScheme =
    /^https?:\/\//i.test(
      trimmed
    )
      ? trimmed
      : `https://${trimmed}`;

  return withScheme.replace(
    /\/$/,
    ""
  );
};

export async function POST(
  req: Request
) {

  try {
    let body:
      | {
          userId?: string;
        }
      | null =
      null;

    try {
      body =
        await req.json();
    } catch {
      body =
        null;
    }

    const auth =
      await requireApiAuth(
        req,
        {
          userId:
            body?.userId ||
            null,
          rateLimit: {
            key:
              "checkout",
            limit:
              10,
            windowMs:
              10 * 60 * 1000,
          },
        }
      );

    if (
      auth.response
    ) {
      return auth.response;
    }

    const checkoutUserId =
      body?.userId ||
      auth.user?.id;

    const appUrl =
      normalizeAppUrl(
        process.env.APP_URL ||
        process.env
          .NEXT_PUBLIC_APP_URL ||
        new URL(req.url).origin
      );

    const session =
      await stripe.checkout.sessions.create(
        {
          payment_method_types:
            ["card"],

          mode:
            "subscription",

          line_items: [
            {
              price:
                requiredEnv
                  .stripePriceId(),

              quantity:
                1,
            },
          ],

          metadata:
            checkoutUserId
              ? {
                  userId:
                    checkoutUserId,
                  product:
                    "pro_ai",
                }
              : undefined,

          subscription_data:
            checkoutUserId
              ? {
                  metadata: {
                    userId:
                      checkoutUserId,
                    product:
                      "pro_ai",
                  },
                }
              : undefined,

          success_url:
            `${appUrl}/billing?checkout=pro-ai-success`,

          cancel_url:
            `${appUrl}/upgrade?checkout=canceled`,
        }
      );

    if (!session.url) {
      return Response.json(
        {
          error:
            "Stripe did not return a checkout URL.",
        },
        {
          status: 500,
        }
      );
    }

    return Response.json({
      url:
        session.url,
    });

  } catch (
    error
  ) {
    console.error(
      "FULL_STRIPE_ERROR",
      error
    );

    return NextResponse.json(
      {
        error:
          "Checkout error",
        message:
          error instanceof Error
            ? error.message
            : String(error),
        stack:
          error instanceof Error
            ? error.stack
            : null,
        raw:
          error,
      },
      {
        status: 500,
      }
    );
  }
}
