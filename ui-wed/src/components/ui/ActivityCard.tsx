import type { GalleryImage } from "./Gallery";
import SmartImage from "./SmartImage";
import { coverSizes } from "@/lib/photoLibrary";

/** How wide a card photo is drawn: cards are one column on phones, two
 * from `sm`, three from `lg` inside a max-w-5xl Container, in a 3:2 frame. */
const cardSizes = (photo: GalleryImage) =>
  coverSizes(photo, 1.5, [
    { minWidth: 1024, px: 310 },
    { minWidth: 640, vw: 50 },
    { vw: 100 },
  ]);

function ActivityCard({
  title,
  summary,
  photo,
  eager = false,
  onOpen,
  className = "",
}: {
  title: string;
  summary: string;
  photo?: GalleryImage;
  /** Load the photo straight away (cards on screen when the page opens). */
  eager?: boolean;
  onOpen: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`group flex h-full flex-col overflow-hidden rounded-2xl border border-walnut/12 bg-linen/60 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-walnut/25 hover:bg-linen hover:shadow-md ${className}`}
    >
      <div className="relative aspect-3/2 w-full overflow-hidden bg-clay/10">
        {photo ? (
          <SmartImage
            src={photo.src}
            avifSrcSet={photo.avifSrcSet}
            sizes={cardSizes(photo)}
            thumbhash={photo.thumbhash}
            // Decorative here: inside the button the alt text would be read as
            // part of its name, and the title already says what this is.
            alt=""
            loading={eager ? "eager" : "lazy"}
            className="transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div
            aria-hidden="true"
            className="h-full w-full bg-gradient-to-br from-sage/25 via-clay/15 to-walnut/20"
          />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-6">
        <h3 className="font-display text-lg text-walnut">{title}</h3>
        <p className="font-body text-sm text-ink/70">{summary}</p>

        {/* The card is a button, but a half-pixel lift on hover was its only
            clickability cue -- this says plainly that there's more inside. */}
        <span className="mt-auto inline-flex items-center gap-1.5 pt-1 font-utility text-xs uppercase tracking-wider text-walnut">
          Read more
          <svg
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              d="M5 12h14M13 6l6 6-6 6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>
    </button>
  );
}

export default ActivityCard;
