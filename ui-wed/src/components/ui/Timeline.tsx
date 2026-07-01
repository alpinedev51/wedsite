export interface TimelineItem {
  date?: string;
  title: string;
  description?: string;
}

function Timeline({
  items,
  className = "",
}: {
  items: TimelineItem[];
  className?: string;
}) {
  return (
    <ol className={`border-l border-walnut/20 pl-8 ${className}`}>
      {items.map((item, i) => (
        <li key={i} className="relative mb-10 last:mb-0">
          <span className="absolute top-1.5 -left-[41px] h-4 w-4 rounded-full border-2 border-linen bg-ochre" />
          {item.date && (
            <p className="font-utility text-xs uppercase tracking-widest text-walnut/60">
              {item.date}
            </p>
          )}
          <h3 className="mt-1 font-display text-xl text-walnut">
            {item.title}
          </h3>
          {item.description && (
            <p className="mt-2 font-body text-ink/70">{item.description}</p>
          )}
        </li>
      ))}
    </ol>
  );
}

export default Timeline;
