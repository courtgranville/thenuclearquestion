import { motion, useInView } from "framer-motion";
import { useRef } from "react";

interface NarrativeExpansionProps {
  source: string;
  /** If true, the first chunk (before any ## heading) renders as
   *  the lead block without a heading. Otherwise it's ignored.
   *  Default false. */
  leadIsImplicit?: boolean;
}

interface ParsedSection {
  heading: string | null;
  paragraphs: string[];
}

function parseSource(source: string, leadIsImplicit: boolean): ParsedSection[] {
  const chunks = source.split(/^## /m);
  const sections: ParsedSection[] = [];

  const lead = chunks.shift() ?? "";
  if (leadIsImplicit && lead.trim().length > 0) {
    sections.push({
      heading: null,
      paragraphs: lead.trim().split(/\n\n+/).map((p) => p.trim()).filter(Boolean),
    });
  }

  for (const chunk of chunks) {
    const newlineIndex = chunk.indexOf("\n");
    const heading = newlineIndex === -1 ? chunk.trim() : chunk.slice(0, newlineIndex).trim();
    const body = newlineIndex === -1 ? "" : chunk.slice(newlineIndex + 1).trim();
    const paragraphs = body.length > 0 ? body.split(/\n\n+/).map((p) => p.trim()).filter(Boolean) : [];
    sections.push({ heading, paragraphs });
  }

  return sections;
}

function Section({ section }: { section: ParsedSection }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="mb-10"
    >
      {section.heading && (
        <h3
          className="font-serif text-xl mb-3"
          style={{ fontWeight: 600 }}
        >
          {section.heading}
        </h3>
      )}
      <div className="space-y-4">
        {section.paragraphs.map((para, i) => (
          <p
            key={i}
            className="text-base leading-relaxed text-foreground/80"
            style={{
              fontFamily: "'Playfair', Georgia, serif",
              fontWeight: 300,
            }}
          >
            {para}
          </p>
        ))}
      </div>
    </motion.div>
  );
}

export default function NarrativeExpansion({
  source,
  leadIsImplicit = false,
}: NarrativeExpansionProps) {
  const sections = parseSource(source, leadIsImplicit);

  return (
    <>
      {sections.map((section, i) => (
        <Section key={i} section={section} />
      ))}
    </>
  );
}
