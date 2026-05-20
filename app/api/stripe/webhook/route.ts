import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    console.log("WEBHOOK HIT:", body.type);

    if (body.type === "checkout.session.completed") {
      const userId = body.data?.object?.metadata?.userId;

      if (userId) {
        await supabase
          .from("users")
          .update({ plan: "pro" })
          .eq("id", userId);
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.log("Webhook error:", err);

    return NextResponse.json(
      { error: "failed" },
      { status: 500 }
    );
  }
}