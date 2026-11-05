# Decor

Line art used as decoration around the site.

- `flowers/`: floral SVGs drawn with `<Floral name="..." />`
  (`src/components/decor/Floral.tsx`). They're used as masks, so each one
  takes the current text colour (`className="text-sage2/60"`) and any size.
  To add one, drop the SVG in `flowers/`, then import it and list it in
  `Floral.tsx` with its width / height ratio (from the SVG's `viewBox`).
- `monogram.svg`: optional custom monogram for the header and footer
  (`src/components/decor/SiteMonogram.tsx`). Delete it and the site draws a
  monogram from the couple's initials instead.
