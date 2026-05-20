type Job = {
  title: string;
  company: string;
  location: string;
  url: string;
  source: "api" | "ai";
};

// ---------------------------
// 1. REAL JOB API (Adzuna FREE fallback-ready)
// ---------------------------
export async function fetchRealJobs(query: string) {
  try {
    const appId = process.env.ADZUNA_APP_ID;
    const appKey = process.env.ADZUNA_APP_KEY;

    if (!appId || !appKey) return [];

    const res = await fetch(
      `https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=${appId}&app_key=${appKey}&results_per_page=5&what=${query}&content-type=application/json`
    );

    const data = await res.json();

    return (
      data.results?.map((job: any) => ({
        title: job.title,
        company: job.company?.display_name,
        location: job.location?.display_name,
        url: job.redirect_url,
        source: "api",
      })) || []
    );
  } catch (err) {
    console.log("Job API error:", err);
    return [];
  }
}

// ---------------------------
// 2. AI FALLBACK JOBS (when API fails)
// ---------------------------
export function generateAIJobs(query: string): Job[] {
  return [
    {
      title: `Entry Level ${query} Role`,
      company: "Local Business",
      location: "Near You",
      url: "#",
      source: "ai",
    },
    {
      title: `Remote ${query} Position`,
      company: "Startup Company",
      location: "Remote",
      url: "#",
      source: "ai",
    },
    {
      title: `Junior ${query} Assistant`,
      company: "Hiring Now Inc",
      location: "Hybrid",
      url: "#",
      source: "ai",
    },
  ];
}

// ---------------------------
// 3. MAIN HYBRID FUNCTION
// ---------------------------
export async function getJobs(query: string) {
  const realJobs = await fetchRealJobs(query);

  if (realJobs.length > 0) {
    return realJobs;
  }

  return generateAIJobs(query);
}