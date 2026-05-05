import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

/*
  Entry animation: "thenuclearquestion" appears centred on a full-bleed overlay.
  Uses a React portal to document.body so it sits above everything.
  Body scroll is locked during the animation. Click/tap to skip.

  Timing:
  - 0.0s: overlay visible, body scroll locked
  - 0.4s: text fades in
  - 1.2s: underline draws
  - 2.4s: begin exit - text moves up, overlay fades out
  - 3.2s: done, onComplete fires
*/

export default function IntroAnimation({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const [phase, setPhase] = useState<
    "entering" | "holding" | "exiting" | "done"
  >("entering");

  const finish = useCallback(() => {
    setPhase("done");
    document.body.style.overflow = "";
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    document.body.style.overflow = "hidden";

    const t1 = setTimeout(() => setPhase("holding"), 400);
    const t2 = setTimeout(() => setPhase("exiting"), 2400);
    const t3 = setTimeout(finish, 3200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      document.body.style.overflow = "";
    };
  }, [finish]);

  const handleSkip = () => {
    if (phase !== "done") finish();
  };

  const content = (
    <AnimatePresence mode="wait">
      {phase !== "done" && (
        <motion.div
          key="intro-overlay"
          style={{
            position: "fixed",
            inset: 0,
            width: "100vw",
            height: "100dvh",
            minHeight: "100vh",
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#f3f0eb",
            cursor: "pointer",
            margin: 0,
            padding: 0,
          } as React.CSSProperties}
          initial={{ opacity: 1 }}
          animate={phase === "exiting" ? { opacity: 0 } : { opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          onClick={handleSkip}
        >
          <motion.div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              userSelect: "none",
              padding: "0 1.5rem",
            }}
            initial={{ opacity: 0, y: 12 }}
            animate={
              phase === "exiting"
                ? { opacity: 0, y: -30, scale: 0.94 }
                : phase === "entering"
                  ? { opacity: 0, y: 12 }
                  : { opacity: 1, y: 0 }
            }
            transition={{
              duration: phase === "exiting" ? 0.6 : 0.8,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <h1
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontWeight: 500,
                fontSize: "clamp(1.75rem, 4vw, 3.25rem)",
                letterSpacing: "-0.01em",
                lineHeight: 1.2,
                color: "#0d1a1e",
                margin: 0,
                padding: 0,
              }}
            >
              The Nuclear Question
            </h1>
            <motion.div
              style={{
                height: "1px",
                backgroundColor: "#0d1a1e",
                marginTop: "1.25rem",
              }}
              initial={{ width: 0 }}
              animate={
                phase === "exiting"
                  ? { width: "5rem", opacity: 0 }
                  : phase === "holding"
                    ? { width: "5rem" }
                    : { width: 0 }
              }
              transition={{
                duration: 0.9,
                delay: phase === "holding" ? 0.2 : 0,
                ease: [0.22, 1, 0.36, 1],
              }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(content, document.body);
}
