import { useEffect } from "react";
import Gallery from "./Gallery";
import type { GalleryImage } from "./Gallery";

export interface ActivityLink {
  label: string;
  href: string;
}

function ActivityModal({
  title,
  details,
  links,
  photos,
  onClose,
}: {
  title: string;
  details: string;
  links?: ActivityLink[];
  photos?: GalleryImage[];
  onClose: () => void;
}) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/90 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-linen p-8 text-left shadow-xl sm:p-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="font-display text-2xl text-walnut sm:text-3xl">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 text-ink/50 hover:text-ink"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <p className="mt-4 font-body text-base leading-relaxed text-ink/80">
          {details}
        </p>

        {links && links.length > 0 && (
          <ul className="mt-6 flex flex-wrap gap-3">
            {links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center rounded-full border border-walnut px-4 py-2 font-utility text-sm text-walnut transition-colors hover:bg-walnut hover:text-linen"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        )}

        {photos && photos.length > 0 && (
          <Gallery images={photos} className="mt-6" />
        )}
      </div>
    </div>
  );
}

export default ActivityModal;
