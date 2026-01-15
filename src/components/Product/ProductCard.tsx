import type { ChatProductCard as ProductCardType } from "@/core/types/chat";
import { formatInr } from "@/core/utils/money";

export default function ProductCard({ product }: { product: ProductCardType }) {
  return (
    <div className="card">
      <div className="cardTop">
        <div>{product.title}</div>
        <div>{formatInr(product.priceInr)}</div>
      </div>

      {product.highlights?.length ? (
        <ul style={{ marginTop: 10, paddingLeft: 18, marginBottom: 0 }}>
          {product.highlights.map((h, idx) => (
            <li key={idx} style={{ marginBottom: 4, color: "rgba(245,245,247,0.85)" }}>
              {h}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
