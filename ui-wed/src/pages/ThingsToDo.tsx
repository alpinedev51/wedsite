import Container from "../components/ui/Container";
import Section from "../components/ui/Section";
import Eyebrow from "../components/ui/Eyebrow";
import InfoCard from "../components/ui/InfoCard";

const activities = [
  {
    title: "Durango–Silverton Railroad",
    description: "It's a real coal-fired steam train, and it climbs through the San Juans up to Silverton, an old mining town sitting at 9,318 feet up. Round trip takes most of a day, but it gets you into country you otherwise can't reach by car. You can even use it as a mode of transportation to get dropped off for a backpacking trip into the Chicago Basin. Tip: Trains sell out in summer, so book ahead if you're set on going.",
  },
  {
    title: "Hiking",
    description: "There's a trail for whatever mood you're in with wildflowers in July and gold aspens by September. Hogsback is an easy one right from downtown with good valley views if you want something quick. Engineer Mountain and the Ice Lake Trail are great popular ones for real alpine scenery, but they'll make you work for it. A stretch of the Colorado Trail also runs through here if you want to go further than a day hike.",
  },
  {
    title: "The San Juan Mountains",
    description: "We're right on the edge of one of the wildest ranges in the state: more designated wilderness than almost anywhere else in Colorado, between the Weminuche (the biggest in the state), South San Juan, Mount Sneffels, and Lizard Head areas. Fourteen of Colorado's fourteeners are back in there, including Mt. Sneffels (14,155 ft) and Uncompahgre Peak (14,316 ft). If you'd rather see it without leaving the car, the San Juan Skyway loops through most of it.",
  },
  {
    title: "Fly Fishing",
    description: "The Animas runs Gold Medal water right through downtown, with wild rainbow, brown, and native Colorado River cutthroat in it. The Piedra and Dolores are favorites too, and the San Juan River tailwater below Navajo Dam, about 90 minutes south, is where people go for the technical, catch-and-release fishing and the bigger rainbows. There are guides in town if you'd rather have one, but you can always just talk to locals and grab a rod and go.",
  },
  {
    title: "Beach Days",
    description: "When it's hot, people head up to Vallecito, Haviland Lake, or Lemon Reservoir instead of the river. All three have sandy spots for swimming, paddleboards, boats you can rent, and the San Juans right there in the background.",
  },
  {
    title: "Whitewater Rafting",
    description: "The Animas runs straight through downtown, from easy scenic floats to the whitewater through Smelter Rapid, so it's an easy way to cool off and see the valley from the water. There are outfitters in town if you want a guided trip, kid-friendly ones included. Ask us or the family about rafting if interested and we can help you figure something out.",
  },
  {
    title: "Downtown Durango",
    description: "Main Street's got the breweries, shops, galleries, and restaurants. Good for wandering, a coffee, or a pint, no real plan needed. The old Train Depot has a small museum if you want the history behind the railroad while you're down there.",
  },
  {
    title: "Mesa Verde National Park",
    description: "About an hour southwest, and one of the best-preserved cliff dwelling sites in the country. The ranger-led tours let you actually climb down into the dwellings, which is worth doing at least once. Give it a half day at minimum, and book tickets ahead if you're going during peak season — they do sell out.",
  },
  {
    title: "Hot Springs",
    description: "Trimble is just north of town and the easy option if you want to soak after a day out. Pinkerton and Rainbow, up along the Piedra, take more of a drive and a bit of a walk to reach, but they're more natural and worth it if you're up for it.",
  },
  {
    title: "Rock Climbing",
    description: "It's dry and sunny enough here that people climb pretty much year-round. Turtle Lake and the East Animas are the local crags, with everything from easy sport routes to harder trad and bouldering. If you need gear or don't know the routes, there are local guide services who can set you up.",
  },
  {
    title: "Mountain Biking",
    description: "This town takes mountain biking seriously. The sport's world championships trace back here, and it shows in how many people ride. Horse Gulch and Test Tracks are minutes from downtown and good for a normal ride. Purgatory runs lift access in summer if you want the bigger downhill runs without the climb.",
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
