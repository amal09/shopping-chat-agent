import type { ChatComparison } from "@/core/types/chat";

export default function ComparisonTable({
  comparison,
}: {
  comparison?: ChatComparison;
}) {
  if (!comparison) return null;

  return (
    <div className="tableWrap">
      <table>
        <thead>
          <tr>
            <th>Spec</th>
            {comparison.headers.map((h, i) => (
              <th key={i}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {comparison.rows.map((r, idx) => (
            <tr key={idx}>
              <td style={{ fontWeight: 700 }}>{r.label}</td>
              {r.values.map((v, i) => (
                <td key={i}>{v}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
