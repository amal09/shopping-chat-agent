import { NextResponse } from "next/server";
import { CatalogJsonRepo } from "@/core/catalog/catalogJsonRepo";
import { parseUserQuery } from "@/core/catalog/queryParser";
import { searchCatalog } from "@/core/catalog/catalogSearch";
import { evaluateSafety } from "@/core/agent/safety";
import { buildAgentPrompt } from "@/core/agent/prompt";
import { getGeminiModel } from "@/core/agent/geminiClient";
import { ChatResponseSchema } from "@/core/agent/responseSchema";
import { buildFallbackResponse } from "@/core/agent/fallbackResponder";

type ChatRequestBody = {
  message: string;
};

function inferMode(userText: string): "recommend" | "compare" | "explain" {
  const t = userText.toLowerCase();
  if (t.includes("compare") || t.includes("vs")) return "compare";
  if (t.includes("explain") || t.includes("what is") || t.includes("difference")) return "explain";
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
    const message = (body?.message || "").trim();

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

    // If nothing matched, ask a clarifying question (no AI needed)
    if (candidates.length === 0) {
      return NextResponse.json({
        mode: "clarify",
        message:
          "I couldn't find a match in the current catalog. Try increasing your budget, removing brand filters, or tell me your top priority (camera/battery/performance/compact).",
        usedCatalogIds: []
      });
    }

    // 3) Gemini prompt (grounded)
    const modeHint = inferMode(message);
    const prompt = buildAgentPrompt({
      userMessage: message,
      modeHint,
      candidatePhones: candidates
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
