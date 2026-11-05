import { Floral, type FloralName } from "../decor/Floral";

/** A floral spray tucked against the portrait's frame. */
export interface Spray {
  name: FloralName;
  /** Mirror it left-to-right. */
  flipX?: boolean;
  /** Its colour, position and width, e.g. "-bottom-4 -left-14 w-28
   * text-sage2/75". The caller sets them: the size and position depend on
   * the artwork's shape. */
  className: string;
}

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
  spray?: Spray;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center text-center ${className}`}>
      {role && (
        <p className="relative z-10 mb-5 font-utility text-lg uppercase tracking-widest text-walnut">
          {role}
        </p>
      )}
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
            name={spray.name}
            flipX={spray.flipX}
            className={`absolute ${spray.className}`}
          />
        )}
      </div>
      {/* `relative` on the text below puts it on a layer above the spray,
          so a spray that reaches down past the portrait never covers it
          (coming after the spray, it draws on top). */}
      <h3 className="relative font-display text-xl text-walnut sm:text-2xl">
        {name}
      </h3>
      {blurb && (
        <p className="relative mt-3 font-body text-sm text-ink/70">{blurb}</p>
      )}
    </div>
  );
}

export default PersonCard;
