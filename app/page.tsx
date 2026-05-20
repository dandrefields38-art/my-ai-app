"use client";

import { useEffect, useState } from "react";
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

  // LOAD MESSAGES
  useEffect(() => {
    const loadMessages = async () => {
      if (!chatId) {
        setMessages([]);
        return;
      }

      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true });

      if (error) {
        console.log(error);
        return;
      }

      setMessages(
        ((data || []) as any[]).map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content,
        })) as Message[]
      );
    };

    loadMessages();
  }, [chatId]);

  // 🚀 STREAMING SEND MESSAGE
  const sendMessage = async () => {
    if (!chatId || !input.trim()) return;

    const text = input;
    setInput("");

    const userMessage: Message = {
      role: "user",
      content: text,
    };

    const placeholder: Message = {
      role: "assistant",
      content: "",
    };

    const updatedMessages: Message[] = [
      ...messages,
      userMessage,
      placeholder,
    ];

    setMessages(updatedMessages);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: text }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      let result = "";

      while (true) {
        const { done, value } = await reader!.read();
        if (done) break;

        result += decoder.decode(value);

        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = {
            role: "assistant",
            content: result,
          };
          return copy;
        });
      }

      // save BOTH messages
      await supabase.from("messages").insert([
        {
          chat_id: chatId,
          role: "user",
          content: text,
        },
        {
          chat_id: chatId,
          role: "assistant",
          content: result,
        },
      ]);
    } catch (err) {
      console.log(err);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Request failed",
        },
      ]);
    }

    setLoading(false);
  };

  return (
    <div className="flex h-screen bg-black text-white">

      {/* SIDEBAR */}
      <Sidebar setChatId={setChatId} />

      {/* MAIN CHAT */}
      <div className="flex flex-col flex-1">

        {/* MESSAGES */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">

          {messages.length === 0 && (
            <div className="text-white/30 text-center mt-20">
              Create or select a chat
            </div>
          )}

          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-xl px-4 py-3 rounded-lg ${
                m.role === "user"
                  ? "bg-blue-600 ml-auto"
                  : "bg-white/10"
              }`}
            >
              {m.content}
            </div>
          ))}

          {loading && (
            <div className="text-white/40 text-sm">
              Thinking...
            </div>
          )}
        </div>

        {/* INPUT */}
        <div className="p-4 border-t border-white/10 flex gap-2">

          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message..."
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2"
            onKeyDown={(e) => {
              if (e.key === "Enter") sendMessage();
            }}
          />

          <button
            onClick={sendMessage}
            className="px-4 py-2 bg-blue-600 rounded-lg"
          >
            Send
          </button>

        </div>

      </div>
    </div>
  );
}