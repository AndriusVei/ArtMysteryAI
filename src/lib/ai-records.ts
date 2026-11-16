import type { AIInvestigationRow } from "@/types/database";
import type { InvestigationResponse, SavedInvestigation } from "@/types/investigation";
import { validateInvestigationResponse } from "./investigation.ts";
import { AIError, strictAIRequest, uuid } from "./ai-core.ts";
import { signGeneration, verifyGeneration } from "./ai-signature.ts";

export const AI_COLUMNS = "id,user_id,artwork_id,artwork_title,knowledge_level,investigation_mode,question_count,user_prompt,ai_result,created_at,saved_at,model,request_key,generation_signature";
function payload(row: AIInvestigationRow) {
  return { id: row.id, owner: row.user_id, artworkId: row.artwork_id, artworkTitle: row.artwork_title,
    request: { artworkId: row.artwork_id, knowledgeLevel: row.knowledge_level, investigationMode: row.investigation_mode, questionCount: row.question_count, userPrompt: row.user_prompt },
    result: row.ai_result, createdAt: new Date(row.created_at).toISOString(), model: row.model, requestKey: row.request_key };
}
export function rowFromGeneration(value: InvestigationResponse, title: string, owner: string, key: string, model: string, secret: string): AIInvestigationRow {
  if (value.mode !== "live" || !uuid(value.generationId)) throw new AIError("invalid_response");
  const row: AIInvestigationRow = { id: value.generationId, user_id: owner, artwork_id: value.request.artworkId, artwork_title: title,
    knowledge_level: value.request.knowledgeLevel, investigation_mode: value.request.investigationMode,
    question_count: value.request.questionCount, user_prompt: value.request.userPrompt, ai_result: value.result,
    created_at: value.generatedAt, saved_at: null, model, request_key: key, generation_signature: null };
  row.generation_signature = signGeneration(payload(row), secret); return row;
}
export function responseFromRow(row: AIInvestigationRow, owner: string, secret: string): InvestigationResponse {
  try {
    if (row.user_id !== owner || !uuid(row.id) || !verifyGeneration(payload(row), row.generation_signature, secret)) throw new Error();
    const request = strictAIRequest({ artworkId: row.artwork_id, knowledgeLevel: row.knowledge_level,
      investigationMode: row.investigation_mode, questionCount: row.question_count, userPrompt: row.user_prompt });
    return validateInvestigationResponse({ mode: "live", request, generatedAt: new Date(row.created_at).toISOString(), result: row.ai_result, generationId: row.id }, request);
  } catch { throw new AIError("invalid_response"); }
}
export function savedFromRow(row: AIInvestigationRow, owner: string, secret: string): SavedInvestigation {
  if (!row.saved_at || !Number.isFinite(Date.parse(row.saved_at)) || !row.artwork_title || row.artwork_title.length > 2000) throw new AIError("invalid_response");
  return { id: row.id, artworkTitle: row.artwork_title, savedAt: new Date(row.saved_at).toISOString(), response: responseFromRow(row, owner, secret) };
}
