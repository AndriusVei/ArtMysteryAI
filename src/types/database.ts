export type SavedArtworkRow = {
  id: string; user_id: string; artwork_id: number; title: string; artist: string | null;
  image_url: string | null; has_image: boolean; category: string; notes: string;
  created_at: string; updated_at: string;
};
export type Database = {
  public: {
    Tables: {
      saved_artworks: {
        Row: SavedArtworkRow;
        Insert: { user_id: string; artwork_id: number; title: string; artist: string | null; image_url: string | null; has_image: boolean };
        Update: { category?: string; notes?: string };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
