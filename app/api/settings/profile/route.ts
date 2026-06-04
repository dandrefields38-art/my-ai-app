import { requireApiAuth } from "@/lib/security";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const cleanText = (
  value: unknown,
  maxLength: number
) =>
  String(value || "")
    .trim()
    .slice(0, maxLength);

const ensureUserRow = async (
  userId: string,
  email: string | null
) => {
  await supabaseAdmin
    .from("users")
    .upsert(
      {
        id:
          userId,
        email,
      },
      {
        onConflict:
          "id",
      }
    );
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
            "settings-profile-get",
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

  const user =
    auth.user!;

  await ensureUserRow(
    user.id,
    user.email || null
  );

  const { data, error } =
    await supabaseAdmin
      .from("users")
      .select(
        "id,email,display_name,avatar_url"
      )
      .eq("id", user.id)
      .maybeSingle();

  if (error) {
    console.log(
      "PROFILE SETTINGS GET ERROR:",
      JSON.stringify(
        error,
        null,
        2
      )
    );

    return Response.json(
      {
        error:
          "Failed to load profile settings.",
      },
      {
        status: 500,
      }
    );
  }

  return Response.json({
    profile: {
      id:
        user.id,
      email:
        data?.email ||
        user.email ||
        "",
      displayName:
        data?.display_name ||
        "",
      avatarUrl:
        data?.avatar_url ||
        "",
    },
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
            "settings-profile-put",
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
  const displayName =
    cleanText(
      body.displayName,
      120
    );

  const { data, error } =
    await supabaseAdmin
      .from("users")
      .upsert(
        {
          id:
            auth.user!.id,
          email:
            auth.user!.email ||
            null,
          display_name:
            displayName,
        },
        {
          onConflict:
            "id",
        }
      )
      .select(
        "id,email,display_name,avatar_url"
      )
      .single();

  if (error) {
    console.log(
      "PROFILE SETTINGS PUT ERROR:",
      JSON.stringify(
        error,
        null,
        2
      )
    );

    return Response.json(
      {
        error:
          "Failed to save profile settings.",
      },
      {
        status: 500,
      }
    );
  }

  return Response.json({
    profile: {
      id:
        data.id,
      email:
        data.email ||
        auth.user!.email ||
        "",
      displayName:
        data.display_name ||
        "",
      avatarUrl:
        data.avatar_url ||
        "",
    },
  });
}
