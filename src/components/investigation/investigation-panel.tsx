"use client";

import { InvestigationResultView } from "./investigation-result-view";
import { SaveInvestigationButton } from "./save-investigation-button";
import { useEffect, useRef, useState } from "react";
import type { Artwork } from "@/types/artwork";
import type { InvestigationRequest, InvestigationResponse, ResearchSettings } from "@/types/investigation";
import {
  createDemoInvestigationService, defaultResearchSettings, investigationModes, knowledgeLevels,
  MAX_USER_PROMPT_LENGTH, ResearchValidationError, validateInvestigationRequest,
} from "@/lib/investigation";
import type { ResearchFieldErrors } from "@/lib/investigation";

export function InvestigationPanel({ artwork }: { artwork: Artwork }) {
  const [settings, setSettings] = useState<ResearchSettings>({ ...defaultResearchSettings });
  const [userPrompt, setUserPrompt] = useState("");
  const [response, setResponse] = useState<InvestigationResponse | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ResearchFieldErrors>({});
  const active = useRef<AbortController | null>(null);
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const formHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => () => active.current?.abort(), []);
  useEffect(() => { if (response) resultHeading.current?.focus(); }, [response]);

  function clearPreview() { setResponse(null); setError(null); setFieldErrors({}); }
  function changeSettings(update: Partial<ResearchSettings>) { setSettings((current) => ({ ...current, ...update })); clearPreview(); }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (active.current) return;
    setError(null); setFieldErrors({});
    let request: InvestigationRequest;
    try { request = validateInvestigationRequest({ artworkId: artwork.id, ...settings, userPrompt }); }
    catch (cause) {
      if (cause instanceof ResearchValidationError) setFieldErrors(cause.fields);
      setError(cause instanceof ResearchValidationError ? cause.message : "Patikrink tyrimo pasirinkimus.");
      formHeading.current?.focus(); return;
    }
    const controller = new AbortController();
    active.current = controller; setPending(true); setResponse(null);
    try {
      const result = await createDemoInvestigationService(artwork).generate(request, controller.signal);
      if (!controller.signal.aborted) setResponse(result);
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof ResearchValidationError ? cause.message : "Pavyzdžio paruošti nepavyko. Pabandyk dar kartą.");
    } finally {
      if (active.current === controller) { active.current = null; setPending(false); }
    }
  }

  return (
    <section aria-labelledby="investigation-heading" className="mt-14 border-t border-line pt-10">
      <p className="eyebrow">Meno detektyvas</p>
      <h2 id="investigation-heading" ref={formHeading} tabIndex={-1} className="mt-4 text-3xl sm:text-4xl">Kokį klausimą užduosi kūriniui?</h2>
      <p className="mt-5 max-w-2xl leading-8 text-muted">Pasirink savo žinių lygį, tyrimo būdą ir klausimų skaičių. Kūrinio informacija susiejama automatiškai.</p>
      <aside aria-label="Tyrimo demonstracinis režimas" className="mt-7 border-l-2 border-gold bg-white/50 p-5 text-sm leading-7">
        <p className="font-semibold">Demonstracinis režimas · Gemini neprijungtas</p>
        <p className="text-muted">Rodomas vietinis mokomasis pavyzdys, ne DI sugeneruotas tyrimas. Mokamų užklausų nėra. Pavyzdį gali išsaugoti tik šioje naršyklėje. Neišsaugotas pavyzdys atnaujinus puslapį dings. Nerašyk slaptažodžių ar kitų jautrių duomenų.</p>
      </aside>

      <form onSubmit={submit} className="mt-8" aria-busy={pending}>
        <fieldset disabled={pending}>
          <legend className="sr-only">Tyrimo parametrai</legend>
          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <label htmlFor="research-level" className="mb-3 block text-sm font-semibold">Žinių lygis</label>
              <select id="research-level" value={settings.knowledgeLevel} onChange={(event) => changeSettings({ knowledgeLevel: event.target.value as ResearchSettings["knowledgeLevel"] })}
                aria-invalid={Boolean(fieldErrors.knowledgeLevel)} aria-describedby={fieldErrors.knowledgeLevel ? "research-level-error" : undefined}
                className="min-h-12 w-full border border-line bg-paper px-3 py-3 text-sm">
                {Object.entries(knowledgeLevels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              {fieldErrors.knowledgeLevel && <p id="research-level-error" className="mt-2 text-sm">{fieldErrors.knowledgeLevel}</p>}
            </div>
            <div>
              <label htmlFor="research-mode" className="mb-3 block text-sm font-semibold">Tyrimo režimas</label>
              <select id="research-mode" value={settings.investigationMode} onChange={(event) => changeSettings({ investigationMode: event.target.value as ResearchSettings["investigationMode"] })}
                aria-invalid={Boolean(fieldErrors.investigationMode)} aria-describedby={fieldErrors.investigationMode ? "research-mode-error" : undefined}
                className="min-h-12 w-full border border-line bg-paper px-3 py-3 text-sm">
                {Object.entries(investigationModes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              {fieldErrors.investigationMode && <p id="research-mode-error" className="mt-2 text-sm">{fieldErrors.investigationMode}</p>}
            </div>
            <div>
              <label htmlFor="research-count" className="mb-3 block text-sm font-semibold">Tyrimo ilgis</label>
              <select id="research-count" value={settings.questionCount} onChange={(event) => changeSettings({ questionCount: Number(event.target.value) as 3 | 5 })}
                aria-invalid={Boolean(fieldErrors.questionCount)} aria-describedby={fieldErrors.questionCount ? "research-count-error" : undefined}
                className="min-h-12 w-full border border-line bg-paper px-3 py-3 text-sm">
                <option value={3}>3 klausimai</option><option value={5}>5 klausimai</option>
              </select>
              {fieldErrors.questionCount && <p id="research-count-error" className="mt-2 text-sm">{fieldErrors.questionCount}</p>}
            </div>
          </div>
          <div className="mt-7 max-w-3xl">
            <label htmlFor="research-prompt" className="mb-3 block text-sm font-semibold">Papildomas prašymas <span className="font-normal text-muted">(neprivaloma)</span></label>
            <textarea id="research-prompt" value={userPrompt} maxLength={MAX_USER_PROMPT_LENGTH} rows={4}
              onChange={(event) => { setUserPrompt(event.target.value); clearPreview(); }}
              aria-invalid={Boolean(fieldErrors.userPrompt)} aria-describedby="research-prompt-help research-prompt-error"
              placeholder="Pavyzdžiui: norėčiau tyrinėti kartu su mokiniais."
              className="w-full resize-y border border-line bg-white/40 p-4 text-sm leading-7" />
            <p id="research-prompt-help" className="mt-2 text-xs leading-6 text-muted">{userPrompt.length} / {MAX_USER_PROMPT_LENGTH} ženklų. Demo režime prašymas rodomas peržiūroje, bet nekeičia pavyzdžio.</p>
            <p id="research-prompt-error" className="mt-2 text-sm">{fieldErrors.userPrompt}</p>
          </div>
          <button type="submit" disabled={pending} className="mt-6 min-h-12 bg-ink px-6 py-4 text-sm text-paper hover:bg-gold disabled:cursor-wait disabled:opacity-60">
            {pending ? "Ruošiamas pavyzdys…" : "✨ Pradėti meno detektyvo tyrimą"}
          </button>
        </fieldset>
        {error && <p role="alert" className="mt-5 text-sm leading-7">{error}</p>}
      </form>

      {response && <>
        <InvestigationResultView response={response} headingId="research-result-heading" headingRef={resultHeading} />
        <SaveInvestigationButton key={JSON.stringify(response)} response={response} artworkTitle={artwork.title} />
      </>}
    </section>
  );
}
