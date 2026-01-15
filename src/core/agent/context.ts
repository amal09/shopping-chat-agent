import type { ChatMessage } from "../types/chat";

export function getLastUserMessage(messages: ChatMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") return messages[i].content.trim();
  }
  return "";
}

/**
 * ✅ Prefer meta.usedCatalogIds (robust) and fall back to legacy marker parsing.
 */
export function extractLastUsedCatalogIds(messages: ChatMessage[]): string[] {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "assistant") continue;

    // 1) ✅ meta wins
    const metaIds = m.meta?.usedCatalogIds;
    if (Array.isArray(metaIds) && metaIds.length) return metaIds;

    // 2) fallback legacy marker: [catalog_ids:oneplus-12r,pixel-8a]
    const match = m.content.match(/\[catalog_ids:\s*([^\]]+)\]/i);
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
  const t = (text || "").toLowerCase();

  const phrases = [
    "this phone",
    "that phone",
    "this one",
    "that one",
    "i like this",
    "i like that",
    "i like it",
    "tell me more",
    "tell me more about it",
    "more details",
    "need more details",
    "more info",
    "details please",
    "specs",
    "full specs",
    "tell me about it",
    "about it",
    "is it good",
    "should i buy",
    "is this good",
    "is that good"
  ];

  return phrases.some((p) => t.includes(p));
}
