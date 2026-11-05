import { lazy, Suspense, useEffect } from "react";
import Container from "../components/ui/Container";
import Section from "../components/ui/Section";
import Eyebrow from "../components/ui/Eyebrow";
import PageHeading from "../components/ui/PageHeading";
import MiniCalendar from "../components/ui/MiniCalendar";
import QuietErrorBoundary from "../components/ui/QuietErrorBoundary";
import { useWeddingConfig } from "../config/useWeddingConfig";
import { Floral } from "../components/decor/Floral";
import { formatLongDate, getWeddingDateParts } from "../lib/date";

// Lazy so the map outline (~15KB) only downloads on this page. The rest of
// the page renders straight away and the map fills in once it arrives.
const loadUsMap = () => import("../components/travel/UsMap");
const UsMap = lazy(loadUsMap);

function Travel() {
  const { wedding } = useWeddingConfig();

  // Start downloading the map now, alongside the wedding config fetch,
  // rather than only once that answers. (The browser fetches it just once.)
  // A failure here is handled where the map renders, so it's ignored.
  useEffect(() => {
    loadUsMap().catch(() => {});
  }, []);

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
          <p className="max-w-md font-body text-xl text-ink/65 italic">
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

        {/* Only when there are venue coordinates (see
            WeddingConfigProvider for where they come from). If the map's
            code fails to download, the map is left out rather than the
            whole page showing an error. */}
        {wedding.location.coordinates && (
          <QuietErrorBoundary>
            <Suspense fallback={null}>
              <UsMap
                label={wedding.location.city}
                coordinates={wedding.location.coordinates}
                className="max-w-2xl"
              />
            </Suspense>
          </QuietErrorBoundary>
        )}
      </Container>
    </Section>
  );
}

export default Travel;
