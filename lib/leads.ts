export type Lead = {
  name: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  industry: string;
  google_rating?: number | string;
  review_count?: number;
  lead_score: number;
  score_reason: string;
  confidence_note?: string;
  confidence_level?:
    | "High"
    | "Medium"
    | "Low";
  confidence_reasons?: string[];
};

export type LeadRequestAnalysis = {
  wantsLeads: boolean;
  count: number;
  industry: string;
  location: string;
  businessGoal: string;
  requiredContactDetails: string[];
  isRandomRequest: boolean;
  needsClarification: boolean;
  clarificationQuestion: string;
  structuredIntent?: StructuredLeadExtraction;
};

export type StructuredLeadExtraction = {
  industry: string;
  location: string;
  requestedCount: number | null;
  businessType: string;
  targetCustomer: string;
  requiredFields: string[];
  excludedTerms: string[];
  preferredSignals: string[];
  searchGoal: string;
  confidence: number;
};

type SearchItem = {
  title?: string;
  name?: string;
  link?: string;
  website?: string;
  phoneNumber?: string;
  phone?: string;
  address?: string;
  rating?: number | string;
  reviews?: number;
  reviewCount?: number;
  snippet?: string;
};

type LeadSource =
  "places" | "organic";

type SearchPlan = {
  source: LeadSource;
  query: string;
  location: string;
  industry: string;
};

type LeadSearchIntent = Partial<
  StructuredLeadExtraction
>;

type LeadScoreContext = {
  requestedIndustry: string;
  requestedLocation: string;
  searchGoal: string;
  source: LeadSource;
  dedupeKey: string;
};

const maxRequestedLeads =
  100;

const pageSize =
  20;

const maxPagesPerPlan =
  5;

const leadIntentPattern =
  /\b(leads?|prospects?|companies|company|businesses|business|providers?|professionals?|contractors?|investors?|agencies|offices|clinics|practices|firms|restaurants?|plumbers?|electricians?|roofers?|hvac|dentists?|doctors?|lawyers?|attorneys?|accountants?|manufacturers?|retailers?|e-?commerce|auto repair|home services?)\b/i;

const requestActionPattern =
  /\b(find|generate|search|list|get|source|discover|show|pull|identify|give me|need|looking for)\b/i;

const informationalPattern =
  /\b(article|articles|blog|blogs|news|definition|what is|how to|guide|tutorial|examples of|explain)\b/i;

const directoryDomains = [
  "yelp.",
  "facebook.",
  "instagram.",
  "linkedin.",
  "reddit.",
  "youtube.",
  "wikipedia.",
  "homeadvisor.",
  "angi.",
  "thumbtack.",
  "bbb.org",
  "mapquest.",
  "yellowpages.",
  "opencorporates.",
  "crunchbase.",
];

const articleWords = [
  "best ",
  "top ",
  "article",
  "blog",
  "guide",
  "how to",
  "directory",
  "near me",
  "wikipedia",
];

const mixedLeadIndustry =
  "Mixed Local Businesses";

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

const genericIndustryWords =
  new Set([
    "random",
    "useful",
    "good",
    "best",
    "qualified",
    "quality",
    "hot",
    "warm",
    "local",
    "nearby",
    "new",
    "business",
  ]);

export const isLeadRequest = (
  text: string
) => {
  const normalized =
    text.toLowerCase();

  if (
    informationalPattern.test(
      normalized
    ) &&
    !requestActionPattern.test(
      normalized
    )
  ) {
    return false;
  }

  return (
    leadIntentPattern.test(
      normalized
    ) &&
    (
      requestActionPattern.test(
        normalized
      ) ||
      /\bin\s+[a-z .,-]+$/i.test(
        normalized
      ) ||
      /\b\d+\s+(?:leads?|companies|businesses|prospects?)\b/i.test(
        normalized
      )
    )
  );
};

export const parseRequestedLeadCount = (
  query: string
) => {
  const match =
    query.match(
      /\b(\d{1,3})\b/
    );

  if (!match) {
    return 12;
  }

  return Math.min(
    Math.max(
      Number(match[1]),
      1
    ),
    maxRequestedLeads
  );
};

export const parseLeadLocation = (
  query: string
) => {
  const specificMatch =
    query.match(
      /\b(?:in|near|around)\s+([a-zA-Z0-9 .,'-]+?)(?=\s+(?:for|with|that|who|and|including|include)\b|$)/i
    );

  if (
    specificMatch?.[1]
  ) {
    return specificMatch[1]
      .replace(
        /\b(?:usa|united states)\b/gi,
        ""
      )
      .trim();
  }

  return "";
};

const isRandomLeadRequest = (
  query: string
) =>
  /\brandom\b/i.test(
    query
  ) &&
  /\b(leads?|prospects?|businesses|companies)\b/i.test(
    query
  );

const industryAliases: Array<{
  pattern: RegExp;
  label: string;
}> = [
  {
    pattern:
      /\bconstruction\b/i,
    label:
      "Construction",
  },
  {
    pattern:
      /\broof(?:er|ers|ing)?\b/i,
    label:
      "Roofing",
  },
  {
    pattern:
      /\bdent(?:ist|ists|al)\b/i,
    label:
      "Dental",
  },
  {
    pattern:
      /\b(real estate investors?|property investors?)\b/i,
    label:
      "Real Estate Investors",
  },
  {
    pattern:
      /\breal estate\b/i,
    label:
      "Real Estate",
  },
  {
    pattern:
      /\bmortgage\b/i,
    label:
      "Mortgage",
  },
  {
    pattern:
      /\binsurance\b/i,
    label:
      "Insurance",
  },
  {
    pattern:
      /\bmedical|doctors?|physicians?|clinics?|practices?\b/i,
    label:
      "Medical",
  },
  {
    pattern:
      /\bchiropract(?:ic|or|ors)\b/i,
    label:
      "Chiropractic",
  },
  {
    pattern:
      /\blegal|lawyers?|attorneys?|law firms?\b/i,
    label:
      "Legal",
  },
  {
    pattern:
      /\baccount(?:ing|ants?)|cpa\b/i,
    label:
      "Accounting",
  },
  {
    pattern:
      /\brestaurants?\b/i,
    label:
      "Restaurants",
  },
  {
    pattern:
      /\bplumb(?:er|ers|ing)?\b/i,
    label:
      "Plumbing",
  },
  {
    pattern:
      /\belectric(?:ian|ians|al)?\b/i,
    label:
      "Electrical",
  },
  {
    pattern:
      /\bhvac\b/i,
    label:
      "HVAC",
  },
  {
    pattern:
      /\bauto repair|mechanics?\b/i,
    label:
      "Auto Repair",
  },
  {
    pattern:
      /\bhome services?\b/i,
    label:
      "Home Services",
  },
  {
    pattern:
      /\bmarketing agencies?|advertising agencies?\b/i,
    label:
      "Marketing Agencies",
  },
  {
    pattern:
      /\be-?commerce\b/i,
    label:
      "E-commerce",
  },
  {
    pattern:
      /\bretail(?:ers?)?\b/i,
    label:
      "Retail",
  },
  {
    pattern:
      /\btechnology|software|tech companies?\b/i,
    label:
      "Technology",
  },
  {
    pattern:
      /\bmanufactur(?:ing|ers?)\b/i,
    label:
      "Manufacturing",
  },
  {
    pattern:
      /\bnonprofits?|non-profits?\b/i,
    label:
      "Nonprofits",
  },
  {
    pattern:
      /\bmca|merchant cash advance|funding prospects?\b/i,
    label:
      "MCA Funding Prospects",
  },
];

const toTitleCase = (
  value: string
) =>
  value
    .split(" ")
    .filter(Boolean)
    .map((word) =>
      word.length <= 3 &&
      word ===
        word.toUpperCase()
        ? word
        : `${word
            .charAt(0)
            .toUpperCase()}${word
            .slice(1)
            .toLowerCase()}`
    )
    .join(" ");

export const parseLeadIndustry = (
  query: string
) => {
  const aliased =
    industryAliases.find(
      (item) =>
        item.pattern.test(
          query
        )
    );

  if (aliased) {
    return aliased.label;
  }

  if (
    isRandomLeadRequest(query)
  ) {
    return mixedLeadIndustry;
  }

  const withoutCount =
    query.replace(
      /\b\d{1,3}\b/g,
      " "
    );
  const location =
    parseLeadLocation(query);

  const cleaned =
    withoutCount
      .replace(
        location
          ? new RegExp(
              `\\b(?:in|near|around)\\s+${location.replace(
                /[.*+?^${}()|[\]\\]/g,
                "\\$&"
              )}\\b`,
              "i"
            )
          : /$a/,
        " "
      )
      .replace(
        /\bfor\s+(?:mca|merchant cash advance|funding|sales|marketing|insurance|outreach|investment|acquisition)\b.*$/i,
        " "
      )
      .replace(
        /\b(can i|could i|may i|please|pls|some|a few|any|for me|can you|could you|would you)\b/gi,
        " "
      )
      .replace(
        /\b(find|generate|search|list|get|source|discover|show|pull|identify|give me|need|looking for|want|fetch)\b/gi,
        " "
      )
      .replace(
        /\b(leads?|prospects?|companies|businesses|providers?|professionals?|contractors?|offices|clinics|practices|firms)\b/gi,
        " "
      )
      .replace(
        /\b(?:in|near|around)\s+[a-zA-Z .'-]+$/i,
        " "
      )
      .replace(
        /\s+/g,
        " "
      )
      .trim();

  const meaningfulWords =
    cleaned
      .split(" ")
      .filter(
        (word) =>
          !genericIndustryWords.has(
            word.toLowerCase()
          )
      );

  return meaningfulWords.length
    ? toTitleCase(
        meaningfulWords.join(" ")
      )
    : "";
};

const parseBusinessGoal = (
  query: string
) => {
  const normalized =
    query.toLowerCase();

  if (
    /\bmca|merchant cash advance|funding\b/i.test(
      normalized
    )
  ) {
    return "MCA funding outreach";
  }

  if (
    /\bacquir|buy|purchase|invest/i.test(
      normalized
    )
  ) {
    return "Acquisition or investment prospecting";
  }

  if (
    /\binsurance|policy|coverage/i.test(
      normalized
    )
  ) {
    return "Insurance sales outreach";
  }

  if (
    /\bmarketing|seo|ads?|agency|outreach|sales\b/i.test(
      normalized
    )
  ) {
    return "Sales outreach";
  }

  return "";
};

const parseRequiredContactDetails = (
  query: string
) => {
  const details =
    [];
  const normalized =
    query.toLowerCase();

  if (
    /\bemail|emails\b/i.test(
      normalized
    )
  ) {
    details.push("email");
  }

  if (
    /\bphone|phones|call|number\b/i.test(
      normalized
    )
  ) {
    details.push("phone");
  }

  if (
    /\bowner|founder|ceo|contact|decision maker\b/i.test(
      normalized
    )
  ) {
    details.push("decision maker");
  }

  if (
    /\bwebsite|site\b/i.test(
      normalized
    )
  ) {
    details.push("website");
  }

  return details;
};

export const analyzeLeadRequest = (
  query: string
): LeadRequestAnalysis => {
  const wantsLeads =
    isLeadRequest(query);
  const count =
    parseRequestedLeadCount(
      query
    );
  const industry =
    parseLeadIndustry(query);
  const location =
    parseLeadLocation(query);
  const isRandomRequest =
    isRandomLeadRequest(query);
  const businessGoal =
    parseBusinessGoal(query);
  const requiredContactDetails =
    parseRequiredContactDetails(
      query
    );

  const missingIndustry =
    wantsLeads &&
    !industry &&
    !isRandomRequest;
  const missingLocation =
    wantsLeads && !location;
  const needsClarification =
    missingIndustry ||
    missingLocation;

  let clarificationQuestion =
    "";

  if (
    isRandomRequest &&
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
    wantsLeads,
    count,
    industry,
    location,
    businessGoal,
    requiredContactDetails,
    isRandomRequest,
    needsClarification,
    clarificationQuestion,
  };
};

const splitCityState = (
  address = "",
  fallbackLocation = ""
) => {
  const parts =
    address
      .split(",")
      .map((part) =>
        part.trim()
      )
      .filter(Boolean);

  const locationParts =
    fallbackLocation
      .split(",")
      .map((part) =>
        part.trim()
      )
      .filter(Boolean);

  const stateMatch =
    address.match(
      /\b([A-Z]{2})\s+\d{5}\b/
    );

  return {
    city:
      parts.length >= 2
        ? parts[parts.length - 3] ||
          parts[parts.length - 2]
        : locationParts[0] || "",
    state:
      stateMatch?.[1] ||
      locationParts[1] ||
      (
        locationParts.length === 1
          ? locationParts[0]
          : ""
      ),
  };
};

const getDomain = (
  url = ""
) => {
  try {
    return new URL(url).hostname.replace(
      /^www\./,
      ""
    );
  } catch {
    return "";
  }
};

const getLeadKey = (
  lead: Pick<
    Lead,
    | "name"
    | "website"
    | "phone"
    | "address"
  >
) =>
  getDomain(
    lead.website
  ) ||
  String(lead.phone || "")
    .replace(/\D/g, "") ||
  `${String(lead.name || "")
    .toLowerCase()
    .trim()}:${String(lead.address || "")
    .toLowerCase()
    .trim()}`;

const isLikelyBusiness = (
  item: SearchItem
) => {
  const url =
    String(
      item.link ||
        item.website ||
        ""
    ).toLowerCase();
  const title =
    String(
      item.title ||
        item.name ||
        ""
    ).toLowerCase();
  const snippet =
    String(item.snippet || "").toLowerCase();

  if (
    directoryDomains.some((domain) =>
      url.includes(domain)
    )
  ) {
    return false;
  }

  if (
    articleWords.some(
      (word) =>
        title.includes(word) ||
        snippet.includes(word)
    )
  ) {
    return false;
  }

  return Boolean(
    item.phoneNumber ||
      item.phone ||
      item.address ||
      item.website ||
      item.link
  );
};

const buildLeadConfidenceNote = (
  lead: Omit<
    Lead,
    | "lead_score"
    | "score_reason"
    | "confidence_note"
    | "confidence_level"
    | "confidence_reasons"
  >
) => {
  const signals: string[] =
    [];
  const gaps: string[] =
    [];
  const rating =
    Number(
      lead.google_rating || 0
    );

  if (lead.phone) {
    signals.push("phone");
  } else {
    gaps.push("phone");
  }

  if (lead.website) {
    signals.push("website");
  } else {
    gaps.push("website");
  }

  if (rating >= 4) {
    signals.push(
      `${rating.toFixed(1)} rating`
    );
  }

  if (
    typeof lead.review_count ===
      "number" &&
    lead.review_count > 0
  ) {
    signals.push(
      `${lead.review_count} reviews`
    );
  }

  if (lead.address) {
    signals.push("address");
  } else {
    gaps.push("address");
  }

  if (lead.industry) {
    signals.push(
      `${lead.industry} match`
    );
  }

  if (
    lead.city ||
    lead.state ||
    lead.address
  ) {
    signals.push("location match");
  }

  const confidence =
    signals.length >= 5
      ? "High"
      : signals.length >= 3
        ? "Medium"
        : "Low";
  const signalText =
    signals.length
      ? signals
          .slice(0, 5)
          .join(", ")
      : "limited public data";
  const gapText =
    gaps.length
      ? ` Missing ${gaps
          .slice(0, 2)
          .join(" and ")}.`
      : "";

  return `${confidence} confidence based on ${signalText}.${gapText}`;
};

const normalizeMatchText = (
  value = ""
) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const hasTextMatch = (
  haystack: string,
  needle: string
) => {
  const normalizedNeedle =
    normalizeMatchText(needle);

  if (!normalizedNeedle) {
    return false;
  }

  return normalizeMatchText(
    haystack
  ).includes(normalizedNeedle);
};

const getWebsiteQuality = (
  website = "",
  name = ""
) => {
  if (!website) {
    return {
      score: 0,
      reason: "",
    };
  }

  const domain =
    getDomain(website);
  const nameWords =
    normalizeMatchText(name)
      .split(" ")
      .filter(
        (word) =>
          word.length > 2
      );
  const domainMatchesName =
    nameWords.some((word) =>
      domain.includes(word)
    );

  if (domainMatchesName) {
    return {
      score: 8,
      reason:
        "Website domain appears related to business name",
    };
  }

  return {
    score: 5,
    reason:
      "Website detected",
  };
};

const getConfidenceLevel = (
  score: number,
  reasons: string[]
): "High" | "Medium" | "Low" => {
  if (
    score >= 82 &&
    reasons.length >= 6
  ) {
    return "High";
  }

  if (
    score >= 62 &&
    reasons.length >= 3
  ) {
    return "Medium";
  }

  return "Low";
};

const scoreLead = (
  lead: Omit<
    Lead,
    | "lead_score"
    | "score_reason"
    | "confidence_note"
    | "confidence_level"
    | "confidence_reasons"
  >,
  context: LeadScoreContext
) => {
  let score = 30;
  const reasons: string[] =
    [];
  const searchableText =
    [
      lead.name,
      lead.industry,
      lead.address,
      lead.city,
      lead.state,
      lead.website,
    ]
      .filter(Boolean)
      .join(" ");
  const requestedIndustry =
    context.requestedIndustry ||
    lead.industry;
  const requestedLocation =
    context.requestedLocation;

  if (
    requestedIndustry &&
    (
      hasTextMatch(
        lead.industry,
        requestedIndustry
      ) ||
      hasTextMatch(
        searchableText,
        requestedIndustry
      )
    )
  ) {
    score += 14;
    reasons.push(
      `Exact ${requestedIndustry} industry match`
    );
  } else if (lead.industry) {
    score += 6;
    reasons.push(
      `${lead.industry} category match`
    );
  }

  if (
    requestedLocation &&
    (
      hasTextMatch(
        lead.city || "",
        requestedLocation
      ) ||
      hasTextMatch(
        lead.address || "",
        requestedLocation
      ) ||
      hasTextMatch(
        `${lead.city || ""} ${lead.state || ""}`,
        requestedLocation
      )
    )
  ) {
    score += 12;
    reasons.push(
      "Located in requested city or area"
    );
  } else if (
    requestedLocation &&
    context.source === "places"
  ) {
    score += 6;
    reasons.push(
      "Returned from requested location search"
    );
  }

  if (lead.phone) {
    score += 18;
    reasons.push("Phone detected");
  }

  const websiteQuality =
    getWebsiteQuality(
      lead.website,
      lead.name
    );

  if (websiteQuality.score) {
    score +=
      websiteQuality.score;
    reasons.push(
      websiteQuality.reason
    );
  }

  if (lead.email) {
    score += 12;
    reasons.push("Email detected");
  }

  const rating =
    Number(lead.google_rating || 0);

  if (rating >= 4.5) {
    score += 10;
    reasons.push(
      `Rating ${rating.toFixed(1)}`
    );
  } else if (rating >= 4) {
    score += 7;
    reasons.push(
      `Rating ${rating.toFixed(1)}`
    );
  }

  if (
    typeof lead.review_count ===
      "number" &&
    lead.review_count >= 25
  ) {
    const reviewScore =
      lead.review_count >= 100
        ? 8
        : 6;
    score += reviewScore;
    reasons.push(
      `${lead.review_count} reviews`
    );
  } else if (
    typeof lead.review_count ===
      "number" &&
    lead.review_count > 0
  ) {
    score += 3;
    reasons.push(
      `${lead.review_count} reviews`
    );
  }

  if (lead.address) {
    const hasCityOrState =
      Boolean(
        lead.city || lead.state
      );

    score += hasCityOrState
      ? 7
      : 5;
    reasons.push(
      hasCityOrState
        ? "Complete address with city/state"
        : "Address detected"
    );
  }

  if (
    context.source === "places"
  ) {
    score += 6;
    reasons.push(
      "Google Places result"
    );
  } else {
    score += 3;
    reasons.push(
      "Organic search result"
    );
  }

  if (context.dedupeKey) {
    const dedupeReason =
      getDomain(lead.website)
        ? "Normalized by website domain"
        : lead.phone
          ? "Normalized by phone number"
          : "Normalized by business name and address";
    score += 4;
    reasons.push(dedupeReason);
  }

  if (context.searchGoal) {
    const goalText =
      normalizeMatchText(
        context.searchGoal
      );

    if (
      goalText &&
      (
        hasTextMatch(
          searchableText,
          goalText
        ) ||
        hasTextMatch(
          `${lead.industry} ${lead.name}`,
          context.searchGoal
        )
      )
    ) {
      score += 5;
      reasons.push(
        `Relevant to ${context.searchGoal}`
      );
    } else if (
      lead.phone ||
      lead.website
    ) {
      score += 2;
      reasons.push(
        `Contactable for ${context.searchGoal}`
      );
    }
  }

  const finalScore =
    Math.min(
      score,
      98
    );
  const confidenceLevel =
    getConfidenceLevel(
      finalScore,
      reasons
    );

  return {
    lead_score:
      finalScore,
    score_reason:
      reasons.length
        ? `${confidenceLevel} confidence because it has ${reasons
            .slice(0, 6)
            .join(", ")}.`
        : "Potential fit based on category and location match.",
    confidence_note:
      buildLeadConfidenceNote(
        lead
      ),
    confidence_level:
      confidenceLevel,
    confidence_reasons:
      reasons,
  };
};

const normalizeLead = (
  item: SearchItem,
  industry: string,
  fallbackLocation: string,
  context: Omit<
    LeadScoreContext,
    | "dedupeKey"
    | "requestedIndustry"
    | "requestedLocation"
  > & {
    requestedIndustry: string;
    requestedLocation: string;
  }
): Lead => {
  const website =
    item.website ||
    item.link ||
    "";
  const address =
    item.address || "";
  const location =
    splitCityState(
      address,
      fallbackLocation
    );
  const baseLead =
    {
      name:
        item.name ||
        item.title?.replace(
          /\s+-\s+.*$/,
          ""
        ) ||
        "Unknown Business",
      phone:
        item.phoneNumber ||
        item.phone ||
        "",
      email: "",
      website,
      address,
      city:
        location.city,
      state:
        location.state,
      industry,
      google_rating:
        item.rating || "",
      review_count:
        item.reviews ||
        item.reviewCount ||
        undefined,
	    };
  const dedupeKey =
    getLeadKey(baseLead);
  const score =
    scoreLead(
      baseLead,
      {
        ...context,
        dedupeKey,
      }
    );

  return {
    ...baseLead,
    ...score,
  };
};

const unique = (
  values: string[]
) =>
  Array.from(
    new Set(
      values
        .map((value) =>
          value
            .replace(/\s+/g, " ")
            .trim()
        )
        .filter(Boolean)
    )
  );

const buildLocationVariants = (
  location: string
) => {
  if (!location) {
    return [
      "",
      "United States",
    ];
  }

  const parts =
    location
      .split(",")
      .map((part) =>
        part.trim()
      )
      .filter(Boolean);
  const stateOrRegion =
    parts.length > 1
      ? parts[parts.length - 1]
      : "";

  return unique([
    location,
    `near ${location}`,
    `around ${location}`,
    `surrounding areas ${location}`,
    stateOrRegion,
  ]);
};

const buildIndustryVariants = (
  industry: string
) => {
  if (
    industry ===
    mixedLeadIndustry
  ) {
    return popularLeadCategories;
  }

  return unique([
    industry,
    `${industry} companies`,
    `${industry} businesses`,
    `${industry} providers`,
    `${industry} professionals`,
    `${industry} offices`,
  ]);
};

const normalizeSearchTerms = (
  values: unknown
) =>
  Array.isArray(values)
    ? unique(
        values
          .map((value) =>
            String(value || "")
          )
          .filter(Boolean)
      ).slice(0, 8)
    : [];

const buildIntentSearchTerms = (
  intent?: LeadSearchIntent
) => {
  if (!intent) {
    return [];
  }

  const requiredFields =
    normalizeSearchTerms(
      intent.requiredFields
    );
  const preferredSignals =
    normalizeSearchTerms(
      intent.preferredSignals
    );
  const targetCustomer =
    String(
      intent.targetCustomer || ""
    ).trim();
  const searchGoal =
    String(
      intent.searchGoal || ""
    ).trim();
  const fieldTerms =
    requiredFields.map(
      (field) => {
        const normalized =
          field.toLowerCase();

        if (
          normalized.includes(
            "phone"
          )
        ) {
          return "phone number";
        }

        if (
          normalized.includes(
            "website"
          )
        ) {
          return "official website";
        }

        if (
          normalized.includes(
            "email"
          )
        ) {
          return "email";
        }

        if (
          normalized.includes(
            "address"
          )
        ) {
          return "address";
        }

        return field;
      }
    );

  return unique([
    ...fieldTerms,
    ...preferredSignals,
    targetCustomer,
    searchGoal,
  ]).slice(0, 8);
};

const hasExcludedTerm = (
  item: SearchItem,
  excludedTerms: string[]
) => {
  if (!excludedTerms.length) {
    return false;
  }

  const haystack =
    [
      item.title,
      item.name,
      item.snippet,
      item.link,
      item.website,
      item.address,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

  return excludedTerms.some(
    (term) =>
      haystack.includes(
        term.toLowerCase()
      )
  );
};

const buildSearchPlans = (
  industry: string,
  location: string,
  intent?: LeadSearchIntent
) => {
  const locationVariants =
    buildLocationVariants(
      location
    );
  const industryVariants =
    buildIndustryVariants(
      industry
    );
  const intentTerms =
    buildIntentSearchTerms(
      intent
    );
  const intentQuerySuffix =
    intentTerms.length
      ? intentTerms.join(" ")
      : "";
  const plans: SearchPlan[] =
    [];

  for (const nextLocation of locationVariants) {
    for (const nextIndustry of industryVariants) {
      const query =
        [
          nextIndustry,
          nextLocation,
          intentQuerySuffix,
        ]
          .filter(Boolean)
          .join(" ");

      plans.push({
        source:
          "places",
        query,
        location:
          nextLocation ||
          location,
        industry:
          industry ===
          mixedLeadIndustry
            ? nextIndustry
            : industry,
      });
    }
  }

  for (const nextLocation of locationVariants) {
    for (const nextIndustry of industryVariants) {
      const base =
        [
          nextIndustry,
          nextLocation,
        ]
          .filter(Boolean)
          .join(" ");

      plans.push(
        {
          source:
            "organic",
          query:
            `${base} ${intentQuerySuffix} business phone address official website`,
          location:
            nextLocation ||
            location,
          industry:
            industry ===
            mixedLeadIndustry
              ? nextIndustry
              : industry,
        },
        {
          source:
            "organic",
          query:
            `${base} ${intentQuerySuffix} contact phone website company`,
          location:
            nextLocation ||
            location,
          industry:
            industry ===
            mixedLeadIndustry
              ? nextIndustry
              : industry,
        }
      );
    }
  }

  return plans;
};

const fetchSerper = async (
  apiKey: string,
  plan: SearchPlan,
  page: number
) => {
  const endpoint =
    plan.source ===
    "places"
      ? "https://google.serper.dev/places"
      : "https://google.serper.dev/search";

  const response =
    await fetch(
      endpoint,
      {
        method:
          "POST",
        headers: {
          "X-API-KEY":
            apiKey,
          "Content-Type":
            "application/json",
        },
        body:
          JSON.stringify({
            q:
              plan.query,
            num:
              pageSize,
            page,
          }),
      }
    );

  const data =
    await response.json();

  if (!response.ok) {
    console.log(
      "Serper lead source error:",
      {
        source:
          plan.source,
        query:
          plan.query,
        page,
        data,
      }
    );

    return [];
  }

  if (
    plan.source ===
    "places"
  ) {
    return Array.isArray(
      data.places
    )
      ? data.places as SearchItem[]
      : [];
  }

  return Array.isArray(
    data.organic
  )
    ? data.organic as SearchItem[]
    : [];
};

export async function getLeads(
  query: string,
  intent?: LeadSearchIntent
) {
  try {
    const apiKey =
      process.env.SERPER_API_KEY || "";

    if (!apiKey) {
      return [];
    }

    const count =
      intent?.requestedCount
        ? Math.min(
            Math.max(
              Number(
                intent.requestedCount
              ),
              1
            ),
            maxRequestedLeads
          )
        : parseRequestedLeadCount(
            query
          );
    const industry =
      String(
        intent?.industry ||
          intent?.businessType ||
          ""
      ).trim() ||
      parseLeadIndustry(query) ||
      "Business";
    const location =
      String(
        intent?.location || ""
      ).trim() ||
      parseLeadLocation(query);
    const excludedTerms =
      normalizeSearchTerms(
        intent?.excludedTerms
      );
    const deduped =
      new Map<string, Lead>();
    const plans =
      buildSearchPlans(
        industry,
        location,
        intent
      );

    console.log(
      "LEAD_ENGINE_SEARCH_PLAN:",
      {
        requestedCount:
          count,
        industry,
        location,
        requiredFields:
          normalizeSearchTerms(
            intent?.requiredFields
          ),
        excludedTerms,
        preferredSignals:
          normalizeSearchTerms(
            intent?.preferredSignals
          ),
        searchGoal:
          intent?.searchGoal ||
          "",
        planCount:
          plans.length,
        sampleQueries:
          plans
            .slice(0, 5)
            .map((plan) => ({
              source:
                plan.source,
              query:
                plan.query,
            })),
      }
    );

    for (const plan of plans) {
      for (
        let page = 1;
        page <= maxPagesPerPlan;
        page += 1
      ) {
        if (
          deduped.size >=
          count
        ) {
          break;
        }

        const items =
          await fetchSerper(
            apiKey,
            plan,
            page
          );

        if (
          !items.length
        ) {
          break;
        }

        items
          .filter(
            (item) =>
              !hasExcludedTerm(
                item,
                excludedTerms
              )
          )
          .filter(
            isLikelyBusiness
          )
          .forEach((item) => {
	            const lead =
	              normalizeLead(
	                item,
	                plan.industry,
	                plan.location ||
	                  location,
                {
                  requestedIndustry:
                    industry,
                  requestedLocation:
                    location,
                  searchGoal:
                    intent?.searchGoal ||
                    "",
                  source:
                    plan.source,
                }
	              );
            const key =
              getLeadKey(
                lead
              );

            if (
              key &&
              !deduped.has(key)
            ) {
              deduped.set(
                key,
                lead
              );
            }
          });
      }

      if (
        deduped.size >=
        count
      ) {
        break;
      }
    }

    return Array.from(
      deduped.values()
    )
      .sort(
        (
          a,
          b
        ) =>
          Number(
            b.lead_score || 0
          ) -
            Number(
              a.lead_score || 0
            )
      )
      .slice(0, count);
  } catch (err) {
    console.log(
      "LEADS ERROR:",
      err
    );
    return [];
  }
}
