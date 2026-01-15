export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;

  // ✅ Robust follow-up context (avoid hiding ids inside content strings)
  meta?: {
    usedCatalogIds?: string[];
  };
}

export type ChatMode = "recommend" | "compare" | "explain" | "clarify" | "refuse";

export interface ChatProductCard {
  id: string;
  title: string;
  priceInr: number;
  highlights: string[];
}

export interface ChatComparisonRow {
  label: string;
  values: string[];
}

export interface ChatComparison {
  productIds: string[];
  headers: string[];
  rows: ChatComparisonRow[];
}

export interface ChatResponse {
  mode: ChatMode;
  message: string;
  products?: ChatProductCard[];
  comparison?: ChatComparison;
  usedCatalogIds?: string[];
}
