import Container from "../components/ui/Container";
import Section from "../components/ui/Section";
import Eyebrow from "../components/ui/Eyebrow";
import PageHeading from "../components/ui/PageHeading";
import PersonCard from "../components/ui/PersonCard";
import { Floral } from "../components/decor/Floral";
import { weddingParty } from "../config/weddingParty";

// Same edge sprays as Our Story: wide screens only, where there's room
// beside the cards.
const edge =
  "absolute top-1/2 hidden h-[min(28rem,90%)] -translate-y-1/2 text-sage/40 xl:block";

// The spray on each portrait faces outward from the pair, and stays on its
// side even when only one of the two is set.
const spraySide = { maidOfHonor: "left", bestMan: "right" } as const;

function WeddingParty() {
  return (
    <Section className="relative overflow-x-clip text-center">
      <Floral name="side-design-04" flipX className={`left-0 ${edge}`} />
      <Floral name="side-design-04" className={`right-0 ${edge}`} />

      <Container className="relative flex flex-col items-center gap-14">
        <div className="flex flex-col items-center gap-3">
          <Eyebrow>Wedding Party</Eyebrow>
          <PageHeading>The People Standing With Us</PageHeading>
          <Floral
            name="divider-02"
            className="mt-2 w-56 text-sage2/60 sm:w-72"
          />
          <p className="max-w-lg font-body text-lg text-ink/75">
            The friends and family who have shaped who we are, and who
            we&rsquo;re grateful to have beside us on the big day.
          </p>
        </div>

        {/* Only the people whose names are set (config/weddingParty.ts). */}
        {weddingParty.length > 0 && (
          <div className="flex flex-wrap justify-center gap-x-24 gap-y-16 sm:gap-x-32">
            {weddingParty.map((person) => (
              <PersonCard
                key={person.id}
                name={person.name}
                role={person.role}
                photoSrc={person.photoSrc}
                spray={spraySide[person.id]}
                className="w-52"
              />
            ))}
          </div>
        )}

        {/* A single bloom to close the page, as on Our Story. */}
        <Floral name="element-33" className="h-24 text-olive/55 sm:h-28" />
      </Container>
    </Section>
  );
}

export default WeddingParty;
