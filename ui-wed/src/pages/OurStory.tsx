import Container from "../components/ui/Container";
import Section from "../components/ui/Section";
import Eyebrow from "../components/ui/Eyebrow";
import PageHeading from "../components/ui/PageHeading";
import Timeline from "../components/ui/Timeline";
import { milestones } from "../config/wedding";

function OurStory() {
  return (
    <Section className="text-center">
      <Container className="flex flex-col items-center gap-10">
        <div className="flex flex-col items-center gap-3">
          <Eyebrow>Our Story</Eyebrow>
          <PageHeading>How It All Began</PageHeading>
        </div>

        <Timeline items={milestones} className="text-left" />
      </Container>
    </Section>
  );
}

export default OurStory;
