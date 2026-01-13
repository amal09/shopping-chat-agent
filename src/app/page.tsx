import { CatalogJsonRepo } from "@/core/catalog/catalogJsonRepo";
import SearchDemo from "./SearchDemo";

export default async function Home() {
  const repo = new CatalogJsonRepo();
  const phones = await repo.getAllPhones();

  return (
    <main style={{ padding: 24, fontFamily: "system-ui", maxWidth: 900, margin: "0 auto" }}>
      <h1>Shopping Chat Agent</h1>
      <p style={{ opacity: 0.8 }}>
        Commit 3 demo: query parsing + deterministic catalog filtering (no AI yet)
      </p>

      <SearchDemo phones={phones} />
    </main>
  );
}
