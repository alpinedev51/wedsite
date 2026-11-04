import type { ReactNode } from "react";
import Container from "../components/ui/Container";
import Section from "../components/ui/Section";
import Eyebrow from "../components/ui/Eyebrow";
import PageHeading from "../components/ui/PageHeading";
import { Floral, type FloralName } from "../components/decor/Floral";
import { registry } from "../config/registry";

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
      className={`relative flex h-full flex-col items-center gap-4 overflow-hidden rounded-3xl border border-walnut/12 px-8 pt-10 pb-8 text-center shadow-sm transition-all before:absolute before:inset-x-0 before:top-0 before:h-1.5 before:content-[''] ${accent} ${
        href
          ? "group-hover:-translate-y-1 group-hover:border-walnut/25 group-hover:shadow-md"
          : ""
      }`}
    >
      <Floral
        name={flower}
        className={`absolute -right-6 -bottom-8 w-32 ${flowerColor}`}
      />
      <div className={`relative h-14 w-14 ${iconColor}`}>{icon}</div>
      <p className="relative font-utility text-xs uppercase tracking-label text-olive">
        {eyebrow}
      </p>
      <h2 className="relative text-2xl sm:text-3xl">{title}</h2>
      <p className="relative max-w-xs font-body text-ink/75">{description}</p>
      <span className="relative mt-auto pt-2">
        {href ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-walnut px-6 py-2.5 font-utility text-sm uppercase tracking-wider text-linen transition-colors group-hover:bg-clay">
            {cta}
            <svg
              viewBox="0 0 16 16"
              className="h-3.5 w-3.5"
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

function Registry() {
  return (
    <Section className="relative overflow-x-clip text-center">
      <Container className="relative flex flex-col items-center gap-10">
        <div className="flex flex-col items-center gap-3">
          <Eyebrow>Registry</Eyebrow>
          <PageHeading>Gifts &amp; Well Wishes</PageHeading>
          <Floral name="divider-05" className="w-48 text-clay/80 sm:w-60" />
          <p className="max-w-lg font-body text-lg text-ink/75">
            Having you celebrate with us is the greatest gift. If you'd like to
            give something more, we've put together a honeymoon fund and a small
            gift registry.
          </p>
        </div>

        <div className="grid w-full max-w-3xl grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8">
          <RegistryCard
            eyebrow="Via The Knot"
            title="Honeymoon Fund"
            description="Help us make memories on our first adventure as a married couple."
            cta="Contribute"
            href={registry.knotUrl}
            icon={icons.fund}
            accent="bg-sage/8 before:bg-sage"
            iconColor="text-sage2"
            flower="element-21"
            flowerColor="text-sage/30"
          />
          <RegistryCard
            eyebrow="Via Etsy"
            title="Gift Registry"
            description="A few things we've picked out for our home together."
            cta="View registry"
            href={registry.etsyUrl}
            icon={icons.gift}
            accent="bg-lightblue/8 before:bg-lightblue"
            iconColor="text-slate"
            flower="element-08"
            flowerColor="text-lightblue/45"
          />
        </div>

        <p className="max-w-md font-body text-sm text-ink/60 italic">
          Both links open in a new tab.
        </p>
      </Container>
    </Section>
  );
}

export default Registry;
