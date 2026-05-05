import { motion, useInView } from "framer-motion";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import ScrollProgress from "@/components/ScrollProgress";
import PageTransition from "@/components/PageTransition";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { useRef } from "react";

/*
  DESIGN: Editorial Archive — Light Scholarly Journal
  About page with page transition and scroll progress.
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
        className="font-serif text-xl mb-4"
      >
        {title}
      </h2>
      <div
        className="space-y-4 text-sm leading-relaxed text-foreground/80"
        style={{
          fontFamily: "'Montserrat', sans-serif",
          fontWeight: 300,
        }}
      >
        {children}
      </div>
    </motion.div>
  );
}

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <ScrollProgress />

      <PageTransition>
        <main className="pt-14">
          <div className="container">
            <div className="pt-8 pb-4">
              <Link href="/">
                <span className="group inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200">
                  <ArrowLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform duration-200" />
                  <span style={{ fontFamily: "'Montserrat', sans-serif" }}>
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
                  style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                >
                  About This Project
                </span>
              </motion.div>

              <motion.h1
                variants={fadeUp}
                className="font-serif text-3xl lg:text-4xl leading-tight mb-4"
              >
                The Nuclear Question
              </motion.h1>

              <motion.p
                variants={fadeUp}
                className="text-base text-muted-foreground mb-8 italic font-serif"
              >
                How can design be used to discuss the feasibility of a
                nuclear-powered future?
              </motion.p>

              <motion.div variants={fadeUp}>
                <hr className="border-border mb-8" />
              </motion.div>

              <motion.div
                variants={fadeUp}
                className="space-y-5 text-sm leading-relaxed text-foreground/80 mb-10"
                style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontWeight: 300,
                }}
              >
                <p>
                  This project investigates how design can facilitate public
                  discourse on the feasibility of a nuclear-powered future in the
                  UK. It takes seriously the position set out in the pathways of
                  the Climate Change Committee and the National Energy System
                  Operator that nuclear energy is likely essential to the UK's
                  timely decarbonisation. It asserts that longstanding failures in
                  communicating nuclear technology from industry and government,
                  compounded by public fear, have hindered progress. Consequently,
                  it operates within a newly emerging policy window and
                  communications framework that are not yet equipped to seize this
                  opportunity, and are further defined by an industry whose track
                  record on delivery and waste has not yet earned the public trust
                  that the policy window now requires.
                </p>
                <p>
                  The project presents three main arguments. First, the primary
                  constraint on nuclear energy's role in the UK's transition is no
                  longer technological, but communicative and economic. Second, the
                  conversation itself has fallen apart up to this point — the
                  industry's responses have typically been defensive, opposition to
                  nuclear power has relied on absolute arguments and fearmongering,
                  and both parties have failed to engage a public whose perception
                  of risk is shaped more by emotion than by statistics. Third,
                  there is an emerging role for design that sits between these two
                  positions, one that neither industry nor activists are well placed
                  to fill. This is not a role of advocacy or opposition, but of
                  creating the conditions in which the public can reason
                  independently through empathetic and deliberate design and
                  argumentative principles. The project describes this as the
                  epistemic facilitator, truth-teller and honest role.
                </p>
                <p>
                  The design intervention comprises six data-visualisation posters
                  based on peer-reviewed and government data. The series examines
                  desirability and feasibility in sequence, concluding by
                  addressing objections to nuclear energy rather than advocating for
                  it. Using a data-based approach, it argues that when one observes
                  objective per-unit data on emissions, land use, water use and
                  mortality rates — each source's process is excluded and only
                  results are considered — nuclear and renewables outperform
                  alternatives on the metrics that matter most. Answering the
                  feasibility question requires discussing the scale of the UK's
                  energy transition and the country's historical pattern of
                  announcing plans it fails to fulfil.
                </p>
                <p>
                  This is not intended as an argument for or against nuclear
                  energy. Instead, it offers a practical example of how design can
                  facilitate discussion about the feasibility of a nuclear-powered
                  future in a way unavailable to either industry or activists, and
                  provides a model that other designers might adapt for this or
                  other technologies.
                </p>
              </motion.div>

              <motion.div variants={fadeUp}>
                <hr className="border-border mb-8" />
              </motion.div>

              <SectionBlock title="My Position">
                <p>
                  Positioning the designer as a truth-teller is not a comfortable
                  role to take. It requires honest acknowledgement of where genuine
                  scientific debate exists, empathy for public fears, and the
                  willingness to push back against both industry narratives and
                  environmental opposition when each oversimplifies the picture in
                  service of a position.
                </p>
                <p>
                  My starting view is that nuclear power is likely needed in
                  Britain, though it cannot alone meet the 2050 climate goals. I do
                  not believe nuclear alone is sufficient, and I am open to being
                  wrong. Openness to challenge and reliance on a data-driven
                  narrative strengthen the truth-teller framework and ensure
                  transparency for readers. This is why the narrative is grounded in
                  the data landscape, rather than framed by argument. If my own
                  position were foregrounded, the work would shift toward advocacy,
                  and research shows that advocacy on this subject is ineffective.
                </p>
                <p>
                  I must continually ask myself: am I helping people see the truth,
                  or am I becoming a more sophisticated propagandist for a position
                  I already hold?
                </p>
              </SectionBlock>

              <SectionBlock title="Theoretical Foundation">
                <p>
                  The following theoretical concepts form the foundation of this
                  project's argument: Paul Slovic's psychometric paradigm, Dan
                  Kahan's cultural cognition, Miranda Fricker's concept of
                  epistemic injustice, and Michel Foucault's parrhesia. By
                  analysing these, the project argues that the designer's role is
                  to act as an "epistemic facilitator" — someone who creates
                  conditions for better public reasoning and understanding of
                  contested technologies. This role requires the designer to
                  carefully balance scientific evidence and emotional concerns,
                  providing accessible information that encourages informed
                  discussion rather than advocacy or propaganda.
                </p>
                <p>
                  Drawing on Foucault's concept of parrhesia, the truth-teller
                  speaks honestly, even at personal risk. This honesty comes from
                  genuine conviction, not persuasion. The designer here is a
                  truth-teller who communicates about nuclear energy with honest
                  acknowledgement of scientific disagreement, empathy for public
                  fears, and a willingness to critique both industry narratives and
                  environmentalist obstruction.
                </p>
              </SectionBlock>

              <SectionBlock title="Visual Language">
                <p>
                  Inspired by the designs of Federica Fragapane, Paolo Ciuccarelli,
                  and Kate Crawford, this approach uses raw, reliable data as its
                  core tenet, without shying away from the academic and technical
                  necessity of the arguments being made. It favours an empathetic,
                  relatable style, where data is represented in organic forms that
                  often use proportionality to make data arguments more emotional
                  for the viewer. It enables relationships, such as the 173×
                  difference between coal and nuclear emissions, to be seen and felt
                  tangibly.
                </p>
                <p>
                  The visualisation approach is grounded in Moholy-Nagy's idea that
                  intellect and feeling should be balanced rather than separated,
                  applied to data that the public is entitled to access but rarely
                  encounters in a usable or tangible form.
                </p>
              </SectionBlock>

              <motion.div variants={fadeUp}>
                <hr className="border-border mb-8" />
              </motion.div>

              <motion.div variants={fadeUp}>
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
      </PageTransition>
    </div>
  );
}
