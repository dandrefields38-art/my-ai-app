"use client";

import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ArrowLeft,
  BarChart3,
  Building2,
  Check,
  ExternalLink,
  MapPin,
  Save,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Users,
} from "lucide-react";

import {
  useRouter,
} from "next/navigation";

import Link from "next/link";

import LeadEngineMenu from "@/app/components/LeadEngineMenu";
import MessageTimestamp from "@/app/components/MessageTimestamp";

import {
  getAuthHeaders,
  redirectIfSignedOut,
} from "@/lib/authClient";
import {
  getCachedLeadSearch,
  setCachedLeadSearch,
} from "@/lib/leadEngineStore";
import {
  getBrowserTimeZone,
} from "@/lib/dateTime";
import {
  formatDateSeparatorLabel,
  getDateGroupKey,
  getMessageTimestamp,
} from "@/lib/messageTime";

type Lead = {
  name: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  industry?: string;
  google_rating?: number | string;
  review_count?: number;
  lead_score?: number;
  score_reason?: string;
};

type LeadAnalysis = {
  count?: number;
  industry?: string;
  location?: string;
  businessGoal?: string;
  requiredContactDetails?: string[];
  isRandomRequest?: boolean;
};

type LeadIntelligence = {
  summary?: string;
  averageScore?: number;
  contactCoverage?: string;
  topSegments?: string[];
  nextBestAction?: string;
};

type LeadEngineMessage = {
  role: "user" | "assistant";
  content: string;
  created_at?: string;
  updated_at?: string;
  payload?: {
    type?: string;
    analysis?: LeadAnalysis;
    leads?: Lead[];
    intelligence?: LeadIntelligence;
    tier?: {
      label?: string;
      maxLeadResults?: number;
      hasLeadIntelligence?: boolean;
    };
    capped?: boolean;
    intelligenceLocked?: boolean;
  };
};

const starterPrompts = [
  "Find 25 construction leads in Brooklyn for MCA funding",
  "Find dental practices in Miami",
  "Give me random leads in Dallas",
];

export default function LeadEnginePage() {
  const router =
    useRouter();

  const [messages, setMessages] =
    useState<LeadEngineMessage[]>([]);
  const [input, setInput] =
    useState("");
  const [loading, setLoading] =
    useState(false);
  const [saved, setSaved] =
    useState<
      Record<string, string>
    >({});
  const [browserTimeZone, setBrowserTimeZone] =
    useState<string | null>(
      null
    );
  const bottomRef =
    useRef<HTMLDivElement | null>(
      null
    );

  useEffect(() => {
    setBrowserTimeZone(
      getBrowserTimeZone()
    );
  }, []);

  useEffect(() => {
    setMessages(
      (current) => {
        if (current.length) {
          return current;
        }

        const now =
          new Date().toISOString();

        return [
          {
            role:
              "assistant",
            content:
              "Lead Engine is ready.",
            created_at:
              now,
            updated_at:
              now,
            payload: {
              type:
                "welcome",
              analysis: {
                count:
                  25,
              },
            },
          },
        ];
      }
    );
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView(
      {
        behavior:
          "smooth",
      }
    );
  }, [messages, loading]);

  useEffect(() => {
    void redirectIfSignedOut(
      router
    );
  }, [router]);

  const latestAssistant =
    useMemo(
      () =>
        [...messages]
          .reverse()
          .find(
            (
              message
            ) =>
              message.role ===
              "assistant"
          ),
      [messages]
    );

  const latestAnalysis =
    latestAssistant?.payload
      ?.analysis;
  const latestIntelligence =
    latestAssistant?.payload
      ?.intelligence;
  const latestTier =
    latestAssistant?.payload
      ?.tier;
  const intelligenceLocked =
    Boolean(
      latestAssistant?.payload
        ?.intelligenceLocked
    );

  const sendMessage =
    async (
      override?: string
    ) => {
      const text =
        (
          override ||
          input
        ).trim();

      if (
        !text ||
        loading
      ) {
        return;
      }

      const userMessage: LeadEngineMessage =
        {
          role:
            "user",
          content:
            text,
          created_at:
            new Date().toISOString(),
          updated_at:
            new Date().toISOString(),
        };
      const nextMessages =
        [
          ...messages,
          userMessage,
        ];

      setMessages(
        nextMessages
      );
      setInput("");

      const cached =
        getCachedLeadSearch(
          text
        );

      if (cached) {
        setMessages([
          ...nextMessages,
          cached as LeadEngineMessage,
        ]);
        return;
      }

      setLoading(true);

      try {
        const headers =
          await getAuthHeaders();
        const res =
          await fetch(
            "/api/lead-engine",
            {
              method:
                "POST",
              headers: {
                "Content-Type":
                  "application/json",
                ...headers,
              },
              body:
                JSON.stringify({
                  message:
                    text,
                  messages:
                    messages.filter(
                      (
                        message
                      ) =>
                        message.role ===
                        "assistant"
                    ),
                }),
            }
          );
        const data =
          await res.json();

        const assistantMessage = {
            role:
              "assistant" as const,
            content:
              data.message ||
              data.error ||
              "Lead Engine response failed.",
            created_at:
              new Date().toISOString(),
            updated_at:
              new Date().toISOString(),
            payload:
              data,
          };

        setCachedLeadSearch(
          text,
          assistantMessage
        );

        setMessages(
          (
            current
          ) => [
            ...current,
            assistantMessage,
          ]
        );
      } catch (error) {
        console.log(
          "LEAD ENGINE PAGE ERROR:",
          error
        );

        setMessages(
          (
            current
          ) => [
            ...current,
            {
              role:
                "assistant",
              content:
                "Lead Engine hit a temporary issue. Please try again.",
              created_at:
                new Date().toISOString(),
              updated_at:
                new Date().toISOString(),
            },
          ]
        );
      } finally {
        setLoading(false);
      }
    };

  const saveLead =
    async (
      lead: Lead,
      key: string
    ) => {
      setSaved(
        (
          current
        ) => ({
          ...current,
          [key]:
            "Saving",
        })
      );

      const headers =
        await getAuthHeaders();
      const res =
        await fetch(
          "/api/leads",
          {
            method:
              "POST",
            headers: {
              "Content-Type":
                "application/json",
              ...headers,
            },
            body:
              JSON.stringify({
                lead,
              }),
          }
        );
      const data =
        await res.json();

      setSaved(
        (
          current
        ) => ({
          ...current,
          [key]:
            data.inserted > 0
              ? "Saved"
              : "Duplicate",
        })
      );
    };

  return (
    <main className="h-screen overflow-hidden bg-[#050505] text-white">
      <div className="flex h-screen">
        <aside className="hidden">
          <div className="px-6 pt-7">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-emerald-500/20 text-emerald-200">
                <Target />
              </div>

              <div>
                <h1 className="text-2xl font-semibold">
                  Lead Engine
                </h1>
                <p className="text-sm text-white/40">
                  Inquire product
                </p>
              </div>
            </div>

            <nav className="mt-8 space-y-3">
              <Link
                href="/chat"
                className="flex h-12 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-white/75 transition hover:bg-white/[0.06] hover:text-white"
              >
                <ArrowLeft
                  size={18}
                />
                AI Chat
              </Link>
            </nav>

            <LeadEngineMenu />

            <div className="mt-8 rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-white">
                <ShieldCheck
                  size={17}
                  className="text-emerald-200"
                />
                Pricing tiers
              </div>
              <div className="mt-3 space-y-2 text-sm text-white/55">
                <div>Free</div>
                <div>Pro AI</div>
                <div className="text-emerald-200">
                  Lead Engine Pro
                </div>
              </div>
            </div>
          </div>
        </aside>

        <section className="ml-0 flex min-w-0 flex-1 flex-col overflow-hidden bg-white/[0.03]">
          <header className="flex flex-col gap-4 border-b border-white/10 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6 xl:px-8">
            <div>
              <div className="flex items-center gap-2 text-xs uppercase text-emerald-200">
                <Sparkles
                  size={14}
                />
                Standalone Product
              </div>
              <h2 className="mt-1 text-3xl font-semibold">
                Lead Engine
              </h2>
            </div>

            <div className="flex flex-wrap gap-2 text-xs text-white/55">
              <span className="rounded-full border border-white/10 px-3 py-1">
                Search workflow
              </span>
              <span className="rounded-full border border-white/10 px-3 py-1">
                Intelligence workflow
              </span>
              <span className="rounded-full border border-white/10 px-3 py-1">
                Saved leads connected
              </span>
            </div>

            <div className="md:hidden">
              <LeadEngineMenu compact />
            </div>
          </header>

          <div className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="flex min-h-0 flex-col">
              <div className="min-h-0 flex-1 overflow-y-auto px-3 py-5 sm:px-4 md:px-6 xl:px-8">
                <div className="mx-auto w-full max-w-7xl space-y-5">
                  {messages.map(
                    (
                      message,
                      index
                    ) => {
                      const timestamp =
                        getMessageTimestamp(
                          message
                        );
	                      const dateKey =
	                        getDateGroupKey(
	                          timestamp,
                            {
                              timeZone:
                                browserTimeZone,
                            }
	                        );
                      const previous =
                        messages[
                          index - 1
                        ];
                      const previousKey =
                        previous
	                          ? getDateGroupKey(
	                              getMessageTimestamp(
	                                previous
	                              ),
                                {
                                  timeZone:
                                    browserTimeZone,
                                }
	                            )
                          : null;
                      const showDateDivider =
                        dateKey !==
                        previousKey;

                      return (
                      <Fragment
                        key={`${index}-${dateKey}`}
                      >
                        {showDateDivider && (
                          <DateDivider
	                            label={formatDateSeparatorLabel(
	                              timestamp,
                                {
                                  timeZone:
                                    browserTimeZone,
                                }
	                            )}
	                          />
                        )}
                      <div
                        key={
                          `message-${index}`
                        }
                        className={`flex ${
                          message.role ===
                          "user"
                            ? "justify-end"
                            : "justify-start"
                        }`}
                      >
                        <div
                          className={`${
                            message.payload
                              ?.leads
                              ?.length
                              ? "w-full"
                              : "max-w-[92%]"
                          } rounded-2xl px-4 py-3 ${
                            message.role ===
                            "user"
                              ? "bg-white text-black"
                              : "border border-white/10 bg-[#111116]"
                          }`}
                        >
                          <div className="whitespace-pre-wrap text-sm md:text-base">
                            {
                              message.content
                            }
                          </div>

                          {message.payload
                            ?.capped && (
                            <div className="mt-3 rounded-xl bg-yellow-500/10 px-3 py-2 text-sm text-yellow-100">
                              Your current tier limited this search to{" "}
                              {
                                message.payload
                                  .analysis
                                  ?.count
                              }{" "}
                              leads.
                            </div>
                          )}

                          {message.payload
                            ?.leads && (
                            <LeadResults
                              leads={
                                message
                                  .payload
                                  .leads
                              }
                              saved={
                                saved
                              }
                              onSave={
                                saveLead
                              }
                            />
                          )}
                          <MessageTimestamp
                            timestamp={
                              timestamp
                            }
                            align={
                              message.role ===
                              "user"
                                ? "right"
                                : "left"
                            }
                            tone={
                              message.role ===
                              "user"
                                ? "dark"
                                : "muted"
                            }
                          />
                        </div>
                      </div>
                      </Fragment>
                      );
                    }
                  )}

                  {loading && (
                    <LeadSearchSkeleton />
                  )}

                  <div
                    ref={
                      bottomRef
                    }
                  />
                </div>
              </div>

              <div className="border-t border-white/10 px-3 py-4 sm:px-4 md:px-6 xl:px-8">
                <div className="mx-auto w-full max-w-5xl">
                  <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
                    {starterPrompts.map(
                      (
                        prompt
                      ) => (
                        <button
                          key={
                            prompt
                          }
                          type="button"
                          onClick={() =>
                            sendMessage(
                              prompt
                            )
                          }
                          className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white/70 transition hover:bg-white/[0.08] hover:text-white"
                        >
                          {
                            prompt
                          }
                        </button>
                      )
                    )}
                  </div>

                  <div className="flex items-end gap-3 rounded-2xl border border-white/10 bg-[#111116] px-4 py-3">
                    <Search
                      size={20}
                      className="mb-3 shrink-0 text-white/35"
                    />
                    <textarea
                      value={
                        input
                      }
                      onChange={(event) =>
                        setInput(
                          event.target
                            .value
                        )
                      }
                      onKeyDown={(event) => {
                        if (
                          event.key ===
                            "Enter" &&
                          !event.shiftKey
                        ) {
                          event.preventDefault();
                          sendMessage();
                        }
                      }}
                      placeholder="Ask Lead Engine for leads..."
                      className="min-h-12 flex-1 resize-none bg-transparent text-base outline-none placeholder:text-white/35"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        sendMessage()
                      }
                      disabled={
                        loading
                      }
                      className="mb-1 flex h-11 w-11 items-center justify-center rounded-xl bg-white text-black transition hover:bg-white/90 disabled:opacity-50"
                    >
                      <Send
                        size={18}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <aside className="hidden min-h-0 overflow-y-auto border-l border-white/10 p-5 xl:block">
              <IntelligencePanel
                analysis={
                  latestAnalysis
                }
                intelligence={
                  latestIntelligence
                }
                tier={
                  latestTier
                }
                locked={
                  intelligenceLocked
                }
              />
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}

function DateDivider({
  label,
}: {
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="h-px flex-1 bg-white/10" />
      <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/45">
        {label}
      </span>
      <div className="h-px flex-1 bg-white/10" />
    </div>
  );
}

function LeadSearchSkeleton() {
  return (
    <div className="flex justify-start">
      <div className="w-full rounded-2xl border border-white/10 bg-[#111116] px-4 py-4">
        <div className="skeleton h-4 w-48 rounded-full" />
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {[0, 1, 2].map(
            (item) => (
              <div
                key={item}
                className="rounded-2xl border border-white/10 bg-black/20 p-4"
              >
                <div className="skeleton h-4 w-28 rounded-full" />
                <div className="skeleton mt-3 h-3 w-36 rounded-full" />
                <div className="skeleton mt-5 h-9 w-full rounded-xl" />
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

function IntelligencePanel({
  analysis,
  intelligence,
  tier,
  locked = false,
}: {
  analysis?: LeadAnalysis;
  intelligence?: LeadIntelligence;
  tier?: {
    label?: string;
    maxLeadResults?: number;
    hasLeadIntelligence?: boolean;
  };
  locked?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2 text-xs uppercase text-white/45">
          <BarChart3
            size={15}
          />
          Intelligence
        </div>
        <h3 className="mt-2 text-xl font-semibold">
          Lead Search Context
        </h3>
      </div>

      <div className="grid gap-3 text-sm">
        <InfoRow
          label="Tier"
          value={
            tier?.label ||
            "Free"
          }
        />
        <InfoRow
          label="Category"
          value={
            analysis?.industry ||
            "Needed"
          }
        />
        <InfoRow
          label="Location"
          value={
            analysis?.location ||
            "Needed"
          }
        />
        <InfoRow
          label="Target count"
          value={String(
            analysis?.count || 25
          )}
        />
        <InfoRow
          label="Goal"
          value={
            analysis?.businessGoal ||
            "General outreach"
          }
        />
      </div>

      {intelligence && (
        <div className="space-y-3 rounded-2xl border border-white/10 bg-black/20 p-4">
          <div className="text-sm text-white/65">
            {
              intelligence.summary
            }
          </div>
          <InfoRow
            label="Average score"
            value={String(
              intelligence.averageScore ||
                0
            )}
          />
          <InfoRow
            label="Coverage"
            value={
              intelligence.contactCoverage ||
              "No coverage yet"
            }
          />
          <InfoRow
            label="Next action"
            value={
              intelligence.nextBestAction ||
              "Generate leads to see next action."
            }
          />
          {Boolean(
            intelligence.topSegments
              ?.length
          ) && (
            <div className="flex flex-wrap gap-2 pt-2">
              {intelligence.topSegments?.map(
                (
                  segment
                ) => (
                  <span
                    key={
                      segment
                    }
                    className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs text-emerald-100"
                  >
                    {
                      segment
                    }
                  </span>
                )
              )}
            </div>
          )}
        </div>
      )}

      {locked && (
        <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-4">
          <div className="text-sm font-medium text-emerald-100">
            Lead Intelligence requires Lead Engine Pro.
          </div>
          <p className="mt-2 text-sm leading-6 text-white/55">
            Upgrade to unlock scoring summaries, contact coverage, segment analysis, and next-best-action recommendations.
          </p>
          <Link
            href="/billing"
            className="mt-4 inline-flex h-10 items-center rounded-xl bg-emerald-300 px-4 text-sm font-medium text-black transition hover:bg-emerald-200"
          >
            View Billing
          </Link>
        </div>
      )}
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-white/[0.04] px-3 py-2">
      <div className="text-xs uppercase text-white/35">
        {label}
      </div>
      <div className="mt-1 text-white/80">
        {value}
      </div>
    </div>
  );
}

function LeadResults({
  leads,
  saved,
  onSave,
}: {
  leads: Lead[];
  saved: Record<string, string>;
  onSave: (
    lead: Lead,
    key: string
  ) => void;
}) {
  return (
    <div className="mt-4 grid gap-3">
      {leads.map(
        (
          lead,
          index
        ) => {
          const key =
            `${lead.name}-${index}`;

          return (
            <article
              key={
                key
              }
              className="rounded-2xl border border-white/10 bg-black/20 p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs uppercase text-white/45">
                    <Building2
                      size={15}
                    />
                    {lead.industry ||
                      "Business"}
                  </div>
                  <h3 className="mt-2 text-lg font-semibold leading-tight">
                    {lead.name}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <div className="rounded-xl bg-emerald-500/15 px-3 py-2 text-sm text-emerald-200">
                    Score{" "}
                    {lead.lead_score ||
                      60}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onSave(
                        lead,
                        key
                      )
                    }
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-3 text-sm font-medium text-black transition hover:bg-white/90"
                  >
                    {saved[key] ===
                    "Saved" ? (
                      <Check
                        size={16}
                      />
                    ) : (
                      <Save
                        size={16}
                      />
                    )}
                    {saved[key] ||
                      "Save"}
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-2 text-sm md:grid-cols-2">
                {lead.phone && (
                  <a
                    href={`tel:${lead.phone}`}
                    className="rounded-xl bg-white/[0.04] px-3 py-2 text-white/75"
                  >
                    Phone: {lead.phone}
                  </a>
                )}

                {lead.website && (
                  <a
                    href={
                      lead.website
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-w-0 items-center gap-2 rounded-xl bg-white/[0.04] px-3 py-2 text-blue-200"
                  >
                    <ExternalLink
                      size={15}
                    />
                    <span className="truncate">
                      {lead.website}
                    </span>
                  </a>
                )}

                {(lead.address ||
                  lead.city ||
                  lead.state) && (
                  <div className="flex items-center gap-2 rounded-xl bg-white/[0.04] px-3 py-2 text-white/70">
                    <MapPin
                      size={15}
                    />
                    <span>
                      {lead.address ||
                        [
                          lead.city,
                          lead.state,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                    </span>
                  </div>
                )}

                {(lead.google_rating ||
                  lead.review_count) && (
                  <div className="flex items-center gap-2 rounded-xl bg-white/[0.04] px-3 py-2 text-yellow-200">
                    <Star
                      size={15}
                    />
                    <span>
                      {lead.google_rating ||
                        "N/A"}{" "}
                      rating
                      {lead.review_count
                        ? `, ${lead.review_count} reviews`
                        : ""}
                    </span>
                  </div>
                )}
              </div>

              {lead.score_reason && (
                <div className="mt-3 rounded-xl bg-white/[0.03] px-3 py-2 text-sm text-white/60">
                  {lead.score_reason}
                </div>
              )}
            </article>
          );
        }
      )}
    </div>
  );
}
