import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requiredEnv } from "@/lib/env";

const supabase = createClient(
  requiredEnv.supabaseUrl(),
  requiredEnv.supabaseServiceRoleKey()
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
