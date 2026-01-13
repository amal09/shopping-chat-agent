"use client";

import { useMemo, useState } from "react";
import type { Phone } from "@/core/types/phone";
import { parseUserQuery } from "@/core/catalog/queryParser";
import { evaluateSafety } from "@/core/agent/safety";
import { presentSearchResults } from "@/core/catalog/catalogPresenter";

type Props = {
  phones: Phone[];
};

type LocalSearchResult = {
  id: string;
  title: string;
  price: string;
  score: number;
  reasons: string[];
};

// local scoring mirrors core logic lightly for demo; real one will run in API with repo.
function scoreLocal(phone: Phone, rawQuery: string): { score: number; reasons: string[] } {
  const q = parseUserQuery(rawQuery);
  let score = 0;
  const reasons: string[] = [];

  if (q.budgetInr && phone.priceInr <= q.budgetInr) {
    score += 10;
    reasons.push("Within budget");
  }

  if (q.osPreference && phone.os === q.osPreference) {
    score += 4;
    reasons.push(`Matches OS preference (${q.osPreference})`);
  }

  for (const f of q.features ?? []) {
    if (f === "camera") {
      if (phone.tags?.includes("camera")) {
        score += 6;
        reasons.push("Strong camera focus");
      }
      if (phone.hasOis) {
        score += 2;
        reasons.push("Has OIS (stabilization)");
      }
    }

    if (f === "battery") {
      if (phone.batteryMah && phone.batteryMah >= 5000) {
        score += 4;
        reasons.push("Good battery size");
      }
      if (phone.batteryMah && phone.batteryMah >= 5500) {
        score += 2;
        reasons.push("Excellent battery size");
      }
    }

    if (f === "charging") {
      if (phone.chargingW && phone.chargingW >= 33) {
        score += 4;
        reasons.push("Fast charging");
      }
      if (phone.chargingW && phone.chargingW >= 80) {
        score += 2;
        reasons.push("Very fast charging");
      }
    }

    if (f === "compact") {
      if (phone.displayInches && phone.displayInches <= 6.2) {
        score += 6;
        reasons.push("Compact / one-hand friendly size");
      }
    }

    if (f === "display") {
      if (phone.refreshRateHz && phone.refreshRateHz >= 120) {
        score += 4;
        reasons.push("120Hz smooth display");
      }
    }

    if (f === "performance" || f === "gaming") {
      if (phone.tags?.includes("performance")) {
        score += 4;
        reasons.push("Performance-oriented");
      }
    }
  }

  return { score, reasons };
}

export default function SearchDemo({ phones }: Props) {
  const [query, setQuery] = useState("Best camera phone under ₹30,000");

  const view = useMemo(() => {
    const safety = evaluateSafety(query);
    const parsed = parseUserQuery(query);

    if (safety.action === "refuse") {
      return { safety, parsed, results: [] as LocalSearchResult[] };
    }

    let filtered = phones;

    if (parsed.budgetInr) filtered = filtered.filter((p) => p.priceInr <= parsed.budgetInr!);
    if (parsed.brandIncludes?.length) {
      const allowed = new Set(parsed.brandIncludes.map((b) => b.toLowerCase()));
      filtered = filtered.filter((p) => allowed.has(p.brand.toLowerCase()));
    }
    if (parsed.osPreference) filtered = filtered.filter((p) => p.os === parsed.osPreference);

    const scored = filtered
      .map((p) => ({ phone: p, ...scoreLocal(p, query) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    // reuse presenter shape (even though this is demo scoring)
    const presented = presentSearchResults(
      scored.map((x) => ({ phone: x.phone, score: x.score, reasons: x.reasons }))
    );

    return {
      safety,
      parsed,
      results: presented
    };
  }, [query, phones]);

  return (
    <div style={{ marginTop: 20 }}>
      <label style={{ display: "block", marginBottom: 8 }}>Try a query</label>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ width: "100%", padding: 10, border: "1px solid #ccc", borderRadius: 8 }}
        placeholder="e.g., Samsung under 25k"
      />

      <div style={{ marginTop: 16 }}>
        <h3>Safety decision</h3>
        <pre style={{ background: "#f6f6f6", padding: 12, borderRadius: 8 }}>
          {JSON.stringify(view.safety, null, 2)}
        </pre>

        {view.safety.action === "refuse" && (
          <p style={{ marginTop: 8, padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
            {view.safety.safeReply}
          </p>
        )}
      </div>

      <div style={{ marginTop: 16 }}>
        <h3>Parsed intent</h3>
        <pre style={{ background: "#f6f6f6", padding: 12, borderRadius: 8 }}>
          {JSON.stringify(view.parsed, null, 2)}
        </pre>
      </div>

      <div style={{ marginTop: 16 }}>
        <h3>Ranked results</h3>
        {view.results.length === 0 && view.safety.action === "allow" && (
          <p>No matches in current catalog. Try increasing budget or removing brand filters.</p>
        )}

        <ol>
          {view.results.map((r) => (
            <li key={r.id} style={{ marginBottom: 12 }}>
              <div>
                <strong>{r.title}</strong> — {r.price} <span style={{ opacity: 0.7 }}>(score {r.score})</span>
              </div>
              {r.reasons.length > 0 && (
                <ul style={{ marginTop: 6 }}>
                  {r.reasons.map((x, idx) => (
                    <li key={idx}>{x}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
