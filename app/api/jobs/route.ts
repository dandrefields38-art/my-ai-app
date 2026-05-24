import axios from "axios";

export async function POST(req: Request) {
  try {
    const { query, location } = await req.json();

    const appId = process.env.ADZUNA_APP_ID;
    const appKey = process.env.ADZUNA_APP_KEY;

    const url = `https://api.adzuna.com/v1/api/jobs/us/search/1`;

    const response = await axios.get(url, {
      params: {
        app_id: appId,
        app_key: appKey,
        results_per_page: 10,
        what: query,
        where: location,
        content-type: "application/json",
      },
    });

    const jobs = response.data.results.map((job: any) => ({
      title: job.title,
      company: job.company?.display_name,
      location: job.location?.display_name,
      salary:
        job.salary_min && job.salary_max
          ? `$${Math.round(job.salary_min).toLocaleString()} - $${Math.round(
              job.salary_max
            ).toLocaleString()}`
          : "Not listed",
      redirect_url: job.redirect_url,
    }));

    return Response.json({ jobs });
  } catch (error) {
    console.log("JOB SEARCH ERROR:", error);

    return Response.json(
      { error: "Failed to fetch jobs" },
      { status: 500 }
    );
  }
}