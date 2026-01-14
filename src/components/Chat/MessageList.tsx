import type { ChatResponse } from "@/core/types/chat";
import ProductCard from "../Product/ProductCard";
import ComparisonTable from "../Product/ComparisonTable";

type UiMessage =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; response?: ChatResponse };

export default function MessageList({
  messages,
  loading
}: {
  messages: UiMessage[];
  loading: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {messages.map((m, idx) => (
        <div
          key={idx}
          style={{
            alignSelf: m.role === "user" ? "flex-end" : "flex-start",
            maxWidth: "800px",
            width: "100%"
          }}
        >
          <div
            style={{
              background: m.role === "user" ? "#111" : "#f6f6f6",
              color: m.role === "user" ? "#fff" : "#111",
              padding: 12,
              borderRadius: 12,
              whiteSpace: "pre-wrap",
              lineHeight: 1.4
            }}
          >
            {m.content}
          </div>

          {/* Render structured results if assistant message includes response */}
          {m.role === "assistant" && m.response?.products?.length ? (
            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              {m.response.products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : null}

          {m.role === "assistant" && m.response?.comparison ? (
            <div style={{ marginTop: 10 }}>
              <ComparisonTable comparison={m.response.comparison} />
            </div>
          ) : null}
        </div>
      ))}

      {loading ? (
        <div style={{ alignSelf: "flex-start", background: "#f6f6f6", padding: 12, borderRadius: 12 }}>
          Thinking…
        </div>
      ) : null}
    </div>
  );
}
