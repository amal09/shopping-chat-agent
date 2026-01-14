import type { ChatResponse } from "@/core/types/chat";
import ProductCard from "../Product/ProductCard";
import ComparisonTable from "../Product/ComparisonTable";

type UiMessage =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; response?: ChatResponse };

export default function MessageList({ messages, loading }: { messages: UiMessage[]; loading: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {messages.map((m, idx) => {
        const clean = m.content.replace(/\n?\[catalog_ids:[^\]]+\]\s*$/i, "");
        const isUser = m.role === "user";

        return (
          <div key={idx} className={`msgWrap ${isUser ? "msgUser" : "msgAssistant"}`}>
            <div className={`bubble ${isUser ? "bubbleUser" : "bubbleAssistant"}`}>{clean}</div>

            {m.role === "assistant" && m.response?.products?.length ? (
              <div className="cards">
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
        );
      })}

      {loading ? (
        <div className="msgWrap msgAssistant">
          <div className="bubble bubbleAssistant">Thinking…</div>
        </div>
      ) : null}
    </div>
  );
}
