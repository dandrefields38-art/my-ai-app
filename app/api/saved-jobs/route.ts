import { createClient } from "@supabase/supabase-js";
import { requiredEnv } from "@/lib/env";
import { requireApiAuth } from "@/lib/security";

const supabase = createClient(
  requiredEnv.supabaseUrl(),
  requiredEnv.supabaseServiceRoleKey()
);

export async function GET(req: Request) {
  const auth =
    await requireApiAuth(
      req,
      {
        rateLimit: {
          key:
            "saved-jobs-get",
          limit:
            60,
          windowMs:
            60 * 1000,
        },
      }
    );

  if (auth.response) {
    return auth.response;
  }

  const userId =
    auth.user!.id;

  const { data, error } = await supabase
    .from("saved_jobs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    return Response.json({ error: "Failed to load saved jobs" }, { status: 500 });
  }

  return Response.json({ jobs: data });
}

export async function POST(req: Request) {
  const auth =
    await requireApiAuth(
      req,
      {
        rateLimit: {
          key:
            "saved-jobs-post",
          limit:
            60,
          windowMs:
            60 * 1000,
        },
      }
    );

  if (auth.response) {
    return auth.response;
  }

  const userId =
    auth.user!.id;

  const job = await req.json();

  const { error } = await supabase.from("saved_jobs").insert([
    {
      user_id: userId,
      title: job.title,
      company: job.company,
      location: job.location,
      salary: job.salary,
      redirect_url: job.redirect_url,
      status: "Saved",
    },
  ]);

  if (error) {
    return Response.json({ error: "Failed to save job" }, { status: 500 });
  }

  return Response.json({ success: true });
}

export async function PATCH(req: Request) {
  const auth =
    await requireApiAuth(
      req,
      {
        rateLimit: {
          key:
            "saved-jobs-patch",
          limit:
            60,
          windowMs:
            60 * 1000,
        },
      }
    );

  if (auth.response) {
    return auth.response;
  }

  const userId =
    auth.user!.id;

  const { id, status } = await req.json();

  const { error } = await supabase
    .from("saved_jobs")
    .update({ status })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    return Response.json({ error: "Failed to update job" }, { status: 500 });
  }

  return Response.json({ success: true });
}
