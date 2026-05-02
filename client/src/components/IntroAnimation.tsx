import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

/*
  Entry animation: "thenuclearquestion" appears centred on a clean background.
  After a brief pause, the text fades/scales up and the overlay dissolves to reveal the site.
  Only plays once per session (sessionStorage flag).
*/

export default function IntroAnimation({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const [phase, setPhase] = useState<"visible" | "exiting" | "done">("visible");

  useEffect(() => {
    // Phase 1: Show the title for 1.4s
    const timer1 = setTimeout(() => {
      setPhase("exiting");
    }, 1400);

    // Phase 2: After exit animation completes, mark done
    const timer2 = setTimeout(() => {
      setPhase("done");
      onComplete();
    }, 2200);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {phase !== "done" && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-background"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          animate={
            phase === "exiting" ? { opacity: 0 } : { opacity: 1 }
          }
          transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <motion.div
            className="flex flex-col items-center"
            initial={{ opacity: 0, y: 8 }}
            animate={
              phase === "visible"
                ? { opacity: 1, y: 0 }
                : { opacity: 0, y: -20, scale: 0.96 }
            }
            transition={{
              duration: phase === "visible" ? 0.6 : 0.5,
              ease: [0.25, 0.46, 0.45, 0.94],
              delay: phase === "visible" ? 0.2 : 0,
            }}
          >
            <h1
              className="font-serif text-3xl sm:text-4xl lg:text-5xl tracking-tight text-foreground"
              style={{ fontWeight: 500 }}
            >
              <span className="text-muted-foreground">the</span>
              <span className="text-primary">nuclear</span>
              <span className="text-muted-foreground">question</span>
            </h1>
            <motion.div
              className="h-px bg-primary mt-4"
              initial={{ width: 0 }}
              animate={{ width: "4rem" }}
              transition={{ duration: 0.8, delay: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
