import Container from "../components/ui/Container";
import Section from "../components/ui/Section";
import Eyebrow from "../components/ui/Eyebrow";
import PersonCard from "../components/ui/PersonCard";

// One object per person. `photoSrc` is optional — leave it out (like
// below) and PersonCard shows a soft placeholder circle with the
// person's first initial instead of a broken image. Once you have real
// photos, import them the same way `coupleImg` is imported in
// Home.tsx and add a `photoSrc: theirImg` field to that person's entry.
const weddingParty = [
  { name: "Jane Doe", role: "Maid of Honor" },
  { name: "John Smith", role: "Best Man" },
];

function WeddingParty() {
  return (
    <Section className="text-center">
      <Container className="flex flex-col items-center gap-10">
        <div className="flex flex-col items-center gap-3">
          <Eyebrow>Wedding Party</Eyebrow>
          <h1 className="text-4xl">The People Standing With Us</h1>
        </div>

        {/*
          A CSS grid: 2 columns on small screens, 3 on larger ones
          (`sm:grid-cols-3`). We map over `weddingParty` and render one
          PersonCard per person.

          `key={person.name}` — React requires a unique `key` on every
          item in a list so it can tell items apart when the array
          changes. We use the name since it's unique here.

          `{...person}` "spreads" the object's fields out as individual
          props — shorthand for writing
          `name={person.name} role={person.role}` by hand.
        */}
        <div className="grid w-full grid-cols-2 gap-8 sm:grid-cols-3">
          {weddingParty.map((person) => (
            <PersonCard key={person.name} {...person} />
          ))}
        </div>
      </Container>
    </Section>
  );
}

export default WeddingParty;
