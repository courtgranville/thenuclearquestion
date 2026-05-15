import { motion, useInView } from "framer-motion";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import ScrollProgress from "@/components/ScrollProgress";
import PageTransition from "@/components/PageTransition";
import ContactForm from "@/components/ContactForm";
import { Link } from "wouter";
import { ArrowLeft, Download } from "lucide-react";
import { useRef } from "react";

const SERIF_STYLE = { fontFamily: "'Playfair', Georgia, serif" } as const;

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

function SectionBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="mb-10"
    >
      <h2
        className="font-serif text-2xl mb-4"
        style={{ fontWeight: 600 }}
      >
        {title}
      </h2>
      <div
        className="space-y-4 text-base leading-relaxed text-foreground/80"
        style={{ ...SERIF_STYLE, fontWeight: 300 }}
      >
        {children}
      </div>
    </motion.div>
  );
}

function FormSection() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="mb-10"
    >
      <h2
        className="font-serif text-2xl mb-4"
        style={{ fontWeight: 600 }}
      >
        Send a message
      </h2>
      <p
        className="text-base leading-relaxed text-foreground/80 mb-6"
        style={{ ...SERIF_STYLE, fontWeight: 300 }}
      >
        Use the form below to get in touch. It comes straight to my inbox.
      </p>
      <ContactForm />
    </motion.div>
  );
}

function MetadataBlock() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="mt-12"
    >
      <p className="mb-1" style={SERIF_STYLE}>
        <a
          href="https://linkedin.com/in/courtgranville"
          target="_blank"
          rel="noopener noreferrer"
          className="text-base text-primary hover:text-foreground transition-colors duration-200 underline-offset-4 hover:underline"
        >
          LinkedIn: linkedin.com/in/courtgranville
        </a>
      </p>
      <p
        className="text-sm text-muted-foreground mb-1"
        style={{ ...SERIF_STYLE, fontWeight: 300 }}
      >
        Based: London
      </p>
      <p
        className="text-sm text-muted-foreground"
        style={{ ...SERIF_STYLE, fontWeight: 300 }}
      >
        Available from: Summer 2026
      </p>

      <div className="mt-6">
        <a
          href="/assets/Court_Granville_CV.pdf"
          download="Court_Granville_CV.pdf"
          className="group inline-flex items-center gap-2 text-base text-primary hover:text-foreground transition-colors duration-200"
          style={SERIF_STYLE}
        >
          <Download className="w-4 h-4 transform group-hover:-translate-y-0.5 transition-transform duration-200" />
          <span className="relative">
            Download CV (PDF)
            <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-foreground group-hover:w-full transition-all duration-300 ease-out" />
          </span>
        </a>
      </div>
    </motion.div>
  );
}

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
                <span className="group inline-flex items-center gap-2 text-base text-muted-foreground hover:text-foreground transition-colors duration-200">
                  <ArrowLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform duration-200" />
                  <span style={SERIF_STYLE}>Back to home</span>
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
                  className="text-sm tracking-[0.25em] uppercase text-primary mb-6 block"
                  style={SERIF_STYLE}
                >
                  Contact
                </span>
              </motion.div>

              <motion.h1
                variants={fadeUp}
                className="font-serif text-3xl lg:text-4xl leading-tight mb-8"
                style={{ fontWeight: 600 }}
              >
                Get in touch
              </motion.h1>

              <motion.div variants={fadeUp}>
                <hr className="border-border mb-8" />
              </motion.div>

              <motion.div
                variants={fadeUp}
                className="space-y-5 text-base leading-relaxed text-foreground/80 mb-10"
                style={{ ...SERIF_STYLE, fontWeight: 300 }}
              >
                <p>
                  I'm Court Granville, a designer finishing my degree at IE
                  University Madrid this May. The project you've been clicking
                  through is the largest piece of work I've made - a year-long
                  thesis on the public communication of nuclear energy,
                  produced as a series of editorial data posters, the website
                  you're on, and primary research that includes expert
                  interviews and an original public-perception survey. My
                  training is broader than this single project: most of my
                  degree has been in product design, with the final year a
                  move into systems-level work and communication.
                </p>
                <p>
                  The thesis argues - and the argument generalises - that
                  designers have a specific role to play in how technically
                  complex, publicly contested subjects get talked about. A
                  role that sits between industry advocacy and activist
                  opposition, and asks how the architecture of public
                  conversation can be made more honest. I've been calling this
                  the "epistemic facilitator" position. It is the strand of my
                  practice I'd most like to develop next, across nuclear and
                  beyond.
                </p>
              </motion.div>

              <SectionBlock title="What I do">
                <p>
                  I treat each brief - whether the output is a poster, a
                  thesis, a piece of furniture or a strategy document - as a
                  question about what the artefact is actually trying to do,
                  and don't start until I understand that. That habit is the
                  thread connecting my work across product, systems and
                  communication design, and it is what I would bring into a
                  consulting or in-house environment. The brief is a starting
                  point, not a target.
                </p>
                <p>
                  Recent work includes the nuclear thesis, generative
                  visualisation in Processing, a custom CNC-machined enclosure
                  for a pair of speaker drivers, a systems and strategic
                  design project looking at the lives of sex workers in
                  Madrid, and a body of more conventional product work in
                  lighting, furniture and household objects. I am comfortable
                  across hardware and software - physical fabrication,
                  acoustics, web, creative coding - and I write.
                </p>
              </SectionBlock>

              <SectionBlock title="Looking for">
                <p>
                  I'm based in London, available from summer 2026, and looking
                  for full-time work where design sensibility can be brought
                  to bear on complex technical or strategic problems: strategy
                  and communications consultancies with nuclear, energy or
                  deep-tech clients; design studios with technical or
                  industrial clients; in-house teams at nuclear operators and
                  energy-transition companies; and tech firms thinking
                  carefully about how their work gets understood by the
                  publics and policymakers they depend on.
                </p>
                <p>
                  I'm equally open to nuclear-adjacent work and to roles where
                  the subject changes but the method travels - AI
                  infrastructure, materials and mining, biotech, much of heavy
                  industry. The method is the constant; the subject changes.
                </p>
              </SectionBlock>

              <SectionBlock title="Background">
                <p>
                  Most recently, six months at Big Fish in London - a brand
                  and strategy studio - working on competitor research, market
                  audits and positioning for food-and-beverage clients.
                  Research first, then design, with stakeholder workshops in
                  between. Before that: paid-media analysis at Kandidly in
                  London, provenance research at Christie's furniture
                  department, and earlier assistant work in architecture and
                  buying. The common thread is producing work for
                  organisations that are both design and strategy-focused,
                  which has shaped how I think about producing for audiences
                  that don't already share the same visual vocabulary.
                </p>
              </SectionBlock>

              <SectionBlock title="Conversations and referrals">
                <p>
                  I'd genuinely like to keep the conversations that started in
                  the poster series going. The survey results, the design
                  decisions, the framings I rejected, what I'd do differently
                  if I were starting it again - all of that. Critique is
                  welcome, and useful. Referrals and job leads are equally
                  welcome; some of the most useful introductions I've had
                  came from people two or three steps removed from the role
                  itself.
                </p>
              </SectionBlock>

              <FormSection />

              <MetadataBlock />
            </motion.div>
          </div>
        </main>

        <SiteFooter />
      </PageTransition>
    </div>
  );
}
