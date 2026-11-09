// Full-opacity linen, not linen/80: at 80% the photograph showed through the
// glyph strokes themselves, which costs legibility over a busy image for no
// visual gain -- the shadow is what gives this text its separation: a tight
// one crisps the letter edges, and two wider warm-dark glows lift the words off
// the photo.
function HeroTagline({ className = "" }: { className?: string }) {
  return (
    <p
      className={`font-utility text-2xl uppercase tracking-label text-linen [text-shadow:0_1px_2px_rgb(30_20_10/0.55),0_2px_20px_rgb(30_20_10/0.7),0_0_56px_rgb(30_20_10/0.45)] sm:text-3xl lg:text-4xl ${className}`}
    >
      We're getting married
    </p>
  );
}

export default HeroTagline;
