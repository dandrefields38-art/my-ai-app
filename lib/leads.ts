export async function getLeads(query: string) {
  try {
    const cleanedQuery = query
      .replace(/find/gi, "")
      .replace(/leads?/gi, "")
      .replace(/lead generation/gi, "")
      .replace(/prospects?/gi, "")
      .replace(/business owners?/gi, "businesses")
      .replace(/company owners?/gi, "companies")
      .trim();

    const searchQuery = `${cleanedQuery} official company website contact`;

    const response = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": process.env.SERPER_API_KEY || "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: searchQuery,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.log("Serper error:", data);
      return [];
    }

    const organic = data.organic || [];

    const blocked = [
      "yelp",
      "facebook",
      "instagram",
      "linkedin",
      "reddit",
      "youtube",
      "wikipedia",
      "homeadvisor",
      "angi",
      "thumbtack",
      "semrush",
      "iambuilders",
      "constructionwire",
      "planhub",
      "activeprospect",
      "lead generation",
      "best",
      "blog",
      "article",
      "directory",
    ];

    const filtered = organic.filter((item: any) => {
      const url = String(item.link || "").toLowerCase();
      const title = String(item.title || "").toLowerCase();
      const snippet = String(item.snippet || "").toLowerCase();

      return !blocked.some(
        (word) =>
          url.includes(word) || title.includes(word) || snippet.includes(word)
      );
    });

    const finalResults = filtered.length ? filtered : organic;

    return finalResults.slice(0, 8).map((item: any) => ({
      name: item.title || "Unknown Company",
      website: item.link || "",
      snippet: item.snippet || "No description.",
    }));
  } catch (err) {
    console.log("LEADS ERROR:", err);
    return [];
  }
}