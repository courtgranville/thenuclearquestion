import { motion } from "framer-motion";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

/*
  DESIGN: Editorial Archive — Dark Scholarly Journal
  About page: thesis context, author positioning, methodology overview.
  Content derived from the thesis abstract, introduction, and conclusion.
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

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="pt-14">
        <div className="container">
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

          <motion.div
            className="max-w-2xl pb-24"
            initial="hidden"
            animate="visible"
            variants={stagger}
          >
            <motion.div variants={fadeIn}>
              <span
                className="text-xs tracking-[0.25em] uppercase text-primary mb-6 block"
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              >
                About This Project
              </span>
            </motion.div>

            <motion.h1
              variants={fadeIn}
              className="font-serif text-3xl lg:text-4xl leading-tight mb-4"
              style={{ fontWeight: 600 }}
            >
              The Nuclear Question
            </motion.h1>

            <motion.p
              variants={fadeIn}
              className="text-base text-muted-foreground mb-8 italic font-serif"
            >
              How can design be used to discuss the feasibility of a
              nuclear-powered future?
            </motion.p>

            <motion.div variants={fadeIn}>
              <hr className="border-border mb-8" />
            </motion.div>

            <motion.div
              variants={fadeIn}
              className="space-y-5 text-sm leading-relaxed text-foreground/80 mb-10"
              style={{
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontWeight: 300,
              }}
            >
              <p>
                This project investigates how design can facilitate public
                discourse on the feasibility of a nuclear-powered future in the
                UK. It takes seriously the position — set out in the pathways of
                the Climate Change Committee and the National Energy System
                Operator — that nuclear energy is likely essential to the UK's
                timely decarbonisation.
              </p>
              <p>
                The thesis argues that longstanding failures in communicating
                nuclear technology, from both industry and government, compounded
                by public fear, have hindered progress. It operates within a
                newly emerging policy window and communications framework that
                are not yet equipped to seize this opportunity, further defined
                by an industry whose track record on delivery and waste has not
                yet earned the public trust that the policy moment now requires.
              </p>
              <p>
                The designer's role here is that of an epistemic facilitator —
                someone who creates conditions for better public reasoning and
                understanding of contested technologies. This requires carefully
                balancing scientific evidence and emotional concerns, providing
                accessible information that encourages informed discussion rather
                than advocacy or propaganda.
              </p>
            </motion.div>

            <motion.div variants={fadeIn} className="mb-10">
              <blockquote className="border-l-2 border-primary pl-4 py-1">
                <p className="font-serif text-base italic text-foreground/90 leading-relaxed">
                  I must continually ask myself: am I helping people see the
                  truth, or am I becoming a more sophisticated propagandist for a
                  position I already hold?
                </p>
              </blockquote>
            </motion.div>

            <motion.div
              variants={fadeIn}
              className="space-y-5 text-sm leading-relaxed text-foreground/80 mb-10"
              style={{
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontWeight: 300,
              }}
            >
              <p>
                The intervention comprises six data-visualisation posters based
                on peer-reviewed and government data. The series distinguishes
                between desirability and feasibility — recognising that public
                communication often conflates these concepts. The first three
                posters establish nuclear's performance on emissions, physical
                footprint, and mortality rates. The second half shifts to the UK
                specifically: the scale of the energy system, the country's
                historical failure to build announced reactors, and the contested
                question of nuclear waste.
              </p>
              <p>
                The series does not aim to present a complete argument for or
                against nuclear power. Instead, it offers a practical example of
                how design can facilitate discussion about the feasibility of a
                nuclear-powered future in a way unavailable to either industry or
                activists, and provides a model that other designers might adapt
                for this or other contested technologies.
              </p>
            </motion.div>

            <motion.div variants={fadeIn}>
              <hr className="border-border mb-8" />
            </motion.div>

            <motion.div variants={fadeIn} className="mb-10">
              <p
                className="text-xs tracking-[0.15em] uppercase text-muted-foreground mb-4"
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              >
                The Author's Position
              </p>
              <div
                className="space-y-4 text-sm leading-relaxed text-foreground/80"
                style={{
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  fontWeight: 300,
                }}
              >
                <p>
                  My starting position is that nuclear is likely necessary for
                  British decarbonisation, and that fossil fuels are not a viable
                  long-term alternative to meet projected demand — but I do not
                  believe nuclear is sufficient on its own, and my position is
                  open to being wrong. Openness to challenge and reliance on a
                  data-driven narrative strengthen the truth-teller framework and
                  ensure transparency for readers.
                </p>
              </div>
            </motion.div>

            <motion.div variants={fadeIn} className="mb-10">
              <p
                className="text-xs tracking-[0.15em] uppercase text-muted-foreground mb-4"
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              >
                Theoretical Foundation
              </p>
              <div
                className="space-y-4 text-sm leading-relaxed text-foreground/80"
                style={{
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  fontWeight: 300,
                }}
              >
                <p>
                  The project draws on Paul Slovic's psychometric paradigm
                  (which explains why nuclear evokes strong emotional responses
                  despite favourable statistics), Dan Kahan's cultural cognition
                  (which demonstrates that presenting evidence for independent
                  interpretation is more effective than stating conclusions),
                  Miranda Fricker's concept of epistemic injustice (which shows
                  why dismissing public concerns as irrational deepens the
                  problem), and Michel Foucault's parrhesia (which frames the
                  designer as a truth-teller who speaks honestly, even at
                  personal risk).
                </p>
              </div>
            </motion.div>

            <motion.div variants={fadeIn} className="mb-10">
              <p
                className="text-xs tracking-[0.15em] uppercase text-muted-foreground mb-4"
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              >
                Visual Language
              </p>
              <div
                className="space-y-4 text-sm leading-relaxed text-foreground/80"
                style={{
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  fontWeight: 300,
                }}
              >
                <p>
                  Inspired by the work of Federica Fragapane, Paolo Ciuccarelli,
                  and Kate Crawford, the visual approach uses raw, reliable data
                  as its core tenet. It favours an empathetic, relatable style
                  where data is represented in organic forms that use
                  proportionality to make data arguments more tangible for the
                  viewer. The visualisation approach is grounded in
                  Moholy-Nagy's idea that intellect and feeling should be
                  balanced rather than separated.
                </p>
              </div>
            </motion.div>

            <motion.div variants={fadeIn}>
              <hr className="border-border mb-8" />
            </motion.div>

            <motion.div variants={fadeIn}>
              <div className="flex flex-col gap-3">
                <p
                  className="text-xs text-muted-foreground"
                  style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                >
                  Court Granville
                </p>
                <p
                  className="text-xs text-muted-foreground"
                  style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                >
                  Bachelor in Design — Undergraduate Thesis
                </p>
                <p
                  className="text-xs text-muted-foreground"
                  style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                >
                  Supervisor: Professor Kaleb Cardenas Zavala
                </p>
                <p
                  className="text-xs text-muted-foreground"
                  style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                >
                  IE University, May 2026
                </p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
