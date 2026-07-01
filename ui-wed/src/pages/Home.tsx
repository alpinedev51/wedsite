import Countdown from "../components/Countdown";
import { EucalyptusSprig } from "../components/decor/EucalyptusSprig";
import { ColumbineSprig } from "../components/decor/ColumbineSprig";
import { MountainRidge } from "../components/decor/MountainRidge";
import PhotoFrame from "../components/PhotoFrame";
import Container from "../components/ui/Container";
import Section from "../components/ui/Section";
import Eyebrow from "../components/ui/Eyebrow";
import { ButtonLink } from "../components/ui/Button";
import { wedding } from "../config/wedding";
import { formatLongDate } from "../lib/date";
import coupleImg from "../assets/couple.jpg";
import { RoseBloom } from "../components/decor/RoseBloom";

function Home() {
  return (
    <>
      <Section className="relative overflow-hidden bg-gradient-to-b from-ochre/10 via-linen to-sage/15 text-center">
        <div className="pointer-events-none absolute -top-2 -left-2 w-64 h-40 text-sage/70 sm:w-60 sm:h-40">
          <EucalyptusSprig className="h-full w-full" />
        </div>
        <div className="pointer-events-none absolute -top-2 -right-2 w-64 h-40 -scale-x-100 text-sage/70 sm:w-60 sm:h-40">
          <EucalyptusSprig className="h-full w-full" />
        </div>
        <div className="pointer-events-none absolute -bottom-2 -left-2 h-20 w-20 text-slate sm:h-28 sm:w-28">
          <RoseBloom className="h-full w-full" />
        </div>
        <div className="pointer-events-none absolute -bottom-2 -right-2 h-20 w-20 -scale-x-100 text-slate sm:h-28 sm:w-28">
          <ColumbineSprig className="h-full w-full" />
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 sm:h-24">
          <MountainRidge className="h-full w-full" />
        </div>

        <Container className="relative flex flex-col items-center gap-4">
          <Eyebrow>We're getting married</Eyebrow>

          <h1 className="font-script text-6xl text-walnut sm:text-7xl">
            {wedding.coupleNames}
          </h1>

          <p className="font-body text-base text-walnut/70 sm:text-lg">
            {formatLongDate(wedding.date)} &middot; {wedding.location.venue},{" "}
            {wedding.location.city}
          </p>
        </Container>

        <div className="relative my-10 sm:my-14">
          <PhotoFrame src={coupleImg} alt="Austin & Kylie" />
        </div>

        <Container className="relative flex flex-col items-center gap-8">
          <ButtonLink to="/rsvp">RSVP</ButtonLink>
          <Eyebrow>Counting down</Eyebrow>
          <Countdown target={wedding.date} size="sm" />
        </Container>
      </Section>
    </>
  );
}

export default Home;
