"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";
import {
  usePathname,
  useRouter,
} from "next/navigation";

import {
  ChevronDown,
  ChevronRight,
  CreditCard,
  Edit3,
  LogOut,
  Menu,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Search,
  Settings,
  Sparkles,
  Trash2,
  X,
  Zap,
} from "lucide-react";

import LeadEngineMenu from "@/app/components/LeadEngineMenu";
import {
  chatStore,
  type ChatSummary,
} from "@/lib/chatStore";
import {
  formatActivityDate,
  formatDateTime,
  formatRelativeDateGroup,
  getTimestampDate,
} from "@/lib/dateTime";
import { supabase } from "@/lib/supabase";

const workspaceRoutes = [
  "/chat",
  "/lead-engine",
  "/leads",
  "/billing",
  "/settings",
  "/upgrade",
];

type Chat = ChatSummary;

type ChatGroup = {
  label: string;
  chats: Chat[];
};

const prefetchRoutes = [
  "/chat",
  "/lead-engine",
  "/settings",
  "/billing",
  "/upgrade",
  "/leads",
];

const getChatActivityTimestamp = (
  chat: Chat
) =>
  chat.updated_at ||
  chat.created_at ||
  "0";

const getChatGroupLabel = (
  chat: Chat
) =>
  formatRelativeDateGroup(
    getChatActivityTimestamp(chat)
  );

const formatChatActivity = (
  chat: Chat
) =>
  formatActivityDate(
    getChatActivityTimestamp(chat)
  );

const formatFullChatActivity = (
  chat: Chat
) =>
  formatDateTime(
    getChatActivityTimestamp(chat)
  );

const hasChatActivity = (
  chat: Chat
) =>
  Boolean(
    chat.updated_at &&
      chat.updated_at !==
        chat.created_at
  );

function RailTooltip({
  label,
}: {
  label: string;
}) {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute left-[calc(100%+12px)] top-1/2 z-[70] hidden -translate-y-1/2 whitespace-nowrap rounded-md border border-white/10 bg-[#15151b] px-2.5 py-1.5 text-xs font-medium text-white shadow-xl shadow-black/30 group-hover:block"
    >
      {label}
    </span>
  );
}

function RailLink({
  href,
  label,
  active,
  children,
  className = "",
}: {
  href: string;
  label: string;
  active?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className={`group relative flex h-11 w-11 items-center justify-center rounded-lg text-white/60 transition hover:bg-white/[0.07] hover:text-white ${
        active
          ? "bg-white/[0.09] text-white"
          : ""
      } ${className}`}
    >
      {children}
      <RailTooltip label={label} />
    </Link>
  );
}

function RailButton({
  label,
  onClick,
  children,
  className = "",
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`group relative flex h-11 w-11 items-center justify-center rounded-lg text-white/60 transition hover:bg-white/[0.07] hover:text-white ${className}`}
    >
      {children}
      <RailTooltip label={label} />
    </button>
  );
}

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname =
    usePathname();
  const router =
    useRouter();
  const [collapsed, setCollapsed] =
    useState(false);
  const [mobileOpen, setMobileOpen] =
    useState(false);
  const [userId, setUserId] =
    useState<string | null>(
      null
    );
  const [chats, setChats] =
    useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] =
    useState<string | null>(
      null
    );
  const [renameTarget, setRenameTarget] =
    useState<Chat | null>(
      null
    );
  const [renameValue, setRenameValue] =
    useState("");
  const [deleteTarget, setDeleteTarget] =
    useState<Chat | null>(
      null
    );
  const [chatSearch, setChatSearch] =
    useState("");
  const [collapsedChatGroups, setCollapsedChatGroups] =
    useState<Record<string, boolean>>({
      Yesterday: true,
      "Last 7 Days": true,
      "Last 30 Days": true,
      Older: true,
    });

  const isWorkspace =
    workspaceRoutes.some(
      (
        route
      ) =>
        pathname === route ||
        pathname.startsWith(
          `${route}/`
        )
    );

  const groupedChats =
    useMemo<ChatGroup[]>(
      () => {
        const query =
          chatSearch
            .trim()
            .toLowerCase();
        const filtered =
          chats
            .filter(
              (
                chat
              ) =>
                !query ||
                (
                  chat.title ||
                  "New Chat"
                )
                  .toLowerCase()
                  .includes(query)
            )
            .sort(
              (
                a,
                b
              ) =>
                getTimestampDate(
                  getChatActivityTimestamp(
                    b
                  )
                ).getTime() -
                getTimestampDate(
                  getChatActivityTimestamp(
                    a
                  )
                ).getTime()
            );
        const groups =
          new Map<
            string,
            Chat[]
          >();

        [
          "Today",
          "Yesterday",
          "Last 7 Days",
          "Last 30 Days",
          "Older",
        ].forEach(
          (
            label
          ) =>
            groups.set(
              label,
              []
            )
        );

        filtered.forEach(
          (
            chat
          ) => {
            groups
              .get(
                getChatGroupLabel(
                  chat
                )
              )
              ?.push(chat);
          }
        );

        return Array.from(
          groups.entries()
        )
          .map(
            ([
              label,
              groupChats,
            ]) => ({
              label,
              chats:
                groupChats,
            })
          )
          .filter(
            (
              group
            ) =>
              group.chats
                .length > 0
          );
      },
      [
        chats,
        chatSearch,
      ]
    );

  useEffect(() => {
    const stored =
      window.localStorage.getItem(
        "inquire-sidebar-collapsed"
      );

    if (stored) {
      setCollapsed(
        stored === "true"
      );
    }
  }, []);

  useEffect(() => {
    prefetchRoutes.forEach(
      (
        route
      ) => {
        router.prefetch(route);
      }
    );
  }, [router]);

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

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleResize =
      () => {
        if (
          window.innerWidth >=
          768
        ) {
          setMobileOpen(false);
        }
      };

    window.addEventListener(
      "resize",
      handleResize
    );

    return () =>
      window.removeEventListener(
        "resize",
        handleResize
      );
  }, []);

  useEffect(() => {
    if (!isWorkspace) {
      return;
    }

    const loadUser =
      async () => {
        const {
          data: {
            user,
          },
        } =
          await supabase.auth.getUser();

        setUserId(
          user?.id || null
        );
      };

    loadUser();
  }, [isWorkspace]);

  const loadChats =
    async (
      currentUserId = userId
    ) => {
      if (!currentUserId) {
        setChats([]);
        return;
      }

      await chatStore.loadChats(
        currentUserId
      );
    };

  useEffect(() => {
    if (!userId) {
      return;
    }

    loadChats(userId);
  }, [userId]);

  useEffect(() => {
    const refreshChats =
      (
        event: Event
      ) => {
        const detail =
          (
            event as CustomEvent<{
              chatId?: string;
            }>
          ).detail;

        if (detail?.chatId) {
          setActiveChatId(
            detail.chatId
          );
        }

        if (userId) {
          chatStore.loadChats(
            userId,
            true
          );
        }
      };

    window.addEventListener(
      "inquire:refresh-chats",
      refreshChats
    );

    return () =>
      window.removeEventListener(
        "inquire:refresh-chats",
        refreshChats
      );
  }, [userId]);

  useEffect(() => {
    const handleRename =
      (
        event: Event
      ) => {
        const chat =
          (
            event as CustomEvent<{
              chat?: Chat;
            }>
          ).detail?.chat;

        if (chat) {
          openRenameModal(chat);
        }
      };
    const handleDelete =
      (
        event: Event
      ) => {
        const chat =
          (
            event as CustomEvent<{
              chat?: Chat;
            }>
          ).detail?.chat;

        if (chat) {
          openDeleteModal(chat);
        }
      };

    window.addEventListener(
      "inquire:request-rename-chat",
      handleRename
    );
    window.addEventListener(
      "inquire:request-delete-chat",
      handleDelete
    );

    return () => {
      window.removeEventListener(
        "inquire:request-rename-chat",
        handleRename
      );
      window.removeEventListener(
        "inquire:request-delete-chat",
        handleDelete
      );
    };
  }, []);

  useEffect(() => {
    if (
      typeof window === "undefined"
    ) {
      return;
    }

    const params =
      new URLSearchParams(
        window.location.search
      );

    setActiveChatId(
      params.get("chatId")
    );
  }, [pathname]);

  const toggleSidebar =
    () => {
      setCollapsed(
        (
          current
        ) => {
          const next =
            !current;

          window.localStorage.setItem(
            "inquire-sidebar-collapsed",
            String(next)
          );

          return next;
        }
      );
    };

  const closeSidebar =
    () => {
      setMobileOpen(false);
      setCollapsed(true);
      window.localStorage.setItem(
        "inquire-sidebar-collapsed",
        "true"
      );
    };

  const startNewChat =
    () => {
      if (
        pathname.startsWith(
          "/chat"
        )
      ) {
        window.dispatchEvent(
          new CustomEvent(
            "inquire:new-chat"
          )
        );
        return;
      }

      router.push(
        "/chat?new=1"
      );
    };

  const openChat =
    (
      chatId: string
    ) => {
      setActiveChatId(chatId);
      router.push(
        `/chat?chatId=${chatId}`
      );
      window.dispatchEvent(
        new CustomEvent(
          "inquire:select-chat",
          {
            detail: {
              chatId,
            },
          }
        )
    );
  };

  const toggleChatGroup =
    (
      label: string
    ) => {
      if (label === "Today") {
        return;
      }

      setCollapsedChatGroups(
        (
          current
        ) => ({
          ...current,
          [label]:
            !current[label],
        })
      );
    };

  const openRenameModal =
    (
      chat: Chat
    ) => {
      setRenameTarget(chat);
      setRenameValue(
        chat.title ||
          "New Chat"
      );
    };

  const renameChat =
    async (
      chat: Chat,
      title: string
    ) => {
      if (!userId) {
        return;
      }

      if (
        !title.trim()
      ) {
        return;
      }

      const nextTitle =
        title.trim();
      const { error } =
        await supabase
          .from("chats")
          .update({
            title:
              nextTitle,
          })
          .eq("id", chat.id)
          .eq(
            "user_id",
            userId
          );

      if (error) {
        console.log(
          "APP SHELL CHAT RENAME ERROR:",
          error
        );
        return;
      }

      chatStore.updateChatTitle(
        chat.id,
        nextTitle
      );

      setRenameTarget(null);
      setRenameValue("");
    };

  const openDeleteModal =
    (
      chat: Chat
    ) => {
      setDeleteTarget(chat);
    };

  const deleteChat =
    async (
      chat: Chat
    ) => {
      if (!userId) {
        return;
      }

      const chatId =
        chat.id;
      const {
        error: messagesError,
      } =
        await supabase
          .from("messages")
          .delete()
          .eq(
            "chat_id",
            chatId
          )
          .eq(
            "user_id",
            userId
          );

      if (messagesError) {
        console.log(
          "APP SHELL CHAT MESSAGES DELETE ERROR:",
          messagesError
        );
        return;
      }

      const { error } =
        await supabase
          .from("chats")
          .delete()
          .eq("id", chatId)
          .eq(
            "user_id",
            userId
          );

      if (error) {
        console.log(
          "APP SHELL CHAT DELETE ERROR:",
          error
        );
        return;
      }

      chatStore.removeChat(chatId);

      if (
        activeChatId === chatId
      ) {
        setActiveChatId(null);
        router.push("/chat");
        window.dispatchEvent(
          new CustomEvent(
            "inquire:select-chat",
            {
              detail: {
                chatId:
                  null,
              },
            }
          )
        );
      }

      setDeleteTarget(null);
    };

  const logout =
    async () => {
      await supabase.auth.signOut();
      router.replace(
        "/login"
      );
    };

  if (!isWorkspace) {
    return (
      <div className="page-transition">
        {children}
      </div>
    );
  }

  const isChatActive =
    pathname.startsWith(
      "/chat"
    );
  const isLeadEngineActive =
    pathname.startsWith(
      "/lead-engine"
    ) ||
    pathname.startsWith(
      "/leads"
    );
  const isSettingsActive =
    pathname.startsWith(
      "/settings"
    );
  const isBillingActive =
    pathname.startsWith(
      "/billing"
    );
  const isUpgradeActive =
    pathname.startsWith(
      "/upgrade"
    );

  return (
    <div
      className="inquire-shell h-screen overflow-hidden bg-[#050505] text-white"
      style={
        {
          "--sidebar-width":
            collapsed
              ? "72px"
              : "320px",
        } as React.CSSProperties
      }
    >
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={closeSidebar}
          className="fixed inset-0 z-40 bg-black/45 backdrop-blur-sm md:hidden"
        />
      )}

      {!mobileOpen && (
        <button
          type="button"
          aria-label="Open sidebar"
          title="Open sidebar"
          onClick={() =>
            setMobileOpen(true)
          }
          className="fixed left-3 top-3 z-30 flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 bg-[#111116]/90 text-white shadow-xl shadow-black/30 backdrop-blur md:hidden"
        >
          <Menu size={19} />
        </button>
      )}

      <aside
        className={`inquire-sidebar fixed left-0 top-0 z-50 h-screen transform-gpu border-r border-white/10 bg-[#0b0b0f]/96 shadow-2xl shadow-black/40 backdrop-blur-2xl ${
          collapsed
            ? "is-collapsed"
            : ""
        } ${
          mobileOpen
            ? "is-mobile-open"
            : ""
        }`}
      >
        {collapsed &&
        !mobileOpen ? (
          <div className="flex h-full w-[72px] flex-col items-center overflow-visible">
            <header className="flex w-full flex-col items-center gap-2 border-b border-white/10 py-3">
              <Link
                href="/chat"
                aria-label="Inquire"
                title="Inquire"
                className="group relative flex h-11 w-11 items-center justify-center rounded-lg bg-white/[0.06] text-white transition hover:bg-white/[0.1]"
              >
                <Sparkles size={19} />
                <RailTooltip label="Inquire" />
              </Link>
              <RailButton
                label="Expand sidebar"
                onClick={toggleSidebar}
              >
                <PanelLeftOpen
                  size={18}
                />
              </RailButton>
            </header>

            <nav className="flex flex-1 flex-col items-center gap-2 py-3">
              <RailButton
                label="New Chat"
                onClick={startNewChat}
                className="bg-white text-black hover:bg-white/90 hover:text-black"
              >
                <Pencil size={17} />
              </RailButton>
              <RailLink
                href="/chat"
                label="Chat"
                active={isChatActive}
              >
                <MessageSquare
                  size={18}
                />
              </RailLink>
              <RailLink
                href="/lead-engine"
                label="Lead Engine"
                active={
                  isLeadEngineActive
                }
                className="text-emerald-100/70 hover:bg-emerald-400/10 hover:text-emerald-50"
              >
                <Sparkles
                  size={18}
                />
              </RailLink>
              <RailLink
                href="/settings"
                label="Settings"
                active={
                  isSettingsActive
                }
              >
                <Settings
                  size={17}
                />
              </RailLink>
              <RailLink
                href="/billing"
                label="Billing"
                active={
                  isBillingActive
                }
              >
                <CreditCard
                  size={17}
                />
              </RailLink>
              <RailLink
                href="/upgrade"
                label="Upgrade"
                active={
                  isUpgradeActive
                }
                className="text-amber-100/70 hover:bg-amber-300/10 hover:text-amber-50"
              >
                <Zap size={17} />
              </RailLink>
            </nav>

            <footer className="flex w-full justify-center border-t border-white/10 py-3">
              <RailButton
                label="Logout"
                onClick={logout}
              >
                <LogOut
                  size={17}
                />
              </RailButton>
            </footer>
          </div>
        ) : (
          <div className="flex h-full flex-col overflow-hidden p-3">
            <div className="flex h-full flex-col overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.03]">
              <div className="flex items-center justify-between gap-3 px-5 py-5">
                <Link
                  href="/chat"
                  className="flex min-w-0 items-center gap-4"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-400 to-purple-700">
                    <Sparkles className="text-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-2xl font-semibold">
                      Inquire
                    </div>
                    <div className="text-sm text-white/40">
                      AI Workspace
                    </div>
                  </div>
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    if (
                      window.innerWidth <
                      768
                    ) {
                      closeSidebar();
                      return;
                    }

                    toggleSidebar();
                  }}
                  aria-label="Collapse sidebar"
                  title="Collapse sidebar"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/55 transition hover:bg-white/10 hover:text-white"
                >
                  <PanelLeftClose
                    className="hidden md:block"
                    size={18}
                  />
                  <X
                    className="md:hidden"
                    size={18}
                  />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
                <button
                  type="button"
                  onClick={
                    startNewChat
                  }
                  title="New Chat"
                  className="flex h-12 w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-left transition hover:bg-white/[0.08]"
                >
                  <Pencil size={18} />
                  New Chat
                </button>

                <Link
                  href="/chat"
                  title="Recent Chats"
                  className={`mt-3 flex h-12 items-center gap-3 rounded-2xl px-4 text-white/75 transition hover:bg-white/[0.06] hover:text-white ${
                    isChatActive
                      ? "bg-purple-500/20 text-white"
                      : "bg-white/[0.03]"
                  }`}
                >
                  <MessageSquare size={18} />
                  Recent Chats
                </Link>

                {isChatActive && (
                  <section className="mt-2 rounded-2xl border border-white/5 bg-black/10 p-2">
                    <div className="flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3">
                      <Search
                        size={15}
                        className="shrink-0 text-white/35"
                      />
                      <input
                        value={
                          chatSearch
                        }
                        onChange={(
                          event
                        ) =>
                          setChatSearch(
                            event.target
                              .value
                          )
                        }
                        placeholder="Search chats"
                        className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/30"
                      />
                    </div>

                    <div className="mt-3 max-h-[42vh] space-y-4 overflow-y-auto pr-1">
                      {chats.length ===
                      0 ? (
                        <div className="px-3 py-3 text-sm text-white/35">
                          Start your first conversation.
                        </div>
                      ) : groupedChats
                          .length === 0 ? (
                        <div className="px-3 py-3 text-sm text-white/35">
                          No chats found.
                        </div>
                      ) : (
                        groupedChats.map(
                          (
                            group
                          ) => {
                            const isCollapsed =
                              Boolean(
                                collapsedChatGroups[
                                  group.label
                                ]
                              );
                            const isToggleable =
                              group.label !==
                              "Today";

                            return (
                            <div
                              key={
                                group.label
                              }
                              className="space-y-1"
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  toggleChatGroup(
                                    group.label
                                  )
                                }
                                disabled={
                                  !isToggleable
                                }
                                className="flex h-7 w-full items-center justify-between rounded-lg px-2 text-[11px] font-medium uppercase tracking-wide text-white/38 transition hover:bg-white/[0.04] disabled:cursor-default disabled:hover:bg-transparent"
                              >
                                <span>
                                  {group.label}
                                </span>
                                <span className="flex items-center gap-1 text-white/28">
                                  {
                                    group.chats
                                      .length
                                  }
                                  {isToggleable ? (
                                    isCollapsed ? (
                                      <ChevronRight
                                        size={
                                          13
                                        }
                                      />
                                    ) : (
                                      <ChevronDown
                                        size={
                                          13
                                        }
                                      />
                                    )
                                  ) : null}
                                </span>
                              </button>
                              {!isCollapsed &&
                              group.chats.map(
                                (
                                  chat
                                ) => (
                                  <div
                                    key={
                                      chat.id
                                    }
                                    className={`group flex items-center gap-1 rounded-xl transition ${
                                      activeChatId ===
                                      chat.id
                                        ? "border border-purple-300/20 bg-purple-500/25 shadow-[0_0_0_1px_rgba(216,180,254,0.08)]"
                                        : "hover:bg-white/[0.05]"
                                    }`}
                                  >
                                    <button
                                      type="button"
                                      onClick={() =>
                                        openChat(
                                          chat.id
                                        )
                                      }
                                      className="min-w-0 flex-1 px-3 py-2 text-left"
                                      title={`${chat.title || "New Chat"} • ${formatFullChatActivity(chat)}`}
                                    >
                                      <span className="flex min-w-0 items-center gap-2">
                                        {hasChatActivity(
                                          chat
                                        ) && (
                                          <span
                                            aria-label="New activity"
                                            className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.7)]"
                                          />
                                        )}
                                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-white/82">
                                          {chat.title ||
                                            "New Chat"}
                                        </span>
                                        <span className="shrink-0 text-[11px] text-white/35 transition group-hover:opacity-0">
                                          {formatChatActivity(
                                            chat
                                          )}
                                        </span>
                                      </span>
                                    </button>

                                    <div className="mr-1 flex shrink-0 items-center gap-0.5 opacity-100 transition md:opacity-0 md:group-hover:opacity-100">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        openRenameModal(
                                          chat
                                        )
                                      }
                                      aria-label="Rename chat"
                                      title="Rename"
                                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/35 transition hover:bg-white/10 hover:text-white"
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
                                        openDeleteModal(
                                          chat
                                        )
                                      }
                                      aria-label="Delete chat"
                                      title="Delete"
                                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/35 transition hover:bg-red-500/10 hover:text-red-200"
                                    >
                                      <Trash2
                                        size={
                                          14
                                        }
                                      />
                                    </button>
                                    </div>
                                  </div>
                                )
                              )}
                            </div>
                            );
                          }
                        )
                      )}
                    </div>
                  </section>
                )}

                <LeadEngineMenu />

                <div className="mt-3 space-y-2">
                  <Link
                    href="/settings"
                    title="Settings"
                    className={`flex h-11 items-center gap-3 rounded-2xl px-4 text-sm text-white/65 transition hover:bg-white/[0.06] hover:text-white ${
                      isSettingsActive
                        ? "bg-white/[0.08] text-white"
                        : ""
                    }`}
                  >
                    <Settings size={16} />
                    Settings
                  </Link>

                  <Link
                    href="/billing"
                    title="Billing"
                    className={`flex h-11 items-center gap-3 rounded-2xl px-4 text-sm text-white/65 transition hover:bg-white/[0.06] hover:text-white ${
                      isBillingActive
                        ? "bg-white/[0.08] text-white"
                        : ""
                    }`}
                  >
                    <CreditCard size={16} />
                    Billing
                  </Link>

                  <Link
                    href="/upgrade"
                    title="Upgrade"
                    className={`flex h-11 items-center gap-3 rounded-2xl px-4 text-sm text-white/65 transition hover:bg-white/[0.06] hover:text-white ${
                      isUpgradeActive
                        ? "bg-white/[0.08] text-white"
                        : ""
                    }`}
                  >
                    <Zap size={16} />
                    Upgrade
                  </Link>
                </div>
              </div>

              <div className="border-t border-white/10 p-3">
                <button
                  type="button"
                  onClick={
                    logout
                  }
                  title="Logout"
                  className="flex h-12 w-full items-center gap-3 rounded-2xl px-4 text-white/60 transition hover:bg-white/[0.06] hover:text-white"
                >
                  <LogOut size={17} />
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}
      </aside>

      <main
        className="inquire-main h-screen min-w-0 overflow-hidden"
      >
        <div className="h-full">
          {children}
        </div>
      </main>

      {renameTarget && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/65 p-4 backdrop-blur-md">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              renameChat(
                renameTarget,
                renameValue
              );
            }}
            className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#111116] p-5 shadow-2xl shadow-black/50"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">
                  Rename Chat
                </h2>
                <p className="mt-2 text-sm text-white/45">
                  Give this conversation a clear title.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setRenameTarget(null)
                }
                aria-label="Close rename modal"
                className="flex h-9 w-9 items-center justify-center rounded-xl text-white/45 transition hover:bg-white/10 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <input
              value={
                renameValue
              }
              onChange={(event) =>
                setRenameValue(
                  event.target.value
                )
              }
              autoFocus
              className="mt-5 h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-white outline-none transition focus:border-purple-300/40"
            />

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() =>
                  setRenameTarget(null)
                }
                className="h-11 rounded-2xl border border-white/10 px-4 text-white/70 transition hover:bg-white/[0.06] hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="h-11 rounded-2xl bg-white px-5 font-medium text-black transition hover:bg-white/90"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/65 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#111116] p-5 shadow-2xl shadow-black/50">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">
                  Delete Chat
                </h2>
                <p className="mt-2 text-sm text-white/45">
                  This will permanently delete the conversation.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setDeleteTarget(null)
                }
                aria-label="Close delete modal"
                className="flex h-9 w-9 items-center justify-center rounded-xl text-white/45 transition hover:bg-white/10 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
              <div className="text-xs uppercase text-white/35">
                Chat
              </div>
              <div className="mt-1 truncate font-medium text-white">
                {deleteTarget.title ||
                  "New Chat"}
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() =>
                  setDeleteTarget(null)
                }
                className="h-11 rounded-2xl border border-white/10 px-4 text-white/70 transition hover:bg-white/[0.06] hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  deleteChat(
                    deleteTarget
                  )
                }
                className="h-11 rounded-2xl bg-red-500 px-5 font-medium text-white transition hover:bg-red-400"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
