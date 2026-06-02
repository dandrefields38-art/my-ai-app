import { isPro } from "@/lib/plan";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type UsageKind =
  | "messages"
  | "images"
  | "pdfs";

type UsageLimitRow = {
  id: string;
  user_id: string;
  message_count: number | null;
  image_count: number | null;
  pdf_count: number | null;
  message_reset: string | null;
  media_reset: string | null;
};

const MESSAGE_LIMIT =
  150;

const IMAGE_LIMIT =
  4;

const PDF_LIMIT =
  2;

const MESSAGE_WINDOW_MS =
  6 * 60 * 60 * 1000;

const MEDIA_WINDOW_MS =
  12 * 60 * 60 * 1000;

const getNextReset = (
  windowMs: number
) =>
  new Date(
    Date.now() + windowMs
  ).toISOString();

const formatWaitTime = (
  resetAt: string
) => {
  const remainingMs =
    new Date(resetAt).getTime() -
    Date.now();

  const minutes =
    Math.max(
      1,
      Math.ceil(
        remainingMs /
          60 /
          1000
      )
    );

  if (minutes >= 60) {
    const hours =
      Math.ceil(
        minutes / 60
      );

    return `${hours} hour${
      hours === 1 ? "" : "s"
    }`;
  }

  return `${minutes} minute${
    minutes === 1 ? "" : "s"
  }`;
};

const getLimitMessage = (
  kind: UsageKind,
  resetAt: string
) => {
  if (kind === "messages") {
    return `You've reached the free plan limit of ${MESSAGE_LIMIT} messages. Please try again in ${formatWaitTime(
      resetAt
    )}, or upgrade to Pro for unlimited messages.`;
  }

  if (kind === "images") {
    return `You've reached the free plan limit of ${IMAGE_LIMIT} image uploads. Please try again in ${formatWaitTime(
      resetAt
    )}, or upgrade to Pro for unlimited images.`;
  }

  return `You've reached the free plan limit of ${PDF_LIMIT} PDF uploads. Please try again in ${formatWaitTime(
    resetAt
  )}, or upgrade to Pro for unlimited PDFs.`;
};

const getUserPlan = async (
  userId: string
) => {
  const { data } =
    await supabaseAdmin
      .from("users")
      .select("plan")
      .eq(
        "id",
        userId
      )
      .maybeSingle();

  return data?.plan as
    | string
    | null
    | undefined;
};

const createUsageRow = async (
  userId: string
) => {
  const messageReset =
    getNextReset(
      MESSAGE_WINDOW_MS
    );

  const mediaReset =
    getNextReset(
      MEDIA_WINDOW_MS
    );

  const { data, error } =
    await supabaseAdmin
      .from("usage_limits")
      .insert({
        user_id:
          userId,
        message_count:
          0,
        image_count:
          0,
        pdf_count:
          0,
        message_reset:
          messageReset,
        media_reset:
          mediaReset,
      })
      .select(
        "id,user_id,message_count,image_count,pdf_count,message_reset,media_reset"
      )
      .single();

  if (error) {
    throw error;
  }

  return data as UsageLimitRow;
};

const getUsageRow = async (
  userId: string
) => {
  const { data, error } =
    await supabaseAdmin
      .from("usage_limits")
      .select(
        "id,user_id,message_count,image_count,pdf_count,message_reset,media_reset"
      )
      .eq(
        "user_id",
        userId
      )
      .maybeSingle();

  if (error) {
    throw error;
  }

  if (data) {
    return data as UsageLimitRow;
  }

  return createUsageRow(
    userId
  );
};

const checkMessageLimit = async (
  row: UsageLimitRow
) => {
  const now =
    Date.now();

  const currentReset =
    row.message_reset ||
    getNextReset(
      MESSAGE_WINDOW_MS
    );

  const shouldReset =
    !row.message_reset ||
    new Date(
      currentReset
    ).getTime() <= now;

  const resetAt =
    shouldReset
      ? getNextReset(
          MESSAGE_WINDOW_MS
        )
      : currentReset;

  const count =
    shouldReset
      ? 0
      : Number(
          row.message_count || 0
        );

  if (count >= MESSAGE_LIMIT) {
    return {
      allowed:
        false,
      status:
        429,
      message:
        getLimitMessage(
          "messages",
          resetAt
        ),
    };
  }

  const { error } =
    await supabaseAdmin
      .from("usage_limits")
      .update({
        message_count:
          count + 1,
        message_reset:
          resetAt,
      })
      .eq(
        "id",
        row.id
      );

  if (error) {
    throw error;
  }

  return {
    allowed:
      true,
    status:
      200,
  };
};

const checkMediaLimit = async (
  row: UsageLimitRow,
  kind: Exclude<
    UsageKind,
    "messages"
  >
) => {
  const now =
    Date.now();

  const currentReset =
    row.media_reset ||
    getNextReset(
      MEDIA_WINDOW_MS
    );

  const shouldReset =
    !row.media_reset ||
    new Date(
      currentReset
    ).getTime() <= now;

  const resetAt =
    shouldReset
      ? getNextReset(
          MEDIA_WINDOW_MS
        )
      : currentReset;

  const imageCount =
    shouldReset
      ? 0
      : Number(
          row.image_count || 0
        );

  const pdfCount =
    shouldReset
      ? 0
      : Number(
          row.pdf_count || 0
        );

  const currentCount =
    kind === "images"
      ? imageCount
      : pdfCount;

  const limit =
    kind === "images"
      ? IMAGE_LIMIT
      : PDF_LIMIT;

  if (currentCount >= limit) {
    return {
      allowed:
        false,
      status:
        429,
      message:
        getLimitMessage(
          kind,
          resetAt
        ),
    };
  }

  const { error } =
    await supabaseAdmin
      .from("usage_limits")
      .update({
        image_count:
          kind === "images"
            ? imageCount + 1
            : imageCount,
        pdf_count:
          kind === "pdfs"
            ? pdfCount + 1
            : pdfCount,
        media_reset:
          resetAt,
      })
      .eq(
        "id",
        row.id
      );

  if (error) {
    throw error;
  }

  return {
    allowed:
      true,
    status:
      200,
  };
};

export const checkUsageLimit =
  async (
    userId: string | null | undefined,
    kind: UsageKind
  ) => {
    if (!userId) {
      return {
        allowed:
          false,
        status:
          401,
        message:
          "Please log in to continue.",
      };
    }

    const plan =
      await getUserPlan(userId);

    if (isPro(plan)) {
      return {
        allowed:
          true,
        status:
          200,
      };
    }

    try {
      const row =
        await getUsageRow(
          userId
        );

      if (kind === "messages") {
        return checkMessageLimit(
          row
        );
      }

      return checkMediaLimit(
        row,
        kind
      );
    } catch (err) {
      console.log(
        "USAGE LIMIT ERROR:",
        err
      );

      return {
        allowed:
          false,
        status:
          500,
        message:
          "Usage limits are temporarily unavailable. Please try again soon.",
      };
    }
  };
