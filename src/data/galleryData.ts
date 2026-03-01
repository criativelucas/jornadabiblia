export interface GalleryImage {
  id: string;
  src: string;
  legenda: string;
}

// Static gallery data — curated by admin.
// To add images: place files in /public/images/gallery/[book]/ and add entries here.
export const galleryImages: Record<
  string,
  GalleryImage[A_deeply_emotional_historical_classical_oil_painti_delpmaspu.png]
> = {
  // Example:
  // "Gênesis": [
  //   { id: "gen_001", src: "/images/gallery/genesis/creation.jpg", legenda: "A criação do mundo" },
  // ],
};
