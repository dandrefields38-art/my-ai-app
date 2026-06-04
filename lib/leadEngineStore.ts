"use client";

export type CachedLeadEngineMessage = {
  role: "assistant";
  content: string;
  created_at?: string;
  updated_at?: string;
  payload?: {
    type?: string;
    analysis?: unknown;
    leads?: unknown[];
    intelligence?: unknown;
    tier?: unknown;
    capped?: boolean;
    intelligenceLocked?: boolean;
  };
};

const recentSearches =
  new Map<
    string,
    CachedLeadEngineMessage
  >();

function cacheKey(text: string) {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function getCachedLeadSearch(
  text: string
) {
  return recentSearches.get(
    cacheKey(text)
  );
}

export function setCachedLeadSearch(
  text: string,
  message: CachedLeadEngineMessage
) {
  recentSearches.delete(
    cacheKey(text)
  );
  recentSearches.set(
    cacheKey(text),
    message
  );

  while (
    recentSearches.size > 12
  ) {
    const oldest =
      recentSearches
        .keys()
        .next().value;

    if (!oldest) {
      break;
    }

    recentSearches.delete(
      oldest
    );
  }
}
