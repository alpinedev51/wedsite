function PhotoFrame({
  src,
  alt = "",
  className = "",
}: {
  src?: string;
  alt?: string;
  className?: string;
}) {
  return (
    <div
      className={`relative aspect-4/5 w-full max-w-sm overflow-hidden rounded-[2rem] border-4 border-linen shadow-xl ring-1 ring-walnut/15 ${className}`}
    >
      {src ? (
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-sage/25 via-clay/20 to-walnut/25 text-walnut/60">
          <svg
            viewBox="0 0 24 24"
            className="h-10 w-10"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden="true"
          >
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <circle cx="9" cy="11" r="2" />
            <path d="M21 16l-5-5-4 4-3-3-6 6" />
          </svg>
          <p className="font-utility text-xs uppercase tracking-widest">
            Add a photo of the couple
          </p>
        </div>
      )}
    </div>
  );
}

export default PhotoFrame;
