/* Simulated visitors: now and then a cursor or two drifts through the page, the way people do. They
   use the same look as the real ghost cursors (hero.js), never send anything anywhere, and don't
   change any counts. Each "visitor" follows one of a few habits (BEHAVIOURS), moving like a hand
   does: curved paths that ease in and out, the odd overshoot and correction, a slight tremor, and
   pauses to read or look. Not every visit gets one, and how long they stay varies. */

/** How often: chance a visit gets any, the wait before the first, and the gap between them (seconds). */
const RATES = {
  rare: { chance: 0.35, first: [20, 70], gap: [90, 240], together: 1 },
  sometimes: { chance: 0.6, first: [10, 40], gap: [45, 140], together: 1 },
  often: { chance: 0.9, first: [5, 20], gap: [20, 70], together: 2 },
  demo: { chance: 1, first: [1.5, 2.5], gap: [3, 6], together: 2 },
};

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (xs) => xs[Math.floor(Math.random() * xs.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
/** minimum-jerk easing: how a hand speeds up and slows down on a reach */
const ease = (t) => t * t * t * (10 - 15 * t + 6 * t * t);

/** Things people look at, in page coordinates, near what the viewer has on screen. */
function targets() {
  const top = scrollY - innerHeight * 0.3, bottom = scrollY + innerHeight * 1.3;
  const out = [];
  for (const el of document.querySelectorAll('.piece, .pl-chip, .pl-rec, h2, .hr-slide, #rodeo, .table-note, a[href], button, img')) {
    const r = el.getBoundingClientRect();
    if (r.width < 12 || r.height < 12 || r.width > innerWidth * 1.2) continue;
    const y = r.top + scrollY;
    if (y + r.height < top || y > bottom) continue;
    out.push({ x: r.left + scrollX, y, w: r.width, h: r.height });
  }
  return out;
}
const inside = (t) => ({ x: t.x + t.w * rand(0.25, 0.75), y: t.y + t.h * rand(0.3, 0.7) });
const onScreen = (fx = rand(0.15, 0.85), fy = rand(0.2, 0.8)) => ({ x: innerWidth * fx + scrollX, y: scrollY + innerHeight * fy });

/**
 * Habits. Each returns a list of steps from a starting point: ["move", to, seconds] or
 * ["rest", seconds] (holding still, with a hand's small drift). Lengths vary a lot on purpose.
 */
const BEHAVIOURS = {
  /** Reads down the page: slow drifts down with pauses, the odd move aside. */
  reader(p) {
    const steps = [], n = Math.round(rand(3, 9));
    let { x, y } = p;
    for (let i = 0; i < n; i++) {
      y += rand(40, 170); x = clamp(x + rand(-60, 60), 40, innerWidth - 40);
      steps.push(['move', { x, y }, rand(1.2, 3.5)], ['rest', rand(0.8, 4)]);
      if (Math.random() < 0.25) { const a = { x: clamp(x + rand(-220, 220), 40, innerWidth - 40), y: y + rand(-40, 40) }; steps.push(['move', a, rand(0.5, 1)], ['rest', rand(0.5, 2)]); x = a.x; y = a.y; }
    }
    return steps;
  },
  /** Looks around: goes from thing to thing, lingering on each. */
  browser() {
    const ts = targets(), steps = [], n = Math.round(rand(2, 6));
    for (let i = 0; i < n && ts.length; i++) {
      const t = pick(ts);
      steps.push(['move', inside(t), 0], ['rest', rand(0.6, 3)]);
      if (Math.random() < 0.4) steps.push(['move', inside(t), rand(0.3, 0.7)], ['rest', rand(0.4, 1.6)]);
    }
    return steps;
  },
  /** Idle hands: little loops or a scribble near one spot, then a pause. */
  fidget(p) {
    const steps = [], loops = Math.round(rand(2, 5)), r = rand(10, 34), dir = Math.random() < 0.5 ? 1 : -1;
    for (let i = 0; i < loops * 6; i++) {
      const a = (i / 6) * Math.PI * 2 * dir;
      steps.push(['move', { x: p.x + Math.cos(a) * r * rand(0.8, 1.2), y: p.y + Math.sin(a) * r * rand(0.6, 1) }, rand(0.09, 0.16)]);
    }
    steps.push(['rest', rand(1, 4)]);
    return steps;
  },
  /** Wanders: long pauses broken by unhurried moves across the screen. */
  wanderer() {
    const steps = [], n = Math.round(rand(2, 5));
    for (let i = 0; i < n; i++) steps.push(['move', onScreen(), 0], ['rest', rand(1.5, 7)]);
    return steps;
  },
};

/** A move's duration from its distance, like reaching for something (longer reaches take longer, but not proportionally). */
const reach = (d) => (0.28 + 0.16 * Math.log2(1 + d / 24)) * rand(0.85, 1.3);

/** Turn a habit's steps into timed segments with curves, overshoots and corrections. */
function plan(start, steps) {
  const segs = [];
  let p = start;
  for (const s of steps) {
    if (s[0] === 'rest') { segs.push({ kind: 'rest', at: p, dur: s[1] }); continue; }
    const to = s[1], d = Math.hypot(to.x - p.x, to.y - p.y);
    if (d < 1) continue;
    const dur = s[2] || reach(d);
    const bend = (Math.random() < 0.5 ? -1 : 1) * d * rand(0.04, 0.2);
    const nx = -(to.y - p.y) / d, ny = (to.x - p.x) / d;
    const ctrl = { x: (p.x + to.x) / 2 + nx * bend, y: (p.y + to.y) / 2 + ny * bend };
    if (d > 120 && Math.random() < 0.45) {
      // overshoot a little, then correct
      const o = rand(0.03, 0.08), past = { x: to.x + (to.x - p.x) * o, y: to.y + (to.y - p.y) * o };
      segs.push({ kind: 'move', from: p, ctrl, to: past, dur }, { kind: 'move', from: past, ctrl: { x: (past.x + to.x) / 2, y: (past.y + to.y) / 2 }, to, dur: rand(0.12, 0.28) });
    } else segs.push({ kind: 'move', from: p, ctrl, to, dur });
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

/**
 * Start simulated visitors on the page. rate: "rare" | "sometimes" | "often" (or "demo" to see them
 * quickly). Returns stop().
 */
export function startPhantoms(layer, rate = 'sometimes') {
  const R = RATES[rate] || RATES.sometimes;
  if (Math.random() > R.chance) return () => {};
  const live = new Set();
  let timer = 0, raf = 0, stopped = false;

  function visit() {
    if (stopped) return;
    if (!document.hidden && live.size < R.together) {
      // arrive: from an edge (coming in from elsewhere), or simply appear (a mouse woken up)
      const edge = Math.random() < 0.45;
      const start = edge ? pick([{ x: scrollX - 10, y: scrollY + innerHeight * rand(0.2, 0.8) }, { x: scrollX + innerWidth + 10, y: scrollY + innerHeight * rand(0.2, 0.8) }, { x: scrollX + innerWidth * rand(0.2, 0.8), y: scrollY + innerHeight + 10 }]) : onScreen();
      const habits = Object.keys(BEHAVIOURS);
      // a visit is one to three habits strung together, so some stay a few seconds and some a minute
      let steps = [], p = start;
      const n = Math.random() < 0.5 ? 1 : Math.random() < 0.7 ? 2 : 3;
      for (let i = 0; i < n; i++) { const more = BEHAVIOURS[pick(habits)](p); steps = steps.concat(more); const last = [...more].reverse().find((s) => s[0] === 'move'); if (last) p = last[1]; }
      // leave: off an edge, or just stop (tab switched, hand off the mouse)
      if (Math.random() < 0.5) steps.push(['move', { x: Math.random() < 0.5 ? scrollX - 30 : scrollX + innerWidth + 30, y: p.y + rand(-120, 120) }, 0]);
      const el = cursor(layer), segs = plan(start, steps);
      const v = { el, segs, i: 0, t0: performance.now(), pos: start, seed: rand(0, 100) };
      el.style.left = start.x + 'px'; el.style.top = start.y + 'px';
      requestAnimationFrame(() => el.classList.add('on'));
      live.add(v);
      if (!raf) raf = requestAnimationFrame(frame);
    }
    timer = setTimeout(visit, rand(...R.gap) * 1000);
  }

  function frame(now) {
    raf = 0;
    for (const v of live) {
      let s = v.segs[v.i];
      while (s && (now - v.t0) / 1000 >= s.dur) { v.t0 += s.dur * 1000; v.i++; s = v.segs[v.i]; }
      if (!s) {
        v.el.classList.remove('on');
        const el = v.el; setTimeout(() => el.remove(), 700);
        live.delete(v);
        continue;
      }
      const k = (now - v.t0) / 1000 / s.dur, tt = now / 1000 + v.seed;
      let x, y;
      if (s.kind === 'move') {
        const e = ease(clamp(k, 0, 1)), a = 1 - e;
        x = a * a * s.from.x + 2 * a * e * s.ctrl.x + e * e * s.to.x;
        y = a * a * s.from.y + 2 * a * e * s.ctrl.y + e * e * s.to.y;
        x += Math.sin(tt * 23) * 0.5; y += Math.cos(tt * 19) * 0.5; // tremor
      } else {
        // resting hands still drift a pixel or two
        x = s.at.x + Math.sin(tt * 1.3) * 1.4 + Math.sin(tt * 3.1) * 0.6;
        y = s.at.y + Math.cos(tt * 1.1) * 1.2 + Math.sin(tt * 2.7) * 0.5;
      }
      v.el.style.left = x.toFixed(1) + 'px'; v.el.style.top = y.toFixed(1) + 'px';
    }
    if (live.size && !stopped) raf = requestAnimationFrame(frame);
  }

  timer = setTimeout(visit, rand(...R.first) * 1000);
  return () => { stopped = true; clearTimeout(timer); cancelAnimationFrame(raf); for (const v of live) v.el.remove(); live.clear(); };
}

export const _test = { plan, reach, ease, BEHAVIOURS, RATES };
