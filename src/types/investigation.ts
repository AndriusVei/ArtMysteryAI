export type KnowledgeLevel = "child" | "beginner" | "expert";
export type InvestigationMode = "detective_mystery" | "historical_storytelling" | "symbolism_analysis";
export type QuestionCount = 3 | 5;

export interface ResearchSettings {
  knowledgeLevel: KnowledgeLevel;
  investigationMode: InvestigationMode;
  questionCount: QuestionCount;
}

export interface InvestigationRequest extends ResearchSettings {
  artworkId: number;
  userPrompt: string;
}

export interface InvestigationResult {
  title: string;
  introduction: string;
  historicalContext: { text: string; sourceUrl: string }[];
  observations: string[];
  questions: { question: string; suggestedAnswer: string }[];
  summary: string;
}

export interface InvestigationResponse {
  generationId?: string;
  mode: "demo" | "live";
  request: InvestigationRequest;
  generatedAt: string;
  result: InvestigationResult;
}

/** Live adapterį ir serverio autentifikaciją prijungs A. */
export interface InvestigationService {
  readonly mode: "demo" | "live";
  generate(request: InvestigationRequest, signal?: AbortSignal): Promise<InvestigationResponse>;
}

export interface SavedInvestigation {
  id: string;
  artworkTitle: string;
  savedAt: string;
  response: InvestigationResponse;
}

/** Demo ir paskyros saugyklos atskirtos. A prijungs autentifikuotą adapterį. */
export interface InvestigationRepository {
  readonly mode: "demo" | "account";
  list(): Promise<SavedInvestigation[]>;
  save(response: InvestigationResponse, artworkTitle: string): Promise<SavedInvestigation>;
  remove(id: string): Promise<void>;
}
