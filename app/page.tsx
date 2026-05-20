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
    const load = async () => {
      if (!chatId) return setMessages([]);

      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true });

      setMessages(
        data?.map((m: any) => ({
          role: m.role,
          content: m.content,
        })) || []
      );
    };

    load();
  }, [chatId]);

  // SEND MESSAGE (STREAMING + MEMORY)
  const sendMessage = async () => {
    if (!chatId || !input.trim()) return;

    const text = input;
    setInput("");

    const updatedMessages = [
      ...messages,
      { role: "user", content: text },
    ];

    setMessages(updatedMessages);

    // save user message
    await supabase.from("messages").insert({
      chat_id: chatId,
      role: "user",
      content: text,
    });

    // auto title
    if (messages.length === 0) {
      await supabase
        .from("chats")
        .update({ title: text.slice(0, 40) })
        .eq("id", chatId);
    }

    setLoading(true);

    const history = updatedMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: text,
        history,
      }),
    });

    const reader = res.body?.getReader();
    const decoder = new TextDecoder();

    let aiText = "";

    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "" },
    ]);

    while (true) {
      const { value, done } = await reader!.read();
      if (done) break;

      aiText += decoder.decode(value);

      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = {
          role: "assistant",
          content: aiText,
        };
        return copy;
      });
    }

    await supabase.from("messages").insert({
      chat_id: chatId,
      role: "assistant",
      content: aiText,
    });

    setLoading(false);
  };

  return (
    <div className="flex h-screen bg-black text-white">

      <Sidebar setChatId={setChatId} />

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
              className={`max-w-xl px-4 py-3 rounded-xl whitespace-pre-wrap ${
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

          <div id="bottom" />
        </div>

        {/* INPUT */}
        <div className="p-4 border-t border-white/10 flex gap-2">

          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Message..."
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2"
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