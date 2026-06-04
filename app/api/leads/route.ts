import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requireApiAuth } from "@/lib/security";

const normalizeText = (
  value: unknown
) =>
  String(value || "")
    .trim()
    .toLowerCase();

const getDomain = (
  value: unknown
) => {
  try {
    return new URL(
      String(value || "")
    ).hostname.replace(
      /^www\./,
      ""
    );
  } catch {
    return "";
  }
};

const leadKey = (
  lead: any
) =>
  getDomain(
    lead.website
  ) ||
  normalizeText(
    lead.phone
  ) ||
  `${normalizeText(
    lead.name
  )}:${normalizeText(
    lead.address
  )}`;

const formatLeadForInsert = (
  lead: any,
  userId: string
) => ({
  user_id:
    userId,
  name:
    String(
      lead.name ||
        lead.business_name ||
        ""
    ).slice(0, 200),
  industry:
    String(
      lead.industry ||
        "Business"
    ).slice(0, 120),
  contact_name:
    String(
      lead.contact_name || ""
    ).slice(0, 160),
  city:
    String(
      lead.city || ""
    ).slice(0, 120),
  state:
    String(
      lead.state || ""
    ).slice(0, 80),
  location:
    [
      lead.city,
      lead.state,
    ]
      .filter(Boolean)
      .join(", ")
      .slice(0, 200),
  address:
    String(
      lead.address || ""
    ).slice(0, 300),
  phone:
    String(
      lead.phone ||
        lead.phone_number ||
        ""
    ).slice(0, 80),
  email:
    String(
      lead.email || ""
    ).slice(0, 160),
  website:
    String(
      lead.website || ""
    ).slice(0, 300),
  rating:
    String(
      lead.google_rating ||
        lead.rating ||
        "N/A"
    ).slice(0, 40),
  google_rating:
    String(
      lead.google_rating ||
        lead.rating ||
        ""
    ).slice(0, 40),
  review_count:
    Number.isFinite(
      Number(
        lead.review_count
      )
    )
      ? Math.round(
          Number(
            lead.review_count
          )
        )
      : null,
  status:
    String(
      lead.status ||
        "New"
    ).slice(0, 60),
  notes:
    String(
      lead.notes || ""
    ).slice(0, 2000),
  score_reason:
    String(
      lead.score_reason || ""
    ).slice(0, 500),
  lead_score:
    Number.isFinite(
      Number(
        lead.lead_score
      )
    )
      ? Math.round(
          Number(
            lead.lead_score
          )
        )
      : 60,
});

const authOptions = (
  key: string
) => ({
  rateLimit: {
    key,
    limit: 80,
    windowMs:
      60 * 1000,
  },
});

export async function GET(
  req: Request
) {
  const auth =
    await requireApiAuth(
      req,
      authOptions(
        "leads-get"
      )
    );

  if (auth.response) {
    return auth.response;
  }

  const { data, error } =
    await supabaseAdmin
      .from("leads")
      .select("*")
      .eq(
        "user_id",
        auth.user!.id
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        }
      );

  if (error) {
    console.log(
      "LOAD LEADS ERROR:",
      error
    );

    return Response.json(
      {
        error:
          "Failed to load leads",
      },
      {
        status: 500,
      }
    );
  }

  return Response.json({
    leads:
      data || [],
  });
}

export async function POST(
  req: Request
) {
  const auth =
    await requireApiAuth(
      req,
      authOptions(
        "leads-post"
      )
    );

  if (auth.response) {
    return auth.response;
  }

  const body =
    await req.json();
  const incoming =
    Array.isArray(
      body.leads
    )
      ? body.leads
      : body.lead
        ? [
            body.lead,
          ]
        : [];

  if (!incoming.length) {
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

  const { data: existing, error: loadError } =
    await supabaseAdmin
      .from("leads")
      .select(
        "id,name,website,phone,address"
      )
      .eq(
        "user_id",
        auth.user!.id
      )
      .limit(1000);

  if (loadError) {
    console.log(
      "LEAD DUPLICATE CHECK ERROR:",
      loadError
    );

    return Response.json(
      {
        error:
          "Failed to check saved leads",
      },
      {
        status: 500,
      }
    );
  }

  const savedKeys =
    new Set(
      (existing || []).map(
        leadKey
      )
    );
  const nextKeys =
    new Set<string>();

  const uniqueLeads =
    incoming
      .map((lead: any) =>
        formatLeadForInsert(
          lead,
          auth.user!.id
        )
      )
      .filter((lead: any) => {
        const key =
          leadKey(lead);

        if (
          !lead.name ||
          savedKeys.has(key) ||
          nextKeys.has(key)
        ) {
          return false;
        }

        nextKeys.add(key);
        return true;
      });

  if (!uniqueLeads.length) {
    return Response.json({
      success: true,
      inserted: 0,
      duplicates:
        incoming.length,
      leads: [],
    });
  }

  const { data, error } =
    await supabaseAdmin
      .from("leads")
      .insert(
        uniqueLeads
      )
      .select();

  if (error) {
    console.log(
      "SAVE LEADS ERROR:",
      error
    );

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
    inserted:
      data?.length || 0,
    duplicates:
      incoming.length -
      uniqueLeads.length,
    leads:
      data || [],
  });
}

export async function PATCH(
  req: Request
) {
  const auth =
    await requireApiAuth(
      req,
      authOptions(
        "leads-patch"
      )
    );

  if (auth.response) {
    return auth.response;
  }

  const {
    id,
    status,
    notes,
  } = await req.json();

  if (!id) {
    return Response.json(
      {
        error:
          "Lead id required",
      },
      {
        status: 400,
      }
    );
  }

  const updates: Record<
    string,
    string
  > = {};

  if (
    typeof status ===
    "string"
  ) {
    updates.status =
      status.slice(
        0,
        60
      );
  }

  if (
    typeof notes ===
    "string"
  ) {
    updates.notes =
      notes.slice(
        0,
        2000
      );
  }

  const { error } =
    await supabaseAdmin
      .from("leads")
      .update(updates)
      .eq("id", id)
      .eq(
        "user_id",
        auth.user!.id
      );

  if (error) {
    console.log(
      "UPDATE LEAD ERROR:",
      error
    );

    return Response.json(
      {
        error:
          "Failed to update lead",
      },
      {
        status: 500,
      }
    );
  }

  return Response.json({
    success: true,
  });
}

export async function DELETE(
  req: Request
) {
  const auth =
    await requireApiAuth(
      req,
      authOptions(
        "leads-delete"
      )
    );

  if (auth.response) {
    return auth.response;
  }

  const { id } =
    await req.json();

  if (!id) {
    return Response.json(
      {
        error:
          "Lead id required",
      },
      {
        status: 400,
      }
    );
  }

  const { error } =
    await supabaseAdmin
      .from("leads")
      .delete()
      .eq("id", id)
      .eq(
        "user_id",
        auth.user!.id
      );

  if (error) {
    console.log(
      "DELETE LEAD ERROR:",
      error
    );

    return Response.json(
      {
        error:
          "Failed to delete lead",
      },
      {
        status: 500,
      }
    );
  }

  return Response.json({
    success: true,
  });
}
