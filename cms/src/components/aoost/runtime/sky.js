/* Night sky: an idle animation for the dot board. The wave rolls for a while, then settles into a
   faint sky of twinkling dots where a few quick shooting stars flick across and are gone, then the
   wave rolls back in. It keeps a little state (where the stars are, the fading trails), so unlike
   the other idle animations it is made per board: createSky() gives a levels() that fills one
   brightness (0–1, a bit over for a star's head) per cell for the board's time t. */

/** Seconds of each part of one round. */
export const SKY = { wave: 8, handover: 1.6, sky: 11, back: 1.8 };
/** When the shooting stars come, in seconds into the sky (a little jitter is added). */
const STAR_TIMES = [1.5, 4.8, 8.0];
/** How fast a trail fades (seconds). */
const TRAIL = 0.3;

const ease = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
/** Seeded random numbers, so a round plays the same way each time it's drawn from the start. */
function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 1e9) / 1e9; }; }

/** The board's own idle wave (dots.js IDLE.wave), so the hand-over starts from what's on screen. */
export function waveLevel(x, y, t, cols, rows) {
  const u = x / cols, v = y / rows;
  const a = Math.sin(u * 9 - t * 1.1 + Math.sin(v * 3 + t * 0.6) * 1.4);
  const b = Math.sin(u * 4.3 + v * 2.2 + t * 0.7);
  const k = Math.max(0, a * 0.65 + b * 0.35);
  return k * k * 0.85;
}

/** Where a round of length `period` is at time t: the part, how far through it (0–1), and the round number. */
export function skyPhase(t) {
  const period = SKY.wave + SKY.handover + SKY.sky + SKY.back;
  const round = Math.floor(t / period), u = t - round * period;
  if (u < SKY.wave) return { part: 'wave', p: u / SKY.wave, u, round };
  if (u < SKY.wave + SKY.handover) return { part: 'handover', p: (u - SKY.wave) / SKY.handover, u, round };
  if (u < SKY.wave + SKY.handover + SKY.sky) return { part: 'sky', p: (u - SKY.wave - SKY.handover) / SKY.sky, u, round };
  return { part: 'back', p: (u - SKY.wave - SKY.handover - SKY.sky) / SKY.back, u, round };
}

export function createSky({ stars = 3, seed = 11 } = {}) {
  let cols = 0, rows = 0, L = null, P = null, last = -1, round = -1, plan = null, flying = [];

  const splat = (B, x, y, r, v) => {
    const R = Math.ceil(r * 1.7), ir = 1 / (r * r);
    const x0 = Math.max(0, Math.floor(x - R)), x1 = Math.min(cols - 1, Math.ceil(x + R)), y0 = Math.max(0, Math.floor(y - R)), y1 = Math.min(rows - 1, Math.ceil(y + R));
    for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) {
      const dx = xx - x, dy = yy - y, val = v * Math.exp(-(dx * dx + dy * dy) * ir), i = yy * cols + xx;
      if (val > B[i]) B[i] = val;
    }
  };

  /** A new round: where the faint stars sit, and when the shooting stars come. */
  function newRound(n) {
    const r = rng(seed * 7919 + n * 104729);
    const dots = Array.from({ length: Math.round((cols * rows) / 220) }, () => ({ x: Math.floor(r() * cols), y: Math.floor(r() * rows), a: 0.18 + r() * 0.36, rate: 0.6 + r(), ph: r() * 6.28 }));
    const times = STAR_TIMES.slice(0, stars).map((s) => SKY.wave + SKY.handover + s + (r() - 0.5) * 0.8);
    const shots = times.map((at) => {
      const v = 200 + r() * 60, life = 0.5 + r() * 0.25, n = Math.hypot(1, 0.1);
      return { at, x: (0.35 + r() * 0.6) * cols, y: (0.08 + r() * 0.32) * rows, vx: (-v) / n, vy: (v * 0.1) / n, life, age: 0, fired: false, jit: r };
    });
    return { dots, shots };
  }

  /** Brightness per cell for time t (seconds since the board went idle); `speed` is the board's idle speed. */
  function levels(t, c, r, speed = 0.5) {
    if (c !== cols || r !== rows || !L) { cols = c; rows = r; L = new Float32Array(cols * rows); P = new Float32Array(cols * rows); round = -1; flying = []; }
    if (t < last) { P.fill(0); round = -1; flying = []; }
    const dt = last < 0 || t < last ? 0 : Math.min(0.1, t - last);
    last = t;
    const ph = skyPhase(t);
    if (ph.round !== round) { round = ph.round; plan = newRound(round); flying = []; }

    // shooting stars whose time has come
    for (const s of plan.shots) if (!s.fired && ph.u >= s.at) { s.fired = true; flying.push({ ...s, fired: true }); }
    const decay = Math.exp(-dt / TRAIL);
    for (let i = 0; i < P.length; i++) P[i] *= decay;
    for (const s of flying) {
      const px = s.x, py = s.y; s.age += dt; s.x += s.vx * dt; s.y += s.vy * dt;
      s.glow = Math.pow(Math.sin(Math.PI * Math.min(1, s.age / s.life)), 0.7);
      const n = Math.max(1, Math.ceil(Math.hypot(s.x - px, s.y - py) / 0.5));
      for (let j = 1; j <= n; j++) splat(P, px + ((s.x - px) * j) / n, py + ((s.y - py) * j) / n, 1.4, s.glow * (0.6 + 0.4 * s.jit()));
    }
    flying = flying.filter((s) => s.age < s.life && s.x > -12 && s.x < cols + 12 && s.y > -6 && s.y < rows + 6);

    // the wave: full, fading out at the hand-over, gone in the sky, easing back after
    const wave = ph.part === 'wave' ? 1 : ph.part === 'handover' ? (1 - ph.p) * (1 - ph.p) : ph.part === 'back' ? ease(ph.p) : 0;
    const ts = t * speed;
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const i = y * cols + x, w = wave > 0 ? waveLevel(x, y, ts, cols, rows) * wave : 0;
      L[i] = w > P[i] ? w : P[i];
    }
    // the faint stars come up as the wave goes, and go as it comes back
    const sky = ph.part === 'handover' ? ph.p : ph.part === 'sky' ? 1 : ph.part === 'back' ? 1 - ph.p : 0;
    if (sky > 0) for (const d of plan.dots) {
      const v = d.a * Math.pow(0.5 + 0.5 * Math.sin(t * d.rate + d.ph), 3) * sky, i = d.y * cols + d.x;
      if (v > L[i]) L[i] = v;
    }
    // each shooting star's head, brightest at its middle
    for (const s of flying) { splat(L, s.x, s.y, 2.2, s.glow); splat(L, s.x, s.y, 1.1, s.glow * 1.3); }
    return L;
  }

  return { levels };
}
