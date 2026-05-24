"use client";

import {
  MessageSquare,
  PenSquare,
} from "lucide-react";

type Chat = {
  id: string;
  title: string;
};

type SidebarProps = {
  chats: Chat[];
  currentChatId: string | null;
  setCurrentChatId: (id: string) => void;
  createNewChat: () => void;
};

export default function Sidebar({
  chats,
  currentChatId,
  setCurrentChatId,
  createNewChat,
}: SidebarProps) {
  return (
    <aside className="w-[260px] h-screen bg-[#17171c] flex flex-col border-r border-white/[0.03]">
      {/* TOP */}

      <div className="p-3">
        <button
          onClick={createNewChat}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-white/[0.05] transition text-white/80"
        >
          <PenSquare size={18} />

          <span className="text-sm">
            New chat
          </span>
        </button>
      </div>

      {/* CHATS */}

      <div className="flex-1 overflow-y-auto px-2">
        <div className="space-y-1">
          {chats.map((chat) => (
            <button
              key={chat.id}
              onClick={() =>
                setCurrentChatId(chat.id)
              }
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition text-left ${
                currentChatId ===
                chat.id
                  ? "bg-white/[0.06] text-white"
                  : "hover:bg-white/[0.04] text-white/60"
              }`}
            >
              <MessageSquare
                size={16}
              />

              <span className="truncate text-sm">
                {chat.title}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* FOOTER */}

      <div className="p-3">
        <div className="rounded-2xl bg-[#202027] px-4 py-4">
          <div className="text-sm font-medium">
            Inquire Pro
          </div>

          <div className="text-xs text-white/40 mt-1">
            Unlimited AI access
          </div>
        </div>
      </div>
    </aside>
  );
}