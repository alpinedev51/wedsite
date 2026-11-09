import manifest from "../assets/things-to-do/web/manifest.json";
import { photoLibrary } from "../lib/photoLibrary";

// The Things to Do photos, by slug (e.g. "dgo-train" for
// dgo_train_web.jpg). The files and manifest in assets/things-to-do/web/
// are made from the originals one folder up by scripts/process-photos.py --
// see assets/things-to-do/README.md.
export const thingPhoto = photoLibrary(
  import.meta.glob<string>("../assets/things-to-do/web/*.{avif,webp}", {
    eager: true,
    query: "?url",
    import: "default",
  }),
  manifest,
);
