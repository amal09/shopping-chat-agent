import type { Phone } from "./phone";

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export type ResponseMode = "recommend" | "compare" | "explain" | "clarify" | "refuse";

export interface ProductCard {
  id: string;
  title: string;          // e.g., "Google Pixel 8a"
  priceInr: number;
  highlights: string[];   // bullets shown in UI
}

export interface ComparisonRow {
  label: string;          // e.g., "Battery"
  values: string[];       // one per product in same order
}

export interface ComparisonView {
  productIds: string[];
  headers: string[];      // product names
  rows: ComparisonRow[];
}

export interface ChatResponse {
  mode: ResponseMode;
  message: string;
  products?: ProductCard[];
  comparison?: ComparisonView;
  usedCatalogIds?: string[]; // for traceability/debug
}
