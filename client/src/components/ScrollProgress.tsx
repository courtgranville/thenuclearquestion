import { motion, useScroll, useSpring } from "framer-motion";

/*
  Thin progress bar fixed below the header.
  Fills as the user scrolls down the page.
  Uses the primary colour (poster blue).
*/

export default function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <motion.div
      className="fixed top-14 left-0 right-0 z-40 h-[2px] bg-primary origin-left"
      style={{ scaleX }}
    />
  );
}
