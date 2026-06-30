import Countdown from "../components/Countdown";
import { EucalyptusSpring } from "../components/decor/EucalyptusSpring";
import Container from "../components/ui/Container";
import Section from "../components/ui/Section";
import Eyebrow from "../components/ui/Eyebrow";
import { ButtonLink } from "../components/ui/Button";
import heroImg from "../assets/hero.png";
import { wedding } from "../config/wedding";
import { formatLongDate } from "../lib/date";

function Home() {
  return (
    <Section className="relative flex min-h-[80vh] flex-col items-center justify-center overflow-hidden text-center">
      <img
        src={heroImg}
        alt=""
        className="absolute inset-0 -z-10 h-full w-full object-cover opacity-20"
      />

      <Container className="flex flex-col items-center gap-8">
        <EucalyptusSpring className="h-16 w-40 text-sage" />

        <div className="flex flex-col items-center gap-4">
          <Eyebrow>We're getting married</Eyebrow>
          <h1 className="font-script text-6xl text-walnut sm:text-7xl">
            {wedding.coupleNames}
          </h1>
          <p className="font-body text-base text-slate sm:text-lg">
            {formatLongDate(wedding.date)} &middot; {wedding.location.venue},{" "}
            {wedding.location.city}
          </p>
        </div>

        <Countdown target={wedding.date} />

        <ButtonLink to="/rsvp">RSVP</ButtonLink>

        <EucalyptusSpring className="h-16 w-40 text-sage" mirrored />
      </Container>
    </Section>
  );
}

export default Home;
