import type { Phone } from "../types/phone";
import type { CatalogRepo } from "./catalogRepo";

// We import JSON directly. Next.js supports this for local files.
import phonesRaw from "../../data/phones.json";

function isPhone(obj: any): obj is Phone {
  return (
    obj &&
    typeof obj.id === "string" &&
    typeof obj.brand === "string" &&
    typeof obj.model === "string" &&
    typeof obj.priceInr === "number" &&
    (obj.os === "Android" || obj.os === "iOS")
  );
}

export class CatalogJsonRepo implements CatalogRepo {
  private phones: Phone[];

  constructor() {
    const parsed = Array.isArray(phonesRaw) ? phonesRaw : [];
    const valid: Phone[] = [];

    for (const item of parsed) {
      if (isPhone(item)) valid.push(item);
    }

    // Fail fast if dataset is empty; helps during development
    if (valid.length === 0) {
      throw new Error("Phone catalog dataset is empty or invalid.");
    }

    this.phones = valid;
  }

  async getAllPhones(): Promise<Phone[]> {
    return this.phones;
  }

  async getPhoneById(id: string): Promise<Phone | null> {
    const found = this.phones.find((p) => p.id === id);
    return found ?? null;
  }
}
