import { Link } from "wouter";
import { motion } from "framer-motion";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { posters, sectionDescriptions } from "@/lib/posterData";
import { ArrowRight } from "lucide-react";

/*
  DESIGN: Editorial Archive — Dark Scholarly Journal
  Landing: Strong thesis question, then sequential poster cards grouped by section.
  Each card shows poster number, title, short description, and a preview image.
*/

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

function PosterCard({
  poster,
  index,
}: {
  poster: (typeof posters)[0];
  index: number;
}) {
  return (
    <motion.div variants={fadeIn}>
      <Link href={`/poster/${poster.id}`}>
        <article className="group relative border-t border-border pt-6 pb-8 cursor-pointer">
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-10">
            {/* Text column */}
            <div className="lg:w-2/5 flex flex-col justify-between">
              <div>
                <span
                  className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-3 block"
                  style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                >
                  {poster.number}
                </span>
                <h3
                  className="font-serif text-2xl lg:text-3xl text-foreground mb-3 group-hover:text-primary transition-colors duration-300"
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
                <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform duration-200" />
              </div>
            </div>

            {/* Image column */}
            <div className="lg:w-3/5 overflow-hidden rounded-sm">
              <div className="relative aspect-[4/3] overflow-hidden bg-card">
                <img
                  src={poster.imagePath}
                  alt={poster.title}
                  className="w-full h-full object-cover object-top opacity-90 group-hover:opacity-100 transition-all duration-500 group-hover:scale-[1.02]"
                  loading={index < 2 ? "eager" : "lazy"}
                />
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
  const desc = sectionDescriptions[section];
  return (
    <motion.div variants={fadeIn} className="mb-8 mt-16 first:mt-0">
      <div className="flex items-center gap-4 mb-4">
        <span
          className="text-xs tracking-[0.25em] uppercase text-primary whitespace-nowrap"
          style={{ fontFamily: "'IBM Plex Mono', monospace" }}
        >
          {label}
        </span>
        <div className="flex-1 h-px bg-border" />
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
  const sections = [
    { key: "desirability", label: "Part I — Desirability" },
    { key: "feasibility", label: "Part II — Feasibility" },
    { key: "objections", label: "Part III — Objections" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Hero */}
      <section className="pt-14">
        <div className="container">
          <div className="min-h-[70vh] flex flex-col justify-center max-w-4xl py-20">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={stagger}
            >
              <motion.p
                variants={fadeIn}
                className="text-xs tracking-[0.25em] uppercase text-primary mb-6"
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              >
                A Data-Visualisation Series
              </motion.p>
              <motion.h1
                variants={fadeIn}
                className="font-serif text-4xl sm:text-5xl lg:text-6xl leading-[1.15] mb-8"
                style={{ fontWeight: 600 }}
              >
                How Can Design Be Used to Discuss the Feasibility of a
                Nuclear-Powered Future?
              </motion.h1>
              <motion.div variants={fadeIn}>
                <hr className="border-border mb-8 max-w-24" />
              </motion.div>
              <motion.p
                variants={fadeIn}
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
                variants={fadeIn}
                className="text-sm text-muted-foreground"
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              >
                Court Granville, 2026
              </motion.p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Poster Series */}
      <section className="pb-24">
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
          >
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
          </motion.div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
