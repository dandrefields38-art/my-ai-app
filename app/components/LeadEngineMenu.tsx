"use client";

import {
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import {
  BarChart3,
  ChevronDown,
  Download,
  LayoutDashboard,
  Search,
  Target,
  Users,
} from "lucide-react";

type LeadEngineMenuProps = {
  compact?: boolean;
};

const menuItems = [
  {
    label: "Search Leads",
    href: "/lead-engine",
    icon: Search,
  },
  {
    label: "Lead Dashboard",
    href: "/lead-engine",
    icon: LayoutDashboard,
  },
  {
    label: "Saved Leads",
    href: "/leads",
    icon: Users,
  },
  {
    label: "Export Leads",
    href: "/leads?export=1",
    icon: Download,
  },
];

const futureItems = [
  {
    label: "Analytics",
    icon: BarChart3,
  },
  {
    label: "CRM",
    icon: LayoutDashboard,
  },
];

export default function LeadEngineMenu({
  compact = false,
}: LeadEngineMenuProps) {
  const [expanded, setExpanded] =
    useState(true);

  useEffect(() => {
    const stored =
      window.localStorage.getItem(
        "lead-engine-menu-expanded"
      );

    if (stored) {
      setExpanded(
        stored === "true"
      );
    }
  }, []);

  const toggleExpanded =
    () => {
      setExpanded(
        (
          current
        ) => {
          const next =
            !current;

          window.localStorage.setItem(
            "lead-engine-menu-expanded",
            String(next)
          );

          return next;
        }
      );
    };

  return (
    <div
      className={
        compact
          ? "rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-2"
          : "mt-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-2"
      }
    >
      <button
        type="button"
        onClick={
          toggleExpanded
        }
        className="flex h-12 w-full items-center justify-between rounded-xl px-4 text-left text-emerald-100 transition hover:bg-emerald-400/10"
        aria-expanded={
          expanded
        }
      >
        <span className="flex items-center gap-3">
          <Target size={18} />
          <span className="font-medium">
            Lead Engine
          </span>
        </span>

        <ChevronDown
          size={18}
          className={`transition ${
            expanded
              ? "rotate-180"
              : ""
          }`}
        />
      </button>

      {expanded && (
        <div className="mt-2 space-y-1">
          {menuItems.map(
            (
              item
            ) => {
              const Icon =
                item.icon;

              return (
                <Link
                  key={
                    item.label
                  }
                  href={
                    item.href
                  }
                  className="flex h-10 items-center gap-3 rounded-xl px-4 text-sm text-white/75 transition hover:bg-white/[0.07] hover:text-white"
                >
                  <Icon
                    size={16}
                    className="text-emerald-200/80"
                  />
                  {item.label}
                </Link>
              );
            }
          )}

          <div className="my-2 h-px bg-white/10" />

          <Link
            href="/lead-engine/intelligence"
            className="flex h-10 items-center gap-3 rounded-xl px-4 text-sm text-white/75 transition hover:bg-white/[0.07] hover:text-white"
          >
            <Target
              size={16}
              className="text-emerald-200/80"
            />
            Lead Intelligence
          </Link>

          {futureItems.map(
            (
              item
            ) => {
              const Icon =
                item.icon;

              return (
                <div
                  key={
                    item.label
                  }
                  className="flex h-9 items-center gap-3 rounded-xl px-4 text-sm text-white/35"
                  title="Coming soon"
                >
                  <Icon
                    size={15}
                  />
                  {item.label}
                </div>
              );
            }
          )}
        </div>
      )}
    </div>
  );
}
