import { useParams, Link } from "wouter";
import { motion, useInView } from "framer-motion";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import ScrollProgress from "@/components/ScrollProgress";
import PageTransition from "@/components/PageTransition";
import { posters } from "@/lib/posterData";
import {
  ArrowLeft,
  ArrowRight,
  Download,
  ZoomIn,
  ZoomOut,
  X,
} from "lucide-react";
import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";

/*
  DESIGN: Editorial Archive — Light Scholarly Journal
  Individual poster page with:
  - Page transition fade-in
  - Scroll progress bar
  - Enhanced lightbox with pan/drag when zoomed
  - Download toast feedback
  - Keyboard hints in lightbox
  - Animated blockquote border
*/

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
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showHints, setShowHints] = useState(true);

  const handleZoomIn = useCallback(
    () => setScale((s) => Math.min(s + 0.5, 4)),
    []
  );
  const handleZoomOut = useCallback(() => {
    setScale((s) => {
      const newScale = Math.max(s - 0.5, 0.5);
      if (newScale <= 1) setPosition({ x: 0, y: 0 });
      return newScale;
    });
  }, []);

  // Hide keyboard hints after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowHints(false), 3000);
    return () => clearTimeout(timer);
  }, []);

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

  // Pan/drag handlers for zoomed state
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch handlers for mobile pan
  const handleTouchStart = (e: React.TouchEvent) => {
    if (scale > 1 && e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging && scale > 1 && e.touches.length === 1) {
      e.preventDefault();
      setPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-md flex flex-col"
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

      {/* Keyboard hints */}
      <motion.div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: showHints ? 1 : 0, y: showHints ? 0 : 8 }}
        transition={{ duration: 0.3 }}
      >
        <div
          className="bg-foreground/10 backdrop-blur-sm px-4 py-2 rounded-sm"
          style={{ fontFamily: "'IBM Plex Mono', monospace" }}
        >
          <span className="text-xs text-muted-foreground">
            Esc to close · +/- to zoom{scale > 1 ? " · Drag to pan" : ""}
          </span>
        </div>
      </motion.div>

      {/* Image */}
      <div
        className={`flex-1 overflow-hidden flex items-center justify-center p-4 ${
          scale > 1 ? (isDragging ? "cursor-grabbing" : "cursor-grab") : "cursor-zoom-in"
        }`}
        onClick={(e) => {
          e.stopPropagation();
          if (scale <= 1) handleZoomIn();
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <img
          src={imagePath}
          alt={title}
          className="max-w-none transition-transform duration-200 select-none"
          style={{
            transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
            transformOrigin: "center center",
          }}
          draggable={false}
        />
      </div>
    </motion.div>
  );
}

function AnimatedBlockquote({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });

  return (
    <div ref={ref} className="relative mb-6">
      <motion.div
        className="absolute left-0 top-0 bottom-0 w-[2px] bg-primary"
        initial={{ scaleY: 0 }}
        animate={isInView ? { scaleY: 1 } : { scaleY: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
        style={{ originY: 0 }}
      />
      <blockquote className="pl-4 py-1">
        <p className="font-serif text-base italic text-foreground/90 leading-relaxed">
          {children}
        </p>
      </blockquote>
    </div>
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

  const handleDownload = () => {
    toast.success("Download started", {
      description: `${poster?.title} — Full-resolution PDF`,
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

      {lightboxOpen && (
        <Lightbox
          imagePath={poster.imagePath}
          title={poster.title}
          onClose={() => setLightboxOpen(false)}
        />
      )}

      <PageTransition>
        <main className="pt-14">
          <div className="container">
            {/* Back link */}
            <div className="pt-8 pb-4">
              <Link href="/">
                <span className="group inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200">
                  <ArrowLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform duration-200" />
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
                <motion.div variants={fadeUp}>
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
                  variants={fadeUp}
                  className="font-serif text-3xl lg:text-4xl leading-tight mb-3"
                  style={{ fontWeight: 600 }}
                >
                  {poster.title}
                </motion.h1>

                <motion.p
                  variants={fadeUp}
                  className="text-base text-muted-foreground mb-8 italic font-serif"
                >
                  {poster.subtitle}
                </motion.p>

                <motion.div variants={fadeUp}>
                  <hr className="border-border mb-8" />
                </motion.div>

                <motion.p
                  variants={fadeUp}
                  className="text-sm leading-relaxed text-foreground/80 mb-6"
                  style={{
                    fontFamily: "'IBM Plex Sans', sans-serif",
                    fontWeight: 300,
                  }}
                >
                  {poster.description}
                </motion.p>

                <motion.div variants={fadeUp}>
                  <AnimatedBlockquote>{poster.pullQuote}</AnimatedBlockquote>
                </motion.div>

                <motion.p
                  variants={fadeUp}
                  className="text-sm leading-relaxed text-foreground/80 mb-6"
                  style={{
                    fontFamily: "'IBM Plex Sans', sans-serif",
                    fontWeight: 300,
                  }}
                >
                  {poster.keyInsight}
                </motion.p>

                <motion.div variants={fadeUp} className="mb-8">
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

                <motion.div variants={fadeUp}>
                  <a
                    href={poster.pdfPath}
                    download
                    onClick={handleDownload}
                    className="group inline-flex items-center gap-2 text-sm text-primary hover:text-foreground transition-colors duration-200"
                    style={{ fontFamily: "'IBM Plex Sans', sans-serif" }}
                  >
                    <Download className="w-4 h-4 group-hover:animate-bounce" />
                    Download full-resolution PDF
                  </a>
                </motion.div>
              </motion.div>

              {/* Poster image column */}
              <motion.div
                className="lg:w-3/5"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                <div
                  className="relative cursor-zoom-in group"
                  onClick={() => setLightboxOpen(true)}
                >
                  <img
                    src={poster.imagePath}
                    alt={poster.title}
                    className="w-full rounded-sm shadow-xl shadow-black/10 group-hover:shadow-2xl group-hover:shadow-black/15 transition-all duration-300 group-hover:-translate-y-1"
                  />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/5 rounded-sm">
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
      </PageTransition>
    </div>
  );
}
