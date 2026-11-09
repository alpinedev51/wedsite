import Container from "../components/ui/Container";
import Section from "../components/ui/Section";
import Eyebrow from "../components/ui/Eyebrow";
import PageHeading from "../components/ui/PageHeading";
import PersonCard, { type Spray } from "../components/ui/PersonCard";
import { Floral } from "../components/decor/Floral";
import { weddingParty, type PartyMember } from "../config/weddingParty";
import { Reveal } from "../components/motion/Reveal";
import { STAGGER } from "../lib/motion";

// Same edge sprays as Our Story: wide screens only, where there's room
// beside the cards.
const edge =
  "absolute top-1/2 hidden h-[min(28rem,90%)] -translate-y-1/2 text-tan/40 xl:block";

// Each portrait's floral spray: the maid of honor's on the left, the best
// man's on the right (each stays on its side when only one name is set).
// Artwork, size, position, rotation and colour are all set per spray here.
// To keep the pair symmetrical, change both together.
const sprays: Record<PartyMember["id"], Spray> = {
  maidOfHonor: {
    name: "element-40",
    className:
      "-bottom-3 -left-8 h-30 origin-bottom -rotate-16 text-denim/60 sm:-left-11 sm:h-30 sm:bottom-1",
  },
  // The maid of honor's spray mirrored: same values, right side, flipped.
  bestMan: {
    name: "element-40",
    flipX: true,
    className:
      "-bottom-3 -right-8 h-30 origin-bottom rotate-16 text-sage2/75 sm:-right-11 sm:h-30 sm:bottom-1",
  },
};

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
            className="mt-2 w-56 text-sage2/75 sm:w-72"
          />
          <p className="max-w-lg font-body text-lg text-ink/75">
            The friends and family who have shaped who we are, and who
            we&rsquo;re grateful to have beside us on the big day.
          </p>
        </div>

        {/* Only the people whose names are set (config/weddingParty.ts). */}
        {weddingParty.length > 0 && (
          <div className="flex flex-wrap justify-center gap-x-24 gap-y-16 sm:gap-x-32">
            {weddingParty.map((person, i) => (
              <Reveal key={person.id} delay={i * STAGGER * 2} y={16}>
                <PersonCard
                  name={person.name}
                  role={person.role}
                  photoSrc={person.photoSrc}
                  spray={sprays[person.id]}
                  className="w-52"
                />
              </Reveal>
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
