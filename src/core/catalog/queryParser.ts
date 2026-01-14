import type { OsType, PhoneFeature } from "../types/phone";
import { normalize } from "../utils/text";

export interface ParsedQuery {
  raw: string;

  budgetInr?: number;          // "under 30000" or "₹30k"
  brandIncludes?: string[];    // ["Samsung"]
  osPreference?: OsType;       // Android / iOS
  features?: PhoneFeature[];   // camera, battery, compact...
}

const BRAND_ALIASES: Record<string, string[]> = {
  Apple: ["apple", "iphone", "ios"],
  Samsung: ["samsung", "galaxy"],
  Google: ["google", "pixel"],
  OnePlus: ["oneplus", "one plus"],
  Xiaomi: ["xiaomi", "redmi", "mi"],
  Motorola: ["motorola", "moto"]
};

const FEATURE_KEYWORDS: Record<PhoneFeature, string[]> = {
  camera: ["camera", "photo", "photos", "selfie", "portrait", "video"],
  battery: ["battery", "battery king", "backup", "screen on time", "sot"],
  performance: ["performance", "fast", "smooth", "lag", "processor"],
  display: ["display", "screen", "amoled", "oled", "120hz", "refresh rate"],
  charging: ["charging", "fast charging", "charger", "100w", "67w"],
  compact: ["compact", "small", "one hand", "one-hand", "one handed"],
  gaming: ["gaming", "fps", "bgmi", "cod", "pubg"]
};

function parseBudgetInr(text: string): number | undefined {
  const t = normalize(text);

   // Handle ₹25k, ₹30K, ₹30,000
  const rupeeWithK = t.match(/₹\s*(\d{1,3})\s*k\b/i);
  if (rupeeWithK?.[1]) {
    const num = Number(rupeeWithK[1]) * 1000;
    if (Number.isFinite(num) && num > 0) return num;
  }

  const rupeeMatch = t.match(/₹\s*([0-9][0-9,]*)/);
  if (rupeeMatch?.[1]) {
    const num = Number(rupeeMatch[1].replace(/,/g, ""));
    if (Number.isFinite(num) && num > 0) return num;
  }

  // "30k", "15k"
  const kMatch = t.match(/(\d{1,3})\s*k\b/);
  if (kMatch?.[1]) {
    const num = Number(kMatch[1]) * 1000;
    if (Number.isFinite(num) && num > 0) return num;
  }

  // plain number after under/below/within/around
  const underMatch = t.match(/\b(under|below|within|around)\s+(\d{4,6})\b/);
  if (underMatch?.[2]) {
    const num = Number(underMatch[2]);
    if (Number.isFinite(num) && num > 0) return num;
  }

  return undefined;
}

function parseOs(text: string): OsType | undefined {
  const t = normalize(text);
  if (t.includes("android")) return "Android";
  if (t.includes("ios") || t.includes("iphone")) return "iOS";
  return undefined;
}

function parseBrands(text: string): string[] | undefined {
  const t = normalize(text);
  const matched: string[] = [];

  for (const [brand, aliases] of Object.entries(BRAND_ALIASES)) {
    if (aliases.some((a) => t.includes(a))) matched.push(brand);
  }

  return matched.length ? matched : undefined;
}

function parseFeatures(text: string): PhoneFeature[] | undefined {
  const t = normalize(text);
  const matched = new Set<PhoneFeature>();

  for (const [feature, keywords] of Object.entries(FEATURE_KEYWORDS) as Array<
    [PhoneFeature, string[]]
  >) {
    if (keywords.some((k) => t.includes(normalize(k)))) {
      matched.add(feature);
    }
  }

  return matched.size ? Array.from(matched) : undefined;
}

export function parseUserQuery(raw: string): ParsedQuery {
  return {
    raw,
    budgetInr: parseBudgetInr(raw),
    osPreference: parseOs(raw),
    brandIncludes: parseBrands(raw),
    features: parseFeatures(raw)
  };
}
