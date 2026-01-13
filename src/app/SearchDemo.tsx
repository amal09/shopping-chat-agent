"use client";

import { useMemo, useState } from "react";
import type { Phone } from "@/core/types/phone";
import { parseUserQuery } from "@/core/catalog/queryParser";
import { formatInr } from "@/core/utils/money";

type Props = {
  phones: Phone[];
};

export default function SearchDemo({ phones }: Props) {
  const [query, setQuery] = useState("Best camera phone under ₹30,000");

  const results = useMemo(() => {
    const q = parseUserQuery(query);

    // Local search demo (no repo here). We'll use repo in API later.
    let filtered = phones;

    if (q.budgetInr) filtered = filtered.filter((p) => p.priceInr <= q.budgetInr!);
    if (q.brandIncludes?.length) {
      const allowed = new Set(q.brandIncludes.map((b) => b.toLowerCase()));
      filtered = filtered.filter((p) => allowed.has(p.brand.toLowerCase()));
    }
    if (q.osPreference) filtered = filtered.filter((p) => p.os === q.osPreference);

    return { parsed: q, filtered };
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
        <h3>Parsed intent</h3>
        <pre style={{ background: "#f6f6f6", padding: 12, borderRadius: 8 }}>
          {JSON.stringify(results.parsed, null, 2)}
        </pre>
      </div>

      <div style={{ marginTop: 16 }}>
        <h3>Matched phones (filtered)</h3>
        <ul>
          {results.filtered.map((p) => (
            <li key={p.id}>
              {p.brand} {p.model} — {formatInr(p.priceInr)} ({p.os})
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
