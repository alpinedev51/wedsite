import Countdown from "../components/Countdown";
import ScrollHero from "../components/home/ScrollHero";
import HeroTagline from "../components/home/HeroTagline";
import WeddingInfoHub from "../components/home/WeddingInfoHub";
import { Monogram } from "../components/decor/Monogram";
import Eyebrow from "../components/ui/Eyebrow";
import { ButtonLink } from "../components/ui/Button";
import { useWeddingConfig } from "../config/WeddingConfigContext";
import { ceremonyTime, formatLongDate } from "../lib/date";
// 2400px-wide re-encodes (~330-400 KB) of the camera originals, which were
// 2-5 MB each -- far too heavy for an above-the-fold image on a phone. The
// originals aren't kept in the repo; re-encode from the source photos if a
// different size is ever needed.
import heroOneImg from "../assets/std_hero_1_web.jpg";
import heroTwoImg from "../assets/std_hero_2_web.jpg";

function Home() {
  const { wedding } = useWeddingConfig();
  const time = ceremonyTime(wedding.date);

  return (
    <>
      <ScrollHero
        src={heroTwoImg}
        alt={wedding.coupleNames}
        priority
        overlay={<HeroTagline />}
        // Puts the tagline on the grass in the bottom part of the photo.
        // Raise the number to move it lower, lower it to move it up.
        overlayTopPct={80}
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
          {/* text-ink/75 (5.5:1), not text-walnut/75 (3.4:1) -- this is
              16-18px body copy and needs to clear AA for normal text. */}
          <p className="font-body text-base text-ink/75 sm:text-lg">
            {formatLongDate(wedding.date)} &middot; {wedding.location.venue},{" "}
            {wedding.location.city}
          </p>
          {/* Hidden until a real ceremony time is set -- see ceremonyTime. */}
          {time && (
            <p className="font-body text-base text-ink/75 sm:text-lg">
              Ceremony at {time}
            </p>
          )}
          <ButtonLink to="/rsvp" className="mt-1">
            RSVP
          </ButtonLink>

          {/* The countdown is the most affecting thing on the page; it was
              rendered at the small size while the lg variant went unused.
              The heading goes through Countdown so it disappears with the
              digits once the wedding has passed. */}
          <Countdown
            target={wedding.date}
            size="lg"
            heading={<Eyebrow className="text-lg mt-0">Counting down</Eyebrow>}
          />
          <div className="flex justify-center pt-6 pb-2 sm:pt-10 sm:pb-4">
            <Monogram className="h-28 w-28 text-walnut/70 sm:h-36 sm:w-36 lg:h-44 lg:w-44" />
          </div>
        </div>
      </div>
      <WeddingInfoHub />

      <ScrollHero src={heroOneImg} alt={wedding.coupleNames} />
    </>
  );
}

export default Home;
