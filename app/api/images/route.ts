import OpenAI from "openai";
import { checkUsageLimit } from "@/lib/usageLimits";
import { requiredEnv } from "@/lib/env";
import { requireApiAuth } from "@/lib/security";

const openai = new OpenAI({
  apiKey:
    requiredEnv.openaiApiKey(),
});

export async function POST(
  req: Request
) {
  try {
    const {
      prompt,
      userId,
    } =
      await req.json();

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
              "images",
            limit:
              20,
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

    if (!prompt) {
      return Response.json(
        {
          error:
            "Missing prompt",
        },
        {
          status: 400,
        }
      );
    }

    const usage =
      await checkUsageLimit(
        effectiveUserId,
        "images"
      );

    if (!usage.allowed) {
      return Response.json(
        {
          error:
            usage.message,
        },
        {
          status:
            usage.status,
        }
      );
    }
	
    const result =
      await openai.images.generate(
        {
          model:
            "gpt-image-1",

          prompt,

          size:
            "1024x1024",
        }
      );

    const imageBase64 =
      result.data?.[0]
        ?.b64_json;

    if (!imageBase64) {
      return Response.json(
        {
          error:
            "No image returned",
        },
        {
          status: 500,
        }
      );
    }

    return Response.json({
      imageUrl: `data:image/png;base64,${imageBase64}`,
    });
  } catch (err) {
    console.log(
      "IMAGE ERROR:",
      err
    );

    return Response.json(
      {
        error:
          "Image generation failed.",
      },
      {
        status: 500,
      }
    );
  }
}
