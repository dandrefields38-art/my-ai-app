"use client";

import {
  type ChangeEvent,
  useEffect,
  useRef,
  useState,
  memo,
} from "react";

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
} from "lucide-react";

import ReactMarkdown from "react-markdown";

import remarkGfm from "remark-gfm";

import { motion } from "framer-motion";

import { supabase } from "@/lib/supabase";

type Message = {
  role: "user" | "assistant";
  content: string;
};

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

type Chat = {
  id: string;
  title: string;
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

const MarkdownMessage =
  memo(
    function MarkdownMessage({
      content,
    }: {
      content: string;
    }) {
      return (
        <ReactMarkdown
          remarkPlugins={[
            remarkGfm,
          ]}
          components={{
            img: (
              props
            ) => (
              <img
                {...props}
                loading="lazy"
                className="rounded-2xl max-w-full"
                alt=""
              />
            ),
          }}
        >
          {content}
        </ReactMarkdown>
		  );
    }
  );

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

        loadChats(
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

      const { data } =
        await supabase
          .from("chats")
          .select("*")
          .eq(
            "user_id",
            currentUserId
          )
          .order(
            "created_at",
            {
              ascending:
                false,
            }
          );

      if (data) {

        setChats(data);

        if (
          data.length > 0
        ) {

          setChatId(
            data[0].id
          );
        }
      }
    };

  // =====================
  // LOAD MESSAGES
  // =====================

  useEffect(() => {

    if (!chatId)
      return;

    loadMessages(
      chatId
    );

  }, [chatId]);

  const loadMessages =
    async (
      selectedChatId: string
    ) => {

      const { data } =
        await supabase
          .from("messages")
          .select("*")
          .eq(
            "chat_id",
            selectedChatId
          )
          .order(
            "created_at",
            {
              ascending:
                true,
            }
          );

      if (data) {

        setMessages(
          data.map(
            (
              m: any
            ) => ({
              role:
                m.role,

              content:
                m.content,
            })
          )
        );
      }
    };

  // =====================
  // CREATE CHAT
  // =====================

  const createChat =
    async () => {

      if (!userId)
        return;

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

        setChats(
          (
            prev
          ) => [
            data,
            ...prev,
          ]
        );

        setChatId(
          data.id
        );

        setMessages(
          []
        );
      }
    };

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

      setChats(
        (
          prev
        ) =>
          prev.map(
            (
              chat
            ) =>
              chat.id ===
              selectedChatId
                ? {
                    ...chat,
                    title:
                      nextTitle,
                  }
                : chat
          )
      );

      return true;
    };

  const renameChat =
    async (
      selectedChat: Chat
    ) => {

      const title =
        prompt(
          "Rename chat",
          selectedChat.title ||
            "New Chat"
        );

      if (title === null)
        return;

      await updateChatTitle(
        selectedChat.id,
        title
      );
    };

  const deleteChat =
    async (
      selectedChatId: string
    ) => {

      if (!userId)
        return;

      const confirmed =
        window.confirm(
          "Delete this chat?"
        );

      if (!confirmed)
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

      setChats(
        (
          prev
        ) => {
          const nextChats =
            prev.filter(
              (
                chat
              ) =>
                chat.id !==
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

          return nextChats;
        }
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
	      window.location.href =
	        "/login";
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

	        const { data } =
	          await supabase
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
            .single();

        if (!data) {

          setLoading(
            false
          );

          return;
        }

        currentChatId =
          data.id;

        setChatId(
          data.id
        );

        setChats(
          (
            prev
          ) => [
            data,
            ...prev,
          ]
        );
      }

      const updatedMessages =
        [
          ...messages,
          {
            role:
              "user" as const,

	            content:
	              userMessageContent,
	          },
	        ];

      setMessages(
        updatedMessages
      );

	      setInput("");

	      if (
	        updatedMessages.length === 1 &&
	        currentChatId
	      ) {
	
	        await updateChatTitle(
	          currentChatId,
		          getChatTitle(
		            titleText
		          )
	        );
	  
	      }
      try {

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

          setMessages(
            (
              prev
            ) => [
              ...prev,
              {
                role:
                  "assistant",

                content:
                  reply,
              },
            ]
          );

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

        setMessages(
          (
            prev
          ) => [
            ...prev,
            {
              role:
                "assistant",

              content:
                "",
            },
          ]
        );

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

          setMessages(
            (
              prev
            ) => {

              const updated =
                [
                  ...prev,
                ];

              updated[
                updated.length -
                  1
              ] = {
                role:
                  "assistant",

                content:
                  assistantText,
              };

              return updated;
            }
          );
        }

        speakText(
          assistantText
        );

	        await supabase
	          .from("messages")
          .insert([
            {
              chat_id:
                currentChatId,

              user_id:
                userId,

              role:
                "user",

	              content:
	                userMessageContent,
            },

            {
              chat_id:
                currentChatId,

              user_id:
                userId,

              role:
                "assistant",

              content:
                assistantText,
            },
	          ]);

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
    <main className="h-screen w-screen overflow-hidden bg-[#050505] text-white">

      <div className="relative flex h-screen p-2 md:p-4 gap-4">

        {/* SIDEBAR */}

        <aside className="hidden md:flex w-[290px] rounded-[32px] border border-white/10 bg-white/[0.03] backdrop-blur-3xl overflow-hidden flex-col justify-between">

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
            <button
  onClick={async () => {

    const res =
      await fetch(
        "/api/checkout",
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json",
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
                        deleteChat(
                          chat.id
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
                ) => (

                  <motion.div
                    key={i}
                    initial={{
                      opacity: 0,
                    }}
                    animate={{
                      opacity: 1,
                    }}
                    transition={{
                      duration: 0.15,
                    }}
                    className={`flex ${
                      message.role ===
                      "user"
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >

                    <div
                      className={`max-w-[90%] md:max-w-[80%] rounded-[28px] px-5 py-4 text-base md:text-lg leading-relaxed whitespace-pre-wrap ${
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

                    </div>

                  </motion.div>
                )
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
