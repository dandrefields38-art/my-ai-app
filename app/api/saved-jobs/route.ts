import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const { data, error } = await supabase
    .from("saved_jobs")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ jobs: data });
}

export async function POST(req: Request) {
  const job = await req.json();

  const { error } = await supabase.from("saved_jobs").insert([
    {
      title: job.title,
      company: job.company,
      location: job.location,
      salary: job.salary,
      redirect_url: job.redirect_url,
      status: "Saved",
    },
  ]);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}

export async function PATCH(req: Request) {
  const { id, status } = await req.json();

  const { error } = await supabase
    .from("saved_jobs")
    .update({ status })
    .eq("id", id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}