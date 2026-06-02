import Stripe from "stripe";

const stripe =
  new Stripe(
    process.env
      .STRIPE_SECRET_KEY!,
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

    const appUrl =
      (
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
                process.env
                  .STRIPE_PRICE_ID!,

              quantity:
                1,
            },
          ],

          metadata:
            body?.userId
              ? {
                  userId:
                    body.userId,
                }
              : undefined,

          success_url:
            `${appUrl}/chat?checkout=success`,

          cancel_url:
            `${appUrl}/chat?checkout=canceled`,
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
