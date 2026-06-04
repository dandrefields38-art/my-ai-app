import { requireApiAuth } from "@/lib/security";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const defaults = {
  product_updates:
    true,
  billing_emails:
    true,
  lead_alerts:
    true,
  usage_limit_alerts:
    true,
};

const normalizePreferences = (
  value: unknown
) => {
  const incoming =
    value &&
    typeof value === "object"
      ? (value as Record<
          string,
          unknown
        >)
      : {};

  return {
    product_updates:
      typeof incoming
        .product_updates ===
      "boolean"
        ? incoming
            .product_updates
        : defaults
            .product_updates,
    billing_emails:
      typeof incoming
        .billing_emails ===
      "boolean"
        ? incoming
            .billing_emails
        : defaults
            .billing_emails,
    lead_alerts:
      typeof incoming
        .lead_alerts ===
      "boolean"
        ? incoming
            .lead_alerts
        : defaults
            .lead_alerts,
    usage_limit_alerts:
      typeof incoming
        .usage_limit_alerts ===
      "boolean"
        ? incoming
            .usage_limit_alerts
        : defaults
            .usage_limit_alerts,
  };
};

export async function GET(
  req: Request
) {
  const auth =
    await requireApiAuth(
      req,
      {
        rateLimit: {
          key:
            "settings-notifications-get",
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

  const { data, error } =
    await supabaseAdmin
      .from("users")
      .select(
        "notification_preferences"
      )
      .eq(
        "id",
        auth.user!.id
      )
      .maybeSingle();

  if (error) {
    console.log(
      "NOTIFICATION SETTINGS GET ERROR:",
      error
    );

    return Response.json(
      {
        error:
          "Failed to load notification settings.",
      },
      {
        status: 500,
      }
    );
  }

  return Response.json({
    preferences:
      normalizePreferences(
        data
          ?.notification_preferences
      ),
  });
}

export async function PUT(
  req: Request
) {
  const auth =
    await requireApiAuth(
      req,
      {
        rateLimit: {
          key:
            "settings-notifications-put",
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

  const body =
    await req.json();
  const preferences =
    normalizePreferences(
      body.preferences
    );

  const { error } =
    await supabaseAdmin
      .from("users")
      .upsert(
        {
          id:
            auth.user!.id,
          email:
            auth.user!.email ||
            null,
          notification_preferences:
            preferences,
        },
        {
          onConflict:
            "id",
        }
      );

  if (error) {
    console.log(
      "NOTIFICATION SETTINGS PUT ERROR:",
      error
    );

    return Response.json(
      {
        error:
          "Failed to save notification settings.",
      },
      {
        status: 500,
      }
    );
  }

  return Response.json({
    preferences,
  });
}
