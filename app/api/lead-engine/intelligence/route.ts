import {
  getBillingStatus,
} from "@/lib/billing";
import { requireApiAuth } from "@/lib/security";

export async function GET(
  req: Request
) {
  const auth =
    await requireApiAuth(
      req,
      {
        rateLimit: {
          key:
            "lead-intelligence",
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

  const billing =
    await getBillingStatus(
      auth.user!.id
    );

  if (
    !billing.hasLeadEnginePro
  ) {
    return Response.json(
      {
        error:
          "Lead Intelligence requires Lead Engine Pro.",
        requiredPlan:
          "lead_engine_pro",
        checkoutPath:
          "/api/stripe/lead-engine-checkout",
      },
      {
        status: 403,
      }
    );
  }

  return Response.json({
    ok:
      true,
    message:
      "Lead Intelligence is active.",
    billing,
  });
}
