/**
 * Oceanic Manta Rays, gliding and undulating gracefully along the course.
 *
 * Wide pectoral wings ripple in a travelling sine wave from anterior leading edge
 * to posterior wingtips. Two cephalic lobes (horns) at the mouth unfurl to channel
 * water, and a long slender whip tail trails behind with a gentle sinusoidal flex.
 *
 * Look, from above:
 *   - Cephalic lobes (horns) forward of the wide mouth
 *   - Swept diamond pectoral disc with undulating wingtips
 *   - Dorsal chevron shoulder patches and white wing borders
 *   - Long whip tail trailing behind
 *   - Pale underside vs dark midnight-blue dorsal skin
 *
 * Click / startle:
 *   A sudden deep, powerful wing stroke surges the manta forward while banking
 *   sharply away from the disturbance, shedding a ring of bioluminescent wake bubbles.
 */
import { SHARED_TUNING, type Animal, type Creature, type Flock } from "../flock";
import { INK_BODY, INK_DARK, INK_GLASS, INK_GLOW, INK_LIT, INK_SCALE, INK_SHIMMER, INK_SPOT, ink, type RGB } from "../ink";
import { angleDiff, clamp, frac, hash3, lerp, rand, smoothstep, TAU } from "../math";
import type { Pen, Pose } from "../renderer";
import { inEllipse, spotted, toSegment } from "./shapes";

export interface Manta extends Creature {
  /** Wingbeat phase, radians. */
  phase: number;
  /** Wingbeat speed factor. */
  pace: number;
  /** Roll / banking angle when turning (-1 left, +1 right). */
  rollAngle: number;
  /** Startle surge impulse. */
  surge: number;
  /** Variant style: 0 = Oceanic, 1 = Reef Star, 2 = Eagle Ray, 3 = Ghost Glass. */
  variant: number;
}

const DEFAULTS = {
  ...SHARED_TUNING,
  detail: 1.6,
  fog: 0.45,
  density: 1.2,
  speed: 1.15,
  sway: 0.05,
  spread: 0.08,
  farthest: 0.3,
  farBias: 1.4,
  grip: 1.8,
  separation: 650,
  trail: 1.8,
  trailFade: 0.55,
  shimmer: 0.35,
  sparkle: 0.08,
  wingBeat: 1,
  undulation: 1,
  wingSpan: 1,
};

// Color palettes for manta variants
const MANTLE_DARK: RGB = [16, 24, 38];
const MANTLE_CYAN: RGB = [0, 198, 245];
const CHEVRON_WHITE: RGB = [232, 242, 255];
const BELLY_PALE: RGB = [180, 215, 235];
const CEPHALIC_TIP: RGB = [0, 225, 255];
const TAIL_DARK: RGB = [20, 28, 42];
const STAR_SPOT: RGB = [140, 245, 255];
const GLOW_AQUA: RGB = [30, 210, 220];
const EAGLE_BROWN: RGB = [32, 45, 65];
const EAGLE_SPOT: RGB = [230, 240, 250];

const at = { x: 0, y: 0 };
const bt = { x: 0, y: 0 };

function createManta(variant = 0): (c: Creature) => Manta {
  return (c) => ({
    ...c,
    phase: rand(0, TAU),
    pace: rand(0.85, 1.15),
    rollAngle: 0,
    surge: 0,
    variant,
  });
}

function updateManta(m: Manta, flock: Flock<Manta>, dt: number) {
  const k = flock.tuning as typeof DEFAULTS;
  const t = flock.time;

  // Wingbeat undulates rhythmically, speeding up during surge
  const beatPace = (k.wingBeat ?? 1) * m.pace * (1 + m.surge * 0.8);
  m.phase += dt * TAU * 0.42 * beatPace;

  if (m.surge > 0.01) {
    m.surge = Math.max(0, m.surge - dt * 1.5);
  }

  // Smooth lazy steering toward course
  const want = flock.heading + m.bias * k.spread;
  const diff = angleDiff(m.heading, want);
  m.heading += clamp(diff, -0.7 * k.grip * dt, 0.7 * k.grip * dt);

  // Bank into turns
  const targetRoll = clamp(diff * 1.5, -0.6, 0.6);
  m.rollAngle += (targetRoll - m.rollAngle) * Math.min(1, dt * 2.5);

  const cruise = flock.cruise(m) * (1 + m.surge * 0.9);
  const acc = flock.begin();

  // Forward thrust with gentle undulation pulse
  const thrust = (0.8 + 0.35 * Math.sin(m.phase)) * cruise;
  acc.x += Math.cos(m.heading) * thrust - m.vx * 0.8;
  acc.y += Math.sin(m.heading) * thrust - m.vy * 0.8;

  flock.separate(m, k.separation, 0.6);
  flock.move(m, dt, cruise * 2.5);

  if (flock.passed(m, m.span * 1.6)) flock.reenter(m);
}

function startleManta(m: Manta, dx: number, dy: number, strength: number, flock: Flock<Manta>) {
  // Hard banking surge away from disturbance
  const angleAway = Math.atan2(dy, dx);
  m.heading = angleAway + (hash3(m.id, 9, 1) > 0.5 ? 0.35 : -0.35);
  m.surge = 1.0 * strength;
  const boost = 220 * strength * m.depth;
  m.vx += Math.cos(m.heading) * boost;
  m.vy += Math.sin(m.heading) * boost;
  m.startledUntil = flock.time + 1.2;
}

function drawMantaBody(m: Manta, pen: Pen, flock: Flock<Manta>) {
  const k = flock.tuning as typeof DEFAULTS;
  const S = m.span * (k.wingSpan ?? 1);
  const out = pen.ink;
  const pose: Pose = { x: m.x, y: m.y, heading: m.heading, span: S, depth: m.depth, id: m.id };
  const base = pen.fogFor(m.depth);

  const ph = m.phase;
  const undul = k.undulation ?? 1;
  const roll = m.rollAngle;
  const variant = m.variant;

  // 1. Long slender whip tail trailing behind with travelling sinusoidal undulation
  const tailSegs = 22;
  const tailLen = 0.95;
  let prevU = -0.26;
  let prevV = 0;
  for (let i = 1; i <= tailSegs; i++) {
    const f = i / tailSegs;
    const u = -0.26 - f * tailLen;
    const sway = Math.sin(ph * 0.8 - f * 4.2) * 0.05 * f * undul + roll * f * 0.08;
    const v = sway;
    pen.toWorld(pose, prevU, prevV, at);
    pen.toWorld(pose, u, v, bt);

    const tailColor = variant === 1 ? GLOW_AQUA : TAIL_DARK;
    const fog = Math.min(0.95, base + 0.35 * f);
    pen.line(at.x, at.y, bt.x, bt.y, tailColor, m.depth, undefined, fog);

    // Shed subtle micro-bubbles / wake disturbance at tail tip
    if (i === tailSegs && (hash3(m.id, Math.floor(flock.time * 8), 3) > 0.6)) {
      pen.shed(bt.x, bt.y, 0.03 * m.depth);
    }

    prevU = u;
    prevV = v;
  }

  // 2. Cephalic lobes (horns) at the mouth
  for (const side of [-1, 1]) {
    const hornSegs = 7;
    let pu = 0.28;
    let pv = 0.055 * side;
    for (let i = 1; i <= hornSegs; i++) {
      const f = i / hornSegs;
      // Slight inward curl at the tips
      const curl = Math.sin(f * Math.PI * 0.6) * 0.03 * side;
      const u = 0.28 + f * 0.12;
      const v = 0.055 * side + curl + Math.sin(ph + side) * 0.012;
      pen.toWorld(pose, pu, pv, at);
      pen.toWorld(pose, u, v, bt);
      const hornColor = variant === 1 ? CEPHALIC_TIP : (f > 0.6 ? CHEVRON_WHITE : MANTLE_DARK);
      pen.line(at.x, at.y, bt.x, bt.y, hornColor, m.depth, undefined, base);
      pu = u;
      pv = v;
    }
  }

  // 3. Wide diamond pectoral disc and wings
  pen.shape(pose, 0.72, (u, v) => {
    const av = Math.abs(v);

    // Dynamic wing flap displacement: undulation travels outward and backward
    const wingWave = Math.sin(ph - u * 3.4 - av * 2.8) * 0.06 * undul * (av / 0.6);
    const effU = u + wingWave * 0.25;
    const effV = av + roll * (v > 0 ? 0.05 : -0.05);

    // Body bounds: broad rhomboid diamond
    // Front apex: u = 0.30
    // Wing tips: u = -0.08, av = 0.62
    // Posterior tail base: u = -0.28, av = 0
    let inside = false;

    if (effU >= -0.08 && effU <= 0.32) {
      // Anterior wing leading edge
      const f = (0.32 - effU) / 0.40; // 0 at snout, 1 at wing tips
      const maxV = 0.07 + 0.55 * Math.pow(f, 0.88);
      inside = effV <= maxV;
    } else if (effU < -0.08 && effU >= -0.30) {
      // Posterior trailing edge (swept back)
      const f = (effU - (-0.30)) / 0.22; // 0 at tail base, 1 at wing tips
      const maxV = 0.04 + 0.58 * Math.pow(f, 0.85);
      inside = effV <= maxV;
    }

    if (!inside) return false;

    // Mouth notch at the very front
    if (u > 0.27 && av < 0.045) return false;

    // Small black eyes on outer margins just behind cephalic lobes
    if (Math.abs(u - 0.23) < 0.022 && Math.abs(av - 0.088) < 0.018) {
      return ink(out, 10, 15, 25, INK_SPOT, "●");
    }

    // VARIANT STYLING:
    if (variant === 0) {
      // Option A: Oceanic Giant Manta (Classic bold chevrons & crisp white wing edges)
      // Chevron shoulder patches across back
      const isChevron = u > 0.02 && u < 0.20 && Math.abs(effV - (0.04 + (0.20 - u) * 0.95)) < 0.035;
      if (isChevron) return ink(out, ...CHEVRON_WHITE, INK_SCALE, "~=");

      // White trailing wing borders
      if (effU < -0.04 && effV > 0.45) {
        return ink(out, ...CHEVRON_WHITE, INK_SCALE, ".");
      }

      // Central spinal ridge
      if (av < 0.03 && u > -0.22 && u < 0.22) {
        return ink(out, 28, 40, 60, INK_DARK, "|");
      }

      // Rich midnight mantle
      return ink(out, ...MANTLE_DARK, INK_SCALE);
    } else if (variant === 1) {
      // Option B: Bioluminescent Reef Manta (Starlight constellation spots & glowing edges)
      // Constellation spots
      if (spotted(u * 1.5, v * 1.5, 0.065, 0.018, m.id)) {
        return ink(out, ...STAR_SPOT, INK_SPOT, "✦");
      }

      // Bioluminescent spinal glow
      if (av < 0.04 && u > -0.25 && u < 0.25) {
        return ink(out, ...MANTLE_CYAN, INK_LIT, "=*");
      }

      // Glowing wing edges
      if (effV > 0.48) {
        return ink(out, ...CEPHALIC_TIP, INK_LIT, ":;");
      }

      // Azure skin
      const c = lerp(20, 200, Math.max(0, 1 - effV));
      return ink(out, 12, Math.round(c * 0.6), Math.round(c), INK_SCALE);
    } else if (variant === 2) {
      // Option C: Spotted Eagle Ray (Duck-bill snout & spotted ocelli rosettes)
      // Rosettes across dorsal disc
      if (spotted(u, v, 0.048, 0.014, m.id + 7)) {
        return ink(out, ...EAGLE_SPOT, INK_SPOT, "o");
      }

      // Duck-billed snout
      if (u > 0.25) return ink(out, ...EAGLE_SPOT, INK_SCALE, "=");

      return ink(out, ...EAGLE_BROWN, INK_SCALE);
    } else {
      // Option D: Spectral Ghost Manta (Ethereal glass & iridescent wave shimmer)
      if (effV > 0.45) {
        return ink(out, ...MANTLE_CYAN, INK_SHIMMER, "~");
      }
      if (av < 0.05) {
        return ink(out, ...CHEVRON_WHITE, INK_LIT, "|");
      }
      return ink(out, 10, 80, 140, INK_GLASS, "·.");
    }
  }, { light: 1.05 + 0.2 * Math.sin(ph) });
}

export function createMantaAnimal(variant = 0, key = "manta", label = "Manta"): Animal<Manta> {
  const swatches: RGB[] = [
    [0, 198, 245],   // A: Classic Oceanic (Azure)
    [80, 240, 255],  // B: Bioluminescent (Electric Cyan)
    [70, 140, 210],  // C: Eagle Ray (Steel Indigo)
    [120, 215, 235], // D: Ghost Manta (Ethereal Glass)
  ];

  return {
    key,
    label,
    swatch: swatches[variant] ?? swatches[0],
    defaults: DEFAULTS,
    controls: [
      ["Wingbeat & Form", [
        { key: "wingBeat", label: "Wingbeat rate", min: 0.3, max: 3, step: 0.05, hint: "How fast the pectoral wings flap." },
        { key: "undulation", label: "Wing undulation", min: 0.2, max: 3, step: 0.05, hint: "Wave amplitude travelling along the wing tips." },
        { key: "wingSpan", label: "Wingspan", min: 0.5, max: 2, step: 0.05, hint: "Relative width of the pectoral wings." },
      ]],
    ],
    area: 92000,
    scale: 1.5,
    speed: 70,
    trail: { light: [140, 210, 245], dark: [0, 198, 245] },
    create: createManta(variant),
    update: updateManta,
    startle: startleManta,
    draw: drawMantaBody,
  };
}

/** Default Manta export for the main lineup */
export const manta = createMantaAnimal(0, "manta", "Manta");

/** 4 Distinct Candidates for comparison */
export const MANTA_CANDIDATES = [
  {
    animal: createMantaAnimal(0, "manta-a", "Oceanic Manta"),
    note: "Classic giant oceanic manta: midnight cloak, bold white chevron shoulder marks, splayed wing undulations.",
  },
  {
    animal: createMantaAnimal(1, "manta-b", "Bioluminescent Reef"),
    note: "Electric cyan reef manta: glowing starlight constellation spots (✦), illuminated spine and glowing wing margins.",
  },
  {
    animal: createMantaAnimal(2, "manta-c", "Spotted Eagle Ray"),
    note: "Spotted eagle ray: duck-bill snout, swept delta wings, dusted with delicate circular ocelli rosettes (o).",
  },
  {
    animal: createMantaAnimal(3, "manta-d", "Spectral Ghost Manta"),
    note: "Ethereal deep-sea glass manta: semi-translucent wings (INK_GLASS), iridescent cyan wave shimmer, luminous spine.",
  },
];
