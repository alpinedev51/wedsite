"""ThumbHash encoder: a ~25-byte blurred preview of an image, decoded in the
browser by the `thumbhash` npm package while the real photo loads.

A line-for-line port of rgbaToThumbHash from Evan Wallace's reference
implementation (https://github.com/evanw/thumbhash, MIT), so its output
matches the JS encoder byte for byte. Imported by process-photos.py.
"""

import base64
import math

from PIL import Image


def _round(x: float) -> int:
    # JS Math.round (halves round up). Python's round() rounds halves to
    # even, which would give different bytes from the reference encoder.
    return math.floor(x + 0.5)


def rgba_to_thumbhash(w: int, h: int, rgba: bytes) -> bytes:
    if w > 100 or h > 100:
        raise ValueError(f"{w}x{h} doesn't fit in 100x100")
    n = w * h

    # Average colour, weighted by alpha.
    avg_r = avg_g = avg_b = avg_a = 0.0
    for i in range(n):
        j = i * 4
        alpha = rgba[j + 3] / 255
        avg_r += alpha / 255 * rgba[j]
        avg_g += alpha / 255 * rgba[j + 1]
        avg_b += alpha / 255 * rgba[j + 2]
        avg_a += alpha
    if avg_a:
        avg_r /= avg_a
        avg_g /= avg_a
        avg_b /= avg_a

    has_alpha = avg_a < n
    l_limit = 5 if has_alpha else 7
    lx = max(1, _round(l_limit * w / max(w, h)))
    ly = max(1, _round(l_limit * h / max(w, h)))

    # RGBA -> LPQA (luminance, yellow-blue, red-green, alpha), composited
    # over the average colour.
    lum, p, q, a = [0.0] * n, [0.0] * n, [0.0] * n, [0.0] * n
    for i in range(n):
        j = i * 4
        alpha = rgba[j + 3] / 255
        r = avg_r * (1 - alpha) + alpha / 255 * rgba[j]
        g = avg_g * (1 - alpha) + alpha / 255 * rgba[j + 1]
        b = avg_b * (1 - alpha) + alpha / 255 * rgba[j + 2]
        lum[i] = (r + g + b) / 3
        p[i] = (r + g) / 2 - b
        q[i] = r - g
        a[i] = alpha

    def encode_channel(channel, nx, ny):
        dc, ac, scale = 0.0, [], 0.0
        for cy in range(ny):
            cx = 0
            while cx * ny < nx * (ny - cy):
                fx = [math.cos(math.pi / w * cx * (x + 0.5)) for x in range(w)]
                f = 0.0
                for y in range(h):
                    fy = math.cos(math.pi / h * cy * (y + 0.5))
                    row = y * w
                    for x in range(w):
                        f += channel[x + row] * fx[x] * fy
                f /= n
                if cx or cy:
                    ac.append(f)
                    scale = max(scale, abs(f))
                else:
                    dc = f
                cx += 1
        if scale:
            ac = [0.5 + 0.5 / scale * v for v in ac]
        return dc, ac, scale

    l_dc, l_ac, l_scale = encode_channel(lum, max(3, lx), max(3, ly))
    p_dc, p_ac, p_scale = encode_channel(p, 3, 3)
    q_dc, q_ac, q_scale = encode_channel(q, 3, 3)
    if has_alpha:
        a_dc, a_ac, a_scale = encode_channel(a, 5, 5)

    is_landscape = w > h
    header24 = (
        _round(63 * l_dc)
        | (_round(31.5 + 31.5 * p_dc) << 6)
        | (_round(31.5 + 31.5 * q_dc) << 12)
        | (_round(31 * l_scale) << 18)
        | (int(has_alpha) << 23)
    )
    header16 = (
        (ly if is_landscape else lx)
        | (_round(63 * p_scale) << 3)
        | (_round(63 * q_scale) << 9)
        | (int(is_landscape) << 15)
    )
    out = [
        header24 & 255,
        (header24 >> 8) & 255,
        header24 >> 16,
        header16 & 255,
        header16 >> 8,
    ]
    ac_start = 6 if has_alpha else 5
    if has_alpha:
        out.append(_round(15 * a_dc) | (_round(15 * a_scale) << 4))

    ac_index = 0
    for ac in [l_ac, p_ac, q_ac, a_ac] if has_alpha else [l_ac, p_ac, q_ac]:
        for f in ac:
            k = ac_start + (ac_index >> 1)
            while len(out) <= k:
                out.append(0)
            out[k] |= _round(15 * f) << ((ac_index & 1) << 2)
            ac_index += 1
    return bytes(out)


def _fit_100(width: int, height: int) -> tuple[int, int] | None:
    """The size Pillow's thumbnail((100, 100)) would shrink an image to, or
    None if it already fits. Same rounding as Pillow, so hashes stay
    identical to the earlier thumbnail()-based version."""
    if width <= 100 and height <= 100:
        return None
    aspect = width / height

    def round_aspect(number, key):
        return max(min(math.floor(number), math.ceil(number), key=key), 1)

    if 1 >= aspect:  # taller than wide: height is the limit
        x = round_aspect(100 * aspect, key=lambda n: abs(aspect - n / 100))
        return x, 100
    y = round_aspect(100 / aspect, key=lambda n: 0 if n == 0 else abs(aspect - 100 / n))
    return 100, y


def small_rgba(im: Image.Image) -> tuple[int, int, bytes]:
    """The image shrunk to fit 100x100 (the encoder's limit), as RGBA."""
    # resize() reads the full-size photo but only ever builds the small
    # result -- unlike thumbnail(), which works in place and so needs a
    # full-size copy first (~72 MB for a 24 MP photo), or converting to RGBA
    # before shrinking (~96 MB). Palette and other unusual modes are
    # converted first, since they don't resize smoothly.
    if im.mode not in ("RGB", "RGBA"):
        im = im.convert("RGBA")
    size = _fit_100(im.width, im.height)
    small = im.resize(size, Image.Resampling.LANCZOS, reducing_gap=2.0) if size else im
    small = small.convert("RGBA")
    return small.width, small.height, small.tobytes()


def thumbhash_b64(im: Image.Image) -> str:
    """The image's ThumbHash as base64, as stored in manifest.json."""
    return base64.b64encode(rgba_to_thumbhash(*small_rgba(im))).decode()
