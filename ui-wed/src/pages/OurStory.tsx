import Container from "../components/ui/Container";
import Section from "../components/ui/Section";
import Eyebrow from "../components/ui/Eyebrow";
import PageHeading from "../components/ui/PageHeading";
import Timeline from "../components/ui/Timeline";
import { Floral } from "../components/decor/Floral";
import { milestones } from "../config/wedding";
import { Reveal } from "../components/motion/Reveal";
import { STAGGER } from "../lib/motion";

// Same sprays as beside "Celebrate with us" on the home page, centred
// top-to-bottom on the page. Capped at 90% of the section's height so a short
// story doesn't push them into the nav or footer. Wide screens only, where
// there's room beside the timeline.
const edge =
  "absolute top-1/2 hidden h-[min(28rem,90%)] -translate-y-1/2 text-tan/45 xl:block";

function OurStory() {
  return (
    <Section className="relative text-center">
      <Floral name="side-design-04" flipX className={`left-0 ${edge}`} />
      <Floral name="side-design-04" className={`right-0 ${edge}`} />

      <Container className="relative flex flex-col items-center gap-10">
        <div className="flex flex-col items-center gap-3">
          <Reveal>
            <Eyebrow>Our Story</Eyebrow>
          </Reveal>
          <Reveal delay={STAGGER}>
            <PageHeading>How It All Began</PageHeading>
          </Reveal>
          <Reveal delay={STAGGER * 2} y={0}>
            <Floral
              name="divider-04"
              className="mt-2 w-56 text-ochre-deep/65 sm:w-72"
            />
          </Reveal>
        </div>

        <Timeline items={milestones} focusOnScroll className="text-left" />

        {/* A single bloom to close the story. (The entries above already
            fade with the scroll, so they get no entrance of their own.) */}
        <Reveal y={0}>
          <Floral name="element-33" className="h-24 text-olive/55 sm:h-28" />
        </Reveal>
      </Container>
    </Section>
  );
}

export default OurStory;
