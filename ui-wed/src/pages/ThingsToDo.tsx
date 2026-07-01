import Container from "../components/ui/Container";
import Section from "../components/ui/Section";
import Eyebrow from "../components/ui/Eyebrow";
import InfoCard from "../components/ui/InfoCard";

const activities = [
  {
    title: "Durango–Silverton Railroad",
    description: "A scenic steam train ride through the San Juan Mountains.",
  },
  {
    title: "Hiking San Juan National Forest",
    description:
      "Trails for every skill level, with fall colors in September.",
  },
  {
    title: "Downtown Durango",
    description: "Breweries, shops, and restaurants along Main Avenue.",
  },
  {
    title: "Mesa Verde National Park",
    description: "Ancient cliff dwellings, about an hour from Durango.",
  },
];

function ThingsToDo() {
  return (
    <Section className="text-center">
      <Container className="flex flex-col items-center gap-10">
        <div className="flex flex-col items-center gap-3">
          <Eyebrow>Things To Do</Eyebrow>
          <h1 className="text-4xl">Make A Trip Of It</h1>
        </div>

        {/*
          InfoCard (src/components/ui/InfoCard.tsx) also accepts an
          optional `icon` and `href` prop — pass `href` if you want a
          card to link out to a website, e.g. href="https://durangotrain.com".
          We're only using `title` and `description` here, same
          map + spread pattern as the other pages in this app.
        */}
        <div className="grid w-full grid-cols-1 gap-6 text-left sm:grid-cols-2">
          {activities.map((activity) => (
            <InfoCard key={activity.title} {...activity} />
          ))}
        </div>
      </Container>
    </Section>
  );
}

export default ThingsToDo;
