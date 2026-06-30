import Countdown from "../components/Countdown";
import { EucalyptusSpring } from "../components/decor/EucalyptusSpring";
import { RoseBloom } from "../components/decor/RoseBloom";
import PhotoFrame from "../components/PhotoFrame";
import Container from "../components/ui/Container";
import Section from "../components/ui/Section";
import Eyebrow from "../components/ui/Eyebrow";
import { ButtonLink } from "../components/ui/Button";
import { wedding } from "../config/wedding";
import { formatLongDate } from "../lib/date";

function Home() {
  return (
    <>
      <Section className="relative overflow-hidden bg-gradient-to-b from-sage/10 via-linen to-linen text-center">
        <div className="pointer-events-none absolute -top-2 -left-2 h-32 w-32 text-sage/70 sm:h-44 sm:w-44">
          <EucalyptusSpring className="h-full w-full" />
        </div>
        <div className="pointer-events-none absolute -top-2 -right-2 h-32 w-32 -scale-x-100 text-sage/70 sm:h-44 sm:w-44">
          <EucalyptusSpring className="h-full w-full" />
        </div>
        <div className="pointer-events-none absolute -bottom-2 -left-2 h-20 w-20 text-clay/80 sm:h-28 sm:w-28">
          <RoseBloom className="h-full w-full" />
        </div>
        <div className="pointer-events-none absolute -bottom-2 -right-2 h-20 w-20 -scale-x-100 text-clay/80 sm:h-28 sm:w-28">
          <RoseBloom className="h-full w-full" />
        </div>

        <Container className="relative flex flex-col items-center gap-8">
          <Eyebrow>We're getting married</Eyebrow>

          <h1 className="font-script text-6xl text-walnut sm:text-7xl">
            {wedding.coupleNames}
          </h1>

          <p className="font-body text-base text-walnut/70 sm:text-lg">
            {formatLongDate(wedding.date)} &middot; {wedding.location.venue},{" "}
            {wedding.location.city}
          </p>

          <PhotoFrame />

          <ButtonLink to="/rsvp">RSVP</ButtonLink>
        </Container>
      </Section>

      <Section className="border-t border-walnut/10 text-center">
        <Container className="flex flex-col items-center gap-4">
          <Eyebrow>Counting down</Eyebrow>
          <Countdown target={wedding.date} size="sm" />
        </Container>
      </Section>
    </>
  );
}

export default Home;
