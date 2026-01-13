import { CatalogJsonRepo } from "@/core/catalog/catalogJsonRepo";
import { formatInr } from "@/core/utils/money";

export default async function Home() {
  const repo = new CatalogJsonRepo();
  const phones = await repo.getAllPhones();

  return (
    <main style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>Shopping Chat Agent</h1>
      <p>Catalog loaded: {phones.length} phones</p>

      <ul>
        {phones.map((p) => (
          <li key={p.id}>
            {p.brand} {p.model} — {formatInr(p.priceInr)}
          </li>
        ))}
      </ul>
    </main>
  );
}
