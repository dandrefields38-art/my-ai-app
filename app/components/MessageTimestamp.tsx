"use client";

import {
  memo,
  useEffect,
  useState,
} from "react";

import {
  getBrowserTimeZone,
} from "@/lib/dateTime";
import {
  formatFullMessageStamp,
  formatMessageStamp,
} from "@/lib/messageTime";

const MessageTimestamp = memo(
  function MessageTimestamp({
    timestamp,
    align = "left",
    tone = "muted",
  }: {
    timestamp: string;
    align?: "left" | "right";
    tone?: "muted" | "dark";
  }) {
    const [showFull, setShowFull] =
      useState(false);
    const [timeZone, setTimeZone] =
      useState<string | null>(
        null
      );

    useEffect(() => {
      setTimeZone(
        getBrowserTimeZone()
      );
    }, []);

    const formatOptions = {
      timeZone,
    };
    const full =
      formatFullMessageStamp(
        timestamp,
        formatOptions
      );
    const stamp =
      formatMessageStamp(
        timestamp,
        formatOptions
      );

    return (
      <button
        type="button"
        title={full}
        aria-label={full}
        onClick={() =>
          setShowFull(
            (current) =>
              !current
          )
        }
        className={`mt-2 block text-[11px] leading-none transition md:hover:opacity-100 ${
          align === "right"
            ? "ml-auto text-right"
            : "mr-auto text-left"
        } ${
          tone === "dark"
            ? "text-black/45"
            : "text-white/38"
        } ${
          showFull
            ? "opacity-100"
            : "opacity-70"
        }`}
      >
        <span className="md:hidden">
          {showFull
            ? full
            : stamp}
        </span>
        <span className="hidden md:inline">
          {stamp}
        </span>
      </button>
    );
  }
);

export default MessageTimestamp;
