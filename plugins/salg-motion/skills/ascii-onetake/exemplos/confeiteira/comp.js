// Reel "Confeiteira" — ASCII onetake (GUIA-DE-ESTILO.md). 17000 small ASCII agents that never leave the film:
// IA → lojas → bolo → encomenda → conta que não fecha → app → pedido → sistema → roleta → solução.
// Colour carries meaning: gold/green = money · purple = IA/sistema · blue = WhatsApp/social · gray = anonymity
// · red = loss · orange = building. Everything is a pure function of t; deterministic (no Math.random on the render path).
'use strict';

const W = 1080, H = 1920, CX = 540, CY = 800, FPS = 30, DUR = 71.81, N = 17000;
const SHUTTER = 0.5 / FPS; // 180°

// ───────────────────────── utils
const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, p) => a + (b - a) * p;
const E = {
  lin: p => p,
  expoOut: p => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p)),
  cubicOut: p => 1 - Math.pow(1 - p, 3),
  quadIn: p => p * p,
  inOut: p => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
  sine: p => -(Math.cos(Math.PI * p) - 1) / 2,
  backOut: p => { const c1 = 1.25, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); },
};
const ramp = (t, t0, d, e = E.cubicOut) => e(clamp((t - t0) / d));
function hash(i, k = 0) {
  let h = (Math.imul(i | 0, 374761393) + Math.imul(k | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

// ───────────────────────── glyphs & tints
const CH = [...' .·:-=+*#%@$?!01<>/\\|_▶▪█▓▒░o' + 'abcdefghijklmnpqrstuvwxyzáãçéêíóõúABCDEFGHIJKLMNOPQRSTUVWXYZ23456789,'];
const CI = {}; CH.forEach((c, i) => (CI[c] = i));
const SCR = [...'01<>/\\|=+*#%$?!'].map(c => CI[c]);
const pick = (s, r) => CI[s[(r * s.length) | 0]];
const chi = ch => (ch === ' ' ? CI['·'] : CI[ch] ?? CI[ch.toLowerCase()] ?? CI['=']);
//              white      purple     blue       orange     gray       gold       green      red
//              white      purple     blue       orange     gray       gold       green      red        pink       cream      chocolate
const TINT = ['#F2F2F5', '#A68BFF', '#6EA6FF', '#FF9B55', '#7C7C86', '#F2C14E', '#3DDC84', '#FF5A52', '#FF8FB8', '#F6E3C2', '#B97A55'];
const WHITE = 0, PURPLE = 1, BLUE = 2, ORANGE = 3, GRAY = 4, GOLD = 5, GREEN = 6, RED = 7, PINK = 8, CREAM = 9, CHOCO = 10;
// pink (sweetness, affection), cream (home-made warmth) and chocolate (comfort) live only on the food
const TEXT_TINT = { '*': '#FFFFFF', '^': '#BBA3FF', '~': '#93BCFF', '=': '#FFB07A', '!': '#F5CB62', '+': '#5BE39A', '&': '#FF7A70' };
const money = r => (r > 0.72 ? GREEN : GOLD);
const CELL = 64;
let atlas;
function buildAtlas() {
  atlas = mk(CH.length * CELL, TINT.length * CELL);
  const g = atlas.getContext('2d');
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `500 50px 'JetBrains Mono'`;
  TINT.forEach((col, ti) => {
    g.fillStyle = col;
    CH.forEach((c, ci) => g.fillText(c, ci * CELL + CELL / 2, ti * CELL + CELL / 2 + 2));
  });
}

// ───────────────────────── agent buffers
function Buf() {
  return { x: new Float32Array(N), y: new Float32Array(N), a: new Float32Array(N),
           c: new Uint8Array(N), t: new Uint8Array(N), s: new Float32Array(N) };
}
function copyAgent(o, i, b) { o.x[i] = b.x[i]; o.y[i] = b.y[i]; o.a[i] = b.a[i]; o.c[i] = b.c[i]; o.t[i] = b.t[i]; o.s[i] = b.s[i]; }

// Hilbert order over one fixed world box: rank along the curve = the same region in every shape,
// so agent i lands on the i-th point of each shape and morphs flow region to region.
function xy2d(n, x, y) {
  let d = 0;
  for (let s = n >> 1; s > 0; s >>= 1) {
    const rx = (x & s) > 0 ? 1 : 0, ry = (y & s) > 0 ? 1 : 0;
    d += s * s * ((3 * rx) ^ ry);
    if (ry === 0) { if (rx === 1) { x = s - 1 - x; y = s - 1 - y; } const tt = x; x = y; y = tt; }
  }
  return d;
}
function hsort(pts) {
  const n = 1024;
  for (const p of pts) {
    const gx = clamp(Math.floor((((p.hx ?? p.x) + 700) / 1400) * n), 0, n - 1);
    const gy = clamp(Math.floor((((p.hy ?? p.y) + 1000) / 2000) * n), 0, n - 1);
    p.hd = xy2d(n, gx, gy);
  }
  return pts.sort((a, b) => a.hd - b.hd);
}

// Sample M points from a drawing (white on transparent, origin at centre).
function maskPts(M, draw, o = {}) {
  const w = o.w || 1000, h = o.h || 1100, step = o.step || 2, r = rng(o.seed || 7);
  const c = mk(w, h), g = c.getContext('2d');
  g.translate(w / 2, h / 2); g.fillStyle = '#fff'; g.strokeStyle = '#fff'; g.lineCap = 'round'; g.lineJoin = 'round';
  draw(g);
  const d = g.getImageData(0, 0, w, h).data, cand = [];
  for (let y = 0; y < h; y += step) for (let x = 0; x < w; x += step) {
    const al = d[(y * w + x) * 4 + 3];
    if (al > 60) cand.push([x - w / 2, y - h / 2, al / 255]);
  }
  const idx = cand.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) { const j = (r() * (i + 1)) | 0; [idx[i], idx[j]] = [idx[j], idx[i]]; }
  const pts = [];
  for (let k = 0; k < M; k++) {
    const [x, y, v] = cand[idx[k % idx.length]];
    const rr = r();
    pts.push({ x: x + (r() - 0.5) * (o.jit ?? 2.2), y: y + (r() - 0.5) * (o.jit ?? 2.2), v, r: rr,
               a: o.alpha ? o.alpha(v, rr) : 0.55 + 0.45 * rr,
               c: o.char ? o.char(v, rr, x, y) : CI['#'],
               t: o.tint ? o.tint(v, rr, x, y) : WHITE,
               s: o.size ? o.size(v, rr) : 0.85 + 0.35 * r() });
  }
  return o.nosort ? pts : hsort(pts);
}
const xf = (pts, sx, dx, dy, extra = {}) => pts.map(p => ({ ...p, x: p.x * sx + dx, y: p.y * sx + dy, ...extra }));

// stick figure (the person glyph used for the group, the owner)
function personPts(M, seed, o = {}) {
  return maskPts(M, g => {
    g.lineWidth = 11; g.beginPath(); g.arc(0, -78, 26, 0, 7); g.stroke();
    [[0, -46, 0, 40], [-52, 2, 0, -28], [52, 2, 0, -28], [0, 40, -36, 118], [0, 40, 36, 118]].forEach(([a, b2, c, d]) => {
      g.beginPath(); g.moveTo(a, b2); g.lineTo(c, d); g.stroke();
    });
  }, { seed, step: 1, jit: 1.2, char: (v, rr) => pick('@#%*', rr), alpha: (v, rr) => 0.7 + 0.3 * rr, size: () => 0.75, w: 300, h: 300, ...o });
}

// ───────────────────────── shapes
// A shape = groups of points. Agent with global RANK r joins a group by rank range; inside a group, agents in
// index order take points in order. Same group sizes across shapes ⇒ the same agents keep their role (heads stay heads).
const RANK = new Int32Array(N);
const HOME = { x: new Float32Array(N), y: new Float32Array(N), c: new Uint8Array(N) };
(function () {
  const r = rng(99), p = [...Array(N).keys()];
  for (let i = N - 1; i > 0; i--) { const j = (r() * (i + 1)) | 0; [p[i], p[j]] = [p[j], p[i]]; }
  p.forEach((agent, rank) => (RANK[agent] = rank));
  for (let i = 0; i < N; i++) { HOME.x[i] = (r() - 0.5) * 1240; HOME.y[i] = -760 + r() * 1600; HOME.c[i] = pick('.·:+01', r()); }
})();

function makeShape(groups, dyn) {
  const tot = groups.reduce((n, g) => n + g.length, 0); // over budget: thin every group evenly
  if (tot > N) groups = groups.map((g, gi) => { const r = rng(700 + gi); return g.filter(() => r() < N / tot); });
  const flat = [];
  groups.forEach((g, gi) => g.forEach(p => { p.g = gi; flat.push(p); }));
  const starts = [], counts = groups.map(g => g.length);
  let acc = 0; counts.forEach(c => { starts.push(acc); acc += c; });
  const map = new Int32Array(N).fill(-1), fill = new Int32Array(groups.length);
  for (let i = 0; i < N; i++) {
    const r = RANK[i]; if (r >= acc) continue;
    let gi = 0; while (r >= starts[gi] + counts[gi]) gi++;
    map[i] = starts[gi] + fill[gi]++;
  }
  const P = { x: Float32Array.from(flat, p => p.x), y: Float32Array.from(flat, p => p.y),
              a: Float32Array.from(flat, p => p.a), c: Uint8Array.from(flat, p => p.c),
              t: Uint8Array.from(flat, p => p.t), s: Float32Array.from(flat, p => p.s) };
  return {
    pts: flat, map,
    fill(t, b) {
      for (let i = 0; i < N; i++) {
        const k = map[i];
        if (k < 0) { b.x[i] = HOME.x[i] * 1.7; b.y[i] = HOME.y[i] * 1.5 - 300; b.a[i] = 0; b.c[i] = HOME.c[i]; b.t[i] = 0; b.s[i] = 0.8; continue; }
        b.x[i] = P.x[k]; b.y[i] = P.y[k]; b.a[i] = P.a[k]; b.c[i] = P.c[k]; b.t[i] = P.t[k]; b.s[i] = P.s[k];
        if (dyn) dyn(t, i, flat[k], b);
      }
    },
  };
}

const SH = {};
const HEAVY = px => `700 ${px}px 'Inter'`;
const GOLDEN = Math.PI * (3 - Math.sqrt(5));

// crowd: P persons, each = head 'o' + body 'A' (two agents, kept as a pair)
const P_CROWD = 2484; // 54 × 46
function crowdGrid(cols, rows, sx, sy, cx, cy, tint = GRAY) {
  const ps = [];
  for (let k = 0; k < cols * rows; k++) {
    const c = k % cols, rr = (k / cols) | 0;
    ps.push({ k, col: c, row: rr, x: cx + (c - (cols - 1) / 2) * sx + (rr % 2) * sx * 0.5, y: cy + (rr - (rows - 1) / 2) * sy });
  }
  hsort(ps);
  const pts = [];
  ps.forEach((p, n) => {
    pts.push({ ...p, n, part: 0, x: p.x, y: p.y - 7, a: 0.9, c: CI['o'], t: tint, s: 0.9 });
    pts.push({ ...p, n, part: 1, x: p.x, y: p.y + 6, a: 0.85, c: CI['A'], t: tint, s: 1.0 });
  });
  return pts;
}
// ───────────────────────── realistic ASCII: shaded drawings sampled on a fixed grid
// Every object is painted with light and shadow, then read cell by cell: one agent per lit cell, the glyph picked
// by brightness (· : = + * # % @), the tint by the nearest palette hue. Same grid in every shape, so the texture is constant.
const CELLPX = 5;
const RAMP = ' .·:-=+*#%@';
const PAL = TINT.map(h => [1, 3, 5].map(k => parseInt(h.slice(k, k + 2), 16)));
const tone = (hex, v) => { const [r, g, b] = [1, 3, 5].map(k => parseInt(hex.slice(k, k + 2), 16)); return `rgb(${(r * v) | 0},${(g * v) | 0},${(b * v) | 0})`; };
const WT = '#F2F2F5', GD = '#F2C14E', PU = '#A68BFF', BL = '#6EA6FF', OR = '#FF9B55', GN = '#3DDC84', GY = '#9A9AA4';
const LG = (g, x0, y0, x1, y1, st) => { const q = g.createLinearGradient(x0, y0, x1, y1); st.forEach(([o, c]) => q.addColorStop(o, c)); return q; };
const RG = (g, x, y, r0, r1, st) => { const q = g.createRadialGradient(x, y, r0, x, y, r1); st.forEach(([o, c]) => q.addColorStop(o, c)); return q; };
const RR = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
const poly = (g, pts) => { g.beginPath(); pts.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); };
let ID_PASS = false;
const F = (ti, style) => (ID_PASS ? `rgb(${ti * 20 + 10},0,0)` : style);
const sphere = (g, x, y, r, hex = WT, v = 1, ti = WHITE) => { g.fillStyle = ID_PASS ? F(ti) : RG(g, x - r * 0.35, y - r * 0.35, 0, r * 1.25, [[0, tone(hex, v)], [0.55, tone(hex, v * 0.6)], [1, tone(hex, v * 0.2)]]); g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); };

function imgPts(draw, o = {}) {
  const w = o.w || 1000, h = o.h || 1100, cell = o.cell || CELLPX, r = rng(o.seed || 5);
  const c = mk(w, h), g = c.getContext('2d');
  g.translate(w / 2, h / 2); g.lineCap = 'round'; g.lineJoin = 'round';
  draw(g);
  const d = g.getImageData(0, 0, w, h).data, pts = [];
  let idm = null; // optional colour map: the same drawing painted with flat tint codes, occlusion included
  if (o.ids) {
    const c2 = mk(w, h), g2 = c2.getContext('2d');
    g2.translate(w / 2, h / 2); g2.lineCap = 'round'; g2.lineJoin = 'round'; g2.imageSmoothingEnabled = false;
    ID_PASS = true; try { draw(g2); } finally { ID_PASS = false; }
    idm = g2.getImageData(0, 0, w, h).data;
  }
  for (let cy = 0; cy + cell <= h; cy += cell) for (let cx = 0; cx + cell <= w; cx += cell) {
    let R = 0, G = 0, B = 0, A = 0, n = 0;
    for (let y = cy; y < cy + cell; y += 2) for (let x = cx; x < cx + cell; x += 2) {
      const k = (y * w + x) * 4, a = d[k + 3] / 255; R += d[k] * a; G += d[k + 1] * a; B += d[k + 2] * a; A += a; n++;
    }
    const cov = A / n; if (cov < 0.3) continue;
    R /= A; G /= A; B /= A;
    const lum = ((0.299 * R + 0.587 * G + 0.114 * B) / 255) * Math.min(1, cov * 1.15);
    if (lum < (o.min ?? 0.08)) continue;
    const mx = Math.max(R, G, B), mn = Math.min(R, G, B);
    let t = WHITE;
    const kc = (((cy + (cell >> 1)) * w) + cx + (cell >> 1)) * 4;
    if (idm && idm[kc + 3] > 100) t = clamp(Math.round((idm[kc] - 10) / 20), 0, TINT.length - 1);
    else if (mx > 0 && (mx - mn) / mx > 0.25) {
      let best = 1e9;
      PAL.forEach(([pr, pg, pb], ti) => {
        if (ti === WHITE || ti === GRAY || ti > RED) return; // food tints only come from a colour map
        const s = Math.max(pr, pg, pb), dd = (R / mx - pr / s) ** 2 + (G / mx - pg / s) ** 2 + (B / mx - pb / s) ** 2;
        if (dd < best) { best = dd; t = ti; }
      });
    }
    const rr = r(), li = clamp(Math.pow(lum, 0.8) + (rr - 0.5) * 0.08);
    if (o.money && t === GOLD && rr > 0.74) t = GREEN;
    pts.push({ x: cx + cell / 2 - w / 2 + (r() - 0.5) * cell * 0.2, y: cy + cell / 2 - h / 2 + (r() - 0.5) * cell * 0.2, v: lum, r: rr,
      a: 0.38 + 0.62 * li, c: CI[RAMP[clamp(Math.round(li * (RAMP.length - 1)), 1, RAMP.length - 1)]],
      t: o.tint !== undefined ? o.tint : t, s: (cell * 1.55 / 14) * (0.8 + 0.35 * li) });
  }
  return o.nosort ? pts : hsort(pts);
}
const art = (draw, s = 1, dx = 0, dy = 0, o = {}) => imgPts(g => { g.save(); g.translate(dx, dy); g.scale(s, s); draw(g); g.restore(); }, o);
const tagged = (pts, tag) => pts.map(p => ({ ...p, ...tag }));

// ── the objects
// a three-tier party cake: pink fondant with white drip, vanilla cream with pink drip, chocolate with cream drip,
// strawberries on top, a striped candle — the colour map (F) gives every part its tint, the shading gives the glyphs
const CAKE_TIERS = [ // half-width, bottom y, height · side, icing, pearls
  [230, 240, 180, PINK, WHITE, CREAM], [170, 60, 160, CREAM, PINK, WHITE], [112, -100, 130, CHOCO, CREAM, PINK]];
function cakeArt(g) {
  g.save(); g.translate(0, 258); g.scale(1, 0.13);                   // cake board
  g.fillStyle = F(WHITE, LG(g, -320, 0, 320, 0, [[0, tone(WT, 0.3)], [0.4, tone(WT, 0.8)], [1, tone(WT, 0.32)]]));
  g.beginPath(); g.arc(0, 0, 315, 0, 7); g.fill(); g.restore();
  CAKE_TIERS.forEach(([hw, by, h, side, icing, pearl], k) => {
    const top = by - h, ry = hw * 0.15, front = x => top + ry * Math.sqrt(Math.max(0, 1 - (x / hw) ** 2));
    g.fillStyle = F(side, LG(g, -hw, 0, hw, 0, [[0, tone(WT, 0.16)], [0.22, tone(WT, 0.55)], [0.4, tone(WT, 0.72)], [0.75, tone(WT, 0.38)], [1, tone(WT, 0.14)]]));
    g.beginPath(); g.moveTo(-hw, top); g.lineTo(-hw, by); g.ellipse(0, by, hw, ry, 0, Math.PI, 0, true); g.lineTo(hw, top); g.closePath(); g.fill();
    g.fillStyle = F(icing, LG(g, 0, top - ry, 0, top + ry, [[0, tone(WT, 0.6)], [1, tone(WT, 0.9)]]));
    g.beginPath(); g.ellipse(0, top, hw, ry, 0, 0, 7); g.fill();
    g.beginPath(); // icing dripping over the front rim
    for (let x = -hw; x <= hw; x += 2) {
      const dr = 8 + 26 * Math.pow(Math.max(0, Math.sin(x * 0.085 + k * 1.7)), 5) + 4 * Math.sin(x * 0.21);
      x === -hw ? g.moveTo(x, front(x) + dr) : g.lineTo(x, front(x) + dr);
    }
    for (let x = hw; x >= -hw; x -= 2) g.lineTo(x, front(x) - 2);
    g.closePath();
    g.fillStyle = F(icing, LG(g, -hw, 0, hw, 0, [[0, tone(WT, 0.5)], [0.35, tone(WT, 1)], [0.8, tone(WT, 0.72)], [1, tone(WT, 0.38)]])); g.fill();
    for (let x = -hw + 9; x <= hw - 9; x += 17) { // pearl border
      const y = by + ry * Math.sqrt(Math.max(0, 1 - (x / hw) ** 2)) - 7;
      sphere(g, x, y, 8, WT, 0.75 + 0.25 * (1 - Math.min(1, Math.abs(x / hw + 0.25))), pearl);
    }
  });
  for (let k = 0; k < 7; k++) { // strawberries on the top tier, a tiny leaf on each
    const x = -90 + k * 30, y = -230 + 16.8 * 0.8 * Math.sqrt(1 - (x / 112) ** 2) - 8;
    sphere(g, x, y, 11, WT, 0.95, PINK);
    g.fillStyle = F(CREAM, tone(WT, 0.85)); g.beginPath(); g.ellipse(x, y - 11, 6, 3, 0, 0, 7); g.fill();
  }
  g.fillStyle = F(WHITE, LG(g, -11, 0, 11, 0, [[0, tone(WT, 0.4)], [0.4, tone(WT, 1)], [1, tone(WT, 0.35)]])); RR(g, -11, -322, 22, 92, 4); g.fill(); // candle
  g.save(); RR(g, -11, -322, 22, 92, 4); g.clip(); g.fillStyle = F(PINK, tone(WT, 0.6));
  for (let y = -330; y < -220; y += 22) { poly(g, [[-12, y], [12, y - 12], [12, y - 4], [-12, y + 8]]); g.fill(); }
  g.restore();
}
function flameArt(g) {
  g.fillStyle = F(CREAM, RG(g, 0, -352, 0, 46, [[0, tone(WT, 0.3)], [1, tone(WT, 0)]])); g.beginPath(); g.arc(0, -352, 46, 0, 7); g.fill();
  g.fillStyle = F(CREAM, RG(g, 0, -344, 0, 30, [[0, tone(WT, 1)], [1, tone(WT, 0.55)]]));
  g.beginPath(); g.moveTo(0, -390); g.quadraticCurveTo(20, -352, 0, -328); g.quadraticCurveTo(-20, -352, 0, -390); g.fill();
}
function cakePts(s = 1, dx = 0, dy = 0, seed = 1, cell = CELLPX) {
  return hsort([...art(cakeArt, s, dx, dy, { seed, cell, nosort: true, ids: true }),
    ...tagged(art(flameArt, s, dx, dy, { seed: seed + 1, cell, nosort: true, ids: true }), { flame: 1 })]);
}
function cakeLife(t, i, p, b) { // the candle flickers wherever the cake is
  if (!p.flame) return;
  const f = 0.5 * Math.sin(t * 13 + i) + 0.5 * Math.sin(t * 7.3);
  b.x[i] += f * 2.2; b.a[i] = p.a * (0.75 + 0.25 * f);
}
function phoneArt(g, o = {}) {
  const B = o.body || WT;
  g.fillStyle = LG(g, -180, -350, 180, 350, [[0, tone(B, 0.95)], [0.35, tone(B, 0.42)], [0.65, tone(B, 0.6)], [1, tone(B, 0.9)]]);
  RR(g, -180, -350, 360, 700, 50); g.fill();
  g.fillStyle = tone(B, 0.22); RR(g, -172, -342, 344, 684, 44); g.fill();
  g.fillStyle = '#000'; RR(g, -166, -336, 332, 672, 40); g.fill();
  g.save(); RR(g, -166, -336, 332, 672, 40); g.clip();
  g.fillStyle = tone(WT, 0.12); poly(g, [[-166, -110], [166, -336], [166, -262], [-166, -40]]); g.fill(); // glass reflection
  if (o.screen) o.screen(g);
  g.restore();
  g.strokeStyle = tone(WT, 0.32); g.lineWidth = 2; RR(g, -46, -326, 92, 24, 12); g.stroke(); // island
  g.fillStyle = tone(B, 0.75); RR(g, 178, -200, 7, 70, 3); g.fill(); RR(g, -185, -230, 7, 44, 3); g.fill(); RR(g, -185, -172, 7, 44, 3); g.fill();
}
function shopArt(g) {
  g.fillStyle = LG(g, -145, 0, 145, 0, [[0, tone(WT, 0.3)], [0.5, tone(WT, 0.55)], [1, tone(WT, 0.28)]]); g.fillRect(-145, -40, 290, 190);
  g.fillStyle = tone(WT, 0.85); RR(g, -120, -168, 240, 34, 6); g.fill();                      // sign
  g.fillStyle = tone(WT, 0.2); for (let k = 0; k < 5; k++) g.fillRect(-90 + k * 40, -156, 22, 10);
  for (let k = 0; k < 6; k++) {                                                                 // striped awning
    const x0 = -168 + k * 56, xt = -150 + k * 50;
    g.fillStyle = tone(WT, k % 2 ? 0.38 : 0.95);
    poly(g, [[xt, -125], [xt + 50, -125], [x0 + 56, -62], [x0, -62]]); g.fill();
    g.beginPath(); g.arc(x0 + 28, -62, 28, 0, Math.PI); g.fill();
  }
  g.fillStyle = tone(WT, 0.12); g.fillRect(-10, 0, 130, 90);                                    // window + reflection
  g.fillStyle = tone(WT, 0.6); poly(g, [[8, 90], [58, 0], [80, 0], [30, 90]]); g.fill();
  g.strokeStyle = tone(WT, 0.9); g.lineWidth = 6; g.strokeRect(-10, 0, 130, 90);
  g.fillStyle = tone(WT, 0.2); g.fillRect(-115, 10, 80, 140); g.strokeRect(-115, 10, 80, 140);   // door
  sphere(g, -48, 85, 6, WT, 1);
  g.fillStyle = tone(WT, 0.7); g.fillRect(-152, 148, 304, 12);
}
const textArt = (str, px, hex, y = 0) => g => {
  g.font = HEAVY(px); g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = LG(g, 0, y - px * 0.42, 0, y + px * 0.42, [[0, tone(hex, 1)], [0.5, tone(hex, 0.72)], [1, tone(hex, 0.38)]]);
  g.fillText(str, 0, y);
  g.globalCompositeOperation = 'source-atop'; g.fillStyle = tone(WT, 0.95);                       // gloss band
  poly(g, [[-px, y - px * 0.08], [px, y - px * 0.52], [px, y - px * 0.4], [-px, y + px * 0.04]]); g.fill();
  g.globalCompositeOperation = 'source-over';
  g.lineWidth = Math.max(2, px * 0.012); g.strokeStyle = tone(hex, 1); g.strokeText(str, 0, y);
};
const photoArt = (x0, y0, sz) => g => {   // a reference photo: a little cake on a grey backdrop
  g.fillStyle = F(WHITE, LG(g, 0, y0, 0, y0 + sz, [[0, tone(WT, 0.24)], [1, tone(WT, 0.12)]])); RR(g, x0, y0, sz, sz, sz * 0.12); g.fill();
  g.save(); RR(g, x0, y0, sz, sz, sz * 0.12); g.clip(); g.translate(x0 + sz / 2, y0 + sz * 0.56); g.scale(sz / 620, sz / 620); cakeArt(g); g.restore();
  g.strokeStyle = F(WHITE, tone(WT, 0.9)); g.lineWidth = 3; RR(g, x0, y0, sz, sz, sz * 0.12); g.stroke();
};
const cube = (g, x, y, s, v = 1) => {
  g.fillStyle = tone(WT, v); poly(g, [[x, y - s * 0.5], [x + s, y], [x, y + s * 0.5], [x - s, y]]); g.fill();
  g.fillStyle = tone(WT, v * 0.62); poly(g, [[x - s, y], [x, y + s * 0.5], [x, y + s * 1.5], [x - s, y + s]]); g.fill();
  g.fillStyle = tone(WT, v * 0.36); poly(g, [[x, y + s * 0.5], [x + s, y], [x + s, y + s], [x, y + s * 1.5]]); g.fill();
};
const sqText = (g, s, px, x, y, v) => { g.font = HEAVY(px); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = tone(WT, v); g.fillText(s, x, y); };
const berry = (g, x, y, r) => {
  g.fillStyle = F(PINK, RG(g, x - r * 0.4, y - r * 0.3, 0, r * 1.5, [[0, tone(WT, 1)], [0.55, tone(WT, 0.62)], [1, tone(WT, 0.2)]]));
  g.beginPath(); g.moveTo(x, y + r * 1.15); g.bezierCurveTo(x - r * 1.15, y + r * 0.25, x - r, y - r * 0.85, x, y - r * 0.62);
  g.bezierCurveTo(x + r, y - r * 0.85, x + r * 1.15, y + r * 0.25, x, y + r * 1.15); g.fill();
  g.fillStyle = F(PINK, tone(WT, 0.25));                                   // seeds
  for (let a = -2; a <= 2; a++) for (let b2 = -1; b2 <= 2; b2++) { g.beginPath(); g.arc(x + a * r * 0.3 + (b2 % 2) * r * 0.15, y + b2 * r * 0.3, 1.8, 0, 7); g.fill(); }
  g.fillStyle = F(CREAM, tone(WT, 0.9));                                   // the leafy crown
  for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k - 2) * 0.55; g.beginPath(); g.ellipse(x + Math.cos(a) * r * 0.35, y - r * 0.7 + Math.sin(a) * r * 0.2, r * 0.32, r * 0.12, a, 0, 7); g.fill(); }
};
const ING_ART = [
  g => { // farinha: a cream paper sack with a white label
    poly(g, [[-58, -40], [-36, -64], [-16, -44], [4, -66], [24, -44], [44, -64], [58, -40], [64, 86], [-64, 86]]);
    g.fillStyle = F(CREAM, LG(g, -64, 0, 64, 0, [[0, tone(WT, 0.32)], [0.4, tone(WT, 0.88)], [1, tone(WT, 0.36)]])); g.fill();
    g.strokeStyle = F(CREAM, tone(WT, 0.25)); g.lineWidth = 3; [[-30, -36, -26, 84], [22, -40, 28, 84]].forEach(([a, b2, c2, d2]) => { g.beginPath(); g.moveTo(a, b2); g.lineTo(c2, d2); g.stroke(); });
    g.fillStyle = F(WHITE, tone(WT, 0.16)); g.fillRect(-50, 6, 100, 40);
    g.font = HEAVY(25); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = F(WHITE, tone(WT, 1)); g.fillText('TRIGO', 0, 27);
  },
  g => { // ovos
    g.fillStyle = F(CREAM, tone(WT, 0.14)); g.beginPath(); g.ellipse(8, 84, 70, 10, 0, 0, 7); g.fill();
    [[-26, 22, 40, 52, 0.85], [26, 14, 44, 58, 1]].forEach(([x, y, rx, ry, v]) => {
      g.fillStyle = F(CREAM, RG(g, x - rx * 0.35, y - ry * 0.4, 3, ry * 1.3, [[0, tone(WT, v)], [0.55, tone(WT, v * 0.6)], [1, tone(WT, 0.18)]]));
      g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fill();
    });
  },
  g => { berry(g, -34, 22, 36); berry(g, 34, 30, 34); berry(g, 0, -24, 34); }, // morangos
  g => { // chocolate: an iso bar, half unwrapped
    const P = (u, v, z) => [(u - v) * 0.9, (u + v) * 0.45 - z];
    const q = pts => poly(g, pts.map(([u, v, z]) => P(u, v, z)));
    g.fillStyle = F(CHOCO, tone(WT, 0.95)); q([[-60, -40, 22], [60, -40, 22], [60, 40, 22], [-60, 40, 22]]); g.fill();
    g.fillStyle = F(CHOCO, tone(WT, 0.6)); q([[-60, 40, 0], [60, 40, 0], [60, 40, 22], [-60, 40, 22]]); g.fill();
    g.fillStyle = F(CHOCO, tone(WT, 0.38)); q([[60, -40, 0], [60, 40, 0], [60, 40, 22], [60, -40, 22]]); g.fill();
    g.strokeStyle = F(CHOCO, tone(WT, 0.3)); g.lineWidth = 3;           // the squares
    for (let u = -30; u <= 30; u += 30) { g.beginPath(); g.moveTo(...P(u, -40, 22)); g.lineTo(...P(u, 40, 22)); g.stroke(); }
    g.beginPath(); g.moveTo(...P(-60, 0, 22)); g.lineTo(...P(60, 0, 22)); g.stroke();
    g.fillStyle = F(WHITE, tone(WT, 0.8)); q([[20, -42, 23], [62, -42, 23], [62, 42, 23], [20, 42, 23]]); g.fill(); // foil
    g.fillStyle = F(WHITE, tone(WT, 0.5)); q([[62, -42, 0], [62, 42, 0], [62, 42, 23], [62, -42, 23]]); g.fill();
  },
  g => { // manteiga
    g.fillStyle = F(CREAM, tone(WT, 1)); poly(g, [[-74, -8], [26, -40], [80, -20], [-20, 12]]); g.fill();
    g.fillStyle = F(CREAM, tone(WT, 0.7)); poly(g, [[-74, -8], [-20, 12], [-20, 52], [-74, 32]]); g.fill();
    g.fillStyle = F(CREAM, tone(WT, 0.46)); poly(g, [[-20, 12], [80, -20], [80, 20], [-20, 52]]); g.fill();
    g.fillStyle = F(WHITE, tone(WT, 0.3)); poly(g, [[30, -4], [80, -20], [80, 20], [30, 36]]); g.fill(); // the wrapper
  },
];
const ING_POS_ART = [[-330, 10], [-170, -150], [0, -215], [170, -150], [330, 10]];

const WH = { cx: 0, cy: -20, R: 330, n: 10, t0: 63.3, d: 1.8 };
WH.end = 2 * Math.PI * 3 - (9 + 0.5) * 2 * Math.PI / WH.n;
const wheelTheta = t => WH.end * (1 - Math.pow(1 - clamp((t - WH.t0) / WH.d), 3));
const PROF = ['CONFEITEIRA', 'DENTISTA', 'MECÂNICO', 'ADVOGADA', 'BARBEIRO', 'CORRETOR', 'PERSONAL', 'NUTRI', 'ARQUITETA', 'VOCÊ'];
const ING_POS = ING_POS_ART;
const LIT = [33.0, 34.62, 36.1, 37.68]; // app sections: ingredientes · receita · decoração · custo real

function buildShapes() {
  // dust — the agents before they are anything
  SH.dust = makeShape([hsort([...Array(N)].map((_, i) => ({ x: HOME.x[i], y: HOME.y[i], i0: i,
    a: 0.07 + 0.3 * Math.pow(hash(i, 1), 2), c: HOME.c[i], t: hash(i, 3) > 0.9 ? PURPLE : WHITE, s: 0.5 + 0.4 * hash(i, 2) })))],
    (t, i, p, b) => {
      const pull = 1 - 0.14 * Math.min(t, 1);
      b.x[i] = p.x * pull + 14 * Math.sin(t * 0.31 + p.i0 * 0.7);
      b.y[i] = p.y * pull + 10 * Math.cos(t * 0.27 + p.i0);
    });

  // "IA" — a inteligência artificial
  SH.ia = makeShape([art(textArt('IA', 560, PU, 20), 1, 0, 0, { seed: 13 })],
    (t, i, p, b) => { const br = 1 + 0.01 * Math.sin(t * 2.6); b.x[i] = p.x * br; b.y[i] = p.y * br; });

  // "não cabe" — the IA, too big, pushes down onto a small shop's awning, squashes, and goes red where it presses
  SH.nofit = makeShape([art(shopArt, 0.72, 0, 240, { seed: 14 }), tagged(art(textArt('IA', 420, PU), 1, 0, -60, { seed: 15 }), { ia: 1 })], (t, i, p, b) => {
    if (!p.ia) return;
    const push = ramp(t, 2.6, 0.55, E.cubicOut), fr = Math.floor(t * 14), floor = 140;
    const y = p.y + 45 * push, sq = 1 - 0.14 * push;
    b.y[i] = floor - (floor - y) * sq + (hash(i, fr + 1) - 0.5) * 4 * push;
    b.x[i] = p.x * (1 + 0.08 * push) + (hash(i, fr) - 0.5) * 5 * push;
    if (b.y[i] > floor - 70 && t > 2.95 && hash(i, 6) < 0.8 * ramp(t, 2.95, 0.35)) b.t[i] = RED;
  });

  // "em todos os negócios" — twelve shops, a purple IA spark lands over each; then one shop is singled out
  const HI = 4;
  {
    const shops = [], sparks = [];
    for (let k = 0; k < 12; k++) {
      const x = ((k % 3) - 1) * 270, y = -390 + Math.floor(k / 3) * 260;
      art(shopArt, 0.42, x, y, { seed: 100 + k, cell: 4, nosort: true }).forEach(p => shops.push({ ...p, shop: k }));
      for (let j = 0; j < 90; j++) {
        const q = k * 90 + j, a = hash(q, 3) * 7, rad = 18 * Math.sqrt(hash(q, 4));
        sparks.push({ shop: k, spark: 1, x: x + rad * Math.cos(a), y: y - 104 + rad * Math.sin(a) * 0.7, a: 0.9, c: pick('*+·', hash(q, 5)), t: PURPLE, s: 0.55 });
      }
    }
    SH.shops = makeShape([hsort(shops), hsort(sparks)], (t, i, p, b) => {
      const hi = ramp(t, 5.3, 0.5), isHi = p.shop === HI;
      if (p.spark) {
        const on = ramp(t, 3.85 + p.shop * 0.06, 0.25);
        b.a[i] = p.a * clamp(on, 0.02) * (0.75 + 0.25 * Math.sin(t * 8 + i)) * (isHi ? 1 : 1 - 0.6 * hi);
        b.y[i] = p.y - 3 * Math.sin(t * 3 + p.shop);
        return;
      }
      b.a[i] = p.a * (isHi ? 1.15 + 0.3 * hi : 1.15 - 0.6 * hi);
      if (!isHi && hi > 0.3) b.t[i] = GRAY;
    });
  }

  // the cake — "a confeiteira"
  SH.cake = makeShape([cakePts(1, 0, 40, 41)], (t, i, p, b) => {
    const br = 1 + 0.008 * Math.sin(t * 2.2); b.x[i] = p.x * br; b.y[i] = 40 + (p.y - 40) * br; cakeLife(t, i, p, b);
  });

  // "é descobrir se ela está ganhando dinheiro" — the cake steps down; a ? and then a gold $ rise over it
  SH.cakeq = makeShape([cakePts(0.62, 0, 200, 42), tagged(art(textArt('?', 400, WT), 1, 120, -270, { seed: 43 }), { q: 1 }),
    tagged(art(textArt('$', 410, GD), 1, -120, -270, { seed: 44, money: true }), { d: 1 })], (t, i, p, b) => {
    if (p.q) { b.a[i] = p.a * clamp(ramp(t, 10.1, 0.3), 0.02); b.y[i] = p.y - 6 * Math.sin(t * 2.4); return; }
    if (p.d) { const on = ramp(t, 11.4, 0.35, E.backOut); b.a[i] = p.a * clamp(on, 0.02); b.y[i] = p.y + 40 * (1 - on); return; }
    cakeLife(t, i, p, b);
  });

  // "com cada encomenda" — five small cakes, each with its own question
  {
    const pts = [];
    for (let k = 0; k < 5; k++) {
      const x = (k - 2) * 170;
      cakePts(0.33, x, 80, 50 + k, 4).forEach(p => pts.push({ ...p, ord: k }));
      art(textArt('?', 110, GY), 1, x, -90, { seed: 60 + k, cell: 3, tint: GRAY, nosort: true }).forEach(p => pts.push({ ...p, ord: k, q: 1 }));
    }
    SH.orders = makeShape([hsort(pts)], (t, i, p, b) => {
      const on = ramp(t, 12.25 + p.ord * 0.1, 0.25, E.backOut);
      b.y[i] = p.y + 30 * (1 - on) - (p.q ? 4 * Math.sin(t * 3 + p.ord) : 0);
      b.a[i] = p.a * clamp(on, 0.03);
    });
  }

  // "O cliente pede… no WhatsApp" — a phone; the client's messages pop in, then three reference pictures
  {
    const parts = [];
    const keys = g => { g.fillStyle = tone(WT, 0.17); for (let rr = 0; rr < 3; rr++) for (let c = 0; c < 9; c++) RR(g, -152 + c * 34 + (rr % 2) * 12, 200 + rr * 42, 26, 30, 5), g.fill(); };
    art(g => phoneArt(g, { screen: keys }), 1, 0, 0, { seed: 31, nosort: true }).forEach(p => parts.push(p));
    const bubble = (y, w, h, at, seed) => {
      art(g => {
        g.fillStyle = LG(g, -150, y, -150 + w, y + h, [[0, tone(BL, 0.95)], [1, tone(BL, 0.7)]]);
        RR(g, -150, y, w, h, 22); g.fill(); poly(g, [[-146, y + h - 16], [-168, y + h + 6], [-128, y + h - 2]]); g.fill();
        g.fillStyle = tone(WT, 1); g.fillRect(-128, y + 18, w - 60, 9); g.fillRect(-128, y + h - 30, (w - 60) * 0.6, 9);
      }, 1, 0, 0, { seed, nosort: true }).forEach(p => parts.push({ ...p, at }));
    };
    bubble(-280, 260, 76, 13.85, 70);
    bubble(-180, 300, 76, 14.85, 72);
    [16.36, 16.6, 16.9].forEach((at, k) => art(photoArt(-150 + k * 102, -76, 92), 1, 0, 0, { seed: 74 + k, cell: 4, nosort: true, ids: true }).forEach(p => parts.push({ ...p, at })));
    bubble(40, 230, 76, 17.4, 80);
    SH.chat = makeShape([hsort(parts)], (t, i, p, b) => {
      if (p.at === undefined) return;
      const on = ramp(t, p.at, 0.22, E.backOut), s = 0.85 + 0.15 * clamp(on);
      b.a[i] = p.a * clamp(on, 0.02);
      b.x[i] = -150 + (p.x + 150) * s; // pop from the bubble's left edge
    });
  }

  // "muda o recheio, pede decoração diferente" — the cake cut open (crumb, cream, depth); the filling swaps in waves,
  // the berries on top hop and change
  {
    const X0 = -290, X1 = 290, D = 60;
    const SP = [[-130, -30], [0, 100], [130, 230]], FL = [[-30, 0], [100, 130]];
    const body = art(g => {
      g.fillStyle = F(CREAM, LG(g, X1, 0, X1 + D, 0, [[0, tone(WT, 0.34)], [1, tone(WT, 0.18)]])); poly(g, [[X1, -150], [X1 + D, -185], [X1 + D, 195], [X1, 230]]); g.fill();
      const rr = rng(321);
      SP.forEach(([a, b2]) => {
        g.fillStyle = F(CREAM, LG(g, X0, 0, X1, 0, [[0, tone(WT, 0.5)], [0.45, tone(WT, 0.78)], [1, tone(WT, 0.55)]])); g.fillRect(X0, a, X1 - X0, b2 - a);
        for (let k = 0; k < (b2 - a) * 9; k++) { g.fillStyle = F(CREAM, tone(WT, rr() < 0.3 ? 0.22 : 0.95)); g.beginPath(); g.arc(X0 + rr() * (X1 - X0), a + rr() * (b2 - a), 1.5 + rr() * 4, 0, 7); g.fill(); }
      });
      g.fillStyle = F(WHITE, LG(g, 0, -185, 0, -150, [[0, tone(WT, 0.7)], [1, tone(WT, 0.95)]])); poly(g, [[X0, -150], [X0 + D, -185], [X1 + D, -185], [X1, -150]]); g.fill();
      g.beginPath(); for (let x = X0; x <= X1; x += 3) { const y = -150 + 8 * Math.sin(x * 0.07) + 14; x === X0 ? g.moveTo(x, y) : g.lineTo(x, y); }
      g.lineTo(X1, -150); g.lineTo(X0, -150); g.closePath(); g.fillStyle = F(WHITE, tone(WT, 1)); g.fill();
    }, 1, 0, 0, { seed: 90, nosort: true, ids: true });
    const fill = art(g => FL.forEach(([a, b2], k) => {
      g.beginPath(); for (let x = X0; x <= X1; x += 3) { const y = a + 3 * Math.sin(x * 0.05 + k); x === X0 ? g.moveTo(x, y) : g.lineTo(x, y); }
      for (let x = X1; x >= X0; x -= 3) g.lineTo(x, b2 + 3 * Math.sin(x * 0.06 + k * 2));
      g.closePath(); g.fillStyle = LG(g, X0, 0, X1, 0, [[0, tone(WT, 0.72)], [0.4, tone(WT, 1)], [1, tone(WT, 0.68)]]); g.fill();
      g.fillStyle = tone(WT, 0.85); poly(g, [[X1, a], [X1 + D, a - 35], [X1 + D, b2 - 35], [X1, b2]]); g.fill();
    }), 1, 0, 0, { seed: 92, nosort: true, tint: PINK });
    const pts = [...body, ...tagged(fill, { fl: 1 })];
    for (let k = 0; k < 7; k++) art(g => sphere(g, -232 + k * 80, -170, 17, WT, 1), 1, 0, 0, { seed: 94 + k, nosort: true, tint: PINK }).forEach(p => pts.push({ ...p, dec: k }));
    SH.recheio = makeShape([hsort(pts)], (t, i, p, b) => {
      if (p.fl) {
        const u = clamp((p.x - X0) / (X1 - X0)), w1 = ramp(t, 18.35 + u * 0.35, 0.12), w2 = ramp(t, 18.9 + (1 - u) * 0.35, 0.12);
        if (w2 > 0.5) { b.c[i] = pick('o0@', p.r); b.t[i] = WHITE; } else if (w1 > 0.5) { b.c[i] = pick('%*+', p.r); b.t[i] = CHOCO; } // morango → chocolate → ninho
        b.a[i] = p.a * (1 + 0.5 * Math.exp(-(((t - 18.35 - u * 0.35) / 0.08) ** 2)) + 0.5 * Math.exp(-(((t - 18.9 - (1 - u) * 0.35) / 0.08) ** 2)));
        return;
      }
      if (p.dec !== undefined) {
        const k = Math.floor(clamp((t - 19.3) / 1.1) * 5);
        const hop = t > 19.3 && t < 20.5 ? Math.abs(Math.sin((t - 19.3) * Math.PI * 4.5 + p.dec)) : 0;
        if (k > 0) { b.c[i] = pick('*o▪@#', hash(p.dec * 97 + (i & 3), k + 1)); b.t[i] = [PINK, CHOCO, WHITE, CREAM, PINK][(k + p.dec) % 5]; }
        b.y[i] = p.y - 12 * hop;
      }
    });
  }

  // "e pergunta quanto vai custar" — a cardboard price tag on a string: R$ ?
  {
    const tag = art(g => {
      g.strokeStyle = tone(WT, 0.6); g.lineWidth = 4; g.beginPath(); g.moveTo(-240, 0); g.bezierCurveTo(-320, -60, -380, -150, -470, -160); g.stroke();
      poly(g, [[-340, 0], [-230, -150], [310, -150], [310, 150], [-230, 150]]);
      g.fillStyle = LG(g, 0, -150, 0, 150, [[0, tone(WT, 0.42)], [1, tone(WT, 0.22)]]); g.fill();
      g.strokeStyle = tone(WT, 0.95); g.lineWidth = 6; g.stroke();
      g.strokeStyle = tone(WT, 0.32); g.lineWidth = 3; poly(g, [[-314, 0], [-220, -128], [290, -128], [290, 128], [-220, 128]]); g.stroke();
      g.fillStyle = '#000'; g.beginPath(); g.arc(-240, 0, 20, 0, 7); g.fill();
      g.strokeStyle = tone(WT, 0.9); g.lineWidth = 9; g.beginPath(); g.arc(-240, 0, 25, 0, 7); g.stroke();
    }, 1, 0, 0, { seed: 95 });
    const rs = art(textArt('R$', 210, GD), 1, 20, 8, { seed: 96, money: true });
    const q = tagged(art(textArt('?', 260, WT), 1, 210, 8, { seed: 97 }), { q: 1 });
    SH.tag = makeShape([tag, rs, q], (t, i, p, b) => {
      if (p.q) { const fr = Math.floor(t * 10); if (hash(i, fr) > 0.85) b.c[i] = SCR[(hash(i, fr + 3) * SCR.length) | 0]; }
      const a = 0.035 * Math.sin(t * 1.7), dx = b.x[i] + 240, dy = b.y[i]; // the tag swings on its hole
      b.x[i] = -240 + dx * Math.cos(a) - dy * Math.sin(a); b.y[i] = dx * Math.sin(a) + dy * Math.cos(a);
    });
  }

  // "Ela calcula os ingredientes, tenta lembrar quanto pagou" — five ingredients; memory flickers
  {
    const pts = [];
    ING_ART.forEach((draw, k) => art(draw, 1.45, ING_POS_ART[k][0], ING_POS_ART[k][1], { seed: 110 + k * 3, nosort: true, ids: true }).forEach(p => pts.push({ ...p, ing: k })));
    SH.ingr = makeShape([hsort(pts)], (t, i, p, b) => {
      b.y[i] = p.y + 4 * Math.sin(t * 1.8 + p.ing);
      const forget = ramp(t, 24.5, 0.4) * (1 - ramp(t, 26.9, 0.3));
      if (forget > 0) {
        const on = hash(p.ing * 31 + (i & 7), Math.floor(t * 6)) > 0.4 ? 1 : 0.25;
        b.a[i] = p.a * lerp(1, on, forget); b.x[i] = p.x + (hash(i, Math.floor(t * 12)) - 0.5) * 6 * forget;
      }
    });
  }

  // "e passa um preço que talvez nem cubra os custos" — PREÇO vs CUSTO as solid columns; the cost climbs past and goes red
  const BAR = { bot: 260, price: -40, cost: -200 };
  {
    const column = (x, top, v) => g => {
      const w = 150, dp = 34;
      g.fillStyle = LG(g, x - 75, 0, x + 75, 0, [[0, tone(WT, v * 0.5)], [0.4, tone(WT, v * 0.9)], [1, tone(WT, v * 0.55)]]); g.fillRect(x - 75, top, w, BAR.bot - top);
      g.fillStyle = tone(WT, v * 0.3); poly(g, [[x + 75, top], [x + 75 + dp, top - dp * 0.6], [x + 75 + dp, BAR.bot - dp * 0.6], [x + 75, BAR.bot]]); g.fill();
      g.fillStyle = tone(WT, v); poly(g, [[x - 75, top], [x - 75 + dp, top - dp * 0.6], [x + 75 + dp, top - dp * 0.6], [x + 75, top]]); g.fill();
    };
    const price = tagged(art(column(-125, BAR.price, 1), 1, 0, 0, { seed: 120 }), { price: 1 });
    const cost = tagged(art(column(125, BAR.cost, 0.85), 1, 0, 0, { seed: 123 }), { cost: 1 });
    const base = art(g => { g.fillStyle = tone(WT, 0.4); poly(g, [[-320, BAR.bot + 4], [-290, BAR.bot - 14], [340, BAR.bot - 14], [310, BAR.bot + 4]]); g.fill(); }, 1, 0, 0, { seed: 126 });
    const lvl = tagged(art(g => { g.strokeStyle = tone(WT, 0.55); g.lineWidth = 4; g.setLineDash([12, 14]); g.beginPath(); g.moveTo(-290, BAR.price); g.lineTo(290, BAR.price); g.stroke(); },
      1, 0, 0, { seed: 127 }), { lvl: 1 });
    SH.bars = makeShape([price, cost, base, lvl], (t, i, p, b) => {
      if (p.cost) {
        const f = 0.04 + 0.96 * ramp(t, 28.45, 1.35, E.inOut);
        b.y[i] = BAR.bot - (BAR.bot - p.y) * f;
        b.t[i] = b.y[i] < BAR.price - 4 && t > 28.9 ? RED : GRAY;
        return;
      }
      if (p.lvl) { b.a[i] = p.a * clamp(ramp(t, 28.6, 0.4), 0.02); return; }
      if (p.price) { const on = ramp(t, 27.4, 0.5, E.backOut); b.y[i] = BAR.bot - (BAR.bot - p.y) * (0.05 + 0.95 * on); }
    });
  }

  // "Então," — the breath: one blinking cursor in the dark
  SH.cursor = makeShape([hsort([...Array(200)].map((_, k) => ({ x: ((k % 6) - 2.5) * 6.5, y: (Math.floor(k / 6) - 16) * 2.3, a: 0.9,
    c: pick('█▓', hash(k, 3)), t: WHITE, s: 0.55 })))], (t, i, p, b) => { b.a[i] = Math.floor(t * 2.4) % 2 ? 0.18 : 0.95; });

  // "eu criaria um aplicativo…" — the app builds in orange; each section lights on its word; CUSTO REAL turns gold
  {
    const pts = [];
    art(g => phoneArt(g, { body: OR }), 1.195, 0, 0, { seed: 130, nosort: true }).forEach(p => pts.push({ ...p, frame: 1 }));
    const card = (y, h, k, hex, fv) => {
      art(g => { g.fillStyle = tone(hex, fv); RR(g, -180, y, 360, h, 20); g.fill(); g.strokeStyle = tone(hex, 0.85); g.lineWidth = 4; RR(g, -180, y, 360, h, 20); g.stroke();
        if (k < 3) sphere(g, -128, y + h / 2, 24, WT, 1); }, 1, 0, 0, { seed: 131 + k, nosort: true }).forEach(p => pts.push({ ...p, card: k }));
    };
    [-320, -175, -30].forEach((y, k) => card(y, 120, k, WT, 0.11));
    card(130, 200, 3, GD, 0.2);
    SH.app = makeShape([hsort(pts)], (t, i, p, b) => {
      if (p.frame) { if (ramp(t, 38.3, 0.8) > hash(i, 12)) b.t[i] = hash(i, 13) > 0.75 ? GREEN : GOLD; return; }
      const at = LIT[p.card], on = ramp(t, at, 0.35), flash = Math.exp(-(((t - at - 0.1) / 0.12) ** 2));
      b.a[i] = p.a * (0.18 + 0.82 * on) + 0.4 * flash;
      if (p.card === 3) b.t[i] = t > 38.25 ? money(hash(i, 14)) : WHITE;
    });
  }

  // "O pedido fica salvo…" — the order ticket: references, delivery date, deposit paid (green) and balance due (gold)
  {
    const pts = [];
    const add = (draw, tag, seed, cell, ids) => art(draw, 1, 0, 0, { seed, cell, ids, nosort: true }).forEach(p => pts.push({ ...p, ...tag }));
    add(g => {
      g.save(); RR(g, -270, -420, 540, 800, 34); g.clip(); g.fillStyle = tone(WT, 0.2); g.fillRect(-270, -420, 540, 120); g.restore();
      g.strokeStyle = tone(WT, 0.92); g.lineWidth = 7; RR(g, -270, -420, 540, 800, 34); g.stroke();
      g.fillStyle = tone(WT, 0.6); for (let x = -246; x <= 246; x += 18) { g.beginPath(); g.arc(x, -300, 3.5, 0, 7); g.fill(); }
    }, { frame: 1 }, 140);
    for (let k = 0; k < 3; k++) add(photoArt(-235 + k * 165, -255, 140), { thumb: k }, 142 + k, 4, true);
    add(g => {
      g.fillStyle = LG(g, -235, -40, -105, 80, [[0, tone(WT, 0.92)], [1, tone(WT, 0.6)]]); RR(g, -235, -40, 130, 120, 12); g.fill();
      g.fillStyle = tone(WT, 0.4); g.save(); RR(g, -235, -40, 130, 120, 12); g.clip(); g.fillRect(-235, -40, 130, 30); g.restore();
      g.fillStyle = tone(WT, 0.25); for (let r2 = 0; r2 < 3; r2++) for (let c = 0; c < 4; c++) g.fillRect(-224 + c * 29, 0 + r2 * 24, 18, 14);
      g.fillStyle = tone(WT, 1); g.fillRect(-224 + 2 * 29, 24, 18, 14);
      g.strokeStyle = tone(WT, 1); g.lineWidth = 8; [-205, -135].forEach(x => { g.beginPath(); g.moveTo(x, -54); g.lineTo(x, -28); g.stroke(); });
    }, { cal: 1 }, 150);
    add(g => { g.fillStyle = tone(WT, 0.12); RR(g, -230, 150, 460, 64, 16); g.fill(); g.strokeStyle = tone(WT, 0.8); g.lineWidth = 4; RR(g, -230, 150, 460, 64, 16); g.stroke(); }, { pay: 1 }, 152);
    add(g => { g.fillStyle = LG(g, 0, 158, 0, 206, [[0, tone(GN, 1)], [1, tone(GN, 0.55)]]); RR(g, -222, 158, 200, 48, 12); g.fill(); }, { sinal: 1 }, 153);
    add(g => { g.fillStyle = LG(g, 0, 158, 0, 206, [[0, tone(GD, 0.6)], [1, tone(GD, 0.32)]]); RR(g, -14, 158, 236, 48, 12); g.fill(); }, { rest: 1 }, 154);
    SH.order = makeShape([hsort(pts)], (t, i, p, b) => {
      const save = Math.exp(-(((t - 40.9) / 0.15) ** 2)), due = Math.exp(-(((t - 47.45) / 0.2) ** 2));
      if (p.frame) { b.a[i] = p.a + 0.5 * save; return; }
      let on = 1;
      if (p.thumb !== undefined) { on = ramp(t, 41.6 + p.thumb * 0.18, 0.25, E.backOut); b.y[i] = p.y + 18 * (1 - clamp(on)); }
      else if (p.cal) on = ramp(t, 42.62, 0.3) + 0.6 * due;
      else if (p.pay) on = ramp(t, 44.0, 0.4);
      else if (p.sinal) on = p.x < -222 + 200 * ramp(t, 44.85, 0.5) ? 1 : 0;
      else if (p.rest) on = ramp(t, 46.05, 0.4) * (1 + 0.8 * due);
      b.a[i] = p.a * Math.max(on, 0.03);
    });
  }

  // "Ela continua fazendo bolos incríveis" — the cake again, with sparkles
  {
    const sp = [...Array(2000)].map((_, k) => { const a = hash(k, 1) * 7, rr = 330 + 170 * hash(k, 2);
      return { tw: k, x: rr * Math.cos(a), y: 30 + rr * Math.sin(a) * 1.05, a: 0.5, c: pick('*·+.', hash(k, 3)), t: WHITE, s: 0.45 + 0.35 * hash(k, 4) }; });
    SH.cake2 = makeShape([cakePts(1, 0, 60, 150), hsort(sp)], (t, i, p, b) => {
      if (p.tw !== undefined) {
        const tw = Math.pow(0.5 + 0.5 * Math.sin(t * (2 + hash(p.tw, 5) * 3) + p.tw), 3);
        b.a[i] = 0.03 + 0.75 * tw * ramp(t, 49.4, 0.6); b.y[i] = p.y - (t - 48) * 6 * hash(p.tw, 6); return;
      }
      cakeLife(t, i, p, b);
    });
  }

  // "mas o sistema calcula tudo, cuida dos números e do pedido" — a river of numbers from the cake into the system
  {
    const cake = cakePts(0.55, -230, 90, 160, 4);
    const rowsArt = g => { for (let k = 0; k < 3; k++) { g.fillStyle = tone(WT, 0.14); RR(g, -140, -150 + k * 110, 280, 80, 14); g.fill(); g.strokeStyle = tone(WT, 0.7); g.lineWidth = 4; g.stroke(); sphere(g, -100, -110 + k * 110, 15, WT, 1); g.fillStyle = tone(WT, 0.8); g.fillRect(-70, -120 + k * 110, 150, 8); g.fillRect(-70, -102 + k * 110, 90, 8); } };
    const phone = tagged(art(g => phoneArt(g, { body: PU }), 0.6, 240, 20, { seed: 161, cell: 4 }), { ph: 1 });
    const rows = [];
    for (let k = 0; k < 3; k++) art(g => { g.save(); g.beginPath(); g.rect(-160, -160 + k * 110, 320, 100); g.clip(); rowsArt(g); g.restore(); }, 0.6, 240, 20, { seed: 162 + k, cell: 4, nosort: true, tint: GRAY })
      .forEach(p => rows.push({ ...p, row: k, ph: 1 }));
    const stream = [...Array(3000)].map((_, k) => ({ st: k, x: -230, y: -100, a: 0.02, c: CI['0'], t: money(hash(k, 2)), s: 0.5 + 0.25 * hash(k, 3) }));
    SH.cakesys = makeShape([cake, phone, hsort(rows), stream], (t, i, p, b) => {
      if (p.st !== undefined) {
        if (t < 51.9) return;
        const u = (hash(p.st, 4) + (t - 51.9) * 0.55) % 1, w = 1 - u, on = ramp(t, 51.9, 0.4) * (1 - ramp(t, 55.1, 0.3));
        b.x[i] = w * w * -230 + u * u * 240 + (hash(p.st, 5) - 0.5) * 40;
        b.y[i] = w * w * -110 + 2 * w * u * -420 + u * u * -110 + (hash(p.st, 6) - 0.5) * 40;
        b.a[i] = Math.max(0.02, on * Math.sin(Math.PI * u) * 0.9);
        b.c[i] = CI['0123456789$'[(hash(p.st, Math.floor(t * 8)) * 11) | 0]];
        return;
      }
      if (p.row !== undefined) {
        const at = [53.66, 54.16, 54.76][p.row], on = ramp(t, at, 0.3);
        if (on > 0.3) b.t[i] = WHITE;
        b.a[i] = p.a * (0.4 + 0.6 * on) + 0.4 * Math.exp(-(((t - at - 0.1) / 0.12) ** 2));
        return;
      }
      if (!p.ph) cakeLife(t, i, p, b);
    });
  }

  // "não adianta fazer um bolo perfeito e não saber quanto ganhou" — the cake alone; it greys out, a ? bleeds red
  SH.cakealone = makeShape([cakePts(1.08, 0, 70, 170), tagged(art(textArt('?', 290, WT), 1, 0, -480, { seed: 171, h: 1500 }), { q: 1 })], (t, i, p, b) => {
    if (p.q) {
      b.a[i] = p.a * ramp(t, 58.25, 0.45);
      b.y[i] = p.y - 6 * Math.sin(t * 2.2);
      b.a[i] = Math.min(1, b.a[i] * 1.25 + 0.12 * Math.exp(-(((t - 59.55) / 0.15) ** 2)));
      if (hash(i, 9) < 0.85 * ramp(t, 59.5, 0.5)) b.t[i] = RED;
      return;
    }
    cakeLife(t, i, p, b);
    if (hash(i, 5) < ramp(t, 58.3, 1.2)) { b.t[i] = GRAY; b.a[i] *= 0.6; }
  });

  // "Comenta aqui abaixo a sua profissão" — a comment card and an arrow pointing down to the comments
  {
    const box = art(g => {
      g.fillStyle = tone(WT, 0.1); RR(g, -390, -170, 780, 190, 36); g.fill();
      poly(g, [[-300, 18], [-330, 80], [-250, 18]]); g.fill();
      g.strokeStyle = tone(WT, 0.9); g.lineWidth = 6; RR(g, -390, -170, 780, 190, 36); g.stroke();
      g.beginPath(); g.moveTo(-300, 20); g.lineTo(-330, 80); g.lineTo(-250, 20); g.stroke();
      sphere(g, -315, -75, 40, WT, 0.85);
      g.fillStyle = tone(WT, 0.25); g.beginPath(); g.arc(-315, -88, 13, 0, 7); g.fill(); g.beginPath(); g.ellipse(-315, -52, 24, 14, 0, Math.PI, 0); g.fill();
      g.fillStyle = tone(WT, 0.5); RR(g, -250, -140, 150, 12, 6); g.fill();
    }, 1, 0, 0, { seed: 180 });
    const arrow = tagged(art(g => {
      g.fillStyle = LG(g, -45, 0, 45, 0, [[0, tone(WT, 0.45)], [0.45, tone(WT, 1)], [1, tone(WT, 0.4)]]);
      g.fillRect(-17, 150, 34, 190); poly(g, [[-90, 315], [90, 315], [0, 418]]); g.fill();
    }, 1, 0, 0, { seed: 183 }), { arrow: 1 });
    SH.comment = makeShape([box, arrow], (t, i, p, b) => {
      if (!p.arrow) return;
      const bob = Math.pow(Math.abs(Math.sin((t - 61.0) * 3.4)), 2);
      b.y[i] = p.y + 26 * bob; b.a[i] = p.a * (0.7 + 0.3 * bob);
    });
  }

  // "A próxima rodada pode ser a sua" — a carnival wheel of professions spins and lands on VOCÊ; the rim bulbs chase
  {
    const { cx, cy, R, n } = WH, seg = 2 * Math.PI / n;
    const disc = art(g => {
      for (let k = 0; k < n; k++) {
        const a0 = -Math.PI / 2 + k * seg;
        g.fillStyle = RG(g, cx, cy, 40, 300, [[0, tone(WT, k % 2 ? 0.5 : 0.24)], [1, tone(WT, k % 2 ? 0.34 : 0.15)]]);
        g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, 300, a0, a0 + seg); g.closePath(); g.fill();
      }
      g.strokeStyle = tone(WT, 0.95); g.lineWidth = 4;
      for (let k = 0; k < n; k++) { const a = -Math.PI / 2 + k * seg; g.beginPath(); g.moveTo(cx + 50 * Math.cos(a), cy + 50 * Math.sin(a)); g.lineTo(cx + 300 * Math.cos(a), cy + 300 * Math.sin(a)); g.stroke(); }
      sphere(g, cx, cy, 50, WT, 1);
    }, 1, 0, 0, { seed: 185, cell: 6 }).map(p => {
      const dx = p.x - cx, dy = p.y - cy, pa = Math.atan2(dy, dx);
      return { ...p, pr: Math.hypot(dx, dy), pa, sg: Math.floor((((pa + Math.PI / 2) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) / seg) };
    });
    const rim = art(g => { g.strokeStyle = LG(g, cx - R, cy - R, cx + R, cy + R, [[0, tone(WT, 1)], [1, tone(WT, 0.45)]]); g.lineWidth = 24; g.beginPath(); g.arc(cx, cy, 318, 0, 7); g.stroke(); }, 1, 0, 0, { seed: 186 });
    const bulbs = [];
    for (let k = 0; k < 20; k++) { const a = k / 20 * 2 * Math.PI; art(g => sphere(g, cx + 318 * Math.cos(a), cy + 318 * Math.sin(a), 9, WT, 1), 1, 0, 0, { seed: 187 + k, cell: 4, nosort: true }).forEach(p => bulbs.push({ ...p, bulb: k })); }
    const ptr = art(g => { g.fillStyle = LG(g, -34, 0, 34, 0, [[0, tone(WT, 0.5)], [0.5, tone(WT, 1)], [1, tone(WT, 0.45)]]); poly(g, [[-34, -404], [34, -404], [0, -340]]); g.fill(); }, 1, 0, 0, { seed: 190 });
    SH.wheel = makeShape([disc, rim, hsort(bulbs), ptr], (t, i, p, b) => {
      if (p.bulb !== undefined) { const ch = Math.floor(t * 9) % 4; b.a[i] = p.a * ((p.bulb % 4) === ch ? 1 : 0.35); return; }
      if (p.pr === undefined) return;
      const a = p.pa + wheelTheta(t);
      b.x[i] = cx + p.pr * Math.cos(a); b.y[i] = cy + p.pr * Math.sin(a);
      if (p.pr < 60) return;
      const land = ramp(t, 65.1, 0.3);
      if (p.sg === 9) { b.a[i] = p.a + 0.5 * land; if (land > 0.5) b.c[i] = pick('#%@', hash(i, 13)); }
      else b.a[i] = p.a * (1 - 0.5 * land);
    });
  }

  // "e eu posso te mostrar uma solução viável" — iso blocks (Hairline: rounded, thin, painted back to front so near
  // faces hide far ones) drop in one by one, orange; on "viável" they turn gold/green and burst — the film's only colour burst
  const BLOCKS = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [0, 0, 2]];
  function buildPts(M, seed) {
    const w = 700, h = 760, c = mk(w, h), g = c.getContext('2d'), U = 92;
    g.translate(w / 2, h / 2 + 120); g.lineJoin = 'round'; g.lineCap = 'round';
    const P = (u, v, z) => [(u - v) * 0.98, (u + v) * 0.49 - z];
    const order = BLOCKS.map((b, id) => ({ b, id })).sort((a, b2) => (a.b[0] + a.b[1] + a.b[2] * 0.01) - (b2.b[0] + b2.b[1] + b2.b[2] * 0.01) || a.b[2] - b2.b[2]);
    for (const { b: [bu, bv, bz], id } of order) {
      const u0 = bu * U - U, v0 = bv * U - U, z0 = bz * U, s = U - 6;
      const top = [P(u0, v0, z0 + s), P(u0 + s, v0, z0 + s), P(u0 + s, v0 + s, z0 + s), P(u0, v0 + s, z0 + s)];
      const left = [P(u0, v0 + s, z0), P(u0 + s, v0 + s, z0), P(u0 + s, v0 + s, z0 + s), P(u0, v0 + s, z0 + s)];
      const right = [P(u0 + s, v0, z0), P(u0 + s, v0 + s, z0), P(u0 + s, v0 + s, z0 + s), P(u0 + s, v0, z0 + s)];
      const face = (q, shade) => { g.fillStyle = `rgb(${id * 20 + 10},${shade},0)`; g.beginPath(); q.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill(); };
      face(top, 120); face(left, 70); face(right, 40);
      g.strokeStyle = `rgb(${id * 20 + 10},255,0)`; g.lineWidth = 5;
      const sil = [top[0], top[1], right[0], right[1], left[0], top[3]];
      g.beginPath(); sil.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.stroke();
      g.lineWidth = 2.5; g.beginPath(); g.moveTo(...top[3]); g.lineTo(...top[2]); g.lineTo(...top[1]); g.moveTo(...top[2]); g.lineTo(...left[1]); g.stroke();
    }
    const d = g.getImageData(0, 0, w, h).data, out = [], rr = rng(seed), cell = 4;
    for (let y = 0; y + cell <= h; y += cell) for (let x = 0; x + cell <= w; x += cell) { // the same grid reading as imgPts
      const k = ((y + 2) * w + x + 2) * 4; if (d[k + 3] < 200) continue;
      const id = Math.round((d[k] - 10) / 20), sh = d[k + 1], q = rr();
      const v = sh > 200 ? 1 : sh > 100 ? 0.62 : sh > 60 ? 0.4 : 0.24;
      out.push({ x: x + 2.5 - w / 2, y: y + 2.5 - h / 2 - 60, block: id, edge: sh > 200, a: 0.2 + 0.8 * v,
        c: CI[RAMP[clamp(Math.round(v * (RAMP.length - 1)), 1, RAMP.length - 1)]], t: ORANGE, s: 0.42 + 0.14 * v, q });
    }
    return hsort(out).slice(0, M);
  }
  const structure = buildPts(11000, 71);
  {
    const sparks = [...Array(4500)].map((_, k) => ({ sp: k, ang: hash(k, 1) * 2 * Math.PI, x: 0, y: -40, a: 0.9,
      c: pick('$+*·', hash(k, 2)), t: money(hash(k, 3)), s: 0.45 + 0.4 * hash(k, 4) }));
    SH.solution = makeShape([structure.map(p => ({ ...p })), sparks], (t, i, p, b) => {
      if (p.sp !== undefined) {
        const go = ramp(t, 67.12, 1.4, E.expoOut), rr = 150 + (300 + 260 * hash(p.sp, 5)) * go;
        b.x[i] = rr * Math.cos(p.ang); b.y[i] = -40 + rr * Math.sin(p.ang) * 1.1;
        b.a[i] = ramp(t, 67.1, 0.08) * (1 - 0.8 * ramp(t, 67.5, 1.2));
        return;
      }
      const at = 65.6 + p.block * 0.16, q = ramp(t, at, 0.4, E.backOut);
      b.y[i] = p.y - 70 * (1 - q); b.a[i] = p.a * clamp((t - at) / 0.12, 0.03);
      if (ramp(t, 66.95, 0.5) > p.q) b.t[i] = p.q > 0.75 ? GREEN : GOLD;
    });
  }

  // "Não deixe de seguir, curtir e compartilhar" — the gold structure rises small; three icons light word by word
  {
    const small = structure.map(p => ({ ...p, x: p.x * 0.5, y: p.y * 0.5 - 330, t: p.q > 0.75 ? GREEN : GOLD, s: p.s * 0.85 }));
    const ICON = [
      g => { g.beginPath(); g.arc(-15, -35, 30, 0, 7); g.moveTo(-75, 60); g.quadraticCurveTo(-15, -10, 45, 60); g.moveTo(70, -30); g.lineTo(70, 30); g.moveTo(40, 0); g.lineTo(100, 0); }, // seguir
      g => { g.beginPath(); g.moveTo(0, 60); g.bezierCurveTo(-110, -10, -60, -90, 0, -40); g.bezierCurveTo(60, -90, 110, -10, 0, 60); g.closePath(); }, // curtir
      g => { g.beginPath(); g.moveTo(-80, -10); g.lineTo(85, -70); g.lineTo(30, 75); g.lineTo(5, 15); g.closePath(); g.moveTo(5, 15); g.lineTo(85, -70); },              // compartilhar
    ];
    const icons = [];
    ICON.forEach((path, k) => art(g => { g.strokeStyle = LG(g, -90, -80, 90, 80, [[0, tone(WT, 1)], [1, tone(WT, 0.5)]]); g.lineWidth = 13; path(g); g.stroke(); },
      1, (k - 1) * 270, 190, { seed: 200 + k, cell: 4, nosort: true }).forEach(p => icons.push({ ...p, ic: k })));
    const AT = [68.5, 68.98, 69.8];
    SH.social = makeShape([small, hsort(icons)], (t, i, p, b) => {
      if (p.ic === undefined) { b.y[i] = p.y + 3 * Math.sin(t * 1.6); return; }
      const at = AT[p.ic], on = ramp(t, at, 0.3, E.backOut), cx = (p.ic - 1) * 270, s = 1 + 0.12 * Math.exp(-(((t - at - 0.15) / 0.12) ** 2));
      b.a[i] = p.a * (0.22 + 0.78 * clamp(on));
      b.x[i] = cx + (p.x - cx) * s; b.y[i] = 190 + (p.y - 190) * s;
      if (on < 0.5) b.t[i] = GRAY;
    });
  }
}
// ───────────────────────── timeline of shapes
const KEYS = [
  { t: 0, s: 'dust' },
  { t: 1.2, s: 'ia', d: 0.8, st: 0.4, e: 'expoOut', sw: 120, dl: 'radial' },
  { t: 2.45, s: 'nofit', d: 0.55, st: 0.25, e: 'expoOut', sw: 60, dl: 'radial' },
  { t: 3.5, s: 'shops', d: 0.7, st: 0.45, e: 'expoOut', sw: 80, dl: 'radial' },
  { t: 6.1, s: 'cake', d: 0.9, st: 0.4, e: 'inOut', sw: 90, dl: 'radial' },
  { t: 9.95, s: 'cakeq', d: 0.7, st: 0.3, e: 'expoOut', sw: 60, dl: 'radial' },
  { t: 12.15, s: 'orders', d: 0.6, st: 0.5, e: 'expoOut', sw: 70, dl: 'random' },
  { t: 13.3, s: 'chat', d: 0.8, st: 0.4, e: 'expoOut', sw: 80, dl: 'radial' },
  { t: 17.85, s: 'recheio', d: 0.75, st: 0.35, e: 'expoOut', sw: 90, dl: 'radial' },
  { t: 20.6, s: 'tag', d: 0.7, st: 0.35, e: 'expoOut', sw: 70, dl: 'radial' },
  { t: 22.55, s: 'ingr', d: 0.8, st: 0.45, e: 'expoOut', sw: 100, dl: 'radial' },
  { t: 27.25, s: 'bars', d: 0.6, st: 0.3, e: 'expoOut', sw: 50, dl: 'bottom' },
  { t: 30.55, s: 'cursor', d: 0.5, st: 0.2, e: 'quadIn', sw: 0, dl: 'random' },
  { t: 31.45, s: 'app', d: 0.9, st: 0.5, e: 'expoOut', sw: 60, dl: 'radial' },
  { t: 40.0, s: 'order', d: 0.8, st: 0.35, e: 'inOut', sw: 60, dl: 'radial' },
  { t: 48.2, s: 'cake2', d: 0.9, st: 0.4, e: 'inOut', sw: 90, dl: 'radial' },
  { t: 51.0, s: 'cakesys', d: 0.8, st: 0.35, e: 'expoOut', sw: 70, dl: 'radial' },
  { t: 55.2, s: 'cakealone', d: 1.0, st: 0.4, e: 'inOut', sw: 60, dl: 'radial' },
  { t: 61.05, s: 'comment', d: 0.7, st: 0.35, e: 'expoOut', sw: 80, dl: 'radial' },
  { t: 63.25, s: 'wheel', d: 0.6, st: 0.3, e: 'expoOut', sw: 80, dl: 'radial' },
  { t: 65.35, s: 'solution', d: 0.7, st: 0.3, e: 'expoOut', sw: 80, dl: 'radial' },
  { t: 67.75, s: 'social', d: 0.8, st: 0.3, e: 'inOut', sw: 60, dl: 'radial' },
];
const DLY = [];
function buildDelays() {
  const tmp = Buf();
  KEYS.forEach((k, ki) => {
    const D = new Float32Array(N);
    if (ki > 0) {
      SH[k.s].fill(k.t + (k.d || 0), tmp);
      let mx = 1; for (let i = 0; i < N; i++) mx = Math.max(mx, Math.hypot(tmp.x[i], tmp.y[i]));
      for (let i = 0; i < N; i++) {
        let v;
        if (k.dl === 'radial') v = 0.75 * Math.hypot(tmp.x[i], tmp.y[i]) / mx + 0.25 * hash(i, ki);
        else if (k.dl === 'top') v = clamp((tmp.y[i] + 600) / 1200) * 0.2 + 0.8 * hash(i, ki);
        else if (k.dl === 'bottom') v = 0.8 * clamp((600 - tmp.y[i]) / 1200) + 0.2 * hash(i, ki);
        else v = hash(i, ki);
        D[i] = clamp(v);
      }
    }
    DLY.push(D);
  });
}

const pool = [...Array(10)].map(() => ({ tg: Buf(), out: Buf() }));
function keyAt(t) { let k = 0; while (k + 1 < KEYS.length && KEYS[k + 1].t <= t) k++; return k; }
function evalKey(k, t, depth) {
  const key = KEYS[k], P = pool[depth];
  SH[key.s].fill(t, P.tg);
  if (k === 0 || t >= key.t + key.d + key.st) return P.tg;
  const F = evalKey(k - 1, t, depth + 1), G = P.tg, o = P.out, ease = E[key.e], D = DLY[k];
  const fr = Math.floor(t * 22);
  for (let i = 0; i < N; i++) {
    const p = clamp((t - key.t - key.st * D[i]) / key.d);
    if (p <= 0) { copyAgent(o, i, F); continue; }
    if (p >= 1) { copyAgent(o, i, G); continue; }
    const q = ease(p);
    if (G.a[i] < 0.01 || F.a[i] < 0.01) { // leaving or arriving: dissolve in place, never fly across the frame
      const leaving = G.a[i] < 0.01, ql = leaving ? q : 1 - q, B = leaving ? F : G, O = leaving ? G : F;
      const ddx = O.x[i] - B.x[i], ddy = O.y[i] - B.y[i], dl = Math.hypot(ddx, ddy) + 1e-3, m = Math.min(dl, 90) * ql;
      o.x[i] = B.x[i] + (ddx / dl) * m; o.y[i] = B.y[i] + (ddy / dl) * m;
      o.a[i] = B.a[i] * Math.pow(1 - ql, 2); o.c[i] = ql > 0.3 ? SCR[(hash(i, fr) * SCR.length) | 0] : B.c[i];
      o.t[i] = B.t[i]; o.s[i] = B.s[i]; continue;
    }
    const dx = G.x[i] - F.x[i], dy = G.y[i] - F.y[i], len = Math.hypot(dx, dy) + 1e-3;
    const sw = key.sw * (hash(i, k * 7) - 0.5) * 2 * Math.sin(Math.PI * q) * Math.min(1, len / 300);
    o.x[i] = F.x[i] + dx * q - (dy / len) * sw;
    o.y[i] = F.y[i] + dy * q + (dx / len) * sw;
    o.a[i] = lerp(F.a[i], G.a[i], q) + 0.3 * Math.sin(Math.PI * q);
    o.c[i] = q < 0.06 ? F.c[i] : q > 0.9 ? G.c[i] : SCR[(hash(i, fr) * SCR.length) | 0];
    o.t[i] = q < 0.5 ? F.t[i] : G.t[i];
    o.s[i] = lerp(F.s[i], G.s[i], q);
  }
  return o;
}
function stateAt(t) { return evalKey(keyAt(t), t, 0); }

// ───────────────────────── camera: keyed, then operated
const CAM0 = { x: 0, y: 40, z: 0.9, r: 0 };
const CAMK = [
  { t: 0.0, d: 1.2, x: 0, y: 10, z: 0.96, r: 0, e: 'sine' },
  { t: 1.2, d: 1.0, x: 0, y: 0, z: 1.06, r: -0.01, e: 'expoOut' },     // IA
  { t: 2.45, d: 0.6, x: 0, y: 70, z: 1.14, r: 0.01, e: 'expoOut' },    // não cabe: tight on the shop
  { t: 3.5, d: 1.0, x: 0, y: 0, z: 0.9, r: 0, e: 'expoOut' },          // todos os negócios: open up
  { t: 5.25, d: 0.9, x: 0, y: -120, z: 1.18, r: 0, e: 'inOut' },       // push into the chosen shop
  { t: 6.1, d: 1.1, x: 0, y: 0, z: 1.0, r: 0, e: 'inOut' },            // the cake
  { t: 7.3, d: 2.6, x: 0, y: -20, z: 1.07, r: 0.006, e: 'sine' },
  { t: 9.95, d: 0.8, x: 0, y: -60, z: 1.0, r: 0, e: 'expoOut' },
  { t: 12.15, d: 0.8, x: 0, y: 0, z: 0.95, r: 0, e: 'expoOut' },       // orders, wide
  { t: 13.3, d: 1.0, x: 0, y: 0, z: 1.08, r: -0.012, e: 'expoOut' },   // into the phone
  { t: 14.5, d: 3.0, x: 0, y: 30, z: 1.12, r: 0, e: 'sine' },
  { t: 17.85, d: 0.9, x: 0, y: 0, z: 1.02, r: 0.01, e: 'expoOut' },    // the cut cake
  { t: 19.2, d: 1.2, x: 0, y: -120, z: 1.15, r: 0, e: 'inOut' },       // look at the toppings
  { t: 20.6, d: 0.9, x: 0, y: 0, z: 1.05, r: -0.01, e: 'expoOut' },    // the tag
  { t: 22.55, d: 1.0, x: 0, y: -40, z: 0.95, r: 0, e: 'expoOut' },     // ingredients
  { t: 24.6, d: 2.4, x: 0, y: -60, z: 1.03, r: 0.008, e: 'sine' },
  { t: 27.25, d: 0.8, x: 0, y: 40, z: 1.0, r: 0, e: 'expoOut' },       // bars
  { t: 28.5, d: 1.4, x: 60, y: -40, z: 1.1, r: 0, e: 'inOut' },        // follow the cost climbing
  { t: 30.55, d: 0.8, x: 0, y: 0, z: 1.2, r: 0, e: 'inOut' },          // breath: close on the cursor
  { t: 31.45, d: 1.1, x: 0, y: 0, z: 0.98, r: 0, e: 'expoOut' },       // the app
  { t: 32.8, d: 1.0, x: 0, y: -200, z: 1.08, r: 0, e: 'inOut' },       // down the sections, one per word
  { t: 34.45, d: 1.0, x: 0, y: -90, z: 1.08, r: 0, e: 'inOut' },
  { t: 35.95, d: 1.0, x: 0, y: 30, z: 1.08, r: 0, e: 'inOut' },
  { t: 37.5, d: 1.0, x: 0, y: 150, z: 1.04, r: 0, e: 'inOut' },        // CUSTO REAL
  { t: 40.0, d: 1.0, x: 0, y: -20, z: 0.94, r: 0, e: 'expoOut' },      // the order ticket
  { t: 41.4, d: 1.0, x: 0, y: -170, z: 1.06, r: 0, e: 'inOut' },       // references
  { t: 42.5, d: 1.0, x: -60, y: 10, z: 1.08, r: 0, e: 'inOut' },       // delivery date
  { t: 43.9, d: 0.9, x: 0, y: 200, z: 1.14, r: 0, e: 'inOut' },        // "o principal": the payment
  { t: 47.3, d: 1.0, x: 0, y: 80, z: 1.0, r: 0, e: 'sine' },
  { t: 48.2, d: 1.2, x: 0, y: 0, z: 1.0, r: 0, e: 'inOut' },           // cake again
  { t: 49.4, d: 1.6, x: 0, y: -20, z: 1.08, r: 0.006, e: 'sine' },
  { t: 51.0, d: 1.0, x: 0, y: 0, z: 0.98, r: 0, e: 'expoOut' },        // cake + system
  { t: 53.6, d: 1.4, x: 110, y: 0, z: 1.08, r: 0, e: 'inOut' },        // look at the system
  { t: 55.2, d: 1.4, x: 0, y: 0, z: 0.96, r: 0, e: 'inOut' },          // cake alone
  { t: 56.7, d: 2.0, x: 0, y: -40, z: 1.12, r: -0.006, e: 'sine' },    // slow push
  { t: 58.3, d: 1.6, x: 0, y: -170, z: 1.05, r: 0, e: 'inOut' },       // tilt up to the ?
  { t: 61.05, d: 0.9, x: 0, y: 60, z: 1.0, r: 0, e: 'expoOut' },       // comment box
  { t: 63.25, d: 0.9, x: 0, y: -30, z: 0.98, r: 0, e: 'expoOut' },     // the wheel
  { t: 64.95, d: 0.6, x: 0, y: -190, z: 1.12, r: 0, e: 'expoOut' },    // land on VOCÊ
  { t: 65.35, d: 1.0, x: 0, y: 0, z: 1.0, r: 0, e: 'expoOut' },        // the solution
  { t: 67.1, d: 1.0, x: 0, y: 0, z: 0.92, r: 0, e: 'expoOut' },        // the burst opens the frame
  { t: 67.75, d: 1.2, x: 0, y: -40, z: 1.0, r: 0, e: 'inOut' },        // social
  { t: 69.9, d: 1.9, x: 0, y: -30, z: 0.97, r: 0, e: 'sine' },
];
function camAt(t) {
  const c = { ...CAM0 };
  for (const k of CAMK) {
    if (t < k.t) break;
    const p = E[k.e](clamp((t - k.t) / k.d));
    c.x = lerp(c.x, k.x, p); c.y = lerp(c.y, k.y, p); c.z = lerp(c.z, k.z, p); c.r = lerp(c.r, k.r, p);
  }
  c.x += 5 * Math.sin(t * 0.61) + 2.5 * Math.sin(t * 1.37 + 1);
  c.y += 4 * Math.sin(t * 0.53 + 2) + 2 * Math.sin(t * 1.11);
  c.r += 0.0022 * Math.sin(t * 0.43 + 0.5);
  for (const tl of [3.15, 12.6, 22.08, 29.86, 40.88, 65.1, 67.14]) {
    const u = t - tl; if (u > 0 && u < 0.3) { const amp = 5 * Math.exp(-u * 16); c.x += amp * Math.sin(u * 90); c.y += amp * Math.cos(u * 75); }
  }
  if (t > 2.65 && t < 3.5) { const k = Math.sin(Math.PI * (t - 2.65) / 0.85); c.x += k * 2.5 * Math.sin(t * 41); c.y += k * 2 * Math.sin(t * 37); }
  return c;
}
function camMatrix(c) {
  const a = c.z * Math.cos(c.r), b = c.z * Math.sin(c.r);
  return [a, b, -b, a, CX - a * c.x + b * c.y, CY - b * c.x - a * c.y];
}

// ───────────────────────── subtitles (word by word; marks colour the keyword by meaning)
// * white · ^ purple (IA) · ~ blue (social) · ! gold (money) · + green · & red (loss) · = orange (build)
const CHUNKS = [
  'Você ainda acredita', 'que a ^inteligência ^artificial', 'não *cabe* em *todos* os negócios?',
  'Eu quero usar de exemplo', 'a *confeiteira.*',
  'O problema da confeiteira', 'não é fazer *bolo,*', 'é *descobrir* se ela está', 'ganhando !dinheiro', 'com *cada* *encomenda.*',
  'O cliente pede um bolo', '*personalizado,*', 'manda ~três ~referências', 'no ~WhatsApp,', 'muda o *recheio,*',
  'pede *decoração* diferente', 'e pergunta', '!quanto !vai !custar.',
  'Ela *calcula* os ingredientes,', 'tenta *lembrar* quanto pagou', 'em cada um', 'e passa um !preço', 'que talvez nem *cubra*', 'os &custos.',
  'Então,', 'eu criaria um =aplicativo', 'onde ela =cadastra', 'os ingredientes,', 'monta a =receita,', 'adiciona a =decoração',
  'e calcula o !custo !real', 'de cada encomenda.',
  'O pedido fica *salvo*', 'com as referências,', 'a data de *entrega*', 'e o *principal,*', 'o +sinal +pago', 'e o !valor !restante', 'no dia da entrega.',
  'Ela continua fazendo', 'bolos *incríveis,*', 'mas o ^sistema', '^calcula ^tudo,', 'cuida dos !números', 'e do pedido,',
  'porque não adianta fazer...', 'um bolo *perfeito*', 'e &não &saber', 'quanto !ganhou com ele.',
  '*Comenta* aqui abaixo', 'a sua *profissão.*', 'A próxima rodada', 'pode ser a *sua*', 'e eu posso te mostrar', 'uma +solução +viável.',
  'Não deixe de *seguir,*', '*curtir* e *compartilhar.*',
];
const SUBS = [];
function buildSubs() {
  let wi = 0;
  const norm = s => s.toLowerCase().replace(/[^\p{L}\p{N}%]/gu, '');
  CHUNKS.forEach(line => {
    const words = line.split(' ').map(tok => {
      const m = /^([*^~!+&=])/.exec(tok), txt = (m ? tok.slice(1) : tok).replace(/[*^~!+&=]$/, ''), w = WORDS[wi++];
      if (!w || norm(w.w) !== norm(txt)) console.warn('subtitle mismatch', txt, w && w.w);
      return { txt, s: w ? w.s : 0, e: w ? w.e : 0, mark: m ? m[1] : null };
    });
    SUBS.push({ words, s: words[0].s - 0.1, e: words[words.length - 1].e });
  });
  SUBS.forEach((c, i) => { const nx = SUBS[i + 1]; c.end = nx ? (nx.s - c.e < 0.7 ? nx.s : c.e + 0.45) : DUR; });
  if (wi !== WORDS.length) console.warn('subtitle word count', wi, WORDS.length);
}

// ───────────────────────── HUD sections
const SECTIONS = [
  [0, '01 · A PERGUNTA'], [4.9, '02 · O EXEMPLO'], [7.2, '03 · O PROBLEMA'], [13.25, '04 · A ENCOMENDA'], [22.55, '05 · A CONTA'],
  [30.55, '06 · O APLICATIVO'], [40.0, '07 · O PEDIDO'], [48.2, '08 · O SISTEMA'], [61.05, '09 · SUA VEZ'],
];
function decode(str, p, seed) {
  if (p >= 1) return str;
  const n = Math.floor(p * str.length);
  let o = '';
  for (let k = 0; k < str.length; k++) o += k < n || str[k] === ' ' ? str[k] : '#%&@$01<>/'[(hash(k, seed) * 10) | 0];
  return o;
}

// ───────────────────────── drawing
const canvas = document.getElementById('c');
canvas.width = W; canvas.height = H;
const ctx = canvas.getContext('2d');
const sub = mk(W, H), sctx = sub.getContext('2d');
const fieldC = mk(W, H), fld = fieldC.getContext('2d');
const BS = 4, bloomC = mk(W / BS, H / BS), blm = bloomC.getContext('2d');
const grain = [], AMB = [];
function buildAmbient() {
  const r = rng(77);
  for (let k = 0; k < 260; k++) AMB.push({ x: (r() - 0.5) * 1500, y: (r() - 0.5) * 2600, d: 0.35 + r() * 0.5, a: 0.04 + 0.12 * r(), c: pick('.·', r()) });
  for (let gk = 0; gk < 4; gk++) {
    const g = mk(256, 256), gx = g.getContext('2d'), id = gx.createImageData(256, 256), rr = rng(200 + gk);
    for (let p = 0; p < id.data.length; p += 4) { const v = (rr() * 255) | 0; id.data[p] = id.data[p + 1] = id.data[p + 2] = v; id.data[p + 3] = 255; }
    gx.putImageData(id, 0, 0); grain.push(g);
  }
}

// the ground glow takes the meaning of the beat: gold for money, purple for IA, blue for the feed, red for the fight
function glowColour(t) {
  const win = (a, b, fi = 0.8, fo = 0.8) => ramp(t, a, fi) * (1 - ramp(t, b, fo));
  const gold = Math.max(win(11.3, 12.9) * 0.6, win(20.6, 22.5) * 0.7, win(37.7, 40.0) * 0.8, win(44.8, 48.0) * 0.5, win(51.8, 55.2) * 0.5, ramp(t, 67.1, 0.8) * 0.9);
  const purple = Math.max(win(1.2, 3.2, 0.6, 0.5), win(3.8, 5.2, 0.4, 0.6) * 0.5, win(51.0, 55.2) * 0.55);
  const blue = win(13.3, 17.85) * 0.85;
  const red = Math.max(win(2.95, 3.6, 0.3, 0.4) * 0.6, win(29.0, 30.5, 0.4, 0.5) * 0.9, win(59.4, 61.0, 0.4, 0.6) * 0.6);
  const orange = Math.max(win(31.4, 38.2) * 0.5, win(65.4, 67.1) * 0.6);
  const green = Math.max(win(44.8, 46.4) * 0.5, ramp(t, 67.1, 0.8) * 0.35);
  const pink = Math.max(win(6.1, 9.95) * 0.5, win(17.85, 20.6) * 0.55, win(48.2, 51.0) * 0.5, win(22.55, 24.5) * 0.3);
  const r = 16 + 34 * gold + 22 * purple + 2 * blue + 38 * red + 30 * orange + 2 * green + 30 * pink,
        g = 16 + 26 * gold + 6 * purple + 12 * blue + 4 * red + 14 * orange + 26 * green + 8 * pink,
        b = 20 + 4 * gold + 36 * purple + 36 * blue + 4 * red + 2 * orange + 10 * green + 16 * pink;
  return [r, g, b];
}

function drawField(g, S, M) {
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, W, H);
  const [a, b, c, d, e, f] = M, z = Math.hypot(a, b);
  for (let i = 0; i < N; i++) {
    const al = S.a[i]; if (al < 0.01 || S.c[i] === 0) continue;
    const x = S.x[i], y = S.y[i];
    const sx = a * x + c * y + e, sy = b * x + d * y + f;
    const sz = 14 * S.s[i] * z;
    if (sx < -sz || sx > W + sz || sy < -sz || sy > H + sz) continue;
    g.globalAlpha = al > 1 ? 1 : al;
    g.drawImage(atlas, S.c[i] * CELL, S.t[i] * CELL, CELL, CELL, sx - sz / 2, sy - sz / 2, sz, sz);
  }
  g.globalAlpha = 1;
}

function text(g, str, x, y, font, color, alpha = 1, align = 'left', spacing = 0) {
  if (alpha <= 0.005) return;
  g.font = font; g.fillStyle = color; g.globalAlpha = clamp(alpha); g.textAlign = align; g.textBaseline = 'middle';
  if (spacing) g.letterSpacing = spacing + 'px';
  g.fillText(str, x, y);
  g.letterSpacing = '0px'; g.globalAlpha = 1;
}

function callout(g, t, t0, t1, ax, ay, lx, ly, label, color = '#EDEDF0', align = 'left') {
  const p = clamp((t - t0) / 0.45), out = 1 - ramp(t, t1, 0.35);
  if (p <= 0 || out <= 0) return;
  g.globalAlpha = out; g.strokeStyle = color; g.fillStyle = color; g.lineWidth = 1.4;
  g.beginPath(); g.arc(ax, ay, 4 * E.backOut(clamp(p * 3)), 0, 7); g.fill();
  const q = E.cubicOut(clamp(p * 1.6)), ex = ax + (lx - ax) * q, ey = ay + (ly - ay) * q;
  g.beginPath(); g.moveTo(ax, ay); g.lineTo(ex, ey);
  const tail = (align === 'left' ? 1 : -1) * 26 * clamp(p * 2 - 1);
  if (q >= 1) g.lineTo(lx + tail, ly);
  g.stroke();
  text(g, decode(label, clamp(p * 1.4 - 0.3), 31), lx + (align === 'left' ? 34 : -34), ly, `500 21px 'JetBrains Mono'`, color, out, align, 3);
}
const fmtBR = n => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

function drawWorldOverlays(g, t, M) {
  g.setTransform(M[0], M[1], M[2], M[3], M[4], M[5]);
  const mono = (px, w = 500) => `${w} ${px}px 'JetBrains Mono'`;
  // the cake
  callout(g, t, 6.55, 8.9, 120, -170, 190, -320, 'CONFEITEIRA', '#F2F2F5', 'left');
  callout(g, t, 9.0, 9.9, -220, 160, -190, 360, 'FAZER BOLO: OK', '#A0A0AA', 'right');
  // the three references, counted
  {
    const n = t >= 16.9 ? 3 : t >= 16.6 ? 2 : t >= 16.36 ? 1 : 0, a = ramp(t, 16.3, 0.2) * (1 - ramp(t, 17.75, 0.25));
    text(g, `REFERÊNCIAS ${n}/3`, 0, 395, mono(20), '#93BCFF', a, 'center', 4);
  }
  callout(g, t, 18.3, 19.25, -200, -15, -100, -330, 'RECHEIO', '#F2F2F5', 'right');
  callout(g, t, 19.4, 20.5, 80, -190, 120, -360, 'DECORAÇÃO', '#F2F2F5', 'left');
  // ingredient prices nobody remembers
  {
    const a = ramp(t, 22.95, 0.3) * (1 - ramp(t, 27.2, 0.3));
    if (a > 0) {
      const mem = t > 24.5 && t < 26.9, fr = Math.floor(t * 14);
      ING_POS.forEach(([x, y], k) => {
        const dg = j => (mem ? '0123456789'[(hash(k * 7 + j, fr) * 10) | 0] : '?');
        const on = ramp(t, 22.95 + k * 0.08, 0.25);
        text(g, `R$ ${dg(0)},${dg(1)}${dg(2)}`, x, y + 138 + 4 * Math.sin(t * 1.8 + k), mono(22), mem ? '#CDCDD3' : '#8A8A94', a * on * (mem && hash(k, fr) > 0.75 ? 0.35 : 1), 'center', 2);
      });
    }
  }
  // price vs cost
  {
    const a = ramp(t, 27.5, 0.3) * (1 - ramp(t, 30.45, 0.25));
    text(g, 'PREÇO', -125, 312, mono(20), '#CDCDD3', a, 'center', 5);
    text(g, 'CUSTO', 125, 312, mono(20), t > 28.9 ? '#FF7A70' : '#8A8A94', a * ramp(t, 28.45, 0.3), 'center', 5);
    text(g, 'NÃO COBRE?', 125, -250, mono(24, 700), '#FF7A70', a * ramp(t, 29.5, 0.3), 'center', 4);
  }
  // the app's sections
  {
    const a = ramp(t, 32.3, 0.3) * (1 - ramp(t, 40.0, 0.3));
    if (a > 0) {
      ['INGREDIENTES', 'RECEITA', 'DECORAÇÃO'].forEach((s, k) => {
        const p = clamp((t - LIT[k]) / 0.5);
        text(g, decode(s, p, 40 + k), -80, [-260, -115, 30][k], mono(22, 700), '#F2F2F5', a * clamp(p * 3), 'left', 3);
      });
      const pc = clamp((t - LIT[3]) / 0.5);
      text(g, decode('CUSTO REAL', pc, 44), -150, 170, mono(19), '#F5CB62', a * clamp(pc * 3), 'left', 4);
      const v = 142.5 * E.cubicOut(clamp((t - 38.3) / 1.2));
      text(g, 'R$ ' + v.toFixed(2).replace('.', ','), 0, 262, mono(46, 700), '#F5CB62', a * ramp(t, 38.25, 0.25), 'center', 1);
    }
  }
  // the order ticket
  {
    const a = ramp(t, 40.3, 0.3) * (1 - ramp(t, 48.2, 0.3));
    if (a > 0) {
      text(g, decode(t >= 40.86 ? 'PEDIDO SALVO' : 'PEDIDO', clamp((t - 40.86) / 0.5), 50), 0, -360, mono(24, 700), '#FFFFFF', a, 'center', 5);
      text(g, 'REFERÊNCIAS', 0, -88, mono(16), '#8A8A94', a * ramp(t, 41.8, 0.3), 'center', 4);
      text(g, decode('DATA DE', clamp((t - 42.66) / 0.4), 51), -80, 2, mono(22, 700), '#F2F2F5', a * ramp(t, 42.62, 0.2), 'left', 3);
      text(g, decode('ENTREGA', clamp((t - 42.8) / 0.4), 52), -80, 40, mono(22, 700), '#F2F2F5', a * ramp(t, 42.75, 0.2), 'left', 3);
      text(g, 'SINAL PAGO', -122, 250, mono(18, 700), '#5BE39A', a * ramp(t, 44.95, 0.3), 'center', 3);
      text(g, 'RESTANTE', 104, 250, mono(18, 700), '#F5CB62', a * ramp(t, 46.1, 0.3), 'center', 3);
      text(g, 'NO DIA DA ENTREGA', 0, 322, mono(16), '#A0A0AA', a * ramp(t, 47.4, 0.3), 'center', 4);
    }
  }
  // the comment box: typing the profession
  {
    const a = ramp(t, 61.4, 0.3) * (1 - ramp(t, 63.25, 0.3));
    if (a > 0) {
      const typed = 'SUA PROFISSÃO', n = Math.floor(clamp((t - 62.45) / 0.65) * typed.length);
      if (n === 0) text(g, 'Escreva um comentário…', -250, -75, `400 36px 'Inter'`, '#7C7C86', a, 'left');
      else text(g, typed.slice(0, n), -250, -75, `700 40px 'Inter'`, '#FFFFFF', a, 'left', 1);
      g.font = n === 0 ? `400 36px 'Inter'` : `700 40px 'Inter'`; g.letterSpacing = n === 0 ? '0px' : '1px';
      const cw = n === 0 ? 0 : g.measureText(typed.slice(0, n)).width; g.letterSpacing = '0px';
      if (Math.floor(t * 2.6) % 2 === 0) { g.globalAlpha = a; g.fillStyle = '#FFFFFF'; g.fillRect(-250 + cw + 6, -100, 4, 50); g.globalAlpha = 1; }
    }
  }
  // the wheel's labels turn with it
  {
    const a = ramp(t, 63.6, 0.4) * (1 - ramp(t, 65.4, 0.3));
    if (a > 0) {
      const th = wheelTheta(t), land = ramp(t, 65.1, 0.3);
      PROF.forEach((s, k) => {
        const ang = -Math.PI / 2 + (k + 0.5) * 2 * Math.PI / WH.n + th, you = k === 9;
        g.save(); g.translate(WH.cx + 190 * Math.cos(ang), WH.cy + 190 * Math.sin(ang)); g.rotate(ang);
        text(g, s, 0, 0, mono(you ? 22 : 16, you ? 700 : 500), you && land > 0 ? '#FFFFFF' : '#A0A0AA', a * (you ? 0.75 + 0.25 * land : 0.85 - 0.5 * land), 'center', 2);
        g.restore();
      });
    }
  }
  // follow · like · share
  ['SEGUIR', 'CURTIR', 'COMPARTILHAR'].forEach((s, k) => {
    const on = ramp(t, [68.5, 68.98, 69.8][k], 0.3);
    text(g, s, (k - 1) * 270, 305, mono(18, on > 0.5 ? 700 : 500), on > 0.5 ? '#FFFFFF' : '#7C7C86', ramp(t, 68.2, 0.4) * (0.4 + 0.6 * on), 'center', 4);
  });
  g.setTransform(1, 0, 0, 1, 0, 0);
}

function drawHUD(g, t) {
  let si = 0; while (si + 1 < SECTIONS.length && SECTIONS[si + 1][0] <= t) si++;
  const [st, label] = SECTIONS[si];
  const p = clamp((t - st) / 0.5), str = decode(label, p, si + 1);
  g.font = `500 19px 'JetBrains Mono'`; g.letterSpacing = '5px';
  const w = g.measureText(label).width + 44, a = ramp(t, 0.1, 0.5);
  g.letterSpacing = '0px';
  g.globalAlpha = 0.5 * a; g.strokeStyle = '#CFCFD6'; g.lineWidth = 1.2;
  g.beginPath(); g.roundRect(CX - w / 2, 128, w, 40, 20); g.stroke();
  g.globalAlpha = 1;
  text(g, str, CX + 2.5, 149, `500 19px 'JetBrains Mono'`, '#E6E6EA', 0.85 * a, 'center', 5);
  g.strokeStyle = '#FFFFFF'; g.globalAlpha = 0.22 * a; g.lineWidth = 1.5;
  const m = 56, L = 26;
  [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]].forEach(([x, y, sx, sy]) => {
    g.beginPath(); g.moveTo(x, y + sy * L); g.lineTo(x, y); g.lineTo(x + sx * L, y); g.stroke();
  });
  g.globalAlpha = 1;
}

function drawSubs(g, t) {
  const c = SUBS.find(s => t >= s.s && t < s.end);
  if (!c) return;
  const out = 1 - clamp((t - (c.end - 0.12)) / 0.12);
  const size = 54, y = 1580;
  const fontR = `400 ${size}px 'Inter'`, fontB = `700 ${size}px 'Inter'`;
  g.font = fontR; const space = g.measureText(' ').width;
  const ws = c.words.map(w => { g.font = w.mark ? fontB : fontR; return g.measureText(w.txt).width; });
  let x = CX - (ws.reduce((a, b) => a + b, 0) + space * (ws.length - 1)) / 2;
  c.words.forEach((w, k) => {
    const p = clamp((t - (w.s - 0.06)) / 0.2);
    if (p > 0) {
      const q = E.cubicOut(p);
      g.font = w.mark ? fontB : fontR; g.textAlign = 'left'; g.textBaseline = 'middle';
      g.fillStyle = w.mark ? TEXT_TINT[w.mark] : '#CDCDD3';
      g.globalAlpha = q * out * (w.mark ? 1 : 0.92);
      g.fillText(w.txt, x, y + 14 * (1 - q));
    }
    x += ws[k] + space;
  });
  g.globalAlpha = 1;
}

function renderScene(t, g) {
  const S = stateAt(t), cam = camAt(t), M = camMatrix(cam);
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'source-over';
  g.fillStyle = '#050506'; g.fillRect(0, 0, W, H);
  const [r, gg, b] = glowColour(t);
  const rad = g.createRadialGradient(CX, CY, 0, CX, CY, 900);
  rad.addColorStop(0, `rgb(${r | 0},${gg | 0},${b | 0})`); rad.addColorStop(1, 'rgba(5,5,6,0)');
  g.fillStyle = rad; g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'lighter';
  for (const p of AMB) {
    const z = 1 + (cam.z - 1) * p.d, x = CX + (p.x - cam.x * p.d) * z, y = CY + ((p.y - t * 8 * p.d) % 1300 + 1300) % 2600 - 1300 - cam.y * p.d;
    if (x < 0 || x > W || y < 0 || y > H) continue;
    g.globalAlpha = p.a; g.drawImage(atlas, p.c * CELL, 0, CELL, CELL, x - 6, y - 6, 12, 12);
  }
  g.globalAlpha = 1;
  drawField(fld, S, M);
  blm.setTransform(1, 0, 0, 1, 0, 0); blm.clearRect(0, 0, W / BS, H / BS);
  blm.filter = 'blur(3px)'; blm.drawImage(fieldC, 0, 0, W / BS, H / BS); blm.filter = 'none';
  g.globalAlpha = 0.85; g.drawImage(bloomC, 0, 0, W, H);
  g.globalAlpha = 1; g.drawImage(fieldC, 0, 0);
  g.globalCompositeOperation = 'source-over';
  const sc = g.createLinearGradient(0, 1380, 0, 1760);
  sc.addColorStop(0, 'rgba(5,5,6,0)'); sc.addColorStop(0.45, 'rgba(5,5,6,0.78)'); sc.addColorStop(1, 'rgba(5,5,6,0.78)');
  g.fillStyle = sc; g.fillRect(0, 1380, W, 540);
  drawWorldOverlays(g, t, M);
  drawHUD(g, t);
  drawSubs(g, t);
}

function travel(t0, t1) {
  const A = stateAt(t0), ax = new Float32Array(A.x), ay = new Float32Array(A.y), aa = new Float32Array(A.a);
  const M0 = camMatrix(camAt(t0));
  const B = stateAt(t1), M1 = camMatrix(camAt(t1));
  let mx = 0;
  for (let i = 0; i < N; i += 3) {
    if (aa[i] < 0.08 && B.a[i] < 0.08) continue;
    const x0 = M0[0] * ax[i] + M0[2] * ay[i] + M0[4], y0 = M0[1] * ax[i] + M0[3] * ay[i] + M0[5];
    const x1 = M1[0] * B.x[i] + M1[2] * B.y[i] + M1[4], y1 = M1[1] * B.x[i] + M1[3] * B.y[i] + M1[5];
    const d = Math.hypot(x1 - x0, y1 - y0);
    if (d > mx && d < 400) mx = d;
  }
  return mx;
}

function finish(t, frameIndex) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 0.045; ctx.globalCompositeOperation = 'overlay';
  const gr = grain[frameIndex % 4], ox = (hash(frameIndex, 1) * 256) | 0, oy = (hash(frameIndex, 2) * 256) | 0;
  ctx.fillStyle = ctx.createPattern(gr, 'repeat'); ctx.translate(-ox, -oy); ctx.fillRect(ox, oy, W, H); ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  const v = ctx.createRadialGradient(CX, H / 2, H * 0.32, CX, H / 2, H * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
}

function renderFrame(t, mb = true, frameIndex = Math.round(t * FPS)) {
  let K = 1;
  if (mb) K = Math.max(1, Math.min(10, Math.ceil(travel(t - SHUTTER / 2, t + SHUTTER / 2) / 5)));
  if (K === 1) renderScene(t, ctx);
  else {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    for (let j = 0; j < K; j++) {
      renderScene(t - SHUTTER / 2 + ((j + 0.5) / K) * SHUTTER, sctx);
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1 / K;
      ctx.drawImage(sub, 0, 0);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
  finish(t, frameIndex);
  return K;
}

// ───────────────────────── events for the sound score
function events() {
  const ev = [];
  KEYS.slice(1).forEach(k => ev.push({ t: k.t, kind: 'morph', d: k.d + k.st, shape: k.s }));
  ev.push(
    { t: 3.15, kind: 'thud' }, { t: 3.85, kind: 'sparkle', d: 0.8 }, { t: 5.3, kind: 'pop' }, { t: 6.5, kind: 'chime' },
    { t: 10.12, kind: 'pop' }, { t: 11.42, kind: 'coins' }, { t: 12.25, kind: 'knocks', n: 5, step: 0.1 },
    { t: 13.85, kind: 'pop' }, { t: 14.85, kind: 'pop' }, { t: 16.36, kind: 'pop' }, { t: 16.6, kind: 'pop' }, { t: 16.9, kind: 'pop' }, { t: 17.4, kind: 'pop' },
    { t: 18.35, kind: 'scan', d: 0.9 }, { t: 19.3, kind: 'sparkle', d: 1.0 }, { t: 22.05, kind: 'thud' },
    { t: 24.5, kind: 'ticks', d: 2.4, rate: 16 }, { t: 27.42, kind: 'pop' }, { t: 28.45, kind: 'tension', d: 1.4 },
    { t: 29.86, kind: 'loss' }, { t: 29.86, kind: 'thud' }, { t: 30.55, kind: 'drop' },
    { t: 31.5, kind: 'knocks', n: 4, step: 0.14 }, { t: 33.0, kind: 'pop' }, { t: 34.62, kind: 'pop' }, { t: 36.1, kind: 'pop' },
    { t: 38.28, kind: 'chime' }, { t: 38.3, kind: 'ticks', d: 1.2, rate: 22 },
    { t: 40.86, kind: 'thud' }, { t: 40.9, kind: 'chime' }, { t: 41.6, kind: 'pop' }, { t: 41.78, kind: 'pop' }, { t: 41.96, kind: 'pop' }, { t: 42.62, kind: 'pop' },
    { t: 44.85, kind: 'coins' }, { t: 46.05, kind: 'pop' }, { t: 47.4, kind: 'chime' }, { t: 49.4, kind: 'sparkle', d: 1.2 },
    { t: 51.9, kind: 'ticks', d: 3.1, rate: 14 }, { t: 53.66, kind: 'pop' }, { t: 54.16, kind: 'pop' }, { t: 54.76, kind: 'pop' },
    { t: 58.25, kind: 'dim', d: 0.9 }, { t: 59.5, kind: 'loss' },
    { t: 61.2, kind: 'pop' }, { t: 62.45, kind: 'type', d: 0.65 },
    { t: WH.t0, kind: 'spin', d: WH.d, end: WH.end, n: WH.n }, { t: 65.1, kind: 'thud' },
    { t: 65.6, kind: 'knocks', n: 8, step: 0.16 }, { t: 67.12, kind: 'coins' }, { t: 67.12, kind: 'bloom' },
    { t: 68.5, kind: 'pop' }, { t: 68.98, kind: 'pop' }, { t: 69.8, kind: 'pop' }, { t: 69.85, kind: 'chime' });
  return ev;
}

// ───────────────────────── boot
async function boot() {
  await Promise.all([`500 50px 'JetBrains Mono'`, `700 50px 'JetBrains Mono'`, `400 50px 'Inter'`, `700 50px 'Inter'`]
    .map(f => document.fonts.load(f, '$?82%ÁÊÇ▶▪█▓')));
  await document.fonts.ready;
  buildAtlas(); buildAmbient(); buildShapes(); buildDelays(); buildSubs();
}
window.__ready = boot();
window.__seek = t => renderFrame(t, false);
window.__frame = (i, mb = true) => renderFrame(i / FPS, mb, i);
window.__png = () => canvas.toDataURL('image/png');
window.__events = events;
window.__meta = { W, H, FPS, DUR, N };

(async () => {
  await window.__ready;
  const qs = new URLSearchParams(location.search);
  if (qs.has('render')) { document.body.classList.add('render'); return; }
  const vo = document.getElementById('vo'), sc = document.getElementById('sc'), tc = document.getElementById('tc'), pp = document.getElementById('pp');
  sc.max = DUR;
  let playing = false;
  const show = t => { renderFrame(t, qs.has('mb')); sc.value = t; tc.textContent = t.toFixed(2); };
  show(parseFloat(qs.get('t') || '0'));
  sc.oninput = () => { vo.currentTime = +sc.value; show(+sc.value); };
  pp.onclick = () => { playing = !playing; pp.textContent = playing ? '❚❚ pause' : '▶ play'; if (playing) { vo.currentTime = +sc.value; vo.play(); loop(); } else vo.pause(); };
  function loop() { if (!playing) return; show(vo.currentTime); if (vo.ended) { playing = false; pp.textContent = '▶ play'; } requestAnimationFrame(loop); }
  if (qs.has('play')) pp.onclick();
})();
