"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function MarkdownMessage({
  content,
}: {
  content: string;
}) {
  return (
    <ReactMarkdown
      remarkPlugins={[
        remarkGfm,
      ]}
      components={{
        img: (
          props
        ) => (
          <img
            {...props}
            loading="lazy"
            className="rounded-2xl max-w-full"
            alt=""
          />
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
