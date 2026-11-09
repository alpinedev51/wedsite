# /// script
# requires-python = ">=3.11,<3.14"
# dependencies = ["pillow>=11.3"]
# ///
"""Write ThumbHashes for a few loose images (ones that don't go through
process-photos.py, like the home page hero photos) to a thumbhashes.json
beside them, keyed by file name.

    uv run scripts/hash-images.py src/assets/hero/*.jpg

Re-run it after replacing one of the images.
"""

import json
import pathlib
import sys

from PIL import Image, ImageOps

from thumbhash_encode import thumbhash_b64


def main() -> None:
    files = [pathlib.Path(a) for a in sys.argv[1:]]
    if not files:
        sys.exit(__doc__)
    by_folder: dict[pathlib.Path, dict[str, str]] = {}
    for f in files:
        with Image.open(f) as opened:
            # Apply the camera's rotation tag, as browsers do when they draw
            # the photo -- otherwise a phone photo's preview could come out
            # sideways under the real, upright photo.
            im = ImageOps.exif_transpose(opened)
            by_folder.setdefault(f.parent, {})[f.name] = thumbhash_b64(im)
        print(f"{f.name:28s} {by_folder[f.parent][f.name]}")
    for folder, hashes in by_folder.items():
        out = folder / "thumbhashes.json"
        existing = json.loads(out.read_text()) if out.exists() else {}
        existing.update(hashes)
        out.write_text(json.dumps(dict(sorted(existing.items())), indent=2) + "\n")
        print(f"wrote {out}")


if __name__ == "__main__":
    main()
