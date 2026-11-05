import { Floral } from "../decor/Floral";

// A floral spray tucked against the bottom of the portrait, on the given
// side. Its blooms sit on the frame and the stems reach outward, so two
// cards side by side mirror each other.
const sprays = {
  left: { flipX: true, position: "-left-14 sm:-left-24" },
  right: { flipX: false, position: "-right-14 sm:-right-24" },
};

function PersonCard({
  name,
  role,
  photoSrc,
  blurb,
  spray,
  className = "",
}: {
  name: string;
  role?: string;
  photoSrc?: string;
  blurb?: string;
  spray?: keyof typeof sprays;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center text-center ${className}`}>
      <div className="relative mb-6">
        {/* The frame: a fine gold ring a little outside the photo. */}
        <span
          aria-hidden="true"
          className="absolute -inset-2.5 rounded-full border border-ochre/60"
        />
        <div className="relative h-40 w-40 overflow-hidden rounded-full border-4 border-linen shadow-md ring-1 ring-walnut/15 sm:h-48 sm:w-48">
          {photoSrc ? (
            <img
              src={photoSrc}
              alt={name}
              // The frame fixes the size, so nothing shifts as it loads.
              decoding="async"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-sage/25 via-clay/20 to-walnut/25 font-display text-4xl text-walnut/50">
              {name.charAt(0)}
            </div>
          )}
        </div>
        {spray && (
          <Floral
            name="arrangement-10"
            flipX={sprays[spray].flipX}
            className={`absolute -bottom-4 w-28 text-sage2/60 sm:-bottom-5 sm:w-36 ${sprays[spray].position}`}
          />
        )}
      </div>
      <h3 className="font-display text-xl text-walnut sm:text-2xl">{name}</h3>
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
