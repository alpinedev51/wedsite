import { useWeddingConfig } from "../../config/WeddingConfigContext";
import { formatShortDate } from "../../lib/date";
import { SiteMonogram } from "../decor/SiteMonogram";
import { Floral } from "../decor/Floral";
import Container from "../ui/Container";

function Footer() {
  const { wedding } = useWeddingConfig();

  return (
    <footer className="relative overflow-hidden border-t border-walnut/15 bg-clay/8 py-5">
      {/* The same corner sprays as the top of the home page, the right way up
          here, so the page opens and closes with flowers. */}
      <Floral
        name="side-design-01"
        className="absolute bottom-0 left-0 w-24 text-sage2/55 sm:w-36 lg:w-48"
      />
      <Floral
        name="side-design-01"
        flipX
        className="absolute right-0 bottom-0 w-24 text-sage2/55 sm:w-36 lg:w-48"
      />
      <Container className="relative flex flex-col items-center gap-2 text-center">
        <SiteMonogram className="h-12 w-12 text-walnut/70" />
        <p className="font-script text-2xl text-walnut">
          {wedding.coupleNames}
        </p>
        {/* text-walnut (5.8:1) rather than text-walnut/60 (2.55:1), and
            formatShortDate so this renders in the venue's timezone like every
            other date on the site -- toLocaleDateString() with no timeZone
            showed the previous day to guests west of the venue. */}
        <p className="font-utility text-xs uppercase tracking-widest text-walnut">
          {formatShortDate(wedding.date)} | {wedding.location.city}
        </p>
      </Container>
    </footer>
  );
}

export default Footer;
