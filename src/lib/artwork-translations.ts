import { createHash } from "node:crypto";
import type { Artwork } from "@/types/artwork";
import type { ArtworkTranslation } from "@/types/artwork-translation";

const translations: Record<number, ArtworkTranslation> = {
  16568: {
    language: "lt",
    sourceFingerprint: "142fef469e296c0a248b5787a67b8286adcd95c9440b4fb4b79deba4b8d342bb",
    text: {
      title: "Vandens lelijos",
      artistDisplay: "Claude Monet (prancūzų dailininkas, 1840–1926)",
      date: "1906",
      medium: "Aliejus ant drobės",
      dimensions: "89,9 × 94,1 cm (35 3/8 × 37 1/16 col.); su rėmu: 103,2 × 107 × 5,8 cm (40 5/8 × 42 1/8 × 2 1/4 col.)",
      type: "Tapyba",
      creditLine: "Martin A. Ryerson šeimos kolekcija",
      description: "Claude Monet vargu ar numanė, kad vandens sodas, kurį jis įrengė praėjus trejiems metams po to, kai 1890 m. įsigijo sodybą Živerni, Prancūzijoje, taps pagrindiniu jo įkvėpimo šaltiniu ateinančius du su puse dešimtmečio. Maždaug 250 paveikslų atskleidžia menininko kelią: nuo gana tiesioginių tvenkinio su mediniu japonišku tilteliu vaizdų iki monumentalių, beveik abstrakčių vandens lelijų kompozicijų. Pastarąsias jis kūrė rengdamasis 1914–1926 m. tapyti didžiąsias kompozicijas Paryžiaus Oranžerijos muziejui.\n\n„Vandens lelijos“ – vienas iš 1903–1908 m. šia tema nutapytų paveikslų – žymi tarpinį Monet stiliaus ir erdvės tyrinėjimų etapą. Beveik kvadratinis formatas pabrėžia jo atsitraukimą nuo įprastų žemės, dangaus ir vandens zonų vaizdavimo: visas dėmesys sutelkiamas į vandens paviršių. Vandens lelijų grupės apatiniame kairiajame ir viršutiniame dešiniajame kampuose įrėmina vandens taką, o paviršiuje atsispindi medžiai ir debesys. Nors sapniškos plūduriuojančios formos gali atrodyti natūrali menininko kūrybos raida, pats jis šiuos darbus laikė „apsėdimu“. Tai patvirtina ir techniniai Čikagos meno institute saugomos drobės tyrimai: jie atskleidė daug reikšmingų pakeitimų, kuriuos Monet atliko tapydamas paveikslą.",
    },
  },
};

/** Pasikeitus muziejaus šaltiniui, seno vertimo nerodome kaip dabartinio. */
export function artworkTextFingerprint(artwork: Artwork): string {
  const source = [artwork.id, artwork.title, artwork.artistDisplay, artwork.date,
    artwork.medium, artwork.dimensions, artwork.type, artwork.description, artwork.creditLine];
  return createHash("sha256").update(JSON.stringify(source)).digest("hex");
}

export function getArtworkTranslation(artwork: Artwork): ArtworkTranslation | null {
  const translation = translations[artwork.id];
  return translation && artworkTextFingerprint(artwork) === translation.sourceFingerprint ? translation : null;
}
