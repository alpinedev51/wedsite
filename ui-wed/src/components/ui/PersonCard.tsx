function PersonCard({
  name,
  role,
  photoSrc,
  blurb,
  className = "",
}: {
  name: string;
  role?: string;
  photoSrc?: string;
  blurb?: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center text-center ${className}`}>
      <div className="mb-4 h-32 w-32 overflow-hidden rounded-full border-4 border-linen shadow-md ring-1 ring-walnut/15">
        {photoSrc ? (
          <img
            src={photoSrc}
            alt={name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-sage/25 via-clay/20 to-walnut/25 font-display text-2xl text-walnut/50">
            {name.charAt(0)}
          </div>
        )}
      </div>
      <h3 className="font-display text-lg text-walnut">{name}</h3>
      {/* text-walnut (5.8:1) rather than text-clay (2.76:1) -- 12px uppercase
          tracked-out text is the last place to be spending contrast. */}
      {role && (
        <p className="mt-1 font-utility text-xs uppercase tracking-widest text-walnut">
          {role}
        </p>
      )}
      {blurb && <p className="mt-3 font-body text-sm text-ink/70">{blurb}</p>}
    </div>
  );
}

export default PersonCard;
