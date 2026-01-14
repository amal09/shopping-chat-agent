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

export function buildFallbackResponse(args: {
  modeHint: "recommend" | "compare" | "explain";
  userMessage: string;
  candidates: Phone[];
}): ChatResponse {
  const { modeHint, candidates } = args;

  if (modeHint === "explain") {
    return {
      mode: "explain",
      message:
        "OIS (Optical Image Stabilization) reduces blur using physical stabilization of the camera lens/sensor. EIS (Electronic Image Stabilization) stabilizes using software by adjusting/cropping frames. OIS helps more for low-light photos and handheld shots; EIS is commonly used for smoother video. (Fallback response: model unavailable.)",
      usedCatalogIds: candidates.map((p) => p.id)
    };
  }

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
          { label: "OIS", values: top.map((p) => (p.hasOis === true ? "Yes" : p.hasOis === false ? "No" : "N/A")) }
        ]
      },
      usedCatalogIds: top.map((p) => p.id)
    };
  }

  // recommend
  const top = candidates.slice(0, 3);
  return {
    mode: "recommend",
    message: "Here are the best matches from our catalog. (Fallback response: model unavailable.)",
    products: top.map(toCard),
    usedCatalogIds: top.map((p) => p.id)
  };
}
