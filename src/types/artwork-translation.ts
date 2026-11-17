import type { Artwork } from "./artwork";

export type ArtworkText = Pick<Artwork,
  "title" | "artistDisplay" | "date" | "medium" | "dimensions" | "type" | "description" | "creditLine"
>;

/** Bendra sutartis būsimiems peržiūrėtiems vertimams; originalūs duomenys nekinta. */
export interface ArtworkTranslation {
  language: "lt";
  sourceFingerprint: string;
  automatic?: boolean;
  text: ArtworkText;
}
