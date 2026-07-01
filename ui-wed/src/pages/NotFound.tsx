import Container from "../components/ui/Container";
import Section from "../components/ui/Section";
import Eyebrow from "../components/ui/Eyebrow";
import { ButtonLink } from "../components/ui/Button";

function NotFound() {
  return (
    <Section className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <Container className="flex flex-col items-center gap-4">
        <Eyebrow>404</Eyebrow>
        <h1 className="text-4xl">Page Not Found</h1>
        <ButtonLink to="/" variant="secondary">
          Back Home
        </ButtonLink>
      </Container>
    </Section>
  );
}

export default NotFound;
