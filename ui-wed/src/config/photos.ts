import type { GalleryImage } from "../components/ui/Gallery";
import manifest from "../assets/photos/manifest.json";
import { photoLibrary } from "../lib/photoLibrary";

// The Photos page, section by section. Each photo is named by its slug: the
// file prefix in src/assets/photos/ (e.g. "dsc03359" for
// dsc03359-2400w.avif). Those files and manifest.json are made by
// scripts/process-photos.py -- see src/assets/photos/README.md to add more.

interface PhotoSection {
  title: string;
  photos: { slug: string; alt: string }[];
}

const sections: PhotoSection[] = [
  {
    title: "Engagement Photos",
    photos: [
      {
        slug: "dsc03359",
        alt: "Austin lifting Kylie in a golden meadow below the mountains",
      },
      {
        slug: "dsc03595",
        alt: "Our dog bounding through the tall grass toward the camera",
      },
      {
        slug: "dsc03722",
        alt: "Austin carrying Kylie, who is holding our dog",
      },
      {
        slug: "dsc03746",
        alt: "Kylie on Austin's back in the meadow, our dog nearby",
      },
      {
        slug: "dsc03845",
        alt: "Austin and Kylie flexing side by side in the meadow",
      },
      {
        slug: "dsc03946",
        alt: "Kylie hugging Austin in front of the mountains",
      },
      {
        slug: "dsc04029",
        alt: "The engagement ring balanced on our dog's nose",
      },
      {
        slug: "dsc04095",
        alt: "Kylie kicking her leg across Austin, our dog between them",
      },
      { slug: "dsc04153", alt: "Austin and Kylie nose to nose at sunset" },
      { slug: "dsc04221", alt: "Austin dipping Kylie while our dog watches" },
      {
        slug: "dsc04233",
        alt: "Austin and Kylie hugging our dog under a pink sky",
      },
    ],
  },
  {
    title: "The Proposal",
    photos: [
      {
        slug: "img-2842",
        alt: "A canyon selfie with a friend on the river trip",
      },
      {
        slug: "img-2892",
        alt: 'The ring box, engraved "Austin & Kylie", above a turquoise river',
      },
      { slug: "img-2917", alt: "Kylie shocked, holding up the open ring box" },
      {
        slug: "img-2861",
        alt: "Austin and Kylie by the river, Kylie showing her ring",
      },
      {
        slug: "img-2967",
        alt: "Kylie celebrating with her ring held up to the camera",
      },
      {
        slug: "img-3668",
        alt: "Kylie's hand and ring against the river and canyon walls",
      },
      {
        slug: "img-3015",
        alt: "Kylie smiling in a raft on the river at golden hour",
      },
    ],
  },
  {
    title: "Georgia Tech Graduation",
    photos: [
      {
        slug: "gatech-walkaway",
        alt: "Austin & Kylie walking hand in hand down a brick path on the Georgia Tech campus",
      },
      {
        slug: "ak-doors",
        alt: "Austin & Kylie in graduation gowns in front of wooden doors",
      },
    ],
  },
  {
    title: "Adventures Together",
    photos: [
      { slug: "img-2828", alt: "Kylie throwing a shaka by the ocean" },
      {
        slug: "img-2939",
        alt: "Austin flexing in an infinity pool above the ocean",
      },
      {
        slug: "img-5188",
        alt: "Austin and Kylie on a riverbank between red canyon walls",
      },
      {
        slug: "img-2538",
        alt: "Austin and Kylie on a loaded raft in a red rock canyon",
      },
      { slug: "img-5956", alt: "A selfie by a river in the woods" },
      { slug: "img-4620", alt: "A selfie on a mountain hike under big clouds" },
      { slug: "img-5596", alt: "Kylie flexing halfway up a rock climb" },
      {
        slug: "img-5299",
        alt: "Kylie flexing in her climbing helmet against red rock",
      },
      {
        slug: "img-5380",
        alt: "Austin and Kylie standing on red rock under a blue sky",
      },
      {
        slug: "img-5205",
        alt: "Austin and Kylie reading the sign at the Ouray Ice Park",
      },
      {
        slug: "img-5234",
        alt: "Austin and Kylie cheering below a frozen canyon wall",
      },
      { slug: "img-0246", alt: "Austin and Kylie by a campfire in the snow" },
      {
        slug: "img-0566",
        alt: "Austin and Kylie at the HYROX Atlanta finish wall",
      },
      {
        slug: "img-0565",
        alt: "Austin and Kylie in front of the HYROX results board",
      },
      { slug: "img-0554", alt: "Austin on the rower at HYROX" },
      { slug: "img-0557", alt: "Austin doing wall balls at HYROX" },
      {
        slug: "img-0567",
        alt: "Kylie on the ski erg at HYROX with Austin behind her",
      },
      { slug: "img-0570", alt: "Kylie doing wall balls at HYROX" },
      {
        slug: "img-0575",
        alt: "Austin and Kylie doing sandbag lunges at HYROX",
      },
      { slug: "img-5813", alt: "A selfie at a pool with a climbing wall" },
      { slug: "img-1459", alt: "A selfie in front of a mountain lake" },
      {
        slug: "img-6378",
        alt: "Austin and Kylie on a rocky summit above green valleys",
      },
      {
        slug: "img-0648",
        alt: "Austin and Kylie on a canyon overlook in Zion",
      },
      {
        slug: "img-1115",
        alt: "Austin and Kylie on the shore of a glacial lake below waterfalls",
      },
      {
        slug: "img-4129",
        alt: "Austin holding our dog on the grass under a glowing storm cloud",
      },
    ],
  },
];

// Every processed file in the folder, as built URLs. `eager` + `?url` makes
// Vite bundle each file and hand back its hashed URL.
const toGalleryImage = photoLibrary(
  import.meta.glob<string>("../assets/photos/*.{avif,webp}", {
    eager: true,
    query: "?url",
    import: "default",
  }),
  manifest,
);

/** One photo from the sections above, by slug, for use outside the Photos
 * page (e.g. the framed photo on Home). Same files, sizes and alt text as the
 * gallery, so the alt text only ever lives in one place. */
export function getPhoto(slug: string): GalleryImage {
  const photo = sections
    .flatMap((section) => section.photos)
    .find((p) => p.slug === slug);
  if (!photo) throw new Error(`Photo "${slug}" isn't listed in photos.ts`);
  return toGalleryImage(photo.slug, photo.alt);
}

export const photoSections = sections.map((section) => ({
  title: section.title,
  images: section.photos.map((p) => toGalleryImage(p.slug, p.alt)),
}));
