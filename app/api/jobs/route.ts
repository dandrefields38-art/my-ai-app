import { NextResponse } from "next/server";

export async function POST(req: Request) {
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