# FISSION_BRIEF.md - The Fission Room

## What this file is

A persistent brief for Claude Code (and any other AI session in this repo) on the Fission Room - the immersive interactive page at `/fission`. Read this together with `CLAUDE.md` at the start of any session touching the room. Where this brief and `CLAUDE.md` overlap, `CLAUDE.md` wins for project-level conventions; this brief governs the room itself.

## The goal

Build a self-contained immersive page at `/fission` that lets the visitor inject neutrons into a particle representation of Court's organic nucleus form and watch fission cascade through it. The page operates as a "dark room" inside the otherwise cream editorial site, accessible from a single entrance below the poster thumbnails on the homepage.

The room is not decorative. It enacts three things the printed posters cannot:

1. The scale of energy release in fission, in honest units, in real time.
2. The role of neutron moderation in distinguishing a controlled reactor from a runaway reaction.
3. The role of spatial geometry (critical mass) in self-sustaining chain reactions.

All three are real physics. The room does not argue for or against nuclear power. It exposes what the technology actually does, and lets the visitor reason from there. This is consistent with the truth-teller commitment that governs the rest of the site.

## Visual system - the bounded inversion

The cream editorial system is inverted only in this room. Specifically:

- Background: `#0A0A0A` (a fraction off pure black, so bloom has somewhere to bottom out)
- Particles, body text, slider labels, counter glyphs: `#ECE7DF`
- The accent palette is unchanged - `#1c3867`, `#217b3d`, `#a51e22`, `#b5822e`, `#4a6e70`, `#7d736a`, `#5C7A8A`. Use these only for state indicators: an excited particle is briefly tinted `#a51e22` (red, the danger / energy-release accent), a moderated/cold particle is tinted `#4a6e70` (teal, calm). Most particles are cream most of the time. The accent flashes are the visual punctuation, not the baseline.
- Typography: **Playfair Display** + **Playfair**, exactly as the rest of the site. No mono. No sans. The energy counter is set in Playfair at `text-lg`, its caption at `text-sm`.
- Punctuation in all UI copy: hyphens with spaces, never em-dashes or en-dashes.
- Vignette: a faint radial gradient darkening the corners by about 30% - subtle enough not to read as effect, just enough to focus attention centrally.

The inversion is scoped strictly to `/fission` and the homepage entrance band. The rest of the site stays cream.

## Architecture and file layout

Follow the flat structure already in use. No new subfolders inside `components/` or `lib/`.

New files to create:

```
scripts/
  extract-fission-form.mjs

client/public/assets/
  main-icon-dark.svg                  <- source asset, copied in

client/src/assets/
  fission-form-points.json            <- build output

client/src/pages/
  Fission.tsx                         <- the route

client/src/components/
  FissionScene.tsx                    <- R3F scene root
  FissionParticles.tsx                <- the particle cloud renderer
  FissionNeutrons.tsx                 <- visible neutrons
  FissionPostFx.tsx                   <- bloom + vignette
  FissionModeratorSlider.tsx          <- UI control
  FissionEnergyCounter.tsx            <- UI readout
  FissionQualityGate.tsx              <- entry quality toggle
  FissionEntrance.tsx                 <- homepage teaser band
  FissionReturn.tsx                   <- small "return" link

client/src/lib/
  fissionEngine.ts                    <- framework-free physics
  fissionTuning.ts                    <- TUNING constants
  fissionShaders.ts                   <- vertex / fragment strings
  fissionPhysicsConstants.ts          <- real-world constants
  useFissionEngine.ts                 <- React hook wrapper
```

Modify:

```
client/src/pages/Home.tsx             <- add <FissionEntrance /> below thumbnails
client/src/App.tsx (or router file)   <- register /fission route
package.json                          <- add the three runtime deps below
```

Dependencies to add (pnpm):

```
three
@react-three/fiber
@react-three/drei
@react-three/postprocessing
postprocessing
svg-path-properties           <- build-time only, devDependency
```

`svg-path-properties` is the cleanest Node-side equivalent of `getTotalLength()` / `getPointAtLength()`. It runs in the extraction script. It does not need to be in the runtime bundle.

## Branch and deployment

One feature branch for the whole room: `feature/fission-room`. Do not merge to `main` until Court has reviewed a Cloudflare branch preview deployment. Cloudflare auto-deploys `main`; the branch deploy preview is the gate.

`pnpm install`, `pnpm dev`, `pnpm build`, `pnpm preview` must all pass locally before opening the PR. If `pnpm build` fails locally, it will fail on Cloudflare.

## Phased build

The room is built in phases. Each phase is a single Claude Code session worth of work. Mark a phase complete before moving to the next. If a phase blocks, surface the blocker rather than improvising past it.

### Phase 1 - Extraction pipeline

Goal: turn the SVG into a flat JSON of normalised 2D points.

**Source asset.** Copy the SVG into the repo:

```bash
cp "/Users/courtgranville/Desktop/003_academics/[1]_IE/YEAR 4/THESIS/DATA-VISUALISATION/assets/main-icon-dark.svg" client/public/assets/main-icon-dark.svg
```

(Note the bracket characters in the path; quote the whole thing.)

**The script.** Create `scripts/extract-fission-form.mjs`:

- Reads `client/public/assets/main-icon-dark.svg` as text.
- Parses out every `<path d="...">` element. A small regex is fine here; the SVG has no nested SVG namespaces or transforms. Do not pull in a full SVG parser for this.
- For each path, instantiate `svgPathProperties` and walk by arc length at a uniform interval `SAMPLE_INTERVAL`. **The 15k - 60k point band is the binding constraint, not the interval value.** For the current source artwork (251 paths, ~211k combined SVG-unit length), interval `10` lands at ~42k points, mid-band. Adjust the constant if the source artwork changes; never push the total outside the band.
- For each sample, record `[x, y]` in viewBox coordinates.
- The viewBox is `0 0 1190.55 1190.55`. Two-pass normalisation: first pass computes the centroid in viewBox coordinates and the form's actual bounding radius (max distance from centroid). Second pass translates the centroid to `(0, 0)` and **divides by that bounding radius** so the form spans exactly `[-1, +1]` by construction. This is what lets the downstream tuning constants (`CASCADE_RADIUS`, `RECOHERE_BAND`, `CURSOR_RADIUS`, ...) read as fractions of the form's own width. SVG y is flipped to y-up to match Three.js. Store the inverse transform (`centroid`, `boundingRadiusInViewBox`) on the payload so cursor screen-coords can be mapped back later.
- Output to `client/src/assets/fission-form-points.json`:

```json
{
  "count": 42591,
  "boundingRadius": 1.0,
  "viewBox": {
    "width": 1190.55,
    "height": 1190.55,
    "centroid": { "x": 600.36, "y": 577.58 },
    "boundingRadiusInViewBox": 382.35
  },
  "positions": [x0, y0, x1, y1, x2, y2, ...]
}
```

`positions` is a flat 1D array, length `count * 2`. This is the shape Three.js wants for a `BufferAttribute`. Do not store as nested `[[x,y],...]` - that doubles the JSON size and forces a flatten step on every load.

Log to stdout at the end: total path count, total point count, average points per path, form radius in viewBox units (with its % of viewBox half-width), and the post-normalisation bounding radius (≈ 1.0 by construction).

**Acceptance criteria:**

- `node scripts/extract-fission-form.mjs` runs to completion and writes the JSON.
- Total point count is between 15,000 and 60,000. (If higher, increase the arc-length interval; if lower, decrease.)
- Spot-check: run `node scripts/fission-spotcheck.mjs` to write `scripts/fission-spotcheck.svg` and open it (`open scripts/fission-spotcheck.svg`). The form is unmistakably the nucleus. If it's not, the sampling or normalisation is wrong - fix before proceeding. The SVG output is gitignored; regenerate any time.

### Phase 2 - Route scaffold

Goal: the page exists at `/fission`, renders the right wrapper, has a quality gate, can be exited.

Create `Fission.tsx`:

- Full-viewport dark background `#0A0A0A`.
- `<FissionQualityGate />` overlay shown on first mount, blocking the scene until the visitor picks a quality.
- `<FissionScene quality={quality} />` underneath, lazy-mounted only after quality is chosen.
- `<FissionReturn />` top-right - a small Playfair cream link, "Return", going to `/`.
- Eyebrow top-left, `text-sm tracking-[0.25em] uppercase`, content `//01 - Fission, observed`.
- Bottom-left: `<FissionEnergyCounter />`.
- Bottom-right: `<FissionModeratorSlider />`.
- Persistent at-rest body copy block, lower-centre, max-width `28rem`, three short lines. Default content (replace later with Court's revised wording):

> Click anywhere on the form to inject a neutron.
> Slow the neutron with the moderator to see chains run away.
> Spacing the nuclei changes everything.

The block fades out at 50% opacity once the visitor has clicked once - it's instructional scaffolding, not permanent UI.

`<FissionQualityGate />`: a centred Playfair prompt - "Choose a quality for the room." - and three large text buttons: Low, Medium, High. Save the choice to localStorage under `fission.quality`. If a stored value exists on a future visit, skip the gate. Mobile devices auto-select Low without showing the gate.

Register the route in the router. The `/fission` path is not added to the main site nav - it's reached only from `<FissionEntrance />`.

### Phase 3 - The scene

Goal: a Three.js canvas with the particles at rest, breathing gently.

`FissionScene.tsx` is the R3F scene root:

```tsx
<Canvas
  orthographic
  camera={{ zoom: 220, position: [0, 0, 10] }}
  gl={{ antialias: false, alpha: false, powerPreference: "high-performance" }}
  dpr={[1, quality === 'high' ? 2 : 1.5]}
>
  <color attach="background" args={[0x0A0A0A]} />
  <FissionParticles quality={quality} />
  <FissionNeutrons />
  <FissionPostFx />
</Canvas>
```

Orthographic camera because we're rendering a 2D form in a 3D engine; perspective would distort the nucleus. `zoom` 220 puts the normalised `[-1,+1]` form at roughly 220 pixels - the right scale is calibrated in `fissionTuning.ts`.

`FissionParticles.tsx`:

- Loads `fission-form-points.json` at mount via static import.
- Allocates four typed arrays sized `count`:
  - `positions: Float32Array(count * 3)` - particle xyz, z always 0
  - `rests: Float32Array(count * 2)` - rest xy, never mutated after init
  - `velocities: Float32Array(count * 2)` - mutated each frame
  - `states: Uint8Array(count)` - 0=bound, 1=excited, 2=released, 3=recohering
- Builds a `<points>` mesh with a `<bufferGeometry>` consuming `positions` and a custom `<shaderMaterial>` from `fissionShaders.ts`.
- On every `useFrame(({ clock }, dt))`, calls `fissionEngine.step(dt)` then marks `geometry.attributes.position.needsUpdate = true`.

At this phase the engine only does breathing: a low-amplitude curl-noise displacement of each particle around its rest position. No clicks, no neutrons. Just a softly-living cloud in the shape of the nucleus.

Performance check: at this stage, on Medium quality (target ~28k presented particles, drawn from the 42k base cloud via the `particleScale` thinning in Phase 11), the page should run at locked 60fps on a 2023 MacBook Pro. If it doesn't, the bottleneck is the physics step (CPU, JS loop) and we need to switch to GPGPU before going further. Re-evaluate at this checkpoint. With additive blending and bloom (Phase 5), 28k cream-glowing points reads as significantly denser than the raw count suggests; the brief earlier hypothesised 150k particles but the bounded base count makes that the wrong target.

### Phase 4 - Shaders

Goal: particles look like soft glowing points, not aliased pixels.

`fissionShaders.ts` exports two strings.

**Vertex shader:**

```glsl
attribute vec2 aRest;
attribute float aState;        // 0..3
attribute float aPhase;        // per-particle random in [0, 2pi]

uniform float uTime;
uniform float uPointSize;

varying float vState;
varying float vIntensity;

void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  // Size scales mildly with state (excited = bigger), mildly with breathing
  float breath = 0.92 + 0.08 * sin(uTime * 0.6 + aPhase);
  float stateBonus = aState > 0.5 ? 1.6 : 1.0;
  gl_PointSize = uPointSize * breath * stateBonus;

  vState = aState;
  vIntensity = aState > 0.5 ? 1.0 : 0.55;
}
```

**Fragment shader:**

```glsl
varying float vState;
varying float vIntensity;

uniform vec3 uColorBound;       // cream #ECE7DF
uniform vec3 uColorExcited;     // red #a51e22
uniform vec3 uColorCold;        // teal #4a6e70

void main() {
  // gl_PointCoord is [0,1]^2 over the point sprite
  vec2 d = gl_PointCoord - 0.5;
  float r = length(d);
  if (r > 0.5) discard;

  // Soft disc: smoothstep falloff with bright core
  float alpha = smoothstep(0.5, 0.0, r);
  alpha = pow(alpha, 1.7);

  vec3 color = uColorBound;
  if (vState > 1.5) {
    color = mix(uColorBound, uColorCold, 0.7);  // released = cooled
  } else if (vState > 0.5) {
    color = uColorExcited;                       // excited = red
  }

  gl_FragColor = vec4(color * vIntensity, alpha);
}
```

`<shaderMaterial>` config:

```
blending: THREE.AdditiveBlending
depthTest: false
depthWrite: false
transparent: true
```

Uniforms: `uTime`, `uPointSize`, `uColorBound`, `uColorExcited`, `uColorCold`. `uPointSize` is tuned per quality - rough starting values: Low 2.4, Medium 1.8, High 1.4 (higher density = smaller points).

### Phase 5 - Post-processing

Goal: the cloud glows. The room feels cinematic but not aggressive.

`FissionPostFx.tsx`:

```tsx
<EffectComposer>
  <Bloom
    intensity={1.2}
    luminanceThreshold={0.0}
    luminanceSmoothing={0.4}
    mipmapBlur
  />
  <Vignette
    offset={0.3}
    darkness={0.4}
  />
</EffectComposer>
```

Tuning notes:

- `luminanceThreshold: 0` means every pixel contributes to bloom - the cream particles will all glow. This is what we want.
- `intensity` is the dial that turns "cinematic" into "kitsch." `1.2` is a starting point. If the room reads like a video game opening, lower it to 0.8. If it reads dead, push to 1.4 but not beyond.
- Vignette is sparing - 0.3 offset, 0.4 darkness. Strong vignettes read as filter; subtle ones read as photography.

Performance: on Low quality, disable bloom entirely. Bloom is the single most expensive effect; skipping it on low-end devices is the difference between 60fps and 25fps.

### Phase 6 - Physics engine

Goal: the framework-free particle physics that drives everything.

`fissionEngine.ts` is the heart of the room. It is not a React component. It is a plain TypeScript class that holds typed arrays, exposes a `step(dt)` method, and lets React read the latest state via the buffer attributes it manages.

**Public API:**

```ts
class FissionEngine {
  constructor(opts: {
    points: Float32Array;        // from JSON, x0,y0,x1,y1,...
    count: number;
    quality: Quality;
  });

  positions: Float32Array;        // size count*3 (xyz)
  states: Uint8Array;             // size count
  rests: Float32Array;            // size count*2

  injectNeutron(x: number, y: number, dx: number, dy: number): void;
  step(dt: number, cursor: {x: number, y: number} | null): void;

  energyMeV: number;              // accumulated total
  liveNeutrons: number;
  liveExcited: number;

  setModeratorRatio(r: number): void;   // 0..1, controls cascade probability
}
```

**Per-frame `step(dt)`:**

1. **Update neutrons.** Move each live neutron by `vel * dt`. If its lifetime exceeds `MAX_NEUTRON_LIFE_MS` or it leaves the world bounds, kill it. If it enters within `NEUTRON_HIT_RADIUS` of any bound particle, kill the neutron, mark that particle `excited`.
2. **Cascade.** For each particle in state `excited`:
   - If `excitedSince` is within the reaction window (e.g. 80-200ms):
     - Find neighbours within `CASCADE_RADIUS` (tuned to roughly the inter-cellular distance in the form).
     - For each neighbour in state `bound`, roll a uniform random number. If less than `cascadeProbability * moderatorRatio`, excite the neighbour.
     - Emit `NEUTRONS_PER_FISSION` neutrons (2 or 3) in random outward directions with `NEUTRON_SPEED`.
     - Increment `energyMeV` by `ENERGY_PER_FISSION_MEV` (200).
     - Transition this particle to `released` state.
   - If the window has elapsed without releasing, transition to `released` anyway.
3. **Apply forces to each particle:**
   - Spring toward rest: `F = SPRING_K * (rest - pos)` for `bound` and `recohering`; weaker for `excited` and `released`.
   - Damping: `F -= DAMPING * vel`.
   - Cursor magnetism: if cursor is non-null and within `CURSOR_RADIUS`, push particle away from cursor with strength inverse-square of distance, capped.
   - Released particles get a brief radial outward kick at the moment of release - this is the "boom" of the fission event.
   - Brownian breath: low-amplitude curl noise based on particle index and time. This is what makes the cloud feel alive at rest.
4. **Integrate:** `vel += F * dt / mass`, `pos += vel * dt`. Mass is 1 for bound, 0.6 for excited/released (lighter, more reactive).
5. **Recohere:** any released particle that has been outside its rest radius for more than `RECOHERE_DELAY_MS` and is now within `RECOHERE_BAND` of rest transitions back to `bound`. This is the "form re-forms" pass.

All constants live in `fissionTuning.ts` so they can be hot-tuned without touching the engine code:

```ts
export const TUNING = {
  SPRING_K: 4.5,
  DAMPING: 0.86,
  CURSOR_RADIUS: 0.12,
  CURSOR_FORCE: 0.8,
  CASCADE_RADIUS: 0.025,
  CASCADE_PROBABILITY_BASE: 0.18,
  REACTION_WINDOW_MS: 120,
  RECOHERE_DELAY_MS: 1800,
  RECOHERE_BAND: 0.015,
  NEUTRON_SPEED: 1.8,
  NEUTRON_HIT_RADIUS: 0.012,
  NEUTRONS_PER_FISSION: 2,
  ENERGY_PER_FISSION_MEV: 200,
  MAX_LIVE_NEUTRONS: 600,
};
```

These numbers are starting points. Expect to spend an hour tuning them once the engine runs end-to-end. The room either feels right or it doesn't, and the difference between right and wrong is entirely in this file.

`MAX_LIVE_NEUTRONS` is a hard cap. If the cascade tries to spawn more, drop them silently. Without this cap, an aggressive cascade can spawn tens of thousands of neutrons and tank the frame rate.

### Phase 7 - Neutron injection on click

Goal: click → neutron → impact → fission.

In `FissionScene.tsx`, listen for `onPointerDown` on the canvas. Convert the screen coordinates to world coordinates via `unproject` against the orthographic camera. Spawn a neutron at that world point, with velocity pointed toward the nearest bound particle (find via brute force - it's fine at 200k, faster with a coarse spatial grid if needed).

Visualise the neutron as a small bright cream-white point with a fading trail. `FissionNeutrons.tsx` is a separate `<points>` mesh, sized to `TUNING.MAX_LIVE_NEUTRONS`, with its own simpler shader (no state colouring, just brightness fading with age).

### Phase 8 - Moderator slider

Goal: the visitor controls the cascade probability and sees the effect.

`FissionModeratorSlider.tsx` is a horizontal slider, bottom-right of the page, around 280px wide. Track is a thin cream line; thumb is a small filled cream circle. Label above, Playfair `text-sm`: `Neutron speed`. Tick marks at left and right, labelled `Fast` and `Slow` in Playfair `text-sm`.

Underneath the slider, a short caption (max 60 words, Playfair, `text-sm`, cream at 70% opacity):

> Real reactors slow neutrons with a moderator - water, graphite, heavy water - because slow neutrons are vastly more likely to cause fission. Move the slider. The line between a controlled reaction and a runaway one is the line between a reactor and a weapon.

The slider value `0..1` maps to `moderatorRatio` in the engine. At 0 (fast), `cascadeProbability * moderatorRatio` is near zero - chains die out almost immediately. At 1 (slow), the multiplier is at full strength and chains cascade freely. The midpoint is where the room is most interesting: chains sometimes propagate, sometimes don't, and the visitor can feel the threshold.

Default slider position on first visit: 0.5. Restore the visitor's last position on subsequent visits via localStorage.

### Phase 9 - Multiple nuclei

Goal: spatial criticality.

In Phase 3 you mounted a single nucleus centred at origin. Now spawn three to five nuclei at offsets:

```ts
const nucleiCenters = [
  { x: -0.55, y:  0.15, scale: 0.42 },
  { x:  0.50, y:  0.30, scale: 0.45 },
  { x:  0.20, y: -0.40, scale: 0.40 },
  { x: -0.30, y: -0.55, scale: 0.38 },
  // optional fifth
];
```

Each nucleus is a copy of the same point cloud, scaled down and translated. The engine treats them as one combined particle population - so a neutron freed from nucleus A can fly across the room and trigger fission in nucleus B if it travels far enough without dying.

Add a second slider, above the moderator slider: `Spacing`. Range 0.4 to 1.4. Multiplies all `nucleiCenters` offsets. At low spacing, the nuclei are packed and chains cross between them easily. At high spacing, they're isolated and each cascade dies inside its own form. This is critical mass, demonstrated. Caption:

> When nuclei are close enough, a neutron from one can trigger another. Together they can sustain a reaction that no single nucleus could. This is critical mass. Move them apart and the reaction extinguishes itself.

### Phase 10 - Energy counter

Goal: the energy released, in calibrated units, in real time.

`FissionEnergyCounter.tsx`, bottom-left. A small two-line Playfair readout:

```
Energy released
1.23 GeV
```

Larger value, `text-2xl`. Subtle caption above, `text-sm` at 60% opacity.

`fissionPhysicsConstants.ts` defines:

```ts
export const CONSTANTS = {
  MEV_TO_J: 1.602e-13,           // joules per MeV
  J_PER_100W_BULB_SEC: 100,      // joules to power 100W bulb for 1s
  G_U235_PER_MEV: 8.519e-25,     // grams of U-235 per MeV released (approx)
};
```

When `energyMeV < 1000`: show as `xxx MeV`.
When `< 10^6`: show as `xxx GeV`.
When `< 10^9`: show as `xxx TeV` and add a sub-caption: `equivalent to powering a 100W bulb for x seconds`.
When higher: add a second sub-caption: `equivalent to fissioning about y mg of uranium-235`.

The point of this layered readout is to translate scary-looking physics numbers into things humans can reason about. Every conversion is calibrated to real constants. None of these numbers are invented.

### Phase 11 - Quality toggle, mobile, reduced motion

Goal: the room runs honestly on the hardware it's served to.

Quality presets (in `fissionTuning.ts`):

```ts
export const QUALITY = {
  low:    { particleScale: 0.33, bloom: false, pixelRatio: 1.0,  maxNeutrons: 150, multiNucleus: false },
  medium: { particleScale: 0.66, bloom: true,  pixelRatio: 1.5,  maxNeutrons: 350, multiNucleus: true  },
  high:   { particleScale: 1.0,  bloom: true,  pixelRatio: 2.0,  maxNeutrons: 600, multiNucleus: true  },
};
```

`particleScale` thins out the point cloud. With the current 42k base, Low presents ~14k particles, Medium ~28k, High ~42k. On a low-end device this is the difference between 60fps and a slideshow. The point sizes in Phase 4 (Low 2.4 / Medium 1.8 / High 1.4) stay as starting values - tune visually once Phase 5's bloom is in.

Mobile detection: if `window.matchMedia('(pointer: coarse)').matches` or viewport width < 768px, force `low` and skip the quality gate. Touch is also a different interaction model - on mobile, tap-to-spawn-neutron works fine, but cursor magnetism becomes "swipe magnetism" (last touchmove position is the cursor).

Reduced motion: if `window.matchMedia('(prefers-reduced-motion: reduce)').matches`, replace the canvas with a static SVG render of the form, captioned: `This room contains a physics simulation. You've requested reduced motion, so it's been replaced with this still image. The simulation can be enabled in the room settings.` Then a small button: `Enable anyway`. Respecting reduced motion is non-optional.

Page Visibility API: pause the engine when the tab is hidden (`document.visibilityState !== 'visible'`). Resume on focus. Without this, the engine eats battery on background tabs.

### Phase 12 - Homepage entrance

Goal: the door to the room, below the poster thumbnails on the homepage, not too hidden.

`FissionEntrance.tsx` is a full-bleed section component, dropped into `Home.tsx` immediately after the poster thumbnails grid and before the site footer.

Layout:

- Full viewport width, height 480px (desktop) / 360px (mobile).
- Background `#0A0A0A` - a hard dark band on cream creates the visual cue that something different lives here.
- A small WebGL canvas inside the band, centred, 320×320px. It runs a reduced version of the fission cloud - same point loader, same particles at rest, breathing gently, no interaction, no bloom. Quality forced to `Low` for the homepage to keep the cost down.
- Above the canvas: Playfair eyebrow `//07 - Fission, observed`, cream, `text-sm tracking-[0.25em] uppercase`.
- Below the canvas: a single sentence in Playfair, cream, `text-lg italic`:

> The thesis ends with words. This is what they don't say.

- Below that: a cream "Enter" link, Playfair, `text-base`, with a subtle right-arrow glyph. Hover: arrow translates right by 4px and the canvas's particles ripple outward briefly.

The `//07` numbering positions the room as the natural extension of the 001-006 poster series - a seventh, embodied entry. If you'd rather not extend that numbering, fall back to `//ROOM I - Fission, observed`. Court's call.

The teaser canvas should pause when out of viewport (`IntersectionObserver`) and resume on scroll-into-view. Otherwise it's burning frames the visitor can't see.

### Phase 13 - Copy pass

Goal: every word in the room is in Court's voice and passes the truth-teller test.

There are six copy surfaces in the room:

1. **Eyebrow:** `//07 - Fission, observed` (or `//ROOM I - ...`)
2. **Onboarding hint** (centre, lower): the three lines from Phase 2, to be revised by Court.
3. **Moderator caption:** the 60-word block from Phase 8, to be revised by Court.
4. **Spacing caption:** the 50-word block from Phase 9, to be revised by Court.
5. **Energy counter caption:** "Energy released" and the conversion sub-captions.
6. **Reduced motion fallback:** the 30-word block from Phase 11.

All copy: hyphens with spaces, no em-dashes. Match Court's voice as documented in `CLAUDE.md` - long flowing sentences, thinking-aloud quality, intentionally imperfect rather than polished. Stop and ask Court to write or sign off these blocks rather than improvising them in the same AI voice the supervisor flagged previously.

### Phase 14 - Pre-deploy checklist

Before opening the PR:

- [ ] `pnpm install` clean
- [ ] `pnpm dev` runs and the room is reachable at `localhost:5173/fission`
- [ ] `pnpm build` completes with no errors
- [ ] `pnpm preview` and the room works against the production build
- [ ] FPS on Medium quality is ≥ 55 on a recent laptop
- [ ] Mobile Low quality renders, tap injects neutrons, sliders are reachable
- [ ] `prefers-reduced-motion` returns the static SVG fallback
- [ ] Tab-hide pauses the engine (verify via console log toggle)
- [ ] All copy uses hyphens with spaces, no em-dashes
- [ ] All typography is Playfair Display or Playfair, no fallback fonts have leaked in
- [ ] The homepage entrance renders below the poster thumbnails, runs at Low, pauses out-of-viewport
- [ ] The route is not in the main nav
- [ ] No console errors or React warnings on either page

Open PR. Tag Court. Court reviews the Cloudflare branch preview. Only then merge to `main`.

## What to skip if running out of runway

If the build stalls and a defendable subset has to ship:

**Must ship:** Phases 1-7 (extraction, route, scene, shaders, post-fx, engine, click-to-spawn), Phase 13 (copy), Phase 14 (deploy checklist), and a minimum version of Phase 12 (homepage entrance can be a static image and link if the live preview canvas is too costly).

**Should ship:** Phase 8 (moderator slider) - this is the page's single strongest pedagogical hook.

**Can defer:** Phase 9 (multi-nucleus), Phase 10 (full energy-counter conversions - can ship with just MeV), Phase 11 (quality toggle - can hard-code Medium initially).

If multi-nucleus is deferred, drop the Spacing slider from the UI rather than show a non-functional control.

## Honest risks

- **Shader debugging time.** GLSL errors are unforgiving. Budget half a day for the shader phase even though the code above looks short.
- **Performance ceiling on integrated graphics.** Some 2018-era MacBooks with Intel integrated GPUs will struggle on Medium even with bloom off. The Low preset is essential.
- **The slider names matter pedagogically.** "Fast/Slow" for the moderator slider is technically right but reads as ambiguous out of context. If Court wants to retitle to "Unmoderated / Moderated" that's clearer at cost of some technical compression. His call.
- **Cascade tuning is artistic, not algorithmic.** No equation tells you what `CASCADE_PROBABILITY_BASE` should be. The room is "right" when the cascade sometimes runs away and sometimes extinguishes at the midpoint of the moderator slider. Expect to iterate on tuning until that feel lands.

---

End of brief.
