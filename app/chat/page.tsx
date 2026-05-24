"use client";

import { useEffect, useRef, useState } from "react";
import Sidebar from "../components/Sidebar";
import { supabase } from "@/lib/supabase";
import { useUser } from "@clerk/nextjs";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

import { Menu, X } from "lucide-react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type Chat = {
  id: string;
  title: string;
};

const FREE_LIMIT = 25;

export default function ChatPage() {
  const { user } = useUser();

  const [chatId, setChatId] =
    useState<string | null>(
      null
    );

  const [chats, setChats] =
    useState<Chat[]>([]);

  const [messages, setMessages] =
    useState<Message[]>([]);

  const [input, setInput] =
    useState("");

  const [isPro, setIsPro] =
    useState(false);

  const [
    messageCount,
    setMessageCount,
  ] = useState(0);

  const [
    sidebarOpen,
    setSidebarOpen,
  ] = useState(false);

  const bottomRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const messagesLeft =
    Math.max(
      FREE_LIMIT -
        messageCount,
      0
    );

  const isLocked =
    !isPro &&
    messageCount >=
      FREE_LIMIT;

  useEffect(() => {
    bottomRef.current?.scrollIntoView(
      {
        behavior: "smooth",
      }
    );
  }, [messages]);

  useEffect(() => {
    const loadProfile =
      async () => {
        if (!user?.id)
          return;

        const { data } =
          await supabase
            .from("profiles")
            .select(
              "is_pro, message_count"
            )
            .eq(
              "clerk_user_id",
              user.id
            )
            .single();

        setIsPro(
          data?.is_pro ||
            false
        );

        setMessageCount(
          data?.message_count ||
            0
        );
      };

    loadProfile();
  }, [user?.id]);

  useEffect(() => {
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

        if (data)
          setChats(data);
      };

    loadChats();
  }, []);

  useEffect(() => {
    const loadMessages =
      async () => {
        if (!chatId)
          return;

        const { data } =
          await supabase
            .from("messages")
            .select("*")
            .eq(
              "chat_id",
              chatId
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
              (
                m: any
              ) => ({
                role: m.role,
                content:
                  m.content,
              })
            )
          );
        }
      };

    loadMessages();
  }, [chatId]);

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

        setSidebarOpen(
          false
        );
      }
    };

  const sendMessage =
    async () => {
      if (
        !input.trim() ||
        !chatId ||
        isLocked
      )
        return;

      const text = input;

      setInput("");

      setMessages(
        (prev) => [
          ...prev,
          {
            role: "user",
            content:
              text,
          },
        ]
      );

      setMessages(
        (prev) => [
          ...prev,
          {
            role:
              "assistant",
            content: "",
          },
        ]
      );

      try {
        const res =
          await fetch(
            "/api/chat",
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify(
                {
                  message:
                    text,
                }
              ),
            }
          );

        if (
          res.status ===
          403
        ) {
          setMessages(
            (prev) => {
              const updated =
                [
                  ...prev,
                ];

              updated[
                updated.length -
                  1
              ] = {
                role:
                  "assistant",

                content:
                  "Free limit reached. Upgrade to Pro.",
              };

              return updated;
            }
          );

          setMessageCount(
            FREE_LIMIT
          );

          return;
        }

        const reader =
          res.body?.getReader();

        if (!reader)
          return;

        const decoder =
          new TextDecoder();

        let fullReply =
          "";

        while (true) {
          const {
            done,
            value,
          } =
            await reader.read();

          if (done)
            break;

          const chunk =
            decoder.decode(
              value
            );

          fullReply +=
            chunk;

          setMessages(
            (prev) => {
              const updated =
                [
                  ...prev,
                ];

              updated[
                updated.length -
                  1
              ] = {
                role:
                  "assistant",

                content:
                  fullReply,
              };

              return updated;
            }
          );
        }

        if (!isPro) {
          setMessageCount(
            (
              prev
            ) =>
              prev + 1
          );
        }

        supabase
          .from(
            "messages"
          )
          .insert([
            {
              chat_id:
                chatId,
              role:
                "user",
              content:
                text,
            },

            {
              chat_id:
                chatId,
              role:
                "assistant",
              content:
                fullReply,
            },
          ]);
      } catch (err) {
        console.log(err);

        setMessages(
          (prev) => [
            ...prev,
            {
              role:
                "assistant",
              content:
                "Request failed",
            },
          ]
        );
      }
    };

  return (
    <div className="flex h-screen overflow-hidden text-white bg-[#050505]">
      {/* SIDEBAR OVERLAY */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() =>
            setSidebarOpen(
              false
            )
          }
        />
      )}

      {/* SIDEBAR */}
      <div
        className={`fixed md:relative z-50 h-full transition-transform duration-300 ${
          sidebarOpen
            ? "translate-x-0"
            : "-translate-x-full"
        } md:translate-x-0`}
      >
        <Sidebar
          chats={chats}
          currentChatId={
            chatId
          }
          setCurrentChatId={(
            id
          ) => {
            setChatId(
              id
            );

            setSidebarOpen(
              false
            );
          }}
          createNewChat={
            createChat
          }
          setInput={
            setInput
          }
        />
      </div>

      {/* MAIN */}
      <div className="flex flex-col flex-1 w-full bg-gradient-to-b from-purple-500/[0.03] to-transparent">
        {/* HEADER */}
        <div className="h-20 px-6 border-b border-white/[0.03] flex items-center justify-between backdrop-blur-xl bg-white/[0.02]">
          <div className="flex items-center gap-4">
            <button
              onClick={() =>
                setSidebarOpen(
                  !sidebarOpen
                )
              }
              className="md:hidden"
            >
              {sidebarOpen ? (
                <X />
              ) : (
                <Menu />
              )}
            </button>

            <div>
              <h1 className="text-[24px] font-semibold tracking-tight">
                Inquire
              </h1>

              <p className="text-xs text-white/35 mt-1">
                AI Workspace
              </p>
            </div>
          </div>

          <div
            className={`text-xs font-medium px-4 py-2 rounded-full ${
              isPro
                ? "bg-purple-500/20 text-purple-200"
                : "bg-white/[0.05] text-white/60"
            }`}
          >
            {isPro
              ? "PRO"
              : `${messagesLeft} left`}
          </div>
        </div>

        {/* CHAT */}
        <div className="flex-1 overflow-y-auto px-6 py-8 md:px-10 space-y-6">
          {!chatId && (
            <div className="text-white/30 text-center mt-20">
              Create a chat
              to begin
            </div>
          )}

          {messages.map(
            (m, i) => (
              <div
                key={i}
                className={`max-w-3xl px-5 py-4 rounded-[24px] whitespace-pre-wrap ${
                  m.role ===
                  "user"
                    ? "bg-purple-500/20 border border-purple-400/10 ml-auto backdrop-blur-xl"
                    : "bg-white/[0.04] border border-white/[0.03] backdrop-blur-xl"
                }`}
              >
                {m.role ===
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
                        } =
                          props;

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
                          <code className="bg-black/40 px-1 rounded">
                            {
                              children
                            }
                          </code>
                        );
                      },
                    }}
                  >
                    {
                      m.content
                    }
                  </ReactMarkdown>
                ) : (
                  m.content
                )}
              </div>
            )
          )}

          <div
            ref={bottomRef}
          />
        </div>

        {/* INPUT */}
        <div className="p-5 border-t border-white/[0.03] bg-white/[0.02] backdrop-blur-xl flex gap-3">
          <input
            value={input}
            disabled={
              isLocked
            }
            onChange={(e) =>
              setInput(
                e.target
                  .value
              )
            }
            placeholder={
              isLocked
                ? "Free limit reached"
                : "Message Inquire..."
            }
            className="flex-1 bg-white/[0.04] border border-white/[0.03] rounded-[20px] px-4 py-3 disabled:opacity-50 outline-none"
            onKeyDown={(
              e
            ) => {
              if (
                e.key ===
                "Enter"
              )
                sendMessage();
            }}
          />

          <button
            onClick={
              sendMessage
            }
            disabled={
              isLocked
            }
            className="bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/10 px-5 py-3 rounded-[20px] text-purple-200 transition disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}