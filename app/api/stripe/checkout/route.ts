import Stripe from "stripe";
import { auth } from "@clerk/nextjs/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return Response.json(
        { error: "You must sign in first" },
        { status: 401 }
      );
    }

    if (!process.env.STRIPE_PRICE_ID) {
      return Response.json(
        { error: "Missing STRIPE_PRICE_ID" },
        { status: 500 }
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],

      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],

      metadata: {
        clerkUserId: userId,
      },

      success_url: "http://localhost:3000/chat?success=true",
      cancel_url: "http://localhost:3000/chat?canceled=true",
    });

    return Response.json({
      url: session.url,
    });
  } catch (error) {
    console.log("STRIPE CHECKOUT ERROR:", error);

    return Response.json(
      { error: "Stripe checkout failed" },
      { status: 500 }
    );
  }
}