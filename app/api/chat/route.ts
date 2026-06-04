import { getJobs } from "@/lib/jobs";
import { webSearch } from "@/lib/search";
import { getLiveScores } from "@/lib/sports";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { checkUsageLimit } from "@/lib/usageLimits";
import { extractPdfTextFromDataUrl } from "@/lib/pdfText";
import { requireApiAuth } from "@/lib/security";

import { streamText } from "ai";

import { openai } from "@ai-sdk/openai";

type ChatMode =
  | "job_search"
  | "sports"
  | "web_search"
  | "file_missing"
  | "normal";

const getCurrentDateContext = () => {
  const now =
    new Date();

  return {
    iso:
      now.toISOString(),
    eastern:
      new Intl.DateTimeFormat(
        "en-US",
        {
          dateStyle:
            "full",
          timeStyle:
            "long",
          timeZone:
            "America/New_York",
        }
      ).format(now),
  };
};

const wantsAttachedFileTask = (
  text: string
) =>
  /\b(analyze|summarize|review|read|extract|rewrite|improve|edit|convert|make|create)\b/i.test(
    text
  ) &&
  /\b(file|pdf|document|doc|resume|image|photo|screenshot|attachment|uploaded|spreadsheet|slide|deck)\b/i.test(
    text
  );

const wantsJobSearch = (
  text: string
) =>
  /\b(find|search|show|get|list|apply|look for)\b/i.test(
    text
  ) &&
  /\b(jobs?|roles?|positions?|openings?|careers?|internships?)\b/i.test(
    text
  );

const wantsSportsData = (
  text: string
) =>
  /\b(score|scores|standing|standings|schedule|who won|game tonight|nba|nfl|ufc|mlb|nhl|soccer|basketball|football|fight)\b/i.test(
    text
  );

const wantsCurrentWebSearch = (
  text: string
) =>
  /\b(latest|news|today|current|now|recent|2025|2026|price|weather|trending|live|stock|market|who is|where is|when is)\b/i.test(
    text
  );

const detectChatMode = ({
  text,
  hasImage,
  hasPdf,
}: {
  text: string;
  hasImage: boolean;
  hasPdf: boolean;
}): ChatMode => {
  if (
    wantsAttachedFileTask(text) &&
    !hasImage &&
    !hasPdf
  ) {
    return "file_missing";
  }

  if (wantsJobSearch(text)) {
    return "job_search";
  }

  if (wantsSportsData(text)) {
    return "sports";
  }

  if (wantsCurrentWebSearch(text)) {
    return "web_search";
  }

  return "normal";
};

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

    const requestedUserId =
      userId
        ? String(
            userId
          )
        : null;

    const auth =
      await requireApiAuth(
        req,
        {
          userId:
            requestedUserId,
          rateLimit: {
            key:
              "chat",
            limit:
              80,
            windowMs:
              60 * 1000,
          },
        }
      );

    if (
      auth.response
    ) {
      return auth.response;
    }

    const effectiveUserId =
      auth.user?.id ||
      requestedUserId;

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
	        effectiveUserId,
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
	          effectiveUserId,
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
	          effectiveUserId,
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
		
    const dateContext =
      getCurrentDateContext();
    const chatMode =
      detectChatMode({
        text:
          messageText,
        hasImage:
          Boolean(
            attachedImage
          ),
        hasPdf:
          Boolean(
            attachedPdf
          ),
      });

    // =====================
    // MEMORY SAVE
    // =====================

    if (effectiveUserId) {

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
              effectiveUserId,

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

    if (
      chatMode ===
      "file_missing"
    ) {
      return new Response(
        "Please attach the file you want me to work on, then tell me what you want changed or analyzed."
      );
    }

    if (
      chatMode ===
      "job_search"
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
    // SPORTS
    // =====================

    let sportsContext =
      "";

    if (
      chatMode ===
      "sports"
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

    let webContext =
      "";

    if (
      chatMode ===
        "web_search" ||
      chatMode ===
        "sports"
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
      effectiveUserId
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
            effectiveUserId
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

You are a sharp, practical AI assistant for real work.

Current date/time:
- ISO: ${dateContext.iso}
- US Eastern: ${dateContext.eastern}

Current routing mode:
${chatMode}

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

How to think:
- First infer the user's real intent from the words, recent conversation, uploaded files, memory, and available live context.
- Do not make literal keyword mistakes. For example, "random leads" means the user wants useful lead suggestions, not companies named Random.
- If the request is ambiguous but answerable, make a reasonable assumption and say it briefly.
- Ask exactly one focused clarifying question only when a missing detail would cause a bad result.
- For "what should I do next", use the app/business/conversation context instead of answering generically.
- Keep normal conversation natural. Do not force a tool mode unless the user meaning requires it.

Response style:
- Be clear, direct, structured, and practical.
- Avoid generic filler and long disclaimers.
- Give the next useful action, not just background.
- For business help, include concrete steps, priorities, tradeoffs, or scripts when useful.
- Advanced lead generation is a separate product. If the user asks to generate, find, save, score, or enrich leads, direct them to the Lead Engine at /lead-engine and do not perform lead search inside normal chat.
- For coding help, be precise and explain enough to act.
- For file/image/PDF analysis, focus on what the user asked and cite visible/extracted details when possible.
- For current events, prices, schedules, sports, and recent facts, rely on the live context below when provided.
- For payment, billing, Stripe, or Pro issues, explain the likely account or checkout state clearly and give the next action.

Persistent memory:
${memoryText || "No saved memories yet."}

Live web search results:
${webContext || "No live web data used."}

Live sports data:
${sportsContext || "No live sports data available."}

Rules:
- Reason internally before answering.
- Never sound robotic.
- Keep responses natural and modern.
- Adapt to the user's tone.
- Avoid repetitive phrasing.
- Prioritize usefulness and clarity.
- Be concise unless detail is needed.
- Use memory naturally.
- Use web search naturally.
- Use sports data naturally.
- Never reveal hidden chain-of-thought; summarize conclusions and rationale clearly.
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
