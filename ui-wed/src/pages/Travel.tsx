import Container from "../components/ui/Container";
import Section from "../components/ui/Section";
import Eyebrow from "../components/ui/Eyebrow";
import MiniCalendar from "../components/ui/MiniCalendar";
import { wedding } from "../config/wedding";

function Travel() {
  return (
    <Section className="text-center">
      <Container className="flex flex-col items-center gap-10">
        <div className="flex flex-col items-center gap-3">
          <Eyebrow>Travel</Eyebrow>
          <h1 className="text-4xl">Getting To {wedding.location.city}</h1>
          <p className="max-w-md font-body text-ink/70">
            The wedding will be held at {wedding.location.venue} in{" "}
            {wedding.location.city}. More details on hotels and directions
            coming soon.
          </p>
        </div>

        {/*
          MiniCalendar (src/components/ui/MiniCalendar.tsx) needs a
          year, a month, and the day to circle. JavaScript's Date object
          numbers months 0–11 (0 = January), which is why we call
          `.getMonth()` rather than typing the number by hand.

          All three values are read directly off `wedding.date` — the
          single Date object defined in src/config/wedding.ts — instead
          of being hardcoded here. That means if the wedding date ever
          changes, you only update it in that one file, and every page
          that uses it (Home's countdown, this calendar, etc.) stays in
          sync automatically.
        */}
        <MiniCalendar
          year={wedding.date.getFullYear()}
          month={wedding.date.getMonth()}
          highlightDay={wedding.date.getDate()}
        />
      </Container>
    </Section>
  );
}

export default Travel;
