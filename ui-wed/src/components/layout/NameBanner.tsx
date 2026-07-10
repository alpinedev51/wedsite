import { Link } from "react-router-dom";
import { useWeddingConfig } from "@/config/WeddingConfigContext";

// A large headline at the very top of every page, above Nav (see
// Layout.tsx). Normal in-flow content, not fixed/sticky -- it scrolls away
// with the rest of the page like any other content. Nav is the only thing
// in the header region that stays pinned as you scroll.
function NameBanner() {
  const { wedding } = useWeddingConfig();

  return (
    <Link
      to="/"
      className="flex h-24 items-center justify-center bg-linen sm:h-28 lg:h-32"
    >
      <p className="font-script text-6xl text-walnut sm:text-7xl lg:text-8xl">
        {wedding.coupleNames}
      </p>
    </Link>
  );
}

export default NameBanner;
