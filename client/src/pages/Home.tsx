// client/src/pages/Home.tsx
import { useEffect, useRef, useState } from 'react';
import { Link } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import IntroAnimation from '@/components/IntroAnimation';
import ScrollProgress from '@/components/ScrollProgress';
import PageTransition from '@/components/PageTransition';
import { NucleusHero } from '@/components/NucleusHero';
import { IsotopeToggle } from '@/components/IsotopeToggle';
import { posters } from '@/lib/posterData';
import nucleusPaths from '@/assets/nucleus-paths.json';

const ISOTOPE_KEY = 'tnq.isotope';
const INTRO_KEY = 'intro-seen';

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

export default function Home() {
  useEffect(() => {
    document.title = 'The Nuclear Question - A Data Visualisation Series';
  }, []);

  // Intro splash: only show on first visit per session (matches existing pattern).
  const [introComplete, setIntroComplete] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return sessionStorage.getItem(INTRO_KEY) === '1';
  });

  // Isotope state, persisted to localStorage.
  const [isotope, setIsotope] = useState<0 | 1>(0);
  useEffect(() => {
    const saved = localStorage.getItem(ISOTOPE_KEY);
    if (saved === '0' || saved === '1') setIsotope(Number(saved) as 0 | 1);
  }, []);
  useEffect(() => {
    localStorage.setItem(ISOTOPE_KEY, String(isotope));
  }, [isotope]);

  // Fission hint: visible for 10s after switching to U-238.
  const [hintVisible, setHintVisible] = useState(false);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (hintTimer.current) clearTimeout(hintTimer.current);
    if (isotope === 1) {
      setHintVisible(true);
      hintTimer.current = setTimeout(() => setHintVisible(false), 10_000);
    } else {
      setHintVisible(false);
    }
    return () => { if (hintTimer.current) clearTimeout(hintTimer.current); };
  }, [isotope]);

  const onIntroComplete = () => {
    sessionStorage.setItem(INTRO_KEY, '1');
    setIntroComplete(true);
  };

  return (
    <>
      {!introComplete && <IntroAnimation onComplete={onIntroComplete} />}

      <ScrollProgress />
      <SiteHeader />

      <PageTransition>
        <main>
          <section className="hero" id="hero">
            <div className="hero-stack">
              <NucleusHero
                paths={nucleusPaths as string[]}
                isotope={isotope}
              >
                <div className="tweaks-anchor">
                  <IsotopeToggle value={isotope} onChange={setIsotope} />
                </div>

                <AnimatePresence>
                  {hintVisible && (
                    <motion.div
                      className="fission-hint"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const }}
                    >
                      <span className="fission-hint-text">
                        Shake your mouse<br />to split the atom
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </NucleusHero>

              <motion.div
                variants={stagger}
                initial="hidden"
                animate={introComplete ? 'show' : 'hidden'}
                className="hero-stack-text"
              >
                <motion.div className="hero-eyebrow" variants={fadeUp}>
                  A Data-Visualisation Series
                </motion.div>

                <motion.h1 className="hero-title" variants={fadeUp}>
                  How Can Design Be Used to Discuss the Feasibility of a Nuclear-Powered Future?
                </motion.h1>

                <motion.div className="hero-body" variants={fadeUp}>
                  <p>
                    Six data-visualisation posters drawing on peer-reviewed and
                    government data, presenting the nuclear question in a visual
                    language accessible to the public. The series examines
                    desirability and feasibility in turn, concluding by honestly
                    addressing objections rather than advocating for a position.
                  </p>
                </motion.div>

                <motion.div className="hero-sig" variants={fadeUp}>
                  Court Granville<span className="sep">·</span>2026
                </motion.div>
              </motion.div>
            </div>
          </section>

          <section className="ribbon-section" id="posters">
            <div className="poster-stack">
              {posters.map((p, i) => {
                // First four posters are landscape, last two are portrait.
                const orient = i < 4 ? 'landscape' : 'portrait';
                return (
                  <Link key={p.id} href={`/poster/${p.id}`}>
                    <article className={`poster ${orient}`}>
                      <img
                        src={p.imagePath}
                        alt={p.title}
                        loading={i === 0 ? 'eager' : 'lazy'}
                      />
                      <div className="caption">
                        <div className="num">Poster {p.number}</div>
                        <div className="ttl">{p.title}</div>
                      </div>
                    </article>
                  </Link>
                );
              })}
            </div>
          </section>

          <section className="coda-section">
            <div className="max-w-2xl mx-auto px-6 text-left">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                <p
                  className="text-sm tracking-[0.25em] uppercase text-primary mb-6"
                  style={{ fontFamily: "'Playfair', Georgia, serif" }}
                >
                  Why this project exists
                </p>
                <p
                  className="text-base leading-relaxed text-foreground/80 mb-6"
                  style={{ fontFamily: "'Playfair', Georgia, serif", fontWeight: 300 }}
                >
                  The UK's flagship nuclear reactor, Hinkley Point C, has reportedly spent £700 million on fish mitigation systems, saving an estimated "0.083 salmon and 0.028 sea trout per year". Whether the figure is precisely accurate or not, it defines the industry's public and political perception today. In a single number, it captures how the conversation about nuclear energy in this country has come to miss the bigger picture - and how badly the way we talk about contested technologies has failed the public who pay for them.
                </p>
                <p
                  className="text-base leading-relaxed text-foreground/80"
                  style={{ fontFamily: "'Playfair', Georgia, serif", fontWeight: 300 }}
                >
                  This series is one designer's attempt to do that conversation differently. It argues that public reasoning about nuclear improves when both the strengths and the weaknesses of the technology are named honestly - when the designer behaves as a truth-teller rather than an advocate, an industry spokesperson, or an opponent. The six posters above are the practical evidence of that argument. Each one names what its data can and cannot tell you. None of them tries to settle the question for you.
                </p>

                {/* Editorial close - centred from here down */}
                <div className="text-center mt-16">
                  <div
                    className="text-foreground/40 mb-10 select-none"
                    aria-hidden="true"
                    style={{
                      fontFamily: "'Playfair', Georgia, serif",
                      letterSpacing: '0.6em',
                      fontSize: '14px',
                    }}
                  >
                    ·&nbsp;&nbsp;·&nbsp;&nbsp;·
                  </div>

                  <p
                    className="text-xl md:text-2xl italic text-foreground/85 mb-10"
                    style={{ fontFamily: "'Playfair', Georgia, serif", fontWeight: 400 }}
                  >
                    Want to learn more about the project or get in touch?
                  </p>

                  <div className="flex flex-col sm:flex-row gap-6 sm:gap-12 items-center justify-center">
                    <Link
                      href="/contact"
                      className="inline-flex items-baseline gap-2 group transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current"
                      style={{
                        fontFamily: "'Playfair', Georgia, serif",
                        color: '#1c3867',
                        fontSize: 'clamp(20px, 2vw, 24px)',
                        textDecoration: 'none',
                        fontWeight: 400,
                      }}
                    >
                      <span className="border-b border-transparent group-hover:border-current pb-0.5 transition-colors duration-200">
                        Get in touch
                      </span>
                      <span className="inline-block transition-transform duration-200 group-hover:translate-x-1">
                        →
                      </span>
                    </Link>

                    <Link
                      href="/about"
                      className="inline-flex items-baseline gap-2 group transition-colors duration-200 text-foreground/60 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current"
                      style={{
                        fontFamily: "'Playfair', Georgia, serif",
                        fontSize: 'clamp(20px, 2vw, 24px)',
                        textDecoration: 'none',
                        fontWeight: 400,
                      }}
                    >
                      <span className="border-b border-transparent group-hover:border-current pb-0.5 transition-colors duration-200">
                        About the project
                      </span>
                      <span className="inline-block transition-transform duration-200 group-hover:translate-x-1">
                        →
                      </span>
                    </Link>
                  </div>
                </div>
              </motion.div>
            </div>
          </section>
        </main>
      </PageTransition>

      <SiteFooter />
    </>
  );
}
