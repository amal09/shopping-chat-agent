"use client";

import { useState } from "react";
import type { ChatResponse } from "@/core/types/chat";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";

type UiMessage =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; response?: ChatResponse };

export default function ChatShell() {
  const [messages, setMessages] = useState<UiMessage[]>([
    {
      role: "assistant",
      content:
        "Hi! Tell me your budget and what matters most (camera/battery/performance/compact), or ask for a comparison like “Pixel 8a vs OnePlus 12R”."
    }
  ]);
  const [loading, setLoading] = useState(false);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setLoading(true);

    const payload = {
      messages: messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({ role: m.role, content: m.content }))
        .concat([{ role: "user", content: trimmed }])
    };

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = (await res.json()) as ChatResponse;
      const marker =
        data.usedCatalogIds?.length ? `\n[catalog_ids:${data.usedCatalogIds.join(",")}]` : "";

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: (data.message || "Here are the results.") + marker,
          response: data
        }
      ]);
    } catch (e: any) {
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
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 40px)" }}>
      <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
        <MessageList messages={messages} loading={loading} />
      </div>

      <div style={{ borderTop: "1px solid #eee", padding: 16 }}>
        <MessageInput onSend={sendMessage} disabled={loading} />
      </div>
    </div>
  );
}
