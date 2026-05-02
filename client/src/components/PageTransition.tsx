import { motion } from "framer-motion";
import { ReactNode } from "react";

/*
  Wraps page content to provide a subtle fade-in transition
  when navigating between pages.
*/

export default function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      {children}
    </motion.div>
  );
}
