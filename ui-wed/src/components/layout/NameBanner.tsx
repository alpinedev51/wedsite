import { Link } from "react-router-dom";
import { useWeddingConfig } from "@/config/useWeddingConfig";
import { Floral } from "@/components/decor/Floral";

// The sprigs either side of the names, leaning outward. Only from md up --
// on a phone the names already fill the width.
const sprig = "hidden h-16 shrink-0 text-walnut/65 md:block lg:h-20";

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
      <Floral name="element-51" flipX className={`-rotate-12 ${sprig}`} />
      <p className="font-script text-6xl text-walnut sm:text-7xl lg:text-8xl">
        {wedding.coupleNames}
      </p>
      <Floral name="element-51" className={`rotate-12 ${sprig}`} />
    </Link>
  );
}

export default NameBanner;
