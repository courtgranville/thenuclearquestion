import { motion } from "framer-motion";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import ScrollProgress from "@/components/ScrollProgress";
import PageTransition from "@/components/PageTransition";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

/*
  DESIGN: Editorial Archive - Light Scholarly Journal
  Contact page - simple text with email link.
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

export default function Contact() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <ScrollProgress />

      <PageTransition>
        <main className="pt-[72px]">
          <div className="container">
            <div className="pt-8 pb-4">
              <Link href="/">
                <span className="group inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200">
                  <ArrowLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform duration-200" />
                  <span style={{ fontFamily: "'Playfair', Georgia, serif" }}>
                    Back to home
                  </span>
                </span>
              </Link>
            </div>

            <motion.div
              className="max-w-2xl mx-auto pb-24 text-left"
              initial="hidden"
              animate="visible"
              variants={stagger}
            >
              <motion.div variants={fadeUp}>
                <span
                  className="text-xs tracking-[0.25em] uppercase text-primary mb-6 block"
                  style={{ fontFamily: "'Playfair', Georgia, serif" }}
                >
                  Contact
                </span>
              </motion.div>

              <motion.h1
                variants={fadeUp}
                className="font-serif text-3xl lg:text-4xl leading-tight mb-8"
              >
                Get in Touch
              </motion.h1>

              <motion.div variants={fadeUp}>
                <hr className="border-border mb-8" />
              </motion.div>

              <motion.p
                variants={fadeUp}
                className="text-sm leading-relaxed text-foreground/80 mb-8"
                style={{
                  fontFamily: "'Playfair', Georgia, serif",
                  fontWeight: 300,
                }}
              >
                I'd genuinely love to hear from anyone interested in the project
                - designers working on contested technologies, researchers in
                risk communication, students working on similar questions, or
                anyone who simply wants to continue the conversation.
              </motion.p>

              <motion.div variants={fadeUp}>
                <a
                  href="mailto:court@courtgranville.com"
                  className="text-sm text-primary hover:text-foreground transition-colors duration-200"
                  style={{ fontFamily: "'Playfair', Georgia, serif" }}
                >
                  court@courtgranville.com
                </a>
              </motion.div>
            </motion.div>
          </div>
        </main>

        <SiteFooter />
      </PageTransition>
    </div>
  );
}
