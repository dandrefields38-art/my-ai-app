"use client";

import { useEffect, useRef, useState } from "react";
import Sidebar from "./components/Sidebar";
import { supabase } from "@/lib/supabase";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function Home() {
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  // auto scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // load chat messages
  useEffect(() => {
    const loadMessages = async () => {
      if (!chatId) return;

      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true });

      if (data) {
        setMessages(
          data.map((m: any) => ({
            role: m.role,
            content: m.content,
          }))
        );
      }
    };

    loadMessages();
  }, [chatId]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const text = input;

    setMessages((prev) => [
      ...prev,
      { role: "user", content: text },
    ]);

    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply || "No response",
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Something went wrong.",
        },
      ]);
    }

    setLoading(false);
  };

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-white">

      <Sidebar setChatId={setChatId} />

      {/* MAIN */}
      <div className="flex flex-col flex-1">

        {/* HEADER */}
        <div className="border-b border-white/10 p-4 text-sm text-white/70">
          ChatGPT-style AI Assistant
        </div>

        {/* CHAT */}
        <div className="flex-1 overflow-y-auto">

          <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">

            {messages.length === 0 && (
              <div className="text-center text-white/30 mt-32">
                Ask me anything...
              </div>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${
                  m.role === "user"
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                <div
                  className={`px-4 py-3 rounded-2xl max-w-[80%] text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-blue-600"
                      : "bg-white/10"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {/* typing indicator */}
            {loading && (
              <div className="flex justify-start">
                <div className="px-4 py-3 rounded-2xl bg-white/10 text-white/60 text-sm animate-pulse">
                  AI is thinking...
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </div>

        {/* INPUT */}
        <div className="border-t border-white/10 p-4">
          <div className="max-w-3xl mx-auto flex gap-2">

            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message..."
              className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter") sendMessage();
              }}
            />

            <button
              onClick={sendMessage}
              className="bg-blue-600 px-5 py-3 rounded-2xl hover:bg-blue-700"
            >
              Send
            </button>

          </div>
        </div>

      </div>
    </div>
  );
}