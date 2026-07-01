import { wedding } from "../../config/wedding";
import Container from "../ui/Container";

function Footer() {
  return (
    <footer className="border-t border-walnut/15 bg-clay/8 py-5">
      <Container className="flex flex-col items-center gap-2 text-center">
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
