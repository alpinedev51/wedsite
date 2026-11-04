import Container from "../components/ui/Container";
import Section from "../components/ui/Section";
import Eyebrow from "../components/ui/Eyebrow";
import PageHeading from "../components/ui/PageHeading";
import MiniCalendar from "../components/ui/MiniCalendar";
import UsMap from "../components/travel/UsMap";
import { useWeddingConfig } from "../config/WeddingConfigContext";
import { Floral } from "../components/decor/Floral";
import { formatLongDate, getWeddingDateParts } from "../lib/date";

function Travel() {
  const { wedding } = useWeddingConfig();

  // Resolved in the venue's timezone, not the viewer's. Calling
  // wedding.date.getDate() here would circle the wrong square for any guest
  // browsing from west of the venue -- see lib/date.ts.
  // Null only for an unparseable date, in which case the calendar is skipped.
  const parts = getWeddingDateParts(wedding.date);

  return (
    <Section className="text-center">
      <Container className="flex flex-col items-center gap-10">
        <div className="flex flex-col items-center gap-3">
          <Eyebrow>Travel</Eyebrow>
          <PageHeading>Getting To {wedding.location.city}</PageHeading>
          <p className="max-w-md font-body text-lg text-ink/75">
            The wedding will be held at{" "}
            <strong className="font-semibold text-walnut">
              {wedding.location.venue}
            </strong>{" "}
            in{" "}
            <strong className="font-semibold text-walnut">
              {wedding.location.city}
            </strong>{" "}
            on{" "}
            <strong className="font-semibold text-walnut">
              {formatLongDate(wedding.date)}
            </strong>
            .
          </p>
          <p className="max-w-md font-body text-ink/65 italic">
            More details on hotels and directions coming soon.
          </p>
        </div>

        {parts && (
          <MiniCalendar
            year={parts.year}
            month={parts.month}
            highlightDay={parts.day}
            highlightLabel={formatLongDate(wedding.date)}
          />
        )}

        <Floral
          name="divider-04"
          className="mt-2 w-56 text-ochre-deep/65 sm:w-72"
        />


        {/* Skipped until venue coordinates are set (admin Wedding tab, or
            VITE_VENUE_LATITUDE/LONGITUDE as the build-time fallback). */}
        {wedding.location.coordinates && (
          <UsMap
            label={wedding.location.city}
            coordinates={wedding.location.coordinates}
            className="max-w-2xl"
          />
        )}
      </Container>
    </Section>
  );
}

export default Travel;
