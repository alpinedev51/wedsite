import Container from "../components/ui/Container";
import Section from "../components/ui/Section";
import Eyebrow from "../components/ui/Eyebrow";
import Gallery from "../components/ui/Gallery";
import coupleImg from "../assets/couple.jpg";

// Gallery just needs an array of { src, alt } objects. `src` has to be
// an *imported* image, not a plain string path — see the comment in
// Home.tsx for why (Vite needs the import to bundle the file and turn
// it into a real URL). To add more photos: drop the file in
// src/assets/, import it at the top the same way `coupleImg` is
// imported above, then add a new { src: ..., alt: ... } entry below.
const photos = [{ src: coupleImg, alt: "Austin & Kylie" }];

function Photos() {
  return (
    <Section className="text-center">
      <Container className="flex flex-col items-center gap-10">
        <div className="flex flex-col items-center gap-3">
          <Eyebrow>Photos</Eyebrow>
          <h1 className="text-4xl">A Few Of Our Favorites</h1>
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
