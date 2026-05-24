"use client";

import { useState } from "react";

import {
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Mail,
  Phone,
} from "lucide-react";

type Contact = {
  name?: string;

  title?: string;

  email?: string;

  linkedin?: string;
};

type Lead = {
  id?: string;

  name: string;

  industry?: string;

  address?: string;

  rating?: string;

  status?: string;

  website?: string;

  phone?: string;

  employees?: number;

  lead_score?: number;

  contacts?: Contact[];
};

type Props = {
  leads: Lead[];

  open: boolean;
};

export default function LeadPanel({
  leads,
  open,
}: Props) {
  const [expandedLead, setExpandedLead] =
    useState<number | null>(
      null
    );

  const copyText =
    async (
      text?: string
    ) => {
      if (!text) return;

      await navigator.clipboard.writeText(
        text
      );
    };

  return (
    <div
      className={`fixed right-0 top-0 h-screen w-[420px] bg-[#111111] border-l border-white/10 transition-transform duration-300 z-40 ${
        open
          ? "translate-x-0"
          : "translate-x-full"
      }`}
    >
      {/* HEADER */}
      <div className="p-5 border-b border-white/10 backdrop-blur-xl">
        <h2 className="text-white text-xl font-semibold">
          Lead Workspace
        </h2>

        <p className="text-white/50 text-sm mt-1">
          AI-enriched leads &
          decision-makers
        </p>
      </div>

      {/* CONTENT */}
      <div className="overflow-y-auto h-[calc(100vh-90px)] p-4 space-y-4">
        {leads.length === 0 ? (
          <div className="text-white/40 text-sm">
            No leads yet.
          </div>
        ) : (
          leads.map(
            (
              lead,
              index
            ) => {
              const isExpanded =
                expandedLead ===
                index;

              return (
                <div
                  key={index}
                  className="bg-white/[0.04] border border-white/10 rounded-3xl p-5 backdrop-blur-xl"
                >
                  {/* TOP */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-white font-semibold text-lg leading-tight">
                        {
                          lead.name
                        }
                      </h3>

                      <p className="text-white/50 text-sm mt-1">
                        {
                          lead.industry
                        }
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <select
                        defaultValue={
                          lead.status ||
                          "New"
                        }
                        className="bg-white/10 border border-white/10 text-white text-xs rounded-full px-3 py-1 outline-none"
                      >
                        <option>
                          New
                        </option>

                        <option>
                          Contacted
                        </option>

                        <option>
                          Qualified
                        </option>

                        <option>
                          Closed
                        </option>
                      </select>

                      <div className="bg-green-500/20 text-green-400 text-xs px-3 py-1 rounded-full">
                        Score:{" "}
                        {lead.lead_score ||
                          50}
                      </div>
                    </div>
                  </div>

                  {/* INFO */}
                  <div className="mt-5 space-y-3 text-sm">
                    {lead.address && (
                      <div className="text-white/70">
                        📍{" "}
                        {
                          lead.address
                        }
                      </div>
                    )}

                    {lead.phone && (
                      <div className="flex items-center justify-between bg-white/[0.03] rounded-xl px-3 py-2">
                        <div className="flex items-center gap-2 text-white/80">
                          <Phone
                            size={
                              14
                            }
                          />

                          {
                            lead.phone
                          }
                        </div>

                        <button
                          onClick={() =>
                            copyText(
                              lead.phone
                            )
                          }
                          className="text-white/40 hover:text-white"
                        >
                          <Copy
                            size={
                              14
                            }
                          />
                        </button>
                      </div>
                    )}

                    {lead.website && (
                      <a
                        href={
                          lead.website
                        }
                        target="_blank"
                        className="flex items-center justify-between bg-white/[0.03] rounded-xl px-3 py-2 text-blue-400"
                      >
                        <span className="truncate">
                          {
                            lead.website
                          }
                        </span>

                        <ExternalLink
                          size={
                            14
                          }
                        />
                      </a>
                    )}

                    {lead.rating && (
                      <div className="text-yellow-400">
                        ⭐{" "}
                        {
                          lead.rating
                        }
                      </div>
                    )}

                    {lead.employees && (
                      <div className="text-white/70">
                        👥{" "}
                        {
                          lead.employees
                        }{" "}
                        employees
                      </div>
                    )}
                  </div>

                  {/* ACTIONS */}
                  <div className="mt-5 flex gap-2">
                    <button className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-sm py-2 rounded-xl transition">
                      Generate Outreach
                    </button>

                    <button
                      onClick={() =>
                        setExpandedLead(
                          isExpanded
                            ? null
                            : index
                        )
                      }
                      className="bg-white/10 hover:bg-white/20 p-2 rounded-xl transition"
                    >
                      {isExpanded ? (
                        <ChevronUp
                          size={
                            18
                          }
                        />
                      ) : (
                        <ChevronDown
                          size={
                            18
                          }
                        />
                      )}
                    </button>
                  </div>

                  {/* CONTACTS */}
                  {isExpanded &&
                    lead.contacts &&
                    lead.contacts
                      .length >
                      0 && (
                      <div className="mt-5 border-t border-white/10 pt-4 space-y-3">
                        <div className="text-white text-sm font-medium">
                          Decision Makers
                        </div>

                        {lead.contacts.map(
                          (
                            contact,
                            idx
                          ) => (
                            <div
                              key={
                                idx
                              }
                              className="bg-black/20 border border-white/5 rounded-2xl p-4"
                            >
                              <div className="text-white font-medium text-sm">
                                {
                                  contact.name
                                }
                              </div>

                              <div className="text-white/50 text-xs mt-1">
                                {
                                  contact.title
                                }
                              </div>

                              {contact.email && (
                                <div className="flex items-center justify-between mt-3 bg-white/[0.03] rounded-xl px-3 py-2">
                                  <div className="flex items-center gap-2 text-blue-400 text-xs">
                                    <Mail
                                      size={
                                        13
                                      }
                                    />

                                    {
                                      contact.email
                                    }
                                  </div>

                                  <button
                                    onClick={() =>
                                      copyText(
                                        contact.email
                                      )
                                    }
                                    className="text-white/40 hover:text-white"
                                  >
                                    <Copy
                                      size={
                                        13
                                      }
                                    />
                                  </button>
                                </div>
                              )}

                              {contact.linkedin && (
                                <a
                                  href={
                                    contact.linkedin
                                  }
                                  target="_blank"
                                  className="flex items-center justify-between mt-3 bg-white/[0.03] rounded-xl px-3 py-2 text-blue-500 text-xs"
                                >
                                  <span className="truncate">
                                    LinkedIn
                                    Profile
                                  </span>

                                  <ExternalLink
                                    size={
                                      13
                                    }
                                  />
                                </a>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    )}
                </div>
              );
            }
          )
        )}
      </div>
    </div>
  );
}