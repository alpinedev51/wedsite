function HeroTagline({ className = "" }: { className?: string }) {
  return (
    <p
      className={`font-utility text-2xl uppercase tracking-label text-linen/80 drop-shadow-lg sm:text-3xl lg:text-4xl ${className}`}
    >
      We're getting married
    </p>
  );
}

export default HeroTagline;
