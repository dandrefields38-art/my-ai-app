import {
  analyzeLeadRequest,
  getLeads,
  parseLeadIndustry,
  parseLeadLocation,
} from "@/lib/leads";
import type {
  Lead,
  LeadRequestAnalysis,
} from "@/lib/leads";
import {
  getBillingStatus,
  getLeadEngineEntitlements,
} from "@/lib/billing";
import { requireApiAuth } from "@/lib/security";

type LeadEngineMessage = {
  role: "user" | "assistant";
  content: string;
  payload?: {
    analysis?: LeadRequestAnalysis;
  };
};

const popularLeadCategories = [
  "Construction",
  "Real Estate",
  "Medical",
  "Dental",
  "Legal",
  "Restaurants",
  "Home Services",
  "Insurance",
  "Mortgage",
  "Technology",
];

const looksLikeStandaloneLocation = (
  text: string
) => {
  const trimmed =
    text.trim();

  return (
    /^\d{5}(?:-\d{4})?$/.test(
      trimmed
    ) ||
    /^[a-zA-Z0-9 .,'-]+(?:,\s*[a-zA-Z]{2,})?$/.test(
      trimmed
    )
  ) &&
    trimmed.split(/\s+/).length <= 6;
};

const shouldExitLeadMode = (
  text: string
) =>
  /\b(exit|leave|cancel|stop)\s+(lead mode|lead engine|leads?)\b/i.test(
    text
  );

const getPreviousLeadAnalysis = (
  messages: LeadEngineMessage[]
) => {
  for (
    let index = messages.length - 1;
    index >= 0;
    index -= 1
  ) {
    const analysis =
      messages[index]?.payload?.analysis;

    if (analysis) {
      return analysis;
    }
  }

  return null;
};

const mergeLeadAnalysis = (
  current: LeadRequestAnalysis,
  previous: LeadRequestAnalysis | null,
  message: string
): LeadRequestAnalysis => {
  if (!previous) {
    return current;
  }

  const currentIndustry =
    parseLeadIndustry(message);
  const currentLocation =
    parseLeadLocation(message) ||
    (
      looksLikeStandaloneLocation(
        message
      )
        ? message.trim()
        : ""
    );
  const industry =
    currentIndustry ||
    previous.industry ||
    current.industry;
  const location =
    currentLocation ||
    previous.location ||
    current.location;
  const missingIndustry =
    !industry &&
    !(
      current.isRandomRequest ||
      previous.isRandomRequest
    );
  const missingLocation =
    !location;

  let clarificationQuestion =
    "";

  if (
    (
      current.isRandomRequest ||
      previous.isRandomRequest
    ) &&
    missingLocation
  ) {
    clarificationQuestion =
      `What city, state, or ZIP code should I use for the mixed lead list? I can pull from categories like ${popularLeadCategories.join(", ")}.`;
  } else if (
    missingIndustry &&
    missingLocation
  ) {
    clarificationQuestion =
      `What industry and city, state, or ZIP code should I search? Popular categories: ${popularLeadCategories.join(", ")}.`;
  } else if (missingIndustry) {
    clarificationQuestion =
      `What industry or business type should I search? Popular categories: ${popularLeadCategories.join(", ")}.`;
  } else if (missingLocation) {
    clarificationQuestion =
      `What city, state, or ZIP code should I search for ${industry} leads?`;
  }

  return {
    ...current,
    wantsLeads: true,
    count:
      current.count ||
      previous.count,
    industry,
    location,
    businessGoal:
      current.businessGoal ||
      previous.businessGoal,
    requiredContactDetails:
      current.requiredContactDetails
        .length
        ? current.requiredContactDetails
        : previous.requiredContactDetails,
    isRandomRequest:
      current.isRandomRequest ||
      previous.isRandomRequest,
    needsClarification:
      missingIndustry ||
      missingLocation,
    clarificationQuestion,
  };
};

const buildLeadQuery = (
  analysis: LeadRequestAnalysis
) =>
  [
    analysis.count,
    analysis.industry,
    "leads",
    analysis.location
      ? `in ${analysis.location}`
      : "",
    analysis.businessGoal
      ? `for ${analysis.businessGoal}`
      : "",
  ]
    .filter(Boolean)
    .join(" ");

const buildLeadIntelligence = (
  leads: Lead[],
  analysis: LeadRequestAnalysis
) => {
  const withPhone =
    leads.filter(
      (lead) => lead.phone
    ).length;
  const withWebsite =
    leads.filter(
      (lead) => lead.website
    ).length;
  const avgScore =
    leads.length
      ? Math.round(
          leads.reduce(
            (
              total,
              lead
            ) =>
              total +
              Number(
                lead.lead_score || 0
              ),
            0
          ) / leads.length
        )
      : 0;
  const topIndustries =
    Array.from(
      leads.reduce(
        (
          counts,
          lead
        ) => {
          const key =
            lead.industry ||
            "Business";

          counts.set(
            key,
            (counts.get(key) || 0) +
              1
          );

          return counts;
        },
        new Map<string, number>()
      )
    )
      .sort(
        (
          a,
          b
        ) => b[1] - a[1]
      )
      .slice(0, 4)
      .map(
        (
          [
            industry,
            count,
          ]
        ) => `${industry} (${count})`
      );

  return {
    summary:
      `Found ${leads.length} leads for ${analysis.industry || "mixed businesses"} in ${analysis.location}.`,
    averageScore:
      avgScore,
    contactCoverage:
      `${withPhone}/${leads.length} have phone numbers, ${withWebsite}/${leads.length} have websites.`,
    topSegments:
      topIndustries,
    nextBestAction:
      analysis.businessGoal
        ? `Prioritize leads with phone numbers and scores above 75 for ${analysis.businessGoal}.`
        : "Prioritize leads with phone numbers, websites, and scores above 75 for first outreach.",
  };
};

export async function POST(
  req: Request
) {
  try {
    const auth =
      await requireApiAuth(
        req,
        {
          rateLimit: {
            key: "lead-engine",
            limit: 40,
            windowMs:
              60 * 1000,
          },
        }
      );

    if (auth.response) {
      return auth.response;
    }

    const {
      message,
      messages,
    } = await req.json();
    const messageText =
      String(message || "").trim();

    if (!messageText) {
      return Response.json(
        {
          type: "clarification",
          message:
            "Tell me the type of leads you want and where to search.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      shouldExitLeadMode(
        messageText
      )
    ) {
      return Response.json({
        type: "exited",
        message:
          "Lead Engine paused. You can start a new lead search anytime.",
      });
    }

    const billing =
      await getBillingStatus(
        auth.user!.id
      );
    const entitlements =
      getLeadEngineEntitlements(
        billing
      );
    const previousAnalysis =
      getPreviousLeadAnalysis(
        Array.isArray(messages)
          ? messages
          : []
      );
    const currentAnalysis =
      analyzeLeadRequest(
        messageText
      );
    const analysis =
      previousAnalysis
        ? mergeLeadAnalysis(
            currentAnalysis,
            previousAnalysis,
            messageText
          )
        : currentAnalysis;

    const cappedAnalysis = {
      ...analysis,
      count:
        Math.min(
          analysis.count,
          entitlements
            .maxLeadResults
        ),
    };

    if (
      cappedAnalysis
        .needsClarification
    ) {
      return Response.json({
        type:
          "clarification",
        message:
          cappedAnalysis
            .clarificationQuestion,
        analysis:
          cappedAnalysis,
        tier:
          entitlements,
      });
    }

    const leads =
      await getLeads(
        buildLeadQuery(
          cappedAnalysis
        )
      );

    if (!leads.length) {
      return Response.json({
        type:
          "empty",
        message:
          "I could not find matching leads. Try a broader location, nearby city, or related category.",
        analysis:
          cappedAnalysis,
        tier:
          entitlements,
      });
    }

    return Response.json({
      type:
        "leads",
      message:
        `Generated ${leads.length} leads.`,
      analysis:
        cappedAnalysis,
      leads,
      intelligence:
        entitlements
          .hasLeadIntelligence
          ? buildLeadIntelligence(
              leads,
              cappedAnalysis
            )
          : undefined,
      intelligenceLocked:
        !entitlements
          .hasLeadIntelligence,
      tier:
        entitlements,
      billing,
      capped:
        analysis.count >
        cappedAnalysis.count,
    });
  } catch (error) {
    console.log(
      "LEAD ENGINE ERROR:",
      error
    );

    return Response.json(
      {
        error:
          "Lead Engine failed. Please try again.",
      },
      {
        status: 500,
      }
    );
  }
}
