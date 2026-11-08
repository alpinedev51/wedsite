# /// script
# requires-python = ">=3.11,<3.14"
# dependencies = ["pillow>=11.3", "pillow-heif>=1.0"]
# ///
"""Turn original photos (camera JPEGs, iPhone HEICs) into web copies for the
Photos page.

    uv run scripts/process-photos.py <originals-dir> [--out <folder>]

For each photo it writes, into the output folder (default:
src/assets/photos/):

    <slug>-<width>w.avif   up to 3 sizes: a grid thumbnail (640px short
                           edge), 1600px and 2400px long edge. Browsers
                           pick one from the srcset.
    <slug>.webp            one fallback, up to 1600px, for the few
                           browsers without AVIF.

and records each photo's size in manifest.json, which src/config/photos.ts
reads. Re-running replaces a photo's files and manifest entry; other
entries are kept. The slug is the lowercased filename ("IMG_2861.HEIC" ->
"img-2861", "DSC03359_Original.JPG" -> "dsc03359").

Quality choices (measured with SSIM against the resized original):
- AVIF q80 4:2:0 scored at or above JPEG q90 on every test photo at ~40%
  smaller files. 4:2:0 (AV1 Main profile) decodes everywhere AVIF does.
- The EXIF rotation is applied to the pixels, then all EXIF (camera data,
  GPS location) is dropped.
- The colour profile (e.g. iPhone Display P3) is kept, so wide-colour photos
  don't come out dull. Untagged photos are left untagged (= sRGB).
- Never upscales: a 1200px original yields at most 1200px copies.

Keep the originals somewhere outside the repo; only the web copies are
committed.
"""

import argparse
import json
import pathlib
import re

import pillow_heif
from PIL import Image, ImageOps

pillow_heif.register_heif_opener()

# Resolved from this file, so the script works from any directory.
DEFAULT_OUT = pathlib.Path(__file__).resolve().parent.parent / "src/assets/photos"
SOURCE_EXTS = {".jpg", ".jpeg", ".png", ".heic", ".heif", ".webp"}
THUMB_SHORT_EDGE = 640  # grid cells are <= ~310 CSS px, so this covers 2x
LONG_EDGES = (1600, 2400)
FALLBACK_LONG_EDGE = 1600
AVIF_OPTS = {"quality": 80, "speed": 4, "subsampling": "4:2:0"}
AVIF_THUMB_OPTS = {"quality": 75, "speed": 4, "subsampling": "4:2:0"}
WEBP_OPTS = {"quality": 85, "method": 6}


def slug_for(path: pathlib.Path) -> str:
    stem = re.sub(r"_(original|web)$", "", path.stem, flags=re.IGNORECASE)
    return re.sub(r"[^a-z0-9]+", "-", stem.lower()).strip("-")


def resized(im: Image.Image, long_edge: int) -> Image.Image:
    scale = long_edge / max(im.size)
    if scale >= 1:
        return im
    size = (round(im.width * scale), round(im.height * scale))
    return im.resize(size, Image.Resampling.LANCZOS)


def process(src: pathlib.Path, out: pathlib.Path) -> tuple[str, dict]:
    slug = slug_for(src)
    with Image.open(src) as opened:
        icc = opened.info.get("icc_profile")
        im = ImageOps.exif_transpose(opened).convert("RGB")
    save_extra = {"icc_profile": icc} if icc else {}

    # Drop stale files from an earlier run of this photo. Matched exactly
    # (<slug>-<digits>w.avif): a plain "<slug>-*" glob would also catch other
    # photos whose slug starts with this one ("img" vs "img-2861").
    stale = re.compile(rf"{re.escape(slug)}-\d+w\.avif")
    for old in out.glob("*.avif"):
        if stale.fullmatch(old.name):
            old.unlink()

    orig_long = max(im.size)
    thumb_long = round(THUMB_SHORT_EDGE * orig_long / min(im.size))
    targets = sorted({min(e, orig_long) for e in (thumb_long, *LONG_EDGES)})

    widths = []
    for i, long_edge in enumerate(targets):
        variant = resized(im, long_edge)
        opts = AVIF_THUMB_OPTS if i == 0 and len(targets) > 1 else AVIF_OPTS
        variant.save(
            out / f"{slug}-{variant.width}w.avif", "AVIF", **opts, **save_extra
        )
        widths.append(variant.width)

    fallback = resized(im, FALLBACK_LONG_EDGE)
    fallback.save(out / f"{slug}.webp", "WEBP", **WEBP_OPTS, **save_extra)

    return slug, {"width": im.width, "height": im.height, "widths": widths}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument(
        "source", type=pathlib.Path, help="folder of originals (or one file)"
    )
    parser.add_argument("--out", type=pathlib.Path, default=DEFAULT_OUT)
    args = parser.parse_args()

    sources = (
        [args.source]
        if args.source.is_file()
        else sorted(p for p in args.source.iterdir() if p.suffix.lower() in SOURCE_EXTS)
    )
    manifest_path = args.out / "manifest.json"
    manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {}

    for src in sources:
        slug, entry = process(src, args.out)
        manifest[slug] = entry
        print(
            f"{src.name:28s} -> {slug:18s} {entry['width']}x{entry['height']}  widths {entry['widths']}"
        )

    manifest_path.write_text(
        json.dumps(dict(sorted(manifest.items())), indent=2) + "\n"
    )
    print(f"{len(sources)} photo(s) processed; manifest has {len(manifest)}.")


if __name__ == "__main__":
    main()
