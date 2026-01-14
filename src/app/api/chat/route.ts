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

function inferMode(userText: string): "recommend" | "compare" | "explain" {
  const t = userText.toLowerCase();

  // Explain should have highest priority
  if (
    t.includes("explain") ||
    t.includes("what is") ||
    t.includes("difference") ||
    t.includes("ois") ||
    t.includes("eis")
  ) return "explain";

  // Compare next
  if (t.includes("compare") || t.includes(" vs ") || t.includes("vs")) return "compare";

  return "recommend";
}


function extractJsonObject(text: string): string {
  const s = (text || "").trim();

  // Handle ```json ... ```
  const fenced = s.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) return fenced[1].trim();

  // Otherwise, try grabbing the first {...} block
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start >= 0 && end > start) return s.slice(start, end + 1);

  return s;
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

    // 2) Deterministic parsing + retrieval
    const repo = new CatalogJsonRepo();
    const parsed = parseUserQuery(message);
    const results = await searchCatalog(repo, parsed, 5);
    const candidates = results.map((r) => r.phone);

    // Follow-up handling: "this phone / tell me more"
    // If user asks follow-up and we have last used IDs, narrow candidates to that set.
    if (looksLikeFollowUp(message)) {
      const lastIds = extractLastUsedCatalogIds(messages);
      if (lastIds.length) {
        const all = await repo.getAllPhones();
        const narrowed = all.filter((p) => lastIds.includes(p.id));
        if (narrowed.length) {
          // override candidates with last shown phones
          candidates.splice(0, candidates.length, ...narrowed);
        }
      }
    }

    // If nothing matched,
    if (candidates.length === 0) {
      // If user asked for brand + budget, give nearest brand options slightly above budget
      if (parsed.budgetInr && parsed.brandIncludes?.length) {
        const all = await repo.getAllPhones();
        const brand = parsed.brandIncludes[0].toLowerCase();

        const brandPhones = all
          .filter((p) => p.brand.toLowerCase() === brand)
          .sort((a, b) => a.priceInr - b.priceInr);

        if (brandPhones.length > 0) {
          const cheapest = brandPhones[0];

          // show "nearest" brand option above budget (like A55 at 29999)
          return NextResponse.json({
            mode: "clarify",
            message: `I couldn’t find any ${parsed.brandIncludes[0]} phones under ₹${parsed.budgetInr.toLocaleString("en-IN")} in the current catalog. The closest option is ${cheapest.brand} ${cheapest.model} at ₹${cheapest.priceInr.toLocaleString("en-IN")}. If you want, I can also suggest the best alternatives under your budget.`,
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

      // Default fallback (no brand or no phones at all)
      return NextResponse.json({
        mode: "clarify",
        message:
          "I couldn't find a match in the current catalog. Try increasing your budget, removing brand filters, or tell me your top priority (camera/battery/performance/compact).",
        usedCatalogIds: []
      });
    }

    // If message is "A vs B", resolve to exact phones from catalog
    const allPhones = await repo.getAllPhones();
    const pair = extractVsPair(message);
    if (pair) {
      const left = resolvePhoneByName(allPhones, pair.left);
      const right = resolvePhoneByName(allPhones, pair.right);
      if (left && right) {
        candidates.splice(0, candidates.length, left, right);
      }
    }
    

    // 3) Gemini prompt (grounded)
    const modeHint = inferMode(message);
    const prompt = buildAgentPrompt({
      userMessage: message,
      modeHint,
      candidatePhones: candidates,
      history: messages
    });


    // 4) Call Gemini + validate output; fallback on ANY failure
    try {
      console.log("[chat] modeHint:", modeHint);
      console.log("[chat] candidates:", candidates.map(c => c.id));

      const model = getGeminiModel();
      const resp = await model.generateContent(prompt);
      const text = resp.response.text().trim();
      const jsonText = extractJsonObject(text);

      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(jsonText);
      } catch {
        console.log("[chat] fallback: invalid JSON from model");
        console.log("[chat] raw (first 300):", text.slice(0, 300));
        return NextResponse.json(buildFallbackResponse({ modeHint, userMessage: message, candidates }));
      }



      const validated = ChatResponseSchema.safeParse(parsedJson);
      if (!validated.success) {
        console.log("[chat] fallback: schema validation failed", validated.error.issues);
        return NextResponse.json(buildFallbackResponse({ modeHint, userMessage: message, candidates }));
      }


      // Always inject usedCatalogIds for traceability (even if model forgot it)
      const finalResponse = {
        ...validated.data,
        usedCatalogIds: validated.data.usedCatalogIds?.length
          ? validated.data.usedCatalogIds
          : candidates.map((p) => p.id)
      };

      return NextResponse.json(finalResponse);
    } catch(e: any) {
      // Gemini API error (quota/rate-limit/network/etc.)
      console.log("[chat] fallback: Gemini call failed", e?.message || e);
      return NextResponse.json(buildFallbackResponse({ modeHint, userMessage: message, candidates }));
    }
  } catch (err: any) {
    // Errors in request parsing, catalog loading, etc.
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
