import OpenAI from "openai";
import axios from "axios";

import { createClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const FREE_LIMIT = 25;

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new Response(
        "Unauthorized",
        {
          status: 401,
        }
      );
    }

    const {
      chatId,
      message,
      image,
      documentText,
    } = await req.json();

    // =====================
    // PROFILE
    // =====================

    let { data: profile } =
      await supabase
        .from("profiles")
        .select("*")
        .eq(
          "clerk_user_id",
          userId
        )
        .single();

    if (!profile) {
      const { data } =
        await supabase
          .from("profiles")
          .insert([
            {
              clerk_user_id:
                userId,

              is_pro: false,

              message_count: 0,
            },
          ])
          .select()
          .single();

      profile = data;
    }

    // =====================
    // LIMITS
    // =====================

    if (
      !profile.is_pro &&
      profile.message_count >=
        FREE_LIMIT
    ) {
      return new Response(
        "Free limit reached. Upgrade to Pro.",
        {
          status: 403,
        }
      );
    }

    await supabase
      .from("profiles")
      .update({
        message_count:
          (profile.message_count ||
            0) + 1,
      })
      .eq(
        "clerk_user_id",
        userId
      );

    // =====================
    // DOCUMENT SUPPORT
    // =====================

    const finalMessage =
      documentText
        ? `${
            message ||
            "Analyze this document."
          }

DOCUMENT CONTENT:
${documentText.slice(
  0,
  15000
)}`
        : message;

    // =====================
    // MEMORY
    // =====================

    const {
      data: previousMessages,
    } = await supabase
      .from("messages")
      .select("*")
      .eq("chat_id", chatId)
      .order("created_at", {
        ascending: true,
      })
      .limit(20);

    const history =
      previousMessages?.map(
        (msg: any) => ({
          role:
            msg.role ===
            "assistant"
              ? "assistant"
              : "user",

          content:
            msg.content,
        })
      ) || [];

    // =====================
    // TOOL DETECTION
    // =====================

    const lower =
      finalMessage.toLowerCase();

    const isLeadRequest =
      lower.includes("lead") ||
      lower.includes(
        "businesses"
      ) ||
      lower.includes(
        "companies"
      ) ||
      lower.includes(
        "prospects"
      );

    const isJobRequest =
      lower.includes("job") ||
      lower.includes("hiring") ||
      lower.includes("career") ||
      lower.includes(
        "work from home"
      ) ||
      lower.includes(
        "remote"
      );

    // =====================
    // LEADS TOOL
    // =====================

    if (isLeadRequest) {
      try {
        const businessMatch =
          finalMessage.match(
            /(roofing|trucking|restaurants|salons|real estate|brokerages|construction|medical|law firms|auto shops|dentists|marketing agencies|gyms)/i
          );

        const locationMatch =
          finalMessage.match(
            /in ([a-zA-Z\s]+)/i
          );

        const business =
          businessMatch?.[0] ||
          "businesses";

        const location =
          locationMatch?.[1] ||
          "New York";

        const leadsResponse =
          await axios.post(
            `${process.env.NEXT_PUBLIC_APP_URL}/api/leads`,
            {
              query:
                business,

              location,
            }
          );

        const leads =
          leadsResponse.data
            .leads || [];

        // =====================
        // AUTO SAVE LEADS
        // =====================

        try {
          await axios.post(
            `${process.env.NEXT_PUBLIC_APP_URL}/api/save-leads`,
            {
              leads: leads.map(
                (lead: any) => ({
                  ...lead,

                  industry:
                    business,
                })
              ),
            }
          );
        } catch (saveErr) {
          console.log(
            "AUTO SAVE ERROR:",
            saveErr
          );
        }

        let formatted =
          `Here are some ${business} leads in ${location}:\n\n`;

        leads
          .slice(0, 10)
          .forEach(
            (
              lead: any,
              index: number
            ) => {
              formatted += `${index + 1}. ${lead.name}

Address: ${lead.address}

Rating: ${lead.rating}

Status: ${lead.business_status}

`;
            }
          );

        formatted += `
These leads have been automatically saved into your CRM.

Next things I can help with:
- generate cold call scripts
- write outreach emails
- build SMS campaigns
- organize leads
- score lead quality
- create follow-up plans
`;

        return new Response(
          formatted
        );
      } catch (err) {
        console.log(
          "LEADS TOOL ERROR:",
          err
        );
      }
    }

    // =====================
    // JOB TOOL
    // =====================

    if (isJobRequest) {
      try {
        const roleMatch =
          finalMessage.match(
            /(software engineer|sales|marketing|project manager|healthcare|customer service|it support|developer|designer|sdr|account executive|admin|assistant)/i
          );

        const locationMatch =
          finalMessage.match(
            /in ([a-zA-Z\s]+)/i
          );

        const role =
          roleMatch?.[0] ||
          "Software Engineer";

        const location =
          locationMatch?.[1] ||
          "New York";

        const jobsResponse =
          await axios.post(
            `${process.env.NEXT_PUBLIC_APP_URL}/api/jobs`,
            {
              query: role,

              location,
            }
          );

        const jobs =
          jobsResponse.data.jobs ||
          [];

        let formatted =
          `Here are some ${role} jobs in ${location}:\n\n`;

        jobs.forEach(
          (
            job: any,
            index: number
          ) => {
            formatted += `${index + 1}. ${job.title}

Company: ${job.company}

Location: ${job.location}

Salary: ${job.salary}

Apply: ${job.redirect_url}

`;
          }
        );

        return new Response(
          formatted
        );
      } catch (err) {
        console.log(
          "JOB TOOL ERROR:",
          err
        );
      }
    }

    // =====================
    // IMAGE SUPPORT
    // =====================

    const userContent =
      image
        ? [
            {
              type:
                "text" as const,

              text:
                finalMessage ||
                "Analyze this image.",
            },

            {
              type:
                "image_url" as const,

              image_url: {
                url: image,
              },
            },
          ]
        : finalMessage;

    // =====================
    // NORMAL AI
    // =====================

    const response =
      await openai.responses.create({
        model: "gpt-4.1-mini",

        tools: [
          {
            type:
              "web_search_preview",
          },
        ],

        input: [
          {
            role: "system",

            content:
              "You are Inquire, an advanced AI operating system and assistant. You help users with business, jobs, lead generation, automation, research, writing, coding, productivity, images, documents, and life organization. You intelligently route tasks to tools and maintain memory of the conversation.",
          },

          ...history,

          {
            role: "user",

            content:
              userContent,
          },
        ],

        stream: true,
      });

    // =====================
    // STREAM
    // =====================

    const encoder =
      new TextEncoder();

    const stream =
      new ReadableStream({
        async start(
          controller
        ) {
          for await (const event of response) {
            if (
              event.type ===
              "response.output_text.delta"
            ) {
              controller.enqueue(
                encoder.encode(
                  event.delta
                )
              );
            }
          }

          controller.close();
        },
      });

    return new Response(
      stream
    );
  } catch (error) {
    console.log(
      "CHAT API ERROR:",
      error
    );

    return new Response(
      "Server error",
      {
        status: 500,
      }
    );
  }
}