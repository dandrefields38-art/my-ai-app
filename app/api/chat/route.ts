import { getJobs } from "@/lib/jobs";
import { getLeads } from "@/lib/leads";

export async function POST(req: Request) {
  try {
    const { message, messages } =
      await req.json();

    if (!message) {
      return Response.json({
        reply:
          "No message provided.",
      });
    }

    const text =
      message.toLowerCase();

    // =====================================
    // LEADS
    // =====================================

    const isLeadRequest =
      text.includes("lead") ||
      text.includes("leads") ||
      text.includes(
        "roofing companies"
      ) ||
      text.includes(
        "find companies"
      ) ||
      text.includes(
        "find businesses"
      ) ||
      text.includes(
        "business owners"
      );

    if (isLeadRequest) {
      const leads =
        await getLeads(message);

      if (!leads.length) {
        return Response.json({
          reply:
            "No leads found.",
        });
      }

      const formatted =
        leads
          .map(
            (
              lead: any,
              index: number
            ) => `
━━━━━━━━━━━━━━━━━━━

#${index + 1}

🏢 ${lead.name}

🌐 ${lead.website}

📝 ${lead.snippet}

━━━━━━━━━━━━━━━━━━━
`
          )
          .join("\n");

      return Response.json({
        reply: formatted,
      });
    }

    // =====================================
    // JOBS
    // =====================================

    const isJobRequest =
      text.includes("job") ||
      text.includes("jobs") ||
      text.includes(
        "remote jobs"
      ) ||
      text.includes(
        "hiring"
      );

    if (isJobRequest) {
      const jobs =
        await getJobs(message);

      if (!jobs.length) {
        return Response.json({
          reply:
            "No jobs found.",
        });
      }

      const formattedJobs =
        jobs
          .map(
            (
              job: any,
              index: number
            ) => `
━━━━━━━━━━━━━━━━━━━

#${index + 1}

💼 ${job.title}

🏢 ${job.company}

📍 ${job.location}

🔗 ${job.url}

━━━━━━━━━━━━━━━━━━━
`
          )
          .join("\n");

      return Response.json({
        reply:
          formattedJobs,
      });
    }

    // =====================================
    // NORMAL AI CHAT
    // =====================================

    const aiResponse =
      await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },

          body: JSON.stringify(
            {
              model:
                "gpt-4o-mini",

              messages: [
                {
                  role:
                    "system",

                  content: `
You are Inquire AI.

You are smart, futuristic, conversational, modern, and helpful.

You help users with:
- coding
- business
- startups
- jobs
- lead generation
- life advice
- productivity
- casual conversations

Always sound human.
Never sound robotic.
                  `,
                },

                ...(messages || []).map(
                  (m: any) => ({
                    role:
                      m.role,

                    content:
                      m.content,
                  })
                ),

                {
                  role:
                    "user",

                  content:
                    message,
                },
              ],
            }
          ),
        }
      );

    const data =
      await aiResponse.json();

    const reply =
      data?.choices?.[0]
        ?.message?.content ||
      "Sorry, I couldn't respond.";

    return Response.json({
      reply,
    });
  } catch (err) {
    console.log(
      "Chat API Error:",
      err
    );

    return Response.json({
      reply:
        "Server error.",
    });
  }
}