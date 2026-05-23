import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return new Response("Unauthorized", {
      status: 401,
    });
  }

  const { message } = await req.json();

  // GET PROFILE
  let { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("clerk_user_id", userId)
    .single();

  // CREATE PROFILE IF NONE
  if (!profile) {
    const { data } = await supabase
      .from("profiles")
      .insert([
        {
          clerk_user_id: userId,
          is_pro: false,
          message_count: 0,
        },
      ])
      .select()
      .single();

    profile = data;
  }

  // FREE LIMIT
  if (!profile.is_pro && profile.message_count >= 25) {
    return new Response(
      "Free limit reached. Upgrade to Pro.",
      {
        status: 403,
      }
    );
  }

  // INCREMENT COUNT
  await supabase
    .from("profiles")
    .update({
      message_count: profile.message_count + 1,
    })
    .eq("clerk_user_id", userId);

  // STREAM AI
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    stream: true,
    messages: [
      {
        role: "system",
        content:
          "You are Inquire AI, a modern intelligent assistant.",
      },
      {
        role: "user",
        content: message,
      },
    ],
  });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      for await (const chunk of response) {
        const text =
          chunk.choices[0]?.delta?.content || "";

        controller.enqueue(
          encoder.encode(text)
        );
      }

      controller.close();
    },
  });

  return new Response(stream);
}