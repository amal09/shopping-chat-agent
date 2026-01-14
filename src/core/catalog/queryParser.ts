import type { OsType, PhoneFeature } from "../types/phone";
import { normalize } from "../utils/text";

export interface ParsedQuery {
  raw: string;

  budgetInr?: number;          // "under 30000" or "₹30k"
  brandIncludes?: string[];    // ["Samsung"]
  osPreference?: OsType;       // Android / iOS
  features?: PhoneFeature[];   // camera, battery, compact...
}

/**
 * Aliases include:
 * - brand name variants ("oneplus", "one plus")
 * - model-family hints ("galaxy", "pixel", "iphone")
 * - common misspellings ("samsng", "onepluse", "motrola")
 */
const BRAND_ALIASES: Record<string, string[]> = {
  Apple: [
    "apple", "iphone", "i phone", "iphon", "iphne", "iphn", "ios", "i os",
    "apple phone", "apple mobile"
  ],
  Samsung: [
    "samsung", "samsng", "samzung", "samsumg", "sumssung",
    "galaxy", "galaxi", "galexy",
    "sam", "ss" // light shorthand (kept, but can cause false positives; remove if needed)
  ],
  Google: [
    "google", "googl", "googel",
    "pixel", "poxel", "pixle", "pixal"
  ],
  OnePlus: [
    "oneplus", "one plus", "onepls", "onepluse", "onepluus", "1+",
    "op", "oppo oneplus" // users sometimes say this
  ],
  Xiaomi: [
    "xiaomi", "xiomi", "xiami", "xaomi",
    "redmi", "redme", "redmi ",
    "mi", "mi phone", "mi mobile"
  ],
  Motorola: [
    "motorola", "motrola", "motarola", "moto", "motu",
    "edge", "g series", "g54", "g84" // families sometimes typed without brand
  ],
  Nothing: [
    "nothing", "nothng", "nothing phone", "phone 1", "phone 2", "phone 2a"
  ],
  Realme: [
    "realme", "relame", "realm", "real mi" // common confusion
  ],
  Oppo: [
    "oppo", "opo", "opp"
  ],
  Vivo: [
    "vivo", "vvo", "viva"
  ]
};

const FEATURE_KEYWORDS: Record<PhoneFeature, string[]> = {
  camera: [
    "camera", "cam", "photo", "photos", "selfie", "portrait", "video",
    "night mode", "low light", "stabilization", "stabilisation",
    "ois", "eis", "ultrawide", "telephoto", "zoom"
  ],
  battery: [
    "battery", "backup", "screen on time", "sot", "all day",
    "battery king", "big battery", "long battery", "good battery"
  ],
  performance: [
    "performance", "fast", "smooth", "snappy", "lag", "no lag", "processor",
    "chip", "chipset", "heating", "thermals", "multitask", "multitasking"
  ],
  display: [
    "display", "screen", "amoled", "oled", "ltpo",
    "120hz", "90hz", "refresh rate", "hdr", "brightness"
  ],
  charging: [
    "charging", "fast charging", "charger", "supervooc", "warp charge",
    "100w", "80w", "67w", "65w", "44w", "33w", "25w", "18w",
    "quick charge", "qc", "pd", "usb c"
  ],
  compact: [
    "compact", "small", "one hand", "one-hand", "one handed", "one-handed",
    "easy to hold", "lightweight", "pocket friendly", "6.1", "6.2"
  ],
  gaming: [
    "gaming", "fps", "bgmi", "cod", "pubg", "genshin",
    "high graphics", "gyro", "cooling"
  ]
};

function parseBudgetInr(text: string): number | undefined {
  const t = normalize(text);

  // ₹25k / ₹25 k / rs 25k / inr 25k
  const rupeeWithK = t.match(/(?:₹|rs|inr)\s*(\d{1,3})\s*k\b/i);
  if (rupeeWithK?.[1]) {
    const num = Number(rupeeWithK[1]) * 1000;
    if (Number.isFinite(num) && num > 0) return num;
  }

  // ₹30,000 / rs 30000 / inr 30000
  const rupeeMatch = t.match(/(?:₹|rs|inr)\s*([0-9][0-9,]*)/i);
  if (rupeeMatch?.[1]) {
    const num = Number(rupeeMatch[1].replace(/,/g, ""));
    if (Number.isFinite(num) && num > 0) return num;
  }

  // plain "30k", "15 k"
  const kMatch = t.match(/\b(\d{1,3})\s*k\b/i);
  if (kMatch?.[1]) {
    const num = Number(kMatch[1]) * 1000;
    if (Number.isFinite(num) && num > 0) return num;
  }

  // "under/below/within/around 25000" OR "under/below/within/around 25k"
  const underMatch = t.match(/\b(under|below|within|around|upto|up to|less than)\s+(\d{1,3}\s*k|\d{4,6})\b/i);
  if (underMatch?.[2]) {
    const rawVal = underMatch[2].replace(/\s+/g, "");
    const num =
      rawVal.endsWith("k")
        ? Number(rawVal.replace("k", "")) * 1000
        : Number(rawVal);
    if (Number.isFinite(num) && num > 0) return num;
  }

  // "budget 25k"
  const budgetMatch = t.match(/\bbudget\s+(\d{1,3}\s*k|\d{4,6})\b/i);
  if (budgetMatch?.[1]) {
    const rawVal = budgetMatch[1].replace(/\s+/g, "");
    const num =
      rawVal.endsWith("k")
        ? Number(rawVal.replace("k", "")) * 1000
        : Number(rawVal);
    if (Number.isFinite(num) && num > 0) return num;
  }

  return undefined;
}

function parseOs(text: string): OsType | undefined {
  const t = normalize(text);

  // iOS signals
  if (
    t.includes("ios") ||
    t.includes("i os") ||
    t.includes("iphone") ||
    t.includes("i phone") ||
    t.includes("apple")
  ) return "iOS";

  // Android signals
  if (
    t.includes("android") ||
    t.includes("andriod") ||   // common misspelling
    t.includes("androind") ||  // common misspelling
    t.includes("aosp")
  ) return "Android";

  return undefined;
}

function parseBrands(text: string): string[] | undefined {
  const t = normalize(text);
  const matched: string[] = [];

  for (const [brand, aliases] of Object.entries(BRAND_ALIASES)) {
    if (aliases.some((a) => t.includes(normalize(a)))) {
      matched.push(brand);
    }
  }

  // De-dupe
  const uniq = Array.from(new Set(matched));
  return uniq.length ? uniq : undefined;
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
