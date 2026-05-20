import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    if (!message) {
      return new Response(JSON.stringify({ reply: "No message provided" }), {
        status: 400,
      });
    }

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      messages: [
        {
          role: "system",
          content: `
You are Inquire AI, a chat + job assistant platform.

You help users with:
- general chat questions
- job search requests (VERY IMPORTANT)

JOB RULES:
If the user asks about jobs:
- identify job type (example: warehouse, retail, delivery, office)
- identify location (city, state)
- respond in a structured, helpful way
- keep answers short and clear

Do NOT hallucinate real job listings.
Assume job data comes from a backend API.

Be helpful, simple, and direct.
          `.trim(),
        },
        {
          role: "user",
          content: message,
        },
      ],
    });

    return new Response(
      JSON.stringify({
        reply: completion.choices[0].message.content,
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.log("CHAT API ERROR:", err);

    return new Response(
      JSON.stringify({ reply: "AI error occurred" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}