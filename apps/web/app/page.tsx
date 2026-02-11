"use client";

import { useEffect, useRef, useState } from "react";
import { hc } from "hono/client";
import type { AppType } from "../../backend/src/index";

const client = hc<AppType>(
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3000"
);

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

type Order = {
  id: string;
  product: string;
  productType: string;
  quantity: string;
  totalAmount: string;
  currency: string;
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
  shippingAddress: string;
  createdAt: string;
  paymentId: string | null;
  paymentStatus: "pending" | "completed" | "failed" | "refunded" | null;
  paymentMethod: "card" | "bank_transfer" | "wallet" | null;
};

const STATUS_PHRASES = [
  "Thinking",
  "Searching",
  "Looking that up",
  "Checking records",
  "Analyzing",
  "Processing",
  "Fetching details",
  "On it",
];

const ORDER_STATUS_STYLES: Record<string, string> = {
  pending:   "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400",
  confirmed: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
  shipped:   "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400",
  delivered: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
};

const PAYMENT_STATUS_STYLES: Record<string, string> = {
  pending:   "text-yellow-500",
  completed: "text-green-500",
  failed:    "text-red-500",
  refunded:  "text-zinc-400",
};

function TypingIndicator() {
  const [phrase, setPhrase] = useState(
    () => STATUS_PHRASES[Math.floor(Math.random() * STATUS_PHRASES.length)]
  );

  useEffect(() => {
    const id = setInterval(() => {
      setPhrase(STATUS_PHRASES[Math.floor(Math.random() * STATUS_PHRASES.length)]);
    }, 2000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="self-start bg-zinc-100 dark:bg-zinc-800 px-4 py-3 rounded-xl rounded-bl-sm flex items-center gap-2">
      <div className="flex items-center gap-1">
        <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
        <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
        <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
      <span className="text-xs text-zinc-400">{phrase}</span>
    </div>
  );
}

function OrdersPanel() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.orders.$get()
      .then((r) => r.json())
      .then((data) => setOrders(data as Order[]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="px-5 py-3 text-sm text-zinc-400">Loading…</p>;
  if (!orders.length) return <p className="px-5 py-3 text-sm text-zinc-400">No orders found.</p>;

  return (
    <ul className="flex-1 overflow-y-auto">
      {orders.map((order) => (
        <li key={order.id} className="flex flex-col gap-1 px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-900">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium truncate">{order.product}</span>
            <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${ORDER_STATUS_STYLES[order.status] ?? ""}`}>
              {order.status}
            </span>
          </div>
          <span className="text-xs text-zinc-400">{order.id} · {order.currency} {Number(order.totalAmount).toLocaleString()}</span>
          {order.paymentStatus && (
            <span className={`text-xs font-medium capitalize ${PAYMENT_STATUS_STYLES[order.paymentStatus] ?? ""}`}>
              {order.paymentStatus} · {order.paymentMethod?.replace("_", " ")}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function Home() {
  const [tab, setTab] = useState<"chat" | "orders">("chat");
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<ConversationDetail | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selected?.messages, sending]);

  useEffect(() => {
    client.chat.conversation.$get()
      .then((r) => r.json())
      .then((data) => setConvos(data as Conversation[]))
      .finally(() => setLoadingList(false));
  }, []);

  async function sendMessage() {
    if (!input.trim() || !selected) return;
    setSending(true);
    const content = input.trim();
    setInput("");

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

    const res = await client.chat.message.$post({
      json: { conversationId: selected.id, content },
    });

    if (res.ok) {
      const agentMsg = await res.json() as Message;
      setSelected((prev) =>
        prev ? { ...prev, messages: [...prev.messages, agentMsg] } : prev
      );
    }

    setSending(false);
  }

  async function openConvo(id: string) {
    setLoadingDetail(true);
    const res = await client.chat.conversation[":id"].$get({ param: { id } });
    const data = await res.json() as ConversationDetail;
    setSelected(data);
    setLoadingDetail(false);
  }

  return (
    <div className="flex h-screen font-sans bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      {/* Sidebar */}
      <aside className="w-70 min-w-[220px] flex flex-col border-r border-zinc-200 dark:border-zinc-800 overflow-hidden">
        {/* Sidebar tab switcher */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 px-4">
          {(["chat", "orders"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={[
                "py-3.5 px-1 mr-5 text-xs font-semibold border-b-2 -mb-px transition-colors capitalize tracking-wide",
                tab === t
                  ? "border-blue-500 text-blue-500"
                  : "border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300",
              ].join(" ")}
            >
              {t === "orders" ? "🛒 Orders" : "💬 Chats"}
            </button>
          ))}
        </div>

        {tab === "chat" ? (
          loadingList ? (
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
          )
        ) : (
          <OrdersPanel />
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

              {sending && <TypingIndicator />}
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
