import type { ProductCard as ProductCardType } from "@/core/types/chat";
import { formatInr } from "@/core/utils/money";

export default function ProductCard({ product }: { product: ProductCardType }) {
  return (
    <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12, background: "#fff" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div style={{ fontWeight: 700 }}>{product.title}</div>
        <div style={{ fontWeight: 700 }}>{formatInr(product.priceInr)}</div>
      </div>

      {product.highlights?.length ? (
        <ul style={{ marginTop: 10, paddingLeft: 18 }}>
          {product.highlights.map((h, idx) => (
            <li key={idx} style={{ marginBottom: 4 }}>
              {h}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
