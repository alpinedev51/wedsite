import Countdown from "../components/Countdown";
import ScrollHero from "../components/home/ScrollHero";
import HeroTagline from "../components/home/HeroTagline";
import WeddingInfoHub from "../components/home/WeddingInfoHub";
import Eyebrow from "../components/ui/Eyebrow";
import { ButtonLink } from "../components/ui/Button";
import { wedding } from "../config/wedding";
import { formatLongDate } from "../lib/date";
import coupleImg from "../assets/couple.jpg";
import doorsImg from "../assets/ak_doors.jpg";

function Home() {
  return (
    <>
      <ScrollHero
        src={doorsImg}
        alt={wedding.coupleNames}
        priority
        overlayAlign="bottom"
        overlay={<HeroTagline />}
      />
      <div className="flex flex-col items-center gap-3 sm:px-12 sm:py-8">
        <Eyebrow>Celebrate with us</Eyebrow>
        <p className="font-body text-base text-walnut/70 sm:text-lg">
          {formatLongDate(wedding.date)} &middot; {wedding.location.venue}
          , {wedding.location.city}
        </p>
        <ButtonLink to="/rsvp" className="mt-1">
          RSVP
        </ButtonLink>
        <Eyebrow className="mt-1">Counting down</Eyebrow>
        <Countdown target={wedding.date} size="sm" />
      </div>


      <WeddingInfoHub />

      <ScrollHero src={coupleImg} alt={wedding.coupleNames} />
    </>
  );
}

export default Home;
