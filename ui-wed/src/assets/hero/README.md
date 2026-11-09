# Hero photos

The two photos behind the home page hero, imported in `src/pages/Home.tsx`.

To swap one, replace the file (same name) or import a new file in its place.
Keep them as web copies: about 2400px on the long side, under ~700 KB.
They fill the screen, so they're the biggest images on the site and the
first thing a guest downloads.

`thumbhashes.json` holds a blurred preview of each photo, shown while it
loads. After replacing a photo, regenerate it from `ui-wed/`:

```sh
uv run scripts/hash-images.py src/assets/hero/*.jpg
```
