import { getJobs } from "@/lib/jobs";
import { getLeads } from "@/lib/leads";
import { webSearch } from "@/lib/search";
import { getLiveScores } from "@/lib/sports";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { checkUsageLimit } from "@/lib/usageLimits";
import { extractPdfTextFromDataUrl } from "@/lib/pdfText";

import { streamText } from "ai";

import { openai } from "@ai-sdk/openai";

const getStoredMessageText = (
  content: unknown
) => {
  const raw =
    String(content || "");

  try {
    const parsed =
      JSON.parse(raw);

    if (
      parsed &&
      Array.isArray(
        parsed.attachments
      )
    ) {
      const text =
        typeof parsed.text ===
        "string"
          ? parsed.text
          : "";

      const imageCount =
        parsed.attachments.filter(
          (
            attachment: any
          ) =>
            attachment?.type ===
            "image"
        ).length;

      const pdfCount =
        parsed.attachments.filter(
          (
            attachment: any
          ) =>
            attachment?.type ===
            "pdf"
        ).length;

      return [
        text,
        imageCount > 0
          ? `[${imageCount} image attachment${
              imageCount === 1
                ? ""
                : "s"
            }]`
          : "",
        pdfCount > 0
          ? `[${pdfCount} PDF attachment${
              pdfCount === 1
                ? ""
                : "s"
            }]`
          : "",
      ]
        .filter(Boolean)
        .join("\n");
    }
  } catch {
  }

  return raw;
};

export async function POST(
  req: Request
) {
  try {

	    const {
	      message,
		      messages,
		      userId,
		      image,
		      pdf,
		    } = await req.json();

	    const attachedImage =
	      image?.dataUrl &&
	      image?.mediaType
	        ? {
	            dataUrl:
	              String(
	                image.dataUrl
	              ),
	            mediaType:
	              String(
	                image.mediaType
	              ),
	            name:
	              image.name
	                ? String(
	                    image.name
	                  )
	                : "Attached image",
	          }
	        : null;

	    const attachedPdf =
	      pdf?.dataUrl &&
	      pdf?.mediaType
	        ? {
	            dataUrl:
	              String(
	                pdf.dataUrl
	              ),
	            mediaType:
	              String(
	                pdf.mediaType
	              ),
	            name:
	              pdf.name
	                ? String(
	                    pdf.name
	                  )
	                : "Attached PDF",
	          }
	        : null;

			    if (
			      !message &&
			      !attachedImage &&
			      !attachedPdf
			    ) {

	      return new Response(
	        "No message provided.",
        {
          status: 400,
        }
      );
	    }

    const messageText =
      String(
        message || ""
      );

	    const usage =
	      await checkUsageLimit(
	        userId,
	        "messages"
	      );

	    if (!usage.allowed) {
	
	      return new Response(
	        usage.message,
	        {
	          status:
	            usage.status,
	        }
	      );
	    }

		    if (attachedImage) {
	      const imageUsage =
	        await checkUsageLimit(
	          userId,
	          "images"
	        );

	      if (!imageUsage.allowed) {
	        return new Response(
	          imageUsage.message,
	          {
	            status:
	              imageUsage.status,
	          }
	        );
		      }
		    }

	    let pdfText =
	      "";

	    if (attachedPdf) {
	      const pdfUsage =
	        await checkUsageLimit(
	          userId,
	          "pdfs"
	        );

	      if (!pdfUsage.allowed) {
	        return new Response(
	          pdfUsage.message,
	          {
	            status:
	              pdfUsage.status,
	          }
	        );
	      }

      try {
        pdfText =
          await extractPdfTextFromDataUrl(
            attachedPdf.dataUrl
          );
      } catch (err) {
        console.log(
          "PDF PARSE ERROR:",
          err
        );

        return new Response(
          "I couldn't read that PDF. Please try a different PDF or export it as a text-based PDF.",
          {
            status: 400,
          }
        );
      }
	    }
		
	    const text =
      messageText.toLowerCase();

    // =====================
    // MEMORY SAVE
    // =====================

    if (userId) {

      const rememberMatch =
        messageText.match(
          /remember(?: that)? (.+)/i
        ) ||
        messageText.match(
          /my (.+?) is (.+)/i
        );

      if (
        rememberMatch
      ) {

        const memoryText =
          rememberMatch[1]
            ? rememberMatch[0].replace(
                /^remember(?: that)? /i,
                ""
              )
            : messageText;

        await supabaseAdmin
          .from(
            "memories"
          )
          .insert({
            user_id:
              userId,

            content:
              memoryText.slice(
                0,
                500
              ),
          });
      }
    }

    // =====================
    // JOBS
    // =====================

    const wantsJobs =
      /\b(job|jobs|hiring|career|careers|remote jobs?)\b/i.test(
        text
      );

    if (
      wantsJobs
    ) {

      const jobs =
        await getJobs(
          messageText
        );

      if (
        !jobs.length
      ) {

        return new Response(
          "No jobs found."
        );
      }

      const formattedJobs =
        jobs
          .slice(
            0,
            6
          )
          .map(
            (
              job: any,
              index: number
            ) => `
## ${index + 1}. ${job.title}

🏢 ${job.company}

📍 ${job.location}

🔗 ${job.url}
`
          )
          .join(
            "\n\n---\n\n"
          );

      return new Response(
        formattedJobs
      );
    }

    // =====================
    // LEADS
    // =====================

    const wantsLeads =
      /\b(leads|find companies|find businesses|contractors|businesses in|companies in)\b/i.test(
        text
      );

    if (
      wantsLeads
    ) {

      const leads =
        await getLeads(
          messageText
        );

      if (
        !leads.length
      ) {

        return new Response(
          "No leads found."
        );
      }

      const formatted =
        leads
          .slice(
            0,
            6
          )
          .map(
            (
              lead: any,
              index: number
            ) => `
## ${index + 1}. ${lead.name}

🌐 ${lead.website}

📝 ${String(
  lead.snippet
).slice(0, 250)}
`
          )
          .join(
            "\n\n---\n\n"
          );

      return new Response(
        formatted
      );
    }

    // =====================
    // SPORTS
    // =====================

    const wantsSports =
      /\b(score|scores|nba|nfl|ufc|mlb|soccer|basketball|football|sports|fight|game tonight|who won)\b/i.test(
        text
      );

    let sportsContext =
      "";

    if (
      wantsSports
    ) {

      const scores =
        await getLiveScores();

      if (
        scores &&
        scores.length > 0
      ) {

        sportsContext =
          scores
            .slice(
              0,
              5
            )
            .map(
              (
                game: any
              ) => `
${game.strHomeTeam} ${game.intHomeScore}
vs
${game.strAwayTeam} ${game.intAwayScore}
Status: ${game.strStatus}
`
            )
            .join(
              "\n"
            );
      }
    }

    // =====================
    // WEB SEARCH
    // =====================

    const wantsWebSearch =
      /\b(latest|news|today|current|2025|2026|who is|price|weather|trending|live|stock|celebrity|tiktok|sports|fight|game|drake)\b/i.test(
        text
      );

    let webContext =
      "";

    if (
      wantsWebSearch
    ) {

      const results =
        await webSearch(
          messageText
        );

      webContext =
        results
          .slice(
            0,
            3
          )
          .map(
            (
              r: any
            ) => `
Title:
${String(
  r.title
).slice(
  0,
  120
)}

Snippet:
${String(
  r.snippet
).slice(
  0,
  300
)}
`
          )
          .join(
            "\n\n"
          );
    }

    // =====================
    // LOAD MEMORY
    // =====================

    let memoryText =
      "";

    if (
      userId
    ) {

      const {
        data: memories,
      } =
        await supabaseAdmin
          .from(
            "memories"
          )
          .select(
            "content"
          )
          .eq(
            "user_id",
            userId
          )
          .order(
            "created_at",
            {
              ascending:
                false,
            }
          )
          .limit(10);

      memoryText =
        memories
          ?.map(
            (
              m
            ) =>
              `- ${String(
                m.content
              ).slice(
                0,
                200
              )}`
          )
          .join(
            "\n"
          ) || "";
    }

    // =====================
    // MESSAGE TRIMMING
    // =====================

    const recentMessages =
      (messages || [])
        .slice(-8)
        .map(
          (
            m: any
          ) => ({
            role:
              m.role,

	            content:
	              getStoredMessageText(
	                m.content
	              ).slice(
	                0,
	                1200
	              ),
          })
        );

    // =====================
    // AI STREAM
    // =====================

	    const promptText =
	      [
	        String(
	          messageText
	        ).trim(),
	        pdfText
	          ? `PDF attachment (${attachedPdf?.name || "uploaded.pdf"}) contents:\n${pdfText.slice(
	              0,
	              12000
	            )}`
	          : "",
	      ]
	        .filter(Boolean)
	        .join("\n\n");

	    const userContent =
	      attachedImage
	        ? [
	            {
	              type:
	                "text" as const,
			              text:
			                (
			                  promptText ||
			                  "Please analyze this image."
			                ).slice(
			                  0,
			                  14000
			                ),
	            },
	            {
	              type:
	                "image" as const,
	              image:
	                attachedImage.dataUrl.replace(
	                  /^data:[^;]+;base64,/,
	                  ""
	                ),
	              mediaType:
	                attachedImage.mediaType,
	            },
	          ]
	        : String(
	            promptText ||
	            "Please analyze the attached PDF."
	          ).slice(
	            0,
	            14000
	          );

	    const result =
	      await streamText({

        model:
          openai(
            "gpt-4.1"
          ),

        temperature:
          0.7,

        maxOutputTokens:
          350,

        system: `
You are Inquire AI.

A premium elite-level AI assistant.

You are:
- highly intelligent
- conversational
- emotionally aware
- modern
- fast
- confident
- helpful

You specialize in:
- coding
- startups
- business
- marketing
- finance
- sports
- AI
- social media
- internet culture
- productivity
- psychology
- celebrities
- research
- technology
- everyday life

Persistent memory:
${memoryText || "No saved memories yet."}

Live web search results:
${webContext || "No live web data used."}

Live sports data:
${sportsContext || "No live sports data available."}

Rules:
- Never sound robotic.
- Keep responses natural and modern.
- Adapt to the user's tone.
- Avoid repetitive phrasing.
- Think step-by-step internally before answering.
- Prioritize usefulness and clarity.
- Be concise unless detail is needed.
- Use memory naturally.
- Use web search naturally.
- Use sports data naturally.
- Speak like a world-class AI assistant.
`,

        messages: [
          ...recentMessages,

	          {
	            role:
	              "user",
	
	            content:
	              userContent,
	          },
	        ],
	      });

    return result.toTextStreamResponse();

  } catch (err) {

    console.log(
      "CHAT ERROR:",
      err
    );

    return new Response(
      "Server error.",
      {
        status: 500,
      }
    );
  }
}
