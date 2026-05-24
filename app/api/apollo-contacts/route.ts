export async function POST(req: Request) {
  try {
    const { domain } = await req.json();

    if (!domain) {
      return Response.json(
        { error: "Domain required" },
        { status: 400 }
      );
    }

    const response = await fetch(
      "https://api.apollo.io/api/v1/mixed_people/search",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
          "X-Api-Key": process.env.APOLLO_API_KEY!,
        },
        body: JSON.stringify({
          q_organization_domains: domain,
          person_titles: [
            "owner",
            "founder",
            "ceo",
            "president",
            "manager",
            "director",
          ],
          page: 1,
          per_page: 5,
        }),
      }
    );

    const data = await response.json();

    const contacts =
      data.people?.map((person: any) => ({
        name: `${person.first_name || ""} ${person.last_name || ""}`.trim(),
        title: person.title || "",
        linkedin: person.linkedin_url || "",
        email: person.email || "",
        city: person.city || "",
        state: person.state || "",
        organization: person.organization?.name || "",
      })) || [];

    return Response.json({ contacts });
  } catch (error) {
    console.log("APOLLO CONTACT ERROR:", error);

    return Response.json(
      { error: "Contact enrichment failed" },
      { status: 500 }
    );
  }
}