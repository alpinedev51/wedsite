import { useWeddingConfig } from "../../config/WeddingConfigContext";
import { formatShortDate } from "../../lib/date";
import { Monogram } from "../decor/Monogram";
import Container from "../ui/Container";

function Footer() {
  const { wedding } = useWeddingConfig();

  return (
    <footer className="relative overflow-hidden border-t border-walnut/15 bg-clay/8 py-5">
      <Container className="relative flex flex-col items-center gap-2 text-center">
        <Monogram className="h-12 w-12 text-walnut/70" />
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
