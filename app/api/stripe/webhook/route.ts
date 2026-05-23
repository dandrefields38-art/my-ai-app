import Stripe from "stripe";

import { headers } from "next/headers";

import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY!,
  {
    apiVersion: "2025-04-30.basil",
  }
);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const body = await req.text();

  const signature = headers().get(
    "stripe-signature"
  ) as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.log(err);

    return new Response(
      "Webhook Error",
      {
        status: 400,
      }
    );
  }

  // PAYMENT SUCCESS
  if (
    event.type ===
    "checkout.session.completed"
  ) {
    const session =
      event.data.object as Stripe.Checkout.Session;

    const clerkUserId =
      session.metadata?.clerkUserId;

    if (clerkUserId) {

      // MAKE USER PRO
      await supabase
        .from("profiles")
        .upsert({
          clerk_user_id: clerkUserId,
          is_pro: true,
        });

      console.log(
        "User upgraded to Pro:",
        clerkUserId
      );
    }
  }

  return new Response("OK", {
    status: 200,
  });
}