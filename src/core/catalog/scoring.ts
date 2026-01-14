import type { Phone, PhoneFeature } from "../types/phone";

type WeightMap = Partial<Record<PhoneFeature, number>>;

export function getWeightsFromIntent(intent: {
  budgetInr?: number;
  features?: PhoneFeature[];
}): WeightMap {
  const weights: WeightMap = {};

  for (const f of intent.features ?? []) {
    switch (f) {
      case "camera":
        weights.camera = 3;
        break;

      case "battery":
        weights.battery = 3;
        weights.charging = 2;
        break;

      case "charging":
        weights.charging = 3;
        break;

      case "performance":
        weights.performance = 3;
        break;

      case "compact":
        weights.compact = 2;
        break;

      case "gaming":
        weights.performance = 3;
        weights.display = 2;
        break;

      case "display":
        weights.display = 2;
        break;
    }
  }

  return weights;
}

// Utility: clamp into [0,1]
function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

// Utility: normalize a value between min..max into [0,1]
function normalize(value: number, min: number, max: number): number {
  if (max <= min) return 0;
  return clamp01((value - min) / (max - min));
}

export function scorePhone(phone: Phone, weights: WeightMap): number {
  let score = 0;

  // CAMERA: tag + OIS + MP (if present)
  if (weights.camera) {
    let cameraSignal = 0;

    if (phone.tags?.includes("camera")) cameraSignal += 0.55; // main signal
    if (phone.hasOis) cameraSignal += 0.25; // bonus
    if (typeof phone.cameraPrimaryMp === "number") {
      // normalize MP roughly from 12..64 (common range)
      cameraSignal += 0.20 * normalize(phone.cameraPrimaryMp, 12, 64);
    }

    score += weights.camera * clamp01(cameraSignal);
  }

  // BATTERY: don’t hard-cap at 5000; normalize 3500..6000
  if (weights.battery && typeof phone.batteryMah === "number") {
    const batt = normalize(phone.batteryMah, 3500, 6000); // 0..1
    score += weights.battery * batt;
  }

  // CHARGING: normalize 10..120W (so 25 vs 100 differ clearly)
  if (weights.charging && typeof phone.chargingW === "number") {
    const chg = normalize(phone.chargingW, 10, 120); // 0..1
    score += weights.charging * chg;
  }

  // PERFORMANCE: still proxy via tag (until you add chipset/benchmarks)
  if (weights.performance && phone.tags?.includes("performance")) {
    score += weights.performance; // full points if tagged
  }

  // COMPACT: normalize screen size (smaller = better)
  if (weights.compact && typeof phone.displayInches === "number") {
    // 5.8..6.9 range: 5.8 => 1, 6.9 => 0
    const compactness = 1 - normalize(phone.displayInches, 5.8, 6.9);
    score += weights.compact * clamp01(compactness);
  }

  // DISPLAY: 120Hz is good, but allow partial for 90Hz too
  if (weights.display && typeof phone.refreshRateHz === "number") {
    const hz = normalize(phone.refreshRateHz, 60, 120); // 60->0, 120->1
    score += weights.display * hz;
  }

  // Rating: small bonus
  if (typeof phone.rating === "number") {
    score += phone.rating * 0.25; // slightly smaller than before
  }

  return Number(score.toFixed(2));
}
