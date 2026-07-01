import { wedding } from "../../config/wedding";
import { Monogram } from "../decor/Monogram";
import Container from "../ui/Container";

function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-walnut/15 bg-clay/8 py-5">
      <Container className="relative flex flex-col items-center gap-2 text-center">
        <Monogram className="h-12 w-12 text-walnut/70" />
        <p className="font-script text-2xl text-walnut">
          {wedding.coupleNames}
        </p>
        <p className="font-utility text-xs uppercase tracking-widest text-walnut/60">
          {wedding.date.toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}{" "}
          | {wedding.location.city}
        </p>
      </Container>
    </footer>
  );
}

export default Footer;
