import type { Phone } from "../types/phone";
import { normalize } from "../utils/text";

function scoreNameMatch(phone: Phone, query: string): number {
  const q = normalize(query);
  const full = normalize(`${phone.brand} ${phone.model}`);
  const model = normalize(phone.model);
  const brand = normalize(phone.brand);

  let score = 0;
  if (q === full) score += 100;
  if (q.includes(full)) score += 70;
  if (q.includes(model)) score += 50;
  if (q.includes(brand)) score += 10;

  return score;
}

export function extractVsPair(text: string): { left: string; right: string } | null {
  const t = text.replace(/\s+/g, " ").trim();
  // supports: "A vs B", "A VS B", "A versus B"
  const m = t.match(/(.+?)\s+(vs|versus)\s+(.+)/i);
  if (!m) return null;

  return { left: m[1].trim(), right: m[3].trim() };
}

export function resolvePhoneByName(phones: Phone[], name: string): Phone | null {
  const scored = phones
    .map((p) => ({ p, s: scoreNameMatch(p, name) }))
    .sort((a, b) => b.s - a.s);

  if (!scored.length || scored[0].s < 30) return null; // threshold
  return scored[0].p;
}
