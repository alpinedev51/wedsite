import Container from "../components/ui/Container";
import Section from "../components/ui/Section";
import Eyebrow from "../components/ui/Eyebrow";
import PageHeading from "../components/ui/PageHeading";

function ComingSoon({ title }: { title: string }) {
  return (
    <Section className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <Container className="flex flex-col items-center gap-4">
        <Eyebrow>Coming soon</Eyebrow>
        <PageHeading>{title}</PageHeading>
      </Container>
    </Section>
  );
}

export default ComingSoon;
