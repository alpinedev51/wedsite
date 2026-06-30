import { Link } from "react-router-dom";
import Container from "../components/ui/Container";
import Section from "../components/ui/Section";
import Eyebrow from "../components/ui/Eyebrow";

function NotFound() {
  return (
    <Section className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <Container className="flex flex-col items-center gap-4">
        <Eyebrow>404</Eyebrow>
        <h1 className="text-4xl">Page not found</h1>
        <Link
          to="/"
          className="font-utility text-sm uppercase tracking-wider text-clay hover:underline"
        >
          Back home
        </Link>
      </Container>
    </Section>
  );
}

export default NotFound;
