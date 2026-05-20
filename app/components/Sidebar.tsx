"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { SignOutButton, useUser } from "@clerk/nextjs";

export default function Sidebar({
  setChatId,
}: {
  setChatId: (id: string) => void;
}) {
  const [chats, setChats] = useState<any[]>([]);
  const { user } = useUser();

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;

      const { data } = await supabase
        .from("chats")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setChats(data || []);
    };

    load();
  }, [user]);

  const createChat = async () => {
    if (!user?.id) return;

    const { data } = await supabase
      .from("chats")
      .insert({
        title: "New chat",
        user_id: user.id,
      })
      .select()
      .single();

    if (!data) return;

    setChats((prev) => [data, ...prev]);
    setChatId(data.id);
  };

  const deleteChat = async (id: string) => {
    await supabase.from("chats").delete().eq("id", id);
    setChats((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <div className="w-72 h-full bg-[#0b0b0f] border-r border-white/10 flex flex-col">

      {/* HEADER */}
      <div className="p-4 border-b border-white/10">
        <button
          onClick={createChat}
          className="w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg"
        >
          + New Chat
        </button>
      </div>

      {/* CHAT LIST */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">

        {chats.map((chat) => (
          <div
            key={chat.id}
            className="flex items-center justify-between px-2 py-2 rounded-lg hover:bg-white/10"
          >
            <button
              onClick={() => setChatId(chat.id)}
              className="text-left text-sm text-white/70 flex-1"
            >
              {chat.title || "Untitled"}
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

      {/* FOOTER (SAAS CONTROLS) */}
      <div className="p-3 border-t border-white/10 flex items-center justify-between">

        {/* USER INFO */}
        <div className="text-xs text-white/50">
          {user?.firstName || user?.emailAddresses?.[0]?.emailAddress}
        </div>

        {/* SIGN OUT */}
        <SignOutButton redirectUrl="/sign-in">
          <button className="text-xs text-red-400 hover:text-red-300">
            Sign out
          </button>
        </SignOutButton>

      </div>

    </div>
  );
}