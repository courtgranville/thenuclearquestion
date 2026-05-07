// client/src/pages/Home.tsx
import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
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
    document.title = 'The Nuclear Question — A Data Visualisation Series';
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
                  How Can Design Be Used to Discuss the Feasibility of a{' '}
                  <em>Nuclear-Powered</em> Future?
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
        </main>
      </PageTransition>

      <SiteFooter />
    </>
  );
}
