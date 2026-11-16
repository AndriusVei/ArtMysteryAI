// Vienas TIK atskirai patvirtintas tikras Gemini kvietimas. Į npm test neįtrauktas.
import { readFileSync } from "node:fs";
import { createGeminiGenerator } from "../src/lib/gemini.ts";
import { parseModelResult, AIError, AI_OUTPUT_TOKENS } from "../src/lib/ai-core.ts";
import { defaultResearchSettings } from "../src/lib/investigation.ts";
import { randomUUID } from "node:crypto";

try { process.loadEnvFile(".env.local"); } catch { /* Konfigūracija gali būti pateikta proceso aplinkoje. */ }
const model = process.env.GEMINI_MODEL ?? "", apiKey = process.env.GEMINI_API_KEY ?? "";
if (process.env.ARTMYSTERY_ALLOW_LIVE_GEMINI !== "YES" || process.env.ARTMYSTERY_GEMINI_MAX_REQUESTS !== "1"
  || process.env.ARTMYSTERY_GEMINI_APPROVED_MODEL !== model || !/^gemini-[a-z0-9.-]{1,80}$/.test(model)
  || !/^[^\s]{20,512}$/.test(apiKey)) {
  console.error("NOT RUN: reikia rakto, konkretaus patvirtinto modelio ir atskiro leidimo vienai užklausai. Paslaptys nerodomos.");
  process.exitCode = 2;
} else {
  const artwork = JSON.parse(readFileSync(new URL("../tests/fixtures/monet.json", import.meta.url), "utf8"));
  const request = { artworkId: artwork.id, ...defaultResearchSettings, userPrompt: "" };
  let calls = 0, httpStatus = null;
  const once = async (input, init) => {
    if (calls >= 1) throw new AIError("unavailable");
    calls++;
    const response = await fetch(input, init);
    httpStatus = response.status;
    return response;
  };
  try {
    const raw = await createGeminiGenerator({ apiKey, model }, once)(artwork, request, AbortSignal.timeout(25000));
    const response = parseModelResult(raw, artwork, request, randomUUID());
    console.log(`PASS: 1 tikra užklausa, ${response.result.questions.length} klausimai, struktūra patikrinta. Išvesties limitas ${AI_OUTPUT_TOKENS} tokenų. Atsakymo turinys ir raktas nerodomi; DB nekeista.`);
  } catch (cause) {
    console.error(`FAIL: ${cause instanceof AIError ? cause.code : "unavailable"}; HTTP ${httpStatus ?? "negautas"}; bandymų ${calls}. Pakartotinių užklausų nėra; paslaptys nerodomos.`);
    process.exitCode = 1;
  }
}
