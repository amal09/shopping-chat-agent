import type { SearchResult } from "./catalogSearch";
import { formatInr } from "../utils/money";

export function presentSearchResults(results: SearchResult[]) {
  return results.map((r) => ({
    id: r.phone.id,
    title: `${r.phone.brand} ${r.phone.model}`,
    price: formatInr(r.phone.priceInr),
    score: Number(r.score.toFixed(2)),
    reasons: r.reasons
  }));
}
