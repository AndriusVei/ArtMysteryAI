"use client";

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
        <p className="text-muted">Rodomas vietinis mokomasis pavyzdys, ne DI sugeneruotas tyrimas. Mokamų užklausų nėra. Šis pavyzdys neišsaugomas ir atnaujinus puslapį dings.</p>
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

      {response && <section aria-labelledby="research-result-heading" className="mt-10 border border-line bg-white/40 p-5 sm:p-8">
        <p className="eyebrow">Demonstracinis tyrimo pavyzdys</p>
        <h3 id="research-result-heading" ref={resultHeading} tabIndex={-1} className="mt-4 break-words text-2xl sm:text-3xl">{response.result.title}</h3>
        <p className="mt-4 text-sm leading-7 text-muted">{knowledgeLevels[response.request.knowledgeLevel]} · {investigationModes[response.request.investigationMode]} · {response.request.questionCount} klausimai · kūrinys #{response.request.artworkId}</p>
        <p className="mt-5 leading-8">{response.result.introduction}</p>
        {response.request.userPrompt && <div className="mt-6 border-l-2 border-line pl-4">
          <h4 className="text-sm font-semibold">Tavo papildomas prašymas</h4>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7">{response.request.userPrompt}</p>
          <p className="mt-2 text-xs text-muted">Šabloniniame pavyzdyje šis prašymas neapdorojamas.</p>
        </div>}
        <h4 className="mt-8 text-lg font-semibold">Muziejaus pateikti duomenys</h4>
        <ul className="mt-4 list-disc space-y-3 pl-5 text-sm leading-7">
          {response.result.historicalContext.map((entry, index) => <li key={index}><span className="break-words">{entry.text}</span>{" "}<a href={entry.sourceUrl} className="underline underline-offset-4">Šaltinis</a></li>)}
        </ul>
        <h4 className="mt-8 text-lg font-semibold">Tyrimo ribos ir interpretacijos</h4>
        {response.result.observations.map((observation, index) => <p key={index} className="mt-3 text-sm leading-7 text-muted">{observation}</p>)}
        <h4 className="mt-8 text-lg font-semibold">Klausimai tavo tyrimui</h4>
        <ol className="mt-5 space-y-6" aria-label="Tyrimo klausimai">
          {response.result.questions.map((entry, index) => <li key={index} className="border-t border-line pt-5">
            <p className="font-semibold leading-7">{index + 1}. {entry.question}</p>
            <details className="mt-3 text-sm leading-7">
              <summary className="min-h-11 cursor-pointer py-2 text-gold">Galimas atsakymas ir paaiškinimas</summary>
              <p className="mt-3 whitespace-pre-wrap break-words">{entry.suggestedAnswer}</p>
            </details>
          </li>)}
        </ol>
        <p className="mt-8 border-t border-line pt-6 text-sm leading-7 text-muted">{response.result.summary}</p>
      </section>}
    </section>
  );
}
