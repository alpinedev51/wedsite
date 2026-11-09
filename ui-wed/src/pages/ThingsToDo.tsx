import { useState } from "react";
import Container from "../components/ui/Container";
import Section from "../components/ui/Section";
import Eyebrow from "../components/ui/Eyebrow";
import PageHeading from "../components/ui/PageHeading";
import ActivityCard from "../components/ui/ActivityCard";
import ActivityModal from "../components/ui/ActivityModal";
import type { ActivityLink } from "../components/ui/ActivityModal";
import type { GalleryImage } from "../components/ui/Gallery";
import { Reveal } from "../components/motion/Reveal";
import { STAGGER } from "../lib/motion";
import { useGridColumns } from "../hooks/useMediaQuery";
// Photos by slug; see src/assets/things-to-do/README.md to add one.
import { thingPhoto } from "../config/thingsToDoPhotos";

interface Activity {
  title: string;
  summary: string;
  details: string;
  links?: ActivityLink[];
  photos?: GalleryImage[];
}

const activities: Activity[] = [
  {
    title: "Durango–Silverton Railroad",
    summary:
      "A coal-fired steam train that climbs through the San Juans to a 9,318-foot mining town.",
    details:
      "It's a real coal-fired steam train, and it climbs through the San Juans up to Silverton, an old mining town sitting at 9,318 feet up. Round trip takes most of a day, but it gets you into country you otherwise can't reach by car. You can even use it as a mode of transportation to get dropped off for a backpacking trip into the Chicago Basin. Tip: Trains sell out in summer, so book ahead if you're set on going.",
    photos: [
      thingPhoto("dgo-train", "The Durango–Silverton steam train"),
      thingPhoto("dgo-train-fall", "The train climbing through fall colors"),
    ],
  },
  {
    title: "Hiking",
    summary:
      "Trails for every mood, from an easy valley overlook to real alpine scenery.",
    details:
      "There's a trail for whatever mood you're in with wildflowers in July and gold aspens by September. Hogsback is a quick and steep one right from downtown with good valley views. Engineer Mountain and the Ice Lake Trail are great popular ones for real alpine scenery and more of a half day adventure.",
    photos: [
      thingPhoto("engineersummit", "The summit of Engineer Mountain"),
      thingPhoto("icelakes", "Ice Lake Trail"),
      thingPhoto("chicagobasin", "Chicago Basin, reachable by train drop-off"),
    ],
  },
  {
    title: "The San Juan Mountains",
    summary:
      "One of the wildest ranges in the state, with 14 fourteeners and vast wilderness.",
    details:
      "We're right on the edge of one of the wildest ranges in the state: more designated wilderness than almost anywhere else in Colorado, between the Weminuche (the biggest in the state), South San Juan, Mount Sneffels, and Lizard Head areas. Fourteen of Colorado's fourteeners are back in there, including Mt. Sneffels (14,155 ft) and Uncompahgre Peak (14,316 ft). If you'd rather see it without leaving the car, the San Juan Skyway, which features the Million Dollar highway, loops through it.",
    photos: [
      thingPhoto("sanjuans-wide", "The San Juan Mountains"),
      thingPhoto("sanjuanspretty", "The San Juan Mountains"),
    ],
  },
  {
    title: "Fly Fishing",
    summary:
      "September in Colorado is a great time for fly fishing and this area features some of the best waters in the state.",
    details:
      "The Animas runs Gold Medal water right through downtown, with wild rainbow, brown, and native Colorado River cutthroat in it. The Piedra and Dolores are favorites too, and the San Juan River tailwater below Navajo Dam, about 90 minutes south, is where people go for technical catch-and-release fishing and the bigger rainbows. There are guides in town if you'd rather have one, but you can always just talk to locals and grab a rod and go.",
    photos: [
      thingPhoto("flyfish-animas", "Fly fishing the Animas"),
      thingPhoto("flyfish-dolores", "Fly fishing the Dolores River"),
      thingPhoto("browntrout", "A brown trout catch"),
    ],
  },
  {
    title: "Beach Days",
    summary:
      "Sandy lake shores with swimming, paddleboards, and the San Juans in the background.",
    details:
      "When it's hot, people head up to Vallecito, Haviland Lake, or Lemon Reservoir instead of the river. All three have sandy spots for swimming, paddleboards, boats you can rent, and the San Juans right there in the background.",
    photos: [thingPhoto("lakenighthorse", "Lake Nighthorse")],
  },
  {
    title: "Whitewater Rafting",
    summary:
      "The Animas runs straight through downtown, from easy floats to real whitewater.",
    details:
      "The Animas runs straight through downtown, from easy scenic floats to the whitewater through Smelter Rapid, so it's an easy way to cool off and see the valley from the water. There are outfitters in town if you want a guided trip, kid-friendly ones included. Tip: Ask us or the family about rafting if interested and we can help you figure something out.",
    photos: [thingPhoto("animas-rafting", "Rafting the Animas River")],
  },
  {
    title: "Downtown Durango",
    summary:
      "Main Street breweries, shops, and restaurants, good for wandering with no real plan.",
    details:
      "Main Street's got the breweries, shops, galleries, and restaurants. Good for wandering, a coffee, or a pint, no real plan needed. The old Train Depot has a small museum if you want the history behind the railroad while you're down there.",
    photos: [thingPhoto("dgo-downtown", "Downtown Durango's Main Street")],
  },
  {
    title: "Mesa Verde National Park",
    summary:
      "One of the country's best-preserved cliff dwelling sites, about an hour southwest.",
    details:
      "About an hour southwest, and one of the best-preserved cliff dwelling sites in the country. The ranger-led tours let you actually climb down into the dwellings, which is worth doing at least once. Tip: Give it a half day at minimum, and book tickets ahead if you're going during peak season as they do sell out.",
    photos: [
      thingPhoto("mesaverde-dwellings", "Mesa Verde National Park."),
      thingPhoto("mesaverde-closeup", "Mesa Verde dwellings."),
      thingPhoto("dweellingmesaverde", "Ground view of Mesa Verde dwellings."),
    ],
  },
  {
    title: "Hot Springs",
    summary:
      "Natural soaks ranging from an easy stop in town to a hike-in reward up the Piedra.",
    details:
      "Trimble is just north of town and the easy option if you want to soak after a day out. Pinkerton and Rainbow, up along the Piedra, take more of a drive and a bit of a walk to reach, but they're more natural and worth it if you're up for it.",
    photos: [thingPhoto("hotsprings", "Hot Springs Resort")],
  },
  {
    title: "Rock Climbing",
    summary:
      "Dry, sunny crags close to town that are climbable pretty much year-round.",
    details:
      "It's dry and sunny enough here that people climb pretty much year-round. Turtle Lake and the East Animas are the local crags, with everything from easy sport routes to harder trad and bouldering. If you need gear or don't know the routes, just ask around at the wedding. Odds are someone can get you out there.",
    photos: [
      thingPhoto("east-animas-climb", "Climbing at the East Animas crags"),
      thingPhoto("rockclimbdgo", "Rock climbing near Durango"),
      thingPhoto("boulderturtlelake", "Bouldering at Turtle Lake"),
    ],
  },
  {
    title: "Mountain Biking",
    summary:
      "Home of the sport's world championships, with trails minutes from downtown.",
    details:
      "This town takes biking seriously, including mountain biking. Mountain biking's world championships trace back here, and it shows in how many people ride. Horse Gulch and Test Tracks are minutes from downtown and good for a normal ride. Purgatory runs lift access in summer if you want the bigger downhill runs without the climb.",
    photos: [
      thingPhoto("purg-mtb", "Mountain biking at Purgatory"),
      thingPhoto("horsegulch", "Horse Gulch trails"),
      thingPhoto("twinbuttesmtb", "Mountain biking at Twin Buttes"),
    ],
  },
];

function ThingsToDo() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const openActivity = openIndex !== null ? activities[openIndex] : null;
  // Columns as drawn right now (matching the grid classes below), so the
  // first row and the left-to-right ripple follow the real layout.
  const columns = useGridColumns({ base: 1, sm: 2, lg: 3 });

  return (
    <Section className="text-center">
      <Container className="flex flex-col items-center gap-10">
        <div className="flex flex-col items-center gap-3">
          <Eyebrow>Things To Do</Eyebrow>
          <PageHeading>Make A Trip Of It</PageHeading>
        </div>

        {/* Three columns at lg -- twelve cards in two columns made six very
            tall rows on a wide screen. */}
        <div className="grid w-full grid-cols-1 gap-6 text-left sm:grid-cols-2 lg:grid-cols-3">
          {activities.map((activity, index) => (
            // Staggered by column, so each row ripples in left to right
            // (on a phone, one column, each card simply fades in).
            <Reveal
              key={activity.title}
              delay={(index % columns) * STAGGER}
              y={16}
              className="h-full"
            >
              <ActivityCard
                title={activity.title}
                summary={activity.summary}
                photo={activity.photos?.[0]}
                // The first row is on screen when the page opens.
                eager={index < columns}
                onOpen={() => setOpenIndex(index)}
              />
            </Reveal>
          ))}
        </div>
      </Container>

      {openActivity && (
        <ActivityModal
          title={openActivity.title}
          details={openActivity.details}
          links={openActivity.links}
          photos={openActivity.photos}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </Section>
  );
}

export default ThingsToDo;
