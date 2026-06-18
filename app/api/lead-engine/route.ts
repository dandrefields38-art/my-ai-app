import {
  analyzeLeadRequest,
  getLeads,
  parseLeadIndustry,
  parseLeadLocation,
} from "@/lib/leads";
import type {
  Lead,
  LeadRequestAnalysis,
  StructuredLeadExtraction,
} from "@/lib/leads";
import {
  getBillingStatus,
  getLeadEngineEntitlements,
} from "@/lib/billing";
import { requireApiAuth } from "@/lib/security";
import { requiredEnv } from "@/lib/env";
import OpenAI from "openai";

const openai =
  new OpenAI({
    apiKey:
      requiredEnv.openaiApiKey(),
  });

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

const asString = (
  value: unknown
) =>
  typeof value === "string"
    ? value.trim()
    : "";

const asStringArray = (
  value: unknown
) =>
  Array.isArray(value)
    ? value
        .map(asString)
        .filter(Boolean)
        .slice(0, 8)
    : [];

const clampConfidence = (
  value: unknown
) => {
  const confidence =
    Number(value);

  if (
    !Number.isFinite(
      confidence
    )
  ) {
    return 0;
  }

  return Math.min(
    1,
    Math.max(
      0,
      confidence
    )
  );
};

const sanitizeStructuredExtraction =
  (
    value: any
  ): StructuredLeadExtraction => ({
    industry:
      asString(value?.industry),
    location:
      asString(value?.location),
    requestedCount:
      Number.isFinite(
        Number(
          value?.requestedCount
        )
      )
        ? Math.round(
            Number(
              value.requestedCount
            )
          )
        : null,
    businessType:
      asString(
        value?.businessType
      ),
    targetCustomer:
      asString(
        value?.targetCustomer
      ),
    requiredFields:
      asStringArray(
        value?.requiredFields
      ),
    excludedTerms:
      asStringArray(
        value?.excludedTerms
      ),
    preferredSignals:
      asStringArray(
        value?.preferredSignals
      ),
    searchGoal:
      asString(
        value?.searchGoal
      ),
    confidence:
      clampConfidence(
        value?.confidence
      ),
  });

const extractStructuredLeadIntent =
  async (
    message: string
  ) => {
    try {
      const completion =
        await openai.chat.completions.create(
          {
            model:
              "gpt-4o-mini",
            temperature:
              0,
            response_format: {
              type:
                "json_object",
            },
            messages: [
              {
                role:
                  "system",
                content:
                  [
                    "Extract structured lead-search intent from the user query.",
                    "Return only JSON with keys: industry, location, requestedCount, businessType, targetCustomer, requiredFields, excludedTerms, preferredSignals, searchGoal, confidence.",
                    "Normalize obvious locations when safe, e.g. Brooklyn -> Brooklyn, NY.",
                    "Use requiredFields for explicitly requested contact/data fields such as phone, email, website, address, owner, decision maker.",
                    "Use preferredSignals for desired quality signals such as high rating, many reviews, official website, local, established.",
                    "Use excludedTerms for explicitly unwanted categories.",
                    "Use searchGoal for prospecting, outreach, acquisition, investment, hiring, research, or sales.",
                    "Do not invent specific leads, names, emails, phone numbers, or facts.",
                    "If a field is unknown, use an empty string, empty array, null requestedCount, and lower confidence.",
                  ].join(" "),
              },
              {
                role:
                  "user",
                content:
                  message.slice(
                    0,
                    1200
                  ),
              },
            ],
          }
        );
      const raw =
        completion.choices[0]
          ?.message?.content ||
        "{}";

      return sanitizeStructuredExtraction(
        JSON.parse(raw)
      );
    } catch (error) {
      console.log(
        "LEAD_ENGINE_STRUCTURED_EXTRACTION_FAILED:",
        error instanceof Error
          ? error.message
          : String(error)
      );
      return null;
    }
  };

const mergeUnique = (
  first: string[],
  second: string[]
) =>
  Array.from(
    new Set([
      ...first,
      ...second,
    ].filter(Boolean))
  );

const applyStructuredExtraction =
  (
    analysis: LeadRequestAnalysis,
    extraction: StructuredLeadExtraction | null
  ): LeadRequestAnalysis => {
    if (
      !extraction ||
      extraction.confidence < 0.35
    ) {
      return analysis;
    }

    const industry =
      extraction.industry ||
      extraction.businessType ||
      analysis.industry;
    const location =
      extraction.location ||
      analysis.location;
    const count =
      extraction.requestedCount ||
      analysis.count;
    const requiredContactDetails =
      mergeUnique(
        analysis.requiredContactDetails,
        extraction.requiredFields
      );
    const missingIndustry =
      !industry &&
      !analysis.isRandomRequest;
    const missingLocation =
      !location;
    const clarificationQuestion =
      missingIndustry &&
      missingLocation
        ? `What industry and city, state, or ZIP code should I search? Popular categories: ${popularLeadCategories.join(", ")}.`
        : missingIndustry
          ? `What industry or business type should I search? Popular categories: ${popularLeadCategories.join(", ")}.`
          : missingLocation
            ? `What city, state, or ZIP code should I search for ${industry} leads?`
            : "";

    return {
      ...analysis,
      count,
      industry,
      location,
      businessGoal:
        extraction.searchGoal ||
        analysis.businessGoal,
      requiredContactDetails,
      needsClarification:
        missingIndustry ||
        missingLocation,
      clarificationQuestion,
      structuredIntent:
        extraction,
    };
  };

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
    const structuredExtraction =
      await extractStructuredLeadIntent(
        messageText
      );
    const currentAnalysis =
      applyStructuredExtraction(
        analyzeLeadRequest(
          messageText
        ),
        structuredExtraction
      );
    const analysis =
      previousAnalysis
        ? mergeLeadAnalysis(
            currentAnalysis,
            previousAnalysis,
            messageText
          )
        : currentAnalysis;
    console.log(
      "LEAD_ENGINE_PARSED_INTENT:",
      {
        message:
          messageText.slice(
            0,
            180
          ),
        structuredExtraction,
        finalAnalysis: {
          industry:
            analysis.industry,
          location:
            analysis.location,
          requestedCount:
            analysis.count,
          businessGoal:
            analysis.businessGoal,
          requiredContactDetails:
            analysis
              .requiredContactDetails,
          needsClarification:
            analysis
              .needsClarification,
        },
      }
    );

    const cappedAnalysis = {
      ...analysis,
      count:
        Math.min(
          analysis.count,
          entitlements
            .maxLeadResults
        ),
    };
    const searchIntent = {
      ...cappedAnalysis
        .structuredIntent,
      industry:
        cappedAnalysis.industry,
      location:
        cappedAnalysis.location,
      requestedCount:
        cappedAnalysis.count,
      requiredFields:
        cappedAnalysis
          .requiredContactDetails,
      searchGoal:
        cappedAnalysis
          .businessGoal,
    };

    console.log(
      "LEAD_ENGINE_FINAL_PLAN:",
      {
        requestedCount:
          analysis.count,
        entitlementCountLimit:
          entitlements
            .maxLeadResults,
        effectiveCount:
          cappedAnalysis.count,
        industry:
          cappedAnalysis.industry,
        location:
          cappedAnalysis.location,
        requiredFields:
          cappedAnalysis
            .requiredContactDetails,
        excludedTerms:
          searchIntent.excludedTerms ||
          [],
        preferredSignals:
          searchIntent
            .preferredSignals ||
          [],
        searchGoal:
          cappedAnalysis
            .businessGoal,
      }
    );

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
        ),
        searchIntent
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
