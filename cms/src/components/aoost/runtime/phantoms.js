/* Simulated visitors: now and then a cursor or two moves through the page, the way people do. They
   use the same look as the real ghost cursors (hero.js), never send anything anywhere, and don't
   change any counts. Each "visitor" has its own pace and hand, and strings together a few habits
   (BEHAVIOURS): reading, looking things over, picking up pieces on the projects table and moving
   them, fiddling, wandering. Moves are quick and never quite the same: some nearly straight, some
   arcing a little or a lot, some with an S-bend; long reaches fall slightly short or wide and get a
   small correction; hands wobble along the way and drift when still. */

/** How often: chance a visit gets any, the wait before the first, and the gap between them (seconds). */
const RATES = {
  rare: { chance: 0.35, first: [20, 70], gap: [90, 240], together: 1 },
  sometimes: { chance: 0.6, first: [10, 40], gap: [45, 140], together: 1 },
  often: { chance: 0.9, first: [5, 20], gap: [20, 70], together: 2 },
  demo: { chance: 1, first: [1.5, 2.5], gap: [3, 6], together: 2 },
};

let R = Math.random;
const rand = (a, b) => a + R() * (b - a);
const pick = (xs) => xs[Math.floor(R() * xs.length)];
const chance = (p) => R() < p;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
/** minimum-jerk easing (how a hand speeds up and slows down), skewed so the start is brisker than the landing */
const ease = (t) => { const u = Math.pow(t, 0.82); return u * u * u * (10 - 15 * u + 6 * u * u); };

/** Things people look at, in page coordinates, near what the viewer has on screen. */
function targets(sel = '.piece, .pl-chip, .pl-rec, h2, .hr-slide, #rodeo, .table-note, a[href], button, img') {
  const top = scrollY - innerHeight * 0.3, bottom = scrollY + innerHeight * 1.3;
  const out = [];
  for (const el of document.querySelectorAll(sel)) {
    const r = el.getBoundingClientRect();
    if (r.width < 12 || r.height < 12 || r.width > innerWidth * 1.2) continue;
    const y = r.top + scrollY;
    if (y + r.height < top || y > bottom) continue;
    out.push({ el, x: r.left + scrollX, y, w: r.width, h: r.height });
  }
  return out;
}
const inside = (t) => ({ x: t.x + t.w * rand(0.2, 0.8), y: t.y + t.h * rand(0.25, 0.75) });
const onScreen = (fx = rand(0.12, 0.88), fy = rand(0.15, 0.85)) => ({ x: innerWidth * fx + scrollX, y: scrollY + innerHeight * fy });
const near = (p, r) => ({ x: clamp(p.x + rand(-r, r), scrollX + 20, scrollX + innerWidth - 20), y: p.y + rand(-r * 0.7, r * 0.7) });

/**
 * Habits. Each takes where the cursor is and returns steps: ["move", to] (or ["move", to, seconds]
 * for a deliberate pace), ["rest", seconds], ["press", element] / ["release", element] around a drag.
 */
const BEHAVIOURS = {
  /** Reads down the page: little drifts down with pauses, a glance aside now and then. */
  reader(p) {
    const steps = [];
    let q = { ...p };
    for (let i = 0, n = Math.round(rand(3, 8)); i < n; i++) {
      q = { x: clamp(q.x + rand(-70, 70), scrollX + 40, scrollX + innerWidth - 40), y: q.y + rand(30, 150) };
      steps.push(['move', q, rand(0.4, 1.4)], ['rest', rand(0.6, 3.5)]);
      if (chance(0.3)) { const a = near(q, 260); steps.push(['move', a], ['rest', rand(0.3, 1.5)], ['move', near(q, 20)]); }
    }
    return steps;
  },
  /** Looks things over: quick moves from thing to thing, lingering, small checks within each. */
  browser() {
    const ts = targets(), steps = [];
    for (let i = 0, n = Math.round(rand(3, 7)); i < n && ts.length; i++) {
      const t = pick(ts);
      steps.push(['move', inside(t)], ['rest', rand(0.25, 2.2)]);
      for (let k = 0, m = chance(0.5) ? Math.round(rand(1, 3)) : 0; k < m; k++) steps.push(['move', inside(t)], ['rest', rand(0.15, 0.9)]);
    }
    return steps;
  },
  /** Arranges the table: picks up a piece, moves it somewhere, sometimes nudges it again. */
  arranger() {
    const pieces = targets('.table>.piece'), steps = [];
    for (let i = 0, n = Math.round(rand(1, 3)); i < n && pieces.length; i++) {
      const t = pick(pieces), grab = inside(t);
      steps.push(['move', grab], ['rest', rand(0.15, 0.7)], ['press', t.el]);
      let at = grab;
      for (let k = 0, m = chance(0.4) ? 2 : 1; k < m; k++) {
        at = { x: at.x + rand(-220, 220), y: at.y + rand(-120, 120) };
        steps.push(['move', at, rand(0.35, 0.9)]);
        if (k < m - 1) steps.push(['rest', rand(0.1, 0.4)]);
      }
      // a last little adjust before letting go
      if (chance(0.5)) { at = near(at, 14); steps.push(['move', at, rand(0.12, 0.25)]); }
      steps.push(['release', t.el], ['rest', rand(0.3, 1.8)]);
      if (chance(0.5)) steps.push(['move', near(at, 90)], ['rest', rand(0.3, 1.5)]);
    }
    return steps;
  },
  /** Idle hands: a quick shake to find the cursor, restless little moves, or a jab back and forth. */
  fiddle(p) {
    const steps = [];
    const kind = pick(['shake', 'jitter', 'back-and-forth']);
    if (kind === 'shake') {
      for (let i = 0, n = Math.round(rand(3, 6)); i < n; i++) steps.push(['move', { x: p.x + (i % 2 ? -1 : 1) * rand(25, 70), y: p.y + rand(-14, 14) }, rand(0.06, 0.11)]);
    } else if (kind === 'jitter') {
      let q = p;
      for (let i = 0, n = Math.round(rand(4, 9)); i < n; i++) { q = near(q, rand(8, 45)); steps.push(['move', q, rand(0.08, 0.3)], ['rest', rand(0.05, 0.6)]); }
    } else {
      const a = near(p, 160);
      for (let i = 0, n = Math.round(rand(2, 3)); i < n; i++) steps.push(['move', a], ['rest', rand(0.2, 0.8)], ['move', near(p, 12)], ['rest', rand(0.2, 0.8)]);
    }
    steps.push(['rest', rand(0.8, 3.5)]);
    return steps;
  },
  /** Wanders: long pauses broken by moves across the screen. */
  wanderer() {
    const steps = [];
    for (let i = 0, n = Math.round(rand(2, 5)); i < n; i++) steps.push(['move', onScreen()], ['rest', rand(1.2, 6)]);
    return steps;
  },
};

/** A quick reach takes 0.15–0.6 s, longer ones a bit more (Fitts-like), scaled by the visitor's own pace. */
const reach = (d, pace = 1) => (0.1 + 0.085 * Math.log2(1 + d / 16)) * pace * rand(0.85, 1.2);

/**
 * One reach as a cubic curve with its own shape: nearly straight, a shallow or deep arc, or an S;
 * plus a slow wobble along it. `hand` is the visitor's tendency (which way it arcs, how much).
 */
function curve(from, to, dur, hand) {
  const dx = to.x - from.x, dy = to.y - from.y, d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d;
  const shape = R(), side = chance(0.75) ? hand.side : -hand.side;
  let b1, b2;
  if (shape < 0.3) { b1 = rand(-0.03, 0.03); b2 = rand(-0.03, 0.03); } // nearly straight
  else if (shape < 0.85) { const a = hand.arc * rand(0.4, 1.6); b1 = side * a * rand(0.6, 1.2); b2 = side * a * rand(0.3, 1); } // an arc, its peak early or late
  else { const a = hand.arc * rand(0.5, 1); b1 = side * a; b2 = -side * a * rand(0.5, 1); } // an S
  const a1 = rand(0.18, 0.4), a2 = rand(0.6, 0.85);
  return {
    kind: 'move', dur, from, to,
    c1: { x: from.x + dx * a1 + nx * d * b1, y: from.y + dy * a1 + ny * d * b1 },
    c2: { x: from.x + dx * a2 + nx * d * b2, y: from.y + dy * a2 + ny * d * b2 },
    wob: { amp: Math.min(6, d * rand(0.004, 0.018)), f: rand(1, 2.5), ph: rand(0, 6.28), nx, ny },
  };
}

/** Turn a habit's steps into timed segments: shaped reaches, with long ones landing short or wide and corrected. */
function plan(start, steps, hand = { pace: 1, arc: 0.12, side: 1 }) {
  const segs = [];
  let p = start;
  for (const s of steps) {
    if (s[0] === 'rest') { segs.push({ kind: 'rest', at: p, dur: s[1] }); continue; }
    if (s[0] === 'press' || s[0] === 'release') { segs.push({ kind: s[0], at: p, el: s[1], dur: rand(0.06, 0.14) }); continue; }
    const to = s[1], d = Math.hypot(to.x - p.x, to.y - p.y);
    if (d < 1) continue;
    const dur = s[2] || reach(d, hand.pace);
    if (!s[2] && d > 90 && chance(0.65)) {
      // the first reach lands a little off (short, long or to the side), then one or two small corrections
      const along = rand(-0.09, 0.06), wide = rand(-0.05, 0.05), ux = (to.x - p.x) / d, uy = (to.y - p.y) / d;
      const miss = { x: to.x + ux * d * along - uy * d * wide, y: to.y + uy * d * along + ux * d * wide };
      segs.push(curve(p, miss, dur, hand));
      if (chance(0.35)) { const mid = { x: (miss.x + to.x) / 2 + rand(-3, 3), y: (miss.y + to.y) / 2 + rand(-3, 3) }; segs.push(curve(miss, mid, rand(0.08, 0.16), hand), curve(mid, to, rand(0.08, 0.16), hand)); }
      else segs.push(curve(miss, to, rand(0.1, 0.22), hand));
    } else segs.push(curve(p, to, dur, hand));
    p = to;
  }
  return segs;
}

function cursor(layer) {
  const el = document.createElement('div');
  el.className = 'ghost phantom';
  const hue = Math.round(rand(0, 360));
  el.innerHTML = `<svg viewBox="0 0 18 18"><path d="M2 1.5l13 6.2-5.6 1.6-2.4 5.3z" fill="hsl(${hue} 85% 62%)" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/></svg>`;
  layer.appendChild(el);
  return el;
}

/** Where a segment puts the cursor at progress k (0..1). */
function at(s, k, tt) {
  if (s.kind !== 'move') {
    // a still hand drifts a pixel or two
    return { x: s.at.x + Math.sin(tt * 1.3) * 1.3 + Math.sin(tt * 3.1) * 0.5, y: s.at.y + Math.cos(tt * 1.1) * 1.1 + Math.sin(tt * 2.7) * 0.5 };
  }
  const e = ease(clamp(k, 0, 1)), a = 1 - e;
  const b0 = a * a * a, b1 = 3 * a * a * e, b2 = 3 * a * e * e, b3 = e * e * e;
  const w = s.wob, wob = w.amp * Math.sin(Math.PI * e) * Math.sin(w.ph + e * Math.PI * 2 * w.f);
  return {
    x: b0 * s.from.x + b1 * s.c1.x + b2 * s.c2.x + b3 * s.to.x + w.nx * wob + Math.sin(tt * 23) * 0.4,
    y: b0 * s.from.y + b1 * s.c1.y + b2 * s.c2.y + b3 * s.to.y + w.ny * wob + Math.cos(tt * 19) * 0.4,
  };
}

/**
 * Start simulated visitors on the page. rate: "rare" | "sometimes" | "often" (or "demo" to see them
 * quickly). Returns stop().
 */
export function startPhantoms(layer, rate = 'sometimes') {
  const C = RATES[rate] || RATES.sometimes;
  if (R() > C.chance) return () => {};
  const live = new Set();
  let timer = 0, raf = 0, stopped = false;

  const drag = (el, type, p) => el?.dispatchEvent(new CustomEvent('ghostdrag', { detail: { type, x: p.x - scrollX, y: p.y - scrollY } }));

  function visit() {
    if (stopped) return;
    if (!document.hidden && live.size < C.together) {
      // each visitor has their own hand: pace, how much they arc, and which way
      const hand = { pace: rand(0.75, 1.35), arc: rand(0.04, 0.22), side: chance(0.5) ? 1 : -1 };
      // arrive from an edge (coming in from elsewhere), or simply appear (a mouse woken up)
      const start = chance(0.45)
        ? pick([{ x: scrollX - 10, y: scrollY + innerHeight * rand(0.2, 0.8) }, { x: scrollX + innerWidth + 10, y: scrollY + innerHeight * rand(0.2, 0.8) }, { x: scrollX + innerWidth * rand(0.2, 0.8), y: scrollY + innerHeight + 10 }])
        : onScreen();
      // one to four habits strung together, so some stay seconds and some a minute or more
      const habits = Object.keys(BEHAVIOURS);
      let steps = [], p = start;
      for (let i = 0, n = pick([1, 1, 2, 2, 2, 3, 4]); i < n; i++) {
        const more = BEHAVIOURS[pick(habits)](p);
        steps = steps.concat(more);
        const last = [...more].reverse().find((s) => s[0] === 'move');
        if (last) p = last[1];
      }
      // leave off an edge, or just stop (tab switched, hand off the mouse)
      if (chance(0.5)) steps.push(['move', { x: chance(0.5) ? scrollX - 30 : scrollX + innerWidth + 30, y: p.y + rand(-140, 140) }]);
      const el = cursor(layer), segs = plan(start, steps, hand);
      const v = { el, segs, i: -1, t0: performance.now(), seed: rand(0, 100), held: null };
      el.style.left = start.x + 'px'; el.style.top = start.y + 'px';
      requestAnimationFrame(() => el.classList.add('on'));
      live.add(v);
      if (!raf) raf = requestAnimationFrame(frame);
    }
    timer = setTimeout(visit, rand(...C.gap) * 1000);
  }

  function frame(now) {
    raf = 0;
    for (const v of live) {
      if (v.i < 0) { v.i = 0; v.t0 = now; }
      let s = v.segs[v.i];
      while (s && (now - v.t0) / 1000 >= s.dur) {
        if (s.kind === 'press') { v.held = s.el; drag(s.el, 'down', s.at); }
        if (s.kind === 'release') { drag(s.el, 'up', s.at); v.held = null; }
        v.t0 += s.dur * 1000; v.i++; s = v.segs[v.i];
      }
      if (!s) {
        if (v.held) drag(v.held, 'up', { x: 0, y: 0 });
        v.el.classList.remove('on');
        const el = v.el; setTimeout(() => el.remove(), 700);
        live.delete(v);
        continue;
      }
      const pt = at(s, (now - v.t0) / 1000 / s.dur, now / 1000 + v.seed);
      v.el.style.left = pt.x.toFixed(1) + 'px'; v.el.style.top = pt.y.toFixed(1) + 'px';
      if (v.held) drag(v.held, 'move', pt);
    }
    if (live.size && !stopped) raf = requestAnimationFrame(frame);
  }

  timer = setTimeout(visit, rand(...C.first) * 1000);
  return () => { stopped = true; clearTimeout(timer); cancelAnimationFrame(raf); for (const v of live) { if (v.held) drag(v.held, 'up', { x: 0, y: 0 }); v.el.remove(); } live.clear(); };
}

export const _test = { plan, reach, ease, curve, at, BEHAVIOURS, RATES, seed(fn) { R = fn; } };
