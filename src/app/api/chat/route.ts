import { NextResponse } from "next/server";
import { CatalogJsonRepo } from "@/core/catalog/catalogJsonRepo";
import { parseUserQuery } from "@/core/catalog/queryParser";
import { searchCatalog } from "@/core/catalog/catalogSearch";
import { evaluateSafety } from "@/core/agent/safety";
import { buildAgentPrompt } from "@/core/agent/prompt";
import { getGeminiModel } from "@/core/agent/geminiClient";
import { ChatResponseSchema } from "@/core/agent/responseSchema";
import { buildFallbackResponse } from "@/core/agent/fallbackResponder";
import type { ChatMessage } from "@/core/types/chat";
import { extractLastUsedCatalogIds, getLastUserMessage, looksLikeFollowUp } from "@/core/agent/context";
import { extractVsPair, resolvePhoneByName } from "@/core/catalog/phoneResolver";

type ChatRequestBody = {
  messages: ChatMessage[];
};

function wantsSingleResult(userText: string): boolean {
  const t = (userText || "").toLowerCase();
  return (
    t.includes("single best") ||
    t.includes("only one") ||
    t.includes("pick one") ||
    t.includes("just one") ||
    (t.match(/\bbest\b/) !== null && (t.includes("single") || t.includes("one")))
  );
}

function inferMode(userText: string): "recommend" | "compare" | "explain" {
  const t = (userText || "").toLowerCase();

  const explainWords = [
    "explain",
    "what is",
    "what's",
    "whats",
    "define",
    "meaning of",
    "difference between",
    "diff between",
    "how does",
    "how do"
  ];
  if (explainWords.some((w) => t.includes(w))) return "explain";

  const compareWords = [
    "compare",
    "comparison",
    "vs",
    "v/s",
    "versus",
    "against",
    "better than",
    "which is better",
    "difference"
  ];
  if (compareWords.some((w) => t.includes(w))) return "compare";

  return "recommend";
}

function extractJsonObject(text: string): string {
  const s = (text || "").trim();

  const fenced = s.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start >= 0 && end > start) return s.slice(start, end + 1);

  return s;
}

async function callGeminiAndValidate(args: {
  prompt: string;
  modeHint: "recommend" | "compare" | "explain";
  userMessage: string;
  candidates: any[];
}) {
  const { prompt, modeHint, userMessage, candidates } = args;

  try {
    const model = getGeminiModel();
    const resp = await model.generateContent(prompt);
    const text = resp.response.text().trim();
    const jsonText = extractJsonObject(text);

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(jsonText);
    } catch {
      return buildFallbackResponse({ modeHint, userMessage, candidates });
    }

    const validated = ChatResponseSchema.safeParse(parsedJson);
    if (!validated.success) {
      return buildFallbackResponse({ modeHint, userMessage, candidates });
    }

    const finalResponse: any = {
      ...validated.data,
      usedCatalogIds: validated.data.usedCatalogIds?.length
        ? validated.data.usedCatalogIds
        : candidates.map((p: any) => p.id)
    };

    const single = wantsSingleResult(userMessage);
    if (single && finalResponse.mode === "recommend" && Array.isArray(finalResponse.products)) {
      finalResponse.products = finalResponse.products.slice(0, 1);
      finalResponse.usedCatalogIds = finalResponse.products.map((p: any) => p.id);
      finalResponse.comparison = undefined;
    }

    return finalResponse;
  } catch {
    return buildFallbackResponse({ modeHint, userMessage, candidates });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ChatRequestBody;
    const messages = Array.isArray(body?.messages) ? body.messages : [];
    const message = getLastUserMessage(messages);

    if (!message) {
      return NextResponse.json(
        { mode: "clarify", message: "Please type a phone-related question (budget, brand, camera, battery etc.)." },
        { status: 400 }
      );
    }

    // 1) Safety gate
    const safety = evaluateSafety(message);
    if (safety.action === "refuse") {
      return NextResponse.json({
        mode: "refuse",
        message: safety.safeReply
      });
    }

    // infer mode early
    const modeHint = inferMode(message);

    // 2) Deterministic parsing + retrieval
    const repo = new CatalogJsonRepo();
    const parsed = parseUserQuery(message);
    const results = await searchCatalog(repo, parsed, 5);
    let candidates = results.map((r) => r.phone);

    // Follow-up handling: "this phone / tell me more"
    if (looksLikeFollowUp(message)) {
      const repoAll = await repo.getAllPhones();
      const lastIds = extractLastUsedCatalogIds(messages);

      let target = null;
      if (lastIds.length === 1) {
        target = repoAll.find((p) => p.id === lastIds[0]) ?? null;
      } else if (!lastIds.length) {
        target = resolvePhoneByName(repoAll, message);
      }

      if (lastIds.length > 1) {
        const shortlist = repoAll.filter((p) => lastIds.includes(p.id));
        return NextResponse.json({
          mode: "clarify",
          message: "Which phone do you want more details about?",
          products: shortlist.map((p) => ({
            id: p.id,
            title: `${p.brand} ${p.model}`,
            priceInr: p.priceInr,
            highlights: [
              p.summary ?? "Summary not listed",
              p.hasOis ? "OIS: Yes" : "OIS: Not listed",
              p.batteryMah ? `Battery: ${p.batteryMah} mAh` : "Battery: Not listed",
              p.chargingW ? `Charging: ${p.chargingW}W` : "Charging: Not listed"
            ]
          })),
          usedCatalogIds: shortlist.map((p) => p.id)
        });
      }

      if (target) {
        return NextResponse.json({
          mode: "recommend",
          message: `More details for ${target.brand} ${target.model}:`,
          products: [
            {
              id: target.id,
              title: `${target.brand} ${target.model}`,
              priceInr: target.priceInr,
              highlights: [
                target.summary ?? "Summary not listed",
                target.os ? `OS: ${target.os}` : "OS: Not listed",
                target.ramGb ? `RAM: ${target.ramGb} GB` : "RAM: Not listed",
                target.storageGb ? `Storage: ${target.storageGb} GB` : "Storage: Not listed",
                target.displayInches ? `Display: ${target.displayInches}"` : "Display: Not listed",
                target.refreshRateHz ? `Refresh rate: ${target.refreshRateHz} Hz` : "Refresh rate: Not listed",
                target.batteryMah ? `Battery: ${target.batteryMah} mAh` : "Battery: Not listed",
                target.chargingW ? `Charging: ${target.chargingW}W` : "Charging: Not listed",
                target.cameraPrimaryMp ? `Main camera: ${target.cameraPrimaryMp} MP` : "Main camera: Not listed",
                target.hasOis ? "OIS: Yes" : "OIS: Not listed",
                target.rating ? `Rating: ${target.rating}/5` : "Rating: Not listed"
              ]
            }
          ],
          usedCatalogIds: [target.id]
        });
      }
    }

    // If message is "A vs B", resolve exact phones from catalog
    const allPhones = await repo.getAllPhones();
    const pair = extractVsPair(message);
    if (pair) {
      const left = resolvePhoneByName(allPhones, pair.left);
      const right = resolvePhoneByName(allPhones, pair.right);
      if (left && right) {
        candidates.splice(0, candidates.length, left, right);
      }
    }

    /**
     * ✅ CRITICAL FIX:
     * For explain-mode when there are 0 candidates, DO NOT enforce JSON.
     * Ask Gemini for plain text and wrap it into our JSON response.
     * This prevents fallback from triggering on non-JSON outputs.
     */
    if (candidates.length === 0 && modeHint === "explain") {
      const explainPrompt = `
You are a mobile shopping assistant.
Explain the topic clearly and directly (150–220 words). No follow-up questions.

Topic: ${message}

Include:
- What it is
- How it works (simple)
- Pros and cons
- Practical impact in smartphones

Do NOT mention "catalog" or ask the user to clarify.
`.trim();

      try {
        const model = getGeminiModel();
        const resp = await model.generateContent(explainPrompt);
        const text = resp.response.text().trim();

        return NextResponse.json({
          mode: "explain",
          message: text,
          usedCatalogIds: []
        });
      } catch {
        // If Gemini fails, use our explain fallback (which we will fix below)
        return NextResponse.json(buildFallbackResponse({ modeHint, userMessage: message, candidates: [] }));
      }
    }

    // If nothing matched (recommend/compare cases)
    if (candidates.length === 0) {
      // brand+budget nearest option
      if (parsed.budgetInr && parsed.brandIncludes?.length) {
        const all = await repo.getAllPhones();
        const brand = parsed.brandIncludes[0].toLowerCase();

        const brandPhones = all
          .filter((p) => p.brand.toLowerCase() === brand)
          .sort((a, b) => a.priceInr - b.priceInr);

        if (brandPhones.length > 0) {
          const cheapest = brandPhones[0];
          return NextResponse.json({
            mode: "clarify",
            message: `I couldn’t find any ${parsed.brandIncludes[0]} phones under ₹${parsed.budgetInr.toLocaleString(
              "en-IN"
            )} in the current catalog. The closest option is ${cheapest.brand} ${cheapest.model} at ₹${cheapest.priceInr.toLocaleString(
              "en-IN"
            )}. If you want, I can also suggest the best alternatives under your budget.`,
            products: [
              {
                id: cheapest.id,
                title: `${cheapest.brand} ${cheapest.model}`,
                priceInr: cheapest.priceInr,
                highlights: [
                  cheapest.summary || "Closest match from our catalog",
                  cheapest.hasOis ? "OIS available" : "OIS not listed",
                  cheapest.batteryMah ? `Battery: ${cheapest.batteryMah} mAh` : "Battery not listed",
                  cheapest.chargingW ? `Charging: ${cheapest.chargingW}W` : "Charging not listed"
                ]
              }
            ],
            usedCatalogIds: [cheapest.id]
          });
        }
      }

      return NextResponse.json({
        mode: "clarify",
        message:
          "I couldn't find a match in the current catalog. Try increasing your budget, removing brand filters, or tell me your top priority (camera/battery/performance/compact).",
        usedCatalogIds: []
      });
    }

    // 3) Gemini prompt (grounded for recommend/compare)
    const prompt = buildAgentPrompt({
      userMessage: message,
      modeHint,
      candidatePhones: candidates,
      history: messages
    });

    // 4) Call Gemini + validate output; fallback on ANY failure
    const finalResponse: any = await callGeminiAndValidate({
      prompt,
      modeHint,
      userMessage: message,
      candidates
    });

    // For explain (should be rare here), don't claim catalog ids
    if (finalResponse.mode === "explain") {
      return NextResponse.json({
        ...finalResponse,
        usedCatalogIds: []
      });
    }

    return NextResponse.json(finalResponse);
  } catch (err: any) {
    return NextResponse.json(
      {
        mode: "clarify",
        message: "Server error. Please try again.",
        error: String(err?.message || err)
      },
      { status: 500 }
    );
  }
}
