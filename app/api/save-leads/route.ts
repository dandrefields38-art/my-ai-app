import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { leads } =
      await req.json();

    if (!leads || !Array.isArray(leads)) {
      return Response.json(
        {
          error:
            "Invalid leads data",
        },
        {
          status: 400,
        }
      );
    }

    const formattedLeads =
      leads.map(
        (lead: any) => ({
          name:
            lead.name ||
            "",

          industry:
            lead.industry ||
            "Business",

          location:
            lead.location ||
            "",

          address:
            lead.address ||
            "",

          phone:
            lead.phone ||
            "",

          email:
            lead.email ||
            "",

          website:
            lead.website ||
            "",

          rating:
            String(
              lead.rating ||
                "N/A"
            ),

          status: "New",

          notes: "",

          lead_score:
            Math.floor(
              Math.random() *
                40
            ) + 60,
        })
      );

    const { data, error } =
      await supabase
        .from("leads")
        .insert(
          formattedLeads
        )
        .select();

    if (error) {
      console.log(error);

      return Response.json(
        {
          error:
            error.message,
        },
        {
          status: 500,
        }
      );
    }

    return Response.json({
      success: true,
      leads: data,
    });
  } catch (error) {
    console.log(
      "SAVE LEADS ERROR:",
      error
    );

    return Response.json(
      {
        error:
          "Server error",
      },
      {
        status: 500,
      }
    );
  }
}