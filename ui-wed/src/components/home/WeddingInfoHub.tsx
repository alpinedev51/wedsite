import Container from "../ui/Container";
import Section from "../ui/Section";
import Eyebrow from "../ui/Eyebrow";
import InfoCard from "../ui/InfoCard";
import { EucalyptusSprig } from "../decor/EucalyptusSprig";
import { ColumbineSprig } from "../decor/ColumbineSprig";
import { RoseBloom } from "../decor/RoseBloom";
import { wedding } from "../../config/wedding";
import { formatLongDate, formatShortDate } from "../../lib/date";

// Each card gets its own palette accent (top hairline + faint tint) so the
// grid reads as a set of distinct destinations rather than four identical
// boxes. `!` (important) is needed on the background override since
// InfoCard already ships a hardcoded bg-linen/60 at equal specificity.
const cards: {
  title: string;
  description: string;
  to?: string;
  accent: string;
}[] = [
    {
      title: "Date & Venue",
      description: `${formatLongDate(wedding.date)} at ${wedding.location.venue}, ${wedding.location.city}.`,
      accent: "before:bg-sage bg-sage/8!",
    },
    {
      title: "Travel",
      description: "Hotel and directions info -- more details coming soon.",
      to: "/travel",
      accent: "before:bg-olive bg-olive/8!",
    },
    {
      title: "Registry",
      description: "Registry coming soon.",
      to: "/registry",
      accent: "before:bg-lightblue bg-lightblue/8!",
    },
    {
      title: "RSVP",
      description: `Please respond by ${formatShortDate(wedding.rsvpDeadline)}.`,
      to: "/rsvp",
      accent: "before:bg-dusty bg-dusty/8!",
    },
  ];

// The top/bottom bands frost into the adjacent hero photos (negative margin
// bleeds them over the tail end of each ScrollHero) so this section reads as
// a soft glass panel floating between the two photos, instead of a
// hard-edged block dropped on top of them. Each band is masked (see
// .hub-frost-fade-top/-bottom in index.css) so the blur itself fades in/out
// instead of snapping on at the band's edge, and sized to 12dvh -- the same
// percentage ScrollHero's own maskFadePct uses against its h-dvh height --
// so the band lines up with the hero's own edge-fade instead of the two
// creating two visibly different transitions back to back. z-10 is required
// on the bottom band since the second hero comes later in the DOM and would
// otherwise paint over it.
//
// The section's own wash holds flat at sage-wash/ochre-wash for its first
// and last ~18% (rather than immediately drifting toward linen) so it isn't
// still visibly changing color right where the frost bands end -- otherwise
// even a perfectly color-matched band hands off into a gradient that keeps
// moving right after it, which reads as a seam just as much as a color
// mismatch does. The bands use those same tokens as their solid endpoint (as
// opposed to an approximate blend like greenlinen) so the two are pixel-
// identical at the handoff, not just close.
function WeddingInfoHub() {
  return (
    <Section
      className="relative text-center"
      style={{
        backgroundImage:
          "linear-gradient(to bottom, var(--color-sage-wash) 0%, var(--color-sage-wash) 18%, var(--color-linen) 50%, var(--color-linen) 82%, var(--color-ochre-wash) 100%)",
      }}
    >
      <div
        aria-hidden="true"
        className="hub-frost-fade-top pointer-events-none absolute inset-x-0 -top-[12dvh] z-10 h-[12dvh] bg-sage-wash backdrop-blur-[3px]"
      />
      <div
        aria-hidden="true"
        className="hub-frost-fade-bottom pointer-events-none absolute inset-x-0 -bottom-[12dvh] z-10 h-[12dvh] bg-ochre-wash backdrop-blur-[3px]"
      />

      <div className="pointer-events-none absolute -top-2 -left-2 h-40 w-64 text-sage/70 sm:h-40 sm:w-60">
        <EucalyptusSprig className="h-full w-full" />
      </div>
      <div className="pointer-events-none absolute -top-2 -right-2 h-40 w-64 -scale-x-100 text-sage/70 sm:h-40 sm:w-60">
        <EucalyptusSprig className="h-full w-full" />
      </div>
      <div className="pointer-events-none absolute -bottom-2 -left-2 h-20 w-20 text-slate sm:h-28 sm:w-28">
        <RoseBloom className="h-full w-full" />
      </div>
      <div className="pointer-events-none absolute -right-2 -bottom-2 h-20 w-20 -scale-x-100 text-slate sm:h-28 sm:w-28">
        <ColumbineSprig className="h-full w-full" />
      </div>

      <Container className="relative flex flex-col items-center gap-10">
        <div className="flex flex-col items-center gap-3">
          <Eyebrow>At A Glance</Eyebrow>
          <h2 className="text-3xl sm:text-4xl">The Quick Version</h2>
          <div className="h-px w-16 bg-gradient-to-r from-transparent via-ochre to-transparent" />
        </div>

        <div className="grid w-full grid-cols-1 gap-6 text-left sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <InfoCard
              key={card.title}
              title={card.title}
              description={card.description}
              to={card.to}
              className={`relative overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-1.5 before:content-[''] ${card.accent}`}
            />
          ))}
        </div>
      </Container>
    </Section>
  );
}

export default WeddingInfoHub;
