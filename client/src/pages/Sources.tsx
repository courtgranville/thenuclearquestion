import { Link } from "wouter";
import { motion } from "framer-motion";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import ScrollProgress from "@/components/ScrollProgress";
import PageTransition from "@/components/PageTransition";
import { ArrowLeft } from "lucide-react";

/*
  DESIGN: Editorial Archive - Light Scholarly Journal
  Sources page: Full reference list for all six posters.
  Layout: Centred column (max-w-3xl) with left-aligned text, matching poster pages.
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

export default function Sources() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <ScrollProgress />

      <PageTransition>
        <main className="pt-[72px]">
          <div className="container">
            <div className="max-w-3xl mx-auto">
              {/* Back link */}
              <div className="pt-8 pb-4">
                <Link href="/">
                  <span className="group inline-flex items-center gap-2 text-base text-muted-foreground hover:text-foreground transition-colors duration-200">
                    <ArrowLeft className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform duration-200" />
                    <span style={{ fontFamily: "'Playfair', Georgia, serif" }}>
                      Back to series
                    </span>
                  </span>
                </Link>
              </div>

              {/* Title section */}
              <motion.div
                initial="hidden"
                animate="visible"
                variants={stagger}
                className="pb-8 text-left"
              >
                <motion.div variants={fadeUp}>
                  <p
                    className="text-sm tracking-[0.25em] uppercase text-primary mb-4"
                    style={{ fontFamily: "'Playfair', Georgia, serif" }}
                  >
                    Sources & References
                  </p>
                </motion.div>

                <motion.h1
                  variants={fadeUp}
                  className="font-serif text-3xl lg:text-4xl leading-tight mb-6"
                  style={{ fontWeight: 600 }}
                >
                  How This Series Was Built
                </motion.h1>

                <motion.p
                  variants={fadeUp}
                  className="text-base leading-relaxed text-foreground/80 mb-6"
                  style={{
                    fontFamily: "'Playfair', Georgia, serif",
                    fontWeight: 300,
                  }}
                >
                  This page lists every dataset, study, and reference used across the six posters of{" "}
                  <em>The Nuclear Question</em>. The series argues that public reasoning about nuclear
                  energy improves when people can see the working - so the working is here. Any number,
                  any ranking, any statement of fact in the posters can be traced back to its origin in
                  the list below.
                </motion.p>

                <motion.p
                  variants={fadeUp}
                  className="text-base leading-relaxed text-foreground/80"
                  style={{
                    fontFamily: "'Playfair', Georgia, serif",
                    fontWeight: 300,
                  }}
                >
                  The sources are organised first by type - primary datasets, peer-reviewed studies,
                  and theoretical references - and then poster by poster. Direct links and access dates
                  are given where applicable. The series is built almost entirely on government data,
                  peer-reviewed assessments, and tracked open datasets; where any source is contested or
                  limited, the limitation is named.
                </motion.p>
              </motion.div>

              {/* How to verify */}
              <motion.div
                initial="hidden"
                animate="visible"
                variants={stagger}
                className="pb-10 text-left"
              >
                <motion.div variants={fadeUp}>
                  <hr className="border-border mb-8" />
                </motion.div>

                <motion.h2
                  variants={fadeUp}
                  className="font-serif text-xl mb-4"
                  style={{ fontWeight: 600 }}
                >
                  How to verify any claim
                </motion.h2>

                <motion.p
                  variants={fadeUp}
                  className="text-base leading-relaxed text-foreground/80 mb-4"
                  style={{
                    fontFamily: "'Playfair', Georgia, serif",
                    fontWeight: 300,
                  }}
                >
                  Each poster references its sources in two places: a short methodology block printed
                  on the poster itself, and a Sources block at the foot of its page on this site. The
                  foot-of-page block links back to the relevant entry on this page, where you'll find
                  the original publication, dataset, or document.
                </motion.p>

                <motion.p
                  variants={fadeUp}
                  className="text-base leading-relaxed text-foreground/80"
                  style={{
                    fontFamily: "'Playfair', Georgia, serif",
                    fontWeight: 300,
                  }}
                >
                  Where data is government-published and updates over time, the access date tells you
                  which version of the data informed the poster.
                </motion.p>
              </motion.div>

              {/* Primary datasets */}
              <motion.div
                initial="hidden"
                animate="visible"
                variants={stagger}
                className="pb-10 text-left"
              >
                <motion.div variants={fadeUp}>
                  <hr className="border-border mb-8" />
                </motion.div>

                <motion.h2
                  variants={fadeUp}
                  className="font-serif text-xl mb-6"
                  style={{ fontWeight: 600 }}
                >
                  Primary datasets
                </motion.h2>

                <motion.p
                  variants={fadeUp}
                  className="text-base leading-relaxed text-foreground/80 mb-6"
                  style={{
                    fontFamily: "'Playfair', Georgia, serif",
                    fontWeight: 300,
                  }}
                >
                  The six posters draw on a small number of canonical datasets, each used in more than
                  one piece. They are listed once here in full and referenced back to in the per-poster
                  lists below.
                </motion.p>

                <motion.div variants={fadeUp} className="space-y-4">
                  <Citation
                    text="Department for Energy Security and Net Zero (DESNZ). (2025). Digest of United Kingdom Energy Statistics (DUKES) 2025. UK Government."
                    url="https://www.gov.uk/government/collections/digest-of-uk-energy-statistics-dukes"
                  />
                  <Citation
                    text="Ember. (2024). Yearly Electricity Data."
                    url="https://ember-energy.org/data/yearly-electricity-data/"
                  />
                  <Citation
                    text="Global Energy Monitor. (2025). Global Nuclear Power Tracker."
                    url="https://globalenergymonitor.org/projects/global-nuclear-power-tracker/"
                  />
                  <Citation
                    text="Intergovernmental Panel on Climate Change (IPCC). (2014). Climate Change 2014: Mitigation of Climate Change. Working Group III contribution to the Fifth Assessment Report, Annex II - Metrics and Methodology. Cambridge University Press."
                    url="https://www.ipcc.ch/site/assets/uploads/2018/02/ipcc_wg3_ar5_annex-ii.pdf"
                  />
                  <Citation
                    text="Nuclear Decommissioning Authority (NDA). (2022). UK Radioactive Waste and Materials Inventory 2022."
                    url="https://ukinventory.nda.gov.uk/"
                  />
                  <Citation
                    text="Our World in Data. (2024). Energy."
                    url="https://ourworldindata.org/energy"
                  />
                  <Citation
                    text="United Nations Economic Commission for Europe (UNECE). (2021). Carbon Neutrality in the UNECE Region: Integrated Life-cycle Assessment of Electricity Sources."
                    url="https://unece.org/sites/default/files/2022-04/LCA_3_FINAL%20March%202022.pdf"
                  />
                  <Citation
                    text="World Nuclear Association. (2025). Nuclear Power in the United Kingdom."
                    url="https://world-nuclear.org/information-library/country-profiles/countries-t-z/united-kingdom.aspx"
                  />
                </motion.div>
              </motion.div>

              {/* By poster */}
              <motion.div
                initial="hidden"
                animate="visible"
                variants={stagger}
                className="pb-10 text-left"
              >
                <motion.div variants={fadeUp}>
                  <hr className="border-border mb-8" />
                </motion.div>

                <motion.h2
                  variants={fadeUp}
                  className="font-serif text-xl mb-8"
                  style={{ fontWeight: 600 }}
                >
                  By poster
                </motion.h2>

                {/* Poster 001 */}
                <PosterSourceSection
                  id="001"
                  title="The Emissions of Our Electricity Sources"
                  description="Lifecycle greenhouse gas emissions, in grams of CO₂-equivalent per kilowatt-hour, for nine electricity-generation sources."
                >
                  <SourceGroup title="Primary data">
                    <Citation text="Our World in Data (2024). Lifecycle emissions of electricity sources. [See Primary datasets above.]" />
                  </SourceGroup>
                  <SourceGroup title="Underlying assessments">
                    <Citation text="Intergovernmental Panel on Climate Change (2014). Climate Change 2014: Mitigation, Working Group III, Annex II. [See Primary datasets above.]" />
                    <Citation text="United Nations Economic Commission for Europe (2021). Carbon Neutrality in the UNECE Region: Integrated Life-cycle Assessment of Electricity Sources. [See Primary datasets above.]" />
                  </SourceGroup>
                  <Limitations>
                    Every value on this poster is a median across many lifecycle assessments of real
                    plants. Actual emissions from any single facility vary by site, fuel grade,
                    construction era, and the carbon intensity of the local grid that built it. The 5.6
                    vs 970 gCO₂/kWh ratio between nuclear and coal is a comparison of central
                    estimates; both numbers carry uncertainty bands the poster does not draw.
                    Operational-only emissions - the figure most commonly cited in public - would
                    understate fossil fuels (which leak methane upstream) and misrepresent nuclear and
                    renewables (whose emissions are mostly in construction and materials, not running
                    the plant). The choice to use lifecycle figures is a methodological commitment, not
                    a neutral one.
                  </Limitations>
                </PosterSourceSection>

                {/* Poster 002 */}
                <PosterSourceSection
                  id="002"
                  title="The Physical Cost of a Megawatt-Hour"
                  description="Lifecycle land use and water consumption per megawatt-hour, for seven electricity-generation sources."
                >
                  <SourceGroup title="Primary data">
                    <Citation
                      text="Our World in Data (2024). Land use per energy source."
                      url="https://ourworldindata.org/land-use-per-energy-source"
                    />
                  </SourceGroup>
                  <SourceGroup title="Underlying assessment">
                    <Citation text="United Nations Economic Commission for Europe (2021). Carbon Neutrality in the UNECE Region: Integrated Life-cycle Assessment of Electricity Sources. [See Primary datasets above.]" />
                  </SourceGroup>
                  <Limitations>
                    Land and water figures are derived from typical-project profiles, not measurements
                    at a single plant. Nuclear's water consumption depends heavily on cooling design -
                    coastal plants using seawater lose almost nothing, while inland plants with cooling
                    towers lose far more; siting alone can swing the number by an order of magnitude.
                    Hydropower's land footprint is the surface area of its reservoir, which is a
                    load-bearing comparison but an awkward one - a reservoir is also a water store, a
                    flood control system, and (often) a recreational asset, not only a generation
                    footprint. Solar PV figures are for ground-mount installations; rooftop PV has
                    near-zero additional land use. Land <em>used</em> and land{" "}
                    <em>unavailable for other uses</em> are not always the same thing - particularly
                    for solar farms with grazing or pollinator co-location.
                  </Limitations>
                </PosterSourceSection>

                {/* Poster 003 */}
                <PosterSourceSection
                  id="003"
                  title="The Lives We Could Save"
                  description="UK electricity-related mortality across three energy-mix scenarios, holding demand constant at 284 TWh."
                >
                  <SourceGroup title="Primary data">
                    <Citation
                      text="Our World in Data (2024). Energy deaths."
                      url="https://ourworldindata.org/safest-sources-of-energy"
                    />
                    <Citation text="Ember (2024). Yearly Electricity Data - UK. [See Primary datasets above.]" />
                  </SourceGroup>
                  <SourceGroup title="Underlying studies">
                    <Citation
                      text="Markandya, A., & Wilkinson, P. (2007). Electricity generation and health. The Lancet, 370(9591), 979 - 990."
                      url="https://doi.org/10.1016/S0140-6736(07)61253-7"
                    />
                    <Citation
                      text="Sovacool, B. K., Andersen, R., Sorensen, S., Sorensen, K., Tienda, V., Vainorius, A., Schirach, O. M., & Bjørn-Thygesen, F. (2016). Balancing safety with sustainability: assessing the risk of accidents for modern low-carbon energy systems. Journal of Cleaner Production, 112, 3952 - 3965."
                      url="https://doi.org/10.1016/j.jclepro.2015.07.059"
                    />
                  </SourceGroup>
                  <Limitations>
                    Death rates per terawatt-hour are modelled, not counted. Most of the deaths the
                    poster attributes to fossil-fuel electricity - particularly air-pollution mortality
 - are statistical attributions made through epidemiological models, not individually
                    identifiable. The Chernobyl and Fukushima figures used in the nuclear estimate are
                    themselves contested: published estimates range from a few thousand to over a
                    hundred thousand depending on methodology, and the central value used here is a
                    defensible median rather than a final answer. The two "what if" scenarios on the
                    right of the poster (30% and 70% nuclear) are counterfactuals, not predictions:
                    they hold UK electricity demand constant and substitute the generation mix, but
                    cannot capture the political, economic, and technical conditions required to reach
                    those mixes in practice. The European-average death rates per TWh are applied at UK
                    demand scale; UK-specific rates would be slightly different.
                  </Limitations>
                </PosterSourceSection>

                {/* Poster 004 */}
                <PosterSourceSection
                  id="004"
                  title="Most of Our Energy Isn't Electricity"
                  description="UK final energy consumption in 2024, broken down by carrier (petroleum, natural gas, electricity, etc.) and by end-use sector."
                >
                  <SourceGroup title="Primary data">
                    <Citation text="Department for Energy Security and Net Zero (2025). Digest of UK Energy Statistics (DUKES) 2025, Tables 1.1.1, 1.1.3, and 1.1.5. [See Primary datasets above.]" />
                  </SourceGroup>
                  <Limitations>
                    This poster shows <em>final</em> energy - energy delivered to end users at the
                    point of consumption - rather than <em>primary</em> energy, which would be
                    approximately 50% larger because it includes conversion losses at power stations.
                    The two are equally legitimate framings of "how much energy the UK uses," but they
                    answer different questions; the choice of final energy is what makes the 18%
                    electricity figure visible. Non-energy use of petroleum (52.7 TWh - feedstock for
                    petrochemicals, lubricants, bitumen, waxes) is shown as where UK petroleum{" "}
                    <em>physically goes</em>, not as combusted energy; this is flagged on the poster
                    itself but worth flagging here too. The figures are for 2024 as published in DUKES
                    2025; subsequent updates may revise them. The poster also excludes imported
                    emissions and consumption-based footprints - the UK's energy use as measured here
                    does not include the energy embedded in the goods it imports, which adds significant
                    additional fossil-fuel demand to the country's true footprint.
                  </Limitations>
                </PosterSourceSection>

                {/* Poster 005 */}
                <PosterSourceSection
                  id="005"
                  title="Where Are All Britain's Reactors?"
                  description="Every civil nuclear reactor the UK has built, operated, planned, or abandoned between 1953 and 2026."
                >
                  <SourceGroup title="Primary data">
                    <Citation text="Global Energy Monitor (2025). Global Nuclear Power Tracker. [See Primary datasets above.]" />
                  </SourceGroup>
                  <SourceGroup title="Supporting sources">
                    <Citation
                      text="Department for Energy Security and Net Zero (2024). Civil Nuclear: Roadmap to 2050."
                      url="https://www.gov.uk/government/publications/civil-nuclear-roadmap-to-2050"
                    />
                    <Citation text="World Nuclear Association (2025). Nuclear Power in the United Kingdom. [See Primary datasets above.]" />
                  </SourceGroup>
                  <Limitations>
                    The data records <em>what happened</em>, not <em>why</em>. A cancelled project in
                    this dataset looks the same whether the developer walked away, the government
                    killed it, the local council blocked it, or the programme simply lapsed and was
                    quietly dropped from policy. The poster preserves that ambiguity - the reasons for
                    cancellation are too varied and too politically contested to encode on a single
                    chart, and many of them are not in the underlying data at all. "Announced" is also
                    a permissive category: it includes ministerial statements, white papers, formal
                    planning applications, and industry proposals, with no consistent threshold for
                    what counts. Capacity figures (MW) are nameplate values, not realised generation.
                    Several of the reactors in the dataset went through multiple status changes -
                    planned, then cancelled, then revived under a different consortium - and the poster
                    shows the most recent status, which is itself sometimes contested.
                  </Limitations>
                </PosterSourceSection>

                {/* Poster 006 */}
                <PosterSourceSection
                  id="006"
                  title="Britain's Nuclear Waste"
                  description="UK radioactive waste by where it comes from, what it is, and where it ends up."
                >
                  <SourceGroup title="Primary data">
                    <Citation text="Nuclear Decommissioning Authority (2022). UK Radioactive Waste and Materials Inventory 2022. [See Primary datasets above.]" />
                  </SourceGroup>
                  <SourceGroup title="Radiation dose figures">
                    <Citation
                      text="UK Health Security Agency. Ionising radiation dose comparisons."
                      url="https://www.gov.uk/government/publications/ionising-radiation-dose-comparisons"
                    />
                    <Citation
                      text="Office for Nuclear Regulation. Radiation regulation guidance."
                      url="https://www.onr.org.uk/"
                    />
                    <Citation
                      text="International Atomic Energy Agency (2014). The Safety Case and Safety Assessment for the Disposal of Radioactive Waste, Specific Safety Guide No. SSG-23."
                      url="https://www-pub.iaea.org/MTCD/Publications/PDF/Pub1553_web.pdf"
                    />
                  </SourceGroup>
                  <SourceGroup title="Sellafield cleanup cost and MSSS leak figures">
                    <Citation
                      text="National Audit Office (2024). The Nuclear Decommissioning Authority's management of the Sellafield site."
                      url="https://www.nao.org.uk/reports/the-nuclear-decommissioning-authoritys-management-of-the-sellafield-site/"
                    />
                    <Citation text="House of Commons Public Accounts Committee (2025). Sellafield: Risk management and decommissioning progress." />
                  </SourceGroup>
                  <Limitations>
                    Waste volumes are as reported in the NDA's 2022 inventory; the figures will shift
                    in subsequent updates as decommissioning proceeds. Radiation doses are averages -
                    individual variation is significant, and the comparisons between everyday sources
                    and waste-package contact doses are illustrative. "Where it ends up" assumes the
                    planned Geological Disposal Facility will eventually be built; site selection is
                    not yet confirmed, and current projections place first waste emplacement between
                    2050 and 2060. The £136 billion Sellafield cleanup figure is the current
                    undiscounted estimate, which has been revised upward several times.
                  </Limitations>
                </PosterSourceSection>
              </motion.div>

              {/* Theoretical foundations */}
              <motion.div
                initial="hidden"
                animate="visible"
                variants={stagger}
                className="pb-10 text-left"
              >
                <motion.div variants={fadeUp}>
                  <hr className="border-border mb-8" />
                </motion.div>

                <motion.h2
                  variants={fadeUp}
                  className="font-serif text-xl mb-4"
                  style={{ fontWeight: 600 }}
                >
                  Theoretical foundations
                </motion.h2>

                <motion.p
                  variants={fadeUp}
                  className="text-base leading-relaxed text-foreground/80 mb-6"
                  style={{
                    fontFamily: "'Playfair', Georgia, serif",
                    fontWeight: 300,
                  }}
                >
                  The framing of the series - designer as epistemic facilitator, working in the
                  truth-teller tradition - is built on the following references.
                </motion.p>

                <motion.div variants={fadeUp} className="space-y-4">
                  <Citation
                    text="Foucault, M. (2001). Fearless speech (J. Pearson, Ed.). Semiotext(e)."
                    url="https://monoskop.org/images/b/ba/Foucault_Michel_Fearless_Speech.pdf"
                  />
                  <Citation text="Fricker, M. (2007). Epistemic injustice: Power and the ethics of knowing. Oxford University Press." />
                  <Citation text="Kahan, D. M. (2012). Cultural cognition as a conception of the cultural theory of risk. In S. Roeser, R. Hillerbrand, P. Sandin, & M. Peterson (Eds.), Handbook of risk theory (pp. 725 - 759). Springer." />
                  <Citation
                    text="Meadows, D. H. (1999). Leverage points: Places to intervene in a system. The Sustainability Institute."
                    url="https://www.donellameadows.org/wp-content/userfiles/Leverage_Points.pdf"
                  />
                  <Citation
                    text="Slovic, P. (1987). Perception of risk. Science, 236(4799), 280 - 285."
                    url="https://doi.org/10.1126/science.3563507"
                  />
                </motion.div>
              </motion.div>

              {/* Visual language references */}
              <motion.div
                initial="hidden"
                animate="visible"
                variants={stagger}
                className="pb-10 text-left"
              >
                <motion.div variants={fadeUp}>
                  <hr className="border-border mb-8" />
                </motion.div>

                <motion.h2
                  variants={fadeUp}
                  className="font-serif text-xl mb-6"
                  style={{ fontWeight: 600 }}
                >
                  Visual language references
                </motion.h2>

                <motion.div variants={fadeUp} className="space-y-4">
                  <Citation
                    text="Crawford, K., & Joler, V. (2018). Anatomy of an AI System."
                    url="https://anatomyof.ai/"
                  />
                  <Citation
                    text="Fragapane, F. Personal portfolio and published works."
                    url="https://www.behance.net/FedericaFragapane"
                  />
                  <Citation text="Lupi, G., & Posavec, S. (2016). Dear Data. Particular Books." />
                </motion.div>
              </motion.div>

              {/* What these sources can't tell us */}
              <motion.div
                initial="hidden"
                animate="visible"
                variants={stagger}
                className="pb-10 text-left"
              >
                <motion.div variants={fadeUp}>
                  <hr className="border-border mb-8" />
                </motion.div>

                <motion.h2
                  variants={fadeUp}
                  className="font-serif text-xl mb-4"
                  style={{ fontWeight: 600 }}
                >
                  What these sources can't tell us - the project level
                </motion.h2>

                <motion.p
                  variants={fadeUp}
                  className="text-base leading-relaxed text-foreground/80 mb-6"
                  style={{
                    fontFamily: "'Playfair', Georgia, serif",
                    fontWeight: 300,
                  }}
                >
                  The series is built on the best publicly available evidence, but evidence has limits.
                  Three patterns are worth naming together.
                </motion.p>

                <motion.div variants={fadeUp} className="space-y-5">
                  <div>
                    <p
                      className="text-base leading-relaxed text-foreground/80 mb-2"
                      style={{
                        fontFamily: "'Playfair', Georgia, serif",
                        fontWeight: 500,
                      }}
                    >
                      The data underneath is not always neutral.
                    </p>
                    <p
                      className="text-base leading-relaxed text-foreground/80"
                      style={{
                        fontFamily: "'Playfair', Georgia, serif",
                        fontWeight: 300,
                      }}
                    >
                      Lifecycle assessments make methodological choices - what counts as a system
                      boundary, how to allocate emissions across co-products, whether to include
                      construction emissions amortised over plant lifetime - that meaningfully change
                      the numbers. The choices used here are defensible and conventional, but they are
                      choices. Different choices, made transparently, would produce different posters.
                    </p>
                  </div>

                  <div>
                    <p
                      className="text-base leading-relaxed text-foreground/80 mb-2"
                      style={{
                        fontFamily: "'Playfair', Georgia, serif",
                        fontWeight: 500,
                      }}
                    >
                      Some of the most policy-relevant questions are not in the data at all.
                    </p>
                    <p
                      className="text-base leading-relaxed text-foreground/80"
                      style={{
                        fontFamily: "'Playfair', Georgia, serif",
                        fontWeight: 300,
                      }}
                    >
                      Why the UK announced thirty reactors after 1995 and built one (poster 005) is a
                      political and economic story the dataset cannot answer. Whether the GDF will be
                      ready when its waste arrives (poster 006) is a question the inventory cannot
                      resolve. The series presents what is measurable and signposts what is not, but it
                      does not pretend the unmeasurable is unimportant.
                    </p>
                  </div>

                  <div>
                    <p
                      className="text-base leading-relaxed text-foreground/80 mb-2"
                      style={{
                        fontFamily: "'Playfair', Georgia, serif",
                        fontWeight: 500,
                      }}
                    >
                      Counterfactuals are not predictions.
                    </p>
                    <p
                      className="text-base leading-relaxed text-foreground/80"
                      style={{
                        fontFamily: "'Playfair', Georgia, serif",
                        fontWeight: 300,
                      }}
                    >
                      Poster 003's mortality scenarios show what would happen <em>if</em> the UK grid
                      mix changed while demand stayed constant. They cannot tell you whether that
                      change is politically achievable, technically viable on the relevant timeline, or
                      socially desirable on terms that go beyond the body counts in the visualisation.
                    </p>
                  </div>
                </motion.div>

                <motion.p
                  variants={fadeUp}
                  className="text-base leading-relaxed text-foreground/80 mt-6"
                  style={{
                    fontFamily: "'Playfair', Georgia, serif",
                    fontWeight: 300,
                  }}
                >
                  These limits are not reasons to dismiss the data. They are reasons to read it with
                  the working visible - which is the purpose of this page.
                </motion.p>
              </motion.div>
            </div>
          </div>
        </main>

        <SiteFooter />
      </PageTransition>
    </div>
  );
}

/* ─── Helper components ─── */

function Citation({ text, url }: { text: string; url?: string }) {
  return (
    <p
      className="text-base leading-relaxed text-foreground/80 pl-4 border-l-2 border-border"
      style={{
        fontFamily: "'Playfair', Georgia, serif",
        fontWeight: 300,
      }}
    >
      {text}
      {url && (
        <>
          {" "}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-foreground transition-colors duration-200 break-all"
          >
            {url}
          </a>
        </>
      )}
    </p>
  );
}

function SourceGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <p
        className="text-sm tracking-[0.15em] uppercase text-muted-foreground mb-3"
        style={{ fontFamily: "'Playfair', Georgia, serif" }}
      >
        {title}
      </p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Limitations({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 mb-2">
      <p
        className="text-sm tracking-[0.15em] uppercase text-muted-foreground mb-3"
        style={{ fontFamily: "'Playfair', Georgia, serif" }}
      >
        What this can't tell us
      </p>
      <p
        className="text-base leading-relaxed text-foreground/60"
        style={{
          fontFamily: "'Playfair', Georgia, serif",
          fontWeight: 300,
        }}
      >
        {children}
      </p>
    </div>
  );
}

function PosterSourceSection({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div variants={fadeUp} className="mb-12" id={`poster-${id}`}>
      <div className="flex items-center gap-2.5 mb-2">
        <span
          className="text-sm tracking-[0.2em] uppercase text-muted-foreground"
          style={{ fontFamily: "'Playfair', Georgia, serif" }}
        >
          {id}
        </span>
      </div>
      <h3
        className="font-serif text-lg mb-2"
        style={{ fontWeight: 600 }}
      >
        {title}
      </h3>
      <p
        className="text-base italic text-muted-foreground mb-5"
        style={{
          fontFamily: "'Playfair', Georgia, serif",
          fontWeight: 300,
        }}
      >
        {description}
      </p>
      {children}
    </motion.div>
  );
}
