import type { Phone } from "../types/phone";

export interface CatalogRepo {
  getAllPhones(): Promise<Phone[]>;
  getPhoneById(id: string): Promise<Phone | null>;
}
