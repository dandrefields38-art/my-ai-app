import {
  NextResponse,
  type NextRequest,
} from "next/server";

const protectedApiPaths =
  [
    "/api/apollo-contacts",
    "/api/apollo-enrich",
    "/api/billing",
    "/api/chat",
    "/api/checkout",
    "/api/cover-letter",
    "/api/images",
    "/api/jobs",
    "/api/lead-engine",
    "/api/resume",
    "/api/save-leads",
    "/api/saved-jobs",
    "/api/settings",
    "/api/stripe/checkout",
    "/api/stripe/customer-portal",
    "/api/stripe/lead-engine-checkout",
  ];

const addSecurityHeaders = (
  response: NextResponse
) => {
  response.headers.set(
    "X-Content-Type-Options",
    "nosniff"
  );
  response.headers.set(
    "Referrer-Policy",
    "strict-origin-when-cross-origin"
  );
  response.headers.set(
    "X-Frame-Options",
    "DENY"
  );
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(self), geolocation=()"
  );

  return response;
};

export function proxy(
  req: NextRequest
) {
  const pathname =
    req.nextUrl.pathname;

  const isProtectedApi =
    protectedApiPaths.some(
      (
        path
      ) =>
        pathname === path ||
        pathname.startsWith(
          `${path}/`
        )
    );

  if (
    isProtectedApi &&
    !req.headers
      .get("authorization")
      ?.startsWith("Bearer ")
  ) {
    return addSecurityHeaders(
      NextResponse.json(
        {
          error:
            "Authentication required.",
        },
        {
          status: 401,
        }
      )
    );
  }

  return addSecurityHeaders(
    NextResponse.next()
  );
}

export const config = {
  matcher: [
    "/api/:path*",
    "/chat/:path*",
    "/login/:path*",
  ],
};
