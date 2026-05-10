import { useParams, Link } from "wouter";
import { motion, useInView } from "framer-motion";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import ScrollProgress from "@/components/ScrollProgress";
import PageTransition from "@/components/PageTransition";
import Poster001Viz from "@/components/Poster001Viz";
import Poster002Viz from "@/components/Poster002Viz";
import Poster002CanvasViz from "@/components/Poster002CanvasViz";
import Poster003Viz from "@/components/Poster003Viz";
import Poster004CanvasViz from "@/components/Poster004CanvasViz";
import Poster005Viz from "@/components/Poster005Viz";
import Poster006Viz from "@/components/Poster006Viz";
import Poster001Legend from "@/components/Poster001Legend";
import Poster002Legend from "@/components/Poster002Legend";
import Poster003Legend from "@/components/Poster003Legend";
import Poster004Legend from "@/components/Poster004Legend";
import Poster006Legend from "@/components/Poster006Legend";
import { posters, posterSources } from "@/lib/posterData";
import { ArrowLeft, ArrowRight, Download } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";

/*
  DESIGN: Editorial Archive - Light Scholarly Journal
  LAYOUT v2: Single-column full-bleed layout per user spec:
    1. Title section (section label, number, title, subtitle)
    2. Full-bleed paragraphs (description + keyInsight, no repetition)
    3. Full-bleed interactive data visualisation (maximised width)
    4. Control buttons BELOW the visualisation (handled by viz components)
    5. Download paragraph with PDF link
    6. Full-bleed poster PDF preview at the bottom
    7. Prev/Next navigation
*/

const SECTION_COLOURS: Record<string, string> = {
  desirability: "#1c3867",
  feasibility: "#b5822e",
  objections: "#a51e22",
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
};


export default function PosterPage() {
  const params = useParams<{ id: string }>();

  const poster = posters.find((p) => p.id === params.id);
  const currentIndex = posters.findIndex((p) => p.id === params.id);
  const prevPoster = currentIndex > 0 ? posters[currentIndex - 1] : null;
  const nextPoster =
    currentIndex < posters.length - 1 ? posters[currentIndex + 1] : null;

  const sectionColour = poster
    ? SECTION_COLOURS[poster.section] || "#1c3867"
    : "#1c3867";

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [params.id]);

  const handleDownload = () => {
    toast.success("Download started", {
      description: `${poster?.title} - Full-resolution PDF`,
      duration: 3000,
    });
  };

  if (!poster) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Poster not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <ScrollProgress />

      <PageTransition>
        <main className="pt-[72px]">
          <div className="container">
            {/* ── 0. Back link ── */}
            <div className="pt-8 pb-4 max-w-3xl mx-auto">
              <Link href="/">
                <span className="group inline-flex items-center gap-2 text-base text-muted-foreground hover:text-foreground transition-colors duration-200">
                  <ArrowLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform duration-200" />
                  <span style={{ fontFamily: "'Playfair', Georgia, serif" }}>
                    Back to series
                  </span>
                </span>
              </Link>
            </div>

            {/* ── 1. Title section ── */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={stagger}
              className="pb-8 text-left max-w-3xl mx-auto"
            >
              <motion.div variants={fadeUp}>
                <div className="flex items-center gap-3 mb-4">
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: sectionColour }}
                  />
                  <span
                    className="text-sm tracking-[0.25em] uppercase"
                    style={{
                      fontFamily: "'Playfair', Georgia, serif",
                      color: sectionColour,
                    }}
                  >
                    {poster.sectionLabel}
                  </span>
                  <span
                    className="text-sm text-muted-foreground"
                    style={{ fontFamily: "'Playfair', Georgia, serif" }}
                  >
                    /
                  </span>
                  <span
                    className="text-sm tracking-[0.2em] uppercase text-muted-foreground"
                    style={{ fontFamily: "'Playfair', Georgia, serif" }}
                  >
                    {poster.number}
                  </span>
                </div>
              </motion.div>

              <motion.h1
                variants={fadeUp}
                className="font-serif text-3xl lg:text-4xl leading-tight mb-3"
                style={{ fontWeight: 600 }}
              >
                {poster.title}
              </motion.h1>

              <motion.p
                variants={fadeUp}
                className="text-base text-muted-foreground italic font-serif"
              >
                {poster.subtitle}
              </motion.p>
            </motion.div>

            {/* ── 2. Full-bleed paragraphs ── */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={stagger}
              className="pb-10 text-left max-w-3xl mx-auto"
            >
              <motion.div variants={fadeUp}>
                <hr className="border-border mb-8" />
              </motion.div>

              {/* Poster's main description */}
              <motion.p
                variants={fadeUp}
                className="text-base leading-relaxed text-foreground/80 mb-6"
                style={{
                  fontFamily: "'Playfair', Georgia, serif",
                  fontWeight: 300,
                }}
              >
                {poster.description}
              </motion.p>


              {/* Key insight - additional thesis context */}
              <motion.p
                variants={fadeUp}
                className="text-base leading-relaxed text-foreground/80 mb-6"
                style={{
                  fontFamily: "'Playfair', Georgia, serif",
                  fontWeight: 300,
                }}
              >
                {poster.keyInsight}
              </motion.p>

              {/* Methodology note */}
              <motion.div variants={fadeUp}>
                <p
                  className="text-sm tracking-[0.15em] uppercase text-muted-foreground mb-2"
                  style={{ fontFamily: "'Playfair', Georgia, serif" }}
                >
                  Methodology
                </p>
                <p
                  className="text-sm text-muted-foreground leading-relaxed"
                  style={{
                    fontFamily: "'Playfair', Georgia, serif",
                    fontWeight: 300,
                  }}
                >
                  {poster.methodology}
                </p>
              </motion.div>
            </motion.div>
          </div>

          {/* ── 3. Full-bleed interactive visualisation ── */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="w-full px-2 sm:px-4 lg:px-6 pb-10"
          >
            <div className="container mb-4">
              <div className="max-w-3xl mx-auto">
                <p
                  className="text-sm tracking-[0.15em] uppercase text-muted-foreground mb-2"
                  style={{ fontFamily: "'Playfair', Georgia, serif" }}
                >
                  Interactive Visualisation
                </p>
                <h3
                  className="font-serif text-2xl text-foreground"
                  style={{ fontWeight: 600 }}
                >
                  Explore the Data
                </h3>
              </div>
            </div>

            {/* The viz components now render SVG first, controls below */}
            <div className="w-full">
              {poster.id === "001" && <Poster001Viz />}
              {poster.id === "002" && <Poster002CanvasViz />}
              {poster.id === "003" && <Poster003Viz />}
              {poster.id === "004" && <Poster004CanvasViz />}
              {poster.id === "005" && <Poster005Viz />}
              {poster.id === "006" && <Poster006Viz />}
            </div>

            {/* Per-poster legend block — sits below the viz and above
                the download-PDF paragraph. Poster 005 owns its own
                legend inside Poster005Viz; the others render here.
                See client/src/components/Poster00*Legend.tsx for the
                individual designs. */}
            <div className="w-full mt-16">
              {poster.id === "001" && <Poster001Legend />}
              {poster.id === "002" && <Poster002Legend />}
              {poster.id === "003" && <Poster003Legend />}
              {poster.id === "004" && <Poster004Legend />}
              {poster.id === "006" && <Poster006Legend />}
            </div>
          </motion.section>

          <div className="container">
            <div className="max-w-3xl mx-auto">
            {/* ── 5. Download paragraph ── */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.4 }}
              className="py-8 border-t border-border"
            >
              <p
                className="text-base text-muted-foreground mb-3"
                style={{
                  fontFamily: "'Playfair', Georgia, serif",
                  fontWeight: 300,
                }}
              >
                This poster was designed for A1 print at 300 DPI. Download the
                full-resolution PDF below for the best viewing experience.
              </p>
              <a
                href={poster.pdfPath}
                download
                onClick={handleDownload}
                className="group inline-flex items-center gap-2 text-base text-primary hover:text-foreground transition-colors duration-200"
                style={{ fontFamily: "'Playfair', Georgia, serif" }}
              >
                <Download className="w-4 h-4 transform group-hover:-translate-y-0.5 transition-transform duration-200" />
                <span className="relative">
                  Download full-resolution PDF
                  <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-foreground group-hover:w-full transition-all duration-300 ease-out" />
                </span>
              </a>
            </motion.div>

            {/* ── 6. Full-bleed poster preview ── */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                duration: 0.6,
                delay: 0.2,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
              className="pb-10"
            >
              <p
                className="text-sm tracking-[0.15em] uppercase text-muted-foreground mb-4"
                style={{ fontFamily: "'Playfair', Georgia, serif" }}
              >
                Poster Preview
              </p>
            </motion.div>
            </div>
          </div>

          {/* Poster image - full bleed */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="w-full px-2 sm:px-4 lg:px-6 pb-12"
          >
            <img
              src={poster.imagePath}
              alt={poster.title}
              className="w-full h-auto border border-border/60"
            />
          </motion.div>

          {/* ── Sources block ── */}
          {posterSources[poster.id] && (
            <div className="container">
              <div className="max-w-3xl mx-auto pb-10">
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.4 }}
                >
                  <hr className="border-border mb-8" />
                  <p
                    className="text-sm tracking-[0.15em] uppercase text-muted-foreground mb-4"
                    style={{ fontFamily: "'Playfair', Georgia, serif" }}
                  >
                    Sources
                  </p>
                  <p
                    className="text-base leading-relaxed text-foreground/80 mb-4"
                    style={{
                      fontFamily: "'Playfair', Georgia, serif",
                      fontWeight: 300,
                    }}
                  >
                    {posterSources[poster.id].intro}
                  </p>
                  <ul className="space-y-2 mb-5 pl-4">
                    {posterSources[poster.id].items.map((item, i) => (
                      <li
                        key={i}
                        className="text-base leading-relaxed text-foreground/80 border-l-2 border-border pl-3"
                        style={{
                          fontFamily: "'Playfair', Georgia, serif",
                          fontWeight: 300,
                        }}
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                  <p
                    className="text-base leading-relaxed text-foreground/60 mb-5"
                    style={{
                      fontFamily: "'Playfair', Georgia, serif",
                      fontWeight: 300,
                    }}
                  >
                    {posterSources[poster.id].caveat}
                  </p>
                  <Link href="/sources">
                    <span
                      className="group inline-flex items-center gap-1.5 text-base text-primary hover:text-foreground transition-colors duration-200"
                      style={{ fontFamily: "'Playfair', Georgia, serif" }}
                    >
                      <span className="relative">
                        Full sources & methodology
                        <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-foreground group-hover:w-full transition-all duration-300 ease-out" />
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform duration-200" />
                    </span>
                  </Link>
                </motion.div>
              </div>
            </div>
          )}

          {/* ── 7. Navigation ── */}
          <div className="container">
            <nav className="border-t border-border py-6 mb-6 max-w-3xl mx-auto">
              <div className="flex justify-between items-center">
                {prevPoster ? (
                  <Link href={`/poster/${prevPoster.id}`}>
                    <span className="group flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors duration-200">
                      <ArrowLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform duration-200" />
                      <span className="flex flex-col">
                        <span
                          className="text-sm tracking-[0.15em] uppercase"
                          style={{ fontFamily: "'Playfair', Georgia, serif" }}
                        >
                          {prevPoster.number}
                        </span>
                        <span
                          className="text-base hidden sm:block"
                          style={{ fontFamily: "'Playfair', Georgia, serif" }}
                        >
                          {prevPoster.title}
                        </span>
                      </span>
                    </span>
                  </Link>
                ) : (
                  <div />
                )}
                {nextPoster ? (
                  <Link href={`/poster/${nextPoster.id}`}>
                    <span className="group flex items-center gap-3 text-right text-muted-foreground hover:text-foreground transition-colors duration-200">
                      <span className="flex flex-col">
                        <span
                          className="text-sm tracking-[0.15em] uppercase"
                          style={{ fontFamily: "'Playfair', Georgia, serif" }}
                        >
                          {nextPoster.number}
                        </span>
                        <span
                          className="text-base hidden sm:block"
                          style={{ fontFamily: "'Playfair', Georgia, serif" }}
                        >
                          {nextPoster.title}
                        </span>
                      </span>
                      <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform duration-200" />
                    </span>
                  </Link>
                ) : (
                  <div />
                )}
              </div>
            </nav>
          </div>
        </main>

        <SiteFooter />
      </PageTransition>
    </div>
  );
}
