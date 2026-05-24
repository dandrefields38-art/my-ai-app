export async function POST(req: Request) {
  try {
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
              process.env.APOLLO_API_KEY!,
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