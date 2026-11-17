// Tik izoliuotam, atskirai patvirtintam 4 etapo bandymui. Ne produkcinis serveris.
import { createServer } from "node:http";
import next from "next";

const diagnosticOnly = process.env.ARTMYSTERY_AI_DIAGNOSTIC_ONLY === "YES";
const fixtureOnly = process.env.ARTMYSTERY_AI_FIXTURE_ONLY === "YES";
const modelLimit = Number(process.env.ARTMYSTERY_GEMINI_MAX_REQUESTS);
const approvedModel = process.env.ARTMYSTERY_GEMINI_APPROVED_MODEL;
if (!diagnosticOnly && !fixtureOnly && (process.env.ARTMYSTERY_ALLOW_LIVE_GEMINI !== "YES"
  || ![1, 2].includes(modelLimit)
  || !["gemini-4-hydrogen", "gemini-3.5-flash-lite"].includes(approvedModel))) {
  console.error("NOT RUN: trūksta konkretaus modelio ir užklausų ribos leidimo.");
  process.exit(2);
}
try { process.loadEnvFile(".env.local"); } catch { /* Procesas gali turėti konfigūraciją. */ }
if (!diagnosticOnly && !fixtureOnly && process.env.GEMINI_MODEL !== approvedModel) process.exit(2);
// Jungiklis įjungiamas tik šiam procesui; .env.local nekeičiamas.
process.env.AI_LIVE_ENABLED = diagnosticOnly ? "false" : "true";
process.env.AI_STORAGE_ENABLED = "true";
process.env.SITE_URL = "http://127.0.0.1:3194";
let calls = 0, fixtures = 0;
const fetcher = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
  if (url.hostname === "generativelanguage.googleapis.com") {
    if (fixtureOnly) {
      const body = await (input instanceof Request ? input.clone() : new Request(input, init)).json();
      const count = body.response_format.schema.properties.questions.minItems;
      const result = { title: "Izoliuotas testinis atsakymas", introduction: "Tai testinė schema, ne Gemini turinys.",
        observations: ["Šis turinys skirtas tik serverio ir saugyklos integracijos patikrai."],
        questions: Array.from({ length: count }, () => ({ question: "Koks šaltinis pateiktas?", suggestedAnswer: "Patikrink muziejaus duomenis." })), summary: "Tik testinis atsakymas." };
      process.send?.({ type: "fixture_generation", calls: ++fixtures });
      const errorStatus = Number(process.env.ARTMYSTERY_TEST_GEMINI_ERROR);
      if ([401, 403, 429, 503].includes(errorStatus)) return Response.json({ error: { message: "TEST_SECRET_PROVIDER_BODY" } }, { status: errorStatus });
      return Response.json({ id: "fixture", status: "completed", steps: [{ type: "model_output", content: [{ type: "text", text: JSON.stringify(result) }] }] });
    }
    if (diagnosticOnly || calls >= modelLimit) return Response.json({ error: { code: 429, message: "Local test budget exhausted" } }, { status: 429 });
    calls++;
    process.send?.({ type: "generation", calls });
  }
  const response = await fetcher(input, init);
  if (url.hostname === "generativelanguage.googleapis.com") process.send?.({ type: "generation_response", status: response.status });
  return response;
};
// Dir turi atskirą next.config.ts. Nenaudojame conf perrašymo: Next dev routeris
// ir renderis turi sutarti dėl to paties klientinių failų katalogo.
const app = next({ dev: true, dir: process.cwd(), hostname: "127.0.0.1", port: 3194, webpack: true, quiet: true });
await app.prepare();
const handle = app.getRequestHandler();
const server = createServer((request, response) => { void handle(request, response); });
await new Promise((resolve, reject) => { server.once("error", reject); server.listen(3194, "127.0.0.1", resolve); });
process.send?.({ type: "ready" });
if (diagnosticOnly) console.log("Diagnostic server ready; all Gemini requests blocked.");
process.on("message", async (message) => {
  if (message?.type === "shutdown") { server.closeAllConnections(); server.close(); await app.close(); process.exit(0); }
});
