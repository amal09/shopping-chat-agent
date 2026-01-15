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

function explainConcept(userMessage: string): string {
  const t = (userMessage || "").toLowerCase();

  // OIS vs EIS
  if (t.includes("ois") && t.includes("eis")) {
    return (
      "OIS (Optical Image Stabilization) is hardware-based stabilization: the lens or sensor physically moves to counter hand shake. " +
      "It helps a lot for sharper photos in low light and reduces motion blur.\n\n" +
      "EIS (Electronic Image Stabilization) is software-based stabilization: the phone crops and aligns video frames to smooth motion. " +
      "It’s mainly used for video and can slightly reduce quality due to cropping.\n\n" +
      "In real use: OIS is great for night photos and steady shots, EIS is great for smoother handheld video. Phones that combine both usually perform best."
    );
  }

  // AMOLED / OLED / LCD basics
  if (t.includes("amoled")) {
    return (
      "AMOLED (Active Matrix OLED) is a display tech where each pixel emits its own light (no backlight). " +
      "That’s why AMOLED can produce true blacks and very high contrast.\n\n" +
      "How it feels in daily use: videos look punchy, dark mode can save battery (black pixels can be off), and phones can be thinner. " +
      "Trade-offs: it’s usually more expensive, and in extreme long-term static usage there can be burn-in risk.\n\n" +
      "For buyers: AMOLED is a strong choice if you watch a lot of content, use dark mode, or want premium contrast."
    );
  }

  if (t.includes("oled")) {
    return (
      "OLED is a display technology where each pixel produces its own light, so it can turn fully off for true blacks and high contrast. " +
      "AMOLED is a common smartphone implementation of OLED that uses an active-matrix control system for better responsiveness.\n\n" +
      "Compared to LCD, OLED usually looks more contrasty and can be more power-efficient with dark themes. " +
      "Potential downsides are higher cost and possible burn-in in rare long-term scenarios.\n\n" +
      "For phones: OLED/AMOLED is generally considered the more premium display choice."
    );
  }

  if (t.includes("ltpo")) {
    return (
      "LTPO (Low-Temperature Polycrystalline Oxide) is a display backplane technology that allows the screen to vary refresh rate more efficiently. " +
      "This enables features like 1Hz–120Hz adaptive refresh.\n\n" +
      "Practical benefit: smoother scrolling at high refresh rates when needed, and better battery life when showing static content (always-on display, reading, etc.).\n\n" +
      "For buyers: LTPO matters most if you want a high refresh screen without a big battery hit."
    );
  }

  if (t.includes("lcd") || t.includes("ips")) {
    return (
      "LCD (often IPS LCD) uses a backlight behind the screen. Pixels don’t emit light themselves, so blacks are typically more gray compared to OLED/AMOLED.\n\n" +
      "Pros: LCD can be cheaper, has no burn-in risk, and can look very good with accurate colors. " +
      "Cons: lower contrast and less “deep black” look than AMOLED.\n\n" +
      "For buyers: a good LCD can still be great in budget phones, but AMOLED usually feels more premium for movies and dark themes."
    );
  }

  // Default generic explain (always explain, never ask for more detail)
  return (
    "Here’s a simple explanation:\n\n" +
    "• What it is: a feature/technology used in smartphones.\n" +
    "• Why it matters: it affects real usage like camera quality, display experience, battery life, or performance.\n\n" +
    "If you tell me whether you care more about photos, videos, gaming, or battery, I can also explain its impact in that specific context."
  );
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
      mode: "recommend",
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

  // Explain (general): always provide an explanation
  if (modeHint === "explain") {
    return {
      mode: "explain",
      message: explainConcept(userMessage),
      usedCatalogIds: [] // explain is model-free
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
