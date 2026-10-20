// Full-opacity linen, not linen/80: at 80% the photograph showed through the
// glyph strokes themselves, which costs legibility over a busy image for no
// visual gain -- the drop-shadow is what gives this text its separation.
function HeroTagline({ className = "" }: { className?: string }) {
  return (
    <p
      className={`font-utility text-2xl uppercase tracking-label text-linen drop-shadow-lg sm:text-3xl lg:text-4xl ${className}`}
    >
      We're getting married
    </p>
  );
}

export default HeroTagline;
