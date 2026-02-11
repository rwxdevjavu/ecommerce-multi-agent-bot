"use client";

import { useEffect, useRef, useState } from "react";

const BACKEND = "http://localhost:3000";

type Conversation = {
  id: string;
  userId: number;
  subject: string | null;
  createdAt: string;
  updatedAt: string;
};

type Message = {
  id: string;
  conversationId: string;
  role: "user" | "agent";
  content: string;
  createdAt: string;
};

type ConversationDetail = Conversation & { messages: Message[] };

function TypingIndicator() {
  return (
    <div className="self-start bg-zinc-100 dark:bg-zinc-800 px-4 py-3 rounded-xl rounded-bl-sm flex items-center gap-1.5">
      <span
        className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce"
        style={{ animationDelay: "0ms" }}
      />
      <span
        className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce"
        style={{ animationDelay: "150ms" }}
      />
      <span
        className="w-2 h-2 bg-zinc-400 rounded-full animate-bounce"
        style={{ animationDelay: "300ms" }}
      />
    </div>
  );
}

export default function Home() {
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<ConversationDetail | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom whenever messages change or typing indicator appears
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selected?.messages, sending]);

  useEffect(() => {
    fetch(`${BACKEND}/chat/conversation`)
      .then((r) => r.json())
      .then(setConvos)
      .finally(() => setLoadingList(false));
  }, []);

  async function sendMessage() {
    if (!input.trim() || !selected) return;
    setSending(true);
    const content = input.trim();
    setInput("");

    // Optimistically add the user message to the UI
    const userMsg: Message = {
      id: crypto.randomUUID(),
      conversationId: selected.id,
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };
    setSelected((prev) =>
      prev ? { ...prev, messages: [...prev.messages, userMsg] } : prev
    );

    const res = await fetch(`${BACKEND}/chat/message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId: selected.id, content }),
    });

    if (res.ok) {
      // Backend now returns the full agent message row with real id + createdAt
      const agentMsg: Message = await res.json();
      setSelected((prev) =>
        prev ? { ...prev, messages: [...prev.messages, agentMsg] } : prev
      );
    }

    setSending(false);
  }

  async function openConvo(id: string) {
    setLoadingDetail(true);
    const res = await fetch(`${BACKEND}/chat/conversation/${id}`);
    const data: ConversationDetail = await res.json();
    setSelected(data);
    setLoadingDetail(false);
  }

  return (
    <div className="flex h-screen font-sans bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      {/* Sidebar */}
      <aside className="w-70 min-w-[220px] flex flex-col border-r border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <h2 className="px-5 py-4 text-xs font-semibold tracking-widest uppercase text-zinc-500 border-b border-zinc-200 dark:border-zinc-800">
          Conversations
        </h2>

        {loadingList ? (
          <p className="px-5 py-3 text-sm text-zinc-400">Loading…</p>
        ) : convos.length === 0 ? (
          <p className="px-5 py-3 text-sm text-zinc-400">No conversations yet.</p>
        ) : (
          <ul className="flex-1 overflow-y-auto">
            {convos.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => openConvo(c.id)}
                  className={[
                    "flex flex-col gap-1 w-full px-5 py-3.5 text-left border-b border-zinc-100 dark:border-zinc-900 transition-colors",
                    selected?.id === c.id
                      ? "bg-blue-50 dark:bg-blue-950 border-l-[3px] border-l-blue-500 pl-[17px]"
                      : "hover:bg-zinc-50 dark:hover:bg-zinc-900",
                  ].join(" ")}
                >
                  <span className="text-sm font-medium truncate">
                    {c.subject ?? "Untitled"}
                  </span>
                  <span className="text-xs text-zinc-400">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      {/* Main panel */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {loadingDetail ? (
          <p className="m-auto text-sm text-zinc-400">Loading messages…</p>
        ) : !selected ? (
          <p className="m-auto text-sm text-zinc-400">
            Select a conversation to view messages.
          </p>
        ) : (
          <>
            <header className="flex items-baseline gap-3 px-7 py-5 border-b border-zinc-200 dark:border-zinc-800">
              <h1 className="text-lg font-semibold">{selected.subject ?? "Untitled"}</h1>
              <span className="text-sm text-zinc-400">
                {selected.messages.length} message
                {selected.messages.length !== 1 ? "s" : ""}
              </span>
            </header>

            <div className="flex-1 overflow-y-auto px-7 py-6 flex flex-col gap-4">
              {selected.messages.length === 0 ? (
                <p className="m-auto text-sm text-zinc-400">
                  No messages in this conversation.
                </p>
              ) : (
                selected.messages.map((m) => (
                  <div
                    key={m.id}
                    className={[
                      "max-w-[68%] px-4 py-3 rounded-xl text-sm leading-relaxed",
                      m.role === "user"
                        ? "self-end bg-blue-500 text-white rounded-br-sm"
                        : "self-start bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-bl-sm",
                    ].join(" ")}
                  >
                    <span className="block text-[11px] font-semibold tracking-wider uppercase mb-1 opacity-60">
                      {m.role}
                    </span>
                    <p>{m.content}</p>
                  </div>
                ))
              )}

              {/* Typing indicator — shown while waiting for agent response */}
              {sending && <TypingIndicator />}

              {/* Scroll anchor */}
              <div ref={bottomRef} />
            </div>
          </>
        )}

        {/* Message bar */}
        <div className="px-7 py-4 border-t border-zinc-200 dark:border-zinc-800 flex gap-3 items-end">
          <textarea
            className="flex-1 resize-none rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 max-h-40"
            rows={1}
            placeholder={selected ? "Type a message…" : "Select a conversation first"}
            value={input}
            disabled={!selected || sending}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = `${el.scrollHeight}px`;
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!selected || !input.trim() || sending}
            className="shrink-0 px-4 py-3 rounded-xl bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {sending ? "Sending…" : "Send"}
          </button>
        </div>
      </main>
    </div>
  );
}
