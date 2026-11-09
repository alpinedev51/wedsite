import { useRef, type ReactNode } from "react";
import { m, useReducedMotion, useScroll, useTransform } from "motion/react";

export interface TimelineItem {
  date?: string;
  title: string;
  description?: string;
}

// Where the middle of an entry is on screen: 0 = at the bottom edge,
// 1 = at the top edge. Measured from the entry's middle (not its top) so a
// tall entry stays sharp while you're still reading its lower lines.
//
// Sharp anywhere from 18% to 88% of the way up the screen -- most of it --
// and fading only in the strips along the top and bottom edges. The top
// strip is a bit narrower to account for the sticky nav covering part of it.
const progress = [0, 0.18, 0.88, 1];
const opacityAt = [0.15, 1, 1, 0.15];
const blurAt = ["blur(3px)", "blur(0px)", "blur(0px)", "blur(3px)"];
const scaleAt = [0.97, 1, 1, 0.97];
// With reduced motion: a gentler fade only -- no blur, no size change.
const reducedOpacityAt = [0.45, 1, 1, 0.45];

// origin-left: when a focused entry changes size it grows out from the
// timeline rather than from its own middle, so the dot stays on the line.
const entryClass = "relative mb-10 origin-left last:mb-0";

function EntryContent({ item }: { item: TimelineItem }) {
  return (
    <>
      <span className="absolute top-1.5 -left-[41px] h-4 w-4 rounded-full border-2 border-linen bg-ochre" />
      {item.date && (
        <p className="font-utility text-xs uppercase tracking-widest text-walnut/60">
          {item.date}
        </p>
      )}
      <h3 className="mt-1 font-display text-xl text-walnut">{item.title}</h3>
      {item.description && (
        <p className="mt-2 font-body text-ink/70">{item.description}</p>
      )}
    </>
  );
}

// An entry that comes into focus as it nears the middle of the screen. Its
// own component so the scroll tracking only exists when the effect is on.
function FocusEntry({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLLIElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["center end", "center start"],
  });
  const opacity = useTransform(
    scrollYProgress,
    progress,
    reduce ? reducedOpacityAt : opacityAt,
  );
  const filter = useTransform(scrollYProgress, progress, blurAt);
  const scale = useTransform(scrollYProgress, progress, scaleAt);

  // Scroll-linked values aren't covered by MotionConfig's reducedMotion, so
  // the blur and size change are dropped here by hand.
  const style = reduce ? { opacity } : { opacity, filter, scale };

  return (
    <m.li ref={ref} className={entryClass} style={style}>
      {children}
    </m.li>
  );
}

function Timeline({
  items,
  focusOnScroll = false,
  className = "",
}: {
  items: TimelineItem[];
  /** Bring each entry into focus as it nears the middle of the screen, and
   * let it fade and blur again as it scrolls on past. */
  focusOnScroll?: boolean;
  className?: string;
}) {
  return (
    <ol className={`border-l border-walnut/20 pl-8 ${className}`}>
      {items.map((item, i) =>
        focusOnScroll ? (
          <FocusEntry key={i}>
            <EntryContent item={item} />
          </FocusEntry>
        ) : (
          <li key={i} className={entryClass}>
            <EntryContent item={item} />
          </li>
        ),
      )}
    </ol>
  );
}

export default Timeline;
