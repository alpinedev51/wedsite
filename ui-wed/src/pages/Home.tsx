import Countdown from "../components/Countdown";
import ScrollHero from "../components/home/ScrollHero";
import HeroTagline from "../components/home/HeroTagline";
import WeddingInfoHub from "../components/home/WeddingInfoHub";
import { Monogram } from "../components/decor/Monogram";
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
        overlay={<HeroTagline />}
        maskFadeTopPct={10}
        maskFadeBottomPct={6}
      />
      <div className="relative flex flex-col items-center gap-3 sm:px-12 sm:pt-8">
        <div
          aria-hidden="true"
          className="hub-frost-fade-top pointer-events-none absolute inset-x-0 -top-[6dvh] z-10 h-[6dvh] bg-linen backdrop-blur-[3px]"
        />
        <div className="relative z-20 flex flex-col items-center gap-3">
          <Eyebrow className="text-xl">Celebrate with us</Eyebrow>
          <p className="font-body text-base text-walnut/75 sm:text-lg">
            {formatLongDate(wedding.date)} &middot; {wedding.location.venue},{" "}
            {wedding.location.city}
          </p>
          <ButtonLink to="/rsvp" className="mt-1">
            RSVP
          </ButtonLink>

          <Eyebrow className="text-lg mt-0">Counting down</Eyebrow>
          <Countdown target={wedding.date} size="sm" />
          <div className="flex justify-center pt-6 pb-2 sm:pt-10 sm:pb-4">
            <Monogram className="h-28 w-28 text-walnut/70 sm:h-36 sm:w-36 lg:h-44 lg:w-44" />
          </div>
        </div>
      </div>
      <WeddingInfoHub />

      <ScrollHero src={coupleImg} alt={wedding.coupleNames} />
    </>
  );
}

export default Home;
