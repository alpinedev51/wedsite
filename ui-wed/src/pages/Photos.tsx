import Container from "../components/ui/Container";
import Section from "../components/ui/Section";
import Eyebrow from "../components/ui/Eyebrow";
import PageHeading from "../components/ui/PageHeading";
import Gallery from "../components/ui/Gallery";
// 2400px web copies (~400-700 KB) of 6960px Lightroom exports (~6 MB each).
import walkawayImg from "../assets/gatech_walkaway_web.jpg";
import doorsImg from "../assets/ak_doors_web.jpg";

// Gallery just needs an array of { src, alt } objects. `src` has to be
// an *imported* image, not a plain string path — see the comment in
// Home.tsx for why (Vite needs the import to bundle the file and turn
// it into a real URL). To add more photos: drop the file in
// src/assets/, import it at the top the same way as the ones above,
// then add a new { src: ..., alt: ... } entry below.
const photos = [
  { src: walkawayImg, alt: "Austin & Kylie" },
  {
    src: doorsImg,
    alt: "Austin & Kylie in graduation gowns in front of wooden doors",
  },
];

function Photos() {
  return (
    <Section className="text-center">
      <Container className="flex flex-col items-center gap-10">
        <div className="flex flex-col items-center gap-3">
          <Eyebrow>Photos</Eyebrow>
          <PageHeading>A Few Of Our Favorites</PageHeading>
        </div>

        {/*
          Gallery renders the thumbnail grid and manages its own "which
          photo is open" state internally (look at the useState call in
          Gallery.tsx if you're curious) — clicking a thumbnail opens
          the full-screen Lightbox automatically. We don't wire any of
          that up here, we just hand it the photo list as a prop.
        */}
        <Gallery images={photos} className="w-full" />
      </Container>
    </Section>
  );
}

export default Photos;
