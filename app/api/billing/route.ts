import {
  getBillingStatus,
  getLeadEngineEntitlements,
  getProAiEntitlements,
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
            "billing-status",
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

  try {
    const billing =
      await getBillingStatus(
        auth.user!.id
      );

    return Response.json({
      billing,
      entitlements: {
        proAi:
          getProAiEntitlements(
            billing
          ),
        leadEngine:
          getLeadEngineEntitlements(
            billing
          ),
      },
    });
  } catch (error) {
    console.log(
      "BILLING STATUS ERROR:",
      error
    );

    return Response.json(
      {
        error:
          "Failed to load billing status.",
      },
      {
        status: 500,
      }
    );
  }
}
