import Stripe from "stripe";
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
      (
        process.env.APP_URL ||
        process.env
          .NEXT_PUBLIC_APP_URL ||
        new URL(req.url).origin
      ).replace(
        /\/$/,
        ""
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
    err
  ) {

    console.log(
      err
    );

    return Response.json(
      {
        error:
          "Checkout error",
      },
      {
        status: 500,
      }
    );
  }
}
