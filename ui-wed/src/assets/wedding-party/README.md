# Wedding Party photos

Photos for the Wedding Party page (`src/pages/WeddingParty.tsx`):

- `maid_of_honor.jpg`: the maid of honor
- `best_man.jpg`: the best man

The names come from the `VITE_MAID_OF_HONOR` and `VITE_BEST_MAN` env vars
(see `src/config/weddingParty.ts`). A card only shows when its name is set.
With a name but no photo here, the card shows their initial instead.

Any of `.jpg`, `.jpeg`, `.png`, `.webp` or `.avif` works, as long as the file
name is exactly `maid_of_honor` or `best_man`. Photos are shown as a circle
about 200px across, so a square crop around 600 x 600px (under ~150 KB) is
plenty and keeps the page quick to load.
