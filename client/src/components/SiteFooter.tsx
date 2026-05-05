import { motion, useInView } from "framer-motion";
import { useRef } from "react";

/*
  DESIGN: Editorial Archive - Light Scholarly Journal
  Shared footer component with subtle fade-in on scroll.
*/

export default function SiteFooter() {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });

  return (
    <motion.footer
      ref={ref}
      className="border-t border-border py-12"
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : { opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="container">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <p
              className="text-xs text-muted-foreground"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            >
              The Nuclear Question - Court Granville
            </p>
            <p
              className="text-xs text-muted-foreground mt-1"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            >
              Bachelor in Design Thesis, IE University, 2026
            </p>
          </div>

        </div>
      </div>
    </motion.footer>
  );
}
