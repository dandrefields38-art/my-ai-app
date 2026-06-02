import { requiredEnv } from "@/lib/env";
import { requireApiAuth } from "@/lib/security";

export async function POST(req: Request) {
  try {
    const auth =
      await requireApiAuth(
        req,
        {
          rateLimit: {
            key:
              "apollo-enrich",
            limit:
              30,
            windowMs:
              60 * 1000,
          },
        }
      );

    if (auth.response) {
      return auth.response;
    }

    const { domain } =
      await req.json();

    if (!domain) {
      return Response.json(
        {
          error:
            "Domain required",
        },
        {
          status: 400,
        }
      );
    }

    const response =
      await fetch(
        "https://api.apollo.io/api/v1/organizations/enrich",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            "Cache-Control":
              "no-cache",

            "X-Api-Key":
              requiredEnv.apolloApiKey(),
          },

          body: JSON.stringify(
            {
              domain,
            }
          ),
        }
      );

    const data =
      await response.json();

    return Response.json(
      data
    );
  } catch (error) {
    console.log(
      "APOLLO ENRICH ERROR:",
      error
    );

    return Response.json(
      {
        error:
          "Enrichment failed",
      },
      {
        status: 500,
      }
    );
  }
}
