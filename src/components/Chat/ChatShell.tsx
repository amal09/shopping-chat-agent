"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ChatResponse, ChatMessage } from "@/core/types/chat";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";

type UiMessage =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; response?: ChatResponse };

const QUICK_PROMPTS = [
  'Best camera phone under ₹25k',
  'Battery king with fast charging around ₹15k',
  'Compare Pixel 8a vs OnePlus 12R',
  'Explain OIS vs EIS',
  'Show me Samsung phones only under ₹25k'
];

export default function ChatShell() {
  const [messages, setMessages] = useState<UiMessage[]>([
    {
      role: "assistant",
      content:
        "Hi! Tell me your budget and what matters most (camera/battery/performance/compact), or ask for a comparison like “Pixel 8a vs OnePlus 12R”."
    }
  ]);
  const [loading, setLoading] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, loading]);

  const apiMessages: ChatMessage[] = useMemo(() => {
    return messages.map((m) => ({
      role: m.role,
      content: m.content   // 👈 KEEP catalog_ids for backend
    }));
  }, [messages]);


  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    // optimistic add user message
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setLoading(true);

    try {
      const payload = {
        messages: [...apiMessages, { role: "user", content: trimmed }]
      };

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = (await res.json()) as ChatResponse;

      // carry usedCatalogIds forward invisibly for follow-ups
      const marker = data.usedCatalogIds?.length ? `\n[catalog_ids:${data.usedCatalogIds.join(",")}]` : "";

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: (data.message || "Here are the results.") + marker,
          response: data
        }
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Something went wrong while contacting the server. Please try again."
        }
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="chips">
        {QUICK_PROMPTS.map((p) => (
          <button key={p} className="chip" onClick={() => sendMessage(p)} disabled={loading}>
            {p}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", height: "calc(100vh - 200px)" }}>
        <div className="chatArea">
          <MessageList messages={messages} loading={loading} />
          <div ref={bottomRef} />
        </div>

        <div className="inputBar">
          <MessageInput onSend={sendMessage} disabled={loading} />
          <div className="smallMuted" style={{ marginTop: 8 }}>
            Grounded to catalog • Safety guard enabled • Try comparisons with “vs”
          </div>
        </div>
      </div>
    </>
  );
}
