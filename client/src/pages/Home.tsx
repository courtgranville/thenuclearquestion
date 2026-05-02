import { Link } from "wouter";
import { motion, useInView } from "framer-motion";
import { useRef, useState, useCallback } from "react";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import ScrollProgress from "@/components/ScrollProgress";
import IntroAnimation from "@/components/IntroAnimation";
import PageTransition from "@/components/PageTransition";
import { posters, sectionDescriptions } from "@/lib/posterData";
import { ArrowRight } from "lucide-react";

/*
  DESIGN: Editorial Archive — Light Scholarly Journal
  Landing: Entry animation → Strong thesis question → sequential poster cards.
  Each card animates in on scroll with enhanced hover states.
  Section colour indicators: blue dot for desirability, ochre for feasibility, red for objections.
*/

const SECTION_COLOURS: Record<string, string> = {
  desirability: "#1c3867",
  feasibility: "#b5822e",
  objections: "#a51e22",
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.12 } },
};

function hasSeenIntro(): boolean {
  try {
    return sessionStorage.getItem("intro-seen") === "true";
  } catch {
    return false;
  }
}

function PosterCard({
  poster,
  index,
}: {
  poster: (typeof posters)[0];
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const sectionColour = SECTION_COLOURS[poster.section] || "#1c3867";

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{
        duration: 0.6,
        ease: [0.25, 0.46, 0.45, 0.94],
        delay: index * 0.05,
      }}
    >
      <Link href={`/poster/${poster.id}`}>
        <article className="group relative border-t border-border pt-6 pb-8 cursor-pointer transition-all duration-300 hover:border-primary/40">
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-10">
            {/* Text column */}
            <div className="lg:w-2/5 flex flex-col justify-between">
              <div>
                {/* Number with section colour indicator */}
                <div className="relative flex items-center gap-2.5">
                  <span
                    className="absolute -top-2 -left-1 text-6xl lg:text-7xl font-serif text-foreground/[0.04] select-none pointer-events-none"
                    style={{ fontWeight: 700 }}
                  >
                    {poster.number}
                  </span>
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: sectionColour }}
                  />
                  <span
                    className="relative text-xs tracking-[0.2em] uppercase text-muted-foreground block"
                    style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                  >
                    {poster.number}
                  </span>
                </div>
                <h3
                  className="font-serif text-2xl lg:text-3xl text-foreground mt-3 mb-3 group-hover:text-primary transition-colors duration-300"
                  style={{ fontWeight: 600 }}
                >
                  {poster.title}
                </h3>
                <p
                  className="text-sm text-muted-foreground leading-relaxed mb-4"
                  style={{
                    fontFamily: "'IBM Plex Sans', sans-serif",
                    fontWeight: 300,
                  }}
                >
                  {poster.subtitle}
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground group-hover:text-primary transition-colors duration-300">
                <span style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
                  View poster
                </span>
                <ArrowRight className="w-4 h-4 transform group-hover:translate-x-2 transition-transform duration-300 ease-out" />
              </div>
            </div>

            {/* Image column */}
            <div className="lg:w-3/5 overflow-hidden rounded-sm">
              <div className="relative aspect-[4/3] overflow-hidden bg-card rounded-sm">
                <img
                  src={poster.imagePath}
                  alt={poster.title}
                  className="w-full h-full object-cover object-top opacity-90 group-hover:opacity-100 transition-all duration-500 group-hover:scale-[1.02]"
                  loading={index < 2 ? "eager" : "lazy"}
                />
                <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/[0.02] transition-colors duration-500 rounded-sm" />
              </div>
            </div>
          </div>
        </article>
      </Link>
    </motion.div>
  );
}

function SectionHeader({
  section,
  label,
}: {
  section: string;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  const desc = sectionDescriptions[section];
  const colour = SECTION_COLOURS[section] || "#1c3867";

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="mb-8 mt-14 first:mt-0"
    >
      <div className="flex items-center gap-4 mb-4">
        <span
          className="text-xs tracking-[0.25em] uppercase whitespace-nowrap"
          style={{ fontFamily: "'IBM Plex Mono', monospace", color: colour }}
        >
          {label}
        </span>
        <motion.div
          className="flex-1 h-px bg-border"
          initial={{ scaleX: 0 }}
          animate={isInView ? { scaleX: 1 } : { scaleX: 0 }}
          transition={{
            duration: 0.8,
            delay: 0.2,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
          style={{ originX: 0 }}
        />
      </div>
      {desc && (
        <p
          className="text-sm text-muted-foreground leading-relaxed max-w-2xl"
          style={{
            fontFamily: "'IBM Plex Sans', sans-serif",
            fontWeight: 300,
          }}
        >
          {desc}
        </p>
      )}
    </motion.div>
  );
}

export default function Home() {
  const alreadySeen = hasSeenIntro();
  const [introComplete, setIntroComplete] = useState(alreadySeen);

  const handleIntroComplete = useCallback(() => {
    sessionStorage.setItem("intro-seen", "true");
    setIntroComplete(true);
  }, []);

  const sections = [
    { key: "desirability", label: "Part I — Desirability" },
    { key: "feasibility", label: "Part II — Feasibility" },
    { key: "objections", label: "Part III — Objections" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {!introComplete && (
        <IntroAnimation onComplete={handleIntroComplete} />
      )}

      <SiteHeader />
      <ScrollProgress />

      <PageTransition>
        {/* Hero */}
        <section className="pt-14">
          <div className="container">
            <div className="min-h-[55vh] flex flex-col justify-center max-w-4xl py-16 lg:py-20">
              <motion.div
                initial="hidden"
                animate={introComplete ? "visible" : "hidden"}
                variants={stagger}
              >
                <motion.p
                  variants={fadeUp}
                  className="text-xs tracking-[0.25em] uppercase text-primary mb-6"
                  style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                >
                  A Data-Visualisation Series
                </motion.p>
                <motion.h1
                  variants={fadeUp}
                  className="font-serif text-4xl sm:text-5xl lg:text-6xl leading-[1.15] mb-8"
                  style={{ fontWeight: 600 }}
                >
                  How Can Design Be Used to Discuss the Feasibility of a
                  Nuclear-Powered Future?
                </motion.h1>
                <motion.div variants={fadeUp}>
                  <motion.hr
                    className="border-primary/30 mb-8 max-w-24"
                    initial={{ width: 0 }}
                    animate={
                      introComplete ? { width: "6rem" } : { width: 0 }
                    }
                    transition={{
                      duration: 0.8,
                      delay: 0.6,
                      ease: [0.25, 0.46, 0.45, 0.94],
                    }}
                  />
                </motion.div>
                <motion.p
                  variants={fadeUp}
                  className="text-base lg:text-lg text-muted-foreground leading-relaxed max-w-2xl mb-4"
                  style={{
                    fontFamily: "'IBM Plex Sans', sans-serif",
                    fontWeight: 300,
                  }}
                >
                  Six data-visualisation posters drawing on peer-reviewed and
                  government data, presenting the nuclear question in a visual
                  language accessible to the public. The series examines
                  desirability and feasibility in sequence, concluding by
                  addressing objections honestly rather than advocating for a
                  position.
                </motion.p>
                <motion.p
                  variants={fadeUp}
                  className="text-sm text-muted-foreground"
                  style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                >
                  Court Granville, 2026
                </motion.p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Poster Series — anchor for "Series" nav link */}
        <section id="series" className="pb-20 scroll-mt-16">
          <div className="container">
            {sections.map((section) => {
              const sectionPosters = posters.filter(
                (p) => p.section === section.key
              );
              return (
                <div key={section.key}>
                  <SectionHeader
                    section={section.key}
                    label={section.label}
                  />
                  {sectionPosters.map((poster, i) => (
                    <PosterCard key={poster.id} poster={poster} index={i} />
                  ))}
                </div>
              );
            })}
          </div>
        </section>

        <SiteFooter />
      </PageTransition>
    </div>
  );
}
