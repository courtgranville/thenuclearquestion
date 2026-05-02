import { useParams, Link } from "wouter";
import { motion } from "framer-motion";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { posters } from "@/lib/posterData";
import { ArrowLeft, ArrowRight, Download, ZoomIn, ZoomOut, X } from "lucide-react";
import { useState, useCallback, useEffect } from "react";

/*
  DESIGN: Editorial Archive — Dark Scholarly Journal
  Individual poster page: left text column + right poster viewer.
  Full-screen lightbox on click. PDF download available.
*/

const fadeIn = {
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

function Lightbox({
  imagePath,
  title,
  onClose,
}: {
  imagePath: string;
  title: string;
  onClose: () => void;
}) {
  const [scale, setScale] = useState(1);

  const handleZoomIn = useCallback(
    () => setScale((s) => Math.min(s + 0.5, 4)),
    []
  );
  const handleZoomOut = useCallback(
    () => setScale((s) => Math.max(s - 0.5, 0.5)),
    []
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "+" || e.key === "=") handleZoomIn();
      if (e.key === "-") handleZoomOut();
    };
    window.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose, handleZoomIn, handleZoomOut]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex flex-col"
      onClick={onClose}
    >
      {/* Controls */}
      <div className="flex items-center justify-between p-4 relative z-10">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          style={{ fontFamily: "'IBM Plex Mono', monospace" }}
        >
          <X className="w-4 h-4" />
          Close
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleZoomOut();
            }}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span
            className="text-xs text-muted-foreground min-w-[3rem] text-center"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleZoomIn();
            }}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Image */}
      <div
        className="flex-1 overflow-auto flex items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={imagePath}
          alt={title}
          className="max-w-none transition-transform duration-200"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "center center",
          }}
          draggable={false}
        />
      </div>
    </motion.div>
  );
}

export default function PosterPage() {
  const params = useParams<{ id: string }>();
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const poster = posters.find((p) => p.id === params.id);
  const currentIndex = posters.findIndex((p) => p.id === params.id);
  const prevPoster = currentIndex > 0 ? posters[currentIndex - 1] : null;
  const nextPoster =
    currentIndex < posters.length - 1 ? posters[currentIndex + 1] : null;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [params.id]);

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

      {lightboxOpen && (
        <Lightbox
          imagePath={poster.imagePath}
          title={poster.title}
          onClose={() => setLightboxOpen(false)}
        />
      )}

      <main className="pt-14">
        <div className="container">
          {/* Back link */}
          <div className="pt-8 pb-4">
            <Link href="/">
              <span className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200">
                <ArrowLeft className="w-4 h-4" />
                <span style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}>
                  Back to series
                </span>
              </span>
            </Link>
          </div>

          {/* Main content */}
          <div className="flex flex-col lg:flex-row gap-10 lg:gap-16 pb-16">
            {/* Text column */}
            <motion.div
              className="lg:w-2/5 lg:sticky lg:top-24 lg:self-start"
              initial="hidden"
              animate="visible"
              variants={stagger}
            >
              <motion.div variants={fadeIn}>
                <div className="flex items-center gap-3 mb-4">
                  <span
                    className="text-xs tracking-[0.25em] uppercase text-primary"
                    style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                  >
                    {poster.sectionLabel}
                  </span>
                  <span
                    className="text-xs text-muted-foreground"
                    style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                  >
                    /
                  </span>
                  <span
                    className="text-xs tracking-[0.2em] uppercase text-muted-foreground"
                    style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                  >
                    {poster.number}
                  </span>
                </div>
              </motion.div>

              <motion.h1
                variants={fadeIn}
                className="font-serif text-3xl lg:text-4xl leading-tight mb-3"
                style={{ fontWeight: 600 }}
              >
                {poster.title}
              </motion.h1>

              <motion.p
                variants={fadeIn}
                className="text-base text-muted-foreground mb-8 italic font-serif"
              >
                {poster.subtitle}
              </motion.p>

              <motion.div variants={fadeIn}>
                <hr className="border-border mb-8" />
              </motion.div>

              <motion.p
                variants={fadeIn}
                className="text-sm leading-relaxed text-foreground/80 mb-6"
                style={{
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  fontWeight: 300,
                }}
              >
                {poster.description}
              </motion.p>

              <motion.div variants={fadeIn} className="mb-6">
                <blockquote className="border-l-2 border-primary pl-4 py-1">
                  <p className="font-serif text-base italic text-foreground/90 leading-relaxed">
                    {poster.pullQuote}
                  </p>
                </blockquote>
              </motion.div>

              <motion.p
                variants={fadeIn}
                className="text-sm leading-relaxed text-foreground/80 mb-6"
                style={{
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  fontWeight: 300,
                }}
              >
                {poster.keyInsight}
              </motion.p>

              <motion.div variants={fadeIn} className="mb-8">
                <p
                  className="text-xs tracking-[0.15em] uppercase text-muted-foreground mb-2"
                  style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                >
                  Methodology
                </p>
                <p
                  className="text-xs text-muted-foreground leading-relaxed"
                  style={{
                    fontFamily: "'IBM Plex Sans', sans-serif",
                    fontWeight: 300,
                  }}
                >
                  {poster.methodology}
                </p>
              </motion.div>

              <motion.div variants={fadeIn}>
                <a
                  href={poster.pdfPath}
                  download
                  className="inline-flex items-center gap-2 text-sm text-primary hover:text-foreground transition-colors duration-200"
                  style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
                >
                  <Download className="w-4 h-4" />
                  Download full-resolution PDF
                </a>
              </motion.div>
            </motion.div>

            {/* Poster image column */}
            <motion.div
              className="lg:w-3/5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div
                className="relative cursor-zoom-in group"
                onClick={() => setLightboxOpen(true)}
              >
                <img
                  src={poster.imagePath}
                  alt={poster.title}
                  className="w-full rounded-sm shadow-xl shadow-black/10 group-hover:shadow-2xl group-hover:shadow-black/15 transition-shadow duration-300"
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/10 rounded-sm">
                  <div className="bg-background/80 backdrop-blur-sm px-4 py-2 rounded-sm flex items-center gap-2">
                    <ZoomIn className="w-4 h-4 text-foreground" />
                    <span
                      className="text-sm text-foreground"
                      style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
                    >
                      View full size
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Navigation */}
          <nav className="border-t border-border py-8 mb-8">
            <div className="flex justify-between items-center">
              {prevPoster ? (
                <Link href={`/poster/${prevPoster.id}`}>
                  <span className="group flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors duration-200">
                    <ArrowLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform duration-200" />
                    <span className="flex flex-col">
                      <span
                        className="text-xs tracking-[0.15em] uppercase"
                        style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                      >
                        {prevPoster.number}
                      </span>
                      <span
                        className="text-sm hidden sm:block"
                        style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
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
                        className="text-xs tracking-[0.15em] uppercase"
                        style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                      >
                        {nextPoster.number}
                      </span>
                      <span
                        className="text-sm hidden sm:block"
                        style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
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
    </div>
  );
}
