export type SavedArtworkRow = {
  id: string; user_id: string; artwork_id: number; title: string; artist: string | null;
  image_url: string | null; has_image: boolean; category: string; notes: string;
  created_at: string; updated_at: string;
};
export type Database = {
  public: {
    Tables: {
      ai_investigations: {
        Row: AIInvestigationRow;
        Insert: Omit<AIInvestigationRow, "saved_at"> & { saved_at?: string | null };
        Update: { saved_at?: string | null };
        Relationships: [];
      };
      saved_artworks: {
        Row: SavedArtworkRow;
        Insert: { user_id: string; artwork_id: number; title: string; artist: string | null; image_url: string | null; has_image: boolean };
        Update: { category?: string; notes?: string };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      reserve_ai_quota: { Args: { ip_hash: string; request_id: string }; Returns: string };
      release_ai_quota: { Args: { request_id: string }; Returns: undefined };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type AIInvestigationRow = {
  id: string; user_id: string; artwork_id: number; artwork_title: string;
  knowledge_level: string; investigation_mode: string; question_count: number; user_prompt: string;
  ai_result: import("./investigation").InvestigationResult;
  created_at: string; saved_at: string | null; model: string | null;
  request_key: string | null; generation_signature: string | null;
};
