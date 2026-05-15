import { motion, useInView } from "framer-motion";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import ScrollProgress from "@/components/ScrollProgress";
import PageTransition from "@/components/PageTransition";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { useRef } from "react";

/*
  DESIGN: Editorial Archive - Light Scholarly Journal
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
        className="font-serif text-2xl mb-4"
        style={{ fontWeight: 600 }}
      >
        {title}
      </h2>
      <div
        className="space-y-4 text-base leading-relaxed text-foreground/80"
        style={{
          fontFamily: "'Playfair', Georgia, serif",
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
        <main className="pt-[72px]">
          <div className="container">
            <div className="pt-8 pb-4">
              <Link href="/">
                <span className="group inline-flex items-center gap-2 text-base text-muted-foreground hover:text-foreground transition-colors duration-200">
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
                  className="text-sm tracking-[0.25em] uppercase text-primary mb-6 block"
                  style={{ fontFamily: "'Playfair', Georgia, serif" }}
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
                className="space-y-5 text-base leading-relaxed text-foreground/80 mb-10"
                style={{
                  fontFamily: "'Playfair', Georgia, serif",
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
                  conversation itself has fallen apart up to this point - the
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
                  mortality rates - each source's process is excluded and only
                  results are considered - nuclear and renewables outperform
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
                  to act as an "epistemic facilitator" - someone who creates
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

              <SectionBlock title="Methodology">
                <p>
                  This thesis combined three strands of work. A literature review
                  across risk communication, design ethics and energy policy
                  mapped the theoretical foundation - Slovic on the affect
                  heuristic and risk perception, Kahan on cultural cognition,
                  Fricker on epistemic injustice, and Foucault on parrhesia. A
                  precedent analysis identified earlier attempts to communicate
                  nuclear technology to the public, both from industry and from
                  activist positions, and where each fell short. A primary
                  research phase gathered evidence directly from people who would
                  be the audience for the work, and from practitioners who
                  already operate at the relevant edges of the conversation.
                </p>
                <p>
                  The primary research had two components. The first was an
                  online survey of 59 UK respondents conducted in March 2026,
                  asking how each respondent perceived nuclear energy, what
                  shapes their trust in a source of information about it, and
                  how they reacted to three different framings of the same
                  factual claim. The sample was directional rather than
                  statistically representative and skewed mildly pro-nuclear.
                  The findings should be read as signals rather than proof; they
                  were used to confirm or challenge intuitions developed in the
                  literature review, not to settle questions in isolation. The
                  second component was two semi-structured expert interviews:
                  one with a practitioner in nuclear project finance, and one
                  with a practitioner in nuclear public-affairs and PR. The
                  interviews surfaced where the industry's own communicators see
                  the conversation going wrong.
                </p>
                <p>
                  The poster series itself was developed iteratively, with each
                  poster passing through multiple drafts and being tested
                  against the truth-teller principle established by the
                  theoretical framework. Decisions made during the design phase
                  - what to include, what to leave out, how to render
                  uncertainty, how to declare each poster's weaknesses honestly
                  - are documented in the per-poster sections of the written
                  thesis and surface in the "More on this poster" blocks
                  beneath each visualisation on the site.
                </p>
              </SectionBlock>

              <SectionBlock title="Survey Findings">
                <p>
                  The survey's most consistent result was that the truth-teller
                  framing - text that named both the strengths and the
                  weaknesses of nuclear energy honestly - won all three
                  communication comparisons against alternative framings. The
                  margins were escalating rather than constant: 50% preferred
                  the truth-teller framing when discussing nuclear safety, 62%
                  when discussing waste, and 75% when discussing the climate
                  case for nuclear. The pattern matters more than the individual
                  percentages. The more contested the subject, the larger the
                  preference for honesty about the weakness of the argument
                  being made. When asked directly what drives their trust in a
                  source of information about nuclear energy, 55% of respondents
                  named "the source acknowledges both strengths and weaknesses
                  of the argument" as their primary criterion.
                </p>
                <p>
                  The single most striking finding from the survey was that not
                  a single respondent - 0% - listed the nuclear industry itself
                  as a trusted source of information. This is the operating
                  problem the design intervention responds to. If the people
                  best positioned to communicate technical information about a
                  technology have no public credibility on it, the conversation
                  has to be carried by someone else. The thesis argues that
                  that someone else can be the designer, working as an
                  epistemic facilitator.
                </p>
                <p>
                  A subtler finding was the limit of the knowledge-attitude
                  link. 65% of respondents wrongly believed that nuclear waste
                  remains dangerous for millions of years - including 92% of
                  respondents who described themselves as supportive of nuclear
                  power. The factual misconception is not concentrated among
                  opponents; it is shared across the political spectrum. This
                  challenges the deficit model assumption that giving people
                  more accurate information will move their attitudes in
                  proportion. People can be wrong about specific facts and
                  still hold a coherent position on a contested technology. The
                  series accordingly treats accurate information as a starting
                  condition for good public reasoning, not as the answer to it.
                </p>
              </SectionBlock>

              <SectionBlock title="How to Read the Series">
                <p>
                  The six posters trace a single argument across three phases:
                  desirability, feasibility, and objections. Posters 001 through
                  003 ask whether nuclear is a desirable part of the UK's
                  electricity mix, measured against lifecycle emissions,
                  physical costs in land and water, and human mortality from
                  the act of generating electricity. Posters 004 and 005 ask
                  whether a nuclear-powered future is feasible at the scale
                  that climate timelines require, given how much of UK energy
                  is not electricity in the first place and given the
                  historical pattern of UK nuclear projects being announced and
                  abandoned. Poster 006 closes by addressing the objection that
                  most strongly survives the previous arguments: nuclear waste
                  and what the UK does and does not have an answer to.
                </p>
                <p>
                  Each poster names its own question. Poster 001 compares the
                  lifecycle greenhouse-gas emissions of nine electricity
                  sources, making visible the gap between nuclear at 5.6
                  gCO₂/kWh and coal at 970. Poster 002 places land use and
                  water consumption on the same chart to demonstrate that no
                  single source wins on every measure. Poster 003 models three
                  UK electricity scenarios - today's mix, 30% nuclear, 70%
                  nuclear (France's current share) - and counts the lives
                  saved by displacing the deadliest sources. Poster 004 shifts
                  the unit of analysis from electricity to all UK final energy,
                  showing that the electricity system the previous posters
                  discussed is only 18% of the problem. Poster 005 maps every
                  civil reactor the UK has ever built, operated, planned, or
                  abandoned, and asks what the failure pattern of the last 31
                  years says about feasibility. Poster 006 inverts the
                  volume-and-radioactivity relationship of UK radioactive waste
                  and asks why the country that built the world's first
                  commercial reactor still has nowhere permanent to put what
                  came out of it.
                </p>
                <p>
                  The series does not aim to present a complete argument for or
                  against nuclear power, nor does the thesis behind it. Its aim
                  is to give a concrete example of how design can be used to
                  discuss the feasibility of a contested technology - in this
                  case nuclear - in a way unavailable to either the industry
                  that builds it or the activists who oppose it. If read as a
                  closed argument it has gaps: the density of treatment given
                  to waste is greater than that given to emissions or physical
                  costs; the scenarios in Poster 003 are deliberately stylised;
                  the historical analysis in Poster 005 is the most editorially
                  loaded of the six. Those gaps are not accidents. The series
                  responds to the audience the research identified - the
                  casually informed UK adult who knows there is a debate and
                  does not know where to turn - and to the trust pattern that
                  audience reported: they prefer sources that name what they
                  cannot tell them, alongside what they can.
                </p>
              </SectionBlock>


            </motion.div>
          </div>
        </main>

        <SiteFooter />
      </PageTransition>
    </div>
  );
}
