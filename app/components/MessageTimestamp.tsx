"use client";

import {
  memo,
  useState,
} from "react";

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
    const full =
      formatFullMessageStamp(
        timestamp
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
            : formatMessageStamp(
                timestamp
              )}
        </span>
        <span className="hidden md:inline">
          {formatMessageStamp(
            timestamp
          )}
        </span>
      </button>
    );
  }
);

export default MessageTimestamp;
