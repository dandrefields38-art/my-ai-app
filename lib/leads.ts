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

const scoreLead = (
  lead: Omit<
    Lead,
    "lead_score" | "score_reason"
  >
) => {
  let score = 45;
  const reasons = [];

  if (lead.phone) {
    score += 18;
    reasons.push("has a direct phone number");
  }

  if (lead.website) {
    score += 14;
    reasons.push("has a business website");
  }

  if (lead.email) {
    score += 12;
    reasons.push("has an email");
  }

  const rating =
    Number(lead.google_rating || 0);

  if (rating >= 4.5) {
    score += 10;
    reasons.push("has a strong rating");
  } else if (rating >= 4) {
    score += 7;
    reasons.push("has a good rating");
  }

  if (
    typeof lead.review_count ===
      "number" &&
    lead.review_count >= 25
  ) {
    score += 6;
    reasons.push("has meaningful review volume");
  }

  if (lead.address) {
    score += 5;
    reasons.push("has a verified address");
  }

  return {
    lead_score:
      Math.min(score, 98),
    score_reason:
      reasons.length
        ? `Strong fit because it ${reasons.join(", ")}.`
        : "Potential fit based on category and location match.",
  };
};

const normalizeLead = (
  item: SearchItem,
  industry: string,
  fallbackLocation: string
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
  const score =
    scoreLead(baseLead);

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

const buildSearchPlans = (
  industry: string,
  location: string
) => {
  const locationVariants =
    buildLocationVariants(
      location
    );
  const industryVariants =
    buildIndustryVariants(
      industry
    );
  const plans: SearchPlan[] =
    [];

  for (const nextLocation of locationVariants) {
    for (const nextIndustry of industryVariants) {
      const query =
        [
          nextIndustry,
          nextLocation,
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
            `${base} business phone address official website`,
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
            `${base} contact phone website company`,
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
  query: string
) {
  try {
    const apiKey =
      process.env.SERPER_API_KEY || "";

    if (!apiKey) {
      return [];
    }

    const count =
      parseRequestedLeadCount(query);
    const industry =
      parseLeadIndustry(query) ||
      "Business";
    const location =
      parseLeadLocation(query);
    const deduped =
      new Map<string, Lead>();
    const plans =
      buildSearchPlans(
        industry,
        location
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
            isLikelyBusiness
          )
          .forEach((item) => {
            const lead =
              normalizeLead(
                item,
                plan.industry,
                plan.location ||
                  location
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
    ).slice(0, count);
  } catch (err) {
    console.log(
      "LEADS ERROR:",
      err
    );
    return [];
  }
}
