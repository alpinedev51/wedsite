import { Link } from "react-router-dom";
import { useWeddingConfig } from "@/config/useWeddingConfig";
import { m } from "motion/react";
import { Floral } from "@/components/decor/Floral";
import { revealSpring } from "@/lib/motion";

// The sprigs either side of the names, leaning outward. Only from md up --
// on a phone the names already fill the width.
const sprig = "h-16 text-walnut/65 lg:h-20";
const sprigWrap = "hidden shrink-0 md:block";

// The banner lives in Layout, so this plays once per visit (on the first
// page load), not on every page change. Names first, sprigs just after.
const fadeIn = (delay: number, y: number) => ({
  initial: { opacity: 0, y },
  animate: { opacity: 1, y: 0 },
  transition: { ...revealSpring, duration: 1.1, delay },
});

// A large headline at the very top of every page, above Nav (see
// Layout.tsx). Normal in-flow content, not fixed/sticky -- it scrolls away
// with the rest of the page like any other content. Nav is the only thing
// in the header region that stays pinned as you scroll.
function NameBanner() {
  const { wedding } = useWeddingConfig();

  return (
    <Link
      to="/"
      className="flex h-24 items-center justify-center gap-5 bg-linen sm:h-28 lg:h-32 lg:gap-8"
    >
      <m.div className={sprigWrap} {...fadeIn(0.3, 8)}>
        <Floral name="element-51" flipX className={`-rotate-12 ${sprig}`} />
      </m.div>
      <m.p
        className="font-script text-6xl text-walnut sm:text-7xl lg:text-8xl"
        {...fadeIn(0.05, 12)}
      >
        {wedding.coupleNames}
      </m.p>
      <m.div className={sprigWrap} {...fadeIn(0.3, 8)}>
        <Floral name="element-51" className={`rotate-12 ${sprig}`} />
      </m.div>
    </Link>
  );
}

export default NameBanner;
