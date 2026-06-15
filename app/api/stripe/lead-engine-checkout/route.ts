import Stripe from "stripe";
import { requiredEnv } from "@/lib/env";
import { isActiveStripeStatus } from "@/lib/billing";
import { requireApiAuth } from "@/lib/security";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

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

const safeStringify = (
  value: unknown
) => {
  try {
    return JSON.stringify(
      value,
      null,
      2
    );
  } catch {
    return String(value);
  }
};

const stripe =
  new Stripe(
    stripeSecretKey,
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
        (customer) => {
          customerIds.add(
            customer.id
          );
        }
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
          (subscription) => {
            const product =
              subscription.metadata
                ?.product;
            const metadataUserId =
              subscription.metadata
                ?.userId;

            return (
              product ===
                "lead_engine_pro" &&
              (!metadataUserId ||
                metadataUserId ===
                  userId) &&
              isActiveStripeStatus(
                subscription.status
              )
            );
          }
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
  try {
    const authorizationHeader =
      req.headers.get(
        "authorization"
      );

    console.log(
      "Lead Engine checkout route auth:",
      {
        route_reached: true,
        request_method:
          req.method,
        authorization_header_present:
          authorizationHeader?.startsWith(
            "Bearer "
          ) || false,
      }
    );

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
      console.log(
        "Lead Engine checkout route auth failed:",
        {
          response_status:
            auth.response.status,
          user_exists:
            Boolean(auth.user),
        }
      );

      return auth.response;
    }

    console.log(
      "Lead Engine checkout route auth passed:",
      {
        user_exists:
          Boolean(auth.user),
      }
    );

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
    const leadEnginePriceEnv =
      process.env
        .STRIPE_LEAD_ENGINE_PRO_PRICE_ID;
    const leadEnginePriceId =
      requiredEnv
        .leadEngineStripePriceId();
    const { data: userBilling } =
      await supabaseAdmin
        .from("users")
        .select(
          "lead_engine_subscription_status,lead_engine_stripe_customer_id"
        )
        .eq("id", userId)
        .maybeSingle();
    const billingUrl =
      `${appUrl}/billing`;

    if (
      isActiveStripeStatus(
        userBilling
          ?.lead_engine_subscription_status
      )
    ) {
      console.log(
        "Lead Engine checkout skipped existing app subscription:",
        {
          user_id:
            userId,
          lead_engine_subscription_status:
            userBilling
              ?.lead_engine_subscription_status,
        }
      );

      return Response.json({
        url: billingUrl,
        already_active: true,
        source:
          "supabase",
      });
    }

    const existingSubscription =
      await findActiveLeadEngineSubscription(
        {
          userId,
          email:
            auth.user!.email,
          customerId:
            userBilling
              ?.lead_engine_stripe_customer_id ||
            null,
        }
      );

    if (existingSubscription) {
      await syncLeadEngineSubscription(
        userId,
        existingSubscription
      );

      console.log(
        "Lead Engine checkout skipped existing Stripe subscription:",
        {
          user_id:
            userId,
          stripe_subscription_id:
            existingSubscription.id,
          stripe_status:
            existingSubscription.status,
        }
      );

      return Response.json({
        url: billingUrl,
        already_active: true,
        source:
          "stripe",
        status:
          existingSubscription.status,
      });
    }

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
      leadEnginePriceEnv
        ? "yes"
        : "no"
    );
    console.log(
      "process.env.STRIPE_LEAD_ENGINE_PRO_PRICE_ID:",
      leadEnginePriceEnv
        ? "exists"
        : "missing"
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

    console.log(
      "Lead Engine checkout Stripe create starting:",
      {
        route_reached: true,
        request_method:
          req.method,
        authorization_header_present:
          authorizationHeader?.startsWith(
            "Bearer "
          ) || false,
        price_id_exists:
          Boolean(
            leadEnginePriceId
          ),
        price_id_prefix:
          leadEnginePriceId.slice(
            0,
            10
          ),
        stripe_mode:
          stripeMode,
        env_price_id:
          leadEnginePriceEnv
            ? "exists"
            : "missing",
      }
    );

    const session = await (async () => {
      try {
        return await stripe.checkout.sessions.create(
          {
            mode:
              "subscription",
            customer_email:
              auth.user!.email ||
              undefined,
            client_reference_id:
              userId,
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
      } catch (stripeError) {
        const typedError =
          stripeError as {
            message?: string;
            type?: string;
            code?: string;
            raw?: unknown;
          };

        console.log(
          "Lead Engine checkout Stripe create failed:",
          {
            route_reached: true,
            request_method:
              req.method,
            authorization_header_present:
              authorizationHeader?.startsWith(
                "Bearer "
              ) || false,
            price_id_exists:
              Boolean(
                leadEnginePriceId
              ),
            price_id_prefix:
              leadEnginePriceId.slice(
                0,
                10
              ),
            stripe_mode:
              stripeMode,
            exact_stripe_error_message:
              stripeError instanceof
              Error
                ? stripeError.message
                : String(
                    stripeError
                  ),
            exact_stripe_error_type:
              typedError.type ||
              null,
            exact_stripe_error_code:
              typedError.code ||
              null,
            exact_stripe_error_raw:
              safeStringify(
                typedError.raw
              ),
            env_price_id:
              leadEnginePriceEnv
                ? "exists"
                : "missing",
          }
        );

        throw stripeError;
      }
    })();

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
    console.error(
      "STRIPE ERROR FULL",
      error
    );

    const stripeErrorMessage =
      error instanceof Error
        ? error.message
        : String(error);
    const typedError =
      error as {
        type?: string;
        code?: string;
        raw?: unknown;
      };

    console.log(
      "LEAD ENGINE CHECKOUT STRIPE ERROR:",
      stripeErrorMessage
    );
    console.log(
      "LEAD ENGINE CHECKOUT STRIPE ERROR DETAILS:",
      {
        exact_stripe_error_message:
          stripeErrorMessage,
        exact_stripe_error_type:
          typedError.type || null,
        exact_stripe_error_code:
          typedError.code || null,
        exact_stripe_error_raw:
          safeStringify(
            typedError.raw
          ),
      }
    );
    console.log(
      "LEAD ENGINE CHECKOUT RESPONSE STATUS:",
      500
    );

    return Response.json(
      {
        error:
          "Lead Engine checkout failed.",
        message:
          stripeErrorMessage,
        type:
          typedError.type ||
          null,
        code:
          typedError.code ||
          null,
        raw:
          typedError.raw ||
          null,
        stripe_error:
          stripeErrorMessage,
        stripe_error_type:
          typedError.type ||
          null,
        stripe_error_code:
          typedError.code ||
          null,
      },
      {
        status: 500,
      }
    );
  }
}
