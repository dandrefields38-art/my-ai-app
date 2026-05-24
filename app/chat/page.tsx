"use client";

import { useEffect, useRef, useState } from "react";

import {
  Sparkles,
  Paperclip,
  Mic,
  Send,
  Pencil,
  Clock3,
} from "lucide-react";

import { motion } from "framer-motion";

import ReactMarkdown from "react-markdown";

import remarkGfm from "remark-gfm";

import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";

import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function ChatPage() {
  const [input, setInput] =
    useState("");

  const [messages, setMessages] =
    useState<Message[]>([]);

  const bottomRef =
    useRef<HTMLDivElement | null>(
      null
    );

  useEffect(() => {
    bottomRef.current?.scrollIntoView(
      {
        behavior: "smooth",
      }
    );
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const text = input;

    setInput("");

    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: text,
      },
      {
        role: "assistant",
        content: "",
      },
    ]);

    try {
      const res = await fetch(
        "/api/chat",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            message: text,
          }),
        }
      );

      const reader =
        res.body?.getReader();

      if (!reader) return;

      const decoder =
        new TextDecoder();

      let fullReply = "";

      while (true) {
        const {
          done,
          value,
        } = await reader.read();

        if (done) break;

        const chunk =
          decoder.decode(value);

        fullReply += chunk;

        setMessages((prev) => {
          const updated = [
            ...prev,
          ];

          updated[
            updated.length - 1
          ] = {
            role: "assistant",
            content: fullReply,
          };

          return updated;
        });
      }
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <main className="h-screen w-screen overflow-hidden bg-[#050505] text-white">
      {/* BACKGROUND */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-[-250px] left-1/2 -translate-x-1/2 w-[1000px] h-[1000px] rounded-full bg-purple-600/20 blur-[180px]" />

        <div className="absolute bottom-[-400px] right-[-200px] w-[900px] h-[900px] rounded-full bg-fuchsia-500/10 blur-[180px]" />
      </div>

      {/* APP */}
      <div className="relative flex h-screen p-4 gap-4">
        {/* SIDEBAR */}
        <aside className="w-[290px] rounded-[32px] border border-white/10 bg-white/[0.03] backdrop-blur-3xl overflow-hidden flex flex-col justify-between shadow-2xl">
          <div>
            {/* BRAND */}
            <div className="px-6 pt-7">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-3xl bg-gradient-to-br from-purple-400 to-purple-700 flex items-center justify-center shadow-[0_0_40px_rgba(120,50,255,0.45)]">
                  <Sparkles
                    size={24}
                    className="text-white"
                  />
                </div>

                <div>
                  <h1 className="text-3xl font-semibold tracking-tight">
                    Inquire
                  </h1>

                  <p className="text-white/40 text-sm mt-1">
                    AI Workspace
                  </p>
                </div>
              </div>

              <button className="mt-8 w-full h-16 rounded-3xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] transition-all duration-300 flex items-center gap-4 px-6 text-lg">
                <Pencil size={20} />
                New Chat
              </button>
            </div>
          </div>

          {/* USER */}
          <div className="p-4">
            <div className="rounded-3xl bg-white/[0.03] border border-white/5 px-4 py-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-purple-700 flex items-center justify-center font-semibold">
                D
              </div>

              <div>
                <div className="font-medium">
                  Dre
                </div>

                <div className="text-white/40 text-sm">
                  Inquire Pro
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <section className="flex-1 rounded-[38px] border border-white/10 bg-white/[0.03] backdrop-blur-3xl relative overflow-hidden shadow-2xl">
          {/* INNER GLOW */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(120,50,255,0.12),transparent_45%)]" />

          {/* HEADER */}
          <div className="absolute top-6 right-6 z-20">
            <button className="h-14 px-6 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] transition-all duration-300 flex items-center gap-3 text-lg text-white/70">
              <Clock3 size={18} />
              History
            </button>
          </div>

          {/* HERO */}
          {messages.length === 0 && (
            <motion.div
              initial={{
                opacity: 0,
                y: 30,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                duration: 0.8,
              }}
              className="h-full flex flex-col items-center justify-center px-10 -mt-20"
            >
              <div className="w-24 h-24 rounded-[32px] bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shadow-[0_0_80px_rgba(120,50,255,0.35)] mb-10">
                <Sparkles
                  size={40}
                  className="text-purple-300"
                />
              </div>

              <h1 className="text-7xl font-semibold leading-[1.02] tracking-tight text-center max-w-5xl">
                What can I help you
                accomplish today?
              </h1>

              <p className="mt-8 text-2xl text-white/40 text-center max-w-2xl leading-relaxed">
                Ask anything. Build
                anything. Automate
                everything.
              </p>
            </motion.div>
          )}

          {/* CHAT */}
          {messages.length > 0 && (
            <div className="h-full overflow-y-auto px-10 pt-24 pb-40">
              <div className="max-w-4xl mx-auto space-y-8">
                {messages.map(
                  (message, i) => (
                    <motion.div
                      key={i}
                      initial={{
                        opacity: 0,
                        y: 20,
                      }}
                      animate={{
                        opacity: 1,
                        y: 0,
                      }}
                      className={`flex ${
                        message.role ===
                        "user"
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-[28px] px-6 py-5 text-lg leading-relaxed ${
                          message.role ===
                          "user"
                            ? "bg-white text-black"
                            : "bg-white/[0.05] border border-white/10"
                        }`}
                      >
                        {message.role ===
                        "assistant" ? (
                          <ReactMarkdown
                            remarkPlugins={[
                              remarkGfm,
                            ]}
                            components={{
                              code(
                                props
                              ) {
                                const {
                                  children,
                                  className,
                                } = props;

                                const match =
                                  /language-(\w+)/.exec(
                                    className ||
                                      ""
                                  );

                                return match ? (
                                  <SyntaxHighlighter
                                    style={
                                      vscDarkPlus
                                    }
                                    language={
                                      match[1]
                                    }
                                    PreTag="div"
                                  >
                                    {String(
                                      children
                                    ).replace(
                                      /\n$/,
                                      ""
                                    )}
                                  </SyntaxHighlighter>
                                ) : (
                                  <code className="bg-black/30 px-1 rounded">
                                    {
                                      children
                                    }
                                  </code>
                                );
                              },
                            }}
                          >
                            {
                              message.content
                            }
                          </ReactMarkdown>
                        ) : (
                          message.content
                        )}
                      </div>
                    </motion.div>
                  )
                )}

                <div ref={bottomRef} />
              </div>
            </div>
          )}

          {/* INPUT */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[78%]">
            <div className="rounded-[34px] border border-white/10 bg-[#111116]/95 backdrop-blur-3xl shadow-[0_10px_80px_rgba(0,0,0,0.45)] px-6 py-5">
              <textarea
                value={input}
                onChange={(e) =>
                  setInput(
                    e.target.value
                  )
                }
                placeholder="Ask Inquire anything..."
                className="w-full bg-transparent outline-none resize-none text-xl placeholder:text-white/30 min-h-[70px]"
                onKeyDown={(e) => {
                  if (
                    e.key ===
                      "Enter" &&
                    !e.shiftKey
                  ) {
                    e.preventDefault();

                    sendMessage();
                  }
                }}
              />

              <div className="flex items-center justify-between mt-5">
                {/* LEFT */}
                <div className="flex items-center gap-3">
                  <button className="w-14 h-14 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 flex items-center justify-center transition-all duration-300">
                    <Paperclip size={20} />
                  </button>

                  <button className="w-14 h-14 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 flex items-center justify-center transition-all duration-300">
                    <Mic size={20} />
                  </button>

                  <button className="w-14 h-14 rounded-2xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/20 flex items-center justify-center transition-all duration-300">
                    <Sparkles size={20} />
                  </button>
                </div>

                {/* SEND */}
                <button
                  onClick={
                    sendMessage
                  }
                  className="w-16 h-16 rounded-2xl bg-white text-black flex items-center justify-center hover:scale-105 transition-all duration-300"
                >
                  <Send size={22} />
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}