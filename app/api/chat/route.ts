import { getJobs } from "@/lib/jobs";

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    if (!message) {
      return new Response(
        JSON.stringify({ reply: "No message provided" }),
        { status: 400 }
      );
    }

    const text = message.toLowerCase();

    // ---------------------------------------
    // 💼 JOB SYSTEM (HYBRID AI + REAL API)
    // ---------------------------------------
    if (text.includes("job") || text.includes("jobs")) {
      const jobs = await getJobs(message);

      const formattedJobs = jobs
        .map(
          (job: any) =>
            `💼 ${job.title}\n🏢 ${job.company}\n📍 ${job.location}\n🔗 ${job.url}`
        )
        .join("\n\n");

      return new Response(
        JSON.stringify({
          reply: `Here are some jobs I found:\n\n${formattedJobs}`,
        })
      );
    }

    // ---------------------------------------
    // 🤖 NORMAL AI CHAT (FALLBACK)
    // ---------------------------------------
    const aiResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "You are a helpful assistant inside a SaaS chat app.",
            },
            {
              role: "user",
              content: message,
            },
          ],
        }),
      }
    );

    const data = await aiResponse.json();

    const reply =
      data?.choices?.[0]?.message?.content ||
      "Sorry, I couldn't respond.";

    return new Response(JSON.stringify({ reply }));
  } catch (err) {
    console.log("Chat API error:", err);

    return new Response(
      JSON.stringify({ reply: "Server error" }),
      { status: 500 }
    );
  }
}