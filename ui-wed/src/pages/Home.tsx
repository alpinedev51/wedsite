import Countdown from "../components/Countdown";
import ScrollHero from "../components/home/ScrollHero";
import HeroTagline from "../components/home/HeroTagline";
import WeddingInfoHub from "../components/home/WeddingInfoHub";
import { SiteMonogram } from "../components/decor/SiteMonogram";
import { Floral } from "../components/decor/Floral";
import Eyebrow from "../components/ui/Eyebrow";
import { ButtonLink } from "../components/ui/Button";
import { useWeddingConfig } from "../config/useWeddingConfig";
import { ceremonyTime, formatLongDate } from "../lib/date";
import { STAGGER } from "../lib/motion";
import { Reveal } from "../components/motion/Reveal";
import FeaturePhoto from "../components/home/FeaturePhoto";
import { getPhoto } from "../config/photos";
// 2400px-wide re-encodes (~330-400 KB) of the camera originals, which were
// 2-5 MB each -- far too heavy for an above-the-fold image on a phone. The
// originals aren't kept in the repo; re-encode from the source photos if a
// different size is ever needed.
import heroOneImg from "../assets/hero/std_hero_1_web.jpg";
import heroTwoImg from "../assets/hero/std_hero_2_web.jpg";
// Blurred previews, made by scripts/hash-images.py -- re-run it if a photo
// is replaced. Only the lower photo uses one (see the top hero below).
import heroHashes from "../assets/hero/thumbhashes.json";

// Any slug from the sections in config/photos.ts; its alt text comes from
// there.
const featurePhoto = getPhoto("dsc04153");

function Home() {
  const { wedding } = useWeddingConfig();
  const time = ceremonyTime(wedding.date);

  return (
    <>
      <ScrollHero
        src={heroTwoImg}
        alt={wedding.coupleNames}
        priority
        effect="intro"
        // No blurred preview here, on purpose: this photo fades in on every
        // visit, so a preview would show on every load -- even when the
        // photo is cached -- and read as the page struggling. It fades in
        // from the page background instead.
        overlay={<HeroTagline />}
        overlayTopPct={80}
        maskFadeTopPct={10}
        maskFadeBottomPct={14}
      />
      <div className="relative flex flex-col items-center gap-3 sm:px-12 sm:pt-8">
        <div
          aria-hidden="true"
          className="hub-frost-fade-top pointer-events-none absolute inset-x-0 -top-[10dvh] z-10 h-[10dvh] bg-linen backdrop-blur-md"
        />
        <Floral
          name="side-design-04"
          flipX
          className="absolute top-6 left-0 hidden h-[30rem] text-tan/45 lg:block xl:h-[34rem]"
        />
        <Floral
          name="side-design-04"
          className="absolute top-6 right-0 hidden h-[30rem] text-tan/45 lg:block xl:h-[34rem]"
        />
        <div className="relative z-20 flex flex-col items-center gap-3">
          {/* Each line has its own Reveal (not one around the group) so the
              lines arrive one after another. */}
          <Reveal>
            <Eyebrow className="text-xl">Celebrate with us</Eyebrow>
          </Reveal>
          {/* text-ink/75 (5.5:1), not text-walnut/75 (3.4:1) -- this is
              16-18px body copy and needs to clear AA for normal text. */}
          <Reveal delay={STAGGER}>
            <p className="font-body text-base text-ink/75 sm:text-lg">
              {formatLongDate(wedding.date)} &middot; {wedding.location.venue},{" "}
              {wedding.location.city}
            </p>
          </Reveal>
          {time && (
            <Reveal delay={STAGGER * 2}>
              <p className="font-body text-base text-ink/75 sm:text-lg">
                Ceremony at {time}
              </p>
            </Reveal>
          )}
          <Reveal delay={STAGGER * 3} className="mt-1">
            <ButtonLink to="/rsvp">RSVP</ButtonLink>
          </Reveal>
          <Reveal delay={STAGGER * 4} y={0}>
            <Floral
              name="divider-02"
              className="mt-6 w-60 text-ochre-deep/65 sm:w-80"
            />
          </Reveal>

          <Reveal className="flex flex-col items-center gap-3">
            <Countdown
              target={wedding.date}
              size="lg"
              heading={
                <Eyebrow className="text-lg mt-0">Counting down</Eyebrow>
              }
            />
          </Reveal>

          <Reveal className="flex justify-center pt-10 sm:pt-14">
            <SiteMonogram className="h-28 w-28 text-walnut/70 sm:h-36 sm:w-36 lg:h-44 lg:w-44" />
          </Reveal>

          <div className="mt-8 w-full px-6 pb-20 sm:mt-10 sm:px-0 sm:pb-24 lg:pb-28">
            {/* Subject sits left of centre in the landscape original. */}
            <FeaturePhoto
              image={featurePhoto}
              objectPosition="45% center"
              className="max-w-xs sm:max-w-sm lg:max-w-md"
            />
          </div>
        </div>
      </div>
      <WeddingInfoHub />

      <ScrollHero
        src={heroOneImg}
        alt={wedding.coupleNames}
        effect="parallax"
        thumbhash={heroHashes["std_hero_1_web.jpg"]}
      />
    </>
  );
}

export default Home;
