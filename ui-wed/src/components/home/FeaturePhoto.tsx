import { useRef } from "react";
import { m, useInView, useReducedMotion } from "motion/react";
import type { GalleryImage } from "../ui/Gallery";
import { Floral } from "../decor/Floral";
import { easeOutSoft, PHOTO_MAX_WAIT_MS } from "@/lib/motion";
import { coverSizes } from "@/lib/photoLibrary";
import { useImageReady } from "@/hooks/useImageReady";

const unveilViewport = { once: true, amount: 0.35 } as const;

// The bottom of the photo and of the outline arch fade into the page, so
// there's no hard bottom edge or square corners -- the arch rises out of
// the background instead of sitting on it like a box.
const photoFade =
  "linear-gradient(to bottom, black 0%, black 68%, transparent 97%)";
const outlineFade =
  "linear-gradient(to bottom, black 0%, black 55%, transparent 88%)";

// Florals fade in (and the sprigs rise a little) once the photo is mostly
// uncovered.
const floralIn = (delay: number, y = 0) => ({
  variants: {
    hidden: { opacity: 0, y },
    shown: { opacity: 1, y: 0 },
  },
  transition: { duration: 1.2, delay, ease: easeOutSoft },
});

// A single photo in an arched frame, with a thin second arch drawn just
// outside it, a bouquet across its base and a sprig climbing each side. The
// first time it scrolls into view the photo fades in while it's uncovered
// from top to bottom, settling from a slight zoom; then the outline and
// florals fade in around it.
function FeaturePhoto({
  image,
  className = "",
  objectPosition = "center",
}: {
  image: GalleryImage;
  className?: string;
  /** CSS object-position, to keep the subject in the portrait crop. */
  objectPosition?: string;
}) {
  // MotionConfig's reducedMotion only stops transforms; the clip-path wipe
  // would still play, so it's switched off here by hand.
  const reduce = useReducedMotion();
  // Covered from the bottom edge up, so the reveal runs top to bottom.
  const covered = reduce ? "inset(0% 0% 0% 0%)" : "inset(0% 0% 100% 0%)";

  // The figure watches for scrolling into view and its children follow via
  // the variant names. The clipped layer can't do that watching itself:
  // Motion's in-view check sees zero visible area while it's fully clipped,
  // so it would never fire.
  //
  // This doesn't stop the photo downloading, though. The browser's lazy
  // loader starts the fetch based on how close the <img> is to the screen,
  // not on clipping: measured in Chrome, it was fetched about a second after
  // the page opened, while still ~1,800px below the screen and fully
  // clipped. So the reveal normally finds the photo already loaded.
  const figureRef = useRef<HTMLElement>(null);
  const inView = useInView(figureRef, unveilViewport);

  // The reveal also waits for the photo, so on a slow connection it doesn't
  // uncover an empty arch. (Usually it's already here -- see above.) If it
  // still
  // isn't PHOTO_MAX_WAIT_MS after the frame comes into view (or it failed), the
  // reveal goes ahead anyway so the frame and florals never stay hidden.
  const { ready, imgProps } = useImageReady({
    src: image.src,
    maxWaitMs: PHOTO_MAX_WAIT_MS,
    active: inView,
  });

  return (
    <m.figure
      ref={figureRef}
      className={`relative mx-auto w-full ${className}`}
      initial="hidden"
      animate={inView && ready ? "shown" : "hidden"}
    >
      <m.div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-2.5 rounded-t-full border border-walnut/30 sm:-inset-3.5"
        style={{ maskImage: outlineFade, WebkitMaskImage: outlineFade }}
        variants={{ hidden: { opacity: 0 }, shown: { opacity: 1 } }}
        transition={{ duration: 1, delay: 0.7, ease: "easeOut" }}
      />
      {/* rounded-t-full on a portrait box gives a true semicircular top: the
          radius is capped at half the width. */}
      <m.div
        className="relative aspect-4/5 overflow-hidden rounded-t-full"
        style={{ maskImage: photoFade, WebkitMaskImage: photoFade }}
        // Fading in while it uncovers softens the moving edge of the wipe.
        variants={{
          hidden: { clipPath: covered, opacity: 0 },
          shown: { clipPath: "inset(0% 0% 0% 0%)", opacity: 1 },
        }}
        transition={{
          clipPath: { duration: 1.4, ease: easeOutSoft },
          opacity: { duration: 1.1, ease: "easeOut" },
        }}
      >
        <m.picture
          className="block h-full w-full"
          variants={{ hidden: { scale: 1.06 }, shown: { scale: 1 } }}
          transition={{ duration: 1.8, ease: easeOutSoft }}
        >
          {image.avifSrcSet && (
            <source
              type="image/avif"
              srcSet={image.avifSrcSet}
              // The frame is a 4:5 arch: max-w-xs (320px) on phones,
              // max-w-sm from sm, max-w-md from lg (see Home). A landscape
              // photo is drawn wider than the frame to fill it.
              sizes={coverSizes(image, 4 / 5, [
                { minWidth: 1024, px: 448 },
                { minWidth: 640, px: 384 },
                { px: 320 },
              ])}
            />
          )}
          <img
            src={image.src}
            alt={image.alt ?? ""}
            width={image.width}
            height={image.height}
            {...imgProps}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
            style={{ objectPosition }}
          />
        </m.picture>
      </m.div>

      {/* A sprig climbing each side, just outside the outline, leaning
          outward. Sized and placed as fractions of the frame so they keep
          their place at every width; tucked in closer on phones, where the
          frame nearly fills the screen. */}
      <m.div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[6%] -left-[8%] w-[13%] sm:-left-[17%] sm:w-[22%]"
        {...floralIn(0.9, 16)}
      >
        <Floral name="element-36" className="w-full -rotate-6 text-sage2/55" />
      </m.div>
      <m.div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[6%] -right-[8%] w-[13%] sm:-right-[17%] sm:w-[22%]"
        {...floralIn(1, 16)}
      >
        <Floral
          name="element-36"
          flipX
          className="w-full rotate-6 text-sage2/55"
        />
      </m.div>

      {/* The bouquet across the base, over the faded bottom of the photo.
          It hangs below the frame, so whatever follows needs room for it
          (see the padding under FeaturePhoto in Home). */}
      <m.div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-[17%] left-1/2 w-[104%] -translate-x-1/2"
        {...floralIn(0.75)}
      >
        <Floral name="arrangement-03" className="w-full text-olive/70" />
      </m.div>
    </m.figure>
  );
}

export default FeaturePhoto;
