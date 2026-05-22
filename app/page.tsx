"use client";

import { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import { supabase } from "@/lib/supabase";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type Chat = {
  id: string;
  title: string;
};

export default function Home() {
  const [chatId, setChatId] = useState<string | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");

  // LOAD CHATS
  useEffect(() => {
    const loadChats = async () => {
      const { data } = await supabase
        .from("chats")
        .select("*")
        .order("created_at", { ascending: false });

      if (data) {
        setChats(data);
      }
    };

    loadChats();
  }, []);

  // LOAD MESSAGES
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

  // CREATE CHAT
  const createChat = async () => {
    const { data } = await supabase
      .from("chats")
      .insert([{ title: "New Chat" }])
      .select()
      .single();

    if (data) {
      setChats((prev) => [data, ...prev]);
      setChatId(data.id);
      setMessages([]);
    }
  };

  // STREAMING SEND MESSAGE
  const sendMessage = async () => {
    if (!input.trim() || !chatId) return;

    const text = input;

    setInput("");

    // show user message
    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: text,
      },
    ]);

    // placeholder assistant message
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: "",
      },
    ]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: text,
        }),
      });

      const reader = res.body?.getReader();

      if (!reader) return;

      const decoder = new TextDecoder();

      let fullReply = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value);

        fullReply += chunk;

        setMessages((prev) => {
          const updated = [...prev];

          updated[updated.length - 1] = {
            role: "assistant",
            content: fullReply,
          };

          return updated;
        });
      }

      // save messages
      supabase.from("messages").insert([
        {
          chat_id: chatId,
          role: "user",
          content: text,
        },
        {
          chat_id: chatId,
          role: "assistant",
          content: fullReply,
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
  };

  return (
    <div className="flex h-screen bg-black text-white">

      {/* SIDEBAR */}
      <Sidebar
        chats={chats}
        currentChatId={chatId}
        setCurrentChatId={setChatId}
        createNewChat={createChat}
      />

      {/* MAIN */}
      <div className="flex flex-col flex-1">

        {/* HEADER */}
        <div className="p-4 border-b border-white/10">
          Inquire AI
        </div>

        {/* MESSAGES */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">

          {!chatId && (
            <div className="text-white/30 text-center mt-20">
              Create a chat to begin
            </div>
          )}

          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-xl px-4 py-3 rounded-lg whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-blue-600 ml-auto"
                  : "bg-white/10"
              }`}
            >
              {m.content}
            </div>
          ))}

        </div>

        {/* INPUT */}
        <div className="p-4 border-t border-white/10 flex gap-2">

          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message Inquire..."
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                sendMessage();
              }
            }}
          />

          <button
            onClick={sendMessage}
            className="bg-blue-600 px-4 py-2 rounded-lg"
          >
            Send
          </button>

        </div>

      </div>
    </div>
  );
}