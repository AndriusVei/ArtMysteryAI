import type { Artwork } from "@/types/artwork";
import type { InvestigationRequest, InvestigationResponse, InvestigationService, ResearchSettings, KnowledgeLevel } from "@/types/investigation";
import type { InvestigationRepository, SavedInvestigation } from "@/types/investigation";

export const MAX_USER_PROMPT_LENGTH = 1000;
export const defaultResearchSettings: ResearchSettings = {
  knowledgeLevel: "beginner", investigationMode: "detective_mystery", questionCount: 3,
};
export const knowledgeLevels = { child: "Vaikui", beginner: "Pradedančiajam", expert: "Ekspertui" } as const;
export const investigationModes = {
  detective_mystery: "Detektyvinė paslaptis",
  historical_storytelling: "Istorinis pasakojimas",
  symbolism_analysis: "Simbolikos analizė",
} as const;

export type ResearchFieldErrors = Partial<Record<keyof InvestigationRequest, string>>;
export class ResearchValidationError extends Error {
  readonly fields: ResearchFieldErrors;
  constructor(fields: ResearchFieldErrors) {
    super("Patikrink tyrimo pasirinkimus ir papildomo prašymo ilgį.");
    this.name = "ResearchValidationError"; this.fields = fields;
  }
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function text(value: unknown, limit = 5000): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= limit;
}

export function validateInvestigationRequest(value: unknown): InvestigationRequest {
  const input = record(value) ? value : {};
  const errors: ResearchFieldErrors = {};
  if (typeof input.artworkId !== "number" || !Number.isSafeInteger(input.artworkId) || input.artworkId < 1 || input.artworkId > 999999999) errors.artworkId = "Netinkamas kūrinio numeris.";
  if (input.knowledgeLevel !== "child" && input.knowledgeLevel !== "beginner" && input.knowledgeLevel !== "expert") errors.knowledgeLevel = "Pasirink žinių lygį.";
  if (input.investigationMode !== "detective_mystery" && input.investigationMode !== "historical_storytelling" && input.investigationMode !== "symbolism_analysis") errors.investigationMode = "Pasirink tyrimo režimą.";
  if (input.questionCount !== 3 && input.questionCount !== 5) errors.questionCount = "Pasirink 3 arba 5 klausimus.";
  if (typeof input.userPrompt !== "string" || input.userPrompt.length > MAX_USER_PROMPT_LENGTH) errors.userPrompt = "Papildomas prašymas gali turėti iki 1000 ženklų.";
  if (Object.keys(errors).length > 0) throw new ResearchValidationError(errors);
  return {
    artworkId: input.artworkId as number,
    knowledgeLevel: input.knowledgeLevel as InvestigationRequest["knowledgeLevel"],
    investigationMode: input.investigationMode as InvestigationRequest["investigationMode"],
    questionCount: input.questionCount as 3 | 5,
    userPrompt: (input.userPrompt as string).trim(),
  };
}

/** Tikrinamas ir demo, ir būsimo A adapterio rezultatas. Neapdorotas modelio JSON nerodomas. */
export function validateInvestigationResponse(value: unknown, expected: InvestigationRequest): InvestigationResponse {
  const fail = () => { throw new Error("Tyrimo atsakymo nepavyko perskaityti. Pabandyk dar kartą."); };
  if (!record(value) || (value.mode !== "demo" && value.mode !== "live") || !record(value.result)) return fail();
  const request = validateInvestigationRequest(value.request);
  if (JSON.stringify(request) !== JSON.stringify(validateInvestigationRequest(expected))) return fail();
  if (typeof value.generatedAt !== "string" || value.generatedAt.length !== 24
    || !Number.isFinite(Date.parse(value.generatedAt)) || new Date(value.generatedAt).toISOString() !== value.generatedAt) return fail();
  const result = value.result;
  if (!text(result.title, 300) || !text(result.introduction) || !text(result.summary)
    || !Array.isArray(result.historicalContext) || result.historicalContext.length > 10
    || !Array.isArray(result.observations) || result.observations.length > 10
    || !Array.isArray(result.questions) || result.questions.length !== request.questionCount) return fail();
  const sourceUrl = `https://www.artic.edu/artworks/${request.artworkId}`;
  const historicalContext = result.historicalContext.map((entry: unknown) => {
    if (!record(entry) || !text(entry.text) || entry.sourceUrl !== sourceUrl) return fail();
    return { text: entry.text, sourceUrl };
  });
  const observations = result.observations.map((entry: unknown) => text(entry) ? entry : fail());
  const questions = result.questions.map((entry: unknown) => {
    if (!record(entry) || !text(entry.question, 1000) || !text(entry.suggestedAnswer)) return fail();
    return { question: entry.question, suggestedAnswer: entry.suggestedAnswer };
  });
  const response: InvestigationResponse = {
    mode: value.mode, request, generatedAt: value.generatedAt,
    result: { title: result.title, introduction: result.introduction, historicalContext, observations, questions, summary: result.summary },
  };
  if (JSON.stringify(response).length > 128000) return fail();
  return response;
}


type Question = { question: string; suggestedAnswer: string };

function choose(level: KnowledgeLevel, child: string, beginner: string, expert: string): string {
  return level === "child" ? child : level === "expert" ? expert : beginner;
}

function questions(artwork: Artwork, request: InvestigationRequest): Question[] {
  const level = request.knowledgeLevel;
  const authorAnswer = artwork.artist ? `Muziejus nurodo autorių: ${artwork.artist}.` : "Muziejus autoriaus nepateikė. Jo spėti nereikėtų.";
  const dateAnswer = artwork.date ? `Muziejaus nurodyta data: ${artwork.date}.` : "Muziejus datos nepateikė. Patikimam atsakymui reikia papildomo šaltinio.";
  const mediumAnswer = artwork.medium ? `Muziejaus nurodyta technika: ${artwork.medium}.` : "Technika nepateikta. Vien iš pavadinimo jos nustatyti negalime.";
  if (request.investigationMode === "symbolism_analysis") return [
    { question: choose(level, "Ką tau primena kūrinio pavadinimas?", "Kokį klausimą apie simboliką kelia kūrinio pavadinimas?", "Kaip atskirtum pavadinimu paremtą hipotezę nuo ikonografinio įrodymo?"), suggestedAnswer: `Pavadinimas „${artwork.title}“ gali paskatinti klausimus, bet pats savaime nepatvirtina simbolių reikšmių.` },
    { question: choose(level, "Ką pats pastebi paveiksle?", "Kokias detales pats įvardytum prieš jas interpretuodamas?", "Kokius savo stebėjimus atskirtum nuo jų interpretacijos?"), suggestedAnswer: "Pirmiausia įvardyk tai, ką pats matai. Šis demonstracinis pavyzdys vaizdo neanalizuoja ir jo detalių nepatvirtina." },
    { question: choose(level, "Ar galime žinoti, ką dailininkas galvojo?", "Ar pavadinimas įrodo autoriaus ketinimus?", "Kokio pirminio šaltinio reikėtų teiginiui apie autoriaus intenciją?"), suggestedAnswer: "Autoriaus ketinimų negalima patikimai nustatyti vien iš pavadinimo. Reikėtų paties autoriaus ar kitų patikimų šaltinių." },
    { question: choose(level, "Kaip kūrinys buvo padarytas?", "Kokią techniką nurodo muziejus?", "Kaip technikos duomenys galėtų riboti ar papildyti tavo interpretaciją?"), suggestedAnswer: mediumAnswer },
    { question: choose(level, "Kur patikrintum savo spėjimą?", "Kaip patikrintum pasirinktą simbolio reikšmę?", "Kaip palygintum konkuruojančias simbolikos interpretacijas?"), suggestedAnswer: "Pradėk nuo muziejaus aprašymo ir jo nurodomų šaltinių. Skirtingas interpretacijas pristatyk kaip hipotezes, kol neturi patvirtinančių duomenų." },
  ];
  if (request.investigationMode === "historical_storytelling") return [
    { question: choose(level, "Kada kūrinys sukurtas?", "Kokį laiką nurodo muziejaus pateikta data?", "Ką leidžia ir ko neleidžia nustatyti muziejaus datavimas?"), suggestedAnswer: dateAnswer },
    { question: choose(level, "Kas sukūrė šį kūrinį?", "Kieno kūrybą pradedi tyrinėti?", "Kokia autorystė nurodyta muziejaus metaduomenyse?"), suggestedAnswer: authorAnswer },
    { question: choose(level, "Ar data papasakoja visą istoriją?", "Ko vien data nepasako apie istorinį laikotarpį?", "Kodėl vien chronologinio sutapimo nepakanka istoriniam priežastingumui pagrįsti?"), suggestedAnswer: "Data savaime neįrodo, kad konkretus istorinis įvykis paveikė kūrinį. Tam reikia papildomų patikimų šaltinių." },
    { question: choose(level, "Kokią kūrinio techniką žinome?", "Kokia technika užfiksuota muziejuje?", "Kokią materialią informaciją galima įtraukti į šaltiniais grįstą pasakojimą?"), suggestedAnswer: mediumAnswer },
    { question: choose(level, "Ką dar norėtum sužinoti?", "Kokio šaltinio trūksta platesniam pasakojimui?", "Kaip pagrįstum kūrinio kontekstą nesugalvodamas trūkstamos proveniencijos?"), suggestedAnswer: "Ieškok muziejaus katalogo, dokumentų ir tyrimų. Nežinomos kilmės istorijos ar istorinių įvykių nepridėk kaip faktų." },
  ];
  return [
    { question: choose(level, "Kas sukūrė šį kūrinį?", "Ką muziejaus duomenys pasako apie autorių?", "Kaip pradėtum autorystės tyrimą nuo muziejaus atribucijos?"), suggestedAnswer: authorAnswer },
    { question: choose(level, "Kokią datą randame muziejuje?", "Kokią kūrinio datą patvirtina muziejaus įrašas?", "Kokia chronologinė informacija iš tiesų pateikta šaltinyje?"), suggestedAnswer: dateAnswer },
    { question: choose(level, "Kaip kūrinys buvo padarytas?", "Kokia technika nurodyta muziejaus įraše?", "Kokį materialų įrodymą suteikia technikos metaduomenys?"), suggestedAnswer: mediumAnswer },
    { question: choose(level, "Ką žinome, o ką tik spėjame?", "Kuri iš tavo išvadų yra faktas, o kuri – spėjimas?", "Kaip sudarytum aiškią ribą tarp dokumentuoto fakto ir interpretacijos?"), suggestedAnswer: "Autorius, data ir technika yra faktai tik tiek, kiek juos pateikia muziejus. Kitos tavo išvados gali būti hipotezės, kurioms reikia šaltinių." },
    { question: choose(level, "Kur ieškotum kito įkalčio?", "Kokio papildomo šaltinio reikėtų kitam tyrimo žingsniui?", "Kaip tikrintum hipotezę nepriskirdamas kūriniui nepatvirtintos kilmės istorijos?"), suggestedAnswer: "Pradėk nuo originalaus muziejaus įrašo ir jo literatūros. Jei įrodymų nėra, klausimą palik atvirą." },
  ];
}

/** Vietinis mokomasis šablonas. Ne Gemini, ne vaizdo analizė, jokių tinklo užklausų. */
export function createDemoInvestigationService(artwork: Artwork): InvestigationService {
  return {
    mode: "demo",
    async generate(input, signal) {
      const request = validateInvestigationRequest(input);
      if (request.artworkId !== artwork.id) throw new Error("Tyrimo kūrinys nesutampa su atvertu puslapiu.");
      if (signal?.aborted) throw new DOMException("Pavyzdžio paruošimas atšauktas.", "AbortError");
      await Promise.resolve();
      if (signal?.aborted) throw new DOMException("Pavyzdžio paruošimas atšauktas.", "AbortError");
      const sourceUrl = `https://www.artic.edu/artworks/${artwork.id}`;
      const facts = [`Pavadinimas: ${artwork.title}.`];
      if (artwork.artist) facts.push(`Autorius muziejaus duomenyse: ${artwork.artist}.`);
      if (artwork.date) facts.push(`Muziejaus nurodyta data: ${artwork.date}.`);
      if (artwork.medium) facts.push(`Muziejaus nurodyta technika: ${artwork.medium}.`);
      const response: InvestigationResponse = {
        mode: "demo", request, generatedAt: new Date().toISOString(),
        result: {
          title: `${investigationModes[request.investigationMode]}: tyrimo pavyzdys`,
          introduction: choose(request.knowledgeLevel,
            "Tapk smalsiu tyrinėtoju: pirmiausia surask tai, ką apie kūrinį pasako muziejus, o tada kelk savo klausimus.",
            "Pradėk nuo muziejaus duomenų ir atskirk juos nuo savo interpretacijų. Šis mokomasis pavyzdys padeda pasiruošti tyrimui.",
            "Kritiškai įvertink metaduomenų ribas, atribuciją ir šaltinių poreikį. Šis mokomasis šablonas neatstoja meno istorijos tyrimo."),
          historicalContext: facts.map((text) => ({ text, sourceUrl })),
          observations: ["Pavyzdys remiasi tik pateiktais kūrinio metaduomenimis. Paveikslo vaizdas neanalizuojamas.",
            request.investigationMode === "symbolism_analysis" ? "Simbolių reikšmės ir autoriaus ketinimai šiame pavyzdyje nepatvirtinami." : "Trūkstamos biografijos, kilmės istorijos ir istoriniai įvykiai nepridedami kaip faktai."],
          questions: questions(artwork, request).slice(0, request.questionCount),
          summary: "Tai iš anksto paruoštas demonstracinis pavyzdys, ne Gemini atsakymas. Tolesniam tyrimui naudok originalų muziejaus įrašą ir patikimus šaltinius.",
        },
      };
      return validateInvestigationResponse(response, request);
    },
  };
}

export const DEMO_INVESTIGATIONS_KEY = "artmystery:demo:investigations:v1";
export const MAX_SAVED_INVESTIGATIONS = 30;
const MAX_SAVED_LENGTH = 2000000;
export class InvestigationStorageError extends Error {}
export function investigationStorageMessage(error: unknown): string {
  return error instanceof InvestigationStorageError ? error.message : "Naršyklės saugykla nepasiekiama. Pakeitimai neišsaugoti.";
}
function storageFailure(): never {
  throw new InvestigationStorageError("Tyrimų duomenų nepavyko perskaityti. Esami duomenys neperrašyti.");
}
function isoDate(value: unknown): value is string {
  return typeof value === "string" && value.length === 24 && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
}
export function decodeDemoInvestigations(raw: string | null): SavedInvestigation[] {
  if (raw === null) return [];
  try {
    if (raw.length > MAX_SAVED_LENGTH) return storageFailure();
    const data: unknown = JSON.parse(raw);
    if (!record(data) || data.version !== 1 || !Array.isArray(data.items) || data.items.length > MAX_SAVED_INVESTIGATIONS) return storageFailure();
    const ids = new Set<string>();
    return data.items.map((item: unknown) => {
      if (!record(item) || typeof item.id !== "string" || !/^demo-[0-9a-f-]{36}$/.test(item.id) || ids.has(item.id)
        || !text(item.artworkTitle, 2000) || !isoDate(item.savedAt) || !record(item.response)) return storageFailure();
      const request = validateInvestigationRequest(item.response.request);
      const response = validateInvestigationResponse(item.response, request);
      if (response.mode !== "demo") return storageFailure();
      ids.add(item.id);
      return { id: item.id, artworkTitle: item.artworkTitle, savedAt: item.savedAt, response };
    });
  } catch { return storageFailure(); }
}

interface InvestigationStorage { getItem(key: string): string | null; setItem(key: string, value: string): void }
/** Tik vietiniai demo duomenys. Jokio automatinio perkėlimo į Supabase. */
export function createDemoInvestigationRepository(storage: () => InvestigationStorage, onChange: () => void = () => {}): InvestigationRepository {
  const read = () => {
    let raw: string | null;
    try { raw = storage().getItem(DEMO_INVESTIGATIONS_KEY); }
    catch { throw new InvestigationStorageError("Naršyklės saugykla nepasiekiama. Pakeitimai neišsaugoti."); }
    return decodeDemoInvestigations(raw);
  };
  const write = (items: SavedInvestigation[]) => {
    const raw = JSON.stringify({ version: 1, items });
    if (raw.length > MAX_SAVED_LENGTH) throw new InvestigationStorageError("Tyrimai netelpa demonstracinėje saugykloje. Pakeitimai neišsaugoti.");
    try { storage().setItem(DEMO_INVESTIGATIONS_KEY, raw); }
    catch { throw new InvestigationStorageError("Nepavyko įrašyti tyrimų. Patikrink naršyklės saugyklos prieinamumą ir laisvą vietą. Pakeitimai neišsaugoti."); }
    onChange();
  };
  return {
    mode: "demo",
    async list() { return read(); },
    async save(input, artworkTitle) {
      const response = validateInvestigationResponse(input, input.request);
      if (response.mode !== "demo" || !text(artworkTitle, 2000)) throw new InvestigationStorageError("Ši saugykla priima tik demonstracinius tyrimus su kūrinio pavadinimu.");
      const items = read();
      // Pakartotinis to paties rezultato paspaudimas nekuria antro įrašo.
      const existing = items.find((item) => JSON.stringify(item.response) === JSON.stringify(response));
      if (existing) return existing;
      if (items.length >= MAX_SAVED_INVESTIGATIONS) throw new InvestigationStorageError("Galima išsaugoti iki 30 demonstracinių tyrimų. Pirmiausia pašalink nereikalingą tyrimą.");
      const item: SavedInvestigation = { id: `demo-${crypto.randomUUID()}`, artworkTitle: artworkTitle.trim(), savedAt: new Date().toISOString(), response };
      write([item, ...items]);
      return item;
    },
    async remove(id) {
      const items = read();
      if (!items.some((item) => item.id === id)) throw new InvestigationStorageError("Šio tyrimo jau nebėra. Atnaujink sąrašą.");
      write(items.filter((item) => item.id !== id));
    },
  };
}
