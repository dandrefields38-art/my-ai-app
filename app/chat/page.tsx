"use client";

import {
  Fragment,
  type ChangeEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import dynamic from "next/dynamic";

import {
  Sparkles,
  Paperclip,
  Mic,
  Send,
  Pencil,
  MessageSquare,
  Edit3,
  Trash2,
  LogOut,
  FileText,
  Download,
  ExternalLink,
  Building2,
  MapPin,
  Star,
  Save,
  Check,
  Award,
  User,
  Users,
} from "lucide-react";

import LeadEngineMenu from "@/app/components/LeadEngineMenu";
import MessageTimestamp from "@/app/components/MessageTimestamp";

import {
  useRouter,
} from "next/navigation";

import { supabase } from "@/lib/supabase";
import {
  chatStore,
  type ChatMessage,
  type ChatSummary,
} from "@/lib/chatStore";
import {
  formatDateSeparatorLabel,
  getDateGroupKey,
  getMessageTimestamp,
} from "@/lib/messageTime";

type Message = ChatMessage;

const MarkdownMessage =
  dynamic(
    () =>
      import(
        "@/app/components/MarkdownMessage"
      ),
    {
      ssr: false,
    }
  );

const MotionMessage =
  dynamic(
    () =>
      import(
        "@/app/components/MotionMessage"
      ),
    {
      ssr: false,
    }
  );

type StoredAttachment = {
  type: "image" | "pdf";
  dataUrl: string;
  mediaType: string;
  name: string;
  size?: number;
};

type StoredMessageContent = {
  text: string;
  attachments: StoredAttachment[];
};

type Chat = ChatSummary;

type GeneratedLead = {
  name: string;
  contact_name?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  industry?: string;
  google_rating?: number | string;
  review_count?: number;
  lead_score?: number;
  score_reason?: string;
};

type LeadModePayload = {
  active?: boolean;
  status?: string;
  question?: string;
  analysis?: {
    count?: number;
    industry?: string;
    location?: string;
    businessGoal?: string;
    requiredContactDetails?: string[];
    isRandomRequest?: boolean;
  };
};

const getChatTitle = (
  text: string
) =>
  text.length > 40
    ? `${text.slice(
        0,
        40
      )}...`
    : text;

const readFileAsDataUrl = (
  file: File
) =>
  new Promise<string>(
    (
      resolve,
      reject
    ) => {
      const reader =
        new FileReader();

      reader.onload =
        () =>
          resolve(
            String(
              reader.result
            )
          );

      reader.onerror =
        () =>
          reject(
            reader.error
          );

      reader.readAsDataURL(
        file
      );
    }
  );

const formatFileSize = (
  size?: number
) => {
  if (
    typeof size !==
      "number" ||
    !Number.isFinite(
      size
    ) ||
    size <= 0
  ) {
    return "PDF";
  }

  const units =
    [
      "B",
      "KB",
      "MB",
      "GB",
    ];

  let nextSize =
    size;

  let unitIndex =
    0;

  while (
    nextSize >= 1024 &&
    unitIndex <
      units.length - 1
  ) {
    nextSize /= 1024;
    unitIndex += 1;
  }

  const value =
    nextSize >= 10 ||
    unitIndex === 0
      ? Math.round(
          nextSize
        ).toString()
      : nextSize.toFixed(
          1
        );

  return `${value} ${units[unitIndex]}`;
};

const createStoredMessageContent = (
  text: string,
  attachment?: StoredAttachment | null
) =>
  attachment
    ? JSON.stringify({
        text,
        attachments: [
          attachment,
        ],
      } satisfies StoredMessageContent)
    : text;

const parseStoredMessageContent = (
  content: string
): StoredMessageContent => {
  try {
    const parsed =
      JSON.parse(content);

    if (
      parsed &&
      Array.isArray(
        parsed.attachments
      )
    ) {
      return {
        text:
          typeof parsed.text ===
          "string"
            ? parsed.text
            : "",
        attachments:
          parsed.attachments.filter(
            (
              attachment: any
            ) =>
              (
                attachment?.type ===
                  "image" ||
                attachment?.type ===
                  "pdf"
              ) &&
              typeof attachment.dataUrl ===
                "string"
          )
          .map(
            (
              attachment: any
            ) => ({
              type:
                attachment.type,
              dataUrl:
                attachment.dataUrl,
              mediaType:
                typeof attachment.mediaType ===
                "string"
                  ? attachment.mediaType
                  : attachment.type ===
                    "pdf"
                    ? "application/pdf"
                    : "",
              name:
                typeof attachment.name ===
                "string"
                  ? attachment.name
                  : attachment.type ===
                    "pdf"
                    ? "Uploaded PDF"
                    : "Uploaded image",
              size:
                typeof attachment.size ===
                "number"
                  ? attachment.size
                  : undefined,
            })
          ),
      };
    }
  } catch {
  }

  return {
    text:
      content,
    attachments:
      [],
  };
};

const isLeadPayload = (
  content: string
) =>
  content.startsWith(
    "LEADS::"
  );

const isLeadModePayload = (
  content: string
) =>
  content.startsWith(
    "LEAD_MODE::"
  );

const parseLeadPayload = (
  content: string
) => {
  try {
    const parsed =
      JSON.parse(
        content.replace(
          "LEADS::",
          ""
        )
      );

    return Array.isArray(
      parsed.leads
    )
      ? parsed.leads as GeneratedLead[]
      : [];
  } catch {
    return [];
  }
};

const parseLeadModePayload = (
  content: string
): LeadModePayload => {
  try {
    return JSON.parse(
      content.replace(
        "LEAD_MODE::",
        ""
      )
    );
  } catch {
    return {};
  }
};

const LeadModeActiveCard = ({
  payload,
}: {
  payload: LeadModePayload;
}) => {
  const analysis =
    payload.analysis || {};

  return (
    <div className="w-full whitespace-normal rounded-2xl border border-emerald-400/20 bg-[#111816] p-5 shadow-xl shadow-black/20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-medium uppercase text-emerald-200">
            <Building2 size={14} />
            Lead Mode Active
          </div>

          <h2 className="mt-4 text-2xl font-semibold leading-tight text-white">
            {payload.question ||
              "Tell me one more detail to generate the right leads."}
          </h2>
        </div>

        <a
          href="/leads"
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white/80 transition hover:bg-white/[0.09]"
        >
          <Users size={16} />
          Dashboard
        </a>
      </div>

      <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-xl bg-white/[0.04] px-3 py-2 text-white/70">
          Category:{" "}
          <span className="text-white">
            {analysis.industry ||
              "Needed"}
          </span>
        </div>

        <div className="rounded-xl bg-white/[0.04] px-3 py-2 text-white/70">
          Location:{" "}
          <span className="text-white">
            {analysis.location ||
              "Needed"}
          </span>
        </div>

        <div className="rounded-xl bg-white/[0.04] px-3 py-2 text-white/70">
          Count:{" "}
          <span className="text-white">
            {analysis.count ||
              12}
          </span>
        </div>

        <div className="rounded-xl bg-white/[0.04] px-3 py-2 text-white/70">
          Goal:{" "}
          <span className="text-white">
            {analysis.businessGoal ||
              "General outreach"}
          </span>
        </div>
      </div>
    </div>
  );
};

const LeadSearchCards = ({
  leads,
}: {
  leads: GeneratedLead[];
}) => {
  const [saved, setSaved] =
    useState<
      Record<number, string>
    >({});

  const saveLead =
    async (
      lead: GeneratedLead,
      index: number
    ) => {
      setSaved(
        (
          prev
        ) => ({
          ...prev,
          [index]:
            "Saving",
        })
      );

      const {
        data: {
          session,
        },
      } =
        await supabase.auth.getSession();

      const res =
        await fetch(
          "/api/leads",
          {
            method:
              "POST",
            headers: {
              "Content-Type":
                "application/json",
              ...(session?.access_token
                ? {
                    Authorization:
                      `Bearer ${session.access_token}`,
                  }
                : {}),
            },
            body:
              JSON.stringify({
                lead,
              }),
          }
        );

      const data =
        await res.json();

      setSaved(
        (
          prev
        ) => ({
          ...prev,
          [index]:
            data.inserted > 0
              ? "Saved"
              : "Duplicate",
        })
      );
    };

  if (!leads.length) {
    return (
      <div className="text-white/65">
        No business leads found for that search.
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 whitespace-normal">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs uppercase text-white/45">
            Lead Mode
          </div>
          <h2 className="text-2xl font-semibold leading-tight text-white">
            {leads.length} business leads found
          </h2>
        </div>

        <a
          href="/leads"
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white/80 transition hover:bg-white/[0.09]"
        >
          <Users size={16} />
          Leads Dashboard
        </a>
      </div>

      <div className="grid gap-4">
        {leads.map(
          (
            lead,
            index
          ) => (
            <article
              key={`${lead.name}-${index}`}
              className="rounded-2xl border border-white/10 bg-[#121216] p-4 shadow-xl shadow-black/20"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-white/45">
                    <Building2 size={16} />
                    <span className="text-xs uppercase">
                      {lead.industry ||
                        "Business"}
                    </span>
                  </div>

                  <h3 className="mt-2 text-xl font-semibold leading-tight text-white">
                    {lead.name}
                  </h3>

                  {lead.contact_name && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-white/65">
                      <User size={15} />
                      {lead.contact_name}
                    </div>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <div className="rounded-xl bg-emerald-500/15 px-3 py-2 text-sm text-emerald-200">
                    Score{" "}
                    {lead.lead_score ||
                      60}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      saveLead(
                        lead,
                        index
                      )
                    }
                    disabled={
                      saved[index] ===
                      "Saving"
                    }
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-3 text-sm font-medium text-black transition hover:bg-white/90 disabled:opacity-60"
                  >
                    {saved[index] ===
                    "Saved" ? (
                      <Check size={16} />
                    ) : (
                      <Save size={16} />
                    )}
                    {saved[index] ||
                      "Save"}
                  </button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                {lead.phone && (
                  <a
                    href={`tel:${lead.phone}`}
                    className="rounded-xl bg-white/[0.04] px-3 py-2 text-white/80"
                  >
                    Phone: {lead.phone}
                  </a>
                )}

                {lead.email && (
                  <a
                    href={`mailto:${lead.email}`}
                    className="rounded-xl bg-white/[0.04] px-3 py-2 text-white/80"
                  >
                    Email: {lead.email}
                  </a>
                )}

                {lead.website && (
                  <a
                    href={
                      lead.website
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-w-0 items-center gap-2 rounded-xl bg-white/[0.04] px-3 py-2 text-blue-200"
                  >
                    <ExternalLink
                      size={15}
                    />
                    <span className="truncate">
                      {lead.website}
                    </span>
                  </a>
                )}

                {(lead.address ||
                  lead.city ||
                  lead.state) && (
                  <div className="flex items-center gap-2 rounded-xl bg-white/[0.04] px-3 py-2 text-white/75">
                    <MapPin
                      size={15}
                      className="shrink-0"
                    />
                    <span>
                      {lead.address ||
                        [
                          lead.city,
                          lead.state,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                    </span>
                  </div>
                )}

                {(lead.google_rating ||
                  lead.review_count) && (
                  <div className="flex items-center gap-2 rounded-xl bg-white/[0.04] px-3 py-2 text-yellow-200">
                    <Star size={15} />
                    <span>
                      {lead.google_rating ||
                        "N/A"}{" "}
                      Google rating
                      {lead.review_count
                        ? `, ${lead.review_count} reviews`
                        : ""}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-white/70">
                <Award
                  size={16}
                  className="mt-0.5 shrink-0 text-emerald-200"
                />
                {lead.score_reason ||
                  "Potential fit based on category and location match."}
              </div>
            </article>
          )
        )}
      </div>
    </div>
  );
};

const ChatMessageContent = ({
  message,
}: {
  message: Message;
}) => {
  const parsed =
    parseStoredMessageContent(
      String(
        message.content
      )
    );

  if (
    message.role === "assistant" &&
    isLeadModePayload(
      String(
        message.content
      )
    )
  ) {
    return (
      <LeadModeActiveCard
        payload={parseLeadModePayload(
          String(
            message.content
          )
        )}
      />
    );
  }

  if (
    message.role === "assistant" &&
    isLeadPayload(
      String(
        message.content
      )
    )
  ) {
    return (
      <LeadSearchCards
        leads={parseLeadPayload(
          String(
            message.content
          )
        )}
      />
    );
  }

  if (
    message.role === "assistant" &&
    String(
      message.content
    ).startsWith(
      "IMAGE::"
    )
  ) {
    return (
      <img
        src={String(
          message.content
        ).replace(
          "IMAGE::",
          ""
        )}
        alt="Generated"
        loading="lazy"
        className="rounded-3xl max-w-full"
      />
    );
  }

  return (
    <div className="space-y-3">
      {parsed.text && (
        message.role ===
        "assistant" ? (
          <MarkdownMessage
            content={
              parsed.text
            }
          />
        ) : (
          <div>
            {parsed.text}
          </div>
        )
      )}

      {parsed.attachments.map(
        (
          attachment,
          index
        ) =>
          attachment.type ===
          "image" ? (
            <img
              key={`${attachment.name}-${index}`}
              src={
                attachment.dataUrl
              }
              alt={
                attachment.name ||
                "Uploaded image"
              }
              loading="lazy"
              className="max-h-72 rounded-2xl object-contain"
            />
          ) : (
            <a
              key={`${attachment.name}-${index}`}
              href={
                attachment.dataUrl
              }
              download={
                attachment.name ||
                "uploaded.pdf"
              }
              target="_blank"
              rel="noreferrer"
              className={`flex w-full max-w-sm items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${
                message.role ===
                "user"
                  ? "border-black/10 bg-black/[0.04] hover:bg-black/[0.07]"
                  : "border-white/10 bg-white/[0.04] hover:bg-white/[0.08]"
              }`}
            >
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                  message.role ===
                  "user"
                    ? "bg-red-600 text-white"
                    : "bg-red-500/20 text-red-200"
                }`}
              >
                <FileText
                  size={
                    22
                  }
                />
              </div>

              <div className="min-w-0 flex-1">
                <div
                  className={`truncate text-sm font-medium leading-tight ${
                    message.role ===
                    "user"
                      ? "text-black"
                      : "text-white"
                  }`}
                >
                  {
                    attachment.name ||
                    "Uploaded PDF"
                  }
                </div>

                <div
                  className={`mt-1 text-xs uppercase tracking-wide ${
                    message.role ===
                    "user"
                      ? "text-black/55"
                      : "text-white/45"
                  }`}
                >
                  {formatFileSize(
                    attachment.size
                  )}
                </div>
              </div>

              <Download
                size={
                  18
                }
                className={
                  message.role ===
                  "user"
                    ? "shrink-0 text-black/45"
                    : "shrink-0 text-white/45"
                }
              />
            </a>
          )
      )}
    </div>
  );
};

export default function ChatPage() {
  const router =
    useRouter();

  const [input, setInput] =
    useState("");

  const [messages, setMessages] =
    useState<Message[]>([]);

  const [chatId, setChatId] =
    useState<string | null>(
      null
    );

  const [chats, setChats] =
    useState<Chat[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [userId, setUserId] =
    useState<string | null>(
      null
    );

  const [selectedFile, setSelectedFile] =
    useState<File | null>(
      null
    );

  const [imagePreviewUrl, setImagePreviewUrl] =
    useState<string | null>(
      null
    );

  const bottomRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const speechTimeout =
    useRef<any>(null);
  const activeChatRef =
    useRef<string | null>(
      null
    );

  // =====================
  // AUTO SCROLL
  // =====================

  useEffect(() => {
    bottomRef.current?.scrollIntoView(
      {
        behavior:
          "smooth",
      }
    );
  }, [messages]);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(
          imagePreviewUrl
        );
      }
    };
  }, [imagePreviewUrl]);

  // =====================
  // LOAD USER
  // =====================

  useEffect(() => {
    getUser();
  }, []);

  useEffect(
    () => {
      setChats(
        chatStore.getChats()
      );

      return chatStore.subscribe(
        () => {
          setChats(
            chatStore.getChats()
          );
        }
      );
    },
    []
  );

  const getUser =
    async () => {

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (user) {

        setUserId(
          user.id
        );

        await loadChats(
          user.id
        );
      }
    };

  // =====================
  // LOAD CHATS
  // =====================

  const loadChats =
    async (
      currentUserId: string
    ) => {

      const data =
        await chatStore.loadChats(
          currentUserId
        );

        setChats(data);

        const params =
          typeof window ===
          "undefined"
            ? null
            : new URLSearchParams(
                window.location.search
              );
        const requestedChatId =
          params?.get(
            "chatId"
          );

        if (
          requestedChatId &&
          data.some(
            (
              chat
            ) =>
              chat.id ===
              requestedChatId
          )
        ) {
          setChatId(
            requestedChatId
          );
        } else if (
          data.length > 0
        ) {

          setChatId(
            data[0].id
          );
        }
    };

  // =====================
  // LOAD MESSAGES
  // =====================

  useEffect(() => {

    if (!chatId)
      return;

    activeChatRef.current =
      chatId;

    loadMessages(chatId);

  }, [chatId]);

  const loadMessages =
    async (
      selectedChatId: string
    ) => {

      const cached =
        chatStore.getMessages(
          selectedChatId
        );

      if (cached) {
        setMessages(cached);
      } else {
        setMessages([]);
      }

      if (
        selectedChatId.startsWith(
          "temp-"
        )
      ) {
        return;
      }

      const latest =
        await chatStore.loadMessages(
          selectedChatId,
          false
        );

      if (
        activeChatRef.current ===
        selectedChatId
      ) {
        setMessages(latest);
      }
    };

  // =====================
  // CREATE CHAT
  // =====================

  const createChat =
    async () => {

      if (!userId)
        return;

      const temporaryId =
        `temp-${Date.now()}`;
      const optimisticChat: Chat = {
        id: temporaryId,
        title: "New Chat",
        created_at:
          new Date().toISOString(),
        updated_at:
          new Date().toISOString(),
      };

      chatStore.upsertChat(
        optimisticChat
      );
      chatStore.setMessages(
        temporaryId,
        []
      );
      setChatId(temporaryId);
      setMessages([]);

      const { data } =
        await supabase
          .from("chats")
          .insert([
            {
              title:
                "New Chat",

              user_id:
                userId,
            },
          ])
          .select()
          .single();

      if (data) {
        chatStore.replaceChatId(
          temporaryId,
          data
        );

        setChatId(
          data.id
        );

        router.replace(
          `/chat?chatId=${data.id}`
        );

        setMessages(
          []
        );

        window.dispatchEvent(
          new CustomEvent(
            "inquire:refresh-chats",
            {
              detail: {
                chatId:
                  data.id,
              },
            }
          )
        );
      } else {
        chatStore.removeChat(
          temporaryId
        );
      }
    };

  useEffect(() => {
    const handleNewChat =
      () => {
        createChat();
      };

    window.addEventListener(
      "inquire:new-chat",
      handleNewChat
    );

    return () =>
      window.removeEventListener(
        "inquire:new-chat",
        handleNewChat
      );
  }, [userId]);

  useEffect(() => {
    const handleSelectChat =
      (
        event: Event
      ) => {
        const detail =
          (
            event as CustomEvent<{
              chatId?: string | null;
            }>
          ).detail;

        setChatId(
          detail?.chatId ||
            null
        );

        if (!detail?.chatId) {
          setMessages([]);
        }
      };

    window.addEventListener(
      "inquire:select-chat",
      handleSelectChat
    );

    return () =>
      window.removeEventListener(
        "inquire:select-chat",
        handleSelectChat
      );
  }, []);

  useEffect(() => {
    if (
      !userId ||
      typeof window === "undefined"
    ) {
      return;
    }

    const params =
      new URLSearchParams(
        window.location.search
      );

    if (
      params.get("new") !==
      "1"
    ) {
      return;
    }

    createChat();
  }, [userId, router]);

  // =====================
  // UPDATE CHAT TITLE
  // =====================

  const updateChatTitle =
    async (
      selectedChatId: string,
      title: string
    ) => {

      const nextTitle =
        title.trim();

      if (
        !nextTitle ||
        !userId
      )
        return false;

      const { error } =
        await supabase
          .from("chats")
          .update({
            title:
              nextTitle,
          })
          .eq(
            "id",
            selectedChatId
          )
          .eq(
            "user_id",
            userId
          );

      if (error) {

        console.log(
          "CHAT TITLE ERROR:",
          error
        );

        return false;
      }

      chatStore.updateChatTitle(
        selectedChatId,
        nextTitle
      );

      window.dispatchEvent(
        new CustomEvent(
          "inquire:refresh-chats",
          {
            detail: {
              chatId:
                selectedChatId,
            },
          }
        )
      );

      return true;
    };

  const renameChat =
    async (
      selectedChat: Chat
    ) => {
      window.dispatchEvent(
        new CustomEvent(
          "inquire:request-rename-chat",
          {
            detail: {
              chat:
                selectedChat,
            },
          }
        )
      );
    };

  const deleteChat =
    async (
      selectedChatId: string
    ) => {

      if (!userId)
        return;

      const { error: messagesError } =
        await supabase
          .from("messages")
          .delete()
          .eq(
            "chat_id",
            selectedChatId
          )
          .eq(
            "user_id",
            userId
          );

      if (messagesError) {

        console.log(
          "CHAT MESSAGES DELETE ERROR:",
          messagesError
        );

        return;
      }

      const { error } =
        await supabase
          .from("chats")
          .delete()
          .eq(
            "id",
            selectedChatId
          )
          .eq(
            "user_id",
            userId
          );

      if (error) {

        console.log(
          "CHAT DELETE ERROR:",
          error
        );

        return;
      }

      const nextChats =
        chatStore
          .getChats()
          .filter(
            (
              chat
            ) =>
              chat.id !==
              selectedChatId
          );

      chatStore.removeChat(
        selectedChatId
      );

          if (
            chatId ===
            selectedChatId
          ) {

            const nextChat =
              nextChats[0];

            setChatId(
              nextChat?.id ||
                null
            );

            setMessages(
              []
            );
          }

      window.dispatchEvent(
        new CustomEvent(
          "inquire:refresh-chats",
          {
            detail: {
              chatId:
                chatId ===
                selectedChatId
                  ? null
                  : chatId,
            },
          }
        )
      );
    };

  // =====================
  // VOICE INPUT
  // =====================

  const startVoiceInput =
    async () => {

      try {

        await navigator.mediaDevices.getUserMedia(
          {
            audio: true,
          }
        );

        const SpeechRecognition =
          (
            window as any
          )
            .SpeechRecognition ||
          (
            window as any
          )
            .webkitSpeechRecognition;

        if (
          !SpeechRecognition
        ) {

          alert(
            "Use Google Chrome for voice mode."
          );

          return;
        }

        const recognition =
          new SpeechRecognition();

        recognition.lang =
          "en-US";

        recognition.start();

        recognition.onresult =
          (
            event: any
          ) => {

            const transcript =
              event.results[0][0]
                .transcript;

            setInput(
              transcript
            );
          };

      } catch (
        err
      ) {

        console.log(
          err
        );
      }
    };

  // =====================
  // AI SPEECH
  // =====================

	  const speakText = (
	    text: string
	  ) => {

    clearTimeout(
      speechTimeout.current
    );

    speechTimeout.current =
      setTimeout(() => {

        window.speechSynthesis.cancel();

        const speech =
          new SpeechSynthesisUtterance(
            text
          );

        speech.rate =
          1;

        speech.pitch =
          1;

        speech.volume =
          1;

        window.speechSynthesis.speak(
          speech
        );

      }, 300);

	  };

	  const logout =
	    async () => {
	      await supabase.auth.signOut();
	      router.replace(
	        "/login"
	      );
	    };

  const getAuthHeaders =
    async (): Promise<
      Record<string, string>
    > => {
      const {
        data: {
          session,
        },
      } =
        await supabase.auth.getSession();

      return session?.access_token
        ? {
            Authorization:
              `Bearer ${session.access_token}`,
          }
        : {};
    };

  const handleFileChange =
    (
      event: ChangeEvent<HTMLInputElement>
    ) => {
      console.log(
        "Attachment flow: file input changed."
      );

      const file =
        event.target.files?.[0] ||
        null;

      if (!file) {
        console.log(
          "Attachment flow: no file selected."
        );

        if (
          imagePreviewUrl
        ) {
          URL.revokeObjectURL(
            imagePreviewUrl
          );
        }

        setSelectedFile(
          null
        );

        setImagePreviewUrl(
          null
        );

        return;
      }

      console.log(
        "Attachment flow: selected file.",
        {
          name:
            file.name,
          type:
            file.type,
          size:
            file.size,
        }
      );

      setSelectedFile(
        file
      );

      console.log(
        "Attachment flow: file stored in React state."
      );

      if (
        imagePreviewUrl
      ) {
        URL.revokeObjectURL(
          imagePreviewUrl
        );
      }

      if (
        file.type.startsWith(
          "image/"
        )
      ) {
        const previewUrl =
          URL.createObjectURL(
            file
          );

        setImagePreviewUrl(
          previewUrl
        );

        console.log(
          "Attachment flow: image preview URL created."
        );

        return;
      }

      setImagePreviewUrl(
        null
      );

      if (
        file.type ===
          "application/pdf" ||
        file.name
          .toLowerCase()
          .endsWith(".pdf")
      ) {
        console.log(
          "Attachment flow: PDF selected. Filename will be displayed; preview is not generated."
        );

        return;
      }

      console.log(
        "Attachment flow: unsupported preview type. Filename will be displayed."
      );
    };

  // =====================
  // SEND MESSAGE
  // =====================

	  const sendMessage =
	    async () => {
	
      const imageFile =
        selectedFile?.type.startsWith(
          "image/"
        )
          ? selectedFile
          : null;

      const pdfFile =
        selectedFile &&
        (
          selectedFile.type ===
            "application/pdf" ||
          selectedFile.name
            .toLowerCase()
            .endsWith(".pdf")
        )
          ? selectedFile
          : null;

	      if (
	        (
	          !input.trim() &&
	          !imageFile &&
	          !pdfFile
	        ) ||
	        !userId
	      )
	        return;

      setLoading(
        true
      );

      let currentChatId =
        chatId;
      let temporaryChatId:
        | string
        | null = null;
      let pendingChat:
        | Promise<Chat | null>
        | null = null;

      const text =
        input.trim();

      const attachedImage =
        imageFile
          ? {
              type:
                "image" as const,
              dataUrl:
                await readFileAsDataUrl(
                  imageFile
                ),
              mediaType:
                imageFile.type,
              name:
                imageFile.name,
              size:
                imageFile.size,
            }
          : null;

      const attachedPdf =
        pdfFile
          ? {
              type:
                "pdf" as const,
              dataUrl:
                await readFileAsDataUrl(
                  pdfFile
                ),
              mediaType:
                pdfFile.type ||
                "application/pdf",
              name:
                pdfFile.name,
              size:
                pdfFile.size,
            }
          : null;

      const attachedFile =
        attachedImage ||
        attachedPdf;

      if (attachedFile) {
        console.log(
          "Attachment flow: clearing attachment selection immediately after creating upload snapshot."
        );

        if (
          imagePreviewUrl
        ) {
          URL.revokeObjectURL(
          imagePreviewUrl
        );
      }

        setSelectedFile(
          null
        );

        setImagePreviewUrl(
          null
        );
      }

      const userMessageContent =
        createStoredMessageContent(
          text,
          attachedFile
        );

      const titleText =
        text ||
        attachedFile?.name ||
        "Attachment message";

      console.log(
        "Attachment flow: sendMessage started.",
        {
          hasSelectedFile:
            Boolean(
              selectedFile
            ),
          hasImageFile:
            Boolean(
              imageFile
            ),
          hasPdfFile:
            Boolean(
              pdfFile
            ),
        }
      );

	      const isImageRequest =
        !attachedFile &&
	        /\b(generate image|create image|make image|draw|logo|wallpaper|thumbnail|poster|picture|photo|artwork|ai art)\b/i.test(
	          text
	        );

      if (
        !currentChatId
      ) {
        temporaryChatId =
          `temp-${Date.now()}`;
        currentChatId =
          temporaryChatId;

        const optimisticChat: Chat = {
          id: temporaryChatId,
          title:
            getChatTitle(
              titleText
            ),
          created_at:
            new Date().toISOString(),
          updated_at:
            new Date().toISOString(),
        };

        chatStore.upsertChat(
          optimisticChat
        );

        setChatId(
          temporaryChatId
        );

        pendingChat =
          Promise.resolve(
            supabase
              .from("chats")
              .insert([
                {
                  title:
                    getChatTitle(
                      titleText
                    ),
                  user_id:
                    userId,
                },
              ])
              .select()
              .single()
          ).then(
            ({
              data,
              error,
            }) => {
              if (error || !data) {
                console.log(
                  "CHAT CREATE ERROR:",
                  error
                );
                return null;
              }

              return data;
            }
          );
      }

      const updatedMessages =
        (() => {
          const now =
            new Date().toISOString();

          return [
            ...messages,
            {
              role:
                "user" as const,

              content:
                userMessageContent,
              created_at:
                now,
              updated_at:
                now,
            },
          ];
        })();

      setMessages(
        updatedMessages
      );
      chatStore.setMessages(
        currentChatId,
        updatedMessages
      );

	      setInput("");

	      if (
	        updatedMessages.length === 1 &&
	        currentChatId &&
          !currentChatId.startsWith(
            "temp-"
          )
	      ) {
	
	        updateChatTitle(
	          currentChatId,
		          getChatTitle(
		            titleText
		          )
	        );
	  
	      }
      try {
        const authHeaders =
          await getAuthHeaders();

        // IMAGE MODE

        if (
          isImageRequest
        ) {

          const res =
            await fetch(
              "/api/images",
              {
                method:
                  "POST",

                headers:
                  {
                    "Content-Type":
                      "application/json",
                    ...authHeaders,
                  },

                body:
                  JSON.stringify(
                    {
		                      prompt:
		                        text,

                      userId,
	                    }
	                  ),
              }
            );

          const data =
            await res.json();

	          const reply =
	            data.imageUrl
	              ? `IMAGE::${data.imageUrl}`
	              : data.error ||
	                "Image generation failed.";
          const imageAssistantTimestamp =
            new Date().toISOString();
          const imageMessages =
            [
              ...updatedMessages,
              {
                role:
                  "assistant" as const,
                content:
                  reply,
                created_at:
                  imageAssistantTimestamp,
                updated_at:
                  imageAssistantTimestamp,
              },
            ];

          setMessages(
            imageMessages
          );

          if (currentChatId) {
            chatStore.setMessages(
              currentChatId,
              imageMessages
            );
          }

          let persistedImageChatId =
            currentChatId;

          if (pendingChat) {
            const persistedChat =
              await pendingChat;

            if (
              persistedChat &&
              temporaryChatId
            ) {
              persistedImageChatId =
                persistedChat.id;
              chatStore.replaceChatId(
                temporaryChatId,
                persistedChat
              );
              setChatId(
                persistedChat.id
              );
              router.replace(
                `/chat?chatId=${persistedChat.id}`
              );
            }
          }

          if (
            persistedImageChatId &&
            !persistedImageChatId.startsWith(
              "temp-"
            )
          ) {
            chatStore.updateChatActivity(
              persistedImageChatId,
              imageAssistantTimestamp
            );
            await supabase
              .from("messages")
              .insert([
                {
                  chat_id:
                    persistedImageChatId,
                  user_id:
                    userId,
                  role:
                    "user",
                  content:
                    userMessageContent,
                  created_at:
                    updatedMessages[
                      updatedMessages.length -
                        1
                    ].created_at,
                  updated_at:
                    updatedMessages[
                      updatedMessages.length -
                        1
                    ].updated_at,
                },
                {
                  chat_id:
                    persistedImageChatId,
                  user_id:
                    userId,
                  role:
                    "assistant",
                  content:
                    reply,
                  created_at:
                    imageAssistantTimestamp,
                  updated_at:
                    imageAssistantTimestamp,
                },
              ]);
            await supabase
              .from("chats")
              .update({
                updated_at:
                  imageAssistantTimestamp,
              })
              .eq(
                "id",
                persistedImageChatId
              )
              .eq(
                "user_id",
                userId
              );
          }

          setLoading(
            false
          );

          return;
        }

        // NORMAL AI CHAT

	        const res =
	          await fetch(
	            "/api/chat",
            {
              method:
                "POST",

              headers:
                {
                  "Content-Type":
                    "application/json",
                  ...authHeaders,
                },

	              body:
	                JSON.stringify(
	                  {
	                    message:
	                      text,

	                    messages:
	                      updatedMessages.slice(
	                        -10
	                      ),

	                    userId,

                    image:
                      attachedImage
                        ? {
	                            dataUrl:
	                              attachedImage.dataUrl,
	                            mediaType:
	                              attachedImage.mediaType,
	                            name:
	                              attachedImage.name,
                          }
                        : null,

                    pdf:
                      attachedPdf
                        ? {
                            dataUrl:
                              attachedPdf.dataUrl,
                            mediaType:
                              attachedPdf.mediaType,
                            name:
                              attachedPdf.name,
                          }
                        : null,
		                  }
		                ),
	            }
	          );

        if (imageFile) {
	          console.log(
            "Attachment flow: selected image included in /api/chat request.",
            {
              name:
                imageFile.name,
	              type:
	                imageFile.type,
	            }
	          );
	        }

        const reader =
          res.body?.getReader();

        if (
          !reader
        ) {

          setLoading(
            false
          );

          return;
        }

        if (pdfFile) {
          console.log(
            "Attachment flow: selected PDF included in /api/chat request.",
            {
              name:
                pdfFile.name,
              type:
                pdfFile.type,
            }
          );
        }

        const decoder =
          new TextDecoder();

        let assistantText =
          "";
        const assistantTimestamp =
          new Date().toISOString();
        let lastStreamFlush =
          performance.now();
        let streamFlushTimer:
          | ReturnType<
              typeof setTimeout
            >
          | null = null;

        const messagesWithAssistant =
          [
            ...updatedMessages,
            {
              role:
                "assistant" as const,
              content:
                "",
              created_at:
                assistantTimestamp,
              updated_at:
                assistantTimestamp,
            },
          ];

        setMessages(
          messagesWithAssistant
        );
        chatStore.setMessages(
          currentChatId,
          messagesWithAssistant
        );

        const flushAssistantMessage =
          () => {
            lastStreamFlush =
              performance.now();
            const updated =
              [
                ...updatedMessages,
                {
                  role:
                    "assistant" as const,

                  content:
                    assistantText,
                  created_at:
                    assistantTimestamp,
                  updated_at:
                    new Date().toISOString(),
                },
              ];

            setMessages(
              updated
            );
            chatStore.setMessages(
              currentChatId,
              updated
            );
          };

        const scheduleStreamFlush =
          () => {
            const elapsed =
              performance.now() -
              lastStreamFlush;

            if (elapsed >= 45) {
              if (
                streamFlushTimer
              ) {
                clearTimeout(
                  streamFlushTimer
                );
                streamFlushTimer =
                  null;
              }

              flushAssistantMessage();
              return;
            }

            if (
              streamFlushTimer
            ) {
              return;
            }

            streamFlushTimer =
              setTimeout(
                () => {
                  streamFlushTimer =
                    null;
                  flushAssistantMessage();
                },
                Math.max(
                  30,
                  45 - elapsed
                )
              );
          };

        while (
          true
        ) {

          const {
            done,
            value,
          } =
            await reader.read();

          if (
            done
          )
            break;

          const chunk =
            decoder.decode(
              value
            );

          assistantText +=
            chunk;

          scheduleStreamFlush();
        }

        if (
          streamFlushTimer
        ) {
          clearTimeout(
            streamFlushTimer
          );
          streamFlushTimer =
            null;
        }

        flushAssistantMessage();

        speakText(
          assistantText
        );

        let persistedChatId =
          currentChatId;

        if (pendingChat) {
          const persistedChat =
            await pendingChat;

          if (
            persistedChat &&
            temporaryChatId
          ) {
            persistedChatId =
              persistedChat.id;
            chatStore.replaceChatId(
              temporaryChatId,
              persistedChat
            );
            chatStore.setMessages(
              persistedChat.id,
              [
                ...updatedMessages,
                {
                  role:
                    "assistant",
                  content:
                    assistantText,
                  created_at:
                    assistantTimestamp,
                  updated_at:
                    new Date().toISOString(),
                },
              ]
            );
            setChatId(
              persistedChat.id
            );
            router.replace(
              `/chat?chatId=${persistedChat.id}`
            );
            window.dispatchEvent(
              new CustomEvent(
                "inquire:refresh-chats",
                {
                  detail: {
                    chatId:
                      persistedChat.id,
                  },
                }
              )
            );
          } else if (
            temporaryChatId
          ) {
            chatStore.removeChat(
              temporaryChatId
            );
          }
        }

        const persistedAt =
          new Date().toISOString();

        if (
          persistedChatId &&
          !persistedChatId.startsWith(
            "temp-"
          )
        ) {
          chatStore.updateChatActivity(
            persistedChatId,
            persistedAt
          );
        }

	        await supabase
	          .from("messages")
          .insert([
            {
              chat_id:
                persistedChatId,

              user_id:
                userId,

              role:
                "user",

	              content:
	                userMessageContent,
              created_at:
                updatedMessages[
                  updatedMessages.length -
                    1
                ].created_at,
              updated_at:
                persistedAt,
            },

            {
              chat_id:
                persistedChatId,

              user_id:
                userId,

              role:
                "assistant",

              content:
                assistantText,
              created_at:
                assistantTimestamp,
              updated_at:
                persistedAt,
            },
	          ]);

        if (
          persistedChatId &&
          !persistedChatId.startsWith(
            "temp-"
          )
        ) {
          await supabase
            .from("chats")
            .update({
              updated_at:
                persistedAt,
            })
            .eq(
              "id",
              persistedChatId
            )
            .eq(
              "user_id",
              userId
            );
        }

		      } catch (
        err
      ) {

        console.log(
          err
        );
      }

      setLoading(
        false
      );
    };

  return (
    <main className="h-screen w-full overflow-hidden bg-[#050505] text-white">

      <div className="relative flex h-screen p-2 md:p-4 gap-4">

        {/* SIDEBAR */}

        <aside className="hidden">

          <div className="px-6 pt-7">

            <div className="flex items-center gap-4">

              <div className="w-14 h-14 rounded-3xl bg-gradient-to-br from-purple-400 to-purple-700 flex items-center justify-center">

                <Sparkles className="text-white" />

              </div>

              <div>

                <h1 className="text-3xl font-semibold">
                  Inquire
                </h1>

                <p className="text-white/40 text-sm">
                  AI Workspace
                </p>

              </div>

            </div>

            <button
              onClick={
                createChat
              }
              className="mt-8 w-full h-16 rounded-3xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] transition-all flex items-center gap-4 px-6"
            >

              <Pencil size={20} />

              New Chat

            </button>

            <LeadEngineMenu />
            <button
  onClick={async () => {
    const authHeaders =
      await getAuthHeaders();

    const res =
      await fetch(
        "/api/checkout",
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json",
            ...authHeaders,
          },

          body:
            JSON.stringify(
              {
                userId,
              }
            ),
        }
      );

    const data =
      await res.json();

    if (
      data.url
    ) {

      window.location.href =
        data.url;
    }
  }}
  className="mt-4 w-full h-14 rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-semibold hover:scale-[1.02] transition"
>

  Upgrade to Pro

</button>
            <div className="mt-8 space-y-2 max-h-[65vh] overflow-y-auto">

              {chats.map(
                (
                  chat
                ) => (

                  <div
                    key={
                      chat.id
                    }
                    className={`w-full flex items-center gap-2 px-4 py-4 rounded-2xl transition ${
                      chatId ===
                      chat.id
                        ? "bg-purple-500/20"
                        : "hover:bg-white/[0.04]"
                    }`}
                  >

                    <button
                      onClick={() =>
                        setChatId(
                          chat.id
                        )
                      }
                      className="min-w-0 flex-1 flex items-center gap-3 text-left"
                    >

                      <MessageSquare
                        size={
                          16
                        }
                        className="shrink-0"
                      />

                      <span className="truncate">
                        {
                          chat.title ||
                          "New Chat"
                        }
                      </span>

                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        renameChat(
                          chat
                        )
                      }
                      aria-label="Rename chat"
                      title="Rename chat"
                      className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-white/45 hover:text-white hover:bg-white/10 transition"
                    >

                      <Edit3
                        size={
                          14
                        }
                      />

                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        window.dispatchEvent(
                          new CustomEvent(
                            "inquire:request-delete-chat",
                            {
                              detail: {
                                chat,
                              },
                            }
                          )
                        )
                      }
                      aria-label="Delete chat"
                      title="Delete chat"
                      className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-white/45 hover:text-red-300 hover:bg-red-500/10 transition"
                    >

                      <Trash2
                        size={
                          14
                        }
                      />

                    </button>

                  </div>
                )
              )}

            </div>

	          </div>

          <div className="px-6 pb-6">

            <button
              type="button"
              onClick={
                logout
              }
              className="w-full h-14 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] transition flex items-center gap-3 px-5 text-white/75 hover:text-white"
            >

              <LogOut
                size={
                  18
                }
              />

              Logout

            </button>

          </div>
	
	        </aside>

        {/* MAIN */}

        <section className="flex-1 rounded-[38px] border border-white/10 bg-white/[0.03] backdrop-blur-3xl relative overflow-hidden">

          <div className="h-full overflow-y-auto px-4 md:px-10 pt-20 pb-40">

            <div className="max-w-4xl mx-auto space-y-6">

              {messages.length ===
                0 && (

                <div className="h-[60vh] flex flex-col items-center justify-center text-center">

                  <h1 className="text-5xl md:text-6xl font-semibold bg-gradient-to-r from-white to-purple-300 bg-clip-text text-transparent">

                    Inquire AI

                  </h1>

                  <p className="text-white/40 mt-6 text-lg md:text-xl">

                    Your futuristic AI workspace.

                  </p>

                </div>
              )}

              {messages.map(
                (
                  message,
                  i
                ) => {
                  const timestamp =
                    getMessageTimestamp(
                      message
                    );
                  const dateKey =
                    getDateGroupKey(
                      timestamp
                    );
                  const previous =
                    messages[
                      i - 1
                    ];
                  const previousKey =
                    previous
                      ? getDateGroupKey(
                          getMessageTimestamp(
                            previous
                          )
                        )
                      : null;
                  const showDateDivider =
                    dateKey !==
                    previousKey;
                  const leadMessage =
                    message.role ===
                      "assistant" &&
                    (
                      isLeadPayload(
                        String(
                          message.content
                        )
                      ) ||
                      isLeadModePayload(
                        String(
                          message.content
                        )
                      )
                    );

                  return (
                  <Fragment
                    key={`${i}-${dateKey}`}
                  >
                    {showDateDivider && (
                      <DateDivider
                        label={formatDateSeparatorLabel(
                          timestamp
                        )}
                      />
                    )}

                  <MotionMessage
                    key={`message-${i}`}
                    className={`flex ${
                      message.role ===
                      "user"
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >

                    <div
                      className={`${leadMessage ? "w-full max-w-full" : "max-w-[90%] md:max-w-[80%]"} rounded-[28px] px-5 py-4 text-base md:text-lg leading-relaxed whitespace-pre-wrap ${
                        message.role ===
                        "user"
                          ? "bg-white text-black"
                          : "bg-white/[0.05] border border-white/10"
                      }`}
                    >

                      <ChatMessageContent
                        message={
                          message
                        }
                      />

                      <MessageTimestamp
                        timestamp={
                          timestamp
                        }
                        align={
                          message.role ===
                          "user"
                            ? "right"
                            : "left"
                        }
                        tone={
                          message.role ===
                          "user"
                            ? "dark"
                            : "muted"
                        }
                      />

                    </div>

                  </MotionMessage>
                  </Fragment>
                  );
                }
              )}

              <div ref={bottomRef} />

            </div>

          </div>

          {/* INPUT */}

          <div className="absolute bottom-4 md:bottom-8 left-1/2 -translate-x-1/2 w-[95%] md:w-[78%]">

            <div className="rounded-[34px] border border-white/10 bg-[#111116]/95 backdrop-blur-3xl px-5 py-4">

	              <textarea
                value={input}
                onChange={(e) =>
                  setInput(
                    e.target.value
                  )
                }
                placeholder="Ask Inquire anything..."
                className="w-full bg-transparent outline-none resize-none text-lg md:text-xl placeholder:text-white/30 min-h-[60px]"
                onKeyDown={(e) => {

                  if (
                    e.key ===
                      "Enter" &&
                    !e.shiftKey
                  ) {

                    e.preventDefault();

                    sendMessage();
                  }
                }}
	              />

              {selectedFile && (
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-3">

                  <div className="text-sm text-white/70 truncate">
                    Selected:{" "}
                    <span className="text-white">
                      {
                        selectedFile.name
                      }
                    </span>
                  </div>

                  {imagePreviewUrl && (
                    <img
                      src={
                        imagePreviewUrl
                      }
                      alt={
                        selectedFile.name
                      }
                      className="mt-3 max-h-40 rounded-xl object-contain"
                    />
                  )}

                </div>
              )}
	
	              <div className="flex items-center justify-between mt-4">

                <div className="flex items-center gap-3">

	                  <label
                      onClick={() =>
                        console.log(
                          "Attachment flow: attachment button clicked."
                        )
                      }
                      className="w-12 h-12 rounded-2xl bg-white/[0.04] flex items-center justify-center cursor-pointer"
                    >
	
	                    <Paperclip size={18} />
	
	                    <input
	                      type="file"
	                      hidden
	                      accept="image/*,.pdf,application/pdf"
                      onChange={
                        handleFileChange
                      }
	                    />

                  </label>

                  <button
                    onClick={
                      startVoiceInput
                    }
                    className="w-12 h-12 rounded-2xl bg-white/[0.04] flex items-center justify-center"
                  >

                    <Mic size={18} />

                  </button>

                </div>

                <button
                  onClick={
                    sendMessage
                  }
                  disabled={
                    loading
                  }
                  className="w-14 h-14 rounded-2xl bg-white text-black flex items-center justify-center disabled:opacity-50"
                >

                  <Send size={20} />

                </button>

              </div>

            </div>

          </div>

        </section>

      </div>

    </main>
  );
}

function DateDivider({
  label,
}: {
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="h-px flex-1 bg-white/10" />
      <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/45">
        {label}
      </span>
      <div className="h-px flex-1 bg-white/10" />
    </div>
  );
}
