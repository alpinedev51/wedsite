import Container from "../components/ui/Container";
import Section from "../components/ui/Section";
import Eyebrow from "../components/ui/Eyebrow";
import PageHeading from "../components/ui/PageHeading";
import MiniCalendar from "../components/ui/MiniCalendar";
import { useWeddingConfig } from "../config/WeddingConfigContext";
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
          <p className="max-w-md font-body text-ink/75">
            The wedding will be held at {wedding.location.venue} in{" "}
            {wedding.location.city} on {formatLongDate(wedding.date)}. More
            details on hotels and directions coming soon.
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
      </Container>
    </Section>
  );
}

export default Travel;
