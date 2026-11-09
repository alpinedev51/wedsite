import type { ReactNode } from "react";
import Container from "../components/ui/Container";
import Section from "../components/ui/Section";
import Eyebrow from "../components/ui/Eyebrow";
import PageHeading from "../components/ui/PageHeading";
import { Floral, type FloralName } from "../components/decor/Floral";
import { registry } from "../config/registry";
import { Reveal } from "../components/motion/Reveal";
import { STAGGER } from "../lib/motion";
import { useGridColumns } from "../hooks/useMediaQuery";

// Simple line icons, drawn in the card's accent colour.
const icons = {
  // Mountains under a sun: the honeymoon.
  fund: (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="33" cy="14" r="5" />
      <path d="M4 40 L17 20 L25 31 L30 25 L44 40 Z" />
      <path d="M14 24.5 L17 20 L20 24.5" />
    </svg>
  ),
  // A wrapped gift with a bow.
  gift: (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="7" y="18" width="34" height="8" rx="1.5" />
      <path d="M10 26 V41 H38 V26" />
      <path d="M24 18 V41" />
      <path d="M24 18 C 20 10 12 10 14 15 C 15 18 24 18 24 18 Z" />
      <path d="M24 18 C 28 10 36 10 34 15 C 33 18 24 18 24 18 Z" />
    </svg>
  ),
};

interface RegistryCardProps {
  eyebrow: string;
  title: string;
  description: string;
  cta: string;
  href: string;
  icon: ReactNode;
  accent: string;
  iconColor: string;
  flower: FloralName;
  flowerColor: string;
}

function RegistryCard({
  eyebrow,
  title,
  description,
  cta,
  href,
  icon,
  accent,
  iconColor,
  flower,
  flowerColor,
}: RegistryCardProps) {
  const body = (
    <div
      className={`relative flex h-full flex-col items-center gap-4 overflow-hidden rounded-3xl border border-walnut/12 px-8 pt-10 pb-8 text-center shadow-sm transition-all duration-300 ease-out before:absolute before:inset-x-0 before:top-0 before:h-1.5 before:transition-[height] before:duration-300 before:content-[''] ${accent} ${
        href
          ? "group-hover:-translate-y-1 group-hover:border-walnut/25 group-hover:shadow-md group-hover:before:h-2.5 group-focus-visible:-translate-y-1 group-focus-visible:shadow-md group-focus-visible:before:h-2.5 group-active:translate-y-0 group-active:scale-[0.99] group-active:shadow-sm"
          : ""
      }`}
    >
      <Floral
        name={flower}
        className={`absolute -right-6 -bottom-8 w-32 transition-transform duration-500 ease-out group-hover:scale-110 group-hover:rotate-12 group-focus-visible:scale-110 group-focus-visible:rotate-12 ${flowerColor}`}
      />
      <div className={`relative h-14 w-14 ${iconColor}`}>{icon}</div>
      <p className="relative font-utility text-xs uppercase tracking-label text-olive">
        {eyebrow}
      </p>
      <h2 className="relative text-2xl sm:text-3xl">{title}</h2>
      <p className="relative max-w-xs font-body text-ink/75">{description}</p>
      <span className="relative mt-auto pt-2">
        {href ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-walnut px-6 py-2.5 font-utility text-sm uppercase tracking-wider text-linen transition-colors duration-300 group-hover:bg-clay group-focus-visible:bg-clay">
            {cta}
            <svg
              viewBox="0 0 16 16"
              className="h-3.5 w-3.5 transition-transform duration-300 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-focus-visible:translate-x-0.5 group-focus-visible:-translate-y-0.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M5 11 L11 5 M6 5 H11 V10" />
            </svg>
          </span>
        ) : (
          <span className="font-utility text-sm uppercase tracking-wider text-walnut/70">
            Link coming soon
          </span>
        )}
      </span>
    </div>
  );

  if (!href) return body;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="group block h-full rounded-3xl"
    >
      {body}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

const cards: RegistryCardProps[] = [
  {
    eyebrow: "Via The Knot",
    title: "Honeymoon Fund",
    description:
      "Help us make memories on our first adventure as a married couple.",
    cta: "Contribute",
    href: registry.knotUrl,
    icon: icons.fund,
    accent: "bg-sage/8 before:bg-sage",
    iconColor: "text-sage2",
    flower: "element-21",
    flowerColor: "text-sage/30",
  },
  {
    eyebrow: "Via Etsy",
    title: "Gift Registry",
    description: "A few things we've picked out for our home together.",
    cta: "View registry",
    href: registry.etsyUrl,
    icon: icons.gift,
    accent: "bg-lightblue/8 before:bg-lightblue",
    iconColor: "text-slate",
    flower: "element-08",
    flowerColor: "text-lightblue/45",
  },
];

function Registry() {
  // Cards side by side arrive one after the other; stacked on a phone, each
  // simply rises as it scrolls into view.
  const columns = useGridColumns({ base: 1, sm: 2 });

  return (
    <Section className="relative overflow-x-clip text-center">
      <Container className="relative flex flex-col items-center gap-10">
        <div className="flex flex-col items-center gap-3">
          <Reveal>
            <Eyebrow>Registry</Eyebrow>
          </Reveal>
          <Reveal delay={STAGGER}>
            <PageHeading>Gifts &amp; Well Wishes</PageHeading>
          </Reveal>
          <Reveal delay={STAGGER * 2} y={0}>
            <Floral name="divider-05" className="w-48 text-clay/80 sm:w-60" />
          </Reveal>
          <Reveal delay={STAGGER * 3}>
            <p className="max-w-lg font-body text-lg text-ink/75">
              Having you celebrate with us is the greatest gift. If you'd like
              to give something more, we've put together a honeymoon fund and a
              small gift registry.
            </p>
          </Reveal>
        </div>

        <div className="grid w-full max-w-3xl grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8">
          {cards.map((card, index) => (
            <Reveal
              key={card.title}
              // After the header has started, then left to right.
              delay={STAGGER * 4 + (index % columns) * STAGGER * 2}
              className="h-full"
            >
              <RegistryCard {...card} />
            </Reveal>
          ))}
        </div>

        {(registry.knotUrl || registry.etsyUrl) && (
          <Reveal delay={STAGGER * 6} y={0}>
            <p className="max-w-md font-body text-sm text-ink/60 italic">
              {registry.knotUrl && registry.etsyUrl
                ? "Both links open in a new tab."
                : "The link opens in a new tab."}
            </p>
          </Reveal>
        )}
      </Container>
    </Section>
  );
}

export default Registry;
