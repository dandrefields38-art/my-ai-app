"use client";

import { useRouter } from "next/navigation";
import { useUser, UserButton } from "@clerk/nextjs";

type Chat = {
  id: string;
  title: string;
};

export default function Sidebar({
  chats,
  currentChatId,
  setCurrentChatId,
  createNewChat,
}: {
  chats: Chat[];
  currentChatId: string | null;
  setCurrentChatId: (id: string) => void;
  createNewChat: () => void;
}) {
  const router = useRouter();
  const { isSignedIn, user } = useUser();

  const handleUpgrade = async () => {
    if (!isSignedIn) {
      router.push("/sign-in");
      return;
    }

    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: user?.id,
      }),
    });

    const data = await res.json();

    if (data.url) {
      window.location.href = data.url;
    } else {
      alert("Stripe checkout failed");
    }
  };

  return (
    <div className="h-screen w-64 border-r bg-gray-100 flex flex-col">
      <div className="p-4 space-y-2">
        <button
          onClick={createNewChat}
          className="w-full bg-black text-white p-3 rounded"
        >
          + New Chat
        </button>

        <button
          onClick={handleUpgrade}
          className="w-full bg-yellow-400 text-black p-3 rounded"
        >
          Upgrade to Pro
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {chats?.map((chat) => (
          <button
            key={chat.id}
            onClick={() => setCurrentChatId(chat.id)}
            className={`w-full text-left p-3 rounded border ${
              currentChatId === chat.id ? "bg-gray-300" : "bg-white"
            }`}
          >
            {chat.title}
          </button>
        ))}
      </div>

      <div className="p-4 border-t">
        {isSignedIn ? (
          <div className="flex items-center justify-between">
            <span className="text-xs truncate max-w-[160px]">
              {user?.primaryEmailAddress?.emailAddress}
            </span>
            <UserButton />
          </div>
        ) : (
          <button
            onClick={() => router.push("/sign-in")}
            className="w-full border p-2 rounded bg-white"
          >
            Sign In
          </button>
        )}
      </div>
    </div>
  );
}