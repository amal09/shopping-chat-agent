import type { ChatMessage } from "../types/chat";

export function getLastUserMessage(messages: ChatMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") return messages[i].content.trim();
  }
  return "";
}

/**
 * We store catalog IDs in assistant responses as `usedCatalogIds`.
 * The UI will include them in the assistant message content using a hidden marker.
 * This function extracts last used IDs from chat history.
 */
export function extractLastUsedCatalogIds(messages: ChatMessage[]): string[] {
  // Marker format: [catalog_ids:samsung-a55,moto-g54]
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "assistant") continue;

    const match = m.content.match(/\[catalog_ids:([a-z0-9\-_,]+)\]/i);
    if (match?.[1]) {
      return match[1]
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
    }
  }
  return [];
}

export function looksLikeFollowUp(text: string): boolean {
  const t = text.toLowerCase();
  return (
    t.includes("this phone") ||
    t.includes("that phone") ||
    t.includes("i like this") ||
    t.includes("tell me more") ||
    t.includes("more details") ||
    t.includes("specs") ||
    t.includes("details")
  );
}
