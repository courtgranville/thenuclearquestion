# The Nuclear Question — Website Design Brainstorm

Three distinct design approaches for thenuclearquestion.com, a platform hosting six data-visualisation poster interventions from Court Granville's undergraduate thesis on nuclear energy communication.

---

<response>
<text>

## Idea 1: "Editorial Archive" — Dark Scholarly Journal

**Design Movement**: Inspired by long-form editorial platforms like The Pudding, ProPublica visual essays, and academic journal layouts — but rendered in a dark, modern aesthetic. Think of a high-end design publication crossed with a research archive.

**Core Principles**:
1. Content supremacy — the posters are the absolute centre of attention, everything else recedes
2. Typographic authority — serif headlines convey intellectual weight, monospace metadata conveys precision
3. Restrained palette — near-black backgrounds with warm cream accents that reference the poster backgrounds
4. Sequential reading — the site guides you through the series in its intended order (desirability → feasibility → objections)

**Colour Philosophy**: A near-black background (#0D0D0D) provides maximum contrast for the cream-toned posters, making them glow like illuminated manuscripts. Warm off-white (#F0EBE0) for primary text echoes the poster paper colour. A muted olive-green (#5A6B4A) as the sole accent colour references the nuclear-green used in the posters without being garish. The emotional intent is seriousness without severity — a space that feels considered, not cold.

**Layout Paradigm**: Vertical scroll with full-bleed poster sections. The landing page is a single strong statement + the thesis question. Each poster gets its own route/page with a generous left-column text panel and a right-dominant poster viewer. On mobile, this stacks vertically. No grid gallery — the posters are experienced one at a time, in sequence.

**Signature Elements**:
1. Thin horizontal rules as section dividers (referencing the poster methodology/legend separators)
2. Small numbered markers (001–006) used consistently as a wayfinding system
3. Pull-quotes from the thesis rendered in large italic serif, breaking the reading rhythm intentionally

**Interaction Philosophy**: Minimal and purposeful. No gratuitous hover effects. Click a poster to enter a full-screen lightbox viewer with zoom capability. Scroll-triggered fade-ins for text blocks only — the posters appear immediately, never delayed by animation. The site should feel like turning pages, not performing.

**Animation**: Subtle opacity transitions (300ms ease) for text entering the viewport. No parallax, no sliding, no bouncing. The poster images load with a brief fade from the background colour. Page transitions use a simple crossfade. The restraint is the point — this is a serious research project, not a portfolio showreel.

**Typography System**: 
- Headlines: "Playfair Display" (serif) — weight 700 for poster titles, weight 400 italic for subtitles
- Body: "IBM Plex Sans" — weight 400 for running text, weight 300 for captions and metadata
- Numbering/Data: "IBM Plex Mono" — for poster numbers, data citations, and technical annotations
- Hierarchy: Poster titles at 3rem, section headings at 1.5rem, body at 1.05rem, captions at 0.85rem

</text>
<probability>0.08</probability>
</response>

---

<response>
<text>

## Idea 2: "The Broadsheet" — Light Newsprint Editorial

**Design Movement**: Inspired by the visual language of quality broadsheet newspapers (The Guardian long reads, Financial Times special reports) and data journalism platforms. Light background, dense but readable typography, the poster content treated as front-page visual journalism.

**Core Principles**:
1. Journalistic credibility — the layout signals independence and editorial rigour
2. Readable density — information-rich without feeling cluttered, like a well-designed newspaper feature
3. Light and open — cream/warm white backgrounds that match the poster aesthetic directly
4. Horizontal rhythm — content organised in columns that reference newspaper layouts

**Colour Philosophy**: Warm off-white (#F5F0E8) as the primary background — identical to the poster backgrounds, creating seamless visual integration. Near-black (#1A1A1A) for body text. A deep forest green (#2D4A2D) as the primary accent, drawn from the nuclear-green in the posters but darkened for readability on light backgrounds. Occasional warm red (#8B3A3A) for critical/warning elements (referencing the mortality dots in Poster 003). The emotional intent is trustworthiness and openness — nothing is hidden.

**Layout Paradigm**: A newspaper-inspired asymmetric column structure. The homepage uses a large masthead with the thesis question, then a stacked editorial layout where each poster is introduced with a headline, a short text excerpt, and a cropped preview that invites clicking through. Individual poster pages use a two-column layout: narrow text column (roughly 35%) alongside a large poster viewer (65%). The text column scrolls independently of the poster.

**Signature Elements**:
1. A thin masthead bar at the top with "The Nuclear Question" set in a condensed serif, like a newspaper nameplate
2. Dotted leader lines connecting poster numbers to their titles (referencing the data annotation style in the posters)
3. Marginal notes — small annotations in the outer margin that provide additional context or source references

**Interaction Philosophy**: Functional and direct. Hover states are subtle colour shifts, not transformations. The poster viewer supports pinch-to-zoom on mobile and scroll-zoom on desktop. A sticky sidebar navigation shows your position in the series (001–006) at all times. Everything should feel like a well-made reading tool.

**Animation**: Almost none. Text appears immediately. The only motion is a smooth scroll when navigating between posters using the sidebar, and a gentle scale transition when opening the full poster view. The site loads fast and feels instant — like picking up a newspaper.

**Typography System**:
- Masthead: "DM Serif Display" — for the site title only
- Headlines: "Source Serif 4" (serif) — weight 600 for poster titles, weight 400 italic for subtitles/pull-quotes
- Body: "Source Sans 3" — weight 400 regular, weight 600 for emphasis
- Data/Captions: "Source Code Pro" — for technical annotations and source citations
- Hierarchy: Masthead at 2.5rem, poster titles at 2rem, body at 1rem, captions at 0.8rem

</text>
<probability>0.06</probability>
</response>

---

<response>
<text>

## Idea 3: "The Specimen" — Dark Museum Exhibition

**Design Movement**: Inspired by museum exhibition design and scientific specimen catalogues — the kind of careful, reverent presentation you see in natural history museums or the Wellcome Collection. Each poster is treated as an exhibit, with the website functioning as a curated walkthrough of the series.

**Core Principles**:
1. Reverence for the artefact — each poster is presented as a specimen to be studied, not scrolled past
2. Controlled reveal — information is layered, with the poster always primary and text secondary
3. Dark, immersive environment — the dark background functions like a gallery wall, making the cream posters luminous
4. Numbered sequence — the exhibition metaphor reinforces the intended reading order

**Colour Philosophy**: Deep charcoal (#111111) as the gallery wall. The posters' warm cream tones provide all the warmth the palette needs. Text in a soft warm white (#E8E2D8) that doesn't fight the poster colours. A single accent in muted gold (#B8A88A) for interactive elements and the numbering system — referencing museum label typography. No bright colours compete with the posters. The emotional intent is contemplation — this is a space for looking carefully.

**Layout Paradigm**: Full-viewport sections. The landing page is a dark field with the thesis title and a single downward invitation. Each poster occupies a full viewport height, centred, with a collapsible text panel that slides in from the left edge when activated. The default state is poster-dominant. Navigation is a vertical dot indicator on the right edge (like a museum floor plan). On mobile, posters are full-width with text below.

**Signature Elements**:
1. Museum-style labels — small, precisely positioned text blocks with a thin top border, containing poster title, number, and a one-line description
2. A subtle vignette/gradient at screen edges that draws focus to the centre where the poster sits
3. The numbering system (001–006) rendered large and faint in the background, like gallery room numbers

**Interaction Philosophy**: Deliberate and immersive. Clicking "Read more" on any poster slides in a text panel without leaving the poster view — the poster dims slightly but remains visible. Scroll between posters is snap-based (each poster snaps to fill the viewport). A zoom mode lets users explore poster details. The experience should feel like walking through rooms.

**Animation**: Smooth snap-scrolling between poster sections (500ms ease-out). Text panels slide in from the left (400ms). Poster images fade in with a very subtle scale (1.02 → 1.0) to create a sense of arrival. Background poster numbers have a slow parallax drift. All animation serves the exhibition metaphor — things are revealed, not thrown at you.

**Typography System**:
- Title: "Cormorant Garamond" (serif) — weight 600 for the site title and poster names
- Body: "Inter" weight 300/400 — clean and recessive, letting the posters dominate
- Labels: "Space Mono" — for poster numbers, metadata, and museum-style labels
- Hierarchy: Site title at 3.5rem, poster titles at 2rem, body at 0.95rem, labels at 0.75rem

</text>
<probability>0.04</probability>
</response>

---

## Selection

**Chosen approach: Idea 1 — "Editorial Archive" (Dark Scholarly Journal)**

This approach best serves the thesis project for several reasons. The dark background provides maximum contrast for the cream-toned posters, making them the undeniable focal point. The sequential, one-poster-per-page structure respects the thesis's carefully constructed narrative arc from desirability to feasibility to objections. The editorial tone — serious but not sterile — matches the "truth-teller" positioning of the thesis itself. And the typographic system (Playfair Display + IBM Plex Sans/Mono) provides the intellectual authority the content demands without feeling corporate or activist.

Critically, this approach avoids the two failure modes the thesis identifies: it doesn't look like industry PR (no glossy corporate aesthetic) and it doesn't look like activist opposition (no alarm colours or protest energy). It looks like what it is — an independent, research-grounded design project presented with care.
