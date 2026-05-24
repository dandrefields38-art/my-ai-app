export async function getLeads(
  query: string
) {
  try {
    const res = await fetch(
      "https://google.serper.dev/search",
      {
        method: "POST",

        headers: {
          "X-API-KEY":
            process.env
              .SERPER_API_KEY || "",

          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          q: query,
        }),
      }
    );

    const data =
      await res.json();

    console.log(data);

    const results =
      data.organic || [];

    return results
      .slice(0, 10)
      .map((item: any) => ({
        name:
          item.title ||
          "Unknown Business",

        website:
          item.link ||
          "No Website",

        snippet:
          item.snippet ||
          "No description available",
      }));
  } catch (err) {
    console.log(
      "LEADS ERROR:",
      err
    );

    return [];
  }
}