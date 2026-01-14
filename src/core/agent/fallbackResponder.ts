import type { Phone } from "../types/phone";
import type { ChatResponse } from "../types/chat";

function toCard(p: Phone) {
  return {
    id: p.id,
    title: `${p.brand} ${p.model}`,
    priceInr: p.priceInr,
    highlights: [
      p.summary || "Option from our catalog",
      p.hasOis ? "OIS available" : "OIS not listed in our catalog",
      p.batteryMah ? `Battery: ${p.batteryMah} mAh` : "Battery not listed",
      p.chargingW ? `Charging: ${p.chargingW}W` : "Charging not listed"
    ]
  };
}

function toDetailBullets(p: Phone): string[] {
  return [
    p.summary || "From our catalog",
    `OS: ${p.os}`,
    p.displayInches ? `Display: ${p.displayInches}"` : "Display not listed",
    p.refreshRateHz ? `Refresh: ${p.refreshRateHz}Hz` : "Refresh not listed",
    p.batteryMah ? `Battery: ${p.batteryMah} mAh` : "Battery not listed",
    p.chargingW ? `Charging: ${p.chargingW}W` : "Charging not listed",
    p.hasOis === true
      ? "Camera stabilization: OIS"
      : p.hasOis === false
      ? "Camera stabilization: OIS not listed"
      : "Camera stabilization not listed"
  ];
}

export function buildFallbackResponse(args: {
  modeHint: "recommend" | "compare" | "explain";
  userMessage: string;
  candidates: Phone[];
}): ChatResponse {
  const { modeHint, candidates } = args;

  // ✅ EXPLAIN ALWAYS WINS (no product cards)
  if (modeHint === "explain") {
    return {
      mode: "explain",
      message:
        "OIS (Optical Image Stabilization) physically stabilizes the camera lens or sensor to reduce blur—especially useful for low-light photos and handheld shots. EIS (Electronic Image Stabilization) uses software to stabilize by cropping or adjusting frames—commonly used for smoother video. Many phones use both: OIS for capture quality, EIS for video smoothness.",
      usedCatalogIds: []
    };
  }

  // ✅ SINGLE PHONE → DETAILS (deterministic follow-up)
  if (candidates.length === 1) {
    const p = candidates[0];
    return {
      mode: "explain",
      message: `More details about ${p.brand} ${p.model}. (Fallback: model temporarily unavailable.)`,
      products: [
        {
          id: p.id,
          title: `${p.brand} ${p.model}`,
          priceInr: p.priceInr,
          highlights: toDetailBullets(p)
        }
      ],
      usedCatalogIds: [p.id]
    };
  }

  // ✅ COMPARE
  if (modeHint === "compare") {
    const top = candidates.slice(0, 3);
    return {
      mode: "compare",
      message: "Here’s a comparison from our catalog. (Fallback response: model unavailable.)",
      products: top.map(toCard),
      comparison: {
        productIds: top.map((p) => p.id),
        headers: top.map((p) => `${p.brand} ${p.model}`),
        rows: [
          { label: "Price", values: top.map((p) => `₹${p.priceInr}`) },
          { label: "OS", values: top.map((p) => p.os) },
          { label: "Display", values: top.map((p) => (p.displayInches ? `${p.displayInches}"` : "N/A")) },
          { label: "Refresh Rate", values: top.map((p) => (p.refreshRateHz ? `${p.refreshRateHz}Hz` : "N/A")) },
          { label: "Battery", values: top.map((p) => (p.batteryMah ? `${p.batteryMah} mAh` : "N/A")) },
          { label: "Charging", values: top.map((p) => (p.chargingW ? `${p.chargingW}W` : "N/A")) },
          { label: "OIS", values: top.map((p) => (p.hasOis === true ? "Yes" : "No")) }
        ]
      },
      usedCatalogIds: top.map((p) => p.id)
    };
  }

  // ✅ RECOMMEND
  const top = candidates.slice(0, 3);
  return {
    mode: "recommend",
    message: "Here are the best matches from our catalog. (Fallback response: model unavailable.)",
    products: top.map(toCard),
    usedCatalogIds: top.map((p) => p.id)
  };
}
