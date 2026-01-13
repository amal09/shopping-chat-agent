export type OsType = "Android" | "iOS";

export type PhoneFeature =
  | "camera"
  | "battery"
  | "performance"
  | "display"
  | "charging"
  | "compact"
  | "gaming";

export interface Phone {
  id: string; // stable ID for UI + follow-ups
  brand: string;
  model: string;

  priceInr: number; // list price (approx) in INR
  os: OsType;

  // Key specs (keep minimal but useful)
  ramGb?: number;
  storageGb?: number;

  displayInches?: number;
  refreshRateHz?: number;

  batteryMah?: number;
  chargingW?: number;

  cameraPrimaryMp?: number;
  hasOis?: boolean;

  rating?: number; // 0-5 internal score (optional)
  tags?: PhoneFeature[];

  // A short description we control (non-marketing)
  summary?: string;
}
