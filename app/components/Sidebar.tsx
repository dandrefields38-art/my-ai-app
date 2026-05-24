"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Sidebar({
  setChatId,
}: {
  setChatId: (id: string) => void;
}) {
  const [chats, setChats] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);

  // LOAD USER
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };

    getUser();
  }, []);

  // LOAD CHATS
  useEffect(() => {
    const loadChats = async () => {
      const { data } = await supabase
        .from("chats")
        .select("*")
        .order("created_at", { ascending: false });

      setChats(data || []);
    };

    loadChats();
  }, []);

  // CREATE CHAT
  const createChat = async () => {
    const { data } = await supabase
      .from("chats")
      .insert({ title: "New Chat" })
      .select()
      .single();

    if (data) {
      setChats((prev) => [data, ...prev]);
      setChatId(data.id);
    }
  };

  // DELETE CHAT
  const deleteChat = async (id: string) => {
    await supabase.from("chats").delete().eq("id", id);

    setChats((prev) => prev.filter((c) => c.id !== id));
  };

  // 💰 STRIPE UPGRADE
  const upgradeToPro = async () => {
    try {
      // NOT LOGGED IN
      if (!user) {
        window.location.href = "/login";
        return;
      }

      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
        }),
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Stripe checkout failed");
      }
    } catch (err) {
      console.log(err);
      alert("Upgrade failed");
    }
  };

  return (
    <div className="w-72 h-screen bg-[#0b0b0f] border-r border-white/10 flex flex-col text-white">

      {/* TOP */}
      <div className="p-4 border-b border-white/10 space-y-2">

        <button
          onClick={createChat}
          className="w-full py-2 rounded-lg bg-white/10 hover:bg-white/20 transition"
        >
          + New Chat
        </button>

        {/* 💰 UPGRADE BUTTON */}
        <button
          onClick={upgradeToPro}
          className="w-full py-2 rounded-lg bg-yellow-500 text-black font-semibold hover:opacity-90 transition"
        >
          Upgrade to Pro
        </button>

      </div>

      {/* CHATS */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">

        {chats.map((chat) => (
          <div
            key={chat.id}
            className="flex items-center justify-between bg-white/5 hover:bg-white/10 rounded-lg px-3 py-2"
          >
            <button
              onClick={() => setChatId(chat.id)}
              className="text-sm text-left flex-1 truncate"
            >
              {chat.title || "Untitled Chat"}
            </button>

            <button
              onClick={() => deleteChat(chat.id)}
              className="text-red-400 text-xs ml-2"
            >
              ✕
            </button>
          </div>
        ))}

      </div>

      {/* USER INFO */}
      <div className="p-4 border-t border-white/10 text-xs text-white/50">

        {user ? (
          <div>
            Logged in as:
            <div className="truncate mt-1 text-white/80">
              {user.email}
            </div>
          </div>
        ) : (
          <a
            href="/login"
            className="text-blue-400"
          >
            Login
          </a>
        )}

      </div>

    </div>
  );
}