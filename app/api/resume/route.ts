import { extractPdfTextFromBuffer } from "@/lib/pdfText";
import { checkUsageLimit } from "@/lib/usageLimits";
import { requireApiAuth } from "@/lib/security";

export async function POST(
  req: Request
) {
  try {
    const formData =
      await req.formData();

    const file =
      formData.get(
        "file"
      ) as File;

    const userId =
      String(
        formData.get(
          "userId"
        ) ||
          req.headers.get(
            "x-user-id"
          ) ||
          ""
      );

    const auth =
      await requireApiAuth(
        req,
        {
          userId:
            userId || null,
          rateLimit: {
            key:
              "resume",
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
      userId;

    if (!file) {
      return Response.json(
        {
          error:
            "No file uploaded",
        },
        {
          status: 400,
        }
      );
    }

    const usage =
      await checkUsageLimit(
        effectiveUserId,
        "pdfs"
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
	
    const bytes =
      await file.arrayBuffer();

    const buffer =
      Buffer.from(bytes);

    const text =
      await extractPdfTextFromBuffer(
        buffer
      );

    return Response.json({
      text,
    });
  } catch (err) {
    console.log(
      "PDF ERROR:",
      err
    );

    return Response.json(
      {
        error:
          "Failed to parse PDF",
      },
      {
        status: 500,
      }
    );
  }
}
