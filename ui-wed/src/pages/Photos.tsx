import Container from "../components/ui/Container";
import Section from "../components/ui/Section";
import Eyebrow from "../components/ui/Eyebrow";
import PageHeading from "../components/ui/PageHeading";
import Gallery from "../components/ui/Gallery";
import { photoSections } from "../config/photos";
import { Reveal } from "../components/motion/Reveal";

// The photo list (sections, order, alt text) lives in src/config/photos.ts.
// To add photos, see src/assets/photos/README.md.

const sectionId = (title: string) =>
  `photos-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

function Photos() {
  return (
    <Section className="text-center">
      <Container className="flex flex-col items-center gap-10">
        <div className="flex flex-col items-center gap-3">
          <Eyebrow>Photos</Eyebrow>
          <PageHeading>A Few Of Our Favorites</PageHeading>
        </div>

        {/*
          Each Gallery renders a thumbnail grid and manages its own "which
          photo is open" state -- clicking a thumbnail opens the full-screen
          Lightbox, which pages through that section's photos.
        */}
        {photoSections.map((section, sectionIndex) => (
          <section
            key={section.title}
            aria-labelledby={sectionId(section.title)}
            className="flex w-full flex-col items-center gap-6 pt-4"
          >
            <Reveal>
              <h2
                id={sectionId(section.title)}
                className="text-2xl sm:text-3xl"
              >
                {section.title}
              </h2>
            </Reveal>
            <Gallery
              images={section.images}
              reveal
              // The first row of the first section is on screen when the
              // page opens.
              eagerFirstRow={sectionIndex === 0}
              className="w-full"
            />
          </section>
        ))}
      </Container>
    </Section>
  );
}

export default Photos;
