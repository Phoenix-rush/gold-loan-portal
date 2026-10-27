import { AppError } from "../errors.js";

export interface GeminiContent {
  role: "user" | "model";
  parts: any[];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function modelList(): string[] {
  const primary = process.env.GEMINI_MODEL || "gemini-3.8-flash";
  const fallbacks = (process.env.GEMINI_FALLBACK_MODELS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return [primary, ...fallbacks.filter((m) => m !== primary)];
}

const TRIES_PER_MODEL = 2;
const TIMEOUT_MS = 25000;

export async function generate(
  system: string,
  contents: GeminiContent[],
  tools: unknown[],
): Promise<GeminiContent> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new AppError(503, "LLM_NOT_CONFIGURED", "The assistant is not configured yet.");
  }

  const models = modelList();
  console.log(`[llm] models to try: ${models.join(", ")}`);

  let busy = false;
  let limited = false;

  for (const model of models) {
    for (let attempt = 1; attempt <= TRIES_PER_MODEL; attempt++) {
      console.log(`[llm] ${model} attempt ${attempt} ...`);
      const started = Date.now();

      let res: Response;
      try {
        res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: "POST",
            signal: AbortSignal.timeout(TIMEOUT_MS),
            headers: { "Content-Type": "application/json", "x-goog-api-key": key },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: system }] },
              contents,
              tools,
              toolConfig: { functionCallingConfig: { mode: "AUTO" } },
              generationConfig: { temperature: 0.2 },
            }),
          },
        );
      } catch (e) {
        console.error(`[llm] ${model} attempt ${attempt} failed: ${(e as Error).name} after ${Date.now() - started}ms`);
        busy = true;
        break; // timeout/network par isi model pe dobara wait nahi, agla model try kar
      }

      if (res.ok) {
        const data: any = await res.json();
        const content = data.candidates?.[0]?.content;
        console.log(`[llm] ${model} ok in ${Date.now() - started}ms`);
        if (!content?.parts) {
          throw new AppError(502, "LLM_EMPTY", "The assistant did not respond. Please try again.");
        }
        return content as GeminiContent;
      }

      const body = (await res.text()).slice(0, 300);
      console.error(`[llm] ${model} attempt ${attempt} -> ${res.status} ${body}`);

      if (res.status === 503) {
        busy = true;
        if (attempt < TRIES_PER_MODEL) await sleep(1500);
        continue;
      }
      if (res.status === 429) {
        limited = true;
        break;
      }
      if (res.status === 404) {
        break;
      }
      throw new AppError(502, "LLM_ERROR", "The assistant is unavailable right now.");
    }
  }

  if (limited && !busy) {
    throw new AppError(429, "LLM_RATE_LIMITED", "The assistant is busy. Please try again in a minute.");
  }
  throw new AppError(503, "LLM_BUSY", "The assistant is very busy right now. Please try again in a minute.");
}