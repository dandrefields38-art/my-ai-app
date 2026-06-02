import OpenAI from "openai";
import { checkUsageLimit } from "@/lib/usageLimits";

const openai = new OpenAI({
  apiKey:
    process.env.OPENAI_API_KEY!,
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
        userId,
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
