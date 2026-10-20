// Every loading state in the app was the bare string "Loading…", which
// guests hit on the RSVP page -- the one flow that most needs to feel
// deliberate. Same information, composed like the rest of the site.
function LoadingNote({
  children = "One moment",
  className = "",
}: {
  children?: string;
  className?: string;
}) {
  return (
    <p
      className={`flex items-center justify-center gap-2.5 font-utility text-sm uppercase tracking-widest text-ink/70 ${className}`}
      role="status"
    >
      <span
        aria-hidden="true"
        className="h-1.5 w-1.5 animate-pulse rounded-full bg-ochre-deep"
      />
      {children}
    </p>
  );
}

export default LoadingNote;
