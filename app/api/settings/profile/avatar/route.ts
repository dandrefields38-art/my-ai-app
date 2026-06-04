import { requireApiAuth } from "@/lib/security";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const bucketName =
  "avatars";
const maxImageBytes =
  5 * 1024 * 1024;
const allowedTypes =
  new Map([
    [
      "image/jpeg",
      "jpg",
    ],
    [
      "image/png",
      "png",
    ],
    [
      "image/webp",
      "webp",
    ],
    [
      "image/gif",
      "gif",
    ],
  ]);

const ensureBucket =
  async () => {
    const { data } =
      await supabaseAdmin
        .storage
        .getBucket(
          bucketName
        );

    if (data) {
      return;
    }

    const { error } =
      await supabaseAdmin
        .storage
        .createBucket(
          bucketName,
          {
            public:
              true,
            fileSizeLimit:
              maxImageBytes,
            allowedMimeTypes:
              Array.from(
                allowedTypes.keys()
              ),
          }
        );

    if (error) {
      throw error;
    }
  };

export async function POST(
  req: Request
) {
  const auth =
    await requireApiAuth(
      req,
      {
        rateLimit: {
          key:
            "settings-profile-avatar",
          limit:
            20,
          windowMs:
            60 * 1000,
        },
      }
    );

  if (auth.response) {
    return auth.response;
  }

  try {
    const formData =
      await req.formData();
    const file =
      formData.get(
        "avatar"
      );

    if (
      !(file instanceof File)
    ) {
      return Response.json(
        {
          error:
            "Profile picture is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      file.size >
      maxImageBytes
    ) {
      return Response.json(
        {
          error:
            "Profile picture must be 5MB or smaller.",
        },
        {
          status: 400,
        }
      );
    }

    const extension =
      allowedTypes.get(
        file.type
      );

    if (!extension) {
      return Response.json(
        {
          error:
            "Upload a JPG, PNG, WebP, or GIF image.",
        },
        {
          status: 400,
        }
      );
    }

    await ensureBucket();

    const bytes =
      await file.arrayBuffer();
    const path =
      `${auth.user!.id}/profile/avatar-${Date.now()}.${extension}`;
    const { error } =
      await supabaseAdmin
        .storage
        .from(bucketName)
        .upload(
          path,
          bytes,
          {
            contentType:
              file.type,
            upsert:
              true,
          }
        );

    if (error) {
      throw error;
    }

    const {
      data: {
        publicUrl,
      },
    } =
      supabaseAdmin
        .storage
        .from(bucketName)
        .getPublicUrl(path);

    const {
      data: profile,
      error: updateError,
    } =
      await supabaseAdmin
        .from("users")
        .upsert(
          {
            id:
              auth.user!.id,
            email:
              auth.user!.email ||
              null,
            avatar_url:
              publicUrl,
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

    if (updateError) {
      throw updateError;
    }

    return Response.json({
      profile: {
        id:
          profile.id,
        email:
          profile.email ||
          auth.user!.email ||
          "",
        displayName:
          profile.display_name ||
          "",
        avatarUrl:
          profile.avatar_url ||
          "",
      },
    });
  } catch (error) {
    console.log(
      "PROFILE AVATAR UPLOAD ERROR:",
      JSON.stringify(
        error,
        null,
        2
      )
    );

    return Response.json(
      {
        error:
          "Failed to upload profile picture.",
      },
      {
        status: 500,
      }
    );
  }
}
