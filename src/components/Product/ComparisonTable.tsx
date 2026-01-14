import type { ComparisonView } from "@/core/types/chat";

export default function ComparisonTable({ comparison }: { comparison: ComparisonView }) {
  return (
    <div style={{ overflowX: "auto", border: "1px solid #eee", borderRadius: 12 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
        <thead>
          <tr style={{ background: "#fafafa" }}>
            <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>Spec</th>
            {comparison.headers.map((h, i) => (
              <th key={i} style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {comparison.rows.map((r, idx) => (
            <tr key={idx}>
              <td style={{ padding: 10, borderBottom: "1px solid #f0f0f0", fontWeight: 600 }}>{r.label}</td>
              {r.values.map((v, i) => (
                <td key={i} style={{ padding: 10, borderBottom: "1px solid #f0f0f0" }}>
                  {v}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
