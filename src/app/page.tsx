import { CatalogJsonRepo } from "@/core/catalog/catalogJsonRepo";
import SearchDemo from "./SearchDemo";
import ApiTester from "./ApiTester";

export default async function Home() {
  const repo = new CatalogJsonRepo();
  const phones = await repo.getAllPhones();

  return (
    <main style={{ padding: 24, fontFamily: "system-ui", maxWidth: 900, margin: "0 auto" }}>
      <h1>Shopping Chat Agent</h1>
      <p style={{ opacity: 0.8 }}>
        Commit 5: /api/chat with Gemini (grounded) + schema validation
      </p>

      <SearchDemo phones={phones} />
      <ApiTester />
    </main>
  );
}
