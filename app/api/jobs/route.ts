import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/security";

export async function POST(req: Request) {
  const auth =
    await requireApiAuth(
      req,
      {
        rateLimit: {
          key:
            "jobs",
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

  const { query, location } = await req.json();

  const jobs = [
    {
      title: "Warehouse Job",
      company: "Amazon",
      location: location || "Your area",
    },
    {
      title: "Store Worker",
      company: "Walmart",
      location: location || "Your area",
    },
  ];

  return NextResponse.json({ jobs });
}
