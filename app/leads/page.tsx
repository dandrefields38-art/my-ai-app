"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ArrowLeft,
  Download,
  ExternalLink,
  MapPin,
  Phone,
  Search,
  Trash2,
} from "lucide-react";

import {
  useRouter,
} from "next/navigation";

import Link from "next/link";

import { supabase } from "@/lib/supabase";

type SavedLead = {
  id: string;
  name: string;
  contact_name?: string;
  industry?: string;
  city?: string;
  state?: string;
  location?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  rating?: string;
  google_rating?: string;
  review_count?: number;
  status?: string;
  notes?: string;
  lead_score?: number;
  score_reason?: string;
  created_at?: string;
};

const statuses = [
  "All",
  "New",
  "Contacted",
  "Qualified",
  "Won",
  "Lost",
];

const csvValue = (
  value: unknown
) =>
  `"${String(value || "").replace(
    /"/g,
    '""'
  )}"`;

export default function LeadsPage() {
  const router =
    useRouter();
  const [leads, setLeads] =
    useState<SavedLead[]>([]);
  const [query, setQuery] =
    useState("");
  const [status, setStatus] =
    useState("All");
  const [loading, setLoading] =
    useState(true);
  const [deleteTarget, setDeleteTarget] =
    useState<SavedLead | null>(
      null
    );
  const exportTriggeredRef =
    useRef(false);

  const getAuthHeaders =
    async (): Promise<
      Record<string, string>
    > => {
      const {
        data: {
          session,
        },
      } =
        await supabase.auth.getSession();

      return session?.access_token
        ? {
            Authorization:
              `Bearer ${session.access_token}`,
          }
        : {};
    };

  const loadLeads =
    async () => {
      setLoading(true);

      try {
        const {
          data: {
            session,
          },
        } =
          await supabase.auth.getSession();

        if (!session) {
          router.push(
            "/login"
          );
          return;
        }

        const headers =
          await getAuthHeaders();
        const res =
          await fetch(
            "/api/leads",
            {
              headers,
            }
          );
        const data =
          await res.json();

        setLeads(
          data.leads || []
        );
      } catch (error) {
        console.log(
          "LOAD LEADS PAGE ERROR:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    loadLeads();
  }, []);

  const filteredLeads =
    useMemo(
      () =>
        leads.filter(
          (
            lead
          ) => {
            const haystack =
              [
                lead.name,
                lead.industry,
                lead.location,
                lead.address,
                lead.phone,
                lead.email,
                lead.website,
                lead.notes,
              ]
                .join(" ")
                .toLowerCase();
            const matchesSearch =
              !query ||
              haystack.includes(
                query.toLowerCase()
              );
            const matchesStatus =
              status ===
                "All" ||
              lead.status ===
                status;

            return (
              matchesSearch &&
              matchesStatus
            );
          }
        ),
      [
        leads,
        query,
        status,
      ]
    );

  const updateLead =
    async (
      id: string,
      updates: Partial<SavedLead>
    ) => {
      setLeads(
        (
          prev
        ) =>
          prev.map(
            (
              lead
            ) =>
              lead.id === id
                ? {
                    ...lead,
                    ...updates,
                  }
                : lead
          )
      );

      const headers =
        await getAuthHeaders();

      await fetch(
        "/api/leads",
        {
          method:
            "PATCH",
          headers: {
            "Content-Type":
              "application/json",
            ...headers,
          },
          body:
            JSON.stringify({
              id,
              ...updates,
            }),
        }
      );
    };

  const updateLeadLocally =
    (
      id: string,
      updates: Partial<SavedLead>
    ) => {
      setLeads(
        (
          prev
        ) =>
          prev.map(
            (
              lead
            ) =>
              lead.id === id
                ? {
                    ...lead,
                    ...updates,
                  }
                : lead
          )
      );
    };

  const deleteLead =
    async (
      id: string
    ) => {
      setLeads(
        (
          prev
        ) =>
          prev.filter(
            (
              lead
            ) =>
              lead.id !== id
          )
      );

      const headers =
        await getAuthHeaders();

      await fetch(
        "/api/leads",
        {
          method:
            "DELETE",
          headers: {
            "Content-Type":
              "application/json",
            ...headers,
          },
          body:
            JSON.stringify({
              id,
          }),
        }
      );

      setDeleteTarget(null);
    };

  const exportCsv =
    () => {
      const headers =
        [
          "Business Name",
          "Contact Name",
          "Phone",
          "Email",
          "Website",
          "Address",
          "Location",
          "Industry",
          "Google Rating",
          "Review Count",
          "Lead Score",
          "Lead Score Reason",
          "Status",
          "Notes",
        ];
      const rows =
        filteredLeads.map(
          (
            lead
          ) => [
            lead.name,
            lead.contact_name,
            lead.phone,
            lead.email,
            lead.website,
            lead.address,
            lead.location,
            lead.industry,
            lead.google_rating ||
              lead.rating,
            lead.review_count,
            lead.lead_score,
            lead.score_reason,
            lead.status,
            lead.notes,
          ]
        );
      const csv =
        [
          headers,
          ...rows,
        ]
          .map((row) =>
            row
              .map(csvValue)
              .join(",")
          )
          .join("\n");
      const blob =
        new Blob(
          [
            csv,
          ],
          {
            type:
              "text/csv;charset=utf-8;",
          }
        );
      const url =
        URL.createObjectURL(
          blob
        );
      const link =
        document.createElement(
          "a"
        );

      link.href =
        url;
      link.download =
        "saved-leads.csv";
      link.click();
      URL.revokeObjectURL(
        url
      );
    };

  useEffect(() => {
    if (
      loading ||
      exportTriggeredRef.current ||
      typeof window === "undefined"
    ) {
      return;
    }

    const params =
      new URLSearchParams(
        window.location.search
      );

    if (
      params.get("export") !==
      "1"
    ) {
      return;
    }

    exportTriggeredRef.current =
      true;
    exportCsv();
  }, [
    loading,
    filteredLeads,
  ]);

  return (
    <main className="h-screen overflow-y-auto bg-[#050505] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-5 px-4 py-5 md:px-8">
        <header className="flex flex-col gap-4 border-b border-white/10 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <Link
              href="/lead-engine"
              className="inline-flex items-center gap-2 text-sm text-white/55 hover:text-white"
            >
              <ArrowLeft size={16} />
              Back to Lead Engine
            </Link>

            <h1 className="mt-4 text-4xl font-semibold">
              Leads
            </h1>

            <p className="mt-2 text-white/45">
              Search, track, annotate, and export saved business leads.
            </p>
          </div>

          <button
            type="button"
            onClick={
              exportCsv
            }
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-4 font-medium text-black transition hover:bg-white/90"
          >
            <Download size={18} />
            Export CSV
          </button>
        </header>

        <section className="grid gap-3 md:grid-cols-[1fr_220px]">
          <label className="flex h-12 items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4">
            <Search
              size={18}
              className="text-white/40"
            />
            <input
              value={query}
              onChange={(event) =>
                setQuery(
                  event.target.value
                )
              }
              placeholder="Search saved leads"
              className="w-full bg-transparent text-white outline-none placeholder:text-white/35"
            />
          </label>

          <select
            value={status}
            onChange={(event) =>
              setStatus(
                event.target.value
              )
            }
            className="h-12 rounded-xl border border-white/10 bg-[#111116] px-4 text-white outline-none"
          >
            {statuses.map(
              (
                item
              ) => (
                <option
                  key={
                    item
                  }
                >
                  {item}
                </option>
              )
            )}
          </select>
        </section>

        {loading ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {[
              1,
              2,
              3,
              4,
            ].map(
              (
                item
              ) => (
                <div
                  key={
                    item
                  }
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
                >
                  <div className="skeleton h-4 w-28 rounded-lg" />
                  <div className="skeleton mt-3 h-7 w-56 rounded-xl" />
                  <div className="mt-5 grid gap-2">
                    <div className="skeleton h-10 rounded-xl" />
                    <div className="skeleton h-10 rounded-xl" />
                    <div className="skeleton h-24 rounded-xl" />
                  </div>
                </div>
              )
            )}
          </div>
        ) : filteredLeads.length ===
          0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-white/55">
            No saved leads match this view.
          </div>
        ) : (
          <section className="grid gap-4 lg:grid-cols-2">
            {filteredLeads.map(
              (
                lead
              ) => (
                <article
                  key={
                    lead.id
                  }
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-xs uppercase text-white/40">
                        {lead.industry ||
                          "Business"}
                      </div>
                      <h2 className="mt-1 text-xl font-semibold leading-tight">
                        {lead.name}
                      </h2>
                      {lead.contact_name && (
                        <div className="mt-2 text-sm text-white/55">
                          {lead.contact_name}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setDeleteTarget(
                          lead
                        )
                      }
                      aria-label="Delete lead"
                      title="Delete lead"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white/45 transition hover:bg-red-500/10 hover:text-red-200"
                    >
                      <Trash2
                        size={18}
                      />
                    </button>
                  </div>

                  <div className="mt-4 grid gap-2 text-sm text-white/70">
                    {lead.phone && (
                      <a
                        href={`tel:${lead.phone}`}
                        className="flex items-center gap-2 rounded-xl bg-white/[0.04] px-3 py-2"
                      >
                        <Phone
                          size={15}
                        />
                        {lead.phone}
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
                          {
                            lead.website
                          }
                        </span>
                      </a>
                    )}

                    {(lead.address ||
                      lead.location ||
                      lead.city ||
                      lead.state) && (
                      <div className="flex items-center gap-2 rounded-xl bg-white/[0.04] px-3 py-2">
                        <MapPin
                          size={15}
                        />
                        {lead.address ||
                          lead.location ||
                          [
                            lead.city,
                            lead.state,
                          ]
                            .filter(Boolean)
                            .join(", ")}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <select
                      value={
                        lead.status ||
                        "New"
                      }
                      onChange={(event) =>
                        updateLead(
                          lead.id,
                          {
                            status:
                              event.target
                                .value,
                          }
                        )
                      }
                      className="h-11 rounded-xl border border-white/10 bg-[#111116] px-3 text-sm outline-none"
                    >
                      {statuses
                        .filter(
                          (
                            item
                          ) =>
                            item !==
                            "All"
                        )
                        .map(
                          (
                            item
                          ) => (
                            <option
                              key={
                                item
                              }
                            >
                              {
                                item
                              }
                            </option>
                          )
                        )}
                    </select>

                    <div className="rounded-xl bg-emerald-500/15 px-3 py-2 text-sm text-emerald-200">
                      Score{" "}
                      {lead.lead_score ||
                        60}
                    </div>
                  </div>

                  <textarea
                    value={
                      lead.notes || ""
                    }
                    onChange={(event) =>
                      updateLeadLocally(
                        lead.id,
                        {
                          notes:
                            event.target
                              .value,
                        }
                      )
                    }
                    onBlur={(event) =>
                      updateLead(
                        lead.id,
                        {
                          notes:
                            event.target
                              .value,
                        }
                      )
                    }
                    placeholder="Notes"
                    className="mt-4 min-h-24 w-full resize-none rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white outline-none placeholder:text-white/35"
                  />
                </article>
              )
            )}
          </section>
        )}
      </div>
      {deleteTarget && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/65 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#111116] p-5 shadow-2xl shadow-black/50">
            <h2 className="text-xl font-semibold">
              Delete Lead
            </h2>
            <p className="mt-2 text-sm text-white/45">
              This will permanently remove this saved lead.
            </p>

            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
              <div className="text-xs uppercase text-white/35">
                Lead
              </div>
              <div className="mt-1 truncate font-medium text-white">
                {deleteTarget.name}
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() =>
                  setDeleteTarget(null)
                }
                className="h-11 rounded-2xl border border-white/10 px-4 text-white/70 transition hover:bg-white/[0.06] hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  deleteLead(
                    deleteTarget.id
                  )
                }
                className="h-11 rounded-2xl bg-red-500 px-5 font-medium text-white transition hover:bg-red-400"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
