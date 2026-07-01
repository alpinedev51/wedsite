import Container from "../components/ui/Container";
import Section from "../components/ui/Section";
import Eyebrow from "../components/ui/Eyebrow";
import Timeline from "../components/ui/Timeline";

// This array is the data that drives the Timeline below. It's just a
// plain list of JS objects — edit the text here (or add/remove entries)
// and the page updates automatically. No other code needs to change.
const storyMilestones = [
  {
    date: "Fall 2021",
    title: "How We Met",
    description: "Across the hall we started out as strangers.",
  },
  {
    date: "Fall 2024",
    title: "Moving In Together",
    description: "Returning from Seattle waiting on Austin to graduate, we move in together.",
  },
  {
    date: "Spring 2026",
    title: "The Proposal",
    description: "The stars aligned, the Little Colorado was blue.",
  },
];

function OurStory() {
  return (
    <Section className="text-center">
      <Container className="flex flex-col items-center gap-10">
        <div className="flex flex-col items-center gap-3">
          <Eyebrow>Our Story</Eyebrow>
          <h1 className="text-4xl">How It All Began</h1>
        </div>

        {/*
          Timeline lives at src/components/ui/Timeline.tsx. It takes one
          prop, `items`, which we're passing the `storyMilestones` array
          above. Inside Timeline, it loops over that array with
          `.map()` and renders one row per entry — that's how a single
          component can display any number of milestones without us
          writing repetitive JSX by hand for each one.

          `className="text-left"` overrides the `text-center` set on
          the <Section> above, just for this component, since a
          timeline reads better left-aligned along its vertical line.
        */}
        <Timeline items={storyMilestones} className="text-left" />
      </Container>
    </Section>
  );
}

export default OurStory;
