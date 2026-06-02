import axios from "axios";

export async function webSearch(
  query: string
) {
  try {
    const response =
      await axios.post(
        "https://google.serper.dev/search",
        {
          q: query,
        },
        {
          headers: {
            "X-API-KEY":
              process.env
                .SERPER_API_KEY || "",

            "Content-Type":
              "application/json",
          },
        }
      );

    const organic =
      response.data
        ?.organic || [];

    return organic
      .slice(0, 5)
      .map((item: any) => ({
        title:
          item.title,

        link:
          item.link,

        snippet:
          item.snippet,
      }));
  } catch (err) {
    console.log(
      "WEB SEARCH ERROR:",
      err
    );

    return [];
  }
}