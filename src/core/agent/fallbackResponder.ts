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
    p.ramGb ? `RAM: ${p.ramGb} GB` : "RAM not listed",
    p.storageGb ? `Storage: ${p.storageGb} GB` : "Storage not listed",
    p.displayInches ? `Display: ${p.displayInches}"` : "Display not listed",
    p.refreshRateHz ? `Refresh: ${p.refreshRateHz}Hz` : "Refresh not listed",
    p.batteryMah ? `Battery: ${p.batteryMah} mAh` : "Battery not listed",
    p.chargingW ? `Charging: ${p.chargingW}W` : "Charging not listed",
    p.cameraPrimaryMp ? `Primary camera: ${p.cameraPrimaryMp}MP` : "Camera MP not listed",
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
  const { modeHint, userMessage, candidates } = args;

  // 1 phone → treat as details response (great for follow-ups)
  if (candidates.length === 1) {
    const p = candidates[0];
    return {
      mode: "explain",
      message: `More details about ${p.brand} ${p.model}:`,
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

  // Explain (general): keep it general, not catalog-dependent
  if (modeHint === "explain") {
    const t = (userMessage || "").toLowerCase();

    // Generic (model-free) explanation for stabilization
    if (t.includes("ois") && t.includes("eis")) {
      return {
        mode: "explain",
        message:
          "OIS (Optical Image Stabilization) stabilizes using hardware (lens/sensor movement) and helps a lot in low light and for reducing photo blur. " +
          "EIS (Electronic Image Stabilization) stabilizes using software by cropping/aligning frames, commonly used for smoother video. " +
          "Many phones use both: OIS for photos/low-light, EIS for video smoothness.",
        usedCatalogIds: candidates.map((p) => p.id)
      };
    }

    return {
      mode: "explain",
      message:
        "I can explain that. Ask in a bit more detail (e.g., 'Explain OIS vs EIS' or 'What is AMOLED vs OLED') and I’ll break it down clearly.",
      usedCatalogIds: candidates.map((p) => p.id)
    };
  }

  // Compare
  if (modeHint === "compare") {
    const top = candidates.slice(0, 3);
    return {
      mode: "compare",
      message: "Here’s a comparison from our catalog:",
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

  // Recommend
  const top = candidates.slice(0, 3);
  return {
    mode: "recommend",
    message: "Here are the best matches from our catalog:",
    products: top.map(toCard),
    usedCatalogIds: top.map((p) => p.id)
  };
}
