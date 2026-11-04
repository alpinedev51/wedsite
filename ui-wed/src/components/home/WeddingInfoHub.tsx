import Container from "../ui/Container";
import Section from "../ui/Section";
import Eyebrow from "../ui/Eyebrow";
import InfoCard from "../ui/InfoCard";
import { Floral, type FloralName } from "../decor/Floral";
import { useWeddingConfig } from "../../config/useWeddingConfig";
import { ceremonyTime, formatLongDate, formatShortDate } from "../../lib/date";

function WeddingInfoHub() {
  const { wedding, rsvpOpen } = useWeddingConfig();
  const time = ceremonyTime(wedding.date);

  const cards: {
    title: string;
    description: string;
    to?: string;
    accent: string;
    flower: FloralName;
    flowerColor: string;
  }[] = [
    {
      title: "Date & Venue",
      // The time is left out while the stored date still sits at midnight.
      description: `${formatLongDate(wedding.date)} at ${
        time ? `${time}, ` : ""
      }${wedding.location.venue}, ${wedding.location.city}.`,
      accent: "before:bg-sage bg-sage/8!",
      flower: "element-21",
      flowerColor: "text-sage/30",
    },
    {
      title: "Travel",
      description: "Hotel and directions info -- more details coming soon.",
      to: "/travel",
      accent: "before:bg-olive bg-olive/8!",
      flower: "element-11",
      flowerColor: "text-olive/25",
    },
    {
      title: "Registry",
      description: "Our honeymoon fund and gift registry.",
      to: "/registry",
      accent: "before:bg-lightblue bg-lightblue/8!",
      flower: "element-08",
      flowerColor: "text-lightblue/45",
    },
    {
      title: "RSVP",
      description:
        !rsvpOpen && wedding.rsvpOpensAt
          ? `RSVPs open ${formatShortDate(wedding.rsvpOpensAt)}.`
          : `Please respond by ${formatShortDate(wedding.rsvpDeadline)}.`,
      to: "/rsvp",
      accent: "before:bg-dusty bg-dusty/8!",
      flower: "element-25",
      flowerColor: "text-dusty/35",
    },
  ];

  return (
    <Section
      // z-10: makes this section its own layer, so the green band behind the
      // heading (-z-10) sits under the flowers and text but above the section
      // background. A plain `isolate` would do that too, but z-10 also lifts
      // the whole section above the hero photo that follows, so the frosted
      // fade hanging off the bottom still blends over the photo.
      // overflow-x-clip: the band is full-screen width.
      className="relative z-10 overflow-x-clip pt-16! text-center sm:pt-20!"
      style={{
        backgroundImage:
          "linear-gradient(to bottom, var(--color-linen) 0%, var(--color-linen) 82%, var(--color-ochre-wash) 100%)",
      }}
    >
      <div
        aria-hidden="true"
        className="hub-frost-fade-bottom pointer-events-none absolute inset-x-0 -bottom-[12dvh] z-10 h-[12dvh] bg-ochre-wash backdrop-blur-[3px]"
      />

      {/* Flower sprays in the top corners, and a sprig rising from each
          bottom corner. Kept small on phones so they frame the heading
          rather than sit behind it. */}
      <Floral
        name="arrangement-10"
        flipY
        className="absolute top-0 left-0 w-24 text-olive/60 sm:w-60 lg:w-72"
      />
      <Floral
        name="arrangement-10"
        flipX
        flipY
        className="absolute top-0 right-0 w-24 text-olive/60 sm:w-60 lg:w-72"
      />
      <Floral
        name="element-43"
        className="absolute left-2  rotate-14 bottom-0 h-24 text-slate/60 sm:h-36"
      />
      <Floral
        name="element-43"
        flipX
        className="absolute right-2 -rotate-14 bottom-0 h-24 text-slate/60 sm:h-36"
      />

      <Container className="relative flex flex-col items-center gap-10">
        <div className="flex flex-col items-center gap-3">
          <div className="relative flex flex-col items-center gap-3">
            {/* A soft green band across the page, centred on the two heading
                lines. It's positioned from the heading itself rather than
                from the section's height, so it stays centred on the text at
                every screen size, and fades out before reaching the
                monogram above. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-1/2 -z-10 h-56 w-screen -translate-x-1/2 -translate-y-1/2 bg-linear-to-b from-transparent via-sage-wash to-transparent sm:h-64"
            />
            <Eyebrow>At A Glance</Eyebrow>
            <h2 className="text-3xl sm:text-4xl">Quick Version</h2>
          </div>
          <Floral name="divider-05" className="w-48 text-clay/80 sm:w-60" />
        </div>

        <div className="grid w-full grid-cols-1 gap-6 text-left sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <InfoCard
              key={card.title}
              title={card.title}
              description={card.description}
              to={card.to}
              decor={
                <Floral
                  name={card.flower}
                  className={`absolute -right-5 -bottom-7 w-24 ${card.flowerColor}`}
                />
              }
              className={`relative overflow-hidden before:absolute before:inset-x-0 before:top-0 before:h-1.5 before:content-[''] ${card.accent}`}
            />
          ))}
        </div>
      </Container>
    </Section>
  );
}

export default WeddingInfoHub;
