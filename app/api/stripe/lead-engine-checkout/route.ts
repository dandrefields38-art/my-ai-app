import Stripe from "stripe";
import { requiredEnv } from "@/lib/env";
import { requireApiAuth } from "@/lib/security";

const stripeSecretKey =
  requiredEnv.stripeSecretKey();
const stripeMode =
  stripeSecretKey.startsWith(
    "sk_live_"
  )
    ? "live"
    : stripeSecretKey.startsWith(
          "sk_test_"
        )
      ? "test"
      : "unknown";

const stripe =
  new Stripe(
    stripeSecretKey,
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
        process.env.APP_URL ||
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
    const leadEnginePriceId =
      requiredEnv
        .leadEngineStripePriceId();

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
    console.log(
      "STRIPE_LEAD_ENGINE_PRO_PRICE_ID exists:",
      leadEnginePriceId
        ? "yes"
        : "no"
    );
    console.log(
      "STRIPE_LEAD_ENGINE_PRO_PRICE_ID prefix:",
      leadEnginePriceId.slice(
        0,
        10
      )
    );
    console.log(
      "Stripe mode:",
      stripeMode
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
                leadEnginePriceId,
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
    const stripeErrorMessage =
      error instanceof Error
        ? error.message
        : String(error);

    console.log(
      "LEAD ENGINE CHECKOUT STRIPE ERROR:",
      stripeErrorMessage
    );
    console.log(
      "LEAD ENGINE CHECKOUT RESPONSE STATUS:",
      500
    );

    return Response.json(
      {
        error:
          "Lead Engine checkout failed.",
        stripe_error:
          stripeErrorMessage,
      },
      {
        status: 500,
      }
    );
  }
}
