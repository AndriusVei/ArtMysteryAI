import type { Ref } from "react";
import type { InvestigationResponse } from "@/types/investigation";
import { knowledgeLevels, investigationModes } from "@/lib/investigation";

export function InvestigationResultView({ response, headingId, headingRef }: {
  response: InvestigationResponse; headingId: string; headingRef?: Ref<HTMLHeadingElement>;
}) {
  return (
      <section aria-labelledby={headingId} className="mt-10 border border-line bg-white/40 p-5 sm:p-8">
        <p className="eyebrow">Demonstracinis tyrimo pavyzdys</p>
        <h3 id={headingId} ref={headingRef} tabIndex={-1} className="mt-4 break-words text-2xl sm:text-3xl">{response.result.title}</h3>
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
      </section>
  );
}
