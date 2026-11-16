export type CollectionCategory = "favorites" | "to_explore" | "explored";

export interface SaveArtworkInput {
  artworkId: number;
  title: string;
  artist: string | null;
  hasImage: boolean;
}

export interface CollectionItem extends SaveArtworkInput {
  id: string;
  category: CollectionCategory;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface CollectionChanges {
  category: CollectionCategory;
  notes: string;
}

/** Account adapteris tapatybę turi nustatyti serveryje, ne iš šių duomenų. */
export interface CollectionRepository {
  readonly mode: "demo" | "account";
  list(): Promise<CollectionItem[]>;
  save(input: SaveArtworkInput): Promise<CollectionItem>;
  update(artworkId: number, changes: CollectionChanges, expectedUpdatedAt: string): Promise<CollectionItem>;
  remove(artworkId: number, expectedUpdatedAt: string): Promise<void>;
}
