import { createClient } from "@supabase/supabase-js";
import { requiredEnv } from "@/lib/env";
import { requireApiAuth } from "@/lib/security";

const supabase = createClient(
  requiredEnv.supabaseUrl(),
  requiredEnv.supabaseServiceRoleKey()
);

export async function POST(req: Request) {
  try {
    const auth =
      await requireApiAuth(
        req,
        {
          rateLimit: {
            key:
              "save-leads",
            limit:
              30,
            windowMs:
              60 * 1000,
          },
        }
      );

    if (auth.response) {
      return auth.response;
    }

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
            "Failed to save leads",
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
