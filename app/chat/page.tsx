"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  Sparkles,
  Paperclip,
  Mic,
  Send,
  Pencil,
  MessageSquare,
} from "lucide-react";

import { motion } from "framer-motion";

import ReactMarkdown from "react-markdown";

import remarkGfm from "remark-gfm";

import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";

import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

import { supabase } from "@/lib/supabase";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type Chat = {
  id: string;
  title: string;
};

export default function ChatPage() {
  const [input, setInput] =
    useState("");

  const [messages, setMessages] =
    useState<Message[]>([]);

  const [chatId, setChatId] =
    useState<string | null>(
      null
    );

  const [chats, setChats] =
    useState<Chat[]>([]);

  const [loading, setLoading] =
    useState(false);

  const bottomRef =
    useRef<HTMLDivElement | null>(
      null
    );

  // ====================================
  // AUTO SCROLL
  // ====================================

  useEffect(() => {
    bottomRef.current?.scrollIntoView(
      {
        behavior: "smooth",
      }
    );
  }, [messages]);

  // ====================================
  // LOAD CHATS
  // ====================================

  useEffect(() => {
    loadChats();
  }, []);

  const loadChats =
    async () => {
      const { data } =
        await supabase
          .from("chats")
          .select("*")
          .order(
            "created_at",
            {
              ascending:
                false,
            }
          );

      if (data) {
        setChats(data);

        if (
          data.length > 0
        ) {
          setChatId(
            data[0].id
          );
        }
      }
    };

  // ====================================
  // LOAD MESSAGES
  // ====================================

  useEffect(() => {
    if (!chatId) return;

    loadMessages(chatId);
  }, [chatId]);

  const loadMessages =
    async (
      selectedChatId: string
    ) => {
      const { data } =
        await supabase
          .from("messages")
          .select("*")
          .eq(
            "chat_id",
            selectedChatId
          )
          .order(
            "created_at",
            {
              ascending:
                true,
            }
          );

      if (data) {
        setMessages(
          data.map(
            (m: any) => ({
              role: m.role,
              content:
                m.content,
            })
          )
        );
      }
    };

  // ====================================
  // CREATE CHAT
  // ====================================

  const createChat =
    async () => {
      const { data } =
        await supabase
          .from("chats")
          .insert([
            {
              title:
                "New Chat",
            },
          ])
          .select()
          .single();

      if (data) {
        setChats(
          (prev) => [
            data,
            ...prev,
          ]
        );

        setChatId(data.id);

        setMessages([]);
      }
    };

  // ====================================
  // SEND MESSAGE
  // ====================================

  const sendMessage = async () => {
    if (!input.trim()) return;

    setLoading(true);

    let currentChatId = chatId;

    if (!currentChatId) {
      const { data } =
        await supabase
          .from("chats")
          .insert([
            {
              title: input.slice(
                0,
                30
              ),
            },
          ])
          .select()
          .single();

      if (!data) return;

      currentChatId = data.id;

      setChatId(data.id);

      setChats((prev) => [
        data,
        ...prev,
      ]);
    }

    const text = input;

    const updatedMessages = [
      ...messages,
      {
        role: "user" as const,
        content: text,
      },
    ];

    setMessages(updatedMessages);

    setInput("");

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
            messages:
              updatedMessages,
          }),
        }
      );

      const data =
        await res.json();

      // FIXED RESPONSE
      const reply =
        data.reply ||
        "No response.";

      setMessages([
        ...updatedMessages,
        {
          role: "assistant",
          content: reply,
        },
      ]);

      await supabase
        .from("messages")
        .insert([
          {
            chat_id:
              currentChatId,

            role: "user",

            content: text,
          },

          {
            chat_id:
              currentChatId,

            role:
              "assistant",

            content: reply,
          },
        ]);
    } catch (err) {
      console.log(err);
    }

    setLoading(false);
  };

  return (
    <main className="h-screen w-screen overflow-hidden bg-[#050505] text-white">
      {/* BACKGROUND */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-[-250px] left-1/2 -translate-x-1/2 w-[1000px] h-[1000px] rounded-full bg-purple-600/20 blur-[180px]" />

        <div className="absolute bottom-[-400px] right-[-200px] w-[900px] h-[900px] rounded-full bg-fuchsia-500/10 blur-[180px]" />
      </div>

      <div className="relative flex h-screen p-4 gap-4">
        {/* SIDEBAR */}
        <aside className="w-[290px] rounded-[32px] border border-white/10 bg-white/[0.03] backdrop-blur-3xl overflow-hidden flex flex-col justify-between shadow-2xl">
          <div>
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

              <button
                onClick={
                  createChat
                }
                className="mt-8 w-full h-16 rounded-3xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] transition-all duration-300 flex items-center gap-4 px-6 text-lg"
              >
                <Pencil size={20} />
                New Chat
              </button>

              <div className="mt-8 space-y-2">
                {chats.map(
                  (chat) => (
                    <button
                      key={chat.id}
                      onClick={() =>
                        setChatId(
                          chat.id
                        )
                      }
                      className={`w-full flex items-center gap-3 px-4 py-4 rounded-2xl transition text-left ${
                        chatId ===
                        chat.id
                          ? "bg-purple-500/20"
                          : "hover:bg-white/[0.04]"
                      }`}
                    >
                      <MessageSquare
                        size={16}
                      />

                      <span className="truncate">
                        {
                          chat.title
                        }
                      </span>
                    </button>
                  )
                )}
              </div>
            </div>
          </div>

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
          <div className="h-full overflow-y-auto px-10 pt-24 pb-40">
            <div className="max-w-4xl mx-auto space-y-8">
              {messages.map(
                (
                  message,
                  i
                ) => (
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
                      className={`max-w-[80%] rounded-[28px] px-6 py-5 text-lg leading-relaxed whitespace-pre-wrap ${
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
                <div className="flex items-center gap-3">
                  <button className="w-14 h-14 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 flex items-center justify-center">
                    <Paperclip size={20} />
                  </button>

                  <button className="w-14 h-14 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 flex items-center justify-center">
                    <Mic size={20} />
                  </button>
                </div>

                <button
                  onClick={
                    sendMessage
                  }
                  disabled={loading}
                  className="w-16 h-16 rounded-2xl bg-white text-black flex items-center justify-center hover:scale-105 transition-all duration-300 disabled:opacity-50"
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