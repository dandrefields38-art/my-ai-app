"use client";

import { supabase } from "@/lib/supabase";

export type ChatSummary = {
  id: string;
  title: string | null;
  created_at?: string;
  updated_at?: string;
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  created_at?: string;
  updated_at?: string;
};

type Snapshot = {
  chats: ChatSummary[];
  loadedForUserId: string | null;
};

const subscribers =
  new Set<() => void>();

const snapshot: Snapshot = {
  chats: [],
  loadedForUserId: null,
};

const messagesByChatId =
  new Map<string, ChatMessage[]>();
const loadedMessages =
  new Set<string>();
const messageLoadedAt =
  new Map<string, number>();
const chatLoadPromises =
  new Map<string, Promise<ChatSummary[]>>();
const messageLoadPromises =
  new Map<string, Promise<ChatMessage[]>>();
const MESSAGE_CACHE_FRESHNESS_MS =
  45_000;

const emit = () => {
  subscribers.forEach(
    (
      subscriber
    ) => subscriber()
  );
};

const normalizeMessages = (
  rows: Array<{
    role: "user" | "assistant";
    content: string;
    created_at?: string | null;
    updated_at?: string | null;
  }>
) =>
  rows.map(
    (
      message
    ) => ({
      role:
        message.role,
      content:
        message.content,
      created_at:
        message.created_at ||
        undefined,
      updated_at:
        message.updated_at ||
        message.created_at ||
        undefined,
    })
  );

export const chatStore = {
  subscribe(
    callback: () => void
  ) {
    subscribers.add(callback);

    return () => {
      subscribers.delete(callback);
    };
  },

  getSnapshot() {
    return snapshot;
  },

  getChats() {
    return snapshot.chats;
  },

  async loadChats(
    userId: string,
    force = false
  ) {
    if (
      !force &&
      snapshot.loadedForUserId ===
        userId
    ) {
      return snapshot.chats;
    }

    const existing =
      chatLoadPromises.get(userId);

    if (existing && !force) {
      return existing;
    }

    const promise =
      Promise.resolve(
        supabase
          .from("chats")
          .select("id,title,created_at,updated_at")
          .eq("user_id", userId)
          .order("updated_at", {
            ascending:
              false,
          })
      ).then(
          ({
            data,
            error,
          }) => {
            chatLoadPromises.delete(
              userId
            );

            if (error) {
              console.log(
                "CHAT STORE LOAD ERROR:",
                error
              );
              return snapshot.chats;
            }

            snapshot.chats =
              data || [];
            snapshot.loadedForUserId =
              userId;
            emit();

            return snapshot.chats;
          }
        );

    chatLoadPromises.set(
      userId,
      promise
    );

    return promise;
  },

  setChats(
    chats: ChatSummary[],
    userId?: string | null
  ) {
    snapshot.chats = chats;

    if (userId) {
      snapshot.loadedForUserId =
        userId;
    }

    emit();
  },

  upsertChat(
    chat: ChatSummary
  ) {
    const existingIndex =
      snapshot.chats.findIndex(
        (
          item
        ) =>
          item.id === chat.id
      );

    if (existingIndex >= 0) {
      snapshot.chats =
        snapshot.chats.map(
          (
            item
          ) =>
            item.id === chat.id
              ? {
                  ...item,
                  ...chat,
                }
              : item
        );
    } else {
      snapshot.chats = [
        chat,
        ...snapshot.chats,
      ];
    }

    emit();
  },

  replaceChatId(
    temporaryId: string,
    chat: ChatSummary
  ) {
    snapshot.chats =
      snapshot.chats.map(
        (
          item
        ) =>
          item.id === temporaryId
            ? chat
            : item
      );

    const cached =
      messagesByChatId.get(
        temporaryId
      );

    if (cached) {
      messagesByChatId.set(
        chat.id,
        cached
      );
      messagesByChatId.delete(
        temporaryId
      );
    }

    const loadedAt =
      messageLoadedAt.get(
        temporaryId
      );

    if (loadedAt) {
      messageLoadedAt.set(
        chat.id,
        loadedAt
      );
      messageLoadedAt.delete(
        temporaryId
      );
    }

    emit();
  },

  updateChatTitle(
    chatId: string,
    title: string
  ) {
    snapshot.chats =
      snapshot.chats.map(
        (
          item
        ) =>
          item.id === chatId
            ? {
                ...item,
                title,
              }
            : item
      );
    snapshot.chats.sort(
      (
        a,
        b
      ) =>
        new Date(
          b.updated_at ||
            b.created_at ||
            0
        ).getTime() -
        new Date(
          a.updated_at ||
            a.created_at ||
            0
        ).getTime()
    );
    emit();
  },

  updateChatActivity(
    chatId: string,
    timestamp = new Date().toISOString()
  ) {
    snapshot.chats =
      snapshot.chats.map(
        (
          item
        ) =>
          item.id === chatId
            ? {
                ...item,
                updated_at:
                  timestamp,
              }
            : item
      );
    emit();
  },

  removeChat(chatId: string) {
    snapshot.chats =
      snapshot.chats.filter(
        (
          item
        ) =>
          item.id !== chatId
      );
    messagesByChatId.delete(
      chatId
    );
    loadedMessages.delete(chatId);
    messageLoadedAt.delete(chatId);
    emit();
  },

  getMessages(chatId: string) {
    return messagesByChatId.get(
      chatId
    );
  },

  setMessages(
    chatId: string,
    messages: ChatMessage[]
  ) {
    messagesByChatId.set(
      chatId,
      messages
    );
    loadedMessages.add(chatId);
    messageLoadedAt.set(
      chatId,
      Date.now()
    );
    emit();
  },

  async loadMessages(
    chatId: string,
    force = false
  ) {
    if (
      !force &&
      loadedMessages.has(chatId) &&
      Date.now() -
        (messageLoadedAt.get(chatId) ||
          0) <
        MESSAGE_CACHE_FRESHNESS_MS
    ) {
      return (
        messagesByChatId.get(
          chatId
        ) || []
      );
    }

    const existing =
      messageLoadPromises.get(
        chatId
      );

    if (existing && !force) {
      return existing;
    }

    const promise =
      Promise.resolve(
        supabase
          .from("messages")
          .select("role,content,created_at")
          .eq("chat_id", chatId)
          .order("created_at", {
            ascending:
              true,
          })
      ).then(
          ({
            data,
            error,
          }) => {
            messageLoadPromises.delete(
              chatId
            );

            if (error) {
              console.log(
                "CHAT STORE MESSAGE LOAD ERROR:",
                error
              );
              return (
                messagesByChatId.get(
                  chatId
                ) || []
              );
            }

            const messages =
              normalizeMessages(
                data || []
              );

            messagesByChatId.set(
              chatId,
              messages
            );
            loadedMessages.add(chatId);
            messageLoadedAt.set(
              chatId,
              Date.now()
            );
            emit();

            return messages;
          }
        );

    messageLoadPromises.set(
      chatId,
      promise
    );

    return promise;
  },
};
