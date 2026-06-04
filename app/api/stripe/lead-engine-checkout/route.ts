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
    const auth =
      await requireApiAuth(
        req,
        {
          rateLimit: {
            key:
              "lead-engine-checkout",
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

    const userId =
      auth.user!.id;
    const appUrl =
      (
        process.env
          .NEXT_PUBLIC_APP_URL ||
        new URL(req.url).origin
      ).replace(
        /\/$/,
        ""
      );
    const success_url =
      `${appUrl}/billing?checkout=lead-engine-success&session_id={CHECKOUT_SESSION_ID}`;
    const cancel_url =
      `${appUrl}/upgrade?checkout=canceled`;

    console.log(
      "APP_URL:",
      process.env.APP_URL
    );
    console.log(
      "NEXT_PUBLIC_APP_URL:",
      process.env
        .NEXT_PUBLIC_APP_URL
    );
    console.log(
      "SUCCESS_URL:",
      success_url
    );
    console.log(
      "CANCEL_URL:",
      cancel_url
    );

    const session =
      await stripe.checkout.sessions.create(
        {
          mode:
            "subscription",
          payment_method_types:
            ["card"],
          line_items: [
            {
              price:
                requiredEnv
                  .leadEngineStripePriceId(),
              quantity:
                1,
            },
          ],
          metadata: {
            userId,
            product:
              "lead_engine_pro",
          },
          subscription_data: {
            trial_period_days:
              3,
            metadata: {
              userId,
              product:
                "lead_engine_pro",
            },
          },
          success_url:
            success_url,
          cancel_url:
            cancel_url,
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
  } catch (error) {
    console.log(
      "LEAD ENGINE CHECKOUT ERROR:",
      error
    );

    return Response.json(
      {
        error:
          "Lead Engine checkout failed.",
      },
      {
        status: 500,
      }
    );
  }
}
