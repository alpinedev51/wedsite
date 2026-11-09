# Things to Do photos

Photos for the activity cards and their pop-ups on the Things to Do page.

The files in this folder are the **originals**. The page doesn't use them
directly: it uses the web copies in `web/` (AVIF in a few sizes, a WebP
fallback, and a ThumbHash preview per photo), made by
`scripts/process-photos.py`. Don't hand-edit anything in `web/`.

To add one:

1. Drop the photo in this folder.
2. From `ui-wed/`, run (needs [uv](https://docs.astral.sh/uv/)):

   ```sh
   uv run scripts/process-photos.py src/assets/things-to-do/<file> \
     --out src/assets/things-to-do/web --thumb-quality 50
   ```

   (Pass the folder instead of one file to redo them all; that takes a
   couple of minutes.) `--thumb-quality 50` keeps the card-sized copy small:
   these sources are already-compressed JPEGs, and at card size 50 looks
   the same as the default 75 at about half the bytes.

3. In `src/pages/ThingsToDo.tsx`, add `thingPhoto("<slug>", "<alt text>")`
   to that activity's `photos` list. The slug is the file name lowercased,
   with `_web` dropped and other punctuation turned into hyphens
   (`dgo_train_web.jpg` -> `dgo-train`). The first photo is the one on the
   card.
