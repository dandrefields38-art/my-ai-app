import { supabaseAdmin } from "@/lib/supabaseAdmin";

type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type ApiAuthOptions = {
  userId?: string | null;
  rateLimit?: RateLimitOptions;
};

const rateLimitStore =
  new Map<
    string,
    RateLimitEntry
  >();

const getClientIp = (
  req: Request
) =>
  req.headers
    .get(
      "x-forwarded-for"
    )
    ?.split(",")[0]
    ?.trim() ||
  req.headers.get(
    "x-real-ip"
  ) ||
  "unknown";

const getBearerToken = (
  req: Request
) => {
  const authorization =
    req.headers.get(
      "authorization"
    );

  if (
    !authorization?.startsWith(
      "Bearer "
    )
  ) {
    return null;
  }

  return authorization
    .slice(7)
    .trim();
};

export const jsonError = (
  message: string,
  status = 500
) =>
  Response.json(
    {
      error:
        message,
    },
    {
      status,
    }
  );

export const safeErrorMessage = (
  fallback = "Server error."
) =>
  process.env.NODE_ENV ===
  "production"
    ? fallback
    : fallback;

export const checkRateLimit = (
  req: Request,
  options: RateLimitOptions
) => {
  const now =
    Date.now();

  const key =
    `${options.key}:${getClientIp(
      req
    )}`;

  const existing =
    rateLimitStore.get(
      key
    );

  if (
    !existing ||
    existing.resetAt <= now
  ) {
    rateLimitStore.set(
      key,
      {
        count: 1,
        resetAt:
          now +
          options.windowMs,
      }
    );

    return null;
  }

  if (
    existing.count >=
    options.limit
  ) {
    return jsonError(
      "Too many requests. Please wait a moment and try again.",
      429
    );
  }

  existing.count += 1;
  rateLimitStore.set(
    key,
    existing
  );

  return null;
};

export const requireApiAuth =
  async (
    req: Request,
    options: ApiAuthOptions = {}
  ) => {
    if (
      options.rateLimit
    ) {
      const limited =
        checkRateLimit(
          req,
          options.rateLimit
        );

      if (limited) {
        return {
          user: null,
          response:
            limited,
        };
      }
    }

    const token =
      getBearerToken(req);

    if (!token) {
      return {
        user: null,
        response:
          jsonError(
            "Authentication required.",
            401
          ),
      };
    }

    const {
      data,
      error,
    } =
      await supabaseAdmin.auth.getUser(
        token
      );

    if (
      error ||
      !data.user
    ) {
      return {
        user: null,
        response:
          jsonError(
            "Authentication required.",
            401
          ),
      };
    }

    if (
      options.userId &&
      options.userId !==
        data.user.id
    ) {
      return {
        user:
          data.user,
        response:
          jsonError(
            "Authenticated user does not match request user.",
            403
          ),
      };
    }

    return {
      user:
        data.user,
      response:
        null,
    };
  };
