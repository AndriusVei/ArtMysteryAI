/** Patikrinti ir normalizuoti muziejaus duomenys. Trūkstami laukai – null. */
export interface Artwork {
  id: number;
  title: string;
  artist: string | null;
  artistDisplay: string | null;
  date: string | null;
  medium: string | null;
  dimensions: string | null;
  type: string | null;
  description: string | null;
  creditLine: string | null;
  copyrightNotice: string | null;
  isPublicDomain: boolean;
  museumUrl: string;
  image: ArtworkImageData | null;
  imageUnavailableReason: "missing" | "rights" | "configuration" | null;
}

export interface ArtworkImageData {
  url: string;
  width: number;
  height: number;
}

export type ArtworkErrorCode =
  | "invalid_id"
  | "not_found"
  | "rate_limited"
  | "timeout"
  | "unavailable"
  | "invalid_response";

export type ArtworkResult =
  | { ok: true; artwork: Artwork }
  | { ok: false; code: ArtworkErrorCode };

export type ArtworkImageErrorCode = ArtworkErrorCode | "image_unavailable" | "invalid_image";

export type ArtworkImageResult =
  | { ok: true; buffer: ArrayBuffer }
  | { ok: false; code: ArtworkImageErrorCode };
