import { NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    if (!message) {
      return NextResponse.json({ reply: "No message received" });
    }

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: `
You are a helpful, smart AI inside a SaaS app.

Rules:
- Keep responses clear and useful
- Avoid long unnecessary explanations
- Be conversational like ChatGPT
- If user asks coding, give working code
- If user is confused, simplify
          `.trim(),
        },
        {
          role: "user",
          content: message,
        },
      ],
    });

    return NextResponse.json({
      reply: completion.choices[0].message.content,
    });
  } catch (err) {
    console.log("OPENAI ERROR:", err);

    return NextResponse.json({
      reply: "AI error occurred",
    });
  }
}