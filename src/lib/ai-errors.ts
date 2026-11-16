export const aiMessages = {
  unauthorized: "Prisijunk, kad galėtum pradėti asmeninį DI tyrimą.",
  invalid: "Patikrink kūrinį, tyrimo pasirinkimus ir papildomo prašymo ilgį.",
  forbidden: "Ši užklausa neleidžiama. Atverk tyrimą šios svetainės lange.",
  not_configured: "Tikri DI tyrimai dar neprijungti. Gali naudoti aiškiai pažymėtą demonstracinį pavyzdį.",
  rate_limited: "Tyrimų limitas pasiektas. Palauk arba bandyk kitą dieną.",
  busy: "Vienas tavo tyrimas dar ruošiamas. Palauk jo pabaigos.",
  timeout: "DI tyrimas užtruko per ilgai. Pabandyk dar kartą vėliau.",
  credentials: "DI paslaugos prieigos patikrinti nepavyko. Pabandyk vėliau.",
  unavailable: "DI tyrimų paslauga šiuo metu nepasiekiama. Pabandyk vėliau.",
  invalid_response: "DI atsakymas neatitiko tyrimo formato ir nebuvo išsaugotas.",
  museum: "Muziejaus kūrinio duomenų patikrinti nepavyko. Pabandyk vėliau.",
  missing: "Tyrimo nerasta arba jis nepriklauso šiai paskyrai.",
};
export type AIErrorCode = keyof typeof aiMessages;
export class AIError extends Error {
  readonly code: AIErrorCode;
  constructor(code: AIErrorCode) { super(aiMessages[code]); this.name = "AIError"; this.code = code; }
}
export const uuid = (value: unknown): value is string => typeof value === "string" && /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(value);
