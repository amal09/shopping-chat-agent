import type { Phone } from "../types/phone";
import type { CatalogRepo } from "./catalogRepo";
import type { ParsedQuery } from "./queryParser";

export interface SearchResult {
  phone: Phone;
  score: number;
  reasons: string[]; // human-readable reasons for ranking
}

function scorePhone(phone: Phone, q: ParsedQuery): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // Budget: prefer phones well under budget (but still close to budget is okay)
  if (q.budgetInr) {
    if (phone.priceInr <= q.budgetInr) {
      score += 10;
      reasons.push("Within budget");
      const closeness = 1 - (q.budgetInr - phone.priceInr) / q.budgetInr; // closer to budget slightly better
      score += Math.max(0, Math.min(3, closeness * 3));
    }
  }

  // OS preference
  if (q.osPreference && phone.os === q.osPreference) {
    score += 4;
    reasons.push(`Matches OS preference (${q.osPreference})`);
  }

  // Feature scoring based on tags/specs
  const features = q.features ?? [];
  for (const f of features) {
    switch (f) {
      case "camera":
        if (phone.tags?.includes("camera")) {
          score += 6;
          reasons.push("Strong camera focus");
        }
        if (phone.hasOis) {
          score += 2;
          reasons.push("Has OIS (stabilization)");
        }
        break;

      case "battery":
        if (phone.batteryMah) {
          // Rough scoring: 4500+ decent, 5000+ good, 5500+ excellent
          if (phone.batteryMah >= 5500) {
            score += 6;
            reasons.push("Excellent battery size");
          } else if (phone.batteryMah >= 5000) {
            score += 4;
            reasons.push("Good battery size");
          } else if (phone.batteryMah >= 4500) {
            score += 2;
            reasons.push("Decent battery size");
          }
        }
        break;

      case "charging":
        if (phone.chargingW) {
          if (phone.chargingW >= 80) {
            score += 6;
            reasons.push("Very fast charging");
          } else if (phone.chargingW >= 33) {
            score += 4;
            reasons.push("Fast charging");
          } else if (phone.chargingW >= 18) {
            score += 2;
            reasons.push("Standard charging");
          }
        }
        break;

      case "compact":
        if (phone.displayInches && phone.displayInches <= 6.2) {
          score += 6;
          reasons.push("Compact / one-hand friendly size");
        } else if (phone.displayInches && phone.displayInches <= 6.5) {
          score += 3;
          reasons.push("Relatively manageable size");
        }
        break;

      case "display":
        if (phone.refreshRateHz) {
          if (phone.refreshRateHz >= 120) {
            score += 4;
            reasons.push("120Hz smooth display");
          } else if (phone.refreshRateHz >= 90) {
            score += 2;
            reasons.push("High refresh display");
          }
        }
        break;

      case "performance":
      case "gaming":
        // We don't have chipset info yet; use rating/tags as proxy (transparent limitation)
        if (phone.tags?.includes("performance")) {
          score += 4;
          reasons.push("Performance-oriented");
        }
        if (f === "gaming" && phone.tags?.includes("performance")) {
          score += 2;
          reasons.push("Suitable for gaming (proxy)");
        }
        break;
    }
  }

  // Slight boost for curated rating if present
  if (typeof phone.rating === "number") {
    score += Math.max(0, Math.min(3, (phone.rating - 3.5) * 2));
  }

  return { score, reasons };
}

export async function searchCatalog(
  repo: CatalogRepo,
  q: ParsedQuery,
  limit = 5
): Promise<SearchResult[]> {
  const all = await repo.getAllPhones();

  // Hard filters first
  let filtered = all;

  if (q.budgetInr) {
    filtered = filtered.filter((p) => p.priceInr <= q.budgetInr!);
  }

  if (q.brandIncludes?.length) {
    const allowed = new Set(q.brandIncludes.map((b) => b.toLowerCase()));
    filtered = filtered.filter((p) => allowed.has(p.brand.toLowerCase()));
  }

  if (q.osPreference) {
    filtered = filtered.filter((p) => p.os === q.osPreference);
  }

  // Score and rank
  const scored = filtered.map((phone) => {
    const { score, reasons } = scorePhone(phone, q);
    return { phone, score, reasons };
  });

  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, limit);
}
