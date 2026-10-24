// VSL ATS · hook ao bloco 4 — padrão v4 (hook = v4 aprovado; blocos 2–4 refeitos no mesmo padrão: dotwork + profundidade) — ASCII onetake, estilo realista (GUIA-DE-ESTILO.md §14). 17000 agentes que nunca saem do filme:
// o bolso vazio → o barulho → o feed → milhões → todo mundo igual → a briga → o grupo pequeno → a IA construindo → a camada → o dono.
// Motor: o do reel Arquiteto (exemplos/reel-arquiteto/projeto/comp.js). Trechos do narrador: tela preta por enquanto (NARR).
'use strict';

const W = 1080, H = 1920, CX = 540, CY = 800, FPS = 30, DUR = 246.53, N = 40000;
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
const CH = [...' .·:-=+*#%@$?!01<>/\\|_▶▪█▓▒░o•' + 'abcdefghijklmnpqrstuvwxyzáãçéêíóõúABCDEFGHIJKLMNOPQRSTUVWXYZ23456789,'];
const CI = {}; CH.forEach((c, i) => (CI[c] = i));
const SCR = [...'01<>/\\|=+*#%$?!'].map(c => CI[c]);
const pick = (s, r) => CI[s[(r * s.length) | 0]];
const chi = ch => (ch === ' ' ? CI['·'] : CI[ch] ?? CI[ch.toLowerCase()] ?? CI['=']);
//              white      purple     blue       orange     gray       gold       green      red
//              white      purple     blue       orange     gray       gold       green      red        pink       cream      chocolate
const TINT = ['#F2F2F5', '#A68BFF', '#6EA6FF', '#FF9B55', '#7C7C86', '#F2C14E', '#3DDC84', '#FF5A52', '#FF8FB8', '#F6E3C2', '#B97A55', '#E07A55', '#25D366', '#4D8DFF', '#9C6B3F'];
const WHITE = 0, PURPLE = 1, BLUE = 2, ORANGE = 3, GRAY = 4, GOLD = 5, GREEN = 6, RED = 7, PINK = 8, CREAM = 9, CHOCO = 10, CLAUDE = 11, WAG = 12, OWNB = 13, BROWN = 14; // Claude orange, WhatsApp green, owner blue, brick brown
// pink (sweetness, affection), cream (home-made warmth) and chocolate (comfort) live only on the food
const TEXT_TINT = { '*': '#FFFFFF', '^': '#BBA3FF', '~': '#93BCFF', '=': '#FFB07A', '!': '#5BE39A', '+': '#5BE39A', '&': '#FF7A70' };
const money = r => (r > 0.72 ? GREEN : GOLD);
const CELL = 32, AC = 53, AR = 2; // atlas 1696 × 704: small cells (thin strokes survive the downscale) and under the GPU texture limit
const AX = c => (c % AC) * CELL, AY = (c, t) => (t * AR + ((c / AC) | 0)) * CELL;
let atlas;
function buildAtlas() {
  atlas = mk(AC * CELL, TINT.length * AR * CELL);
  const g = atlas.getContext('2d');
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `500 ${Math.round(CELL * 0.78)}px 'JetBrains Mono'`;
  TINT.forEach((col, ti) => {
    g.fillStyle = col;
    CH.forEach((c, ci) => g.fillText(c, AX(ci) + CELL / 2, AY(ci, ti) + CELL / 2 + 1));
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
  if (tot > N) { console.warn("thinned", tot, "->", N); groups = groups.map((g, gi) => { const r = rng(700 + gi); return g.filter(() => r() < N / tot); }); }
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
  const RG = Uint8Array.from(flat, p => (p.rgT !== undefined && p.bone !== undefined && !p.fig ? 1 : 0));
  return {
    pts: flat, map, raw: tot,
    fill(t, b) {
      for (let i = 0; i < N; i++) {
        const k = map[i];
        if (k < 0) { b.x[i] = HOME.x[i] * 1.7; b.y[i] = HOME.y[i] * 1.5 - 300; b.a[i] = 0; b.c[i] = HOME.c[i]; b.t[i] = 0; b.s[i] = 0.8; continue; }
        b.x[i] = P.x[k]; b.y[i] = P.y[k]; b.a[i] = P.a[k]; b.c[i] = P.c[k]; b.t[i] = P.t[k]; b.s[i] = P.s[k];
        if (RG[k]) rigPoint(t, i, flat[k], b);
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
const CELLPX = 4;
// clean look (Parte 3): glyphs on the grid, no random brightness, six tones. `?noisy` brings back the old speckle.
const CLEAN = !(typeof location !== 'undefined' && location.search.includes('noisy'));
const DOTWORK = false; // true = the old dotwork for dotArt (random dots); the Parte 3 look reads everything as glyphs
const RAMP_CLEAN = ' .:=+#@';
const RAMP = ' .·:-=+*#%@';
const PAL = TINT.map(h => [1, 3, 5].map(k => parseInt(h.slice(k, k + 2), 16)));
const tone = (hex, v) => { const [r, g, b] = [1, 3, 5].map(k => parseInt(hex.slice(k, k + 2), 16)); return `rgb(${(r * v) | 0},${(g * v) | 0},${(b * v) | 0})`; };
const WT = '#F2F2F5', GD = '#F2C14E', PU = '#A68BFF', BL = '#6EA6FF', OR = '#FF9B55', GN = '#3DDC84', GY = '#9A9AA4';
const LG = (g, x0, y0, x1, y1, st) => { const q = g.createLinearGradient(x0, y0, x1, y1); st.forEach(([o, c]) => q.addColorStop(o, c)); return q; };
const RG = (g, x, y, r0, r1, st) => { const q = g.createRadialGradient(x, y, r0, x, y, r1); st.forEach(([o, c]) => q.addColorStop(o, c)); return q; };
const RR = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
const poly = (g, pts) => { g.beginPath(); pts.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); };
let ID_PASS = false;
const F = (ti, style) => (ID_PASS ? `rgb(${ti * 12 + 6},0,0)` : style); // up to 20 tints in the colour map
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
    if (idm && idm[kc + 3] > 100) t = clamp(Math.round((idm[kc] - 6) / 12), 0, TINT.length - 1);
    else if (mx > 0 && (mx - mn) / mx > 0.25) {
      let best = 1e9;
      PAL.forEach(([pr, pg, pb], ti) => {
        if (ti === WHITE || ti === GRAY || ti > RED) return; // food tints only come from a colour map
        const s = Math.max(pr, pg, pb), dd = (R / mx - pr / s) ** 2 + (G / mx - pg / s) ** 2 + (B / mx - pb / s) ** 2;
        if (dd < best) { best = dd; t = ti; }
      });
    }
    const rr = r(), li0 = CLEAN ? clamp(Math.pow(lum, 0.6) * 1.12) : clamp(Math.pow(lum, 0.8) + (rr - 0.5) * 0.08), li = CLEAN ? Math.round(li0 * 5) / 5 : li0;
    if (o.money && t === GOLD && rr > 0.74) t = GREEN;
    if (o.dot && DOTWORK) { // dotwork: a dot survives with probability ~ brightness, its size grows with it
      if (rr > Math.min(1, li * 1.2 + 0.1)) continue;
      pts.push({ x: cx + cell / 2 - w / 2 + (r() - 0.5) * cell * 0.6, y: cy + cell / 2 - h / 2 + (r() - 0.5) * cell * 0.6, v: lum, r: rr, a: 0.62 + 0.38 * li, c: CI['•'], t: o.tint !== undefined ? o.tint : t, s: (cell * 3.3 / 14) * (0.38 + 0.72 * li) });
      continue;
    }
    const jx = CLEAN ? 0 : (r() - 0.5) * cell * 0.2, jy = CLEAN ? 0 : (r() - 0.5) * cell * 0.2, RP = CLEAN ? RAMP_CLEAN : RAMP;
    pts.push({ x: cx + cell / 2 - w / 2 + jx, y: cy + cell / 2 - h / 2 + jy, v: lum, r: rr,
      a: CLEAN ? 0.66 + 0.34 * li : 0.38 + 0.62 * li, c: CI[RP[CLEAN ? clamp(Math.round((0.3 + 0.7 * li) * (RP.length - 1)), 3, RP.length - 1) : clamp(Math.round(li * (RP.length - 1)), 1, RP.length - 1)]], // clean: a floor at '=', so the dark side of an object stays solid
      t: o.tint !== undefined ? o.tint : t, s: CLEAN ? (cell * 1.75 / 14) * (0.9 + 0.2 * li) : (cell * 1.55 / 14) * (0.8 + 0.35 * li) });
  }
  return o.nosort ? pts : hsort(pts);
}
const art = (draw, s = 1, dx = 0, dy = 0, o = {}) => imgPts(g => { g.save(); g.translate(dx, dy); g.scale(s, s); draw(g); g.restore(); }, o);
const tagged = (pts, tag) => pts.map(p => ({ ...p, ...tag }));

// ── shared drawing helpers (from the Confeiteira)
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
  g.fillStyle = tone(WT, 0.85); RR(g, -120, -168, 240, 34, 6); g.fill();
  g.fillStyle = tone(WT, 0.2); for (let k = 0; k < 5; k++) g.fillRect(-90 + k * 40, -156, 22, 10);
  for (let k = 0; k < 6; k++) {
    const x0 = -168 + k * 56, xt = -150 + k * 50;
    g.fillStyle = tone(WT, k % 2 ? 0.38 : 0.95);
    poly(g, [[xt, -125], [xt + 50, -125], [x0 + 56, -62], [x0, -62]]); g.fill();
    g.beginPath(); g.arc(x0 + 28, -62, 28, 0, Math.PI); g.fill();
  }
  g.fillStyle = tone(WT, 0.12); g.fillRect(-10, 0, 130, 90);
  g.fillStyle = tone(WT, 0.6); poly(g, [[8, 90], [58, 0], [80, 0], [30, 90]]); g.fill();
  g.strokeStyle = tone(WT, 0.9); g.lineWidth = 6; g.strokeRect(-10, 0, 130, 90);
  g.fillStyle = tone(WT, 0.2); g.fillRect(-115, 10, 80, 140); g.strokeRect(-115, 10, 80, 140);
  sphere(g, -48, 85, 6, WT, 1);
  g.fillStyle = tone(WT, 0.7); g.fillRect(-152, 148, 304, 12);
}
const textArt = (str, px, hex, y = 0) => g => {
  g.font = HEAVY(px); g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = CLEAN ? tone(hex, 1) : LG(g, 0, y - px * 0.42, 0, y + px * 0.42, [[0, tone(hex, 1)], [0.5, tone(hex, 0.72)], [1, tone(hex, 0.38)]]); // clean: flat colour (a gradient turns into bands)
  g.fillText(str, 0, y);
  g.globalCompositeOperation = 'source-atop'; g.fillStyle = tone(WT, 0.95);
  if (!CLEAN) { poly(g, [[-px, y - px * 0.08], [px, y - px * 0.52], [px, y - px * 0.4], [-px, y + px * 0.04]]); g.fill(); }
  g.globalCompositeOperation = 'source-over';
  g.lineWidth = Math.max(2, px * 0.012); g.strokeStyle = tone(hex, 1); g.strokeText(str, 0, y);
};
const cube = (g, x, y, s, v = 1) => {
  g.fillStyle = tone(WT, v); poly(g, [[x, y - s * 0.5], [x + s, y], [x, y + s * 0.5], [x - s, y]]); g.fill();
  g.fillStyle = tone(WT, v * 0.62); poly(g, [[x - s, y], [x, y + s * 0.5], [x, y + s * 1.5], [x - s, y + s]]); g.fill();
  g.fillStyle = tone(WT, v * 0.36); poly(g, [[x, y + s * 0.5], [x + s, y], [x + s, y + s], [x, y + s * 1.5]]); g.fill();
};
const RD = '#FF5A52';
const VOID = tone(WT, 0.04); // under the lit threshold: reads as a hole in the glyphs
const bustArt = (x, y, s) => g => {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = LG(g, -150, 0, 150, 0, [[0, tone(WT, 0.34)], [0.42, tone(WT, 0.86)], [1, tone(WT, 0.3)]]);
  g.beginPath(); g.ellipse(0, 165, 150, 125, 0, Math.PI, 0); g.closePath(); g.fill();
  sphere(g, 0, -50, 70, WT, 1);
  g.restore();
};

// the iso structure (Hairline: painted back to front so near faces hide far ones)
const BLOCKS = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [0, 0, 2]];
function buildPts(M, seed) {
  const w = 700, h = 760, c = mk(w, h), g = c.getContext('2d'), U = 92;
  g.translate(w / 2, h / 2 + 120); g.lineJoin = 'round'; g.lineCap = 'round';
  const P = (u, v, z) => [(u - v) * 0.98, (u + v) * 0.49 - z];
  const order = BLOCKS.map((b, id) => ({ b, id })).sort((a, b) => (a.b[0] + a.b[1] + a.b[2] * 0.01) - (b.b[0] + b.b[1] + b.b[2] * 0.01) || a.b[2] - b.b[2]);
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
  for (let y = 0; y + cell <= h; y += cell) for (let x = 0; x + cell <= w; x += cell) {
    const k = ((y + 2) * w + x + 2) * 4; if (d[k + 3] < 200) continue;
    const id = Math.round((d[k] - 10) / 20), sh = d[k + 1], q = rr();
    const v = sh > 200 ? 1 : sh > 100 ? 0.62 : sh > 60 ? 0.4 : 0.24;
    out.push({ x: x + 2.5 - w / 2, y: y + 2.5 - h / 2 - 60, block: id, edge: sh > 200, a: 0.2 + 0.8 * v,
      c: CI[RAMP[clamp(Math.round(v * (RAMP.length - 1)), 1, RAMP.length - 1)]], t: ORANGE, s: 0.42 + 0.14 * v, q });
  }
  return hsort(out).slice(0, M);
}
const scaled = (pts, s, dx, dy, extra = {}) => pts.map(p => ({ ...p, x: p.x * s + dx, y: p.y * s + dy, s: p.s * Math.max(0.75, Math.sqrt(s)), ...extra }));
const dropIn = (t, at, d = 0.4) => ramp(t, at, d, E.backOut);
const flash = (t, at, w = 0.12) => Math.exp(-(((t - at) / w) ** 2));

// ───────────────────────── VSL parte 1 · Hook — v4 (padrão novo: referência = hook do Emmanuel)
// dotwork (pontilhismo) nos objetos "reais" (mãos, carteira, pessoas, camadas, dono); ASCII na interface. Profundidade 3D na multidão.
const NARR = [[0, 3.9], [15.8, 20.1]];
const NARR_IN = 0.35, NARR_OUT = 0.6; // he fades in over the scene that leaves, and out over the one that forms
const narrAt = t => { let v = 0; for (const [a, b] of NARR) v = Math.max(v, E.sine(clamp((t - a) / NARR_IN + 1)) * (1 - E.sine(clamp((t - b) / NARR_OUT)))); return v; };
const swing = (t, i, p, b, cx, cy, a) => { const dx = p.x - cx, dy = p.y - cy; b.x[i] = cx + dx * Math.cos(a) - dy * Math.sin(a); b.y[i] = cy + dx * Math.sin(a) + dy * Math.cos(a); };
const dotArt = (draw, s = 1, dx = 0, dy = 0, o = {}) => art(draw, s, dx, dy, { cell: 4, dot: true, ...o });
const POCKET_Y = -40;

// ── a carteira: duas mãos abrem, como um livro; dentro, nada
const WAL = { w: 250, h: 330, y: -40 };
const stitch = (g, x, y, w, h) => { g.strokeStyle = tone(WT, 0.85); g.lineWidth = 3; g.setLineDash([9, 8]); RR(g, x, y, w, h, 16); g.stroke(); g.setLineDash([]); };
function walInL(g) {
  const { w, h, y } = WAL;
  g.fillStyle = LG(g, -w, 0, 0, 0, [[0, tone(WT, 0.3)], [0.6, tone(WT, 0.55)], [1, tone(WT, 0.26)]]); RR(g, -w, y - h / 2, w, h, 22); g.fill();
  [-110, -45, 20].forEach((dy, k) => {
    const yy = y + dy, top = () => { g.beginPath(); g.moveTo(-w + 22, yy + 16); g.quadraticCurveTo(-w / 2, yy - 10, -22, yy + 16); };
    g.fillStyle = LG(g, 0, yy, 0, yy + 150, [[0, tone(WT, 0.95 - 0.1 * k)], [1, tone(WT, 0.5)]]); top(); g.lineTo(-22, y + h / 2 - 20); g.lineTo(-w + 22, y + h / 2 - 20); g.closePath(); g.fill();
    g.strokeStyle = VOID; g.lineWidth = 6; top(); g.stroke();
  });
  stitch(g, -w + 10, y - h / 2 + 10, w - 16, h - 20);
}
function walInR(g) {
  const { w, h, y } = WAL;
  g.fillStyle = LG(g, 0, 0, w, 0, [[0, tone(WT, 0.26)], [0.4, tone(WT, 0.58)], [1, tone(WT, 0.3)]]); RR(g, 0, y - h / 2, w, h, 22); g.fill();
  g.fillStyle = VOID; RR(g, 30, y - h / 2 + 34, w - 60, 130, 12); g.fill();                                            // empty ID window
  g.strokeStyle = tone(WT, 0.9); g.lineWidth = 5; RR(g, 30, y - h / 2 + 34, w - 60, 130, 12); g.stroke();
  g.fillStyle = LG(g, 0, y + 30, 0, y + 150, [[0, tone(WT, 0.9)], [1, tone(WT, 0.45)]]); RR(g, 24, y + 30, w - 48, 120, 12); g.fill();
  g.strokeStyle = VOID; g.lineWidth = 6; g.beginPath(); g.moveTo(44, y + 50); g.lineTo(w - 44, y + 50); g.stroke();
  stitch(g, 6, y - h / 2 + 10, w - 16, h - 20);
}
function walOut(g) { // the cover, drawn on x 0…w (seen mirrored while folded over)
  const { w, h, y } = WAL;
  g.fillStyle = LG(g, 0, y - h / 2, w, y + h / 2, [[0, tone(WT, 0.85)], [0.5, tone(WT, 0.55)], [1, tone(WT, 0.32)]]); RR(g, 0, y - h / 2, w, h, 22); g.fill();
  stitch(g, 8, y - h / 2 + 10, w - 16, h - 20);
  g.strokeStyle = tone(WT, 0.4); g.lineWidth = 4; RR(g, w / 2 - 50, y - 34, 100, 68, 10); g.stroke();
  const r = rng(31); g.fillStyle = tone(WT, 0.3); for (let k = 0; k < 140; k++) { g.beginPath(); g.arc(14 + r() * (w - 28), y - h / 2 + 14 + r() * (h - 28), 2 + r() * 2, 0, 7); g.fill(); }
}
const walletFlat = g => { walInL(g); walInR(g); };
function handGrip(g, side = 1) { // grip point at the origin, the arm going down (+y)
  g.fillStyle = LG(g, -80, 0, 80, 0, [[0, tone(WT, 0.12)], [0.45, tone(WT, 0.26)], [1, tone(WT, 0.1)]]); poly(g, [[-60, 140], [60, 140], [74, 420], [-74, 420]]); g.fill();
  g.fillStyle = LG(g, 0, 132, 0, 176, [[0, tone(WT, 0.65)], [1, tone(WT, 0.35)]]); RR(g, -66, 134, 132, 38, 10); g.fill();                         // cuff
  g.fillStyle = LG(g, -60, 0, 60, 0, [[0, tone(WT, 0.5)], [0.4, tone(WT, 0.95)], [1, tone(WT, 0.45)]]);
  g.beginPath(); g.moveTo(-52, 146); g.bezierCurveTo(-66, 92, -60, 42, -42, 10); g.lineTo(42, 6); g.bezierCurveTo(62, 42, 66, 92, 52, 146); g.closePath(); g.fill();
  for (let k = 0; k < 4; k++) { const x = -33 + k * 22, l = [34, 40, 38, 30][k]; g.fillStyle = RG(g, x - 4, -10, 1, 18, [[0, tone(WT, 1)], [1, tone(WT, 0.5)]]); RR(g, x - 10, 18 - l, 20, l + 8, 10); g.fill(); g.strokeStyle = tone(WT, 0.25); g.lineWidth = 3; g.beginPath(); g.moveTo(x - 9, 14); g.lineTo(x + 9, 14); g.stroke(); }
  g.save(); g.translate(side * 50, 62); g.rotate(side * -0.55); g.fillStyle = LG(g, -16, 0, 16, 0, [[0, tone(WT, 0.55)], [0.5, tone(WT, 1)], [1, tone(WT, 0.5)]]); RR(g, -16, -74, 32, 90, 16); g.fill(); g.fillStyle = tone(WT, 0.75); RR(g, -10, -70, 20, 22, 8); g.fill(); g.restore();
  g.strokeStyle = tone(WT, 0.3); g.lineWidth = 3; g.beginPath(); g.moveTo(-30, 76); g.quadraticCurveTo(0, 88, 30, 76); g.stroke();
}
const walO = t => ramp(t, 4.15, 0.62, E.inOut);
function walGeom(t) {
  const o = walO(t), th = Math.PI * (1 - o), c = Math.cos(th), R = Math.max(0, WAL.w * c), u = Math.max(0, t - 4.78);
  const shake = t > 4.78 ? 9 * Math.exp(-5 * u) * Math.sin(28 * u) : 0;
  return { o, th, c, shift: (WAL.w - R) / 2 + shake, lift: t > 4.78 ? -6 * Math.exp(-5 * u) * Math.abs(Math.sin(28 * u)) : 0 };
}
const HAND_ANCH = [[-560, 980], [560, 980]];

// ── os balões, o feed e a transmissão (iguais à v3)
// ── os balões de fala ("gente falando sobre isso")
const BUB = [[-235, -440, 410, 104], [215, -305, 430, 104], [-225, -170, 380, 104], [235, -35, 410, 104], [-215, 100, 440, 104], [225, 235, 360, 104]];
const BUB_AT = [5.2, 5.52, 5.86, 6.18, 6.5, 6.88];
const BUB_TXT = ['RENDA EXTRA COM IA', 'O PROMPT SECRETO', 'FATURE COM IA', 'A NOVA FERRAMENTA', 'IA VAI TE SUBSTITUIR', 'O MÉTODO NOVO'];
const bubbleArt = (x, y, w, h, side) => g => {
  const x0 = x - w / 2, y0 = y - h / 2, tx = side < 0 ? x0 + 64 : x0 + w - 64;
  g.fillStyle = tone(WT, 0.05); RR(g, x0, y0, w, h, 30); g.fill();
  g.beginPath(); g.moveTo(tx - 22, y0 + h - 2); g.lineTo(tx + side * 34, y0 + h + 38); g.lineTo(tx + 22, y0 + h - 2); g.closePath(); g.fill();
  g.strokeStyle = LG(g, x0, y0, x0 + w, y0 + h, [[0, tone(WT, 1)], [1, tone(BL, 0.85)]]); g.lineWidth = 7;
  RR(g, x0, y0, w, h, 30); g.stroke();
  g.beginPath(); g.moveTo(tx - 22, y0 + h + 2); g.lineTo(tx + side * 34, y0 + h + 38); g.lineTo(tx + 22, y0 + h + 2); g.stroke();
  sphere(g, tx + side * 60, y0 + h + 56, 19, WT, 0.95);                                                                   // who is talking
};
const bubPop = (t, k) => dropIn(t, BUB_AT[k], 0.3);
const bubBob = (t, k) => 4 * Math.sin(t * 2 + k * 1.7);

// ── o feed: posts sobre IA rolando no celular
const FEED2 = { top: -300, period: 660 };
const feedOff2 = t => 62 * Math.max(0, t - 7.6) + 300 * clamp(t - 8.95, 0, 0.8);
const postIA = y => g => {
  g.fillStyle = tone(BL, 0.18); RR(g, -145, y - 68, 290, 136, 18); g.fill();
  g.strokeStyle = tone(BL, 0.85); g.lineWidth = 5; RR(g, -145, y - 68, 290, 136, 18); g.stroke();
  g.fillStyle = LG(g, -130, y - 52, -30, y + 52, [[0, tone(WT, 0.78)], [1, tone(WT, 0.36)]]); RR(g, -128, y - 52, 104, 104, 12); g.fill();
  g.fillStyle = VOID; poly(g, [[-90, y - 22], [-56, y], [-90, y + 22]]); g.fill();
  g.fillStyle = tone(WT, 0.88); RR(g, -6, y - 42, 128, 13, 6); g.fill(); RR(g, -6, y - 18, 92, 13, 6); g.fill();
  g.fillStyle = tone(PU, 1); RR(g, -6, y + 12, 70, 34, 11); g.fill();
  g.fillStyle = VOID; g.font = HEAVY(24); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('IA', 29, y + 30);
};
const feedScreen = g2 => { g2.fillStyle = tone(BL, 0.7); for (let k = 0; k < 4; k++) RR(g2, -140, -260 + k * 140, 280, 100, 16), g2.fill(); g2.fillStyle = tone(PU, 1); for (let k = 0; k < 4; k++) RR(g2, -40, -200 + k * 140, 90, 30, 10), g2.fill(); };

// ── as pessoas (um busto modelo, copiado: toda pessoa tem os mesmos pontos, então os papéis se mantêm)
let BUST_T = null, G7_T = null;
const bustAt = (tpl, x, y, k, extra = {}) => tpl.map(p => ({ ...p, x: p.x + x, y: p.y + y, bk: k, bx: x, by: y, ...extra }));
const PH_S = 0.4, PH_Y = -400, SRC = [0, PH_Y + 150], T_WAVE = 9.85;
function crowdBusts() {
  const out = [];
  for (let r = 0; r < 8; r++) for (let c = 0; c < 14; c++) out.push(...bustAt(BUST_T, (c - 6.5) * 74 + (r % 2 ? 18 : -18), -150 + r * 76, r * 14 + c));
  return out;
}
const G7_POS = [...Array(7)].map((_, k) => [(k - 3) * 125, -40 + 16 * Math.abs(k - 3)]);
const cubeC = (g, x, y, s, hex, v = 1) => {
  g.fillStyle = tone(hex, v); poly(g, [[x, y - s * 0.5], [x + s, y], [x, y + s * 0.5], [x - s, y]]); g.fill();
  g.fillStyle = tone(hex, v * 0.62); poly(g, [[x - s, y], [x, y + s * 0.5], [x, y + s * 1.5], [x - s, y + s]]); g.fill();
  g.fillStyle = tone(hex, v * 0.36); poly(g, [[x, y + s * 0.5], [x + s, y], [x + s, y + s], [x, y + s * 1.5]]); g.fill();
};
// a small structure of its own: back cube, the one on top of it, the two in front
const stackArt = s => g => [[0, 0], [0, -s], [-s, s * 0.5], [s, s * 0.5], [0, s]].forEach(([x, y]) => cubeC(g, x, y, s, GD));


// ── a multidão em 3D: perspectiva real, a câmera anda por dentro
let PERS_T = null, ICON_T = null, FULL_T = null;
const K3 = 330, HOR = -330, CAMH = 3.2;
const proj = (X, Z, cx, cz) => { const d = Math.max(0.05, Z - cz), s = 1 / d; return [(X - cx) * K3 * s, HOR + CAMH * K3 * s, s, d]; };
const CROWD3 = [];  // 6 rows × 9 cols
for (let r = 0; r < 8; r++) for (let c = 0; c < 9; c++) CROWD3.push([(c - 4) * 0.95 + (r % 2 ? 0.47 : 0), 1.6 + r * 0.85]);
const crowdCam = t => ({ z: lerp(-0.35, 0.5, ramp(t, 12.65, 2.95, E.inOut)), x: 0.3 * Math.sin((t - 12.65) * 0.9) });
// the three assistants, drawn in the same dot language: a knotted rosette (GPT), a starburst (Claude), a four-point spark (Gemini)
function gptIcon(g) { g.strokeStyle = LG(g, -40, -40, 40, 40, [[0, tone(WT, 1)], [1, tone(WT, 0.6)]]); g.lineWidth = 9; for (let k = 0; k < 6; k++) { g.save(); g.rotate(k * Math.PI / 3); g.beginPath(); g.ellipse(0, -18, 13, 26, 0, 0, 7); g.stroke(); g.restore(); } }
function claudeIcon(g) { g.fillStyle = tone(OR, 1); for (let k = 0; k < 12; k++) { g.save(); g.rotate(k * Math.PI / 6 + (k % 2) * 0.12); RR(g, -5, -44 + (k % 3) * 6, 10, 38 - (k % 3) * 6, 5); g.fill(); g.restore(); } sphere(g, 0, 0, 10, OR, 1); }
function geminiIcon(g) { g.fillStyle = LG(g, -40, -40, 40, 40, [[0, tone(BL, 1)], [0.6, tone(PU, 1)], [1, tone(WT, 0.9)]]); g.beginPath(); g.moveTo(0, -46); g.quadraticCurveTo(4, -4, 46, 0); g.quadraticCurveTo(4, 4, 0, 46); g.quadraticCurveTo(-4, 4, -46, 0); g.quadraticCurveTo(-4, -4, 0, -46); g.fill(); }
const ICONS = [gptIcon, claudeIcon, geminiIcon];
function crowd3Pts(pos, iconsToo = true) {
  const out = [];
  pos.forEach(([X, Z], k) => {
    PERS_T.forEach(p => out.push({ ...p, rx: p.x, ry: p.y, X, Z, pk: k }));
    if (iconsToo) ICON_T[k % 3].forEach(p => out.push({ ...p, rx: p.x, ry: p.y, X, Z, pk: k, ic: k % 3 }));
  });
  return out;
}
const place3 = (b, i, p, cam, lift = 0) => { const [px, py, s, d] = proj(p.X, p.Z, cam.x, cam.z), m = s * 2.1; b.x[i] = px + p.rx * m; b.y[i] = py + (p.ry - lift) * m; b.s[i] = p.s * clamp(m, 0.5, 2.4); return d; };

// ── pessoas de corpo inteiro (o grupo pequeno, o dono): luz de recorte pela esquerda, pontilhado
function personFull(g) {
  g.fillStyle = LG(g, -60, 0, 60, 0, [[0, tone(WT, 1)], [0.42, tone(WT, 0.72)], [1, tone(WT, 0.3)]]);
  RR(g, -28, 8, 25, 138, 12); g.fill(); RR(g, 3, 8, 25, 138, 12); g.fill();                                   // legs
  g.beginPath(); g.moveTo(-46, -96); g.quadraticCurveTo(-52, -58, -33, 22); g.lineTo(33, 22); g.quadraticCurveTo(52, -58, 46, -96); g.quadraticCurveTo(0, -110, -46, -96); g.fill(); // torso
  RR(g, -61, -92, 18, 112, 9); g.fill(); RR(g, 43, -92, 18, 112, 9); g.fill();                                // arms
  g.fillRect(-8, -118, 16, 20); sphere(g, 0, -138, 25, WT, 1);                                                  // neck, head
  RR(g, -32, 140, 30, 11, 5); g.fill(); RR(g, 2, 140, 30, 11, 5); g.fill();                                   // shoes
  g.strokeStyle = tone(WT, 0.2); g.lineWidth = 3; g.beginPath(); g.moveTo(0, -60); g.lineTo(0, 20); g.stroke(); // a fold down the shirt
}
const G7X = k => (k - 3) * 108;


// ───────────────────────── the viewer: an animated mannequin (ten bones, forward kinematics, a pose library)
// Each bone is painted in its rest pose (hanging down from its joint; torso and head standing up from theirs), read on
// the grid once, and moved every frame. Angles are relative to the torso: 0 = straight down, + towards +x.
const RIG = { LT: 112, LU: 60, LF: 58, LTH: 72, LSH: 70, SW: 46, HW: 17, NECK: 12, HR: 30 };
const BONES = ['thL', 'shL', 'thR', 'shR', 'uaL', 'faL', 'torso', 'head', 'uaR', 'faR'];
function boneArt(name, v = 1, ti = WHITE, o = {}) {
  return g => {
    const capsule = (w, L, v0, v1) => { g.fillStyle = F(ti, LG(g, -w / 2, 0, w / 2, 0, [[0, tone(WT, v * v0 * 0.45)], [0.38, tone(WT, v * v0)], [1, tone(WT, v * v0 * 0.42)]]));
      RR(g, -w / 2, -w * 0.2, w, L + w * 0.4, w / 2); g.fill(); };
    g.lineCap = 'round';
    if (name === 'torso') { // chest and pelvis in one rounded piece, standing up from the hip (narrow in profile)
      const hw = o.view === 'side' ? 24 : 38;
      g.fillStyle = F(ti, LG(g, -hw - 2, 0, hw + 2, 0, [[0, tone(WT, v * 0.4)], [0.38, tone(WT, v)], [1, tone(WT, v * 0.42)]])); RR(g, -hw, -RIG.LT - 8, 2 * hw, RIG.LT + 22, hw > 30 ? 26 : 20); g.fill();
      g.strokeStyle = F(ti, tone(WT, v * 0.25)); g.lineWidth = 3; g.beginPath(); g.moveTo(-30, -8); g.quadraticCurveTo(0, 4, 30, -8); g.stroke(); // the belt line
      if (o.bolt) { g.fillStyle = F(GOLD, tone(GD, 1)); } return;
    }
    if (name === 'head') { // the head with two eyes (seen from the front) and a little neck
      g.fillStyle = F(ti, tone(WT, v * 0.5)); g.fillRect(-9, -RIG.NECK - 4, 18, RIG.NECK + 8);
      sphere(g, 0, -RIG.NECK - RIG.HR, RIG.HR, WT, v, ti);
      const back = o.back || o.view === 'back', side = o.view === 'side';
      if (side) { g.fillStyle = F(ti, tone(WT, v * 0.9)); g.beginPath(); g.ellipse(RIG.HR - 2, -RIG.NECK - RIG.HR + 2, 7, 6, 0, 0, 7); g.fill(); // the nose
        g.fillStyle = '#000'; g.beginPath(); g.ellipse(12, -RIG.NECK - RIG.HR - 4, 3.4, 5, 0, 0, 7); g.fill(); }
      else if (!back) { g.fillStyle = '#000'; [-10, 10].forEach(dx => { g.beginPath(); g.ellipse(dx, -RIG.NECK - RIG.HR - 2, 3.6, 5, 0, 0, 7); g.fill(); }); }
      if (o.helmet) { const hy = -RIG.NECK - RIG.HR; g.fillStyle = F(ORANGE, LG(g, -RIG.HR, hy - RIG.HR, RIG.HR, hy, [[0, tone(OR, 1)], [1, tone(OR, 0.6)]])); g.beginPath(); g.arc(0, hy - 2, RIG.HR + 5, Math.PI, 0); g.fill(); RR(g, -RIG.HR - 12, hy - 6, 2 * RIG.HR + 24, 9, 4); g.fill(); } // the builder's helmet rides on the head bone
      if (o.bolt) { g.fillStyle = F(GOLD, tone(GD, 1)); poly(g, [[-4, -RIG.NECK - 2 * RIG.HR - 34], [12, -RIG.NECK - 2 * RIG.HR - 34], [2, -RIG.NECK - 2 * RIG.HR - 18], [12, -RIG.NECK - 2 * RIG.HR - 18], [-8, -RIG.NECK - 2 * RIG.HR + 6], [-2, -RIG.NECK - 2 * RIG.HR - 12], [-12, -RIG.NECK - 2 * RIG.HR - 12]]); g.fill(); }
      return;
    }
    if (name[0] === 'u') return capsule(19, RIG.LU, name === 'uaL' ? 0.85 : 0.6);
    if (name[0] === 'f') { capsule(17, RIG.LF, name === 'faL' ? 0.85 : 0.62); sphere(g, 0, RIG.LF + 4, 11, WT, v * 0.95, ti); return; }
    if (name.startsWith('th')) return capsule(27, RIG.LTH, name === 'thL' ? 0.85 : 0.62);
    if (name.startsWith('sh')) { capsule(24, RIG.LSH, name === 'shL' ? 0.85 : 0.62); g.fillStyle = F(ti, tone(WT, v * 0.7)); g.beginPath(); g.ellipse(name === 'shL' ? -6 : 6, RIG.LSH + 10, 18, 9, 0, 0, 7); g.fill(); }
  };
}
// rig points for one figure (scale s); every point keeps its bone and its rest coordinates
function rigPts(s, seed, ti = WHITE, v = 1, o = {}) {
  const out = [], rest = rigJoints(POSES.stand(0), 0, 0, s);
  BONES.forEach((bn, k) => art(boneArt(bn, v, ti, o), s, 0, 0, { seed: seed + k, nosort: true, ids: true, w: 400, h: 500, cell: o.cell || CELLPX }).forEach(p => {
    const [x, y] = boneXY(rest, bn, p.x, p.y); out.push({ ...p, bone: bn, lx: p.x, ly: p.y, rs: s, view: o.view || (o.back ? 'back' : 'front'), hx: x, hy: y, x, y });
  }));
  return out;
}
const dirA = a => [Math.sin(a), Math.cos(a)];
function rigJoints(P, X, Y, s) { // pose → joint positions and bone angles (world)
  const tr = P.tr || 0, up = [Math.sin(tr), -Math.cos(tr)], pr = [Math.cos(tr), Math.sin(tr)], S = s;
  const H = [X + (P.dx || 0) * S, Y + (P.dy || 0) * S], N = [H[0] + up[0] * RIG.LT * S, H[1] + up[1] * RIG.LT * S];
  const sw = P.sw ?? 1, sh = k => [N[0] + k * pr[0] * RIG.SW * sw * S - up[0] * 14 * S, N[1] + k * pr[1] * RIG.SW * sw * S - up[1] * 14 * S];
  const hp = k => [H[0] + k * pr[0] * RIG.HW * sw * S, H[1] + k * pr[1] * RIG.HW * sw * S];
  const J = { torso: [H, -tr, 1], head: [N, -(tr + (P.hd || 0)), 1] };
  for (const [side, k] of [['L', -1], ['R', 1]]) {
    const kU = P['kua' + side] ?? 1, kF = P['kfa' + side] ?? 1, kT = P['kth' + side] ?? 1, kS = P['ksh' + side] ?? 1;
    const ua = tr + P['ua' + side], fa = tr + P['fa' + side], S0 = sh(k), [ux, uy] = dirA(ua), E0 = [S0[0] + ux * RIG.LU * kU * S, S0[1] + uy * RIG.LU * kU * S];
    J['ua' + side] = [S0, ua, kU]; J['fa' + side] = [E0, fa, kF];
    const th = tr * 0.25 + P['th' + side], sk = tr * 0.25 + P['sh' + side], H0 = hp(k), [tx, ty] = dirA(th), K0 = [H0[0] + tx * RIG.LTH * kT * S, H0[1] + ty * RIG.LTH * kT * S];
    J['th' + side] = [H0, th, kT]; J['sh' + side] = [K0, sk, kS];
  }
  return J;
}
function boneXY(J, bone, lx, ly) { const [[jx, jy], a, kl = 1] = J[bone], c = Math.cos(a), sn = Math.sin(a), l2 = ly * kl; return [jx + lx * c + l2 * sn, jy - lx * sn + l2 * c]; }
// the hand's world position (for carrying keys, lifting crates…)
const handXY = (J, side, s) => { const [[jx, jy], a, kl = 1] = J['fa' + side]; return [jx + Math.sin(a) * (RIG.LF + 4) * kl * s, jy + Math.cos(a) * (RIG.LF + 4) * kl * s]; };
// poses (functions of a phase or time); all angles relative to the torso
const POSES = {
  stand: t => ({ tr: 0.015 * Math.sin(t * 1.3), uaL: -0.1 - 0.03 * Math.sin(t * 1.3), faL: -0.04, uaR: 0.1 + 0.03 * Math.sin(t * 1.3), faR: 0.04, thL: -0.06, shL: -0.06, thR: 0.06, shR: 0.06, hd: 0.04 * Math.sin(t * 0.9) }),
  scratch: t => ({ tr: 0.02, uaL: -0.12, faL: -0.05, uaR: 2.55, faR: -2.25 + 0.28 * Math.sin(t * 15), thL: -0.07, shL: -0.07, thR: 0.07, shR: 0.07, hd: -0.12 + 0.05 * Math.sin(t * 2) }),
  windy: t => { const w = Math.sin(t * 2.3) * 0.12 + Math.sin(t * 5.1) * 0.05; // hand on the face, the other arm out for balance, leaning into the wind
    return { tr: -0.16 + w, uaL: -1.55 + w * 2, faL: -1.15 + w * 3, uaR: 1.45, faR: -2.45, thL: -0.32, shL: -0.2, thR: 0.3, shR: 0.38, hd: 0.18 }; },
  walk: ph => { const sw = Math.sin(ph), c = Math.cos(ph), kneeL = Math.max(0, -c) ** 1.5, kneeR = Math.max(0, c) ** 1.5; // the knee bends while that leg swings forward
    return { tr: 0.05, dy: -5 * Math.abs(c) + 3, uaL: 0.45 * sw, faL: 0.45 * sw + 0.35, uaR: -0.45 * sw, faR: -0.45 * sw + 0.35,
      thL: -0.45 * sw, shL: -0.45 * sw - 0.95 * kneeL - 0.05, thR: 0.45 * sw, shR: 0.45 * sw - 0.95 * kneeR - 0.05, hd: 0 }; },
  crawl: ph => { const sw = Math.sin(ph); return { tr: 1.32, dy: 92, uaL: -1.25 + 0.3 * sw, faL: -1.3 + 0.3 * sw, uaR: -1.25 - 0.3 * sw, faR: -1.3 - 0.3 * sw,
    thL: 1.2 - 0.25 * sw, shL: -0.3, thR: 1.2 + 0.25 * sw, shR: -0.3, hd: -0.9 }; },
  reach: p => ({ tr: 1.0 - 0.6 * p, dy: 70 - 50 * p, uaL: -0.6, faL: -0.5, uaR: 0.3 - 2.0 * p, faR: 0.2 - 2.2 * p, thL: 1.05 - 0.6 * p, shL: -0.5, thR: 0.8 - 0.5 * p, shR: -0.4, hd: -0.5 + 0.4 * p }),
  lift: p => ({ tr: 0.15 - 0.15 * p, dy: 30 - 30 * p, uaL: 2.6 + 0.3 * p, faL: 2.8 + 0.25 * p, uaR: 2.7 + 0.25 * p, faR: 2.9 + 0.2 * p, thL: -0.25, shL: 0.1 - 0.2 * p, thR: 0.25, shR: -0.1 + 0.2 * p, hd: -0.25 }),
  raise: t => ({ tr: 0, uaL: -0.15, faL: -0.05, uaR: 2.95, faR: 3.08, thL: -0.08, shL: -0.08, thR: 0.08, shR: 0.08, hd: -0.1 + 0.03 * Math.sin(t * 2) }),
  push: t => ({ tr: 0.22, uaL: 1.25, faL: 1.45, uaR: 1.2, faR: 1.4, thL: -0.25, shL: -0.25, thR: 0.25, shR: 0.4, hd: -0.05 }),
  pull: p => ({ tr: -0.12 * p, uaL: -0.12, faL: -0.05, uaR: 1.45 - 0.6 * p, faR: 1.5 - 0.2 * p, thL: -0.1, shL: -0.1, thR: 0.1 + 0.1 * p, shR: 0.1, hd: 0.05 }),
  step: p => POSES.walk(Math.PI / 2 * clamp(p)),
  walkFB: ph => { const sn = Math.sin(ph), sL = Math.max(0, sn), sR = Math.max(0, -sn), lift = x => Math.sin(Math.PI * x);
    return { tr: 0.02 * sn, dx: 5 * sn, dy: -7 * Math.abs(sn),
      thL: -0.05 + 0.05 * sL, shL: -0.05 - 0.02 * sL, kthL: 1 - 0.07 * lift(sL), kshL: 1 - 0.34 * lift(sL),
      thR: 0.05 - 0.05 * sR, shR: 0.05 + 0.02 * sR, kthR: 1 - 0.07 * lift(sR), kshR: 1 - 0.34 * lift(sR),
      uaL: -0.12, faL: -0.06, kuaL: 1 - 0.1 * sR, kfaL: 1 - 0.3 * sR, uaR: 0.12, faR: 0.06, kuaR: 1 - 0.1 * sL, kfaR: 1 - 0.3 * sL, hd: 0 }; },
  crouch: p => ({ tr: 0.1, dy: 80 * p, uaL: -0.5 - 1.6 * p, faL: -0.4 - 2.2 * p, uaR: 0.5 + 1.6 * p, faR: 0.4 + 2.2 * p, thL: -0.5 * p - 0.06, shL: 0.6 * p, thR: 0.5 * p + 0.06, shR: -0.6 * p, hd: 0.2 * p }),
};
// ───────────────────────── walking with planted feet (the gait follows the distance covered, so a foot on the ground never slides)
// A stride is a cycle of the left leg: 0 heel strike … 0.6 toe off (stance; that foot stays put while the hip passes over it) …
// 1 next strike (swing: the foot lifts, the knee bends, it reaches forward). The right leg runs half a cycle behind.
const GAIT = { D: 70, DFB: 24, L: RIG.LTH + RIG.LSH, STAND: (RIG.LTH + RIG.LSH) * Math.cos(0.06) };
const minJerk = w => w * w * w * (10 - 15 * w + 6 * w * w);
function legIK(fx, fy) { // the ankle at (fx forward, fy down) from the hip → the thigh and shin angles (the knee bends forward)
  const L1 = RIG.LTH, L2 = RIG.LSH, d = Math.max(20, Math.min(Math.hypot(fx, fy), (L1 + L2) * 0.999)), base = Math.atan2(fx, fy);
  const th = base + Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1)), kx = L1 * Math.sin(th), ky = L1 * Math.cos(th);
  return [th, Math.atan2(fx - kx, fy - ky)];
}
const gaitLeg = (u, D) => u < 0.6 ? { st: 1, f: 0.6 * D - 2 * D * u, w: 0 } : { st: 0, f: -0.6 * D + 1.2 * D * minJerk((u - 0.6) / 0.4), w: (u - 0.6) / 0.4 };
Object.assign(POSES, {
  gait: (ph, D = GAIT.D) => { // in profile: the stance leg stays straight (the hip vaults over it), the swing leg is solved for its foot
    const uL = ((ph / (2 * Math.PI)) % 1 + 1) % 1, uR = (uL + 0.5) % 1, lL = gaitLeg(uL, D), lR = gaitLeg(uR, D), tr = 0.06, R = GAIT.L * 0.995;
    const h = Math.min(...[lL, lR].filter(l => l.st).map(l => Math.sqrt(R * R - l.f * l.f)));
    const leg = l => legIK(l.f, l.st ? h : h - 24 * Math.sin(Math.PI * Math.pow(l.w, 0.75)));
    const [thL, shL] = leg(lL), [thR, shR] = leg(lR), nL = lL.f / (0.6 * D), nR = lR.f / (0.6 * D);
    return { tr, dy: GAIT.STAND - h, thL: thL - tr * 0.25, shL: shL - tr * 0.25, thR: thR - tr * 0.25, shR: shR - tr * 0.25,
      uaL: 0.38 * nR, faL: 0.38 * nR + 0.22 + 0.2 * Math.max(0, nR), uaR: 0.38 * nL, faR: 0.38 * nL + 0.22 + 0.2 * Math.max(0, nL), hd: -0.04 };
  },
  gaitFB: (ph, dir = 1, D = GAIT.DFB, hx = 0, hy = -dir) => { // (hx, hy): the direction he moves on the screen // from behind (dir 1, walking away: the leading foot is higher up the screen) or in front (dir −1)
    const uL = ((ph / (2 * Math.PI)) % 1 + 1) % 1, uR = (uL + 0.5) % 1, sway = -5 * Math.cos(2 * Math.PI * (uL - 0.3)), dy = -3 * Math.cos(4 * Math.PI * (uL - 0.3));
    const leg = (u, side) => { const l = gaitLeg(u, D), off = hy * l.f - (l.st ? 0 : 16 * Math.sin(Math.PI * l.w)), len = GAIT.STAND + off - dy, offX = hx * l.f; // the ankle, measured down the screen from the hip
      const kT = l.st ? len / GAIT.STAND : 1 - 0.05 * Math.sin(Math.PI * l.w), kS = (len - RIG.LTH * kT) / RIG.LSH;
      const lean = (side === 'L' ? -0.05 : 0.05) + Math.asin(clamp((offX - sway) / len, -1, 1)) - sway / 1200; // the leg leans against the sway so its foot stays put
      return { ['th' + side]: lean, ['sh' + side]: lean, ['kth' + side]: kT, ['ksh' + side]: kS, n: l.f / (0.6 * D) }; };
    const L = leg(uL, 'L'), Rg = leg(uR, 'R'), aL = Rg.n, aR = L.n; // each arm swings with the opposite leg; the one forward foreshortens
    return { ...L, ...Rg, n: undefined, tr: sway / 300, dx: sway, dy, uaL: -0.12, faL: -0.08, kuaL: 1 - 0.07 * Math.abs(aL), kfaL: 1 - 0.26 * Math.max(0, aL) - 0.06 * Math.max(0, -aL),
      uaR: 0.12, faR: 0.08, kuaR: 1 - 0.07 * Math.abs(aR), kfaR: 1 - 0.26 * Math.max(0, aR) - 0.06 * Math.max(0, -aR), hd: 0 };
  },
});
// a walk along a path: pos(t) → [x, y, s] (screen position and figure scale); the phase is the distance covered in body units
function gaitDist(pos, t0, t) { if (t <= t0) return 0; let d = 0, [x0, y0] = pos(t0); const n = Math.max(1, Math.ceil((t - t0) * 60));
  for (let k = 1; k <= n; k++) { const [x, y, s] = pos(t0 + (t - t0) * k / n); d += Math.hypot(x - x0, y - y0) / s; x0 = x; y0 = y; } return d; }
// o.D: the step (body units; longer when the figure moves faster for its size); o.cad: a fixed cadence (cycles/s) instead, for the
// perspective roads, where the step is then worked out from the speed (capped at o.Dmax, so the legs keep their proportions)
function walkAt(pos, t0, t, view = 'side', dir = 1, o = {}) {
  const [xa, ya, sa] = pos(t - 0.03), [xb, yb] = pos(t + 0.03), v = Math.hypot(xb - xa, yb - ya) / sa / 0.06, side = view === 'side';
  let ph, D;
  if (o.cad) { ph = 2 * Math.PI * o.cad * Math.max(0, t - t0); D = clamp(v / (2 * o.cad), 10, o.Dmax || 60); }
  else { D = o.D || (side ? GAIT.D : GAIT.DFB); ph = Math.PI * gaitDist(pos, t0, t) / D; }
  ph += 0.6 * Math.PI + (o.ph0 || 0); // a walk starts at mid-stance: the feet side by side, as when standing
  const hv = Math.hypot(xb - xa, yb - ya), P = side ? POSES.gait(ph, D) : POSES.gaitFB(ph, dir, D, hv > 1e-3 ? (xb - xa) / hv : 0, hv > 1e-3 ? (yb - ya) / hv : -dir), w = clamp(v / (side ? 0.8 * D : 0.9 * D));
  return w >= 1 ? P : mixPose(POSES.stand(t), P, E.inOut(w));
}
const mixPose = (A, B, u) => { const o = {}; for (const k of new Set([...Object.keys(A), ...Object.keys(B)])) { const d = k[0] === 'k' ? 1 : 0; o[k] = lerp(A[k] ?? d, B[k] ?? d, u); } return o; }; // length factors (k…) default to 1
// apply a pose to the point (the joints are computed once per figure and frame)
const RIG_CACHE = new Map();
function rigApply(t, i, p, b, key, poseFn, X, Y, s, face = 1) {
  const vk = key + '|' + p.view;
  let c = RIG_CACHE.get(vk); if (!c || c.t !== t) { const P = poseFn(t); c = { t, J: rigJoints(p.view === 'side' ? { ...P, sw: 0.16 } : P, X, Y, s) }; RIG_CACHE.set(vk, c); }
  const k = s / (p.rs || s), [x, y] = boneXY(c.J, p.bone, p.lx * k, p.ly * k); b.x[i] = face < 0 ? 2 * X - x : x; b.y[i] = y; b.s[i] = p.s * Math.min(1.4, Math.max(0.6, k));
}

// a figure in a shape: its points carry `fig` (an id); pose(t) and where its hip stands come from FIGS[id]
const FIGS = {};
const FIG_ST = new Map();
function figLife(t, i, p, b) { const F2 = FIGS[p.fig]; if (!F2) return; let c = FIG_ST.get(p.fig); if (!c || c.t !== t) { c = { t, st: F2(t) }; FIG_ST.set(p.fig, c); } const st = c.st; rigApply(t, i, p, b, p.fig, () => st.pose, st.x, st.y, st.s, st.face || 1);
  if (p.view !== (st.view || 'front') && !(st.views && st.views.includes(p.view))) { b.a[i] = 0.02; return; }
  if (st.sx !== undefined) b.x[i] = st.x + (b.x[i] - st.x) * st.sx;           // turning round: squash across the body
  if (st.k !== undefined) { b.x[i] = st.x + (b.x[i] - st.x) * st.k; b.y[i] = st.y + (b.y[i] - st.y) * st.k; } // a figure that grows (comes closer)
  if (st.a !== undefined) b.a[i] *= st.a; }
const figPts = (id, s, seed, ti = WHITE, v = 1, o = {}) => rigPts(s, seed, ti, v, o).map(p => ({ ...p, fig: id }));
const FOOT = s => (RIG.LTH + RIG.LSH + 18) * s;                                 // hip → sole

// ───────────────────────── the mannequin in place of the old busts and silhouettes (Parte 3 look)
// manT(s): a mannequin in a bust's frame (scale s of bustArt: the sole on the bust's base line). Every point keeps its bone;
// makeShape poses it every frame (rigPoint) before the scene's own motion, so the scene code that moved busts still works.
let MAN_ID = 0;
const MAN_K = 1.1;
function manT(s, seed, o = {}) {
  const k = s * (o.k || MAN_K), hipY = (o.base ?? 165 * s) - FOOT(k), id = MAN_ID++;
  return rigPts(k, seed, WHITE, o.v ?? 1, { cell: o.cell, view: o.view, helmet: o.helmet }).map(p => ({ ...p, x: p.x + (o.x || 0), y: p.y + hipY + (o.y || 0), hx: p.hx + (o.x || 0), hy: p.hy + hipY + (o.y || 0),
    rgT: id, rgK: k, rgY: hipY + (o.y || 0), rgX: o.x || 0, tx0: p.x + (o.x || 0), ty0: p.y + hipY + (o.y || 0), rgPose: o.pose, rgPh: o.ph }));
}
const manAt = (x, y, s, seed, o = {}) => hsort(manT(s, seed, { ...o, x, y }));
const manFull = (seed, o = {}) => manT(1, seed, { k: 0.91, base: 151, ...o }); // in personFull's frame (sole at y 151)
// idle poses: always alive (rule 2), never the hands held in front of the body
const MAN_POSES = {
  stand: t => POSES.stand(t),
  talk: t => ({ ...POSES.stand(t), uaR: 0.42 + 0.12 * Math.sin(t * 2.3), faR: 1.75 + 0.45 * Math.sin(t * 3.4), hd: 0.08 * Math.sin(t * 1.7) }),
  hips: t => ({ ...POSES.stand(t), tr: 0.03 * Math.sin(t * 1.1), uaL: -0.62, faL: 0.55, uaR: 0.62, faR: -0.55, hd: 0.1 * Math.sin(t * 0.8) }),
  look: t => ({ ...POSES.stand(t), uaR: 0.3, faR: 2.2 + 0.1 * Math.sin(t * 2), hd: 0.18 * Math.sin(t * 0.7) }),          // a hand shading the eyes
  cheer: t => ({ ...POSES.stand(t), uaL: -2.5 - 0.15 * Math.sin(t * 5), faL: -2.8, uaR: 2.5 + 0.15 * Math.sin(t * 5 + 1), faR: 2.8, dy: -6 * Math.abs(Math.sin(t * 5)) }),
  reach: t => ({ ...POSES.stand(t), tr: 0.08, uaL: -0.35, faL: -0.1, uaR: 1.9 + 0.35 * Math.sin(t * 6), faR: 2.1 + 0.35 * Math.sin(t * 6), hd: -0.1 }),     // grabbing at something
  scratch: t => POSES.scratch(t),
  raise: t => POSES.raise(t),
  push: t => POSES.push(t),
  run: t => ({ ...POSES.gait(2 * Math.PI * 1.9 * t, 80), tr: 0.22 }),
  walk: t => POSES.gaitFB(2 * Math.PI * 1.0 * t, 1, GAIT.DFB, 0, 0),                                                       // marching on the spot, seen from the front
};
const IDLE = ['stand', 'talk', 'hips', 'stand', 'talk', 'look'];
const MAN_CACHE = new Map();
function rigPoint(t, i, p, b) {
  if (p.rgKey === undefined) {
    p.rgKey = p.rgT + ':' + [p.bk, p.tm, p.g7, p.pk, p.rn, p.pp, p.who, p.dk].join(',');
    let h = 7; for (let c = 0; c < p.rgKey.length; c++) h = Math.imul(h ^ p.rgKey.charCodeAt(c), 16777619); p.rgH = h >>> 0;
    p.x0 = p.x; p.y0 = p.y; if (p.rx !== undefined) { p.rx0 = p.rx; p.ry0 = p.ry; }
  }
  let c = MAN_CACHE.get(p.rgKey);
  if (!c || c.t !== t) {
    const name = p.rgPose || IDLE[hash(p.rgH, 3) * IDLE.length | 0], tt = t + (p.rgPh ?? hash(p.rgH, 4) * 9);
    const P = typeof p.rgPose === 'function' ? p.rgPose(t) : MAN_POSES[name](tt); c = { t, J: rigJoints(p.view === 'side' ? { ...P, sw: 0.16 } : P, p.rgX, p.rgY, p.rgK) }; MAN_CACHE.set(p.rgKey, c);
  }
  const [x, y] = boneXY(c.J, p.bone, p.lx, p.ly), sc = p.rsc ?? 1, dx = x - p.tx0, dy = y - p.ty0;
  p.x = p.x0 + dx * sc; p.y = p.y0 + dy * sc;
  if (p.rx0 !== undefined) { p.rx = p.rx0 + dx * sc; p.ry = p.ry0 + dy * sc; }
  b.x[i] = p.x; b.y[i] = p.y;
}


// ── as três camadas: uma linha que se abre em três planos; o do meio é um circuito
const SLAB = { w: 300, h: 150, th: 18 }, SLAB_Y = [-330, 0, 330];
function slabArt(kind) { // drawn centred at y = 0
  return g => {
    const { w, h, th } = SLAB, T = [[0, -h], [w, 0], [0, h], [-w, 0]], P = (a, b) => [-w + a * w + b * w, -a * h + b * h];
    const base = kind === 1 ? PU : WT;
    g.fillStyle = tone(base, 0.5); poly(g, [[-w, 0], [0, h], [0, h + th], [-w, th]]); g.fill();
    g.fillStyle = tone(base, 0.3); poly(g, [[0, h], [w, 0], [w, th], [0, h + th]]); g.fill();
    g.fillStyle = kind === 1 ? LG(g, -w, 0, w, 0, [[0, tone(PU, 0.34)], [0.5, tone(PU, 0.5)], [1, tone(PU, 0.3)]]) : LG(g, -w, 0, w, 0, [[0, tone(WT, 0.66)], [0.5, tone(WT, 0.95)], [1, tone(WT, 0.72)]]);
    poly(g, T); g.fill();
    if (kind === 1) {
      const line = pts => { g.beginPath(); pts.forEach(([a, b], k) => { const [x, y] = P(a, b); k ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); };
      const r = rng(77); g.strokeStyle = tone(PU, 1); g.lineWidth = 4;
      for (let k = 0; k < 22; k++) {
        const side = k % 4, f = 0.08 + 0.84 * r(), bend = 0.15 + 0.2 * r();
        const start = [[f, 0.04], [0.96, f], [f, 0.96], [0.04, f]][side], mid = [[f, bend], [1 - bend, f], [f, 1 - bend], [bend, f]][side];
        const end = side % 2 ? [mid[0] + (0.5 - mid[0]) * 0.7, 0.42 + 0.16 * r()] : [0.42 + 0.16 * r(), mid[1] + (0.5 - mid[1]) * 0.7];
        line([start, mid, side % 2 ? [end[0], mid[1]] : [mid[0], end[1]], end]);
        const [vx, vy] = P(...start); g.fillStyle = tone(WT, 0.9); g.beginPath(); g.arc(vx, vy, 5, 0, 7); g.fill();
      }
      const chip = [[0.4, 0.4], [0.6, 0.4], [0.6, 0.6], [0.4, 0.6]].map(([a, b]) => P(a, b));
      g.fillStyle = tone(WT, 0.95); poly(g, chip); g.fill();
      g.fillStyle = tone(PU, 0.5); poly(g, [[0.45, 0.45], [0.55, 0.45], [0.55, 0.55], [0.45, 0.55]].map(([a, b]) => P(a, b))); g.fill();
      g.fillStyle = tone(WT, 0.85); for (let k = 0; k < 5; k++) { const f = 0.42 + k * 0.04; [[f, 0.37], [f, 0.63], [0.37, f], [0.63, f]].forEach(([a, b]) => { const [x, y] = P(a, b); g.fillRect(x - 3, y - 3, 6, 6); }); }
    } else {
      g.strokeStyle = tone(WT, 0.45); g.lineWidth = 2; for (let k = 1; k < 8; k++) { const f = k / 8; g.beginPath(); g.moveTo(...P(f, 0)); g.lineTo(...P(f, 1)); g.stroke(); g.beginPath(); g.moveTo(...P(0, f)); g.lineTo(...P(1, f)); g.stroke(); }
    }
    g.strokeStyle = tone(kind === 1 ? PU : WT, 1); g.lineWidth = 4; poly(g, T); g.stroke();
  };
}
// a $ with real volume: an extruded gold glyph, lit from the top left
const dollar3D = px => g => {
  g.font = HEAVY(px); g.textAlign = 'center'; g.textBaseline = 'middle';
  for (let k = 14; k >= 1; k--) { g.fillStyle = tone(GD, 0.22 + 0.025 * (14 - k)); g.fillText('$', k * 1.5, k * 1.1); }
  g.fillStyle = LG(g, -px * 0.3, -px * 0.45, px * 0.3, px * 0.45, [[0, tone(GD, 1)], [0.45, tone(GD, 0.8)], [1, tone(GD, 0.45)]]); g.fillText('$', 0, 0);
  if (!CLEAN) { g.globalCompositeOperation = 'source-atop'; g.fillStyle = tone(WT, 0.9); poly(g, [[-px, -px * 0.1], [px, -px * 0.5], [px, -px * 0.42], [-px, -px * 0.02]]); g.fill(); g.globalCompositeOperation = 'source-over'; }
};
const ORB = (R, a, yc = 70, sc = 1) => { const sa = Math.sin(a); return [R * 430 * Math.cos(a) * sc, yc + R * 175 * sa * sc, (0.62 + 0.24 * sa) * sc]; };
const BRAWL3 = []; [[12, 0.55], [18, 0.8], [24, 1.05]].forEach(([n, R], ri) => { for (let j = 0; j < n; j++) BRAWL3.push([R, (j / n) * 2 * Math.PI + ri * 0.4]); });
const BRZ = 2.7, BRCZ = -0.6;

function buildShapesHook() {
  SH.void = makeShape([]);
  BUST_T = manT(0.17, 610, { cell: 4 });
  PERS_T = manT(0.5, 616, { cell: 6 });
  ICON_T = ICONS.map((d, k) => dotArt(d, 0.62, 0, -150, { seed: 617 + k, nosort: true, ids: false }).map(p => ({ ...p, t: [WHITE, ORANGE, BLUE][k], a: Math.min(1, p.a + 0.2) })));
  FULL_T = manFull(620);

  // "Se não caiu nada," — two hands open a wallet like a book: nothing inside. On "nada" it is shaken; only dust
  {
    const inL = tagged(dotArt(walInL, 1, 0, 0, { seed: 601 }), { wl: 1 }), inR = tagged(dotArt(walInR, 1, 0, 0, { seed: 602 }), { wr: 1 }), out = tagged(dotArt(walOut, 1, 0, 0, { seed: 603 }), { wo: 1 });
    const hL = tagged(dotArt(g => handGrip(g, 1), 0.78, 0, 0, { seed: 604, h: 1500 }), { hnd: 0 }), hR = tagged(dotArt(g => handGrip(g, -1), 0.78, 0, 0, { seed: 605, h: 1500 }), { hnd: 1 });
    const specks = [...Array(140)].map((_, k) => ({ sk: k, x: (hash(k, 1) - 0.5) * 300, y: WAL.y + WAL.h / 2, a: 0.8, c: CI['•'], t: WHITE, s: 0.18 + 0.2 * hash(k, 3) }));
    SH.wallet = makeShape([inL, inR, out, hL, hR, specks], (t, i, p, b) => {
      const G = walGeom(t), sy = 1 + 0.12 * Math.sin(G.th);
      if (p.sk !== undefined) { const u = t - 4.8 - 0.3 * hash(p.sk, 4); if (u < 0) { b.a[i] = 0.02; return; } b.y[i] = p.y + 380 * u * u + 30 * u; b.x[i] = p.x + G.shift - WAL.w / 2 + 30 * Math.sin(p.sk + u * 3) * u; b.a[i] = Math.max(0.02, 0.8 * (1 - clamp(u / 1.2))); return; }
      if (p.hnd !== undefined) {
        const gx = p.hnd === 0 ? -WAL.w + G.shift - 4 : WAL.w * G.c + G.shift, gy = WAL.y + (p.hnd === 0 ? 60 : -40) + G.lift;
        const [ax, ay] = HAND_ANCH[p.hnd], th = Math.atan2(-(ax - gx), ay - gy), dx = p.x, dy = p.y;
        b.x[i] = gx + dx * Math.cos(th) - dy * Math.sin(th); b.y[i] = gy + dx * Math.sin(th) + dy * Math.cos(th); return;
      }
      if (p.wl) { if (G.c < 0 && p.x > -WAL.w * -G.c) { b.a[i] = 0.02; return; } b.x[i] = p.x + G.shift; b.y[i] = p.y + G.lift; if (hash(i, 5) < 0.3 * ramp(t, 4.7, 0.5)) b.t[i] = RED; return; }
      const ext = !!p.wo; if ((G.c < 0) !== ext) { b.a[i] = 0.02; return; }
      b.x[i] = p.x * G.c + G.shift; b.y[i] = WAL.y + (p.y - WAL.y) * (1 + 0.12 * Math.sin(G.th) * (p.x / WAL.w)) + G.lift;
      b.a[i] = p.a * (0.55 + 0.45 * Math.abs(G.c)); if (!ext && hash(i, 5) < 0.3 * ramp(t, 4.7, 0.5)) b.t[i] = RED;
    });
  }

  // "não é por falta de gente falando sobre isso." — the pocket sinks, grey; speech bubbles pop all around it
  {
    const pts = [];
    BUB.forEach(([x, y, w, h], k) => art(bubbleArt(x, y, w, h, x < 0 ? -1 : 1), 1, 0, 0, { seed: 620 + k, nosort: true, cell: 4 }).forEach(p => pts.push({ ...p, bb: k })));
    const pk = art(walletFlat, 0.42, 0, 430, { seed: 627, cell: 4 });
    SH.talk = makeShape([hsort(pk), hsort(pts)], (t, i, p, b) => {
      if (p.bb === undefined) { b.t[i] = GRAY; b.a[i] = p.a * 0.6; return; }
      const on = bubPop(t, p.bb), [cx, cy] = BUB[p.bb], s = 0.8 + 0.2 * clamp(on) + 0.05 * flash(t, BUB_AT[p.bb] + 0.15);
      b.a[i] = p.a * clamp(on, 0.02);
      b.x[i] = cx + (p.x - cx) * s; b.y[i] = cy + (p.y - cy) * s + bubBob(t, p.bb);
    });
  }

  // "Tudo o que aparece no seu feed sobre IA" — the bubbles pour into a phone; the feed scrolls, every post stamped IA
  {
    const pts = [];
    art(g => phoneArt(g), 1, 0, 0, { seed: 630, nosort: true }).forEach(p => pts.push(p));
    for (let k = 0; k < 4; k++) art(postIA(FEED2.top + 70 + k * 165), 1, 0, 0, { seed: 631 + k, nosort: true, cell: 4 }).forEach(p => pts.push({ ...p, post: 1 }));
    SH.feed = makeShape([hsort(pts)], (t, i, p, b) => {
      if (!p.post) return;
      const y = (((p.y - FEED2.top - feedOff2(t)) % FEED2.period) + FEED2.period) % FEED2.period + FEED2.top;
      b.y[i] = y; b.a[i] = p.a * clamp((318 - Math.abs(y)) / 40, 0.02);
    });
  }

  // "chega, no mesmo dia, pra milhões de pessoas." — the phone rises and broadcasts: blue waves light 112 people
  const busts = crowdBusts();
  {
    const phone = art(g => phoneArt(g, { screen: feedScreen }), PH_S, 0, PH_Y, { seed: 640, cell: 4 });
    const rings = [...Array(2400)].map((_, k) => { const ang = Math.PI * (0.06 + 0.88 * hash(k, 1)), rg = k % 4;
      return { rg, ang, x: SRC[0] + 40 * Math.cos(ang), y: SRC[1] + 32 * Math.sin(ang), a: 0.85, c: pick('-~=·', hash(k, 2)), t: BLUE, s: 0.45 + 0.3 * hash(k, 3) }; });
    SH.broadcast = makeShape([hsort(busts.map(p => ({ ...p }))), hsort(rings), phone], (t, i, p, b) => {
      if (p.rg !== undefined) {
        const u = t - T_WAVE; if (u < 0) { b.a[i] = 0.02; return; }
        const r = 40 + ((u * 560 + p.rg * 190) % 760);
        b.x[i] = SRC[0] + r * Math.cos(p.ang); b.y[i] = SRC[1] + r * Math.sin(p.ang) * 0.8;
        b.a[i] = Math.max(0.02, 0.85 * (1 - r / 800) * ramp(t, T_WAVE, 0.2) * (1 - 0.7 * ramp(t, 12.2, 0.5))); return;
      }
      if (p.bk === undefined) { b.a[i] = p.a + 0.3 * flash(t, T_WAVE, 0.15); return; }
      const d = Math.hypot(p.bx - SRC[0], (p.by - SRC[1]) / 0.8), hit = T_WAVE + d / 600, lit = ramp(t, hit, 0.25);
      b.t[i] = lit > 0.5 ? BLUE : GRAY; b.a[i] = p.a * (0.45 + 0.55 * lit) + 0.35 * flash(t, hit + 0.05, 0.1);
    });
  }


  // "Usar IA está virando coisa que todo mundo faz." — a crowd in real perspective; the camera walks in among them.
  // Above every head, the assistant they use. On "todo mundo faz" they all bob in the same step.
  SH.crowd = makeShape([hsort(crowd3Pts(CROWD3))], (t, i, p, b) => {
    const cam = crowdCam(t), march = 7 * ramp(t, 14.7, 0.2) * Math.abs(Math.sin((t - 14.7) * 5.2));
    const d = place3(b, i, p, cam, march + (p.ic !== undefined ? 6 * Math.sin(t * 2.4 + p.pk) : 0));
    const near = clamp((d - 0.35) / 0.45) * clamp((600 - b.y[i]) / 140), far = 0.35 + 0.65 * clamp(2.2 / d - 0.15);
    if (p.ic !== undefined) { const on = dropIn(t, 13.1 + 0.5 * hash(p.pk, 9), 0.3); b.a[i] = Math.max(0.02, p.a * near * far * clamp(on)); return; }
    b.a[i] = Math.max(0.02, p.a * near * far); b.t[i] = WHITE;
  });

  // "Enquanto essa multidão briga pelo mesmo dinheiro," — the same crowd in rings around a $ with volume; the camera orbits; red on "briga"
  {
    const ring = crowd3Pts(BRAWL3.map(([R, a]) => [R * Math.cos(a), BRZ + R * Math.sin(a) * 0.9]), false).map(p => ({ ...p, R: BRAWL3[p.pk][0], a0: BRAWL3[p.pk][1] }));
    const DLY0 = -110, dl = tagged(art(dollar3D(250), 1, 0, DLY0, { seed: 650, money: true, cell: 4 }), { dl: 1 });
    SH.brawl = makeShape([hsort(ring), dl], (t, i, p, b) => {
      if (p.dl) { const s = 1 + 0.06 * flash(t, 22.36, 0.15) + 0.015 * Math.sin(t * 7); b.x[i] = p.x * s; b.y[i] = DLY0 + (p.y - DLY0) * s; return; }
      const k2 = ramp(t, 21.4, 0.4) * (1 - ramp(t, 22.6, 0.3)), rot = 0.13 * (t - 20.1), sq = 1 - 0.07 * (0.5 + 0.5 * Math.sin(t * 8 + p.pk * 1.3)) * (0.3 + k2);
      const [px, py, m] = ORB(p.R * sq, p.a0 + rot);
      b.x[i] = px + p.rx * m + (1.5 + 4 * k2) * Math.sin(t * 41 + p.pk); b.y[i] = py + p.ry * m + (1 + 3 * k2) * Math.sin(t * 37 + p.pk * 2); b.s[i] = p.s * clamp(m * 1.1, 0.5, 2);
      b.a[i] = p.a * (0.35 + 0.65 * clamp((m - 0.38) / 0.48)); b.t[i] = hash(p.pk, 9) < 0.6 * ramp(t, 21.5, 0.6) ? RED : WHITE;
    });
  }

  // "um grupo pequeno, sem ser expert em tecnologia," — seven full figures step forward out of the ring; the crowd sinks back; </> struck out
  const g7 = []; for (let k = 0; k < 7; k++) FULL_T.forEach(p => g7.push({ ...p, rsc: 0.85, x: p.x * 0.85 + G7X(k), y: p.y * 0.85 + 140 + 10 * Math.abs(k - 3), s: p.s * 0.92, g7: k }));
  {
    const ring = crowd3Pts(BRAWL3.map(([R, a]) => [R * Math.cos(a), BRZ + 1.2 + R * Math.sin(a) * 0.9]), false).map(p => ({ ...p, R: BRAWL3[p.pk][0], a0: BRAWL3[p.pk][1] }));
    const code = tagged(art(textArt('</>', 150, WT), 1, 0, -420, { seed: 660, cell: 4 }), { code: 1 });
    const strike = tagged(art(g => { g.strokeStyle = tone(RD, 1); g.lineWidth = 16; g.beginPath(); g.moveTo(-190, -360); g.lineTo(190, -480); g.stroke(); }, 1, 0, 0, { seed: 661, cell: 4 }), { sk: 1 });
    SH.group = makeShape([hsort(g7.map(p => ({ ...p }))), hsort(ring), code, strike], (t, i, p, b) => {
      if (p.g7 !== undefined) { const st = ramp(t, 22.85 + p.g7 * 0.05, 0.6, E.cubicOut); b.y[i] = p.y + 40 * (1 - st) + 2 * Math.sin(t * 2.2 + p.g7); b.a[i] = p.a * (0.5 + 0.5 * st) + 0.3 * flash(t, 23.1 + p.g7 * 0.05, 0.12); return; }
      if (p.code) { const on = dropIn(t, 23.85, 0.3); b.a[i] = p.a * clamp(on, 0.02); if (hash(i, 7) < ramp(t, 24.3, 0.4)) { b.t[i] = GRAY; b.a[i] *= 0.65; } return; }
      if (p.sk) { b.a[i] = p.x < -190 + 380 * ramp(t, 24.28, 0.3, E.cubicOut) ? p.a : 0.02; return; }
      const rot = 0.13 * (t - 20.1), sink = ramp(t, 22.8, 1.2, E.inOut), [px, py, m] = ORB(p.R, p.a0 + rot, lerp(70, -90, sink), lerp(1, 0.62, sink));
      b.x[i] = px + p.rx * m; b.y[i] = py + p.ry * m; b.s[i] = p.s * clamp(m * 1.1, 0.4, 2); b.t[i] = GRAY; b.a[i] = p.a * lerp(0.6, 0.16, sink);
    });
  }

  // "está usando essa mesma IA pra construir uma coisa própria." — the seven below; the IA lights on top, a purple thread
  // comes down and the blocks drop one by one (orange); on "própria" they turn gold
  const structure = buildPts(14000, 71);
  {
    const G7B = scaled(g7, 0.7, 0, 270);
    const ia = tagged(art(textArt('IA', 210, PU), 1, 0, -480, { seed: 670, cell: 4 }), { ia: 1 });
    const st = structure.map(p => ({ ...p, y: p.y + 20 }));
    const thread = [...Array(700)].map((_, k) => ({ th: k, x: 0, y: -380, a: 0.02, c: pick('|:·•', hash(k, 2)), t: PURPLE, s: 0.4 + 0.3 * hash(k, 3) }));
    SH.build = makeShape([hsort(G7B), ia, hsort(st), thread], (t, i, p, b) => {
      if (p.g7 !== undefined) { b.y[i] = p.y + 2 * Math.sin(t * 2.2 + p.g7); b.a[i] = p.a * 0.9; return; }
      if (p.ia) { const on = ramp(t, 26.85, 0.35, E.backOut), s = 0.8 + 0.2 * clamp(on); b.a[i] = p.a * clamp(on, 0.02) + 0.3 * flash(t, 27.0, 0.15); b.x[i] = p.x * s; b.y[i] = -480 + (p.y + 480) * s; return; }
      if (p.th !== undefined) {
        if (t < 27.25 || t > 28.95) { b.a[i] = 0.02; return; }
        const u = (hash(p.th, 4) + (t - 27.25) * 1.5) % 1;
        b.x[i] = (hash(p.th, 5) - 0.5) * (30 + 180 * u); b.y[i] = -385 + 140 * u; b.a[i] = Math.max(0.02, 0.85 * Math.sin(Math.PI * u)); return;
      }
      const at = 27.55 + p.block * 0.13, q = dropIn(t, at);
      b.y[i] = p.y - 70 * (1 - q); b.a[i] = p.a * clamp((t - at) / 0.12, t < 26.75 ? 0.03 : 0);
      if (ramp(t, 28.7, 0.45) > hash(i, 11)) b.t[i] = money(hash(i, 12));
    });
  }

  // "Existe uma camada da IA que quase ninguém te mostra" — a purple line; it opens into three planes, slowly;
  // the middle one is a circuit with a chip. On "te mostra" it slides out with a gold structure on it
  {
    const sl = [0, 1, 2].map(k => tagged(dotArt(slabArt(k === 1 ? 1 : 0), 1, 0, 0, { seed: 680 + k, money: false }), { sl: k }));
    const stk = tagged(dotArt(stackArt(36), 1, 0, -50, { seed: 683 }), { cb: 0 });
    SH.layers = makeShape([hsort(sl[0]), hsort(sl[1]), hsort(sl[2]), stk], (t, i, p, b) => {
      const line = ramp(t, 29.05, 0.75, E.cubicOut), open = ramp(t, 29.95, 1.3, E.inOut), slide = 70 * ramp(t, 31.1, 0.8, E.inOut);
      if (p.cb !== undefined) { const on = dropIn(t, 31.35, 0.35); b.a[i] = p.a * clamp(on, 0.02); b.x[i] = p.x + slide; b.y[i] = p.y - 50 * (1 - clamp(on)); b.t[i] = money(hash(i, 3)); return; }
      const k = p.sl - 1, v = lerp(0.025, 1, open);
      b.x[i] = p.x * (0.3 + 0.7 * line) + (p.sl === 1 ? slide : 0); b.y[i] = k * 330 * open + p.y * v;
      if (p.sl === 1) { b.t[i] = PURPLE; b.a[i] = p.a * (0.5 + 0.5 * line) + 0.35 * flash(t, 30.15, 0.2) + 0.25 * flash(t, 31.95, 0.25); return; }
      b.a[i] = p.a * (0.25 + 0.75 * open) * (0.5 + 0.5 * line); if (open < 0.3) b.t[i] = PURPLE;
    });
  }

  // "e é ela que separa quem fica na multidão de quem vira dono." — a purple line divides: the crowd, in depth, on the left;
  // on the right one full figure on a structure of its own, which turns gold on "dono"
  {
    const div = [...Array(300)].map((_, k) => ({ dv: 1, x: -40 + (hash(k, 1) - 0.5) * 5, y: -480 + k * 3.3, a: 0.9, c: CI['|'], t: PURPLE, s: 0.6 }));
    const LEFT3 = []; for (let r = 0; r < 6; r++) for (let c = 0; c < 9; c++) LEFT3.push([c, r]);
    const left = crowd3Pts(LEFT3, false);
    const owner = FULL_T.map(p => ({ ...p, rsc: 1.15, x: p.x * 1.15 + 270, y: p.y * 1.15 + 115, s: p.s * 1.05, own: 1 }));
    const os = tagged(dotArt(stackArt(50), 1, 270, 360, { seed: 691 }), { oc: 0 });
    const aura = [...Array(1600)].map((_, k) => ({ au: k, x: 270, y: 60, a: 0.02, c: CI['•'], t: money(hash(k, 2)), s: 0.15 + 0.2 * hash(k, 3) }));
    SH.split = makeShape([div, hsort(left), owner, os, aura], (t, i, p, b) => {
      if (p.dv) { b.a[i] = p.y < -480 + 990 * ramp(t, 32.85, 0.45, E.cubicOut) ? p.a * (0.75 + 0.25 * Math.sin(t * 3 + p.y * 0.02)) : 0.02; return; }
      if (p.au !== undefined) { const on = ramp(t, 35.1 + 0.3 * hash(p.au, 4), 0.4); if (on <= 0) { b.a[i] = 0.02; return; } const a = hash(p.au, 5) * 6.283 + (t - 35.1) * (0.6 + 0.8 * hash(p.au, 6)), r = 120 + 260 * hash(p.au, 7) + 60 * (t - 35.1); b.x[i] = 270 + r * Math.cos(a); b.y[i] = 80 + r * Math.sin(a) * 1.25 - 40 * (t - 35.1); b.a[i] = Math.max(0.02, on * (0.4 + 0.5 * Math.sin(t * 6 + p.au))); return; }
      if (p.pk !== undefined) { const r = p.Z, c = p.X, m = 0.36 + 0.07 * r, px = -100 - (8 - c) * 52 * (0.7 + 0.12 * r) - (r % 2) * 22, py = -280 + r * 92; b.x[i] = px + p.rx * m; b.y[i] = py + p.ry * m - 3 * Math.abs(Math.sin(t * 5.2)); b.s[i] = p.s * m * 1.2; b.t[i] = GRAY; b.a[i] = p.a * (0.45 + 0.35 * flash(t, 34.0 + 0.05 * r, 0.25)) * (0.55 + 0.08 * r); return; }
      if (p.own) { const gd = ramp(t, 35.1, 0.5); b.a[i] = p.a * (0.6 + 0.4 * gd) + 0.3 * flash(t, 35.2, 0.15); if (gd > hash(i, 13)) b.t[i] = money(hash(i, 14)); return; }
      const on = dropIn(t, 35.0, 0.35); b.a[i] = p.a * clamp(on, 0.02); b.y[i] = p.y - 50 * (1 - clamp(on)) + 2 * Math.sin(t * 1.8); b.t[i] = money(hash(i, 3));
    });
  }
}

// ───────────────────────── timeline of shapes (longer, smoother passes: the v4 rhythm)
const KEYS = [
  { t: 0, s: 'void' },
  { t: 3.88, s: 'wallet', d: 0.75, st: 0.35, e: 'expoOut', sw: 60, dl: 'radial' },
  { t: 5.0, s: 'talk', d: 0.85, st: 0.35, e: 'inOut', sw: 110, dl: 'radial' },
  { t: 7.6, s: 'feed', d: 0.95, st: 0.35, e: 'inOut', sw: 110, dl: 'radial' },
  { t: 9.75, s: 'broadcast', d: 0.7, st: 0.3, e: 'expoOut', sw: 60, dl: 'radial' },
  { t: 12.55, s: 'crowd', d: 0.8, st: 0.3, e: 'inOut', sw: 60, dl: 'radial' },
  { t: 15.6, s: 'void', d: 0.45, st: 0.25, e: 'quadIn', sw: 0, dl: 'random' },
  { t: 20.1, s: 'brawl', d: 0.8, st: 0.35, e: 'expoOut', sw: 100, dl: 'radial' },
  { t: 22.75, s: 'group', d: 0.95, st: 0.35, e: 'inOut', sw: 70, dl: 'radial' },
  { t: 25.6, s: 'build', d: 0.9, st: 0.3, e: 'inOut', sw: 80, dl: 'radial' },
  { t: 28.95, s: 'layers', d: 0.75, st: 0.3, e: 'inOut', sw: 60, dl: 'radial' },
  { t: 32.2, s: 'split', d: 1.0, st: 0.35, e: 'inOut', sw: 70, dl: 'radial' },
];

// ── the hype: four promises, each an object
function ticketArt(g) {
  g.fillStyle = LG(g, -150, -80, 150, 80, [[0, tone(WT, 1)], [0.55, tone(WT, 0.72)], [1, tone(WT, 0.42)]]);
  RR(g, -150, -80, 300, 160, 18); g.fill();
  g.fillStyle = VOID;
  [-150, 150].forEach(x => { g.beginPath(); g.arc(x, 0, 28, 0, 7); g.fill(); });
  for (let y = -64; y <= 64; y += 18) { g.beginPath(); g.arc(78, y, 5, 0, 7); g.fill(); }
  g.fillStyle = tone(WT, 0.2); RR(g, -108, -44, 150, 22, 8); g.fill(); RR(g, -108, -6, 110, 14, 7); g.fill(); RR(g, -108, 24, 132, 14, 7); g.fill();
}
function boxArt(g) {
  const P = (u, v, z) => [(u - v) * 0.9, (u + v) * 0.45 - z + 80], q = pts => poly(g, pts.map(p => P(...p))), s = 110, h = 150;
  g.fillStyle = tone(WT, 0.95); q([[-s, -s, h], [s, -s, h], [s, s, h], [-s, s, h]]); g.fill();
  g.fillStyle = tone(WT, 0.6); q([[-s, s, 0], [s, s, 0], [s, s, h], [-s, s, h]]); g.fill();
  g.fillStyle = tone(WT, 0.36); q([[s, -s, 0], [s, s, 0], [s, s, h], [s, -s, h]]); g.fill();
  g.fillStyle = tone(WT, 0.5); q([[-20, -s, h], [20, -s, h], [20, s, h], [-20, s, h]]); g.fill();            // tape
  g.fillStyle = tone(WT, 0.32); q([[-20, s, h], [20, s, h], [20, s, h - 60], [-20, s, h - 60]]); g.fill();
  g.strokeStyle = tone(WT, 0.7); g.lineWidth = 10;                                                         // speed lines
  [[-60, 0], [-20, 30], [20, 60]].forEach(([y, l]) => { g.beginPath(); g.moveTo(-290 + l, y); g.lineTo(-225 + l, y); g.stroke(); });
}
function quizArt(g) {
  g.fillStyle = tone(WT, 0.14); RR(g, -150, -165, 300, 330, 26); g.fill();
  g.strokeStyle = tone(WT, 0.92); g.lineWidth = 7; RR(g, -150, -165, 300, 330, 26); g.stroke();
  [-90, -10, 70].forEach((y, k) => {
    g.strokeStyle = tone(WT, 0.95); g.lineWidth = 7; RR(g, -112, y - 20, 42, 42, 9); g.stroke();
    g.fillStyle = tone(WT, 0.72 - 0.12 * k); RR(g, -50, y - 8, [150, 110, 130][k], 16, 8); g.fill();
  });
  g.strokeStyle = tone(WT, 1); g.lineWidth = 10; g.beginPath(); g.moveTo(-104, -90); g.lineTo(-92, -76); g.lineTo(-70, -110); g.stroke();
  g.fillStyle = tone(WT, 0.55); RR(g, -112, 118, 224, 26, 13); g.fill();
}
function linkArt(g) {
  const ring = (x, v0, v1) => { g.strokeStyle = LG(g, x, -60, x + 210, 60, [[0, tone(WT, v0)], [1, tone(WT, v1)]]); RR(g, x, -52, 210, 104, 52); g.stroke(); };
  g.save(); g.rotate(-0.55); g.lineWidth = 32;
  ring(-175, 1, 0.5); ring(-35, 0.9, 0.42);
  g.save(); g.beginPath(); g.rect(-50, -90, 70, 60); g.clip(); ring(-175, 1, 0.5); g.restore(); // interlocked: link 1 passes over link 2 at the top
  g.restore();
}
const HYPE_ART = [ticketArt, boxArt, quizArt, linkArt];
const HYPE_POS = [[-225, -230], [225, -230], [-225, 200], [225, 200]];
const HYPE_AT = [1.1, 1.7, 2.6, 2.86];
const HYPE_LBL = ['LOW TICKET', 'DROPSHIPPING', 'QUIZ', 'AFILIADO'];

function loopArt(g) {
  g.lineWidth = 46; g.lineCap = 'butt';
  [0, Math.PI].forEach(o => {
    g.strokeStyle = LG(g, -260, -260, 260, 260, [[0, tone(WT, 1)], [1, tone(WT, 0.45)]]);
    g.beginPath(); g.arc(0, 0, 250, o + 0.35, o + Math.PI - 0.35); g.stroke();
    const a = o + Math.PI - 0.35, x = 250 * Math.cos(a), y = 250 * Math.sin(a), tx = -Math.sin(a), ty = Math.cos(a), nx = Math.cos(a), ny = Math.sin(a);
    g.fillStyle = tone(WT, 0.95); poly(g, [[x + nx * 62, y + ny * 62], [x - nx * 62, y - ny * 62], [x + tx * 84, y + ty * 84]]); g.fill();
  });
}

function pawnArt(g) {
  const sh = (x0, x1) => LG(g, x0, 0, x1, 0, [[0, tone(WT, 0.3)], [0.38, tone(WT, 1)], [1, tone(WT, 0.32)]]);
  g.fillStyle = sh(-150, 150); RR(g, -150, 170, 300, 56, 22); g.fill();
  g.fillStyle = tone(WT, 0.9); g.beginPath(); g.ellipse(0, 172, 150, 22, 0, 0, 7); g.fill();
  g.fillStyle = sh(-112, 112); g.beginPath(); g.moveTo(-112, 172); g.bezierCurveTo(-62, 110, -40, 30, -46, -24); g.lineTo(46, -24); g.bezierCurveTo(40, 30, 62, 110, 112, 172); g.closePath(); g.fill();
  g.fillStyle = sh(-92, 92); g.beginPath(); g.ellipse(0, -30, 92, 24, 0, 0, 7); g.fill();
  sphere(g, 0, -122, 84, WT, 1);
}
function boardIsoArt(g) {
  const P = (u, v) => [(u - v) * 0.95, (u + v) * 0.48];
  for (let u = -3; u < 3; u++) for (let v = -3; v < 3; v++) {
    const T = 66; g.fillStyle = tone(WT, (u + v + 6) % 2 ? 0.88 : 0.2);
    poly(g, [P(u * T, v * T), P(u * T + T, v * T), P(u * T + T, v * T + T), P(u * T, v * T + T)]); g.fill();
  }
  g.fillStyle = tone(WT, 0.45); poly(g, [P(-198, 198), P(198, 198), [P(198, 198)[0], P(198, 198)[1] + 22], [P(-198, 198)[0], P(-198, 198)[1] + 22]]); g.fill();
  g.fillStyle = tone(WT, 0.3); poly(g, [P(198, -198), P(198, 198), [P(198, 198)[0], P(198, 198)[1] + 22], [P(198, -198)[0], P(198, -198)[1] + 22]]); g.fill();
}
function crownArt(g) {
  g.fillStyle = LG(g, 0, -60, 0, 50, [[0, tone(GD, 1)], [1, tone(GD, 0.5)]]);
  poly(g, [[-80, 40], [-90, -40], [-45, 0], [0, -62], [45, 0], [90, -40], [80, 40]]); g.fill();
  g.fillStyle = tone(GD, 0.75); RR(g, -82, 30, 164, 26, 6); g.fill();
  [[-90, -40], [0, -62], [90, -40]].forEach(([x, y]) => sphere(g, x, y - 8, 11, GD, 1));
}
const CLK = { x: 0, y: -90, R: 230 };
function clockArt(g) {
  g.strokeStyle = LG(g, -250, -250, 250, 250, [[0, tone(WT, 1)], [1, tone(WT, 0.42)]]); g.lineWidth = 26; g.beginPath(); g.arc(0, 0, CLK.R, 0, 7); g.stroke();
  g.fillStyle = tone(WT, 0.1); g.beginPath(); g.arc(0, 0, CLK.R - 13, 0, 7); g.fill();
  for (let k = 0; k < 12; k++) { g.save(); g.rotate(k * Math.PI / 6); g.fillStyle = tone(WT, k % 3 ? 0.7 : 1); RR(g, -6, -CLK.R + 26, 12, k % 3 ? 22 : 38, 4); g.fill(); g.restore(); }
  sphere(g, 0, 0, 20, WT, 1);
  g.fillStyle = tone(WT, 0.9); RR(g, -30, -CLK.R - 50, 60, 26, 8); g.fill(); RR(g, -10, -CLK.R - 30, 20, 20, 4); g.fill();
}
const handArt = (len, w) => g => { g.fillStyle = LG(g, -w, 0, w, 0, [[0, tone(WT, 0.6)], [0.5, tone(WT, 1)], [1, tone(WT, 0.6)]]); RR(g, -w / 2, -len, w, len + 18, w / 2); g.fill(); };


// ───────────────────────── blocos 2–4 · desenhos
// a streaming screen (no brand): frame, a play button, a progress bar
const screenArt = (w = 520, h = 300) => g => {
  g.fillStyle = LG(g, -w / 2, -h / 2, w / 2, h / 2, [[0, tone(WT, 1)], [0.5, tone(WT, 0.7)], [1, tone(WT, 0.45)]]); RR(g, -w / 2 - 16, -h / 2 - 16, w + 32, h + 32, 26); g.fill();
  g.fillStyle = LG(g, 0, -h / 2, 0, h / 2, [[0, tone(BL, 0.3)], [1, tone(BL, 0.12)]]); RR(g, -w / 2, -h / 2, w, h, 14); g.fill();
  sphere(g, 0, -12, h * 0.2, WT, 1); g.fillStyle = VOID; poly(g, [[-h * 0.06, -12 - h * 0.1], [h * 0.11, -12], [-h * 0.06, -12 + h * 0.1]]); g.fill();
  g.fillStyle = tone(WT, 0.3); RR(g, -w / 2 + 30, h / 2 - 40, w - 60, 10, 5); g.fill();
  g.fillStyle = tone(BL, 1); RR(g, -w / 2 + 30, h / 2 - 40, (w - 60) * 0.42, 10, 5); g.fill();
  g.fillStyle = tone(WT, 0.75); RR(g, -70, h / 2 + 16, 140, 40, 8); g.fill(); RR(g, -150, h / 2 + 50, 300, 18, 8); g.fill(); // stand
};
// a realistic gold coin seen face on, with a $ stamped into it
const coin$ = r => g => {
  g.fillStyle = RG(g, -r * 0.3, -r * 0.3, 1, r * 1.25, [[0, tone(GD, 1)], [0.7, tone(GD, 0.62)], [1, tone(GD, 0.36)]]); g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill();
  g.strokeStyle = tone(GD, 0.5); g.lineWidth = Math.max(2, r * 0.1); g.beginPath(); g.arc(0, 0, r * 0.78, 0, 7); g.stroke();
  g.fillStyle = tone(GD, 0.42); g.font = HEAVY(r * 1.1); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('$', 0, r * 0.06);
};
const houseArt = g => {
  g.fillStyle = LG(g, -120, 0, 120, 0, [[0, tone(WT, 0.42)], [0.45, tone(WT, 0.85)], [1, tone(WT, 0.38)]]); g.fillRect(-110, -30, 220, 160);
  g.fillStyle = LG(g, 0, -150, 0, -20, [[0, tone(OR, 1)], [1, tone(OR, 0.55)]]); poly(g, [[-140, -20], [0, -150], [140, -20]]); g.fill();
  g.fillStyle = tone(WT, 0.7); g.fillRect(60, -130, 28, 60);
  g.fillStyle = VOID; g.fillRect(-28, 40, 56, 90); g.fillStyle = tone(GD, 1); g.fillRect(-80, 10, 40, 40); g.fillRect(40, 10, 40, 40); // the lights are on
};
const badgeArt = g => {
  g.strokeStyle = tone(BL, 0.8); g.lineWidth = 10; g.beginPath(); g.moveTo(-60, -230); g.lineTo(-20, -112); g.moveTo(60, -230); g.lineTo(20, -112); g.stroke(); // lanyard
  g.fillStyle = tone(WT, 0.75); RR(g, -26, -122, 52, 26, 6); g.fill();
  g.fillStyle = LG(g, -110, -100, 110, 130, [[0, tone(WT, 1)], [1, tone(WT, 0.5)]]); RR(g, -110, -100, 220, 230, 18); g.fill();
  g.fillStyle = tone(WT, 0.25); RR(g, -78, -66, 70, 82, 10); g.fill(); sphere(g, -43, -40, 18, WT, 0.6);
  g.fillStyle = VOID; g.font = HEAVY(46); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('CLT', 0, 70);
  g.fillStyle = tone(WT, 0.32); RR(g, 8, -60, 74, 12, 6); g.fill(); RR(g, 8, -36, 54, 12, 6); g.fill();
};
// the SALG dashboard: a window with the name, a rising profit line and one row per sale
const DASH_ROWS = 5;
const dashArt = (o = {}) => g => {
  const fr = o.gold ? GD : WT;
  g.fillStyle = LG(g, -330, -240, 330, 240, [[0, tone(fr, 1)], [1, tone(fr, 0.5)]]); RR(g, -330, -240, 660, 480, 24); g.fill();
  g.fillStyle = tone(WT, 0.05); RR(g, -316, -180, 632, 406, 14); g.fill();
  g.fillStyle = VOID; [-292, -266, -240].forEach(x => { g.beginPath(); g.arc(x, -210, 8, 0, 7); g.fill(); });
  g.font = HEAVY(40); g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('SALG', -200, -208);
  g.strokeStyle = tone(GN, 1); g.lineWidth = 9; g.beginPath();                                                      // the profit line
  [[-290, -40], [-230, -60], [-170, -50], [-110, -95], [-50, -88], [10, -130], [70, -118], [130, -150]].forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke();
  g.strokeStyle = tone(WT, 0.3); g.lineWidth = 3; g.beginPath(); g.moveTo(-290, -20); g.lineTo(140, -20); g.stroke();
  for (let k = 0; k < DASH_ROWS; k++) { const y = 10 + k * 42; g.fillStyle = tone(WT, 0.6); RR(g, -290, y, 150, 16, 8); g.fill(); }
  g.fillStyle = tone(GD, 0.9); RR(g, 180, -160, 110, 110, 16); g.fill(); g.fillStyle = VOID; g.font = HEAVY(64); g.textAlign = 'center'; g.fillText('$', 235, -102);
};
const dashRows = (s, dx, dy, seed) => {                                       // the profit of each sale, as a green bar per row
  const out = [];
  for (let k = 0; k < DASH_ROWS; k++) art(g => { const y = 10 + k * 42, w = 120 + 170 * hash(k, 4); g.fillStyle = LG(g, -100, 0, 300, 0, [[0, tone(GN, 1)], [1, tone(GN, 0.6)]]); RR(g, -100, y, w, 16, 8); g.fill(); }, s, dx, dy, { seed: seed + k, cell: 4, nosort: true }).forEach(p => out.push({ ...p, row: k }));
  return out;
};
const laptopArt = (x, y, s) => g => {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = LG(g, -60, -80, 60, 0, [[0, tone(WT, 0.85)], [1, tone(WT, 0.45)]]); RR(g, -60, -82, 120, 80, 8); g.fill();
  g.fillStyle = VOID; RR(g, -52, -74, 104, 64, 4); g.fill();
  g.fillStyle = tone(WT, 0.65); poly(g, [[-72, 0], [72, 0], [84, 14], [-84, 14]]); g.fill();
  g.restore();
};
// candlestick chart (day trade)
const CANDLES = [[0.5, 0.2, 0.62, 0.15], [0.62, 0.5, 0.7, 0.42], [0.45, 0.6, 0.66, 0.4], [0.6, 0.42, 0.7, 0.35], [0.35, 0.58, 0.62, 0.3], [0.42, 0.3, 0.5, 0.25], [0.22, 0.4, 0.46, 0.18], [0.3, 0.18, 0.36, 0.12]];
const candleArt = g => {
  g.strokeStyle = tone(WT, 0.18); g.lineWidth = 2; for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(-360, -200 + k * 100); g.lineTo(360, -200 + k * 100); g.stroke(); }
  CANDLES.forEach(([o, c, hi, lo], k) => {
    const x = -315 + k * 90, Y = v => 220 - v * 600, up = c > o, hex = up ? GN : RD;
    g.strokeStyle = tone(hex, 0.9); g.lineWidth = 6; g.beginPath(); g.moveTo(x, Y(hi)); g.lineTo(x, Y(lo)); g.stroke();
    g.fillStyle = LG(g, x - 26, 0, x + 26, 0, [[0, tone(hex, 0.6)], [0.4, tone(hex, 1)], [1, tone(hex, 0.55)]]); g.fillRect(x - 26, Y(Math.max(o, c)), 52, Math.max(10, Math.abs(c - o) * 600));
  });
};
const candleOne = k => g => {
  const [o, c, hi, lo] = CANDLES[k], x = -315 + k * 90, Y = v => 220 - v * 600, hex = c > o ? GN : RD;
  g.strokeStyle = tone(hex, 0.9); g.lineWidth = 6; g.beginPath(); g.moveTo(x, Y(hi)); g.lineTo(x, Y(lo)); g.stroke();
  g.fillStyle = LG(g, x - 26, 0, x + 26, 0, [[0, tone(hex, 0.6)], [0.4, tone(hex, 1)], [1, tone(hex, 0.55)]]); g.fillRect(x - 26, Y(Math.max(o, c)), 52, Math.max(10, Math.abs(c - o) * 600));
};
// progress bar
const barArt = (w, v = 0.95) => g => { g.strokeStyle = tone(WT, v); g.lineWidth = 6; RR(g, -w / 2, -28, w, 56, 28); g.stroke(); };
const barFill = (w, hex) => g => { g.fillStyle = LG(g, 0, -18, 0, 18, [[0, tone(hex, 1)], [1, tone(hex, 0.6)]]); RR(g, -w / 2 + 12, -16, w - 24, 32, 16); g.fill(); };
// a stack of cards (what was learned)
const cardsArt = n => g => { for (let k = 0; k < n; k++) { const y = 150 - k * 34, x = 10 * Math.sin(k * 1.7); g.fillStyle = LG(g, -150, y, 150, y, [[0, tone(WT, 0.45)], [0.5, tone(WT, 0.95 - 0.02 * k)], [1, tone(WT, 0.42)]]); RR(g, x - 150, y - 14, 300, 28, 6); g.fill(); g.fillStyle = VOID; g.fillRect(x - 150, y + 12, 300, 4); } };
// a dashed outline of a house (what never got built)
const ghostArt = g => { g.strokeStyle = tone(WT, 0.75); g.lineWidth = 7; g.setLineDash([18, 13]); poly(g, [[-170, 160], [-170, -40], [0, -190], [170, -40], [170, 160]]); g.stroke(); g.strokeRect(-40, 60, 80, 100); g.setLineDash([]); };
// the bird trap: an upturned crate propped on a stick, a string, seeds underneath
const TRAP = { px: -80, py: 210 };   // the hinge on the ground
const crateArt = g => {
  g.fillStyle = LG(g, -230, -160, 230, 160, [[0, tone(WT, 0.95)], [1, tone(WT, 0.45)]]); g.fillRect(-230, -150, 460, 300);
  g.fillStyle = tone(WT, 0.12); g.fillRect(-205, -125, 410, 250);
  g.fillStyle = LG(g, -230, 0, 230, 0, [[0, tone(WT, 0.5)], [0.5, tone(WT, 0.9)], [1, tone(WT, 0.5)]]);
  for (let k = 0; k < 4; k++) g.fillRect(-205, -112 + k * 66, 410, 26);
};
const stickArtOld = g => { g.strokeStyle = LG(g, 0, -150, 0, 200, [[0, tone(WT, 0.95)], [1, tone(WT, 0.5)]]); g.lineWidth = 14; g.beginPath(); g.moveTo(150, 205); g.lineTo(130, -40); g.stroke(); g.strokeStyle = tone(WT, 0.55); g.lineWidth = 4; g.beginPath(); g.moveTo(142, 120); g.quadraticCurveTo(320, 230, 520, 200); g.stroke(); };
const seedArt = g => { const r = rng(77); for (let k = 0; k < 26; k++) sphere(g, 40 + (r() - 0.5) * 170, 196 - r() * 18, 7 + 4 * r(), '#F6E3C2', 1, CREAM); };
const birdArt = (s = 1) => g => {
  g.save(); g.scale(s, s);
  g.fillStyle = RG(g, -20, -20, 4, 80, [[0, tone(WT, 1)], [1, tone(WT, 0.5)]]); g.beginPath(); g.ellipse(0, 0, 62, 42, -0.15, 0, 7); g.fill();
  g.fillStyle = tone(WT, 0.6); poly(g, [[-50, -6], [-118, -30], [-108, 10]]); g.fill();                                   // tail
  sphere(g, 52, -38, 28, WT, 1); g.fillStyle = tone(GD, 1); poly(g, [[76, -44], [104, -36], [76, -28]]); g.fill();        // head + beak
  g.fillStyle = VOID; g.beginPath(); g.arc(60, -44, 5, 0, 7); g.fill();
  g.fillStyle = tone(WT, 0.45); g.beginPath(); g.ellipse(-6, -4, 36, 20, -0.4, 0, 7); g.fill();                             // wing
  g.strokeStyle = tone(WT, 0.7); g.lineWidth = 5; g.beginPath(); g.moveTo(-6, 38); g.lineTo(-12, 66); g.moveTo(14, 38); g.lineTo(18, 66); g.stroke();
  g.restore();
};
// a phone screen showing "the new thing"
const novoScreen = g2 => { g2.fillStyle = tone(BL, 0.85); RR(g2, -130, -150, 260, 200, 20); g2.fill(); g2.fillStyle = tone(GD, 1); RR(g2, -100, 90, 200, 70, 20); g2.fill(); g2.fillStyle = VOID; g2.font = HEAVY(44); g2.textAlign = 'center'; g2.textBaseline = 'middle'; g2.fillText('NOVO', 0, 126); };
const toolArt = g => {
  g.fillStyle = LG(g, -120, -150, 120, 150, [[0, tone(PU, 1)], [1, tone(PU, 0.5)]]); RR(g, -120, -150, 240, 300, 26); g.fill();
  g.fillStyle = tone(WT, 0.1); RR(g, -100, -130, 200, 150, 16); g.fill();
  g.fillStyle = tone(WT, 1); for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; poly(g, [[Math.cos(a) * 54, -55 + Math.sin(a) * 54], [Math.cos(a + 0.4) * 14, -55 + Math.sin(a + 0.4) * 14], [Math.cos(a - 0.4) * 14, -55 + Math.sin(a - 0.4) * 14]]); g.fill(); }
  g.fillStyle = tone(WT, 0.9); RR(g, -80, 50, 160, 22, 10); g.fill(); RR(g, -80, 90, 110, 22, 10); g.fill();
};
const carArt = g => {
  g.fillStyle = LG(g, 0, -120, 0, 60, [[0, tone(GD, 1)], [0.5, tone(GD, 0.75)], [1, tone(GD, 0.4)]]);
  g.beginPath(); g.moveTo(-330, 40); g.lineTo(-330, -10); g.quadraticCurveTo(-300, -40, -200, -50); g.lineTo(-110, -110); g.quadraticCurveTo(0, -140, 110, -105); g.lineTo(220, -50); g.quadraticCurveTo(320, -40, 330, 0); g.lineTo(330, 40); g.closePath(); g.fill();
  g.fillStyle = tone(WT, 0.1); poly(g, [[-90, -98], [0, -118], [0, -56], [-170, -54]]); g.fill(); poly(g, [[20, -118], [100, -100], [180, -54], [20, -56]]); g.fill();
  g.fillStyle = tone(WT, 0.95); g.fillRect(-300, -8, 600, 6);
  [-200, 200].forEach(x => { sphere(g, x, 40, 58, WT, 0.4); sphere(g, x, 40, 32, WT, 0.95); });
};
const printArt = g => {
  g.fillStyle = tone(WT, 0.1); RR(g, -170, -210, 340, 420, 22); g.fill(); g.strokeStyle = tone(WT, 0.9); g.lineWidth = 6; RR(g, -170, -210, 340, 420, 22); g.stroke();
  g.fillStyle = tone(GN, 1); [0.3, 0.42, 0.38, 0.6, 0.72, 0.95].forEach((v, k) => g.fillRect(-130 + k * 46, 150 - v * 230, 32, v * 230));
  g.fillStyle = tone(WT, 0.85); RR(g, -130, -180, 180, 26, 10); g.fill(); g.fillStyle = tone(GN, 1); RR(g, -130, -140, 120, 22, 10); g.fill();
};
// hamster wheel
const WHL = { x: 0, y: -40, R: 300 };
const wheelArt = g => {
  g.strokeStyle = LG(g, -320, -320, 320, 320, [[0, tone(WT, 1)], [1, tone(WT, 0.45)]]); g.lineWidth = 22; g.beginPath(); g.arc(0, 0, WHL.R, 0, 7); g.stroke();
  g.lineWidth = 8; g.beginPath(); g.arc(0, 0, WHL.R - 40, 0, 7); g.stroke();
  g.strokeStyle = tone(WT, 0.55); g.lineWidth = 6; for (let k = 0; k < 24; k++) { const a = k / 24 * 6.283; g.beginPath(); g.moveTo(Math.cos(a) * (WHL.R - 40), Math.sin(a) * (WHL.R - 40)); g.lineTo(Math.cos(a) * WHL.R, Math.sin(a) * WHL.R); g.stroke(); }
  for (let k = 0; k < 6; k++) { const a = k / 6 * 6.283; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * (WHL.R - 40), Math.sin(a) * (WHL.R - 40)); g.stroke(); }
  sphere(g, 0, 0, 26, WT, 1);
};
const standArt = g => { g.fillStyle = LG(g, -60, 0, 60, 0, [[0, tone(WT, 0.4)], [0.5, tone(WT, 0.85)], [1, tone(WT, 0.4)]]); poly(g, [[-20, -40], [20, -40], [150, 300], [100, 300]]); g.fill(); poly(g, [[-20, -40], [20, -40], [-100, 300], [-150, 300]]); g.fill(); RR(g, -250, 300, 500, 26, 10); g.fill(); };
const runnerArt = g => { g.strokeStyle = tone(WT, 1); g.lineWidth = 14; g.beginPath(); g.moveTo(-30, 70); g.lineTo(0, 10); g.lineTo(40, 70); g.moveTo(0, 10); g.lineTo(14, -60); g.moveTo(-30, -40); g.lineTo(14, -50); g.lineTo(50, -20); g.stroke(); sphere(g, 22, -92, 26, WT, 1); };
// tree branches
const BR_PERCH = [[-300, -200], [260, -60], [-200, 120], [220, 280]];
const branchArt = g => {
  g.strokeStyle = LG(g, -500, 0, 500, 0, [[0, tone(WT, 0.4)], [0.5, tone(WT, 0.8)], [1, tone(WT, 0.4)]]); g.lineCap = 'round';
  g.lineWidth = 46; g.beginPath(); g.moveTo(0, 520); g.lineTo(0, -380); g.stroke();
  [[0, -200, -420, -230], [0, -60, 430, -90], [0, 120, -400, 90], [0, 280, 420, 250]].forEach(([x0, y0, x1, y1]) => { g.lineWidth = 22; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo((x0 + x1) / 2, y0 - 40, x1, y1); g.stroke(); });
  g.fillStyle = tone(WT, 0.5); [[-380, -260], [400, -120], [-370, 60], [390, 220]].forEach(([x, y]) => { g.beginPath(); g.ellipse(x, y, 40, 18, 0.5, 0, 7); g.fill(); });
};
const qArt = (px = 300) => textArt('?', px, WT);


// ───────────────────────── blocos 2–4 · formas
NARR.push([35.6, 41.45], [51.75, 54.4], [73.6, 78.35], [96.85, 100.95], [112.05, 115.35], [145.62, 151.32], [188.95, 189.5], [208.8, 213.28], [239.85, 999]);

let B30, B45, B60, BUSTD_T;
const coinGlyphs = (n, seed, extra = {}) => [...Array(n)].map((_, k) => ({ cn: k, x: 0, y: 0, a: 0.02, c: pick('$o0$', hash(k + seed, 2)), t: money(hash(k + seed, 3)), s: 0.5 + 0.35 * hash(k + seed, 4), ...extra }));
const flowTo = (b, i, sx, sy, tx, ty, u, arc = 120, jit = 14, k = 0) => { const q = E.inOut(u); b.x[i] = lerp(sx, tx, q) + (hash(k, 7) - 0.5) * jit; b.y[i] = lerp(sy, ty, q) - arc * Math.sin(Math.PI * q) + (hash(k, 8) - 0.5) * jit; };
const popAt = (t, i, p, b, at, cx, cy, d = 0.3, s0 = 0.8) => { const on = dropIn(t, at, d), s = s0 + (1 - s0) * clamp(on); b.a[i] = p.a * clamp(on, 0.02); b.x[i] = cx + (p.x - cx) * s; b.y[i] = cy + (p.y - cy) * s; return on; };
const rot = (b, i, p, cx, cy, a) => { const dx = p.x - cx, dy = p.y - cy; b.x[i] = cx + dx * Math.cos(a) - dy * Math.sin(a); b.y[i] = cy + dx * Math.sin(a) + dy * Math.cos(a); };
const strikeArt = (x0, y0, x1, y1, w = 14) => g => { g.strokeStyle = tone(RD, 1); g.lineWidth = w; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); };
const novoTag = (s = 1) => g => { g.save(); g.scale(s, s); g.fillStyle = LG(g, -110, -44, 110, 44, [[0, tone(GD, 1)], [1, tone(GD, 0.55)]]); RR(g, -110, -44, 220, 88, 22); g.fill(); g.fillStyle = VOID; g.font = HEAVY(52); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('NOVO', 0, 3); g.restore(); };
const dotted = (x0, y0, x1, y1, n, tag, tint = WHITE) => [...Array(n)].map((_, k) => ({ ...tag, dk: k, x: lerp(x0, x1, k / (n - 1)), y: lerp(y0, y1, k / (n - 1)), a: Math.floor(k / 3) % 2 ? 0 : 0.7, c: CI['·'], t: tint, s: 0.55 })).filter(p => p.a > 0);
const ringPos = (n, rx, ry, cx, cy, a0 = 0) => [...Array(n)].map((_, k) => { const a = a0 + (k / n) * 2 * Math.PI; return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)]; });
const PUL_OWN = [46.25, 48.25, 48.9], PUL_APP = [60.2, 60.62, 61.05], PUL_SUB = [103.7, 104.38, 104.85];
function pulseCoins(srcs, pulses, per, seed) { const out = []; pulses.forEach((_, pl) => srcs.forEach((_, si) => { for (let j = 0; j < per; j++) out.push({ pl, si }); })); return coinGlyphs(out.length, seed).map((p, k) => ({ ...p, ...out[k] })); }
const pulseLife = (t, i, p, b, srcs, tgt, pulses, d = 0.65, arc = 40) => {
  const u = (t - pulses[p.pl] - 0.3 * hash(p.cn, 3)) / d; if (u <= 0 || u >= 1) { b.a[i] = 0.02; return; }
  const [sx, sy] = srcs[p.si]; flowTo(b, i, sx, sy, tgt[0], tgt[1], u, arc, 18, p.cn); b.a[i] = 0.9 * Math.sin(Math.PI * u);
};
// timeline for the story (14 · 16 · depois)
const TL = { y: 400, x0: -420, x1: 420, mk: [-300, 0, 300], at: [115.44, 117.9, 119.28] };
let TLP = null;
const tlLife = (t, i, p, b) => { if (p.mk === undefined) { b.a[i] = p.a * 0.6; b.t[i] = GRAY; return; } const lit = ramp(t, TL.at[p.mk], 0.25); b.t[i] = lit > 0.5 ? WHITE : GRAY; b.a[i] = p.a * (0.45 + 0.55 * lit) + 0.4 * flash(t, TL.at[p.mk] + 0.05, 0.12); };
const lidArt = (ox = 0, oy = 0) => g => { const lid = () => { g.beginPath(); g.moveTo(-125, 0); g.quadraticCurveTo(0, -115, 125, 0); g.quadraticCurveTo(0, 115, -125, 0); g.closePath(); }; lid(); g.fillStyle = LG(g, 0, -60, 0, 60, [[0, tone(WT, 0.92)], [1, tone(WT, 0.5)]]); g.fill(); g.save(); g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(ox, oy, 56, 0, 7); g.fill(); g.restore(); lid(); g.strokeStyle = tone(WT, 1); g.lineWidth = 8; g.stroke(); };
const irisArt = (ox = 0, oy = 0) => g => { g.save(); g.translate(ox, oy); g.beginPath(); g.moveTo(-125, -oy); g.quadraticCurveTo(0, -115 - oy, 125, -oy); g.quadraticCurveTo(0, 115 - oy, -125, -oy); g.clip();  g.fillStyle = RG(g, -14, -14, 4, 54, [[0, tone(WT, 0.7)], [1, tone(WT, 0.28)]]); g.beginPath(); g.arc(0, 0, 50, 0, 7); g.fill(); g.fillStyle = VOID; g.beginPath(); g.arc(0, 0, 23, 0, 7); g.fill(); sphere(g, -15, -16, 9, WT, 1); g.restore(); };
const hw = y => 14 + 112 * (1 - Math.pow(1 - Math.min(1, Math.abs(y) / 290), 2));
const hgFrame = g => {
  g.fillStyle = LG(g, -170, 0, 170, 0, [[0, tone(WT, 0.5)], [0.4, tone(WT, 1)], [1, tone(WT, 0.45)]]); RR(g, -175, -345, 350, 36, 12); g.fill(); RR(g, -175, 309, 350, 36, 12); g.fill();
  g.fillStyle = tone(WT, 0.55); RR(g, -168, -312, 16, 624, 6); g.fill(); RR(g, 152, -312, 16, 624, 6); g.fill();
  g.strokeStyle = tone(WT, 0.62); g.lineWidth = 6; [-1, 1].forEach(sd => { g.beginPath(); for (let y = -300; y <= 300; y += 4) { const x = sd * (hw(y) + 4); y === -300 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke(); });
};
const hgSand = g => { g.beginPath(); for (let y = -296; y <= 296; y += 4) g.lineTo(hw(y) - 6, y); for (let y = 296; y >= -296; y -= 4) g.lineTo(-hw(y) + 6, y); g.closePath(); g.fillStyle = LG(g, -120, 0, 120, 0, [[0, tone(WT, 0.55)], [0.45, tone(WT, 0.95)], [1, tone(WT, 0.5)]]); g.fill(); };
const redBubble = (w, h) => g => { g.fillStyle = tone(WT, 0.05); RR(g, -w / 2, -h / 2, w, h, 34); g.fill(); poly(g, [[-30, h / 2 - 2], [0, h / 2 + 50], [30, h / 2 - 2]]); g.fill(); g.strokeStyle = LG(g, -w / 2, 0, w / 2, 0, [[0, tone(RD, 1)], [1, tone(WT, 0.8)]]); g.lineWidth = 7; RR(g, -w / 2, -h / 2, w, h, 34); g.stroke(); g.beginPath(); g.moveTo(-30, h / 2 + 2); g.lineTo(0, h / 2 + 50); g.lineTo(30, h / 2 + 2); g.stroke(); };
const docArt = g => { g.fillStyle = LG(g, -75, -50, 75, 50, [[0, tone(WT, 0.85)], [1, tone(WT, 0.42)]]); RR(g, -75, -50, 150, 100, 12); g.fill(); g.fillStyle = VOID; RR(g, -55, -30, 110, 10, 5); g.fill(); RR(g, -55, -6, 80, 10, 5); g.fill(); RR(g, -55, 18, 96, 10, 5); g.fill(); };
const flagArt = g => { g.fillStyle = tone(WT, 0.8); g.fillRect(-4, -160, 8, 170); g.fillStyle = LG(g, 0, -160, 110, -100, [[0, tone(GD, 1)], [1, tone(GD, 0.55)]]); poly(g, [[4, -160], [110, -128], [4, -96]]); g.fill(); };
const appScreen = g2 => { g2.fillStyle = tone(OR, 0.9); RR(g2, -130, -250, 260, 140, 20); g2.fill(); g2.fillStyle = tone(WT, 0.75); for (let k = 0; k < 3; k++) RR(g2, -130, -80 + k * 110, 260, 80, 16), g2.fill(); g2.fillStyle = tone(GD, 1); g2.beginPath(); g2.arc(0, -180, 40, 0, 7); g2.fill(); };
const towerArt = g => {
  g.fillStyle = LG(g, -170, 0, 170, 0, [[0, tone(WT, 0.4)], [0.45, tone(WT, 0.85)], [1, tone(WT, 0.35)]]); g.fillRect(-170, -360, 340, 780);
  g.fillStyle = tone(WT, 0.25); poly(g, [[170, -360], [230, -400], [230, 380], [170, 420]]); g.fill();
  g.fillStyle = tone(WT, 0.95); poly(g, [[-170, -360], [170, -360], [230, -400], [-110, -400]]); g.fill();
  for (let r = 0; r < 14; r++) for (let c = 0; c < 5; c++) { g.fillStyle = (r * 5 + c) % 7 === 3 ? tone(GD, 0.95) : VOID; g.fillRect(-140 + c * 58, -320 + r * 52, 34, 30); }
  g.fillStyle = tone(BL, 0.95); RR(g, -120, -545, 240, 130, 18); g.fill(); g.fillStyle = VOID; poly(g, [[-24, -510], [32, -480], [-24, -450]]); g.fill();
  g.fillStyle = tone(WT, 0.7); g.fillRect(-8, -415, 16, 16);
};
const cardSmall = g => { g.fillStyle = LG(g, -60, 0, 60, 0, [[0, tone(WT, 0.45)], [0.5, tone(WT, 0.95)], [1, tone(WT, 0.42)]]); RR(g, -60, -10, 120, 20, 5); g.fill(); };

const IG_AT = [80.4, 81.9, 82.55];
const HY_POS = [[-300, -330], [60, -380], [330, -230], [-120, -150], [220, 0], [-330, 30], [0, 150], [330, 220]];
const TOOL_AT = [161.42, 161.92, 162.42, 162.8, 163.9, 164.58], TOOL_POS = [[-300, -170], [0, -170], [300, -170], [-300, 200], [0, 200], [300, 200]];
const HOPS = [213.5, 214.15, 214.8, 215.25, 216.24, 216.66, 216.98], PERCH = [[-330, -262], [330, -122], [-320, 58], [330, 228]];
const MOVERS = [[2, 540], [7, 430], [11, 300], [16, 620], [20, 210]];
const barF = t => ramp(t, 133.2, 1.3, E.cubicOut) * 0.72 * (1 - ramp(t, 135.5, 0.35, E.quadIn));
const startF = t => 0.25 * ramp(t, 183.3, 1.4, E.expoOut);
const HINGE = [-230, 210], A0 = -0.42;
const birdAt = t => { let k = 0; while (k < HOPS.length && t >= HOPS[k] + 0.28) k++; const from = PERCH[k % 4]; if (k < HOPS.length && t >= HOPS[k]) { const u = (t - HOPS[k]) / 0.28, to = PERCH[(k + 1) % 4]; return [lerp(from[0], to[0], E.inOut(u)), lerp(from[1], to[1], E.inOut(u)) - 120 * Math.sin(Math.PI * u), to[0] < from[0] ? -1 : 1]; } return [from[0], from[1], from[0] > 0 ? -1 : 1]; };

function buildShapesB() {
  BUSTD_T = manT(0.17, 619, { cell: 3 });
  B30 = manT(0.3, 612, { cell: 4 });
  B45 = manT(0.45, 613);
  B60 = manT(0.6, 614);
  TLP = art(g => { g.fillStyle = tone(WT, 0.55); RR(g, TL.x0, TL.y - 3, TL.x1 - TL.x0, 6, 3); g.fill(); TL.mk.forEach(x => sphere(g, x, TL.y, 15, WT, 1)); }, 1, 0, 0, { seed: 615, cell: 4 })
    .map(p => { const k = TL.mk.findIndex(x => Math.hypot(p.x - x, p.y - TL.y) < 18); return k >= 0 ? { ...p, mk: k } : { ...p }; });

  // "Saindo do seu bolso ou não, milhões de pessoas pagam essas assinaturas todo mês." — a screen; a crowd pays, coins stream up
  {
    const scr = tagged(art(screenArt(), 1, 0, -330, { seed: 700 }), { scr: 1 });
    const SR = [], people = [];
    for (let r = 0; r < 6; r++) for (let c = 0; c < 11; c++) { const [x, y, s] = proj((c - 5) * 0.62 + (r % 2 ? 0.31 : 0), 2.0 + r * 0.6, 0, -0.4), m = s * 1.25, yy = y + 120; SR.push([x, yy - 50 * m]); PERS_T.forEach(p => people.push({ ...p, x: x + p.x * m, y: yy + p.y * m, s: p.s * m * 1.1, bk: r * 11 + c, bx: x, by: yy })); }
    const coins = coinGlyphs(900, 0).map((p, k) => ({ ...p, si: k % 60 }));
    SH.subs = makeShape([hsort(people), scr, coins], (t, i, p, b) => {
      if (p.cn !== undefined) {
        const on = ramp(t, 42.9 + 0.8 * hash(p.si, 5), 0.3); if (on <= 0) { b.a[i] = 0.02; return; }
        const u = (hash(p.cn, 6) + (t - 42.9) * (0.5 + 0.3 * ramp(t, 43.7, 0.5))) % 1, [sx, sy] = SR[p.si];
        flowTo(b, i, sx, sy, 0, -175, u, 60, 30, p.cn); b.a[i] = Math.max(0.02, 0.9 * on * Math.sin(Math.PI * u)); return;
      }
      if (p.scr) { b.a[i] = p.a + 0.25 * flash(t, 44.4, 0.2); return; }
      b.a[i] = p.a * (0.75 + 0.25 * ramp(t, 42.9, 0.5));
    });
  }

  // "Quem é dono recebe de cada uma dessas pessoas, de novo e de novo." — one owner, gold; everyone pays him, in pulses
  {
    const OWN = [0, -50], SR = [], ring = [];
    for (let k = 0; k < 40; k++) { const a = -Math.PI / 2 + k / 40 * 2 * Math.PI, sa = Math.sin(a), x = 440 * Math.cos(a), y = 110 + 280 * sa, m = 0.42 + 0.2 * sa; SR.push([x, y - 50 * m]); PERS_T.forEach(p => ring.push({ ...p, x: x + p.x * m, y: y + p.y * m, s: p.s * m * 1.1, bk: k, bx: x, by: y })); }
    const own = tagged(manAt(OWN[0], OWN[1], 0.5, 711), { own: 1 });
    const scr = tagged(art(screenArt(), 0.42, 0, -370, { seed: 710, cell: 4 }), { scr: 1 });
    const coins = pulseCoins(SR, PUL_OWN, 7, 1);
    SH.owner = makeShape([hsort(ring), own, scr, coins], (t, i, p, b) => {
      if (p.cn !== undefined) return pulseLife(t, i, p, b, SR, [OWN[0], OWN[1] + 20], PUL_OWN);
      if (p.own) { const gd = ramp(t, 45.85, 0.4); if (gd > hash(i, 13)) b.t[i] = money(hash(i, 14)); b.a[i] = p.a * (0.7 + 0.3 * gd) + 0.3 * PUL_OWN.reduce((s, P) => s + flash(t, P + 0.75, 0.15), 0); return; }
      if (p.scr) { b.t[i] = GRAY; b.a[i] = p.a * 0.55; return; }
      b.a[i] = p.a * 0.85 + 0.3 * PUL_OWN.reduce((s, P) => s + flash(t, P + 0.05, 0.1), 0);
    });
  }

  // "Quem vende o próprio tempo recebe uma vez." — left: the owner keeps receiving; right: a clock, and one coin, once
  {
    const own = tagged(manAt(-250, -40, 0.4, 720), { own: 1 });
    const C = [250, -110], S = 0.62;
    const face = dotArt(clockArt, S, C[0], C[1], { seed: 721, cell: 4 });
    const hm = tagged(art(handArt(170, 16), S, C[0], C[1], { seed: 722, cell: 4 }), { hand: 1 }), hh = tagged(art(handArt(110, 24), S, C[0], C[1], { seed: 723, cell: 4 }), { hand: 2 });
    const one = tagged(art(coin$(46), 1, 250, 220, { seed: 724, cell: 4, money: true }), { one: 1 });
    const flow = coinGlyphs(220, 2).map(p => ({ ...p, fl: 1 }));
    const div = dotted(0, -460, 0, 420, 150, { dv: 1 }, GRAY);
    SH.onetime = makeShape([own, face, hm, hh, one, flow, div], (t, i, p, b) => {
      if (p.own) { b.t[i] = money(hash(i, 14)); return; }
      if (p.fl) { const u = ((t - 49.3) * 1.3 + hash(p.cn, 6)) % 1; if (t < 49.3) { b.a[i] = 0.02; return; } flowTo(b, i, -250 + (hash(p.cn, 9) - 0.5) * 460, 420, -250, 10, u, 30, 20, p.cn); b.a[i] = Math.max(0.02, 0.5 * Math.sin(Math.PI * u)); return; }
      if (p.hand) { const m = 2 * Math.PI * (t - 49.3) * 0.9, a = p.hand === 1 ? m : m / 12 + 2.1; rot(b, i, p, C[0], C[1], a); return; }
      if (p.one) { const on = dropIn(t, 51.18, 0.35); b.a[i] = p.a * clamp(on, 0.02) + 0.4 * flash(t, 51.3, 0.15); b.y[i] = p.y - 120 * (1 - clamp(on)); return; }
      if (p.dv) b.a[i] = p.a * 0.5;
    });
  }

  // "Pra estar do outro lado, você não precisa ser a Netflix." — a giant tower with a screen on its roof; it greys out
  SH.tower = makeShape([dotArt(towerArt, 1, 0, 0, { seed: 730 })], (t, i, p, b) => {
    const off = ramp(t, 55.9, 0.6), s = 1 - 0.1 * off;
    b.x[i] = p.x * s; b.y[i] = 420 + (p.y - 420) * s; b.a[i] = p.a * (1 - 0.5 * off);
    if (off > hash(i, 3)) b.t[i] = GRAY;
  });

  // "Um produto pequeno, construído uma vez, já pode ser pago todo mês por quem usa." — a small orange app; its users pay monthly
  {
    const PH = [0, -170];
    const ph = tagged(art(g => phoneArt(g, { body: OR, screen: appScreen }), 0.55, PH[0], PH[1], { seed: 740, cell: 4 }), { ph: 1 });
    const SR = [], users = [];
    [-375, -225, -75, 75, 225, 375].forEach((x, k) => { const y = 300 + 22 * Math.abs(k - 2.5); SR.push([x, y - 40]); users.push(...bustAt(B30, x, y, k)); });
    const coins = pulseCoins(SR, PUL_APP, 14, 3);
    SH.smallapp = makeShape([ph, hsort(users), coins], (t, i, p, b) => {
      if (p.cn !== undefined) return pulseLife(t, i, p, b, SR, [PH[0], PH[1] + 60], PUL_APP, 0.55, 30);
      if (p.ph) { b.a[i] = p.a + 0.4 * flash(t, 58.45, 0.15) + 0.25 * PUL_APP.reduce((s, P) => s + flash(t, P + 0.6, 0.12), 0); return; }
      popAt(t, i, p, b, 59.95 + p.bk * 0.05, p.bx, p.by);
    });
  }

  // "isso exigia uma equipe ou muito dinheiro pra pagar por ela." — a team at laptops; money pours out to pay them
  {
    const TP = [[-300, -150], [-100, -150], [100, -150], [300, -150], [-300, 170], [-100, 170], [100, 170], [300, 170]];
    const team = []; TP.forEach(([x, y], k) => { team.push(...bustAt(B30, x, y, k)); art(laptopArt(x, y + 78, 0.9), 1, 0, 0, { seed: 750 + k, cell: 4, nosort: true }).forEach(p => team.push({ ...p, bk: k, bx: x, by: y })); });
    const ph = tagged(art(g => phoneArt(g, { body: OR, screen: appScreen }), 0.28, 0, -440, { seed: 749, cell: 4 }), { ph: 1 });
    const pile = tagged(art(textArt('$', 130, GD), 1, 0, 10, { seed: 759, cell: 4, money: true }), { pile: 1 });
    const SRC = TP.map(([x, y]) => [x, y - 20]);
    const out = coinGlyphs(560, 4).map((p, k) => ({ ...p, si: k % 8 }));
    SH.team = makeShape([hsort(team), ph, pile, out], (t, i, p, b) => {
      if (p.cn !== undefined) { if (t < 64.85) { b.a[i] = 0.02; return; } const u = ((t - 64.85) * 1.2 + hash(p.cn, 6)) % 1, [tx, ty] = SRC[p.si]; flowTo(b, i, 0, 10, tx, ty, u, 50, 20, p.cn); b.a[i] = Math.max(0.02, 0.85 * Math.sin(Math.PI * u) * ramp(t, 64.85, 0.3)); return; }
      if (p.ph) { b.t[i] = GRAY; b.a[i] = p.a * 0.6; return; }
      if (p.pile) { const on = dropIn(t, 64.8, 0.3); b.a[i] = p.a * clamp(on, 0.02); return; }
      popAt(t, i, p, b, 64.0 + p.bk * 0.06, p.bx, p.by);
    });
  }

  // "Só um programador custa, em média, quase 6 mil reais por mês." — one developer; then the lettering lands: 6 MIL
  {
    const dev = tagged(manAt(0, 290, 0.42, 760), { dev: 1 });
    const lap = tagged(art(laptopArt(0, 452, 1.3), 1, 0, 0, { seed: 761, cell: 4 }), { dev: 1 });
    const big = tagged(art(textArt('6 MIL', 330, GD), 1, 0, -150, { seed: 762, money: true }), { big: 1 });
    SH.price = makeShape([dev, lap, big], (t, i, p, b) => {
      if (p.big) {
        const on = ramp(t, 68.5, 0.4, E.backOut), s = 1.35 - 0.35 * clamp(on), sweep = -520 + 1040 * ramp(t, 69.2, 0.6, E.inOut);
        b.a[i] = p.a * clamp(on * 1.5, 0.02) + 0.5 * flash(t, 68.62, 0.12) + 0.6 * Math.exp(-(((p.x - sweep) / 50) ** 2)) * (t > 69.15 && t < 69.9 ? 1 : 0);
        b.x[i] = p.x * s; b.y[i] = -150 + (p.y + 150) * s; return;
      }
      b.a[i] = p.a * (1 - 0.45 * ramp(t, 68.4, 0.4));
    });
  }

  // "Hoje, essa equipe inteira cabe na IA que já está no seu celular." — the team shrinks into a purple phone
  {
    const PH = [0, -60], S = 0.9;
    const ph = tagged(art(g => phoneArt(g, { body: PU }), S, PH[0], PH[1], { seed: 770 }), { ph: 1 });
    const ia = tagged(art(textArt('IA', 96, PU), 1, PH[0], PH[1] - 225, { seed: 771, cell: 4 }), { ia: 1 });
    const OUT = ringPos(8, 410, 380, PH[0], PH[1], -Math.PI / 2), IN = [...Array(8)].map((_, k) => [PH[0] + (k % 2 ? 62 : -62), PH[1] - 110 + Math.floor(k / 2) * 92]);
    const team = []; OUT.forEach(([x, y], k) => B30.forEach(q => team.push({ ...q, x: q.x + x, y: q.y + y, rx: q.x, ry: q.y, tm: k })));
    SH.inphone = makeShape([ph, ia, hsort(team)], (t, i, p, b) => {
      if (p.tm !== undefined) {
        const q = ramp(t, 71.4 + 0.04 * p.tm, 0.6, E.inOut), s = lerp(1, 0.36, q), cx = lerp(OUT[p.tm][0], IN[p.tm][0], q), cy = lerp(OUT[p.tm][1], IN[p.tm][1], q);
        const on = dropIn(t, 70.55 + 0.05 * p.tm, 0.3); b.x[i] = cx + p.rx * s; b.y[i] = cy + p.ry * s; b.a[i] = p.a * clamp(on, 0.02); if (q > 0.6) b.t[i] = PURPLE; return;
      }
      const lit = ramp(t, 71.9, 0.4);
      if (p.ia) { const on = dropIn(t, 71.9, 0.35); b.a[i] = p.a * clamp(on, 0.02); return; }
      b.t[i] = lit > hash(i, 3) ? PURPLE : GRAY; b.a[i] = p.a * (0.6 + 0.4 * lit) + 0.35 * flash(t, 73.1, 0.15);
    });
  }

  // "Esse é o Igor, meu sócio. Ele era CLT, queria trabalhar de casa e nunca foi programador."
  {
    const ig = tagged(manAt(0, 160, 0.8, 780), { ig: 1 });
    const ic = [tagged(dotArt(badgeArt, 0.6, -320, -300, { seed: 781, cell: 4 }), { ic: 0 }), tagged(dotArt(houseArt, 0.75, 0, -330, { seed: 782, cell: 4 }), { ic: 1 }), tagged(art(textArt('</>', 120, WT), 1, 320, -320, { seed: 783, cell: 4 }), { ic: 2 })];
    const sk = tagged(art(strikeArt(200, -270, 440, -370), 1, 0, 0, { seed: 784, cell: 4 }), { sk: 1 });
    const CXS = [-320, 0, 320];
    SH.igor = makeShape([ig, ...ic, sk], (t, i, p, b) => {
      if (p.ic !== undefined) { popAt(t, i, p, b, IG_AT[p.ic], CXS[p.ic], -320); if (p.ic === 2 && ramp(t, 83.0, 0.3) > hash(i, 4)) b.t[i] = GRAY; return; }
      if (p.sk) { b.a[i] = p.x < 200 + 240 * ramp(t, 82.98, 0.3, E.cubicOut) ? p.a : 0.02; return; }
      b.a[i] = p.a + 0.2 * flash(t, 79.1, 0.2);
    });
  }

  // "Junto com Emmanuel, nosso outro sócio," — two partners
  SH.duo = makeShape([tagged(manAt(-200, 150, 0.62, 790), { who: 0 }), tagged(manAt(200, 150, 0.62, 791), { who: 1 })], (t, i, p, b) => {
    if (p.who === 1) popAt(t, i, p, b, 84.15, 200, 150);
  });

  // "ele construiu com IA o SALG, um sistema que mostra pro dono… quanto ele lucra de verdade, venda por venda."
  {
    const D = [0, -150], S = 0.85;
    const dash = tagged(art(dashArt(), S, D[0], D[1], { seed: 800 }), { ds: 1 });
    const rows = dashRows(S, D[0], D[1], 801);
    const duo = [...bustAt(B30, -160, 350, 0), ...bustAt(B30, 160, 350, 1)];
    const ia = tagged(art(textArt('IA', 110, PU), 1, 0, -500, { seed: 806, cell: 4 }), { ia: 1 });
    const th = [...Array(300)].map((_, k) => ({ th: k, x: 0, y: -440, a: 0.02, c: pick('|:·', hash(k, 2)), t: PURPLE, s: 0.45 + 0.3 * hash(k, 3) }));
    SH.salg = makeShape([dash, rows, hsort(duo), ia, th], (t, i, p, b) => {
      if (p.row !== undefined) { const on = dropIn(t, 91.7 + p.row * 0.16, 0.3); b.a[i] = p.a * clamp(on, 0.02) + 0.3 * flash(t, 91.8 + p.row * 0.16, 0.1); return; }
      if (p.ia) { const on = dropIn(t, 86.7, 0.3); b.a[i] = p.a * clamp(on, 0.02); return; }
      if (p.th !== undefined) { if (t < 86.75 || t > 87.6) { b.a[i] = 0.02; return; } const u = (hash(p.th, 4) + (t - 86.75) * 1.8) % 1; b.x[i] = (hash(p.th, 5) - 0.5) * (20 + 300 * u); b.y[i] = -440 + 90 * u; b.a[i] = Math.max(0.02, 0.85 * Math.sin(Math.PI * u)); return; }
      if (p.ds) { const vis = p.y < -354 + 420 * ramp(t, 86.2, 1.0, E.inOut); b.a[i] = vis ? p.a + 0.3 * flash(t, 87.3, 0.15) + (p.t === GREEN ? 0.45 * flash(t, 90.85, 0.25) : 0) : 0.02; return; }
      b.a[i] = p.a * 0.85;
    });
  }

  // "Sem IA, um sistema desse exigiria uma equipe inteira de programadores." — no IA: a whole grey team around it
  {
    const dash = tagged(art(dashArt(), 0.5, 0, -30, { seed: 810, cell: 4 }), { ds: 1 });
    const ia = tagged(art(textArt('IA', 120, PU), 1, 0, -330, { seed: 811, cell: 4 }), { ia: 1 });
    const sk = tagged(art(strikeArt(-120, -290, 120, -370), 1, 0, 0, { seed: 812, cell: 4 }), { sk: 1 });
    const devs = []; ringPos(16, 440, 330, 0, 40, -Math.PI / 2).forEach(([x, y], k) => { devs.push(...bustAt(BUSTD_T, x, y, k)); art(laptopArt(x, y + 46, 0.45), 1, 0, 0, { seed: 813 + k, cell: 4, nosort: true }).forEach(p => devs.push({ ...p, bk: k, bx: x, by: y })); });
    SH.noai = makeShape([dash, ia, sk, hsort(devs)], (t, i, p, b) => {
      if (p.sk) { b.a[i] = p.x < -120 + 240 * ramp(t, 92.95, 0.3, E.cubicOut) ? p.a : 0.02; return; }
      if (p.ia) { if (ramp(t, 93.05, 0.4) > hash(i, 3)) b.t[i] = GRAY; b.a[i] = p.a * 0.8; return; }
      if (p.ds) { b.a[i] = p.a * 0.8; return; }
      popAt(t, i, p, b, 95.15 + p.bk * 0.04, p.bx, p.by); b.t[i] = GRAY;
    });
  }

  // "Hoje, a gente está do outro lado. Vende o SALG por assinatura todo mês." — the SALG in gold; subscribers pay monthly
  {
    const D = [0, -180];
    const dash = tagged(art(dashArt({ gold: true }), 0.7, D[0], D[1], { seed: 820 }), { ds: 1 });
    const rows = dashRows(0.7, D[0], D[1], 821);
    const SR = [], subs = [];
    for (let k = 0; k < 9; k++) { const x = (k - 4) * 112, y = 330 + 14 * Math.abs(k - 4); SR.push([x, y - 40]); subs.push(...bustAt(B30, x, y, k)); }
    const coins = pulseCoins(SR, PUL_SUB, 12, 5);
    SH.subscr = makeShape([dash, rows, hsort(subs), coins], (t, i, p, b) => {
      if (p.cn !== undefined) return pulseLife(t, i, p, b, SR, [0, D[1] + 60], PUL_SUB, 0.6, 40);
      if (p.ds) { b.a[i] = p.a + 0.3 * flash(t, 102.25, 0.15) + 0.3 * flash(t, 103.3, 0.15) + 0.2 * PUL_SUB.reduce((s, P) => s + flash(t, P + 0.7, 0.12), 0); return; }
      if (p.row !== undefined) return;
      popAt(t, i, p, b, 103.6 + p.bk * 0.03, p.bx, p.by);
    });
  }

  // "E ele é nosso. A gente construiu uma vez e continua dono dele." — the SALG on its own gold structure; three partners in gold
  {
    const dash = tagged(art(dashArt({ gold: true }), 0.55, 0, -300, { seed: 830, cell: 4 }), { ds: 1 });
    const stk = tagged(art(stackArt(56), 1, 0, 40, { seed: 831, cell: 4, money: true }), { st: 1 });
    const three = [[-250, 310], [0, 330], [250, 310]].flatMap(([x, y], k) => bustAt(B30, x, y, k));
    SH.ours = makeShape([dash, stk, hsort(three)], (t, i, p, b) => {
      const d = flash(t, 108.1, 0.25);
      if (p.bk !== undefined) { const gd = ramp(t, 105.5 + p.bk * 0.08, 0.4); if (gd > hash(i, 5)) b.t[i] = money(hash(i, 6)); b.a[i] = p.a * (0.7 + 0.3 * gd) + 0.3 * d; return; }
      if (p.st) { b.a[i] = p.a + 0.35 * flash(t, 106.95, 0.15) + 0.3 * d; return; }
      b.a[i] = p.a + 0.3 * d;
    });
  }

  // "Agora, se isso é possível, por que tão pouca gente faz?"
  SH.why = makeShape([tagged(art(textArt('?', 440, WT), 1, 0, -200, { seed: 840, h: 1300 }), { q: 1 }), hsort([[-130, 330], [0, 345], [130, 330]].flatMap(([x, y], k) => bustAt(B30, x, y, k)))], (t, i, p, b) => {
    if (p.q) { b.y[i] = p.y - 6 * Math.sin(t * 2.2); b.a[i] = p.a + 0.25 * flash(t, 111.65, 0.2); return; }
    popAt(t, i, p, b, 110.95 + p.bk * 0.1, p.bx, p.by);
  });

  // "Com 14 anos, eu fui atrás de day trade," — a candle chart; the timeline starts
  {
    const grid = art(g => { g.strokeStyle = tone(WT, 0.22); g.lineWidth = 3; for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(-360, -200 + k * 100); g.lineTo(360, -200 + k * 100); g.stroke(); } }, 0.9, 0, -80, { seed: 850, cell: 4 });
    const cand = []; CANDLES.forEach((_, k) => art(candleOne(k), 0.9, 0, -80, { seed: 851 + k, cell: 4, nosort: true }).forEach(p => cand.push({ ...p, cd: k })));
    SH.trade = makeShape([TLP.map(p => ({ ...p })), grid, hsort(cand)], (t, i, p, b) => {
      if (p.cd !== undefined) { const on = dropIn(t, 115.6 + p.cd * 0.17, 0.3); b.a[i] = p.a * clamp(on, 0.02) + 0.3 * flash(t, 117.3, 0.15); b.y[i] = p.y + 30 * (1 - clamp(on)); return; }
      if (p.y > 300) return tlLife(t, i, p, b);
    });
  }
  // "com 16 anos, dropshipping." — a shipping box flies in
  SH.drop = makeShape([TLP.map(p => ({ ...p })), tagged(dotArt(boxArt, 1.35, 30, -120, { seed: 860 }), { bx2: 1 })], (t, i, p, b) => {
    if (p.bx2) { b.x[i] = p.x + 6 * Math.sin(t * 2); b.y[i] = p.y + 4 * Math.sin(t * 2.4); return; }
    tlLife(t, i, p, b);
  });
  // "Depois, qualquer coisa nova que aparecesse prometendo dinheiro na internet." — promises pop everywhere, each with a $
  {
    const pts = [];
    HY_POS.forEach(([x, y], k) => dotArt(HYPE_ART[k % 4], 0.42, x, y, { seed: 870 + k, cell: 4, nosort: true }).forEach(p => pts.push({ ...p, hy: k })));
    const dl = []; HY_POS.forEach(([x, y], k) => art(textArt('$', 70, GD), 1, x + 70, y - 70, { seed: 880 + k, cell: 4, nosort: true, money: true }).forEach(p => dl.push({ ...p, hdk: k })));
    SH.hype = makeShape([TLP.map(p => ({ ...p })), hsort(pts), hsort(dl)], (t, i, p, b) => {
      if (p.hy !== undefined) { popAt(t, i, p, b, 119.35 + p.hy * 0.28, HY_POS[p.hy][0], HY_POS[p.hy][1]); b.y[i] += 5 * Math.sin(t * 2 + p.hy); return; }
      if (p.hdk !== undefined) { popAt(t, i, p, b, 121.7 + p.hdk * 0.08, HY_POS[p.hdk][0] + 70, HY_POS[p.hdk][1] - 70); return; }
      tlLife(t, i, p, b);
    });
  }

  // "Eu vivia com os olhos no mesmo lugar que todo mundo, no que estava dando dinheiro naquele momento." — every eye turns to one $
  {
    const DL = [0, -430], lids = [], iris = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) { const x = (c - 1) * 300, y = -40 + r * 200, k = r * 3 + c; const dd = Math.hypot(DL[0] - x, DL[1] - y), ox = (DL[0] - x) / dd * 40, oy = (DL[1] - y) / dd * 40; dotArt(lidArt(ox, oy), 0.62, x, y, { seed: 890 + k, cell: 4, nosort: true }).forEach(p => lids.push({ ...p, ek: k })); dotArt(irisArt(ox, oy), 0.62, x, y, { seed: 910 + k, cell: 4, nosort: true }).forEach(p => iris.push({ ...p, ex: x, ey: y })); }
    const dl = tagged(art(textArt('$', 200, GD), 1, DL[0], DL[1], { seed: 930, money: true }), { dl: 1 });
    SH.eyes = makeShape([hsort(lids), hsort(iris), dl], (t, i, p, b) => {
      if (p.dl) { b.a[i] = p.a + 0.4 * flash(t, 126.85, 0.2); return; }
      if (p.ex !== undefined) { const look = ramp(t, 124.2, 0.4, E.cubicOut), dx = DL[0] - p.ex, dy = DL[1] - p.ey, d = Math.hypot(dx, dy); b.x[i] = p.x - (dx / d) * 18 * (1 - look); b.y[i] = p.y - (dy / d) * 18 * (1 - look); }
    });
  }

  // "Quando eu chegava lá, milhares de pessoas já estavam fazendo a mesma coisa." — I arrive; the crowd is already around the $
  {
    const pts = []; let k = 0;
    [[26, 205, 140], [38, 305, 208], [48, 410, 282]].forEach(([n, rx, ry], ri) => { for (let j = 0; j < n; j++) { const a = (j / n) * 2 * Math.PI + ri * 0.3; pts.push(...bustAt(BUSTD_T, rx * Math.cos(a), 30 + ry * Math.sin(a), k++)); } });
    const dl = tagged(art(textArt('$', 220, GD), 1, 0, 20, { seed: 940, money: true }), { dl: 1 });
    const me = tagged(manAt(0, 0, 0.34, 941), { me: 1 });
    SH.late = makeShape([hsort(pts), dl, me], (t, i, p, b) => {
      if (p.me) { const q = ramp(t, 129.45, 0.65, E.cubicOut); b.x[i] = p.x + lerp(600, 470, q); b.y[i] = p.y + 380; b.a[i] = p.a * clamp(q * 2, 0.02); return; }
      if (p.dl) return;
      const on = ramp(t, 130.4 + 0.0012 * Math.hypot(p.bx, p.by), 0.25); b.a[i] = p.a * clamp(on, 0.02) * 0.85; b.t[i] = GRAY;
    });
  }

  // "Aí aparecia outra novidade e eu começava de novo do zero." — progress fills, a NOVO tag appears, the bar snaps back to zero
  {
    const W2 = 760, BY = 120;
    const out = tagged(art(barArt(W2), 1, 0, BY, { seed: 950, cell: 4 }), { bo: 1 }), fill = tagged(art(barFill(W2, OR), 1, 0, BY, { seed: 951, cell: 4 }), { bf: 1 });
    const tag = tagged(art(novoTag(1), 1, 0, -260, { seed: 952, cell: 4 }), { tg: 1 });
    const me = [...bustAt(B30, 0, 340, 0)];
    SH.restart = makeShape([out, fill, tag, hsort(me)], (t, i, p, b) => {
      if (p.bf) { b.a[i] = p.x < -W2 / 2 + 12 + (W2 - 24) * barF(t) ? p.a : 0.02; if (t > 135.5) b.t[i] = RED; return; }
      if (p.bo) { if (flash(t, 136.0, 0.3) > hash(i, 3)) b.t[i] = RED; return; }
      if (p.tg) { popAt(t, i, p, b, 134.05, 0, -260, 0.35, 0.6); b.y[i] += 8 * Math.sin(t * 3); return; }
    });
  }

  // "Eu achava que estava evoluindo… só que eu acumulava informação e nenhuma me dava dinheiro." — a growing stack; the $ stays empty
  {
    const cards = [];
    for (let k = 0; k < 12; k++) dotArt(g => { const y = 150 - k * 34, x = 10 * Math.sin(k * 1.7); g.fillStyle = LG(g, x - 150, y, x + 150, y, [[0, tone(WT, 0.45)], [0.5, tone(WT, 0.95)], [1, tone(WT, 0.42)]]); RR(g, x - 150, y - 14, 300, 28, 6); g.fill(); }, 1.1, -130, 20, { seed: 960 + k, cell: 4, nosort: true }).forEach(p => cards.push({ ...p, ck: k }));
    const dl = tagged(art(textArt('$', 230, WT), 1, 280, -60, { seed: 975 }), { dl: 1 });
    SH.learn = makeShape([hsort(cards), dl], (t, i, p, b) => {
      if (p.dl) { b.t[i] = flash(t, 142.35, 0.35) > hash(i, 4) ? RED : GRAY; b.a[i] = p.a * 0.55; return; }
      const at = 137.1 + p.ck * 0.2, on = dropIn(t, at, 0.3); b.a[i] = p.a * clamp((t - at) / 0.1, 0.02); b.y[i] = p.y - 60 * (1 - clamp(on)) ; b.x[i] = p.x + 6 * Math.sin(t * 1.6 + p.ck) * ramp(t, 140.3, 0.6);
    });
  }

  // "Eu sabia um pouco de tudo e não tinha nada que fosse meu." — fragments orbit; in the middle, the dashed outline of nothing
  {
    const ghost = tagged(art(ghostArt, 1.1, 0, -20, { seed: 980 }), { gh: 1 });
    const frag = []; for (let k = 0; k < 14; k++) art(cardSmall, 1, 0, 0, { seed: 981 + k, cell: 4, nosort: true }).forEach(p => frag.push({ ...p, fk: k, rx: p.x, ry: p.y, x: 400 * Math.cos(k / 14 * 6.283), y: -20 + 330 * Math.sin(k / 14 * 6.283) }));
    SH.nothing = makeShape([ghost, hsort(frag)], (t, i, p, b) => {
      if (p.gh) { b.a[i] = p.a * (0.55 + 0.3 * Math.sin(t * 3)); b.t[i] = ramp(t, 144.55, 0.4) * 0.5 > hash(i, 3) ? RED : GRAY; return; }
      const a = p.fk / 14 * 6.283 + 0.25 * (t - 142.75), sp = a * 1.7; b.x[i] = 400 * Math.cos(a) + p.rx * Math.cos(sp) - p.ry * Math.sin(sp); b.y[i] = -20 + 330 * Math.sin(a) + p.rx * Math.sin(sp) + p.ry * Math.cos(sp); b.a[i] = p.a * 0.8;
    });
  }

  // "Sabe aquela armadilha de passarinho? A comida fica embaixo. O passarinho entra pra comer e fica preso."
  const ground = tagged(art(g => { g.fillStyle = tone(WT, 0.45); RR(g, -480, 212, 960, 8, 4); g.fill(); }, 1, 0, 0, { seed: 990, cell: 4 }), { gr: 1 });
  const crate = tagged(dotArt(crateArt, 1, 0, 60, { seed: 991 }), { cr: 1 });
  const stick = tagged(art(g => { g.strokeStyle = LG(g, 0, 50, 0, 205, [[0, tone(WT, 0.95)], [1, tone(WT, 0.5)]]); g.lineWidth = 14; g.beginPath(); g.moveTo(140, 205); g.lineTo(130, 52); g.stroke(); g.strokeStyle = tone(WT, 0.55); g.lineWidth = 4; g.beginPath(); g.moveTo(136, 130); g.quadraticCurveTo(320, 230, 520, 205); g.stroke(); }, 1, 0, 0, { seed: 992, cell: 4 }), { sk2: 1 });
  {
    const seeds = tagged(dotArt(seedArt, 1, 0, 0, { seed: 993, cell: 4, ids: true }), { sd: 1 });
    const bird = tagged(dotArt(birdArt(0.8), 1, 0, 0, { seed: 994, cell: 4 }), { bd: 1 });
    SH.trap = makeShape([ground, crate.map(p => ({ ...p })), stick.map(p => ({ ...p })), seeds, bird], (t, i, p, b) => {
      const fall = ramp(t, 155.86, 0.2, E.quadIn), a = A0 * (1 - fall);
      if (p.cr) { rot(b, i, p, HINGE[0], HINGE[1], a); return; }
      if (p.sk2) { rot(b, i, p, 140, 205, 1.3 * ramp(t, 155.86, 0.3, E.quadIn)); b.a[i] = p.a * (1 - 0.7 * fall); return; }
      if (p.sd) { b.a[i] = p.a + 0.5 * flash(t, 153.3, 0.2); return; }
      if (p.bd) {
        const on = ramp(t, 152.4, 0.3), w = ramp(t, 154.9, 0.75, E.inOut), x = lerp(460, 50, w), hop = (t > 154.9 && t < 155.65) ? 16 * Math.abs(Math.sin((t - 154.9) * 13)) : 0;
        b.x[i] = p.x + x; b.y[i] = p.y + 157 - hop; b.a[i] = t > 155.95 ? 0.02 : p.a * clamp(on, 0.02); return;
      }
    });
  }
  // "Na internet, a comida é a novidade." — the same trap; under it now, a NOVO tag
  SH.bait = makeShape([ground, crate.map(p => ({ ...p })), stick.map(p => ({ ...p })), tagged(art(novoTag(0.8), 1, 40, 166, { seed: 995, cell: 4 }), { tg: 1 })], (t, i, p, b) => {
    if (p.cr) { rot(b, i, p, HINGE[0], HINGE[1], A0); return; }
    if (p.tg) { b.a[i] = p.a * (0.8 + 0.2 * Math.sin(t * 5)) + 0.4 * flash(t, 158.3, 0.2); return; }
  });

  // "E com a IA, essa armadilha é ainda pior. Toda semana aparece uma ferramenta nova… e o que você aprendeu fica velho."
  {
    const ia = tagged(art(textArt('IA', 150, PU), 1, 0, -470, { seed: 1000, cell: 4 }), { ia: 1 });
    const cards = []; TOOL_POS.forEach(([x, y], k) => art(toolArt, 0.62, x, y, { seed: 1001 + k, cell: 4, nosort: true }).forEach(p => cards.push({ ...p, tk: k })));
    SH.tools = makeShape([ia, hsort(cards)], (t, i, p, b) => {
      if (p.ia) { b.a[i] = p.a + 0.35 * flash(t, 160.9, 0.25); if (flash(t, 160.9, 0.3) > hash(i, 2) + 0.3) b.t[i] = RED; return; }
      const k = p.tk, [cx, cy] = TOOL_POS[k]; popAt(t, i, p, b, TOOL_AT[k], cx, cy);
      const old = Math.max(k < 5 ? ramp(t, TOOL_AT[k + 1], 0.3) : 0, ramp(t, 166.24 + 0.05 * k, 0.4));
      if (old > hash(i, 6)) b.t[i] = GRAY; b.a[i] *= 1 - 0.15 * old; b.y[i] += 14 * old;
    });
  }

  // "Quem armou essa armadilha foi quem vive de te mostrar o que é novo." — a big screen in a spotlight; NOVO on its corner
  {
    const scr = art(screenArt(), 1.2, 0, -90, { seed: 1010 });
    const cone = [...Array(900)].map((_, k) => { const v = hash(k, 1), w = (hash(k, 2) - 0.5) * 2; return { cone: 1, x: w * lerp(40, 420, v), y: -600 + 380 * v, a: 0.14 + 0.12 * hash(k, 3), c: pick('.·:', hash(k, 4)), t: WHITE, s: 0.45 }; });
    const tag = tagged(art(novoTag(0.9), 1, 290, -320, { seed: 1011, cell: 4 }), { tg: 1 });
    SH.showman = makeShape([scr, hsort(cone), tag], (t, i, p, b) => {
      if (p.tg) { popAt(t, i, p, b, 170.05, 290, -320, 0.35, 0.6); return; }
      if (p.cone) { b.a[i] = p.a * (0.7 + 0.3 * Math.sin(t * 2 + p.x * 0.01)); return; }
    });
  }

  // "Essa gente ganha dinheiro com o tempo que você passa assistindo. Você não." — the hourglass runs; its time turns into their coins
  {
    const HG = [-250, 0], S = 0.55;
    const frame = dotArt(hgFrame, S, HG[0], HG[1], { seed: 1020, cell: 4 }), sand = tagged(dotArt(hgSand, S, HG[0], HG[1], { seed: 1021, cell: 4 }), { sand: 1 });
    const scr = tagged(art(screenArt(), 0.5, 250, -300, { seed: 1022, cell: 4 }), { scr: 1 });
    const viewer = tagged(manAt(180, 300, 0.45, 1023), { vw: 1 });
    const coins = coinGlyphs(500, 6);
    SH.watch = makeShape([frame, sand, scr, viewer, coins], (t, i, p, b) => {
      if (p.cn !== undefined) { if (t < 171.3) { b.a[i] = 0.02; return; } const u = ((t - 171.3) * 0.9 + hash(p.cn, 6)) % 1; flowTo(b, i, HG[0], HG[1] + 150, 250, -250, u, 160, 26, p.cn); b.a[i] = Math.max(0.02, 0.85 * Math.sin(Math.PI * u) * ramp(t, 171.3, 0.3)); return; }
      if (p.sand) { const u = ramp(t, 170.6, 3.6, E.lin), ly = (p.y - HG[1]) / S; const on = ly < 0 ? ly > -270 + 262 * u : ly > 292 - 250 * u * (1 - 0.55 * Math.pow((p.x - HG[0]) / S / 120, 2)); b.a[i] = on ? p.a : 0.02; return; }
      if (p.scr) { b.a[i] = p.a + 0.2 * Math.sin(t * 6) * ramp(t, 171.3, 0.3); return; }
      if (p.vw) { const no = ramp(t, 173.65, 0.4); b.t[i] = no * 0.6 > hash(i, 4) ? RED : GRAY; b.a[i] = p.a * (0.75 + 0.3 * flash(t, 173.8, 0.15)); return; }
    });
  }

  // "o melhor é você nunca construir nada e voltar todo dia atrás da próxima novidade." — caught in a loop; the block never gets built
  {
    const me = tagged(manAt(0, 30, 0.45, 1030), { me: 1 });
    const lp = tagged(dotArt(loopArt, 0.95, 0, 40, { seed: 1031 }), { lp: 1 });
    const blk = tagged(art(g => cube(g, 0, 0, 44, 0.9), 1, 0, 360, { seed: 1032, cell: 4, tint: GRAY }), { blk: 1 });
    const sk = tagged(art(strikeArt(-80, 440, 80, 330, 10), 1, 0, 0, { seed: 1033, cell: 4 }), { sk: 1 });
    const tag = tagged(art(novoTag(0.85), 1, 0, -370, { seed: 1034, cell: 4 }), { tg: 1 });
    SH.loopx = makeShape([me, lp, blk, sk, tag], (t, i, p, b) => {
      if (p.lp) { const a = 1.2 * (t - 174.5) + 2.6 * Math.max(0, t - 177.7); rot(b, i, p, 0, 40, a); return; }
      if (p.blk) { b.a[i] = p.a * 0.6; return; }
      if (p.sk) { b.a[i] = p.x < -80 + 160 * ramp(t, 177.05, 0.3) ? p.a : 0.02; return; }
      if (p.tg) { popAt(t, i, p, b, 179.65, 0, -370, 0.35, 0.6); return; }
      b.t[i] = GRAY;
    });
  }

  // "Talvez você nunca tenha nem começado. Ou começou, se empolgou na primeira semana e parou."
  {
    const W2 = 760, BY = 40;
    const out = tagged(art(barArt(W2), 1, 0, BY, { seed: 1040, cell: 4 }), { bo: 1 }), fill = tagged(art(barFill(W2, OR), 1, 0, BY, { seed: 1041, cell: 4 }), { bf: 1 });
    const me = bustAt(B30, 0, 290, 0);
    SH.start = makeShape([out, fill, hsort(me)], (t, i, p, b) => {
      if (p.bf) { b.a[i] = p.x < -W2 / 2 + 12 + (W2 - 24) * startF(t) ? p.a : 0.02; if (t > 185.4) b.t[i] = RED; return; }
      if (p.bo) { b.a[i] = p.a * (t < 183.2 ? 0.55 + 0.35 * Math.abs(Math.sin(t * 3)) : 0.9); return; }
    });
  }

  // "E sobrou aquela voz dizendo que o problema era você." — a red speech bubble over a grey head
  SH.voice = makeShape([tagged(manAt(0, 180, 0.62, 1050), { me: 1 }), tagged(art(redBubble(660, 130), 1, 0, -230, { seed: 1051, cell: 4 }), { bb: 1 })], (t, i, p, b) => {
    if (p.bb) { popAt(t, i, p, b, 186.5, 0, -230, 0.3, 0.7); return; }
    b.t[i] = ramp(t, 188.45, 0.4) * 0.45 > hash(i, 4) ? RED : GRAY;
  });

  // "Você estava sozinho. Com o vídeo feito pra você assistir. Não pra você construir." — alone in a spotlight, a screen, a block not built
  {
    const cone = [...Array(1300)].map((_, k) => { const v = hash(k, 1), w = (hash(k, 2) - 0.5) * 2; return { cone: 1, x: w * lerp(30, 300, v), y: -620 + 1000 * v, a: 0.1 + 0.12 * hash(k, 3), c: pick('.·:', hash(k, 4)), t: WHITE, s: 0.45 }; });
    const me = tagged(manAt(0, 250, 0.45, 1060), { me: 1 });
    const scr = tagged(art(screenArt(), 0.55, 0, -260, { seed: 1061, cell: 4 }), { scr: 1 });
    const blk = tagged(art(g => { g.strokeStyle = tone(OR, 0.9); g.lineWidth = 5; g.setLineDash([12, 9]); poly(g, [[0, -50], [60, -20], [0, 10], [-60, -20]]); g.stroke(); poly(g, [[-60, -20], [-60, 50], [0, 80], [60, 50], [60, -20]]); g.stroke(); g.beginPath(); g.moveTo(0, 10); g.lineTo(0, 80); g.stroke(); g.setLineDash([]); }, 1, 320, 330, { seed: 1062, cell: 4 }), { blk: 1 });
    SH.alone = makeShape([hsort(cone), me, scr, blk], (t, i, p, b) => {
      if (p.scr) { popAt(t, i, p, b, 190.9, 0, -260); return; }
      if (p.blk) { const on = ramp(t, 193.2, 0.3); b.a[i] = p.a * clamp(on * (0.5 + 0.3 * Math.sin(t * 4)), 0.02); return; }
      if (p.cone) { b.a[i] = p.a * (0.8 + 0.2 * Math.sin(t * 1.5 + p.y * 0.01)); return; }
    });
  }

  // "Assim, quase ninguém começa. E quem começa quase nunca chega ao fim." — a path to a flag; almost nobody leaves the start, nobody arrives
  {
    const path = art(g => { g.fillStyle = tone(WT, 0.5); RR(g, -440, 168, 880, 8, 4); g.fill(); }, 1, 0, 0, { seed: 1070, cell: 4 });
    const flag = tagged(art(flagArt, 1, 430, 170, { seed: 1071, cell: 4 }), { fg: 1 });
    const crowd = []; for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) crowd.push(...bustAt(BUSTD_T, -460 + c * 30 + (r % 2) * 14, 40 + r * 34, r * 6 + c));
    SH.path = makeShape([path, flag, hsort(crowd)], (t, i, p, b) => {
      if (p.fg) { b.a[i] = p.a + 0.2 * Math.sin(t * 3); return; }
      if (p.bk === undefined) return;
      const mv = MOVERS.findIndex(([k]) => k === p.bk);
      if (mv < 0) { b.t[i] = GRAY; b.a[i] = p.a * 0.7; return; }
      const [, dist] = MOVERS[mv], q = E.cubicOut(ramp(t, 195.4 + mv * 0.12, 1.5)), stop = ramp(t, 196.35 + mv * 0.15, 0.4);
      b.x[i] = p.x + dist * q; b.y[i] = p.y + (128 - (p.by - 40)) * Math.min(1, q * 4) - 4 * Math.abs(Math.sin(t * 9)) * (1 - stop);
      if (stop > hash(i, 5)) b.t[i] = RED; b.a[i] = p.a * (1 - 0.5 * stop);
    });
  }

  // "E você deve ter visto muito vídeo de 'Ganhe dinheiro com IA' mostrando carro e print de faturamento. E nunca mostrando como chegar lá."
  {
    const ph = tagged(art(g => phoneArt(g, { screen: g2 => { g2.fillStyle = tone(BL, 0.4); RR(g2, -150, -300, 300, 180, 20); g2.fill(); } }), 0.75, 0, -60, { seed: 1080 }), { ph: 1 });
    const car = tagged(dotArt(carArt, 0.48, 0, 340, { seed: 1081, cell: 4, money: true }), { car: 1 });
    const pr = tagged(art(printArt, 0.5, 330, -250, { seed: 1082, cell: 4 }), { pr: 1 });
    const q = tagged(art(textArt('?', 230, WT), 1, -320, -250, { seed: 1083, cell: 4 }), { q: 1 });
    SH.flex = makeShape([ph, car, pr, q], (t, i, p, b) => {
      if (p.car) { popAt(t, i, p, b, 201.35, 0, 340); return; }
      if (p.pr) { popAt(t, i, p, b, 201.95, 330, -250); return; }
      if (p.q) { popAt(t, i, p, b, 204.1, -320, -250, 0.35, 0.6); b.t[i] = ramp(t, 204.5, 0.5) * 0.5 > hash(i, 3) ? RED : WHITE; return; }
    });
  }

  // "Você estava num jogo feito pra você nunca sair do lugar." — a hamster wheel; the runner never gets anywhere
  {
    const C = [0, -60], S = 0.9;
    const stand = dotArt(standArt, S, C[0], C[1], { seed: 1090, cell: 4 });
    const wheel = tagged(dotArt(wheelArt, S, C[0], C[1], { seed: 1091 }), { wh: 1 });
    const run = tagged(manT(1, 1092, { k: 0.55 * S, base: 70 * S + 111, view: 'side', pose: 'run' }), { rn: 1 });
    SH.wheel = makeShape([stand, wheel, run], (t, i, p, b) => {
      if (p.wh) { const a = 2.0 * (t - 205.1) + 3.2 * Math.max(0, t - 207.15) ** 1.2; rot(b, i, p, C[0], C[1], a); return; }
      if (p.rn) return;
      b.t[i] = GRAY;
    });
  }

  // "A minha vida só mudou quando eu fiz o contrário. Parei de pular de galho em galho." — the bird hops branch to branch, then stops
  SH.branches = makeShape([dotArt(branchArt, 1, 0, 0, { seed: 1100 }), tagged(art(birdArt(0.62), 1, 0, 0, { seed: 1101, cell: 4 }), { bd: 1 })], (t, i, p, b) => {
    if (!p.bd) { b.t[i] = GRAY; b.a[i] = p.a * 0.85; return; }
    const [x, y, dir] = birdAt(t); b.x[i] = x + p.x * dir; b.y[i] = y + p.y;
  });

  // "E fui olhar pra onde a maioria não estava olhando." — the crowd stares at NOVO; I look the other way, where a purple glint appears
  {
    const crowd = []; for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) crowd.push(...bustAt(BUSTD_T, -470 + c * 62 + (r % 2) * 20, -20 + r * 80, r * 6 + c));
    const tag = tagged(art(novoTag(0.9), 1, -330, -360, { seed: 1110, cell: 4 }), { tg: 1 });
    const me = tagged(manAt(250, 200, 0.4, 1111), { me: 1 });
    const sight = [...dotted(-300, 60, -330, -300, 40, { s1: 1 }, GRAY), ...dotted(270, 150, 400, -210, 40, { s2: 1 })];
    const glint = [...Array(500)].map((_, k) => { const a = hash(k, 1) * 6.283, r = 70 * Math.sqrt(hash(k, 2)); return { gl: k, x: 400 + r * Math.cos(a), y: -270 + r * Math.sin(a), a: 0.85, c: pick('*+·', hash(k, 3)), t: PURPLE, s: 0.45 + 0.3 * hash(k, 4) }; });
    SH.look = makeShape([hsort(crowd), tag, me, sight, glint], (t, i, p, b) => {
      if (p.s1) { b.a[i] = p.a * clamp(ramp(t, 217.5, 0.4) * 1, 0.02); return; }
      if (p.s2) { b.a[i] = p.a * clamp(ramp(t, 218.9, 0.5), 0.02); return; }
      if (p.gl !== undefined) { b.a[i] = Math.max(0.02, ramp(t, 219.3 + 0.4 * hash(p.gl, 5), 0.3) * (0.5 + 0.5 * Math.sin(t * 8 + p.gl))); return; }
      if (p.tg) { b.a[i] = p.a * (0.85 + 0.15 * Math.sin(t * 5)); return; }
      if (p.bk !== undefined) { b.t[i] = GRAY; b.a[i] = p.a * 0.75; return; }
    });
  }

  // "A informação que todo mundo tem não dá dinheiro pra ninguém. O que dá dinheiro é a que pouca gente percebeu."
  {
    const docs = []; for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) art(docArt, 1, (c - 1.5) * 210, -280 + r * 150, { seed: 1120 + r * 4 + c, cell: 4, nosort: true }).forEach(p => docs.push({ ...p, dc: r * 4 + c }));
    const hid = tagged(art(docArt, 1, 0, 0, { seed: 1140, cell: 4 }), { hid: 1 });
    const dl = tagged(art(textArt('$', 90, GD), 1, 0, 0, { seed: 1141, cell: 4, money: true }), { hdl: 1 });
    SH.info = makeShape([hsort(docs), hid, dl], (t, i, p, b) => {
      const go = ramp(t, 226.2, 0.6, E.inOut), HX = lerp(330, 0, go), HY = lerp(330, 330, go), S = lerp(0.8, 1.7, go);
      if (p.hid) { b.x[i] = HX + p.x * S; b.y[i] = HY + p.y * S; b.t[i] = go > 0.5 ? (money(hash(i, 3))) : PURPLE; b.a[i] = p.a * (0.35 + 0.65 * go) + 0.4 * flash(t, 226.9, 0.2); return; }
      if (p.hdl) { const on = dropIn(t, 226.8, 0.3); b.x[i] = HX + p.x * S; b.y[i] = HY - 130 + p.y; b.a[i] = p.a * clamp(on, 0.02); return; }
      const dim = ramp(t, 223.2, 0.6); b.t[i] = GRAY; b.a[i] = p.a * (0.85 - 0.35 * dim - 0.2 * go); if (flash(t, 224.5, 0.25) > hash(i, 9) + 0.4) b.t[i] = RED;
    });
  }

  // "E o meu resultado também deixou de ser o da multidão." — a row of short grey bars; one gold bar rises far above them
  {
    const bars = []; for (let k = 0; k < 13; k++) { const x = -470 + k * 66, h = 70 + 60 * hash(k, 3); art(g => { g.fillStyle = LG(g, x - 22, 0, x + 22, 0, [[0, tone(WT, 0.4)], [0.5, tone(WT, 0.85)], [1, tone(WT, 0.4)]]); g.fillRect(x - 22, 300 - h, 44, h); }, 1, 0, 0, { seed: 1150 + k, cell: 4, nosort: true }).forEach(p => bars.push({ ...p, br: k })); }
    const gold = tagged(art(g => { g.fillStyle = LG(g, 380, 0, 460, 0, [[0, tone(GD, 0.55)], [0.5, tone(GD, 1)], [1, tone(GD, 0.5)]]); g.fillRect(380, -300, 80, 600); }, 1, 0, 0, { seed: 1170, cell: 4, money: true, h: 1300 }), { gb: 1 });
    const base = art(g => { g.fillStyle = tone(WT, 0.5); RR(g, -500, 302, 1000, 6, 3); g.fill(); }, 1, 0, 0, { seed: 1171, cell: 4 });
    SH.result = makeShape([hsort(bars), gold, base], (t, i, p, b) => {
      if (p.gb) { const lvl = 300 - 600 * ramp(t, 227.8, 1.3, E.backOut); b.a[i] = p.y > lvl ? p.a + 0.3 * flash(t, 229.1, 0.2) : 0.02; return; }
      if (p.br !== undefined) { b.t[i] = GRAY; b.a[i] = p.a * (0.85 - 0.35 * ramp(t, 229.8, 0.5)); }
    });
  }

  // "É isso que acontece com quem entende o jogo de verdade." — a pawn, crowned
  SH.game = makeShape([dotArt(boardIsoArt, 1, 0, 300, { seed: 1180, cell: 4 }), dotArt(pawnArt, 0.95, 0, 30, { seed: 1181 }), tagged(dotArt(crownArt, 1, 0, -230, { seed: 1182, cell: 4 }), { cr2: 1 })], (t, i, p, b) => {
    if (!p.cr2) return;
    const on = dropIn(t, 232.3, 0.35); b.a[i] = p.a * clamp(on, 0.02); b.y[i] = p.y - 90 * (1 - clamp(on));
  });

  // "E com a IA, a história se repete. Todo mundo olhando pra ela. E só um grupo pequeno vendo o que dá pra construir com ela."
  {
    const ia = tagged(art(textArt('IA', 230, PU), 1, 0, -360, { seed: 1190 }), { ia: 1 });
    const crowd = crowd3Pts(CROWD3.filter((_, k) => k >= 9));
    const g7r = []; for (let k = 0; k < 7; k++) FULL_T.forEach(p => g7r.push({ ...p, rsc: 0.6, x: p.x * 0.6 + G7X(k) * 0.8, y: p.y * 0.6 + 360 + 8 * Math.abs(k - 3), s: p.s * 0.75, g7: k, bx: G7X(k) * 0.8, by: 360 }));
    const stk = tagged(dotArt(stackArt(34), 1, 0, 150, { seed: 1191 }), { st: 1 });
    SH.repeat = makeShape([ia, hsort(crowd), hsort(g7r), stk], (t, i, p, b) => {
      if (p.ia) { b.a[i] = p.a + 0.3 * flash(t, 233.8, 0.2); return; }
      if (p.g7 !== undefined) { popAt(t, i, p, b, 237.0 + p.g7 * 0.05, p.bx, p.by); return; }
      if (p.st) { const on = dropIn(t, 238.75, 0.35); b.a[i] = p.a * clamp(on, 0.02); b.t[i] = ramp(t, 239.2, 0.4) > hash(i, 3) ? money(hash(i, 4)) : ORANGE; return; }
      const d = place3(b, i, p, { x: 0.15 * Math.sin((t - 233.2) * 0.5), z: -0.35 + 0.15 * ramp(t, 233.2, 6, E.inOut) }, 6 * ramp(t, 235.3, 0.5)), far = 0.35 + 0.65 * clamp(2.2 / d - 0.15);
      if (p.ic !== undefined) { b.a[i] = Math.max(0.02, p.a * far * ramp(t, 235.3, 0.4)); return; }
      b.t[i] = GRAY; b.a[i] = p.a * far * (0.7 + 0.25 * ramp(t, 235.3, 0.5));
    });
  }
}

// timeline keys for blocks 2–4 (glow: `g` = colour amounts while the shape is on)
const KEYS2 = [
  { t: 35.55, s: 'void', d: 0.45, st: 0.25, e: 'quadIn', sw: 0, dl: 'random' },
  { t: 41.4, s: 'subs', d: 0.7, st: 0.35, e: 'expoOut', sw: 80, dl: 'radial', g: { blue: 0.6, gold: 0.3 } },
  { t: 45.55, s: 'owner', d: 0.8, st: 0.3, e: 'inOut', sw: 80, dl: 'radial', g: { gold: 0.7 } },
  { t: 49.25, s: 'onetime', d: 0.7, st: 0.3, e: 'expoOut', sw: 80, dl: 'radial', g: { gold: 0.35 } },
  { t: 51.7, s: 'void', d: 0.45, st: 0.25, e: 'quadIn', sw: 0, dl: 'random' },
  { t: 54.4, s: 'tower', d: 0.8, st: 0.35, e: 'expoOut', sw: 60, dl: 'bottom', g: { blue: 0.4 } },
  { t: 57.25, s: 'smallapp', d: 0.7, st: 0.3, e: 'expoOut', sw: 80, dl: 'radial', g: { orange: 0.5, gold: 0.3 } },
  { t: 61.65, s: 'team', d: 0.7, st: 0.3, e: 'expoOut', sw: 80, dl: 'radial', g: { orange: 0.2, gold: 0.3 } },
  { t: 66.15, s: 'price', d: 0.7, st: 0.3, e: 'expoOut', sw: 80, dl: 'radial', g: { gold: 0.75 } },
  { t: 69.95, s: 'inphone', d: 0.8, st: 0.3, e: 'expoOut', sw: 80, dl: 'radial', g: { purple: 0.8 } },
  { t: 73.55, s: 'void', d: 0.45, st: 0.25, e: 'quadIn', sw: 0, dl: 'random' },
  { t: 78.35, s: 'igor', d: 0.7, st: 0.3, e: 'expoOut', sw: 60, dl: 'radial', g: {} },
  { t: 83.65, s: 'duo', d: 0.6, st: 0.25, e: 'inOut', sw: 50, dl: 'radial', g: {} },
  { t: 85.85, s: 'salg', d: 0.8, st: 0.3, e: 'expoOut', sw: 80, dl: 'radial', g: { purple: 0.3, green: 0.5 } },
  { t: 92.65, s: 'noai', d: 0.7, st: 0.3, e: 'expoOut', sw: 80, dl: 'radial', g: { red: 0.3 } },
  { t: 96.8, s: 'void', d: 0.45, st: 0.25, e: 'quadIn', sw: 0, dl: 'random' },
  { t: 100.95, s: 'subscr', d: 0.8, st: 0.3, e: 'expoOut', sw: 80, dl: 'radial', g: { gold: 0.7 } },
  { t: 104.95, s: 'ours', d: 0.7, st: 0.3, e: 'inOut', sw: 70, dl: 'radial', g: { gold: 0.8, green: 0.2 } },
  { t: 108.8, s: 'why', d: 0.7, st: 0.3, e: 'expoOut', sw: 90, dl: 'radial', g: {} },
  { t: 112.0, s: 'void', d: 0.45, st: 0.25, e: 'quadIn', sw: 0, dl: 'random' },
  { t: 115.3, s: 'trade', d: 0.6, st: 0.3, e: 'expoOut', sw: 60, dl: 'radial', g: { red: 0.25, green: 0.25 } },
  { t: 117.75, s: 'drop', d: 0.55, st: 0.25, e: 'expoOut', sw: 70, dl: 'radial', g: {} },
  { t: 119.2, s: 'hype', d: 0.6, st: 0.3, e: 'expoOut', sw: 80, dl: 'radial', g: { gold: 0.3 } },
  { t: 123.45, s: 'eyes', d: 0.7, st: 0.3, e: 'expoOut', sw: 70, dl: 'radial', g: { gold: 0.35 } },
  { t: 128.15, s: 'late', d: 0.7, st: 0.3, e: 'inOut', sw: 60, dl: 'radial', g: { gold: 0.3 } },
  { t: 133.15, s: 'restart', d: 0.6, st: 0.3, e: 'expoOut', sw: 70, dl: 'radial', g: { orange: 0.4 } },
  { t: 136.45, s: 'learn', d: 0.6, st: 0.3, e: 'expoOut', sw: 70, dl: 'radial', g: {} },
  { t: 142.75, s: 'nothing', d: 0.7, st: 0.3, e: 'inOut', sw: 70, dl: 'radial', g: { red: 0.2 } },
  { t: 145.57, s: 'void', d: 0.45, st: 0.25, e: 'quadIn', sw: 0, dl: 'random' },
  { t: 151.3, s: 'trap', d: 0.7, st: 0.3, e: 'expoOut', sw: 60, dl: 'bottom', g: {} },
  { t: 156.5, s: 'bait', d: 0.6, st: 0.25, e: 'inOut', sw: 40, dl: 'radial', g: { gold: 0.4 } },
  { t: 158.8, s: 'tools', d: 0.7, st: 0.3, e: 'expoOut', sw: 80, dl: 'radial', g: { purple: 0.6 } },
  { t: 166.85, s: 'showman', d: 0.7, st: 0.3, e: 'expoOut', sw: 80, dl: 'radial', g: { blue: 0.5 } },
  { t: 170.4, s: 'watch', d: 0.7, st: 0.3, e: 'expoOut', sw: 80, dl: 'radial', g: { gold: 0.3, blue: 0.2 } },
  { t: 174.5, s: 'loopx', d: 0.7, st: 0.3, e: 'expoOut', sw: 80, dl: 'radial', g: { red: 0.25 } },
  { t: 180.95, s: 'start', d: 0.6, st: 0.3, e: 'expoOut', sw: 70, dl: 'radial', g: {} },
  { t: 185.8, s: 'voice', d: 0.6, st: 0.3, e: 'expoOut', sw: 70, dl: 'radial', g: { red: 0.45 } },
  { t: 188.9, s: 'void', d: 0.3, st: 0.15, e: 'quadIn', sw: 0, dl: 'random' },
  { t: 189.5, s: 'alone', d: 0.6, st: 0.3, e: 'expoOut', sw: 60, dl: 'radial', g: {} },
  { t: 193.9, s: 'path', d: 0.7, st: 0.3, e: 'expoOut', sw: 70, dl: 'radial', g: {} },
  { t: 197.4, s: 'flex', d: 0.7, st: 0.3, e: 'expoOut', sw: 80, dl: 'radial', g: { gold: 0.35 } },
  { t: 205.1, s: 'wheel', d: 0.7, st: 0.3, e: 'expoOut', sw: 80, dl: 'radial', g: { red: 0.2 } },
  { t: 208.75, s: 'void', d: 0.45, st: 0.25, e: 'quadIn', sw: 0, dl: 'random' },
  { t: 213.25, s: 'branches', d: 0.7, st: 0.3, e: 'expoOut', sw: 60, dl: 'bottom', g: {} },
  { t: 217.2, s: 'look', d: 0.7, st: 0.3, e: 'expoOut', sw: 70, dl: 'radial', g: { purple: 0.3 } },
  { t: 220.2, s: 'info', d: 0.7, st: 0.3, e: 'expoOut', sw: 70, dl: 'radial', g: { purple: 0.2 } },
  { t: 227.45, s: 'result', d: 0.6, st: 0.3, e: 'expoOut', sw: 60, dl: 'bottom', g: { gold: 0.5 } },
  { t: 230.4, s: 'game', d: 0.7, st: 0.3, e: 'inOut', sw: 80, dl: 'radial', g: { gold: 0.3 } },
  { t: 233.2, s: 'repeat', d: 0.8, st: 0.35, e: 'expoOut', sw: 90, dl: 'radial', g: { purple: 0.7 } },
  { t: 239.8, s: 'void', d: 0.45, st: 0.25, e: 'quadIn', sw: 0, dl: 'random' },
];
// camera per beat: [t, x, y, z] lands with expoOut, then drifts
const CAM2 = [
  [35.55, 0, 0, 1], [41.4, 0, -40, 0.92], [45.55, 0, 0, 0.95], [49.25, 0, -20, 0.98], [51.7, 0, 0, 1], [54.4, 0, -60, 0.84], [57.25, 0, -20, 1.0],
  [61.65, 0, -40, 0.95], [66.15, 0, 60, 1.05], [68.5, 0, -110, 1.08], [69.95, 0, -40, 0.94], [71.45, 0, -60, 1.1], [73.55, 0, 0, 1],
  [78.35, 0, 30, 1.0], [79.9, 0, -150, 0.98], [83.65, 0, 100, 1.05], [85.85, 0, -120, 0.98], [90.7, 0, -220, 1.12], [91.6, 0, -120, 1.05],
  [92.65, 0, 0, 0.92], [96.8, 0, 0, 1], [100.95, 0, -40, 0.98], [104.95, 0, -40, 0.98], [107.9, 0, -30, 1.1], [108.8, 0, -60, 1.0], [112.0, 0, 0, 1],
  [115.3, 0, 40, 1.0], [117.75, 0, 60, 1.0], [119.2, 0, 40, 0.94], [123.45, 0, -60, 0.98], [126.6, 0, -260, 1.08], [128.15, 0, 40, 0.98], [129.4, 220, 160, 1.1], [130.4, 0, 40, 0.9],
  [133.15, 0, 0, 1.0], [135.5, 0, 100, 1.1], [136.45, 40, -20, 1.0], [141.6, 140, -40, 1.05], [142.75, 0, -20, 0.95], [145.57, 0, 0, 1],
  [151.3, 60, 60, 1.0], [153.2, 40, 140, 1.12], [154.9, 0, 120, 1.05], [155.86, 0, 120, 1.12], [156.5, 0, 60, 1.0], [157.8, 40, 140, 1.12],
  [158.8, 0, -80, 0.94], [166.85, 0, -120, 0.96], [170.4, 0, -20, 0.95], [173.6, 120, 230, 1.12], [174.5, 0, 0, 0.95], [177.6, 0, 20, 1.05], [179.6, 0, -200, 1.05],
  [180.95, 0, 80, 1.0], [185.8, 0, 0, 0.98], [188.4, 0, 120, 1.1], [188.9, 0, 0, 1], [189.5, 0, 40, 0.98], [193.9, -80, 120, 1.05], [195.4, 60, 120, 1.0],
  [197.4, 0, 0, 0.92], [205.1, 0, -20, 0.95], [207.1, 0, -20, 1.08], [208.75, 0, 0, 1], [213.25, 0, -20, 0.95], [217.2, 0, -40, 0.96], [219.2, 200, -120, 1.1],
  [220.2, 0, -40, 0.95], [226.1, 0, 230, 1.15], [227.45, 0, 0, 0.95], [228.4, 200, -40, 1.05], [230.4, 0, 30, 1.0], [232.2, 0, -90, 1.1], [233.2, 0, -30, 0.95], [236.9, 0, 110, 1.0], [239.8, 0, 0, 1],
];
const TREMOR2 = [44.4, 46.95, 48.95, 51.3, 55.95, 58.45, 64.9, 68.55, 72.0, 82.98, 87.3, 93.0, 104.4, 108.1, 117.3, 126.85, 130.5, 135.55, 142.35, 155.9, 160.9, 166.3, 173.7, 177.1, 185.45, 188.5, 197.2, 204.15, 207.2, 216.98, 224.5, 226.9, 229.1, 232.4, 238.8];
const SECTIONS2 = [[35.6, '09 · A INVERSÃO'], [41.45, '10 · O DONO'], [54.4, '11 · O OUTRO LADO'], [61.65, '12 · A EQUIPE'], [78.35, '13 · A PROVA'], [108.8, '14 · POR QUÊ?'], [115.3, '15 · A MULTIDÃO'], [151.3, '16 · A ARMADILHA'], [180.95, '17 · SOZINHO'], [205.1, '18 · O JOGO'], [213.25, '19 · O CONTRÁRIO'], [233.2, '20 · A HISTÓRIA SE REPETE']];
const EVENTS2 = [
  { t: 42.9, kind: 'coins' }, { t: 43.0, kind: 'rain', d: 2.2 }, { t: 44.4, kind: 'chime' },
  ...PUL_OWN.map(t => ({ t: t + 0.6, kind: 'coins' })), { t: 45.9, kind: 'chime' },
  { t: 49.4, kind: 'ticks', d: 1.8, rate: 8 }, { t: 51.2, kind: 'thud' },
  { t: 55.9, kind: 'loss' }, { t: 57.6, kind: 'pop' }, { t: 58.45, kind: 'knocks', n: 3, step: 0.1 }, ...PUL_APP.map(t => ({ t: t + 0.5, kind: 'coins' })),
  { t: 64.0, kind: 'knocks', n: 8, step: 0.06 }, { t: 64.85, kind: 'rain', d: 1.2 },
  { t: 66.5, kind: 'pop' }, { t: 68.5, kind: 'impact' }, { t: 69.15, kind: 'scan', d: 0.6 },
  { t: 70.6, kind: 'pop' }, { t: 71.45, kind: 'swell', d: 0.6 }, { t: 71.95, kind: 'chime' },
  { t: 79.05, kind: 'chime' }, ...IG_AT.map(t => ({ t, kind: 'pop' })), { t: 82.98, kind: 'slice' },
  { t: 84.15, kind: 'pop' }, { t: 86.75, kind: 'scan', d: 0.9 }, { t: 87.3, kind: 'chime' }, { t: 90.8, kind: 'sparkle', d: 0.6 }, { t: 91.7, kind: 'knocks', n: 5, step: 0.16 },
  { t: 92.95, kind: 'slice' }, { t: 95.15, kind: 'murmur', d: 1.2 },
  { t: 102.2, kind: 'chime' }, ...PUL_SUB.map(t => ({ t: t + 0.55, kind: 'coins' })),
  { t: 105.5, kind: 'chime' }, { t: 106.95, kind: 'thud' }, { t: 108.05, kind: 'sparkle', d: 0.8 },
  { t: 110.95, kind: 'pop' }, { t: 111.6, kind: 'thud' },
  { t: 115.6, kind: 'ticks', d: 1.4, rate: 10 }, { t: 117.3, kind: 'loss' }, { t: 118.0, kind: 'pop' },
  ...HY_POS.map((_, k) => ({ t: 119.35 + k * 0.28, kind: 'pop' })), { t: 121.7, kind: 'coins' },
  { t: 124.2, kind: 'scan', d: 0.5 }, { t: 126.85, kind: 'chime' },
  { t: 129.45, kind: 'pop' }, { t: 130.45, kind: 'murmur', d: 2.0 },
  { t: 133.2, kind: 'scan', d: 1.3 }, { t: 134.05, kind: 'pop' }, { t: 135.5, kind: 'loss' }, { t: 136.1, kind: 'thud' },
  { t: 137.1, kind: 'knocks', n: 12, step: 0.2 }, { t: 142.35, kind: 'dim', d: 0.6 },
  { t: 144.55, kind: 'loss' },
  { t: 152.45, kind: 'pop' }, { t: 153.3, kind: 'sparkle', d: 0.4 }, { t: 154.95, kind: 'ticks', d: 0.7, rate: 9 }, { t: 155.9, kind: 'impact' },
  { t: 158.3, kind: 'chime' }, { t: 160.9, kind: 'tension', d: 0.8 }, ...TOOL_AT.map(t => ({ t, kind: 'pop' })), { t: 166.3, kind: 'dim', d: 0.8 },
  { t: 170.05, kind: 'pop' }, { t: 171.3, kind: 'rain', d: 2.2 }, { t: 173.7, kind: 'loss' },
  { t: 174.6, kind: 'wave', d: 1.4 }, { t: 177.05, kind: 'slice' }, { t: 177.75, kind: 'ticks', d: 1.6, rate: 14 }, { t: 179.65, kind: 'pop' },
  { t: 183.35, kind: 'scan', d: 1.2 }, { t: 185.45, kind: 'thud' }, { t: 186.5, kind: 'pop' }, { t: 187.7, kind: 'murmur', d: 0.8 }, { t: 188.5, kind: 'loss' },
  { t: 190.9, kind: 'pop' }, { t: 193.25, kind: 'dim', d: 0.5 },
  { t: 195.4, kind: 'ticks', d: 1.2, rate: 9 }, { t: 196.4, kind: 'loss' },
  { t: 199.5, kind: 'pop' }, { t: 201.35, kind: 'coins' }, { t: 201.95, kind: 'pop' }, { t: 204.1, kind: 'thud' },
  { t: 205.2, kind: 'ticks', d: 3.2, rate: 12 }, { t: 207.2, kind: 'tension', d: 1.2 },
  ...HOPS.map(t => ({ t, kind: 'pop' })),
  { t: 217.55, kind: 'scan', d: 0.6 }, { t: 219.3, kind: 'sparkle', d: 0.8 },
  { t: 221.5, kind: 'murmur', d: 1.6 }, { t: 224.5, kind: 'loss' }, { t: 226.2, kind: 'swell', d: 0.7 }, { t: 226.9, kind: 'coins' },
  { t: 227.8, kind: 'knocks', n: 6, step: 0.12 }, { t: 229.1, kind: 'chime' },
  { t: 232.3, kind: 'chime' },
  { t: 233.75, kind: 'chime' }, { t: 235.3, kind: 'murmur', d: 1.4 }, { t: 237.0, kind: 'pop' }, { t: 238.75, kind: 'knocks', n: 4, step: 0.1 }, { t: 239.2, kind: 'coins' },
];

KEYS2.forEach(k => { if (k.s !== 'void') { k.d = Math.max(k.d, 0.85); k.st = Math.max(k.st, 0.32); k.e = 'inOut'; k.sw = Math.max(k.sw, 70); } });
KEYS.push(...KEYS2);
KEYS.forEach(k => { if (k.s !== 'void' && !k.fly) k.dl = 'xf'; });

// ═════════════════════════ v5 — real media (images, video, the partners), stronger b-roll, the Igor's notes of 21/10
// ───────────────────────── media: graded + grained images and video, under and over the dots
const MEDIA_IMG = ['logo_gpt.png', 'logo_claude.png', 'logo_gemini.png', 'netflix_n.png', 'netflix_name.png', 'carro.jpg', 'print.jpg',
  'salg_dashboard.jpg', 'salg_mapa.jpg', 'salg_tracker.jpg', 'salg_funil.jpg', ...[1, 2, 3, 4, 5, 6, 7, 8].map(k => `week${k}.jpg`)];
const IMGS = {};
const SEQS = { prog: { dir: 'prog', n: 138, ext: 'jpg', fps: 30 }, tut: { dir: 'tut', n: 138, ext: 'jpg', fps: 30 }, ratos: { dir: 'ratos', n: 139, ext: 'jpg', fps: 30 },
  scroll: { dir: 'scroll', n: 227, ext: 'jpg', fps: 30 }, igor: { dir: 'igor_fg', n: 113, ext: 'png', fps: 15 }, emm: { dir: 'emm_fg', n: 33, ext: 'png', fps: 15 } };
const PLAY = [['prog', 65.8, 70.4, 0], ['igor', 78.2, 86.1, 0], ['emm', 83.5, 86.1, 0], ['tut', 190.6, 194.2, 0], ['ratos', 204.9, 209.0, 0, true], ['scroll', 219.9, 227.6, 0]];
const MCACHE = new Map(), MLAST = {};
const loadImg = src => new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
function seqIdx(id, t) {
  const p = PLAY.find(q => q[0] === id && t >= q[1] && t <= q[2]); if (!p) return -1;
  const S = SEQS[id]; let k = Math.floor((t - p[1] + p[3]) * S.fps);
  if (p[4]) k = ((k % S.n) + S.n) % S.n;
  return Math.max(0, Math.min(S.n - 1, k));
}
const seqSrc = (id, k) => `media/${SEQS[id].dir}/${String(k + 1).padStart(4, '0')}.${SEQS[id].ext}`;
function loadSeq(id, k) {
  const key = id + '/' + k; if (MCACHE.has(key)) return MCACHE.get(key);
  const pr = loadImg(seqSrc(id, k)).then(im => { MCACHE.set(key, im); return im; }); MCACHE.set(key, pr); return pr;
}
async function ensureMedia(t0, t1) {
  const jobs = [];
  for (let t = t0; t <= t1 + 1e-6; t += 1 / 60) for (const [id] of PLAY) { const k = seqIdx(id, t); if (k >= 0) { const v = loadSeq(id, k); if (v instanceof Promise) jobs.push(v); } }
  if (jobs.length) await Promise.all(jobs);
  while (MCACHE.size > 160) MCACHE.delete(MCACHE.keys().next().value);
}
function seqImg(id, t) {
  const k = seqIdx(id, t); if (k < 0) return null;
  const v = MCACHE.get(id + '/' + k);
  if (v && !(v instanceof Promise)) { MLAST[id] = v; return v; }
  if (v === undefined) loadSeq(id, k);
  return MLAST[id] || null;
}
let CUR_FI = 0;
const MEDC = mk(1100, 2000), medg = MEDC.getContext('2d');
// draw an image (cover-fit by default) with grade, micro blur and grain; o.fade = fade the bottom; o.zoom/panX/panY = ken burns
function mediaDraw(g, img, x, y, w, h, o = {}) {
  if (!img) return;
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  let sx = 0, sy = 0, sw = iw, sh = ih;
  if (!o.contain) { const r = w / h; if (iw / ih > r) { sw = ih * r; sx = (iw - sw) / 2; } else { sh = iw / r; sy = (ih - sh) / 2; } }
  if (o.zoom) { const z = o.zoom, nw = sw / z, nh = sh / z; sx += (sw - nw) / 2 * (1 + (o.panX || 0)); sy += (sh - nh) / 2 * (1 + (o.panY || 0)); sw = nw; sh = nh; }
  const a = o.a ?? 1; if (a <= 0.003) return;
  const filt = `blur(${o.blur ?? 0.6}px) saturate(${o.sat ?? 0.88}) brightness(${o.br ?? 0.95}) contrast(1.06)${o.gray ? ` grayscale(${o.gray})` : ''}`;
  g.save();
  if (o.r !== undefined) { RR(g, x, y, w, h, o.r); g.clip(); }
  if (o.fade) { // bottom fade through an offscreen mask
    const cw = Math.min(1100, Math.ceil(w)), ch = Math.min(2000, Math.ceil(h));
    medg.setTransform(1, 0, 0, 1, 0, 0); medg.clearRect(0, 0, cw, ch); medg.filter = filt; medg.drawImage(img, sx, sy, sw, sh, 0, 0, cw, ch); medg.filter = 'none';
    medg.globalCompositeOperation = 'destination-in'; const gr = medg.createLinearGradient(0, 0, 0, ch); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(o.fade, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); medg.fillStyle = gr; medg.fillRect(0, 0, cw, ch);
    if (o.fadeX) { const gx = medg.createLinearGradient(0, 0, cw, 0); gx.addColorStop(0, 'rgba(0,0,0,0)'); gx.addColorStop(o.fadeX, 'rgba(0,0,0,1)'); gx.addColorStop(1 - o.fadeX, 'rgba(0,0,0,1)'); gx.addColorStop(1, 'rgba(0,0,0,0)'); medg.fillStyle = gx; medg.fillRect(0, 0, cw, ch); }
    if ((o.grain ?? 0.25) > 0) { medg.globalCompositeOperation = 'source-atop'; medg.globalAlpha = o.grain ?? 0.25; medg.fillStyle = medg.createPattern(grain[CUR_FI % 4], 'repeat'); medg.fillRect(0, 0, cw, ch); medg.globalAlpha = 1; }
    medg.globalCompositeOperation = 'source-over';
    g.globalAlpha = a; g.drawImage(MEDC, 0, 0, cw, ch, x, y, w, h); g.restore(); return;
  }
  g.globalAlpha = a; g.filter = filt; g.drawImage(img, sx, sy, sw, sh, x, y, w, h); g.filter = 'none';
  if ((o.grain ?? 0.22) > 0) { g.globalCompositeOperation = 'overlay'; g.globalAlpha = a * (o.grain ?? 0.22); g.fillStyle = g.createPattern(grain[CUR_FI % 4], 'repeat'); g.fillRect(x, y, w, h); g.globalCompositeOperation = 'source-over'; }
  if (o.dim) { g.globalAlpha = a * o.dim; g.fillStyle = '#050506'; g.fillRect(x, y, w, h); }
  g.restore();
}
// an image on a 3D quad (tl, tr, br, bl), drawn in vertical strips
function mediaQuad(g, img, Q, o = {}) {
  if (!img) return; const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height, S = 48, a = o.a ?? 1; if (a <= 0.003) return;
  const [tl, tr, br, bl] = Q, L = (p, q, u) => [p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u];
  g.save(); g.globalAlpha = a; g.filter = `blur(${o.blur ?? 0.5}px) saturate(${o.sat ?? 0.9}) brightness(${o.br ?? 1.1}) contrast(1.05)`;
  const base = g.getTransform();
  for (let k = 0; k < S; k++) {
    const u0 = k / S, u1 = (k + 1.04) / S, P0 = L(tl, tr, u0), P1 = L(tl, tr, u1), Q0 = L(bl, br, u0), sx = u0 * iw, sw = iw / S * 1.04;
    g.setTransform(base); g.transform((P1[0] - P0[0]) / sw, (P1[1] - P0[1]) / sw, (Q0[0] - P0[0]) / ih, (Q0[1] - P0[1]) / ih, P0[0], P0[1]);
    g.drawImage(img, sx, 0, sw, ih, 0, 0, sw, ih);
  }
  g.setTransform(base); g.filter = 'none';
  g.beginPath(); g.moveTo(...tl); g.lineTo(...tr); g.lineTo(...br); g.lineTo(...bl); g.closePath();
  g.save(); g.clip(); g.globalCompositeOperation = 'overlay'; g.globalAlpha = a * (o.grain ?? 0.2); g.fillStyle = g.createPattern(grain[CUR_FI % 4], 'repeat'); g.fill(); g.restore();
  if (o.stroke) { g.globalAlpha = a * 0.8; g.strokeStyle = o.stroke; g.lineWidth = 2.5; g.stroke(); }
  g.restore();
}
const F3 = 1500;
// a panel in 3D: centre (x, y, z), size w × h, turned by ry (around y) and rx (around x) → screen quad
function panel3(x, y, z, w, h, ry = 0, rx = 0) {
  const pts = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]].map(([u, v]) => {
    let X = u * Math.cos(ry), Z = -u * Math.sin(ry), Y = v; const Y2 = Y * Math.cos(rx) - Z * Math.sin(rx), Z2 = Y * Math.sin(rx) + Z * Math.cos(rx);
    const zz = z + Z2, s = F3 / (F3 + zz); return [(x + X) * s, (y + Y2) * s];
  });
  return pts;
}

// ───────────────────────── v5 drawings
function towerArt2(g) {
  g.fillStyle = LG(g, -170, 0, 170, 0, [[0, tone(WT, 0.4)], [0.45, tone(WT, 0.85)], [1, tone(WT, 0.35)]]); g.fillRect(-170, -360, 340, 780);
  g.fillStyle = tone(WT, 0.25); poly(g, [[170, -360], [230, -400], [230, 380], [170, 420]]); g.fill();
  g.fillStyle = tone(WT, 0.95); poly(g, [[-170, -360], [170, -360], [230, -400], [-110, -400]]); g.fill();
  for (let r = 0; r < 14; r++) for (let c = 0; c < 5; c++) { if (r < 6 && c > 0 && c < 4) continue; g.fillStyle = (r * 5 + c) % 7 === 3 ? tone(GD, 0.95) : VOID; g.fillRect(-140 + c * 58, -320 + r * 52, 34, 30); }
  g.fillStyle = tone(WT, 0.05); g.fillRect(-90, -330, 180, 300);                       // the façade banner (the N goes here)
  g.strokeStyle = tone(WT, 0.95); g.lineWidth = 5; RR(g, -128, -552, 256, 144, 18); g.stroke();   // the roof billboard (the name goes here)
  g.fillStyle = tone(WT, 0.7); g.fillRect(-60, -410, 10, 14); g.fillRect(50, -410, 10, 14);
}
const appCardArt = k => g => { const y = -220 + k * 120; g.fillStyle = LG(g, -130, y, 130, y + 96, [[0, tone(k ? WT : OR, 0.95)], [1, tone(k ? WT : OR, 0.55)]]); RR(g, -130, y, 260, 96, 18); g.fill(); g.fillStyle = VOID; if (k) { RR(g, -108, y + 22, 120, 14, 7); g.fill(); RR(g, -108, y + 52, 80, 14, 7); g.fill(); g.beginPath(); g.arc(90, y + 48, 22, 0, 7); g.fill(); } else { g.beginPath(); g.arc(0, y + 48, 30, 0, 7); g.fill(); } };
function personNoArm(g) {
  g.fillStyle = LG(g, -60, 0, 60, 0, [[0, tone(WT, 1)], [0.42, tone(WT, 0.72)], [1, tone(WT, 0.3)]]);
  RR(g, -28, 8, 25, 138, 12); g.fill(); RR(g, 3, 8, 25, 138, 12); g.fill();
  g.beginPath(); g.moveTo(-46, -96); g.quadraticCurveTo(-52, -58, -33, 22); g.lineTo(33, 22); g.quadraticCurveTo(52, -58, 46, -96); g.quadraticCurveTo(0, -110, -46, -96); g.fill();
  RR(g, -61, -92, 18, 112, 9); g.fill();
  g.fillRect(-8, -118, 16, 20); sphere(g, 0, -138, 25, WT, 1);
  RR(g, -32, 140, 30, 11, 5); g.fill(); RR(g, 2, 140, 30, 11, 5); g.fill();
}
function armScratch(g) { // shoulder at (46,-90): upper arm out and up, forearm back to the side of the head, fingers in the hair
  g.strokeStyle = LG(g, 30, -180, 100, -80, [[0, tone(WT, 0.95)], [1, tone(WT, 0.55)]]); g.lineCap = 'round';
  g.lineWidth = 18; g.beginPath(); g.moveTo(46, -88); g.lineTo(84, -140); g.stroke();
  g.lineWidth = 15; g.beginPath(); g.moveTo(84, -140); g.lineTo(34, -168); g.stroke();
  g.fillStyle = tone(WT, 0.95); g.beginPath(); g.ellipse(26, -170, 12, 9, -0.5, 0, 7); g.fill();
  g.lineWidth = 5; g.strokeStyle = tone(WT, 0.85); for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(20 + k * 4, -176); g.lineTo(12 + k * 5, -186); g.stroke(); }
}
function brainArt(g) {
  const lobe = sd => { g.beginPath(); g.moveTo(0, -150); g.bezierCurveTo(sd * 120, -190, sd * 250, -120, sd * 250, -10); g.bezierCurveTo(sd * 255, 90, sd * 170, 150, sd * 60, 140); g.bezierCurveTo(sd * 20, 135, 0, 120, 0, 100); g.closePath(); };
  [-1, 1].forEach(sd => { lobe(sd); g.fillStyle = RG(g, sd * 90, -60, 20, 280, [[0, tone(WT, 1)], [0.6, tone(WT, 0.7)], [1, tone(WT, 0.4)]]); g.fill(); });
  g.strokeStyle = tone(WT, 0.22); g.lineWidth = 9;
  [[-1, 0], [1, 0]].forEach(([sd]) => {
    [[-110, -60, 40], [-60, 20, 50], [-140, 40, 30], [-40, -110, 30], [-190, -20, 26], [-100, 100, 36]].forEach(([x, y, r]) => { g.beginPath(); g.arc(sd * -x, y, r, sd > 0 ? 0.3 : 2.8, sd > 0 ? 3.6 : 6.1); g.stroke(); });
  });
  g.strokeStyle = tone(WT, 0.15); g.lineWidth = 7; g.beginPath(); g.moveTo(0, -150); g.lineTo(0, 110); g.stroke();
  g.fillStyle = LG(g, -30, 0, 30, 0, [[0, tone(WT, 0.4)], [0.5, tone(WT, 0.75)], [1, tone(WT, 0.35)]]); RR(g, -24, 120, 48, 110, 20); g.fill();
}
function shopClosedArt(g) {
  g.fillStyle = LG(g, -300, 0, 300, 0, [[0, tone(WT, 0.32)], [0.45, tone(WT, 0.7)], [1, tone(WT, 0.3)]]); g.fillRect(-300, -260, 600, 520);
  g.fillStyle = tone(WT, 0.9); RR(g, -260, -330, 520, 90, 10); g.fill(); g.fillStyle = VOID; RR(g, -230, -305, 460, 40, 8); g.fill();          // the sign, blank
  for (let k = 0; k < 7; k++) { g.fillStyle = tone(WT, k % 2 ? 0.95 : 0.4); poly(g, [[-300 + k * 86, -240], [-214 + k * 86, -240], [-214 + k * 86, -170], [-300 + k * 86, -170]]); g.fill(); } // the awning
  g.fillStyle = LG(g, 0, -150, 0, 230, [[0, tone(WT, 0.92)], [1, tone(WT, 0.5)]]); g.fillRect(-250, -150, 500, 380);                       // the shutter, down
  g.fillStyle = VOID; for (let y = -130; y < 230; y += 26) g.fillRect(-250, y, 500, 5);
  g.fillStyle = tone(WT, 0.6); RR(g, -30, 200, 60, 18, 6); g.fill(); g.strokeStyle = tone(WT, 0.9); g.lineWidth = 6; g.beginPath(); g.arc(0, 232, 16, Math.PI, 0); g.stroke(); // padlock
}
function caveArt(g) { // a dark rock arch; its mouth is filled with daylight
  g.fillStyle = RG(g, 0, 0, 40, 330, [[0, tone(WT, 1)], [0.5, tone(GD, 0.95)], [1, tone(WT, 0.55)]]); g.beginPath(); g.ellipse(0, 40, 170, 230, 0, 0, 7); g.fill();
  g.fillStyle = tone(WT, 0.3); g.beginPath(); g.moveTo(-320, 330); g.lineTo(-300, -40); g.bezierCurveTo(-280, -330, 280, -330, 300, -40); g.lineTo(320, 330); g.lineTo(190, 330); g.bezierCurveTo(200, 0, 160, -200, 0, -200); g.bezierCurveTo(-160, -200, -200, 0, -190, 330); g.closePath(); g.fill();
  const r = rng(5); g.fillStyle = tone(WT, 0.5); for (let k = 0; k < 40; k++) { g.beginPath(); g.ellipse((r() - 0.5) * 560, -200 + r() * 520, 18 + r() * 30, 10 + r() * 16, r() * 3, 0, 7); g.fill(); }
}
function billArt(g) { for (let k = 0; k < 5; k++) { const y = 40 - k * 16, x = (k % 2) * 10 - 5; g.fillStyle = LG(g, x - 150, 0, x + 150, 0, [[0, tone(GN, 0.55)], [0.5, tone(GN, 1)], [1, tone(GN, 0.5)]]); RR(g, x - 150, y - 60, 300, 120, 10); g.fill(); g.strokeStyle = tone(GN, 0.4); g.lineWidth = 4; RR(g, x - 134, y - 46, 268, 92, 8); g.stroke(); g.fillStyle = tone(GN, 0.35); g.beginPath(); g.arc(x, y, 30, 0, 7); g.fill(); g.fillStyle = tone(WT, 0.95); g.font = HEAVY(44); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('$', x, y + 2); } }
function keyArt2(g) { g.lineWidth = 34; g.strokeStyle = LG(g, -260, -80, -120, 80, [[0, tone(WT, 1)], [1, tone(WT, 0.5)]]); g.beginPath(); g.arc(-190, 0, 70, 0, 7); g.stroke(); g.fillStyle = LG(g, 0, -18, 0, 18, [[0, tone(WT, 1)], [1, tone(WT, 0.5)]]); RR(g, -120, -18, 340, 36, 12); g.fill(); poly(g, [[150, 14], [230, 14], [230, 96], [204, 96], [204, 62], [180, 62], [180, 86], [150, 86]]); g.fill(); }
function winArt(g) { g.fillStyle = LG(g, -170, -120, 170, 120, [[0, tone(OR, 1)], [1, tone(OR, 0.55)]]); RR(g, -170, -115, 340, 230, 22); g.fill(); g.fillStyle = VOID; RR(g, -152, -78, 304, 176, 12); g.fill(); g.fillStyle = tone(OR, 1); [-146, -122, -98].forEach(x => { g.beginPath(); g.arc(x, -97, 7, 0, 7); g.fill(); }); g.fillStyle = tone(WT, 0.85); RR(g, -132, -60, 120, 70, 10); g.fill(); for (let k = 0; k < 4; k++) { RR(g, 4, -60 + k * 24, 120 - k * 18, 12, 6); g.fill(); } g.fillStyle = tone(OR, 0.9); RR(g, -132, 26, 264, 54, 10); g.fill(); }
const stepColArt = (k, s = 60) => g => { for (let j = 0; j <= k; j++) cubeC(g, 0, -j * s, s, WT, 0.9 + 0.03 * j); };
function birdBody(g) { g.save(); g.scale(-1, 1);
  g.fillStyle = RG(g, -20, -20, 4, 80, [[0, tone(WT, 1)], [1, tone(WT, 0.5)]]); g.beginPath(); g.ellipse(0, 0, 62, 42, -0.15, 0, 7); g.fill();
  g.fillStyle = tone(WT, 0.6); poly(g, [[-50, -6], [-118, -30], [-108, 10]]); g.fill();
  g.fillStyle = tone(WT, 0.45); g.beginPath(); g.ellipse(-6, -4, 36, 20, -0.4, 0, 7); g.fill();
  g.strokeStyle = tone(WT, 0.75); g.lineWidth = 5; g.beginPath(); g.moveTo(-6, 38); g.lineTo(-12, 66); g.moveTo(14, 38); g.lineTo(18, 66); g.stroke(); g.restore(); }
function birdHead(g) { g.save(); g.scale(-1, 1); sphere(g, 52, -38, 28, WT, 1); g.fillStyle = tone(GD, 1); poly(g, [[76, -44], [104, -36], [76, -28]]); g.fill(); g.fillStyle = VOID; g.beginPath(); g.arc(60, -44, 5, 0, 7); g.fill(); g.restore(); }
const tileArt = (x, lit) => g => { g.strokeStyle = tone(WT, 0.9); g.lineWidth = 5; RR(g, x - 58, -75, 116, 150, 16); g.stroke(); if (lit) { g.fillStyle = LG(g, 0, -60, 0, 60, [[0, tone(OR, 1)], [1, tone(OR, 0.5)]]); RR(g, x - 48, -65, 96, 130, 12); g.fill(); } };
function archArt(g) {
  g.fillStyle = LG(g, -30, 0, 30, 0, [[0, tone(WT, 0.55)], [0.5, tone(WT, 1)], [1, tone(WT, 0.5)]]); RR(g, -230, -40, 28, 300, 8); g.fill(); RR(g, 202, -40, 28, 300, 8); g.fill();
  g.fillStyle = LG(g, 0, -130, 0, -30, [[0, tone(GD, 1)], [1, tone(GD, 0.55)]]); RR(g, -250, -140, 500, 110, 18); g.fill(); g.fillStyle = VOID; RR(g, -220, -115, 440, 60, 10); g.fill();
  for (let k = 0; k < 12; k++) { g.fillStyle = tone(k % 2 ? WT : GD, 0.95); g.fillRect(-230 + k * 38.3, 250, 38.3, 18); }
}

// ───────────────────────── v5 shapes (they replace the v4 ones with the same name; the timeline stays)
const PAY_AT = [101.9, 102.5, 103.2, 103.7, 104.38, 104.85];
const ROLES = ['DEV', 'DESIGN', 'MARKETING', 'SUPORTE', 'DADOS', 'VENDAS', 'TESTES', 'PRODUTO'];
const TEAM_P = [[-300, -150], [-100, -150], [100, -150], [300, -150], [-300, 170], [-100, 170], [100, 170], [300, 170]];
const PH5 = [0, -40], PH5S = 0.95, IN5 = [...Array(8)].map((_, k) => [PH5[0] + (k % 2 ? 70 : -70), PH5[1] - 190 + Math.floor(k / 2) * 112]);
const inQ = (t, k) => ramp(t, 71.35 + 0.07 * k, 0.75, E.inOut);
const TOOL8_AT = [161.4, 161.75, 162.1, 162.45, 162.8, 163.3, 163.9, 164.58];
const TOOL8_POS = [...Array(8)].map((_, k) => [(k % 2 ? 1 : -1) * 190, -265 + Math.floor(k / 2) * 228]);
const CARD5 = { w: 340, h: 192 };
const DAYS = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'], DAY_AT = [183.4, 183.78, 184.12, 184.5];
const STEP5 = [[-270, 330], [-90, 270], [90, 210], [270, 150]], STEP_AT5 = [106.24, 106.92, 108.04];
const RUN5 = [[0.34, -110], [0.56, 40], [0.7, 150], [0.82, -60], [0.9, 90]];
const CAND_C = CANDLES.map(([o, c]) => [(-315) * 0.9, ((220 - Math.max(o, c) * 600) + (220 - Math.min(o, c) * 600)) / 2 * 0.9 - 80]);
const peck = (t) => { const u = (t - 152.55) / 0.42, st = Math.floor(u), f = u - st; return { st, f }; };
function birdX(t) { if (t < 152.55) return 470; const { st, f } = peck(t), x = 470 - 60 * Math.min(st, 7) - (st < 7 ? 60 * E.cubicOut(clamp(f / 0.3)) : 0); return Math.max(50, x); }

const GL5 = { price: { green: 0.6 }, eyes: { green: 0.35 }, late: { green: 0.3 }, result: { green: 0.5 }, why: { orange: 0.5 }, tools: { blue: 0.15 }, repeat: { blue: 0.6 },
  salg: { purple: 0.3, blue: 0.2 }, noai: { red: 0.45 }, subscr: { gold: 0.5, green: 0.3 }, ours: { gold: 0.6 }, learn: { blue: 0.4 }, nothing: { red: 0.35 }, bait: { blue: 0.4 }, wheel: { red: 0.15 }, smallapp: { orange: 0.5, gold: 0.3 }, team: { orange: 0.25, green: 0.2 } };
KEYS.forEach(k => { if (GL5[k.s]) k.g = GL5[k.s]; });
// camera v5: more movement in the slow stretches, follow the bird, frame the media
(() => { const set = (t0, v) => { const k = CAM2.findIndex(c => Math.abs(c[0] - t0) < 0.01); if (k >= 0) CAM2.splice(k, 1); if (v) CAM2.push([t0, ...v]); };
  set(158.8, [0, 10, 0.86]); set(66.15, [0, -60, 1.0]); set(78.35, [0, 60, 1.0]); set(79.9, [0, -80, 0.97]); set(83.65, [0, 120, 1.0]); set(85.85, [0, -40, 1.0]); set(90.7, [0, -120, 1.06]); set(91.6, [0, 0, 1.02]);
  set(104.95, [0, -80, 0.95]); set(107.9, [150, -120, 1.05]); set(180.95, [0, 40, 0.98]); set(188.4, [0, -40, 1.06]); set(193.9, [0, 140, 1.0]); set(195.4, [0, 40, 0.95]);
  set(219.2, [90, -60, 1.04]); set(226.1, [0, 100, 1.08]); set(228.4, [250, -250, 1.0]);
  [[58.4, 0, -150, 1.1], [59.9, 0, 40, 0.95], [62.4, -150, -40, 1.05], [63.2, 150, 60, 1.05], [64.6, 0, -20, 0.95], [182.6, 0, 40, 1.0], [183.3, -40, 20, 1.02], [184.5, 30, 20, 1.02],
   [213.5, 150, -55, 1.05], [214.15, -145, 26, 1.05], [214.8, 150, 100, 1.05], [215.25, -150, -118, 1.05], [216.24, 150, -55, 1.08], [216.66, -145, 26, 1.08], [216.98, 150, 100, 1.1],
   [161.4, 0, -60, 0.9], [163.3, 0, 120, 0.9], [201.3, -120, 40, 0.95], [201.9, 120, 40, 0.95], [202.8, 0, 0, 0.9]].forEach(c => CAM2.push(c));
  CAM2.sort((a, b) => a[0] - b[0]); })();
EVENTS2.push({ t: 54.8, kind: 'chime' }, { t: 57.5, kind: 'pop' }, { t: 57.78, kind: 'pop' }, { t: 58.06, kind: 'pop' }, { t: 59.9, kind: 'ticks', d: 1.5, rate: 6 },
  ...[0, 1, 2, 3, 4, 5, 6, 7].map(k => ({ t: 62.3 + k * 0.12, kind: 'pop' })), { t: 63.0, kind: 'type', d: 1.8 }, { t: 71.35, kind: 'wave', d: 1.1 },
  { t: 78.45, kind: 'swell', d: 0.6 }, { t: 83.6, kind: 'swell', d: 0.5 }, { t: 85.9, kind: 'wave', d: 1.2 }, { t: 88.0, kind: 'pop' }, { t: 88.5, kind: 'pop' }, { t: 89.0, kind: 'pop' }, { t: 90.6, kind: 'scan', d: 0.8 },
  ...PAY_AT.map(t => ({ t: t + 0.7, kind: 'coins' })), ...STEP_AT5.map(t => ({ t, kind: 'knocks', n: 2, step: 0.1 })), { t: 108.1, kind: 'chime' },
  { t: 152.6, kind: 'ticks', d: 2.9, rate: 3 }, ...TOOL8_AT.map(t => ({ t, kind: 'pop' })), ...DAY_AT.map(t => ({ t, kind: 'pop' })), { t: 185.45, kind: 'loss' },
  { t: 194.0, kind: 'chime' }, { t: 201.35, kind: 'swell', d: 0.5 }, { t: 219.3, kind: 'swell', d: 0.8 }, { t: 225.1, kind: 'coins' }, { t: 226.25, kind: 'chime' }, { t: 235.3, kind: 'sparkle', d: 0.6 });
function buildShapesV5() {
  // hook crowd — the real logos are drawn on top (media), not as dots
  SH.crowd = makeShape([hsort(crowd3Pts(CROWD3, false))], (t, i, p, b) => {
    const cam = crowdCam(t), march = 7 * ramp(t, 14.7, 0.2) * Math.abs(Math.sin((t - 14.7) * 5.2));
    const d = place3(b, i, p, cam, march), near = clamp((d - 0.35) / 0.45) * clamp((600 - b.y[i]) / 140), far = 0.35 + 0.65 * clamp(2.2 / d - 0.15);
    b.a[i] = Math.max(0.02, p.a * near * far); b.t[i] = WHITE;
  });

  // "não precisa ser a Netflix" — the tower; its billboard and façade carry the real logo (media)
  SH.tower = makeShape([dotArt(towerArt2, 1, 0, 0, { seed: 730 })], (t, i, p, b) => {
    const off = ramp(t, 55.9, 0.6), s = 1 - 0.1 * off; b.x[i] = p.x * s; b.y[i] = 420 + (p.y - 420) * s; b.a[i] = p.a * (1 - 0.5 * off); if (off > hash(i, 3)) b.t[i] = GRAY;
  });

  // "Um produto pequeno, construído uma vez, já pode ser pago todo mês…" — the app assembles card by card; users pay
  {
    const PH = [0, -170], cards = [];
    for (let k = 0; k < 3; k++) art(appCardArt(k), 0.55, PH[0], PH[1], { seed: 741 + k, cell: 4, nosort: true }).forEach(p => cards.push({ ...p, ac: k }));
    const ph = tagged(art(g => phoneArt(g, { body: OR }), 0.55, PH[0], PH[1], { seed: 740, cell: 4 }), { ph: 1 });
    const SR = [], users = []; [-375, -225, -75, 75, 225, 375].forEach((x, k) => { const y = 300 + 22 * Math.abs(k - 2.5); SR.push([x, y - 40]); users.push(...bustAt(B30, x, y, k)); });
    const coins = pulseCoins(SR, PUL_APP, 16, 3);
    SH.smallapp = makeShape([ph, hsort(cards), hsort(users), coins], (t, i, p, b) => {
      if (p.cn !== undefined) { pulseLife(t, i, p, b, SR, [PH[0], PH[1] + 60], PUL_APP, 0.55, 30); b.s[i] = p.s * 1.4; return; }
      if (p.ac !== undefined) { const at = 57.5 + p.ac * 0.28, q = ramp(t, at, 0.4, E.backOut); b.x[i] = p.x + 380 * (1 - clamp(q)); b.a[i] = Math.min(1, p.a * 1.3) * clamp(q * 2, 0.02) + 0.35 * flash(t, 58.45, 0.15); return; }
      if (p.ph) { b.a[i] = Math.min(1, p.a * 1.3) + 0.4 * flash(t, 58.45, 0.15) + 0.25 * PUL_APP.reduce((s, P) => s + flash(t, P + 0.6, 0.12), 0); b.y[i] = p.y - 6 * Math.sin(t * 2); return; }
      popAt(t, i, p, b, 59.95 + p.bk * 0.05, p.bx, p.by);
    });
  }

  // "isso exigia uma equipe ou muito dinheiro pra pagar por ela" — eight roles at laptops; the money pours out to them
  {
    const team = []; TEAM_P.forEach(([x, y], k) => { team.push(...bustAt(B30, x, y, k)); art(laptopArt(x, y + 78, 0.9), 1, 0, 0, { seed: 750 + k, cell: 4, nosort: true }).forEach(p => team.push({ ...p, bk: k, bx: x, by: y, lap: 1 })); });
    const pile = tagged(art(textArt('$', 130, GN), 1, 0, 10, { seed: 759, cell: 4 }), { pile: 1 });
    const out = coinGlyphs(700, 4).map((p, k) => ({ ...p, si: k % 8 }));
    SH.team = makeShape([hsort(team), pile, out], (t, i, p, b) => {
      if (p.cn !== undefined) { if (t < 64.85) { b.a[i] = 0.02; return; } const u = ((t - 64.85) * 1.3 + hash(p.cn, 6)) % 1, [tx, ty] = TEAM_P[p.si]; flowTo(b, i, 0, 10, tx, ty - 20, u, 50, 20, p.cn); b.a[i] = Math.max(0.02, 0.9 * Math.sin(Math.PI * u) * ramp(t, 64.85, 0.3)); b.s[i] = p.s * 1.3; return; }
      if (p.pile) { const on = dropIn(t, 64.8, 0.3); b.a[i] = p.a * clamp(on, 0.02); b.t[i] = GREEN; return; }
      popAt(t, i, p, b, 62.3 + p.bk * 0.12, p.bx, p.by);
      if (p.lap) b.a[i] *= 0.75 + 0.25 * Math.sin(t * 9 + p.bk + p.y * 0.05);
    });
  }

  // "quase 6 mil reais por mês" — the programmer b-roll behind (media); the lettering lands in green
  SH.price = makeShape([tagged(art(textArt('6 MIL', 330, GN), 1, 0, -150, { seed: 762 }), { big: 1 })], (t, i, p, b) => {
    const on = ramp(t, 68.5, 0.4, E.backOut), s = 1.35 - 0.35 * clamp(on), sweep = -520 + 1040 * ramp(t, 69.2, 0.6, E.inOut);
    b.a[i] = p.a * clamp(on * 1.5, 0.02) + 0.5 * flash(t, 68.62, 0.12) + 0.6 * Math.exp(-(((p.x - sweep) / 50) ** 2)) * (t > 69.15 && t < 69.9 ? 1 : 0);
    b.x[i] = p.x * s; b.y[i] = -150 + (p.y + 150) * s; b.t[i] = GREEN;
  });

  // "essa equipe inteira cabe na IA… no seu celular" — the same eight (same places as before), named, fly into a big phone
  {
    const ph = tagged(art(g => phoneArt(g, { body: WT }), PH5S, PH5[0], PH5[1], { seed: 770 }), { ph: 1 });
    const team = []; TEAM_P.forEach(([x, y], k) => B30.forEach(q => team.push({ ...q, x: q.x + x, y: q.y + y, rx: q.x, ry: q.y, tm: k })));
    SH.inphone = makeShape([ph, hsort(team)], (t, i, p, b) => {
      if (p.tm !== undefined) {
        const q = inQ(t, p.tm), s = lerp(1, 0.4, q), [ox, oy] = TEAM_P[p.tm], [ix, iy] = IN5[p.tm], arc = -120 * Math.sin(Math.PI * q);
        b.x[i] = lerp(ox, ix - 34, q) + p.rx * s; b.y[i] = lerp(oy, iy, q) + arc + p.ry * s; b.a[i] = p.a * (0.85 + 0.15 * q); if (q > 0.6) b.t[i] = PURPLE; return;
      }
      const lit = ramp(t, 71.9, 0.4); b.t[i] = lit > hash(i, 3) ? PURPLE : WHITE; b.a[i] = Math.min(1, p.a * 1.15) + 0.35 * flash(t, 73.1, 0.15);
      const pulse = 1 + 0.03 * flash(t, 71.95, 0.2); b.x[i] = PH5[0] + (p.x - PH5[0]) * pulse; b.y[i] = PH5[1] + (p.y - PH5[1]) * pulse;
    });
  }

  // the partners on video (media): only the icons and a soft floor of dots stay as agents
  const floorDots = (n, y, w, seed) => [...Array(n)].map((_, k) => ({ fd: k, x: (hash(k, seed) - 0.5) * w, y: y + (hash(k, seed + 1) - 0.5) * 60, a: 0.35, c: CI['•'], t: WHITE, s: 0.25 + 0.2 * hash(k, seed + 2) }));
  {
    const ic = [tagged(dotArt(badgeArt, 0.6, -320, -330, { seed: 781, cell: 4 }), { ic: 0 }), tagged(dotArt(houseArt, 0.75, 0, -360, { seed: 782, cell: 4 }), { ic: 1 }), tagged(art(textArt('</>', 120, WT), 1, 320, -350, { seed: 783, cell: 4 }), { ic: 2 })];
    const sk = tagged(art(strikeArt(200, -300, 440, -400), 1, 0, 0, { seed: 784, cell: 4 }), { sk: 1 });
    SH.igor = makeShape([...ic, sk, floorDots(900, 560, 900, 3)], (t, i, p, b) => {
      if (p.ic !== undefined) { popAt(t, i, p, b, IG_AT[p.ic], [-320, 0, 320][p.ic], -340); if (p.ic === 2 && ramp(t, 83.0, 0.3) > hash(i, 4)) b.t[i] = GRAY; return; }
      if (p.sk) { b.a[i] = p.x < 200 + 240 * ramp(t, 82.98, 0.3, E.cubicOut) ? p.a : 0.02; return; }
      b.x[i] = p.x + 10 * Math.sin(t * 0.7 + p.fd); b.a[i] = p.a * (0.6 + 0.4 * Math.sin(t * 2 + p.fd));
    });
  }
  SH.duo = makeShape([floorDots(1400, 560, 1000, 5)], (t, i, p, b) => { b.x[i] = p.x + 10 * Math.sin(t * 0.7 + p.fd); b.a[i] = p.a * (0.6 + 0.4 * Math.sin(t * 2 + p.fd)); });

  // the SALG on real screens (media, 3D); the dots become a soft digital dust around them — no "IA" letters here
  SH.salg = makeShape([[...Array(2600)].map((_, k) => ({ du: k, x: (hash(k, 1) - 0.5) * 1300, y: (hash(k, 2) - 0.5) * 1500, a: 0.3 + 0.4 * hash(k, 3), c: pick('•·.', hash(k, 4)), t: hash(k, 5) > 0.7 ? PURPLE : WHITE, s: 0.3 + 0.3 * hash(k, 6) }))], (t, i, p, b) => {
    b.y[i] = ((p.y + 750 - (t - 85) * 40 * (0.5 + hash(p.du, 7))) % 1500 + 1500) % 1500 - 750; b.a[i] = p.a * (0.5 + 0.5 * Math.sin(t * 3 + p.du));
  });

  // "Sem IA… uma equipe inteira de programadores" — the IA in red, struck out; the real dashboard small in the middle; a whole team around
  {
    const ia = tagged(art(textArt('IA', 170, WT), 1, 0, -340, { seed: 811, cell: 4 }), { ia: 1 });
    const sk = tagged(art(strikeArt(-150, -290, 150, -390), 1, 0, 0, { seed: 812, cell: 4 }), { sk: 1 });
    const devs = []; ringPos(16, 440, 330, 0, 40, -Math.PI / 2).forEach(([x, y], k) => { devs.push(...bustAt(BUSTD_T, x, y, k)); art(laptopArt(x, y + 46, 0.45), 1, 0, 0, { seed: 813 + k, cell: 4, nosort: true }).forEach(p => devs.push({ ...p, bk: k, bx: x, by: y })); });
    SH.noai = makeShape([ia, sk, hsort(devs)], (t, i, p, b) => {
      if (p.sk) { b.a[i] = p.x < -150 + 300 * ramp(t, 92.95, 0.3, E.cubicOut) ? p.a : 0.02; return; }
      if (p.ia) { b.t[i] = RED; b.a[i] = Math.min(1, p.a * 1.2) + 0.3 * flash(t, 92.9, 0.2); return; }
      popAt(t, i, p, b, 95.15 + p.bk * 0.04, p.bx, p.by); b.t[i] = WHITE; b.a[i] *= 0.85;
    });
  }

  // "vende o SALG por assinatura todo mês" — people pay for the access: a payment card flies from each one (media + overlay)
  {
    const subs = []; for (let k = 0; k < 7; k++) { const x = (k - 3) * 145, y = 330 + 16 * Math.abs(k - 3); subs.push(...bustAt(B45, x, y, k)); }
    const ring = [...Array(900)].map((_, k) => ({ gr2: k, x: 0, y: -200, a: 0.8, c: pick('•·', hash(k, 2)), t: money(hash(k, 3)), s: 0.3 + 0.3 * hash(k, 4) }));
    SH.subscr = makeShape([hsort(subs), ring], (t, i, p, b) => {
      if (p.gr2 !== undefined) { const a = hash(p.gr2, 5) * 6.283 + t * 0.4, r = 340 + 30 * Math.sin(t * 2 + p.gr2); b.x[i] = r * Math.cos(a) * 1.05; b.y[i] = -200 + r * Math.sin(a) * 0.6; b.a[i] = Math.max(0.02, 0.6 * ramp(t, 101.2, 0.6) * (0.5 + 0.5 * Math.sin(t * 5 + p.gr2))); return; }
      popAt(t, i, p, b, 101.6 + p.bk * 0.08, p.bx, p.by);
    });
  }

  // "E ele é nosso… continua dono dele." — level up: three partners climb a staircase that turns gold step by step
  {
    const steps = []; STEP5.forEach(([x, y], k) => dotArt(stepColArt(k), 1, x, y, { seed: 831 + k, nosort: true }).forEach(p => steps.push({ ...p, stp: k })));
    const three = []; for (let k = 0; k < 3; k++) FULL_T.forEach(p => three.push({ ...p, rsc: 0.42, rx: p.x * 0.42, ry: p.y * 0.42, s: p.s * 0.6, pp: k }));
    SH.ours = makeShape([hsort(steps), three], (t, i, p, b) => {
      if (p.pp !== undefined) {
        const lvl = STEP_AT5.filter(T => t >= T).length, k0 = Math.max(0, lvl - 1), k1 = lvl, pr = lvl === 0 ? 1 : ramp(t, STEP_AT5[lvl - 1], 0.45, E.inOut);
        const top = k => [STEP5[k][0], STEP5[k][1] - 60 * k], [x0, y0] = top(k0), [x1, y1] = top(k1);
        const sx = lerp(x0, x1, pr), sy = lerp(y0, y1, pr) - (lvl ? 70 * Math.sin(Math.PI * pr) : 0);
        b.x[i] = sx + (p.pp - 1) * 40 + p.rx; b.y[i] = sy - 63 + p.ry; if (ramp(t, 108.04, 0.4) > hash(i, 5)) b.t[i] = money(hash(i, 6)); return;
      }
      const lit = t >= (p.stp === 0 ? 105.2 : STEP_AT5[p.stp - 1] + 0.2); if (lit && hash(i, 3) < ramp(t, p.stp === 0 ? 105.2 : STEP_AT5[p.stp - 1] + 0.2, 0.4)) b.t[i] = money(hash(i, 4));
      b.a[i] = p.a * (lit ? 1 : 0.55) + 0.3 * flash(t, 108.1, 0.25);
    });
  }

  // "por que tão pouca gente faz?" — a centred "?" that bounces and blinks amber (curiosity, a question mark that asks for attention)
  SH.why = makeShape([tagged(art(textArt('?', 460, WT), 1, 0, -120, { seed: 840, h: 1300 }), { q: 1 }), hsort([[-130, 360], [0, 375], [130, 360]].flatMap(([x, y], k) => bustAt(B30, x, y, k)))], (t, i, p, b) => {
    if (p.q) { const bo = Math.abs(Math.sin(Math.PI * (t - 108.9) * 1.55)), sq = 1 + 0.08 * (1 - bo) ** 3; b.x[i] = p.x * sq; b.y[i] = -120 + (p.y + 120) / sq - 70 * bo; const blink = 0.5 + 0.5 * Math.sin(t * 6.5); b.t[i] = hash(i, 7) < 0.85 * blink ? ORANGE : WHITE; b.a[i] = Math.min(1, p.a * 1.15) + 0.2 * blink; return; }
    popAt(t, i, p, b, 110.95 + p.bk * 0.1, p.bx, p.by);
  });

  // "day trade" — brighter candles, alive: every body breathes up and down
  {
    const grid = art(g => { g.strokeStyle = tone(WT, 0.4); g.lineWidth = 3; for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(-360, -200 + k * 100); g.lineTo(360, -200 + k * 100); g.stroke(); } }, 0.9, 0, -80, { seed: 850, cell: 4 });
    const cand = []; CANDLES.forEach((_, k) => art(candleOne(k), 0.9, 0, -80, { seed: 851 + k, cell: 4, nosort: true }).forEach(p => cand.push({ ...p, cd: k })));
    SH.trade = makeShape([TLP.map(p => ({ ...p })), grid, hsort(cand)], (t, i, p, b) => {
      if (p.cd !== undefined) { const on = dropIn(t, 115.6 + p.cd * 0.17, 0.3), cy = CAND_C[p.cd][1], live = 1 + 0.32 * Math.sin(t * 3.4 + p.cd * 1.7); b.a[i] = Math.min(1, p.a * 1.7) * clamp(on, 0.02) + 0.3 * flash(t, 117.3, 0.15); b.s[i] = p.s * 1.25; b.y[i] = cy + (p.y - cy) * live - 26 * Math.sin(t * 2.1 + p.cd) + 30 * (1 - clamp(on)); return; }
      if (p.y > 300) return tlLife(t, i, p, b);
      b.a[i] = p.a * 0.8;
    });
  }

  // "os olhos no mesmo lugar…" — bigger eyes, finer dotwork, all looking at a green $
  {
    const DL = [0, -440], lids = [], iris = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) { const x = (c - 1) * 320, y = -60 + r * 230, k = r * 3 + c, dd = Math.hypot(DL[0] - x, DL[1] - y), ox = (DL[0] - x) / dd * 40, oy = (DL[1] - y) / dd * 40;
      dotArt(lidArt(ox, oy), 0.78, x, y, { seed: 890 + k, cell: 3, nosort: true }).forEach(p => lids.push({ ...p, ek: k })); dotArt(irisArt(ox, oy), 0.78, x, y, { seed: 910 + k, cell: 3, nosort: true }).forEach(p => iris.push({ ...p, ex: x, ey: y })); }
    const dl = tagged(art(textArt('$', 210, GN), 1, DL[0], DL[1], { seed: 930 }), { dl: 1 });
    SH.eyes = makeShape([hsort(lids), hsort(iris), dl], (t, i, p, b) => {
      if (p.dl) { b.t[i] = GREEN; b.a[i] = p.a + 0.4 * flash(t, 126.85, 0.2); return; }
      if (p.ex !== undefined) { const look = ramp(t, 124.2, 0.4, E.cubicOut), dx = DL[0] - p.ex, dy = DL[1] - p.ey, d = Math.hypot(dx, dy); b.x[i] = p.x - (dx / d) * 18 * (1 - look); b.y[i] = p.y - (dy / d) * 18 * (1 - look); }
      b.a[i] = Math.min(1, p.a * 1.15);
    });
  }

  // "milhares de pessoas já estavam…" — thousands running in at the green $ from every side; I arrive late
  {
    const pts = []; let k = 0;
    [[26, 205, 140], [38, 305, 208], [48, 410, 282]].forEach(([n, rx, ry], ri) => { for (let j = 0; j < n; j++) { const a = (j / n) * 2 * Math.PI + ri * 0.3; pts.push(...bustAt(BUSTD_T, rx * Math.cos(a), 30 + ry * Math.sin(a), k++)); } });
    const dl = tagged(art(textArt('$', 230, GN), 1, 0, 20, { seed: 940 }), { dl: 1 });
    const me = tagged(manAt(0, 0, 0.34, 941), { me: 1 });
    SH.late = makeShape([hsort(pts), dl, me], (t, i, p, b) => {
      if (p.me) { const q = ramp(t, 129.45, 0.65, E.cubicOut); b.x[i] = p.x + lerp(600, 470, q); b.y[i] = p.y + 380; b.a[i] = p.a * clamp(q * 2, 0.02); return; }
      if (p.dl) { b.t[i] = GREEN; b.a[i] = p.a + 0.3 * flash(t, 131.0, 0.3); return; }
      const q = E.cubicOut(ramp(t, 130.25 + 0.7 * hash(p.bk, 3), 1.0)), sx = p.bx * 2.7, sy = 30 + (p.by - 30) * 2.7, run = (1 - q) * 9 * Math.abs(Math.sin(t * 15 + p.bk));
      b.x[i] = lerp(sx, p.bx, q) + (p.x - p.bx); b.y[i] = lerp(sy, p.by, q) + (p.y - p.by) - run; b.a[i] = p.a * clamp(ramp(t, 130.2 + 0.7 * hash(p.bk, 3), 0.3), 0.02); b.t[i] = WHITE;
    });
  }

  // "aprendendo coisa nova… nenhuma me dava dinheiro" — a brain fills with knowledge (blue); the $ stays red
  {
    const brain = tagged(dotArt(brainArt, 1, -90, -60, { seed: 960 }), { br: 1 });
    const inflow = [...Array(900)].map((_, k) => ({ inf: k, x: -90, y: -60, a: 0.02, c: pick('▪·•=', hash(k, 2)), t: BLUE, s: 0.4 + 0.3 * hash(k, 3) }));
    const dl = tagged(art(textArt('$', 220, RD), 1, 320, 60, { seed: 975 }), { dl: 1 });
    SH.learn = makeShape([hsort(brain), inflow, dl], (t, i, p, b) => {
      if (p.dl) { const on = dropIn(t, 141.55, 0.3); b.t[i] = RED; b.a[i] = Math.max(0.02, p.a * (0.35 + 0.65 * clamp(on))) + 0.3 * flash(t, 142.35, 0.2); b.x[i] = p.x + 8 * Math.sin(t * 40) * flash(t, 142.35, 0.25); return; }
      if (p.inf !== undefined) { if (t < 137.1 || t > 140.6) { b.a[i] = 0.02; return; } const u = (hash(p.inf, 4) + (t - 137.1) * 0.9) % 1, a = hash(p.inf, 5) * 6.283, R = 620 * (1 - u); b.x[i] = -90 + R * Math.cos(a); b.y[i] = -60 + R * Math.sin(a) * 0.8; b.a[i] = Math.max(0.02, 0.85 * Math.sin(Math.PI * u)); return; }
      const lvl = 230 - 420 * ramp(t, 137.2, 3.2, E.inOut), lit = p.y > lvl; b.t[i] = lit ? (hash(i, 6) > 0.3 ? BLUE : WHITE) : GRAY; b.a[i] = p.a * (lit ? 1 : 0.4) + (lit ? 0.12 * Math.sin(t * 6 + p.x * 0.05) : 0);
    });
  }

  // "não tinha nada que fosse meu" — a company with its doors shut; a red X crosses it
  {
    const shop = tagged(dotArt(shopClosedArt, 1, 0, -30, { seed: 980 }), { sh: 1 });
    const x1 = tagged(art(strikeArt(-330, -390, 330, 330, 30), 1, 0, 0, { seed: 981, cell: 4 }), { xk: 0 }), x2 = tagged(art(strikeArt(330, -390, -330, 330, 30), 1, 0, 0, { seed: 982, cell: 4 }), { xk: 1 });
    SH.nothing = makeShape([shop, x1, x2], (t, i, p, b) => {
      if (p.xk !== undefined) { const at = 144.5 + p.xk * 0.22, f = ramp(t, at, 0.25, E.cubicOut), along = p.xk === 0 ? (p.x + 330) / 660 : (330 - p.x) / 660; b.a[i] = along < f ? p.a : 0.02; b.t[i] = RED; return; }
      b.a[i] = p.a * (1 - 0.35 * ramp(t, 144.5, 0.5)); if (ramp(t, 144.55, 0.5) * 0.25 > hash(i, 3)) b.t[i] = GRAY;
    });
  }

  // the trap: the bird hops in head first, pecking like a real one, and is caught
  const ground = tagged(art(g => { g.fillStyle = tone(WT, 0.45); RR(g, -480, 212, 960, 8, 4); g.fill(); }, 1, 0, 0, { seed: 990, cell: 4 }), { gr: 1 });
  const crate = tagged(dotArt(crateArt, 1, 0, 60, { seed: 991 }), { cr: 1 });
  const stick = tagged(art(g => { g.strokeStyle = LG(g, 0, 50, 0, 205, [[0, tone(WT, 0.95)], [1, tone(WT, 0.5)]]); g.lineWidth = 14; g.beginPath(); g.moveTo(140, 205); g.lineTo(130, 52); g.stroke(); g.strokeStyle = tone(WT, 0.55); g.lineWidth = 4; g.beginPath(); g.moveTo(136, 130); g.quadraticCurveTo(320, 230, 520, 205); g.stroke(); }, 1, 0, 0, { seed: 992, cell: 4 }), { sk2: 1 });
  {
    const seeds = tagged(dotArt(seedArt, 1, 0, 0, { seed: 993, cell: 4, ids: true }), { sd: 1 });
    const BS5 = 0.95, body = tagged(art(g => { g.scale(BS5, BS5); birdBody(g); }, 1, 0, 0, { seed: 994, cell: 4 }), { bb5: 1 }), head = tagged(art(g => { g.scale(BS5, BS5); birdHead(g); }, 1, 0, 0, { seed: 996, cell: 4 }), { bh5: 1 });
    SH.trap = makeShape([ground, crate.map(p => ({ ...p })), stick.map(p => ({ ...p })), seeds, body, head], (t, i, p, b) => {
      const fall = ramp(t, 155.86, 0.2, E.quadIn), a = A0 * (1 - fall);
      if (p.cr) { rot(b, i, p, HINGE[0], HINGE[1], a); return; }
      if (p.sk2) { rot(b, i, p, 140, 205, 1.3 * ramp(t, 155.86, 0.3, E.quadIn)); b.a[i] = p.a * (1 - 0.7 * fall); return; }
      if (p.sd) { b.a[i] = p.a + 0.5 * flash(t, 153.3, 0.2); return; }
      if (p.bb5 || p.bh5) {
        const on = ramp(t, 152.3, 0.3), x = birdX(t), { st, f } = peck(t), moving = t > 152.55 && st < 7, hop = moving && f < 0.3 ? 16 * Math.sin(Math.PI * f / 0.3) : 0;
        const pk = (t > 152.55 && (!moving || f > 0.32)) ? Math.pow(Math.sin(Math.PI * clamp(((moving ? f : (t - 152.55) / 0.42 % 1) - 0.32) / 0.6)), 2) : 0;
        let px = p.x, py = p.y; if (p.bh5) { const ang = -0.95 * pk, cx = -30 * BS5, cy = -22 * BS5, dx = px - cx, dy = py - cy; px = cx + dx * Math.cos(ang) - dy * Math.sin(ang); py = cy + dx * Math.sin(ang) + dy * Math.cos(ang); }
        b.x[i] = px + x; b.y[i] = py + 152 - hop; b.a[i] = t > 155.95 ? 0.02 : p.a * clamp(on, 0.02); return;
      }
    });
  }
  // "a comida é a novidade" — under the same trap: a real video thumbnail, glowing (media); sparkles around it
  SH.bait = makeShape([ground, crate.map(p => ({ ...p })), stick.map(p => ({ ...p })), [...Array(400)].map((_, k) => ({ spk5: k, x: 40 + (hash(k, 1) - 0.5) * 260, y: 150 + (hash(k, 2) - 0.5) * 120, a: 0.8, c: pick('*+·', hash(k, 3)), t: hash(k, 4) > 0.5 ? BLUE : WHITE, s: 0.4 }))], (t, i, p, b) => {
    if (p.cr) { rot(b, i, p, HINGE[0], HINGE[1], A0); return; }
    if (p.spk5 !== undefined) { b.a[i] = Math.max(0.02, (0.5 + 0.5 * Math.sin(t * 8 + p.spk5)) * ramp(t, 156.9, 0.4)); b.y[i] = p.y - 12 * ((t * 0.5 + hash(p.spk5, 5)) % 1); }
  });

  // "toda semana aparece uma ferramenta nova…" — the IA in white; eight YouTube cards with the real thumbnails (media)
  {
    const ia = tagged(art(textArt('IA', 190, WT), 1, 0, -480, { seed: 1000, cell: 4 }), { ia: 1 });
    const frames = []; TOOL8_POS.forEach(([x, y], k) => art(g => { const { w, h } = CARD5; g.strokeStyle = tone(WT, 0.95); g.lineWidth = 5; RR(g, x - w / 2 - 8, y - h / 2 - 8, w + 16, h + 64, 18); g.stroke(); g.fillStyle = tone(RD, 1); RR(g, x - w / 2, y + h / 2 + 6, w * 0.62, 7, 3); g.fill(); g.fillStyle = tone(WT, 0.4); RR(g, x - w / 2 + w * 0.62, y + h / 2 + 6, w * 0.38, 7, 3); g.fill(); g.fillStyle = tone(WT, 0.8); RR(g, x - w / 2, y + h / 2 + 24, w * 0.7, 12, 6); g.fill(); }, 1, 0, 0, { seed: 1001 + k, cell: 4, nosort: true }).forEach(p => frames.push({ ...p, tk: k })));
    SH.tools = makeShape([ia, hsort(frames)], (t, i, p, b) => {
      if (p.ia) { b.t[i] = WHITE; b.a[i] = Math.min(1, p.a * 1.25) + 0.35 * flash(t, 160.9, 0.25); if (flash(t, 160.9, 0.3) > hash(i, 2) + 0.3) b.t[i] = RED; return; }
      const k = p.tk, [cx, cy] = TOOL8_POS[k]; popAt(t, i, p, b, TOOL8_AT[k], cx, cy);
      const old = Math.max(k < 7 ? ramp(t, TOOL8_AT[k + 1], 0.3) : 0, ramp(t, 166.24, 0.4)); if (old > hash(i, 6)) b.t[i] = GRAY; b.a[i] *= 1 - 0.3 * old; b.y[i] += 10 * old;
    });
  }

  // "nunca tenha nem começado… se empolgou na primeira semana e parou." — a week: days light up in a streak, then it breaks
  {
    const tiles = []; DAYS.forEach((_, k) => { const x = (k - 3) * 132; art(tileArt(x, false), 1, 0, 0, { seed: 1040 + k, cell: 4, nosort: true }).forEach(p => tiles.push({ ...p, dy: k })); if (k < 4) art(tileArt(x, true), 1, 0, 0, { seed: 1050 + k, cell: 4, nosort: true }).filter(p => p.t === ORANGE).forEach(p => tiles.push({ ...p, dfill: k })); });
    const flames = [...Array(4 * 160)].map((_, j) => ({ fl5: j % 4, fj: j, x: (j % 4 - 3) * 132, y: -90, a: 0.9, c: pick('*^\'·', hash(j, 2)), t: hash(j, 3) > 0.4 ? ORANGE : GOLD, s: 0.4 + 0.3 * hash(j, 4) }));
    const me = bustAt(B45, 0, 330, 0);
    SH.start = makeShape([hsort(tiles), flames, hsort(me)], (t, i, p, b) => {
      const broke = ramp(t, 185.42, 0.4);
      if (p.fl5 !== undefined) { const on = ramp(t, DAY_AT[p.fl5], 0.2) * (1 - broke); if (on <= 0) { b.a[i] = 0.02; return; } const u = (hash(p.fj, 5) + t * (1.2 + hash(p.fj, 6))) % 1; b.x[i] = p.x + (hash(p.fj, 7) - 0.5) * 70 * (1 - u); b.y[i] = p.y - 130 * u; b.a[i] = Math.max(0.02, on * 0.9 * (1 - u)); return; }
      if (p.dfill !== undefined) { const on = ramp(t, DAY_AT[p.dfill], 0.18, E.backOut); b.a[i] = Math.max(0.02, p.a * clamp(on)) * (1 - 0.6 * broke); if (broke > hash(i, 3)) b.t[i] = GRAY; return; }
      if (p.dy !== undefined) { b.a[i] = p.a * (t < 183.3 ? 0.5 + 0.35 * Math.abs(Math.sin(t * 2.5)) : 0.9); if (p.dy >= 4 && broke > 0.5) b.t[i] = RED; return; }
      b.y[i] = p.y + 14 * broke; b.t[i] = broke > 0.5 ? GRAY : WHITE;
    });
  }

  // "aquela voz dizendo que o problema era você" — a big figure scratching his head; the red bubble over him
  {
    const S = 1.45, body = tagged(hsort(manT(1, 1050, { k: 0.91 * S, base: 151 * S + 150, pose: 'scratch' })), { me: 1 }), arm = [];
    SH.voice = makeShape([body, arm, tagged(art(redBubble(660, 130), 1, 0, -330, { seed: 1051, cell: 4 }), { bb: 1 })], (t, i, p, b) => {
      if (p.bb) { popAt(t, i, p, b, 186.5, 0, -330, 0.3, 0.7); return; }
      if (p.arm) { const sx = 46 * S, sy = 150 - 90 * S, ang = 0.07 * Math.sin(t * 17) + 0.05 * Math.sin(t * 5); rot(b, i, p, sx, sy, ang); }
      b.t[i] = ramp(t, 188.45, 0.4) * 0.45 > hash(i, 4) ? RED : WHITE; b.a[i] = Math.min(1, p.a * 1.1);
    });
  }

  // "sozinho, com o vídeo feito pra você assistir" — a bigger screen playing a tutorial (media); a brighter figure
  {
    const cone = [...Array(1500)].map((_, k) => { const v = hash(k, 1), w = (hash(k, 2) - 0.5) * 2; return { cone: 1, x: w * lerp(30, 320, v), y: -620 + 1000 * v, a: 0.18 + 0.16 * hash(k, 3), c: pick('.·:', hash(k, 4)), t: WHITE, s: 0.45 }; });
    const me = tagged(manAt(0, 290, 0.55, 1060), { me: 1 });
    const scr = tagged(art(g => { const w = 640, h = 360; g.fillStyle = LG(g, -w / 2, -h / 2, w / 2, h / 2, [[0, tone(WT, 1)], [0.5, tone(WT, 0.7)], [1, tone(WT, 0.45)]]); RR(g, -w / 2 - 16, -h / 2 - 16, w + 32, h + 32, 24); g.fill(); g.fillStyle = VOID; RR(g, -w / 2, -h / 2, w, h, 12); g.fill(); g.fillStyle = tone(WT, 0.75); RR(g, -70, h / 2 + 16, 140, 40, 8); g.fill(); RR(g, -160, h / 2 + 50, 320, 18, 8); g.fill(); }, 1, 0, -230, { seed: 1061, cell: 4 }), { scr: 1 });
    const blk = tagged(art(g => { g.strokeStyle = tone(OR, 0.9); g.lineWidth = 5; g.setLineDash([12, 9]); poly(g, [[0, -50], [60, -20], [0, 10], [-60, -20]]); g.stroke(); poly(g, [[-60, -20], [-60, 50], [0, 80], [60, 50], [60, -20]]); g.stroke(); g.beginPath(); g.moveTo(0, 10); g.lineTo(0, 80); g.stroke(); g.setLineDash([]); }, 1, 340, 360, { seed: 1062, cell: 4 }), { blk: 1 });
    SH.alone = makeShape([hsort(cone), me, scr, blk], (t, i, p, b) => {
      if (p.scr) { popAt(t, i, p, b, 190.85, 0, -230); return; }
      if (p.blk) { const on = ramp(t, 193.2, 0.3); b.a[i] = p.a * clamp(on * (0.6 + 0.3 * Math.sin(t * 4)), 0.02); return; }
      if (p.cone) { b.a[i] = p.a * (0.8 + 0.2 * Math.sin(t * 1.5 + p.y * 0.01)); return; }
      b.a[i] = Math.min(1, p.a * 1.2);
    });
  }

  // "quase ninguém começa… quase nunca chega ao fim" — a track in perspective to a glowing finish arch; five leave, all fall short
  {
    const track = []; for (let k = 0; k < 900; k++) { const ln = k % 6, v = (k / 6 | 0) / 150, sc = lerp(1, 0.3, v), x = (ln - 2.5) * 150 * sc, y = lerp(470, -150, v); track.push({ tr: 1, x, y, a: 0.5 * (1 - 0.4 * v), c: CI['·'], t: WHITE, s: 0.5 * sc + 0.2 }); }
    const arch = tagged(dotArt(archArt, 0.82, 0, -250, { seed: 1071 }), { ar: 1 });
    const confetti = [...Array(500)].map((_, k) => ({ cf: k, x: (hash(k, 1) - 0.5) * 380, y: -420 + hash(k, 2) * 300, a: 0.8, c: pick('▪•*', hash(k, 3)), t: hash(k, 4) > 0.5 ? GOLD : GREEN, s: 0.35 }));
    const crowd = []; for (let r = 0; r < 3; r++) for (let c = 0; c < 9; c++) crowd.push(...bustAt(BUSTD_T, (c - 4) * 70 + (r % 2) * 30, 400 + r * 46, r * 9 + c));
    const runners = []; RUN5.forEach((_, k) => FULL_T.forEach(p => runners.push({ ...p, rsc: 0.4, rx: p.x * 0.4, ry: p.y * 0.4, rn: k })));
    SH.path = makeShape([track, arch, confetti, hsort(crowd), runners], (t, i, p, b) => {
      if (p.ar) { b.a[i] = Math.min(1, p.a * 1.2) + 0.25 * Math.sin(t * 3); return; }
      if (p.cf !== undefined) { b.y[i] = -420 + ((hash(p.cf, 2) * 300 + t * 40) % 300); b.x[i] = p.x + 8 * Math.sin(t * 2 + p.cf); b.a[i] = 0.25 + 0.35 * Math.sin(t * 5 + p.cf); return; }
      if (p.tr) return;
      if (p.rn !== undefined) {
        const [dist, lx] = RUN5[p.rn], q = E.cubicOut(ramp(t, 195.3 + p.rn * 0.12, 1.5)), v = dist * q, sc = lerp(1, 0.3, v), stop = ramp(t, 196.3 + p.rn * 0.15, 0.4);
        b.x[i] = lx * sc + p.rx * sc; b.y[i] = lerp(430, -150, v) + p.ry * sc - 60 * sc - 8 * Math.abs(Math.sin(t * 12)) * (1 - stop) * sc; b.s[i] = p.s * (0.5 + 0.6 * sc);
        b.a[i] = p.a * clamp(ramp(t, 195.2, 0.3), 0.02) * (1 - 0.5 * stop); if (stop > hash(i, 5)) b.t[i] = RED; return;
      }
      b.t[i] = GRAY; b.a[i] = p.a * 0.75;
    });
  }

  // "'Ganhe dinheiro com IA'… carro e print de faturamento… nunca como chegar lá" — a bigger phone with a real thumbnail; the car and the print as panels (media)
  {
    const ph = tagged(art(g => phoneArt(g), 0.95, 0, -40, { seed: 1080 }), { ph: 1 });
    const q = tagged(art(textArt('?', 230, WT), 1, 0, -500, { seed: 1083, cell: 4 }), { q: 1 });
    SH.flex = makeShape([ph, q], (t, i, p, b) => {
      if (p.q) { popAt(t, i, p, b, 204.1, 0, -500, 0.35, 0.6); b.t[i] = ramp(t, 204.5, 0.5) * 0.5 > hash(i, 3) ? RED : WHITE; return; }
      b.a[i] = Math.min(1, p.a * 1.1);
    });
  }

  // "nunca sair do lugar" — the rat-race b-roll behind (media); the wheel bigger in front
  {
    const C = [0, -40], S = 1.0;
    const stand = dotArt(standArt, S, C[0], C[1], { seed: 1090 }), wheel = tagged(dotArt(wheelArt, S, C[0], C[1], { seed: 1091 }), { wh: 1 }), run = tagged(manT(1, 1092, { k: 0.55 * S, base: 70 * S + 145, view: 'side', pose: 'run' }), { rn: 1 });
    SH.wheel = makeShape([stand, wheel, run], (t, i, p, b) => {
      if (p.wh) { const a = 2.0 * (t - 205.1) + 3.2 * Math.max(0, t - 207.15) ** 1.2; rot(b, i, p, C[0], C[1], a); return; }
      if (p.rn) return;
      b.t[i] = GRAY;
    });
  }

  // "parei de pular de galho em galho" — a bigger bird, squash on landing, a stretch in the air; leaves sway
  SH.branches = makeShape([dotArt(branchArt, 1, 0, 0, { seed: 1100 }), tagged(art(birdArt(0.85), 1, 0, 0, { seed: 1101, cell: 4 }), { bd: 1 })], (t, i, p, b) => {
    if (!p.bd) { b.t[i] = GRAY; b.a[i] = p.a; if (Math.abs(p.x) > 300) b.y[i] = p.y + 5 * Math.sin(t * 2.2 + p.x * 0.02); return; }
    const [x, y, dir] = birdAt(t); let k = 0; while (k < HOPS.length && t >= HOPS[k] + 0.28) k++;
    const air = k < HOPS.length && t >= HOPS[k], land = k > 0 ? t - (HOPS[k - 1] + 0.28) : 9, sq = air ? 1.12 : 1 - 0.22 * Math.exp(-land * 14);
    b.x[i] = x + p.x * dir * (air ? 0.92 : 2 - sq); b.y[i] = y + p.y * sq;
  });

  // "fui olhar pra onde a maioria não estava olhando" — the majority stares at a real thumbnail; I look at the mouth of a cave full of daylight
  {
    const crowd = []; for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) crowd.push(...bustAt(BUSTD_T, -470 + c * 62 + (r % 2) * 20, -20 + r * 80, r * 6 + c));
    const me = FULL_T.map(p => ({ ...p, rsc: 0.7, x: p.x * 0.7 + 150, y: p.y * 0.7 + 260, s: p.s * 0.9, me5: 1 }));
    const cave = tagged(dotArt(caveArt, 0.85, 330, -160, { seed: 1112 }), { cv: 1 });
    const sight = [...dotted(-300, 60, -330, -230, 40, { s1: 1 }, GRAY), ...dotted(180, 150, 330, -60, 40, { s2: 1 })];
    SH.look = makeShape([hsort(crowd), me, cave, sight], (t, i, p, b) => {
      if (p.s1) { b.a[i] = p.a * clamp(ramp(t, 217.5, 0.4), 0.02); return; }
      if (p.s2) { b.a[i] = p.a * clamp(ramp(t, 218.9, 0.5), 0.02); return; }
      if (p.cv) { const day = ramp(t, 219.2, 0.6); if (p.t !== WHITE && p.t !== GOLD) return; b.a[i] = p.a * (0.55 + 0.45 * day) + 0.3 * flash(t, 219.4, 0.3); return; }
      if (p.me5) { b.a[i] = Math.min(1, p.a * 1.1); return; }
      if (p.bk !== undefined) { b.t[i] = WHITE; b.a[i] = p.a * 0.9; }
    });
  }

  // "a informação que todo mundo tem… a que pouca gente percebeu" — the scroll b-roll behind (media); an endless feed of the same cards;
  // then what nobody was looking at: banknotes and a key, lifted into the light
  {
    const docs = []; for (let r = 0; r < 6; r++) for (let c = 0; c < 3; c++) art(docArt, 1, (c - 1) * 250, -420 + r * 170, { seed: 1120 + r * 3 + c, cell: 4, nosort: true }).forEach(p => docs.push({ ...p, dc: r * 3 + c }));
    const bills = tagged(dotArt(billArt, 1, 0, 0, { seed: 1140 }), { bl5: 1 }), key = tagged(dotArt(keyArt2, 0.8, 0, 0, { seed: 1141 }), { ky5: 1 });
    SH.info = makeShape([hsort(docs), bills, key], (t, i, p, b) => {
      const go = ramp(t, 225.1, 0.7, E.inOut);
      if (p.bl5) { b.x[i] = lerp(380, -150, go) + p.x * lerp(0.4, 1, go); b.y[i] = lerp(420, 120, go) + p.y * lerp(0.4, 1, go); b.t[i] = GREEN; b.a[i] = p.a * (0.25 + 0.75 * go) + 0.3 * flash(t, 226.85, 0.2); return; }
      if (p.ky5) { const on = ramp(t, 226.2, 0.6, E.backOut); b.x[i] = lerp(-380, 190, on) + p.x * lerp(0.4, 1, on); b.y[i] = lerp(420, 140, on) + p.y * lerp(0.4, 1, on) - 10 * Math.sin(t * 2); b.a[i] = p.a * clamp(on, 0.02) + 0.4 * flash(t, 226.85, 0.2); return; }
      const sc = ((p.y + 420 - (t - 220.2) * 260) % 1020 + 1020) % 1020 - 420 - p.y; b.y[i] = p.y + sc; const dim = ramp(t, 223.2, 0.6); b.t[i] = GRAY; b.a[i] = p.a * (0.9 - 0.4 * dim) * (1 - 0.85 * go); if (flash(t, 224.5, 0.25) > hash(i, 9) + 0.4) b.t[i] = RED;
    });
  }

  // "o meu resultado deixou de ser o da multidão" — the bars rise; mine keeps rising, green, off the top
  {
    const bars = []; for (let k = 0; k < 13; k++) { const x = -470 + k * 66, h = 70 + 60 * hash(k, 3); art(g => { g.fillStyle = LG(g, x - 22, 0, x + 22, 0, [[0, tone(WT, 0.4)], [0.5, tone(WT, 0.85)], [1, tone(WT, 0.4)]]); g.fillRect(x - 22, 300 - h, 44, h); }, 1, 0, 0, { seed: 1150 + k, cell: 4, nosort: true }).forEach(p => bars.push({ ...p, br: k })); }
    const mine = tagged(art(g => { g.fillStyle = LG(g, 380, 0, 460, 0, [[0, tone(GN, 0.55)], [0.5, tone(GN, 1)], [1, tone(GN, 0.5)]]); g.fillRect(380, -760, 80, 1060); }, 1, 0, 0, { seed: 1170, cell: 4, h: 2000 }), { gb: 1 });
    const base = art(g => { g.fillStyle = tone(WT, 0.5); RR(g, -500, 302, 1000, 6, 3); g.fill(); }, 1, 0, 0, { seed: 1171, cell: 4 });
    SH.result = makeShape([hsort(bars), mine, base], (t, i, p, b) => {
      if (p.gb) { const lvl = 300 - 1060 * ramp(t, 227.8, 2.2, E.inOut); b.t[i] = GREEN; b.a[i] = p.y > lvl ? Math.min(1, p.a * 1.2) + 0.3 * flash(t, 229.1, 0.2) : 0.02; return; }
      if (p.br !== undefined) { const grow = ramp(t, 227.6 + p.br * 0.04, 0.5, E.backOut); b.y[i] = 300 + (p.y - 300) * clamp(grow, 0.05, 1.2); b.t[i] = GRAY; b.a[i] = p.a * (0.85 - 0.35 * ramp(t, 229.8, 0.5)); }
    });
  }

  // "com a IA, a história se repete…" — the IA in blue; the crowd with the real logos (media); the small group builds an app window
  {
    const ia = tagged(art(textArt('IA', 230, BL), 1, 0, -360, { seed: 1190 }), { ia: 1 });
    const crowd = crowd3Pts(CROWD3.filter((_, k) => k >= 9), false);
    const g7r = []; for (let k = 0; k < 7; k++) FULL_T.forEach(p => g7r.push({ ...p, rsc: 0.6, x: p.x * 0.6 + G7X(k) * 0.8, y: p.y * 0.6 + 360 + 8 * Math.abs(k - 3), s: p.s * 0.75, g7: k, bx: G7X(k) * 0.8, by: 360 }));
    const win = tagged(art(winArt, 0.62, 0, 150, { seed: 1192, cell: 4 }), { wn: 1 });
    SH.repeat = makeShape([ia, hsort(crowd), hsort(g7r), win], (t, i, p, b) => {
      if (p.ia) { b.t[i] = BLUE; b.a[i] = Math.min(1, p.a * 1.15) + 0.3 * flash(t, 233.8, 0.2); return; }
      if (p.g7 !== undefined) { popAt(t, i, p, b, 237.0 + p.g7 * 0.05, p.bx, p.by); return; }
      if (p.wn) { const at = 238.7 + 0.5 * clamp((p.y - 80) / 140), on = dropIn(t, at, 0.3); b.a[i] = p.a * clamp(on, 0.02) + 0.3 * flash(t, 239.3, 0.2); b.y[i] = p.y - 30 * (1 - clamp(on)); if (ramp(t, 239.25, 0.4) > hash(i, 3)) b.t[i] = WHITE; return; }
      const d = place3(b, i, p, { x: 0.15 * Math.sin((t - 233.2) * 0.5), z: -0.35 + 0.15 * ramp(t, 233.2, 6, E.inOut) }, 6 * ramp(t, 235.3, 0.5)), far = 0.35 + 0.65 * clamp(2.2 / d - 0.15);
      b.t[i] = GRAY; b.a[i] = p.a * far * (0.75 + 0.25 * ramp(t, 235.3, 0.5));
    });
  }
}

// ───────────────────────── media layers
const repCam = t => ({ x: 0.15 * Math.sin((t - 233.2) * 0.5), z: lerp(0.95, -0.35, E.inOut(ramp(t, 233.3, 2.6))) }); // v6: starts close (a lot of people), pulls back
const LOGOS = ['logo_gpt.png', 'logo_claude.png', 'logo_gemini.png'];
function drawLogos(g, t, list, cam, onAt, offAt, lift) {
  const items = list.map(([X, Z], k) => ({ X, Z, k })).sort((a, b) => b.Z - a.Z);
  for (const it of items) {
    const [px, py, s, d] = proj(it.X, it.Z, cam.x, cam.z), m = s * 2.1, y = py + (-118 - lift(it.k)) * m;
    const near = clamp((d - 0.35) / 0.45) * clamp((600 - y) / 140), far = 0.35 + 0.65 * clamp(2.2 / d - 0.15), on = dropIn(t, onAt(it.k), 0.3) * (1 - ramp(t, offAt, 0.3));
    const sz = 64 * m * (0.85 + 0.15 * clamp(on)), a = near * far * clamp(on);
    if (a > 0.01) mediaDraw(g, IMGS[LOGOS[it.k % 3]], px - sz / 2, y - sz / 2, sz, sz, { contain: true, a, blur: 0.3, grain: 0.18, br: 1.05, sat: 1 });
  }
}
// the screen-space b-roll behind everything
function drawMediaBG5(g, t) {
  const bg = (id, t0, t1, a0, o = {}) => { const a = a0 * ramp(t, t0, 0.4) * (1 - ramp(t, t1 - 0.4, 0.4)); if (a > 0.01) mediaDraw(g, seqImg(id, t), 0, 0, W, H, { a, blur: 1.1, grain: 0.32, br: 0.75, sat: 0.7, ...o }); };
  bg('prog', 65.8, 70.4, 0.85 - 0.62 * ramp(t, 68.3, 0.4));
  bg('ratos', 204.9, 209.0, 0.55);
  // v6: the 3:39 b-roll replaces the scroll (drawMediaBG)
}
// media living inside the world (follow the camera)
function drawMediaWorld5(g, t, M) {
  g.setTransform(M[0], M[1], M[2], M[3], M[4], M[5]);
  // hook crowd and the final crowd: the real assistants above the heads
  if (t > 12.5 && t < 15.95) drawLogos(g, t, CROWD3, crowdCam(t), k => 13.1 + 0.5 * hash(k, 9), 15.55, k => 7 * ramp(t, 14.7, 0.2) * Math.abs(Math.sin((t - 14.7) * 5.2)) + 6 * Math.sin(t * 2.4 + k));
  if (t > 235 && t < 240.2) drawLogos(g, t, CROWD3.filter((_, k) => k >= 9), repCam(t), k => 235.3 + 0.4 * hash(k, 9), 239.75, () => 6 * ramp(t, 235.3, 0.5));
  // Netflix on the tower
  if (t > 54.4 && t < 57.6) {
    const off = ramp(t, 55.9, 0.6), s = 1 - 0.1 * off, a = ramp(t, 54.75, 0.5) * (1 - 0.45 * off) * (1 - ramp(t, 57.15, 0.3)), Y = y => 420 + (y - 420) * s;
    g.save(); g.shadowColor = 'rgba(229,9,20,0.8)'; g.shadowBlur = 40 * a;
    mediaDraw(g, IMGS['netflix_name.png'], -112 * s, Y(-540), 224 * s, Y(-420) - Y(-540), { contain: true, a, blur: 0.4, grain: 0.2, sat: 1, br: 1.05 });
    mediaDraw(g, IMGS['netflix_n.png'], -85 * s, Y(-320), 170 * s, Y(-40) - Y(-320), { contain: true, a: a * 0.95, blur: 0.5, grain: 0.25, sat: 1, br: 1 });
    g.restore();
  }
  // the partners: Igor alone, then Igor and Emmanuel
  if (false && t > 78.2 && t < 86.1) { // v6: drawMediaWorld
    const a1 = ramp(t, 78.4, 0.5) * (1 - ramp(t, 83.55, 0.35)), s1 = 0.95 + 0.05 * ramp(t, 78.4, 0.6, E.cubicOut);
    if (a1 > 0.01) mediaDraw(g, seqImg('igor', t), -330 * s1, -260, 660 * s1, 1173 * s1, { a: a1, fade: 0.55, fadeX: 0.16, blur: 0.4, grain: 0.3, sat: 0.8, br: 0.95 });
    const a2 = ramp(t, 83.55, 0.4) * (1 - ramp(t, 85.75, 0.3));
    if (a2 > 0.01) { mediaDraw(g, seqImg('igor', t), -470, -200, 480, 853, { a: a2, fade: 0.6, fadeX: 0.16, blur: 0.4, grain: 0.3, sat: 0.8 }); mediaDraw(g, seqImg('emm', t), -40, -300, 560, 996, { a: a2 * ramp(t, 84.1, 0.4), fade: 0.6, fadeX: 0.16, blur: 0.4, grain: 0.3, sat: 0.8 }); }
  }
  // the SALG on real screens, in 3D
  if (false && t > 85.7 && t < 93.0) { // v7: the SALG in a laptop
    const A = ramp(t, 85.85, 0.5) * (1 - ramp(t, 92.55, 0.35)), fl = k => 14 * Math.sin(t * 1.1 + k), orb = 0.08 * Math.sin((t - 86) * 0.5);
    const enter = (at, d = 0.9) => E.cubicOut(ramp(t, at, d)), push = ramp(t, 90.6, 0.8, E.inOut), fun = ramp(t, 91.5, 0.8, E.inOut);
    const P = [
      { im: C6.IMG + 'salg_criativos.jpg', x: -290, y: -330 + fl(1), z: 520, w: 680, ry: 0.42 + orb, a: enter(88.6) },
      { im: C6.IMG + 'salg_ranking.jpg', x: 300, y: 300 + fl(2), z: 560, w: 680, ry: -0.42 + orb, a: enter(89.0) },
      { im: C6.IMG + 'salg_funil2.jpg', x: lerp(-260, 0, fun), y: lerp(330, 250, fun) + fl(3), z: lerp(620, -150, fun), w: 680, ry: lerp(0.35, 0.05, fun) + orb, a: enter(89.4) },
      { im: C6.IMG + 'salg_dash.jpg', x: 0, y: lerp(-130, -220 - 120 * fun, push) + fl(0), z: lerp(1700, 0, enter(87.9, 1.0)) - 250 * push + 380 * fun, w: 900, ry: lerp(0.9, -0.18, enter(87.9, 1.0)) + orb, a: enter(87.9, 0.4) },
    ].sort((a, b) => b.z - a.z);
    { const sa = A * ramp(t, 85.95, 0.4) * (1 - ramp(t, 88.1, 0.5)), im = C6.im('salg_scroll_top.jpg'); if (sa > 0.01 && im) { const win = 1350, sy = lerp(0, 1050, E.inOut(ramp(t, 86.0, 2.1, E.lin))); g.save(); g.shadowColor = 'rgba(255,255,255,0.25)'; g.shadowBlur = 40 * sa; C6.quadWin(g, im, panel3(0, -60 + fl(0), 0, 760, 950, -0.38 + 0.06 * Math.sin(t * 0.7), 0.22), sy, win, { a: sa, stroke: 'rgba(255,255,255,0.5)', grain: 0.12, br: 1.15, blur: 0.25 }); g.restore(); } }
    for (const q of P) { const im = IMGS[q.im], h = q.w * (im ? im.height / im.width : 0.5); mediaQuad(g, im, panel3(q.x, q.y, q.z, q.w, h, q.ry, 0.12), { a: A * q.a, stroke: 'rgba(187,163,255,0.8)', grain: 0.22, br: 1.18 }); }
  }
  if (false && t > 92.6 && t < 97.0) { const a = ramp(t, 92.7, 0.4) * (1 - ramp(t, 96.55, 0.3)); mediaQuad(g, C6.im('salg_dash.jpg'), panel3(0, 30, 0, 460, 199, 0.15 * Math.sin(t * 0.8), 0.1), { a: a * 0.85, stroke: 'rgba(255,122,112,0.7)', br: 1.0 }); }
  if (false && t > 100.9 && t < 105.1) { const a = ramp(t, 101.0, 0.5) * (1 - ramp(t, 104.75, 0.3)); g.save(); g.shadowColor = 'rgba(242,193,78,0.6)'; g.shadowBlur = 30 * a; mediaQuad(g, C6.im('salg_dash.jpg'), panel3(0, -200, 0, 640, 277, 0.12 * Math.sin(t * 0.7), 0.08), { a, stroke: 'rgba(245,203,98,0.95)', br: 1.12 }); g.restore(); }
  if (false && t > 104.9 && t < 109.0) { const a = ramp(t, 105.0, 0.5) * (1 - ramp(t, 108.6, 0.3)); mediaQuad(g, IMGS['salg_dashboard.jpg'], panel3(250, -380, 0, 360, 173, -0.2, 0.08), { a: a * 0.9, stroke: 'rgba(245,203,98,0.95)', br: 1.1 }); }
  // the bait: a real thumbnail under the trap
  if (false && t > 156.4 && t < 159.0) { const a = ramp(t, 156.7, 0.4) * (1 - ramp(t, 158.75, 0.25)); g.save(); g.shadowColor = 'rgba(147,188,255,0.9)'; g.shadowBlur = 40 * a * (0.7 + 0.3 * Math.sin(t * 6)); mediaDraw(g, IMGS['week7.jpg'], -80, 92, 230, 129, { a, r: 10, grain: 0.25, blur: 0.5, sat: 1.05, br: 1.05 }); g.restore(); }
  // the eight weeks: thumbnails living inside the cards (mini b-rolls)
  if (t > 161.2 && t < 167.0) TOOL8_POS.forEach(([x, y], k) => {
    const on = dropIn(t, TOOL8_AT[k], 0.3), s = 0.8 + 0.2 * clamp(on), old = Math.max(k < 7 ? ramp(t, TOOL8_AT[k + 1], 0.3) : 0, ramp(t, 166.24, 0.4)), a = clamp(on) * (1 - ramp(t, 166.6, 0.25));
    if (a < 0.01) return; const { w, h } = CARD5, u = t - TOOL8_AT[k];
    mediaDraw(g, IMGS[`week${k + 1}.jpg`], x - w / 2 * s, y - h / 2 * s + 10 * old, w * s, h * s, { a, r: 10, zoom: 1.04 + 0.05 * u, panX: 0.4 * Math.sin(u * 0.9 + k), panY: 0.3 * Math.cos(u * 0.7 + k), blur: 0.7, grain: 0.28, gray: old * 0.9, br: 1 - 0.35 * old, sat: 1 });
  });
  // the tutorial inside the big screen
  if (false && t > 190.6 && t < 194.0) { const on = dropIn(t, 190.85, 0.3), a = clamp(on) * (1 - ramp(t, 193.75, 0.25)); mediaDraw(g, seqImg('tut', t), -320 * (0.8 + 0.2 * clamp(on)), -230 - 180 * (0.8 + 0.2 * clamp(on)), 640 * (0.8 + 0.2 * clamp(on)), 360 * (0.8 + 0.2 * clamp(on)), { a, r: 12, blur: 0.5, grain: 0.3, br: 1.0, sat: 0.9 }); }
  // the 'ganhe dinheiro com IA' world: a thumbnail in the phone, the car and the print as panels
  if (t > 197.5 && t < 205.2) {
    const A = ramp(t, 197.9, 0.4) * (1 - ramp(t, 204.9, 0.3)), dim = ramp(t, 203.1, 0.6);
    mediaDraw(g, IMGS['week8.jpg'], -142, -230, 284, 160, { a: A, r: 10, blur: 0.5, grain: 0.25, br: 1.02 - 0.4 * dim, gray: dim * 0.8, sat: 1 });
    const car = E.cubicOut(ramp(t, 201.3, 0.6)), pr = E.cubicOut(ramp(t, 201.9, 0.6));
    if (car > 0.01) { const x = lerp(-620, -330, car); mediaQuad(g, IMGS['carro.jpg'], panel3(x, 130 + 10 * Math.sin(t), 0, 250, 444, 0.35 + 0.05 * Math.sin(t * 0.8), 0.05), { a: A * car, stroke: 'rgba(245,203,98,0.9)', br: 1.05 - 0.4 * dim, grain: 0.28 }); }
    if (pr > 0.01) { const x = lerp(620, 330, pr); mediaQuad(g, IMGS['print.jpg'], panel3(x, 130 + 10 * Math.sin(t + 1), 0, 250, 444, -0.35 + 0.05 * Math.sin(t * 0.8 + 1), 0.05), { a: A * pr, stroke: 'rgba(91,227,154,0.9)', br: 1.05 - 0.4 * dim, grain: 0.28 }); }
  }
  // the majority's NOVO: a real thumbnail
  if (t > 217.1 && t < 220.3) { const a = ramp(t, 217.3, 0.4) * (1 - ramp(t, 220.0, 0.25)); g.save(); g.shadowColor = 'rgba(147,188,255,0.9)'; g.shadowBlur = 35 * a; mediaDraw(g, IMGS['week5.jpg'], -460, -390, 260, 146, { a, r: 10, blur: 0.5, grain: 0.25, br: 1.05, sat: 1 }); g.restore(); }
  g.setTransform(1, 0, 0, 1, 0, 0);
}
// a payment card (vector): white card, green check, "SALG · MENSAL"
function payCard(g, x, y, s, a) {
  if (a <= 0.01) return; g.save(); g.globalAlpha = a; g.translate(x, y); g.scale(s, s);
  g.fillStyle = '#F2F2F5'; RR(g, -95, -34, 190, 68, 14); g.fill(); g.fillStyle = '#3DDC84'; g.beginPath(); g.arc(-62, 0, 20, 0, 7); g.fill();
  g.strokeStyle = '#06210f'; g.lineWidth = 5; g.beginPath(); g.moveTo(-72, 0); g.lineTo(-64, 9); g.lineTo(-51, -9); g.stroke();
  g.fillStyle = '#111'; g.font = `700 20px 'JetBrains Mono'`; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('SALG', -34, -10); g.fillStyle = '#555'; g.font = `500 15px 'JetBrains Mono'`; g.fillText('MENSAL · PAGO', -34, 13);
  g.restore();
}
function drawOverlays5(g, t) {
  const mono = (px, w = 500) => `${w} ${px}px 'JetBrains Mono'`;
  const lbl = (s, x, y, t0, t1, col, px = 22, w = 700, seed = 7, sp = 4) => { const p = clamp((t - t0) / 0.35), a = clamp(p * 3) * (1 - ramp(t, t1, 0.25)); if (a > 0) text(g, decode(s, p, seed), x, y, mono(px, w), col, a, 'center', sp); };
  // months ticking under the small app, each paid
  if (t > 59.8 && t < 61.7) { const M = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'], off = (t - 59.9) * 520, a = ramp(t, 59.9, 0.3) * (1 - ramp(t, 61.4, 0.25));
    M.forEach((m, k) => { const x = -300 + k * 150 - off + 600; if (x < -520 || x > 520) return; const paid = x < 0; g.globalAlpha = a; g.strokeStyle = paid ? '#5BE39A' : '#7C7C86'; g.lineWidth = 2; RR(g, x - 56, 128, 112, 70, 12); g.stroke(); g.globalAlpha = 1; text(g, m, x, 150, mono(20, 700), paid ? '#5BE39A' : '#A0A0AA', a, 'center', 3); text(g, paid ? '✓ PAGO' : '…', x, 178, mono(15, 700), paid ? '#F5CB62' : '#7C7C86', a, 'center', 2); }); }
  // the roles of the team, and again inside the phone
  TEAM_P.forEach(([x, y], k) => lbl(ROLES[k], x, y + 128, 62.4 + k * 0.12, 65.95, '#FFB07A', 17, 700, 70 + k, 3));
  if (false && t > 70.0 && t < 73.6) TEAM_P.forEach(([x, y], k) => { const q = inQ(t, k), [ix, iy] = IN5[k], a = 1 - ramp(t, 73.3, 0.25); text(g, ROLES[k], lerp(x, ix + 18, q), lerp(y + 128, iy, q) - 120 * Math.sin(Math.PI * q), mono(lerp(17, 15, q), 700), q > 0.6 ? '#BBA3FF' : '#FFB07A', a, q > 0.6 ? 'left' : 'center', 2); });
  // the payment cards flying into the SALG
  PAY_AT.forEach((P, j) => { for (let k = 0; k < 7; k++) { const at = P + k * 0.05 + 0.2 * hash(k, j), u = clamp((t - at) / 0.7); if (u <= 0 || u >= 1) continue; const sx = (k - 3) * 145, sy = 250, q = E.inOut(u); payCard(g, lerp(sx, 0, q), lerp(sy, -200, q) - 80 * Math.sin(Math.PI * q), lerp(0.75, 0.35, q), Math.sin(Math.PI * Math.min(1, u * 1.2))); } });
  { const n = PAY_AT.filter(P => t >= P + 0.75).length * 7; if (t > 101.6 && t < 104.9 && n) lbl(`+${n} ASSINANTES`, 0, -10, 102.6, 104.9, '#5BE39A', 24, 700, 99); }
  // the levels of the staircase
  ['NÍVEL 1', 'NÍVEL 2', 'NÍVEL 3'].forEach((s, k) => lbl(s, STEP5[k + 1][0], STEP5[k + 1][1] - 60 * (k + 1) - 170, STEP_AT5[k] + 0.2, 108.75, k === 2 ? '#F5CB62' : '#FFFFFF', 20, 700, 80 + k));
  // the days of the week
  DAYS.forEach((d, k) => { const x = (k - 3) * 132, lit = k < 4 && t > DAY_AT[k], broke = t > 185.42; text(g, d, x, 0, mono(22, 700), lit && !broke ? '#050506' : broke && k >= 4 ? '#FF7A70' : '#CDCDD3', ramp(t, 181.1, 0.4) * (1 - ramp(t, 185.75, 0.2)), 'center', 2); });
  lbl('A PRIMEIRA SEMANA', 0, -300, 183.4, 185.75, '#FFB07A', 26, 700, 85, 6);
}

function buildShapes() { buildShapesHook(); buildShapesB(); buildShapesV5(); }


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
  // 'xf' (and any entrance after a void, i.e. after Vitor's footage): a crossfade in place, never flying or spraying
  const xf = key.dl === 'xf' || KEYS[k - 1].s === 'void';
  for (let i = 0; i < N; i++) {
    const p = clamp((t - key.t - key.st * D[i]) / key.d);
    if (p <= 0) { copyAgent(o, i, F); continue; }
    if (p >= 1) { copyAgent(o, i, G); continue; }
    const q = ease(p);
    if (xf) { if (q < 0.5) { copyAgent(o, i, F); o.a[i] = F.a[i] * (1 - 2 * q); } else { copyAgent(o, i, G); o.a[i] = G.a[i] * (2 * q - 1); } continue; }
    if (G.a[i] < 0.01 || F.a[i] < 0.01) { // leaving or arriving: dissolve in place, never fly across the frame
      const leaving = G.a[i] < 0.01, ql = leaving ? q : 1 - q, B = leaving ? F : G, O = leaving ? G : F;
      const ddx = O.x[i] - B.x[i], ddy = O.y[i] - B.y[i], dl = Math.hypot(ddx, ddy) + 1e-3, m = Math.min(dl, 90) * ql;
      o.x[i] = B.x[i] + (ddx / dl) * m; o.y[i] = B.y[i] + (ddy / dl) * m;
      o.a[i] = B.a[i] * Math.pow(1 - ql, 2); o.c[i] = B.c[i];
      o.t[i] = B.t[i]; o.s[i] = B.s[i]; continue;
    }
    const dx = G.x[i] - F.x[i], dy = G.y[i] - F.y[i], len = Math.hypot(dx, dy) + 1e-3;
    const sw = key.sw * (hash(i, k * 7) - 0.5) * 2 * Math.sin(Math.PI * q) * Math.min(1, len / 300);
    o.x[i] = F.x[i] + dx * q - (dy / len) * sw;
    o.y[i] = F.y[i] + dy * q + (dx / len) * sw;
    o.a[i] = lerp(F.a[i], G.a[i], q) + 0.3 * Math.sin(Math.PI * q);
    o.c[i] = q < 0.5 ? F.c[i] : G.c[i];
    o.t[i] = q < 0.5 ? F.t[i] : G.t[i];
    o.s[i] = lerp(F.s[i], G.s[i], q);
  }
  return o;
}
function stateAt(t) { return evalKey(keyAt(t), t, 0); }

// ───────────────────────── camera: keyed, then operated (nearly still while the narrator is on)
const CAM0 = { x: 0, y: 0, z: 1.0, r: 0 };
const CAMK = [
  { t: 3.88, d: 0.9, x: 0, y: -10, z: 1.12, r: 0, e: 'expoOut' },          // the wallet in two hands
  { t: 4.5, d: 0.8, x: 30, y: 0, z: 1.2, r: 0.006, e: 'inOut' },           // it opens: nothing
  { t: 5.0, d: 1.0, x: 0, y: -60, z: 0.95, r: 0, e: 'inOut' },             // the bubbles
  { t: 6.0, d: 1.6, x: 0, y: -90, z: 0.99, r: -0.006, e: 'sine' },
  { t: 7.6, d: 1.0, x: 0, y: -10, z: 1.05, r: 0, e: 'inOut' },             // the phone
  { t: 8.8, d: 1.0, x: 0, y: -20, z: 1.14, r: 0.008, e: 'sine' },
  { t: 9.75, d: 0.8, x: 0, y: -200, z: 1.1, r: 0, e: 'expoOut' },          // chega
  { t: 10.3, d: 1.1, x: 0, y: 0, z: 0.95, r: 0, e: 'inOut' },
  { t: 11.3, d: 1.2, x: 0, y: 40, z: 0.84, r: 0, e: 'expoOut' },           // milhões
  { t: 12.55, d: 1.2, x: 0, y: -20, z: 1.0, r: 0, e: 'inOut' },            // into the crowd (the dolly lives in the shape)
  { t: 13.8, d: 1.8, x: 0, y: -10, z: 1.04, r: -0.01, e: 'sine' },
  { t: 15.6, d: 0.8, x: 0, y: 0, z: 1.0, r: 0, e: 'inOut' },               // narrator
  { t: 20.1, d: 1.0, x: 0, y: -80, z: 1.0, r: 0, e: 'expoOut' },           // the ring
  { t: 21.3, d: 1.3, x: 0, y: -60, z: 1.12, r: 0.01, e: 'inOut' },
  { t: 22.75, d: 1.0, x: 0, y: -40, z: 0.98, r: 0, e: 'inOut' },           // the seven step out
  { t: 23.75, d: 0.8, x: 0, y: -240, z: 1.08, r: 0, e: 'inOut' },          // </>
  { t: 24.6, d: 1.0, x: 0, y: -60, z: 1.0, r: 0, e: 'inOut' },
  { t: 25.6, d: 0.9, x: 0, y: -40, z: 0.96, r: 0, e: 'inOut' },            // building
  { t: 26.8, d: 0.6, x: 0, y: -330, z: 1.1, r: 0, e: 'inOut' },            // the IA
  { t: 27.45, d: 0.9, x: 0, y: -60, z: 1.02, r: 0, e: 'expoOut' },
  { t: 28.65, d: 0.6, x: 0, y: -40, z: 1.08, r: 0, e: 'inOut' },
  { t: 28.95, d: 1.0, x: 0, y: 0, z: 1.08, r: 0, e: 'inOut' },             // the line
  { t: 29.95, d: 1.4, x: 0, y: 0, z: 0.94, r: 0, e: 'inOut' },             // it opens
  { t: 31.2, d: 1.0, x: 50, y: -10, z: 1.1, r: 0.008, e: 'sine' },         // te mostra
  { t: 32.2, d: 1.0, x: 0, y: 0, z: 0.98, r: 0, e: 'inOut' },              // the dividing line
  { t: 33.85, d: 0.8, x: -170, y: 30, z: 1.06, r: -0.006, e: 'inOut' },    // multidão
  { t: 34.6, d: 0.8, x: 200, y: 20, z: 1.08, r: 0.006, e: 'expoOut' },     // dono
  { t: 35.4, d: 1.5, x: 210, y: 0, z: 1.16, r: 0, e: 'sine' },
];
CAM2.forEach(([t, x, y, z], k) => { CAMK.push({ t, d: 0.9, x, y, z, r: 0, e: 'expoOut' }); const nx = CAM2[k + 1]; if (!nx || nx[0] - t > 1.6) CAMK.push({ t: t + 0.95, d: Math.min(2.4, (nx ? nx[0] : t + 3) - t - 1.0), x, y: y - 10, z: z * 1.04, r: 0.004 * Math.sin(k * 1.7), e: 'sine' }); });

function camAt(t) { // the camera never moves (Parte 3): no zoom, pan, roll or shake; only the ASCII moves
  return { x: 0, y: -40, z: 1, r: 0 };
}
function camAtOld(t) {
  const c = { ...CAM0 };
  for (const k of CAMK) {
    if (t < k.t) break;
    const p = E[k.e](clamp((t - k.t) / k.d));
    c.x = lerp(c.x, k.x, p); c.y = lerp(c.y, k.y, p); c.z = lerp(c.z, k.z, p); c.r = lerp(c.r, k.r, p);
  }
  c.x += 5 * Math.sin(t * 0.61) + 2.5 * Math.sin(t * 1.37 + 1);
  c.y += 4 * Math.sin(t * 0.53 + 2) + 2 * Math.sin(t * 1.11);
  c.r += 0.0022 * Math.sin(t * 0.43 + 0.5);
  for (const tl of [4.72, 11.45, 21.5, 22.36, 24.3, 28.72, 30.12, 32.95, 35.2, ...TREMOR2]) {
    const u = t - tl; if (u > 0 && u < 0.3) { const amp = 5 * Math.exp(-u * 16); c.x += amp * Math.sin(u * 90); c.y += amp * Math.cos(u * 75); }
  }
  if (t > 21.4 && t < 22.7) { const k = Math.sin(Math.PI * (t - 21.4) / 1.3); c.x += k * 2.5 * Math.sin(t * 41); c.y += k * 2 * Math.sin(t * 37); }
  return c;
}

function camMatrix(c) {
  const a = c.z * Math.cos(c.r), b = c.z * Math.sin(c.r);
  return [a, b, -b, a, CX - a * c.x + b * c.y, CY - b * c.x - a * c.y];
}

// ───────────────────────── subtitles (word by word; marks colour the keyword by meaning)
// * white · ^ purple (IA) · ~ blue (feed, wave, sea) · ! gold (money) · + green · & red (loss) · = orange (build)
const CHUNKS = [
  'Quanto !dinheiro a mais', 'já caiu no seu !bolso', 'por causa da ^IA?',
  'Se não caiu &nada,', 'não é por falta de *gente', 'falando sobre isso.',
  'Tudo o que aparece', 'no seu ~feed sobre ^IA', '~chega, no mesmo *dia,', 'pra ~milhões de ~pessoas.',
  'Usar ^IA está virando', 'coisa que *todo *mundo faz.',
  'E fazer o que todo mundo faz', 'não coloca !dinheiro a mais', 'no bolso de &ninguém.',
  'Enquanto essa *multidão', '&briga pelo mesmo !dinheiro,',
  'um *grupo *pequeno,', 'sem ser expert em tecnologia,',
  'está usando essa mesma ^IA', 'pra =construir uma coisa !própria.',
  'Existe uma ^camada da ^IA', 'que quase *ninguém te mostra',
  'e é ela que *separa', 'quem fica na *multidão', 'de quem vira !dono.',
];
const CHUNKS2 = [
  "Agora inverte a pergunta.",
  "Quanto !dinheiro sai do",
  "seu bolso todo mês",
  "pra ~Netflix ou qualquer",
  "outro ~streaming?",
  "Saindo do seu",
  "bolso ou não,",
  "milhões de pessoas",
  "pagam essas !assinaturas",
  "todo mês.",
  "Quem é !dono !recebe de",
  "cada uma dessas pessoas,",
  "de novo e de novo.",
  "Quem vende o próprio",
  "tempo !recebe uma vez.",
  "E até hoje,",
  "você esteve do lado",
  "de quem !paga.",
  "Pra estar do outro lado,",
  "você não precisa",
  "ser a ~Netflix.",
  "Um produto *pequeno,",
  "=construído uma vez,",
  "já pode ser !pago todo",
  "mês por quem usa.",
  "Só que até",
  "pouco tempo atrás,",
  "isso exigia uma =equipe",
  "ou muito !dinheiro pra",
  "pagar por ela.",
  "Só um programador custa,",
  "em média,",
  "quase 6 !mil",
  "!reais por mês.",
  "Hoje,",
  "essa =equipe inteira cabe",
  "na ^IA que já",
  "está no seu celular.",
  "Essa é a ^camada.",
  "Ter a ^IA como sua",
  "=equipe e virar o !dono",
  "do que ela =constrói.",
  "Esse é o *Igor,",
  "meu *sócio.",
  "Ele era *CLT,",
  "queria trabalhar de casa",
  "e nunca foi programador.",
  "Junto com *Emmanuel,",
  "!nosso outro *sócio,",
  "ele =construiu com",
  "^IA o !SALG,",
  "um sistema que mostra",
  "pro !dono de um",
  "negócio digital quanto ele",
  "!lucra de verdade,",
  "venda por venda.",
  "Sem ^IA,",
  "um sistema desse",
  "exigiria uma =equipe",
  "inteira de programadores.",
  "O *Igor só dizia pra",
  "^IA o que fazer.",
  "O trabalho pesado,",
  "quem fazia era ela.",
  "Hoje,",
  "a gente está",
  "do outro lado.",
  "Vende o !SALG por",
  "!assinatura todo mês.",
  "E ele é !nosso.",
  "A gente =construiu uma vez",
  "e continua !dono dele.",
  "Agora,",
  "se isso é possível,",
  "por que tão",
  "pouca gente faz?",
  "Eu sei a resposta,",
  "porque eu passei anos",
  "do lado da *multidão.",
  "Com 14 anos,",
  "eu fui atrás",
  "de day trade,",
  "com 16 anos,",
  "dropshipping.",
  "Depois,",
  "qualquer coisa nova",
  "que aparecesse prometendo",
  "!dinheiro na internet.",
  "Eu vivia com os",
  "olhos no mesmo lugar",
  "que todo mundo,",
  "no que estava dando",
  "!dinheiro naquele momento.",
  "E toda vez era igual.",
  "Quando eu chegava lá,",
  "milhares de pessoas",
  "já estavam fazendo",
  "a mesma coisa.",
  "Aí aparecia outra *novidade",
  "e eu começava de",
  "novo do &zero.",
  "Eu achava que estava",
  "evoluindo porque estava sempre",
  "aprendendo coisa nova,",
  "só que eu acumulava",
  "informação e nenhuma me",
  "dava !dinheiro.",
  "Eu sabia um pouco de",
  "tudo e não tinha &nada",
  "que fosse meu.",
  "Foram quatro anos assim.",
  "&Perdendo tempo e",
  "&perdendo !dinheiro.",
  "Isso tem nome.",
  "Eu chamo de",
  "&armadilha da *novidade.",
  "Sabe aquela &armadilha",
  "de *passarinho?",
  "A *comida fica embaixo.",
  "O *passarinho entra pra",
  "comer e fica &preso.",
  "Na internet,",
  "a *comida é a *novidade.",
  "E com a ^IA,",
  "essa &armadilha é",
  "ainda &pior.",
  "Toda semana aparece",
  "uma ferramenta nova.",
  "Você aprende uma,",
  "sai outra.",
  "E o que você",
  "aprendeu fica &velho.",
  "Quem armou essa &armadilha foi",
  "quem vive de te mostrar",
  "o que é novo.",
  "Essa gente ganha !dinheiro",
  "com o tempo que",
  "você passa ~assistindo.",
  "Você não.",
  "Então,",
  "pra eles,",
  "o melhor é você",
  "nunca =construir &nada e",
  "voltar todo dia atrás",
  "da próxima *novidade.",
  "Talvez você nunca",
  "tenha nem começado.",
  "Ou começou,",
  "se empolgou na primeira",
  "semana e &parou.",
  "E sobrou aquela voz",
  "dizendo que o &problema",
  "era você.",
  "Não era.",
  "Você estava &sozinho,",
  "com o ~vídeo feito",
  "pra você ~assistir,",
  "não pra você =construir.",
  "Assim,",
  "quase &ninguém começa.",
  "E quem começa quase",
  "nunca chega ao fim.",
  "E você deve ter visto",
  "muito ~vídeo de “Ganhe !dinheiro",
  "com ^IA” mostrando carro e",
  "print de faturamento.",
  "E nunca mostrando",
  "como chegar lá.",
  "Você estava num *jogo",
  "feito pra você nunca",
  "sair do lugar.",
  "Mas agora,",
  "você sabe disso.",
  "E daqui pra frente,",
  "continuar igual é",
  "escolha sua.",
  "A minha vida só mudou",
  "quando eu fiz o *contrário.",
  "Parei de pular de",
  "galho em galho.",
  "E fui olhar pra onde",
  "a maioria não estava olhando.",
  "Foi aí que eu entendi.",
  "A informação que todo",
  "mundo tem não dá",
  "!dinheiro pra &ninguém.",
  "O que dá !dinheiro é",
  "a que pouca gente percebeu.",
  "E o meu !resultado",
  "também deixou de ser",
  "o da *multidão.",
  "É isso que acontece",
  "com quem entende o",
  "*jogo de verdade.",
  "E com a ^IA,",
  "a história se repete.",
  "Todo mundo olhando",
  "pra ela.",
  "E só um *grupo *pequeno",
  "vendo o que dá pra",
  "=construir com ela.",
  "Hoje,",
  "os meus olhos estão",
  "num lugar só.",
  "=Construir com ^IA.",
  "É disso que",
  "a gente vive."
];
CHUNKS.push(...CHUNKS2);


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
  SUBS.forEach((c, i) => { const nx = SUBS[i + 1]; c.end = nx ? (nx.s - c.e < 0.7 ? nx.s : c.e + 0.45) : c.e + 0.3; }); // the last one leaves before the join to the next part
  if (wi !== WORDS.length) console.warn('subtitle word count', wi, WORDS.length);
}

// ───────────────────────── HUD sections
const SECTIONS = [
  [0, '01 · A PERGUNTA'], [3.88, '02 · O BARULHO'], [7.6, '03 · O FEED'], [12.7, '04 · TODO MUNDO'],
  [20.1, '05 · A DISPUTA'], [22.75, '06 · O GRUPO PEQUENO'], [29.0, '07 · A CAMADA'], [32.2, '08 · A DIVISÃO'],
];
SECTIONS.push(...SECTIONS2);


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

// the ground glow takes the meaning of the beat: red for "nada" and the brawl, blue for the feed, purple for IA and the
// layer, orange for building, gold for money and the owner. Black while the narrator is on (his video goes there).
function glowHook(t) {
  const win = (a, b, fi = 0.8, fo = 0.8) => ramp(t, a, fi) * (1 - ramp(t, b, fo));
  const gold = Math.max(win(20.1, 22.7) * 0.4, win(28.7, 29.4, 0.3) * 0.6, win(31.3, 32.2) * 0.25, ramp(t, 35.1, 0.6) * 0.75);
  const purple = Math.max(win(12.9, 15.6) * 0.35, win(26.85, 28.7, 0.4) * 0.55, win(30.0, 32.3, 0.5) * 0.85, win(32.2, 35.2) * 0.35);
  const blue = Math.max(win(5.0, 7.6) * 0.4, win(7.6, 9.8) * 0.8, win(9.8, 12.7) * 0.9);
  const red = Math.max(win(4.6, 5.2, 0.3) * 0.5, win(21.4, 22.75, 0.4) * 0.6, win(24.25, 25.0, 0.2) * 0.3);
  const orange = win(27.5, 28.8, 0.4) * 0.5;
  const green = ramp(t, 35.1, 0.6) * 0.25;
  const r = 16 + 34 * gold + 22 * purple + 2 * blue + 38 * red + 30 * orange + 2 * green,
        g = 16 + 26 * gold + 6 * purple + 12 * blue + 4 * red + 14 * orange + 26 * green,
        b = 20 + 4 * gold + 36 * purple + 36 * blue + 4 * red + 2 * orange + 10 * green;
  const n = 1 - narrAt(t);
  return [lerp(5, r, n), lerp(5, g, n), lerp(6, b, n)];
}
function glowColour(t) {
  if (t < 35.55) return glowHook(t);
  const [r, g, b] = glowKeys(t), n = 1 - narrAt(t);
  return [lerp(5, r, n), lerp(5, g, n), lerp(6, b, n)];
}

// ───────────────────────── blocos 2–4 · rótulos (world space)
function drawOverlays2(g, t) {
  const mono = (px, w = 500) => `${w} ${px}px 'JetBrains Mono'`;
  const lbl = (s, x, y, t0, t1, col, px = 22, w = 700, seed = 7, sp = 4) => { const p = clamp((t - t0) / 0.35), a = clamp(p * 3) * (1 - ramp(t, t1, 0.25)); if (a > 0) text(g, decode(s, p, seed), x, y, mono(px, w), col, a, 'center', sp); };
  const counter = (pulses, x, y, t0, t1) => { const n = pulses.filter(P => t >= P + 0.7).length; if (n) lbl(`TODO MÊS ×${n}`, x, y, t0, t1, '#93BCFF', 24, 700, 90 + n); };
  counter(PUL_OWN, 0, 80, 46.9, 49.2);
  lbl('SEU TEMPO', 0, 200, 50.15, 51.65, '#F2F2F5', 24, 700, 12, 6);
  lbl('UMA VEZ', 0, 430, 51.2, 51.65, '#FFFFFF', 28, 700, 13, 6);
  lbl('CONSTRUÍDO 1 VEZ', 0, -470, 58.45, 61.55, '#FFB07A', 22, 700, 14);
  lbl('PAGO TODO MÊS', 0, 470, 60.25, 61.55, '#5BE39A', 22, 700, 15);
  lbl('SÓ UM PROGRAMADOR', 0, 250, 66.5, 69.85, '#F2F2F5', 26, 700, 16);
  lbl('EM MÉDIA', 0, 200, 67.9, 69.85, '#A0A0AA', 20, 500, 17);
  lbl('QUASE', 0, -360, 68.32, 69.85, '#FF7A70', 40, 700, 18, 6);
  lbl('POR MÊS', 0, 45, 69.38, 69.85, '#5BE39A', 46, 700, 19, 8);
  callout(g, t, 71.6, 73.5, 70, -170, 260, -320, 'SUA EQUIPE', '#BBA3FF', 'left');
  callout(g, t, 79.0, 83.4, -60, -40, -230, -150, 'IGOR · SÓCIO', '#FFFFFF', 'right');
  lbl('DE CASA', 0, -195, 82.0, 83.6, '#F2F2F5', 20, 700, 20);
  lbl('PROGRAMADOR', 320, -215, 82.6, 83.6, '#A0A0AA', 20, 700, 21);
  lbl('IGOR', -230, 430, 83.8, 85.8, '#FFFFFF', 24, 700, 22);
  lbl('EMMANUEL', 230, 430, 84.3, 85.8, '#FFFFFF', 24, 700, 23);
  lbl('SEM IA', 0, -450, 92.95, 96.75, '#FF7A70', 30, 700, 24, 6);
  counter(PUL_SUB, 0, 30, 104.3, 104.9);
  callout(g, t, 105.6, 108.7, 250, -300, 40, -470, 'NOSSO', '#F5CB62', 'right');
  ['14 ANOS', '16 ANOS', 'DEPOIS'].forEach((s, k) => lbl(s, TL.mk[k], TL.y + 48, TL.at[k], 123.4, '#F2F2F5', 20, 700, 30 + k));
  callout(g, t, 129.6, 133.0, 470, 360, 420, 200, 'EU', '#FFFFFF', 'right');
  callout(g, t, 130.5, 133.0, -200, -120, -360, -330, 'MILHARES', '#A0A0AA', 'left');
  lbl('DO ZERO', 0, 10, 136.1, 136.4, '#FF7A70', 40, 700, 33, 6);
  lbl('R$ 0', 320, 230, 142.3, 142.7, '#FF7A70', 40, 700, 34, 4);
  callout(g, t, 144.6, 145.5, 0, -40, 260, -330, 'NADA MEU', '#A0A0AA', 'right');
  callout(g, t, 153.3, 156.4, 40, 190, 260, 330, 'A COMIDA', '#F6E3C2', 'left');
  callout(g, t, 157.5, 158.75, 40, 160, 230, 330, 'A NOVIDADE', '#93BCFF', 'left');
  TOOL8_POS.forEach(([x, y], k) => { const old = Math.max(k < 7 ? ramp(t, TOOL8_AT[k + 1], 0.3) : 0, ramp(t, 166.24, 0.4)); lbl(`SEMANA ${k + 1}`, x + 120, y + CARD5.h / 2 + 30 + 10 * old, TOOL8_AT[k], 166.8, old > 0.5 ? '#7C7C86' : '#FFFFFF', 15, 700, 40 + k); });
  lbl('O DINHEIRO DELES', 250, -130, 171.4, 174.45, '#5BE39A', 20, 700, 50);
  lbl('SEU TEMPO', -250, 210, 171.9, 174.45, '#F2F2F5', 20, 700, 51);
  callout(g, t, 173.7, 174.45, 180, 270, 350, 120, 'VOCÊ NÃO', '#FF7A70', 'right');
  lbl('PAROU', 0, -240, 185.42, 185.75, '#FF7A70', 44, 700, 52, 8);
  lbl('O PROBLEMA SOU EU ?', 0, -332, 187.6, 188.85, '#FF7A70', 30, 700, 53, 4);
  callout(g, t, 190.1, 193.8, 40, 240, 250, 140, 'SOZINHO', '#CDCDD3', 'left');
  lbl('COMEÇO', -400, 380, 194.0, 197.35, '#A0A0AA', 20, 700, 54);
  lbl('FIM', 0, -320, 194.0, 197.35, '#FFFFFF', 40, 700, 55, 10);
  lbl('GANHE', 0, -20, 199.45, 205.0, '#FFFFFF', 34, 700, 56, 4);
  lbl('DINHEIRO', 0, 28, 199.7, 205.0, '#5BE39A', 34, 700, 57, 4);
  lbl('COM IA', 0, 76, 200.15, 205.0, '#BBA3FF', 34, 700, 58, 4);
  lbl('COMO CHEGAR LÁ?', 0, -360, 204.3, 205.0, '#CDCDD3', 22, 700, 59);
  callout(g, t, 207.6, 208.7, 30, 111, 270, 330, 'MESMO LUGAR', '#FF7A70', 'left');
  lbl('A MAIORIA', -320, 330, 218.6, 220.15, '#A0A0AA', 20, 700, 60);
  callout(g, t, 217.6, 220.15, 160, 150, 70, -40, 'EU', '#FFFFFF', 'right');
  lbl('R$ 0', 0, 380, 224.5, 225.0, '#FF7A70', 36, 700, 61, 4);
  lbl('A MULTIDÃO', -110, 360, 229.8, 230.35, '#A0A0AA', 20, 700, 62);
  lbl('EU', 420, -480, 228.6, 230.35, '#5BE39A', 28, 700, 63, 6);
  callout(g, t, 237.1, 239.75, 262, 262, 390, 120, 'GRUPO PEQUENO', '#FFFFFF', 'right');
}

// glow after the hook: each beat carries its own colours (crossfaded)
const GLOWBASE = { gold: [34, 26, 4], purple: [22, 6, 36], blue: [2, 12, 36], red: [38, 4, 4], orange: [30, 14, 2], green: [2, 26, 10] };
function glowKeys(t) {
  let k = 0; while (k + 1 < KEYS.length && KEYS[k + 1].t <= t) k++;
  const cur = KEYS[k].g || {}, prev = (k > 0 && KEYS[k - 1].g) || {}, f = ramp(t, KEYS[k].t, 0.8);
  let r = 16, g = 16, b = 20;
  for (const c in GLOWBASE) { const v = lerp(prev[c] || 0, cur[c] || 0, f); r += GLOWBASE[c][0] * v; g += GLOWBASE[c][1] * v; b += GLOWBASE[c][2] * v; }
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
    g.drawImage(atlas, AX(S.c[i]), AY(S.c[i], S.t[i]), CELL, CELL, sx - sz / 2, sy - sz / 2, sz, sz);
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
  // "nada": the empty pocket's balance
  {
    const p = clamp((t - 4.68) / 0.2), a = clamp(p * 3) * (1 - ramp(t, 5.05, 0.25));
    text(g, decode('R$ 0,00', p, 41), 0, WAL.y + WAL.h / 2 + 110, mono(52, 700), '#FF7A70', a, 'center', 4);
  }
  // what the bubbles say
  BUB_TXT.forEach((s, k) => {
    const on = bubPop(t, k), p = clamp((t - BUB_AT[k] - 0.05) / 0.4), a = clamp(on * 2 - 0.6) * (1 - ramp(t, 7.62, 0.2));
    const [x, y] = BUB[k];
    text(g, decode(s, p, 50 + k), x, y + bubBob(t, k) + 1, mono(23, 700), '#FFFFFF', a, 'center', 2);
  });
  callout(g, t, 10.6, 12.5, 70, PH_Y + 40, 230, PH_Y - 70, 'NO MESMO DIA', '#93BCFF', 'left');
  callout(g, t, 23.15, 25.5, 324, 30, 360, -170, 'GRUPO PEQUENO', '#FFFFFF', 'right');
  callout(g, t, 30.3, 32.1, -180 + 70 * ramp(t, 31.1, 0.8, E.inOut), 0, -430, -110, 'CAMADA OCULTA', '#BBA3FF', 'left');
  callout(g, t, 33.98, 35.4, -300, -200, -330, -380, 'MULTIDÃO', '#A0A0AA', 'left');
  callout(g, t, 35.2, 35.5, 286, -48, 430, -250, 'DONO', '#93BCFF', 'right');
  drawOverlays2(g, t);
  drawOverlays5(g, t);
  g.setTransform(1, 0, 0, 1, 0, 0);
}

// ───────────────────────── the narrator on camera (Parte 3): his real footage, full frame, under the captions
// assets/vitor/NNNNN.jpg (one per film frame, from pacote-socio/ferramentas/prep_vitor.py), loaded on demand. The windows are NARR.
// While a window has no frames yet, the placeholder stays.
const VIT = new Map();
function vitorLoad(t) {
  const f0 = Math.round(t * FPS);
  for (const k of VIT.keys()) if (Math.abs(k - f0) > 45) VIT.delete(k);
  const jobs = [];
  for (let f = f0 - 2; f <= f0 + 2; f++) {
    if (narrAt(f / FPS) <= 0 || VIT.has(f)) { if (VIT.has(f)) jobs.push(VIT.get(f).p); continue; }
    const e = { im: new Image(), ok: false }; e.p = new Promise(res => { e.im.onload = () => { e.ok = true; res(); }; e.im.onerror = () => res(); });
    e.im.src = `assets/vitor/${String(f).padStart(5, '0')}.jpg`; VIT.set(f, e); jobs.push(e.p);
  }
  return Promise.all(jobs);
}
function coverImg(g, im, x, y, w, h) { const k = Math.max(w / im.width, h / im.height), iw = im.width * k, ih = im.height * k; g.drawImage(im, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih); }
function drawVitor(g, t, a) {
  if (a <= 0.01) return false;
  const f = Math.round(t * FPS); let e = null;
  for (const d of [0, -1, 1, -2, 2]) { const c = VIT.get(f + d); if (c && c.ok) { e = c; break; } }
  if (!e) return false;
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = a; coverImg(g, e.im, 0, 0, W, H); g.globalAlpha = 1;
  return true;
}
// while the narrator is on screen and his footage is missing: black, with a placeholder
function drawNarr(g, t) {
  const a = narrAt(t); if (a <= 0.01) return;
  g.setTransform(1, 0, 0, 1, 0, 0);
  text(g, '[ VITOR EM CENA ]', CX, 800, `700 30px 'JetBrains Mono'`, '#8A8A94', 0.6 * a, 'center', 6);
  text(g, 'o vídeo do narrador entra aqui', CX, 850, `400 21px 'JetBrains Mono'`, '#5E5E66', 0.6 * a, 'center', 2);
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
  const S = stateAt(t), cam = camAt(t), M = camMatrix(cam), nOff = 1 - narrAt(t);
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'source-over';
  g.fillStyle = '#050506'; g.fillRect(0, 0, W, H);
  const [r, gg, b] = glowColour(t);
  const rad = g.createRadialGradient(CX, CY, 0, CX, CY, 900);
  rad.addColorStop(0, `rgb(${r | 0},${gg | 0},${b | 0})`); rad.addColorStop(1, 'rgba(5,5,6,0)');
  g.fillStyle = rad; g.fillRect(0, 0, W, H);
  drawMediaBG(g, t);
  g.globalCompositeOperation = 'lighter';
  if (nOff > 0.01) for (const p of AMB) {
    const z = 1 + (cam.z - 1) * p.d, x = CX + (p.x - cam.x * p.d) * z, y = CY + ((p.y - t * 8 * p.d) % 1300 + 1300) % 2600 - 1300 - cam.y * p.d;
    if (x < 0 || x > W || y < 0 || y > H) continue;
    g.globalAlpha = p.a * nOff; g.drawImage(atlas, AX(p.c), AY(p.c, 0), CELL, CELL, x - 6, y - 6, 12, 12);
  }
  g.globalAlpha = 1;
  drawField(fld, S, M);
  blm.setTransform(1, 0, 0, 1, 0, 0); blm.clearRect(0, 0, W / BS, H / BS);
  blm.filter = 'blur(3px)'; blm.drawImage(fieldC, 0, 0, W / BS, H / BS); blm.filter = 'none';
  g.globalAlpha = 0.4; g.drawImage(bloomC, 0, 0, W, H); // less bloom: crisper edges
  g.globalAlpha = 1; g.drawImage(fieldC, 0, 0);
  g.globalCompositeOperation = 'source-over';
  drawMediaWorld(g, t, M);
  const sc = g.createLinearGradient(0, 1380, 0, 1760);
  sc.addColorStop(0, 'rgba(5,5,6,0)'); sc.addColorStop(0.45, 'rgba(5,5,6,0.78)'); sc.addColorStop(1, 'rgba(5,5,6,0.78)');
  g.fillStyle = sc; g.fillRect(0, 1380, W, 540);
  drawWorldOverlays(g, t, M);
  drawHUD(g, t);
  if (drawVitor(g, t, narrAt(t))) { g.globalAlpha = narrAt(t); g.fillStyle = sc; g.fillRect(0, 1380, W, 540); g.globalAlpha = 1; } // he covers labels and HUD; the caption band stays on top
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
  ctx.globalAlpha = CLEAN ? 0.02 : 0.045; ctx.globalCompositeOperation = 'overlay';
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
    { t: 4.2, kind: 'scan', d: 0.6 }, { t: 4.68, kind: 'loss' }, { t: 4.72, kind: 'thud' }, { t: 4.8, kind: 'sparkle', d: 0.5 },
    ...BUB_AT.map(t => ({ t, kind: 'pop' })),
    { t: 8.3, kind: 'ticks', d: 1.4, rate: 14 },
    { t: 9.88, kind: 'wave', d: 2.0 }, { t: 10.86, kind: 'chime' }, { t: 11.42, kind: 'sparkle', d: 0.8 },
    { t: 12.9, kind: 'murmur', d: 2.6 }, { t: 13.16, kind: 'sparkle', d: 0.6 },
    { t: 15.75, kind: 'drop' },
    { t: 20.25, kind: 'murmur', d: 1.2 }, { t: 21.45, kind: 'tension', d: 1.3 }, { t: 22.36, kind: 'thud' },
    { t: 22.95, kind: 'chime' }, { t: 23.88, kind: 'pop' }, { t: 24.3, kind: 'slice' },
    { t: 26.95, kind: 'chime' }, { t: 27.3, kind: 'scan', d: 0.8 }, { t: 27.55, kind: 'knocks', n: 8, step: 0.13 }, { t: 28.72, kind: 'coins' },
    { t: 30.08, kind: 'scan', d: 0.9 }, { t: 31.15, kind: 'swell', d: 0.7 }, { t: 31.4, kind: 'knocks', n: 4, step: 0.1 },
    { t: 32.9, kind: 'slice' }, { t: 33.98, kind: 'murmur', d: 0.9 }, { t: 35.08, kind: 'knocks', n: 4, step: 0.1 }, { t: 35.16, kind: 'chime' }, ...EVENTS2);
  return ev;
}

// ───────────────────────── boot
async function boot() {
  await Promise.all([`500 50px 'JetBrains Mono'`, `700 50px 'JetBrains Mono'`, `400 50px 'Inter'`, `700 50px 'Inter'`]
    .map(f => document.fonts.load(f, '$?82%ÁÊÇ▶▪█▓')));
  await document.fonts.ready;
  await Promise.all(MEDIA_IMG.map(async n => { IMGS[n] = await loadImg('media/img/' + n); })); // images first: some scenes are read from photos
  buildAtlas(); buildAmbient(); buildShapes(); buildDelays(); buildSubs();
}
window.__ready = boot();
window.__seek = t => renderFrame(t, false);
window.__frame = async (i, mb = true) => { const t = i / FPS; await Promise.all([ensureMedia(t - SHUTTER, t + SHUTTER), vitorLoad(t)]); CUR_FI = i; return renderFrame(t, mb, i); };
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
  const show = t => { vitorLoad(t).then(() => renderFrame(t, qs.has('mb'))); renderFrame(t, qs.has('mb')); sc.value = t; tc.textContent = t.toFixed(2); };
  show(parseFloat(qs.get('t') || '0'));
  sc.oninput = () => { vo.currentTime = +sc.value; show(+sc.value); };
  pp.onclick = () => { playing = !playing; pp.textContent = playing ? '❚❚ pause' : '▶ play'; if (playing) { vo.currentTime = +sc.value; vo.play(); loop(); } else vo.pause(); };
  function loop() { if (!playing) return; show(vo.currentTime); if (vo.ended) { playing = false; pp.textContent = '▶ play'; } requestAnimationFrame(loop); }
  if (qs.has('play')) pp.onclick();
})();


// ═════════════════════════ v6 — os ajustes do Igor de 22/10 (sobre a v7 com o Vitor). A última definição de cada cena vence.
// Mídia nova em partes/media_comum (comum.js registra); cédulas e cartões de pagamento no lugar das partículas ("energia").
PLAY.push(['scrollinsta', 7.3, 12.8, 0, true], ['saindo43', 41.9, 45.7, 0, false], ['gatinho', 166.6, 170.7, 0, false], ['b339', 219.2, 227.6, 0, true]);
const T_WAVE6 = 10.55, CARD_N = '#E50914';
const dollar3DG = px => g => { // the $ with volume, in green (value)
  g.font = HEAVY(px); g.textAlign = 'center'; g.textBaseline = 'middle';
  for (let k = 14; k >= 1; k--) { g.fillStyle = tone(GN, 0.2 + 0.025 * (14 - k)); g.fillText('$', k * 1.6, k * 1.2); }
  g.fillStyle = tone(GN, 1); g.fillText('$', 0, 0);
};
const roleOf = k => ['type', 'point', 'wave', 'talk', 'look', 'cheer', 'scratch', 'point'][k];
// a mannequin pose that changes at a moment: before → after, blended over d
const poseAt = (T, before, after, d = 0.3) => t => t < T ? MAN_POSES[before](t) : mixPose(MAN_POSES[before](t), MAN_POSES[after](t), E.inOut(ramp(t, T, d)));
function emptyRoomArt(g) { // an empty shop from inside: back wall, bare shelves, a floor line, a hanging bulb
  g.strokeStyle = tone(WT, 0.55); g.lineWidth = 5; g.strokeRect(-380, -360, 760, 640);
  g.beginPath(); g.moveTo(-380, 280); g.lineTo(-520, 420); g.moveTo(380, 280); g.lineTo(520, 420); g.moveTo(-380, -360); g.lineTo(-520, -480); g.moveTo(380, -360); g.lineTo(520, -480); g.stroke();
  [[-330, -160], [-330, 0], [-330, 160], [130, -160], [130, 0], [130, 160]].forEach(([x, y]) => { g.fillStyle = LG(g, x, y, x + 200, y, [[0, tone(WT, 0.85)], [1, tone(WT, 0.5)]]); RR(g, x, y, 200, 14, 4); g.fill(); g.fillStyle = tone(WT, 0.5); g.fillRect(x + 20, y + 14, 8, 26); g.fillRect(x + 172, y + 14, 8, 26); });
  g.strokeStyle = tone(WT, 0.6); g.lineWidth = 3; g.beginPath(); g.moveTo(0, -360); g.lineTo(0, -250); g.stroke(); sphere(g, 0, -228, 24, '#F6E3C2', 1, CREAM);
}
function hypeExtra(k) { // four more promises, so the eight are not repeats: a course (play), crypto, a rocket, a phone with an ad
  return [g => { g.fillStyle = tone(PU, 1); RR(g, -120, -80, 240, 160, 22); g.fill(); g.fillStyle = tone(WT, 1); poly(g, [[-25, -40], [45, 0], [-25, 40]]); g.fill(); },
    g => { sphere(g, 0, 0, 110, '#FF9B55', 1, ORANGE); g.fillStyle = VOID; g.font = HEAVY(130); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('₿', 0, 6); },
    g => { g.fillStyle = tone(WT, 0.95); g.beginPath(); g.moveTo(0, -130); g.quadraticCurveTo(70, -60, 50, 80); g.lineTo(-50, 80); g.quadraticCurveTo(-70, -60, 0, -130); g.fill(); g.fillStyle = tone(RD, 1); poly(g, [[-50, 30], [-95, 110], [-40, 80]]); g.fill(); poly(g, [[50, 30], [95, 110], [40, 80]]); g.fill(); sphere(g, 0, -30, 26, BL, 1, BLUE); },
    g => { g.fillStyle = tone(WT, 0.9); RR(g, -80, -140, 160, 280, 24); g.fill(); g.fillStyle = VOID; RR(g, -66, -120, 132, 230, 14); g.fill(); g.fillStyle = tone(GN, 1); RR(g, -50, -90, 100, 60, 10); g.fill(); g.fillStyle = tone(RD, 1); RR(g, -50, 0, 100, 34, 10); g.fill(); }][k];
}
const HY_TINT = [ORANGE, CHOCO, PURPLE, BLUE, PINK, CLAUDE, RED, GREEN];

function buildShapesV6() {
  // 0:09–0:12 "chega… pra milhões" — the feed phone shrinks up into place (no cut), the crowd receives it and reacts; a slow push-in
  {
    const phone = tagged(art(g => phoneArt(g, { screen: feedScreen }), 1, 0, 0, { seed: 640 }), { ph6: 1 });
    const rings = [...Array(2400)].map((_, k) => { const ang = Math.PI * (0.06 + 0.88 * hash(k, 1)), rg = k % 4;
      return { rg, ang, x: SRC[0], y: SRC[1], a: 0.85, c: pick('-~=·', hash(k, 2)), t: BLUE, s: 0.45 + 0.3 * hash(k, 3) }; });
    const crowd = crowdBusts().map(p => { const d = Math.hypot(p.bx - SRC[0], (p.by - SRC[1]) / 0.8), hit = T_WAVE6 + d / 600, re = ['wave', 'cheer', 'look', 'jump'][(hash(p.bk, 4) * 4) | 0];
      return { ...p, hit, row: Math.round((p.by + 150) / 76), rgPose: poseAt(hit, hash(p.bk, 5) > 0.5 ? 'talk' : 'stand', re, 0.25) }; });
    const ph = t => E.inOut(ramp(t, 9.8, 0.75)), zoom = t => 1 + 0.12 * E.inOut(ramp(t, 10.3, 2.3));
    SH.broadcast = makeShape([hsort(crowd), hsort(rings), phone], (t, i, p, b) => {
      const z = zoom(t), cx = 0, cy = -60, dolly = (x, y, par = 1) => { b.x[i] = cx + (x - cx) * z + 14 * Math.sin((t - 9.75) * 0.7) * par; b.y[i] = cy + (y - cy) * z; };
      if (p.ph6) { const q = ph(t), s = lerp(1, PH_S, q), y0 = lerp(0, PH_Y, q); dolly(p.x * s, y0 + p.y * s, 0.3); b.s[i] = p.s * lerp(1, 0.75, q); b.a[i] = p.a + 0.3 * flash(t, T_WAVE6, 0.15); return; }
      if (p.rg !== undefined) {
        const u = t - T_WAVE6; if (u < 0) { b.a[i] = 0.02; return; }
        const r = 40 + ((u * 560 + p.rg * 190) % 760); dolly(SRC[0] + r * Math.cos(p.ang), SRC[1] + r * Math.sin(p.ang) * 0.8, 0.5);
        b.a[i] = Math.max(0.02, 0.85 * (1 - r / 800) * ramp(t, T_WAVE6, 0.2) * (1 - 0.7 * ramp(t, 12.2, 0.5))); return;
      }
      dolly(b.x[i], b.y[i], 0.4 + p.row / 8); b.s[i] = p.s * z;
      const lit = ramp(t, p.hit, 0.25); b.t[i] = lit > 0.5 ? BLUE : WHITE; b.a[i] = Math.min(1, p.a * (0.7 + 0.5 * lit)) + 0.35 * flash(t, p.hit + 0.05, 0.1);
    });
  }

  // 0:20 "briga pelo mesmo dinheiro" — the $ green and bigger
  {
    const ring = crowd3Pts(BRAWL3.map(([R, a]) => [R * Math.cos(a), BRZ + R * Math.sin(a) * 0.9]), false).map(p => ({ ...p, R: BRAWL3[p.pk][0], a0: BRAWL3[p.pk][1] }));
    const DLY0 = -130, dl = tagged(art(dollar3DG(330), 1, 0, DLY0, { seed: 650, cell: 4, h: 1300 }), { dl: 1 });
    SH.brawl = makeShape([hsort(ring), dl], (t, i, p, b) => {
      if (p.dl) { const s = 1 + 0.06 * flash(t, 22.36, 0.15) + 0.02 * Math.sin(t * 7); b.x[i] = p.x * s; b.y[i] = DLY0 + (p.y - DLY0) * s; b.t[i] = GREEN; return; }
      const k2 = ramp(t, 21.4, 0.4) * (1 - ramp(t, 22.6, 0.3)), rot = 0.13 * (t - 20.1), sq = 1 - 0.07 * (0.5 + 0.5 * Math.sin(t * 8 + p.pk * 1.3)) * (0.3 + k2);
      const [px, py, m] = ORB(p.R * sq, p.a0 + rot);
      b.x[i] = px + p.rx * m + (1.5 + 4 * k2) * Math.sin(t * 41 + p.pk); b.y[i] = py + p.ry * m + (1 + 3 * k2) * Math.sin(t * 37 + p.pk * 2); b.s[i] = p.s * clamp(m * 1.1, 0.5, 2);
      b.a[i] = p.a * (0.45 + 0.65 * clamp((m - 0.38) / 0.48)); b.t[i] = hash(p.pk, 9) < 0.6 * ramp(t, 21.5, 0.6) ? RED : WHITE;
    });
  }

  // 0:25–0:29 "está usando essa mesma IA pra construir" — the IA in blue, whole on screen; the blocks Claude-orange (no gold, no glare)
  {
    const g7 = []; for (let k = 0; k < 7; k++) FULL_T.forEach(p => g7.push({ ...p, rsc: 0.85, x: p.x * 0.85 + G7X(k), y: p.y * 0.85 + 140 + 10 * Math.abs(k - 3), s: p.s * 0.92, g7: k }));
    const G7B = scaled(g7, 0.7, 0, 270).map(p => ({ ...p, rsc: 0.85 * 0.7, rgPose: 'type' }));
    const IAY = -400, ia = tagged(art(textArt('IA', 210, BL), 1, 0, IAY, { seed: 670, cell: 4, h: 1300 }), { ia: 1 });
    const st = buildPts(14000, 71).map(p => ({ ...p, y: p.y + 20, a: p.a * 0.82 }));
    const thread = [...Array(700)].map((_, k) => ({ th: k, x: 0, y: -330, a: 0.02, c: pick('|:·•', hash(k, 2)), t: BLUE, s: 0.4 + 0.3 * hash(k, 3) }));
    SH.build = makeShape([hsort(G7B), ia, hsort(st), thread], (t, i, p, b) => {
      if (p.g7 !== undefined) { b.y[i] = p.y + 2 * Math.sin(t * 2.2 + p.g7); b.a[i] = p.a * 0.95; return; }
      if (p.ia) { const on = ramp(t, 26.85, 0.35, E.backOut), s = 0.8 + 0.2 * clamp(on); b.t[i] = BLUE; b.a[i] = p.a * clamp(on, 0.02) + 0.3 * flash(t, 27.0, 0.15); b.x[i] = p.x * s; b.y[i] = IAY + (p.y - IAY) * s; return; }
      if (p.th !== undefined) { if (t < 27.25 || t > 28.95) { b.a[i] = 0.02; return; } const u = (hash(p.th, 4) + (t - 27.25) * 1.5) % 1; b.x[i] = (hash(p.th, 5) - 0.5) * (30 + 180 * u); b.y[i] = -330 + 90 * u; b.a[i] = Math.max(0.02, 0.85 * Math.sin(Math.PI * u)); return; }
      const at = 27.55 + p.block * 0.13, q = dropIn(t, at); b.y[i] = p.y - 70 * (1 - q); b.a[i] = p.a * clamp((t - at) / 0.12, t < 26.75 ? 0.03 : 0); b.t[i] = CLAUDE;
      b.a[i] += 0.12 * flash(t, 28.75, 0.25);
    });
  }

  // 0:29–0:32 "uma camada da IA" — the little structure on the middle plane in Claude orange, not gold
  {
    const sl = [0, 1, 2].map(k => tagged(dotArt(slabArt(k === 1 ? 1 : 0), 1, 0, 0, { seed: 680 + k }), { sl: k }));
    const stk = tagged(dotArt(stackArt(36), 1, 0, -50, { seed: 683 }), { cb: 0 });
    SH.layers = makeShape([hsort(sl[0]), hsort(sl[1]), hsort(sl[2]), stk], (t, i, p, b) => {
      const line = ramp(t, 29.05, 0.75, E.cubicOut), open = ramp(t, 29.95, 1.3, E.inOut), slide = 70 * ramp(t, 31.1, 0.8, E.inOut);
      if (p.cb !== undefined) { const on = dropIn(t, 31.35, 0.35); b.a[i] = p.a * clamp(on, 0.02) * 0.9; b.x[i] = p.x + slide; b.y[i] = p.y - 50 * (1 - clamp(on)); b.t[i] = CLAUDE; return; }
      const k = p.sl - 1, v = lerp(0.025, 1, open);
      b.x[i] = p.x * (0.3 + 0.7 * line) + (p.sl === 1 ? slide : 0); b.y[i] = k * 330 * open + p.y * v;
      if (p.sl === 1) { b.t[i] = PURPLE; b.a[i] = p.a * (0.5 + 0.5 * line) + 0.35 * flash(t, 30.15, 0.2) + 0.25 * flash(t, 31.95, 0.25); return; }
      b.a[i] = p.a * (0.25 + 0.75 * open) * (0.5 + 0.5 * line); if (open < 0.3) b.t[i] = PURPLE;
    });
  }

  // 0:32–0:35 "quem vira dono" — the owner turns blue (ownership: solid, trusted), not gold; his own structure blue too
  {
    const div = [...Array(300)].map((_, k) => ({ dv: 1, x: -40 + (hash(k, 1) - 0.5) * 5, y: -480 + k * 3.3, a: 0.9, c: CI['|'], t: PURPLE, s: 0.6 }));
    const LEFT3 = []; for (let r = 0; r < 6; r++) for (let c = 0; c < 9; c++) LEFT3.push([c, r]);
    const left = crowd3Pts(LEFT3, false);
    const owner = FULL_T.map(p => ({ ...p, rsc: 1.15, x: p.x * 1.15 + 270, y: p.y * 1.15 + 115, s: p.s * 1.05, own: 1, rgPose: poseAt(35.1, 'stand', 'hips', 0.4) }));
    const os = tagged(dotArt(stackArt(50), 1, 270, 360, { seed: 691 }), { oc: 0 });
    SH.split = makeShape([div, hsort(left), owner, os], (t, i, p, b) => {
      if (p.dv) { b.a[i] = p.y < -480 + 990 * ramp(t, 32.85, 0.45, E.cubicOut) ? p.a * (0.75 + 0.25 * Math.sin(t * 3 + p.y * 0.02)) : 0.02; return; }
      if (p.pk !== undefined) { const r = p.Z, c = p.X, m = 0.36 + 0.07 * r, px = -100 - (8 - c) * 52 * (0.7 + 0.12 * r) - (r % 2) * 22, py = -280 + r * 92; b.x[i] = px + p.rx * m; b.y[i] = py + p.ry * m - 3 * Math.abs(Math.sin(t * 5.2)); b.s[i] = p.s * m * 1.2; b.t[i] = GRAY; b.a[i] = p.a * (0.5 + 0.35 * flash(t, 34.0 + 0.05 * r, 0.25)) * (0.6 + 0.08 * r); return; }
      if (p.own) { const bl = ramp(t, 35.1, 0.5); b.a[i] = p.a * (0.75 + 0.25 * bl) + 0.25 * flash(t, 35.2, 0.15); if (bl > hash(i, 13)) b.t[i] = OWNB; return; }
      const on = dropIn(t, 35.0, 0.35); b.a[i] = p.a * clamp(on, 0.02) * 0.9; b.y[i] = p.y - 50 * (1 - clamp(on)) + 2 * Math.sin(t * 1.8); b.t[i] = OWNB;
    });
  }

  // 0:41–0:45 "milhões de pessoas pagam essas assinaturas" — a TV switches on and plays (media); a big audience seen from behind, watching
  {
    const TVY = -300, tv = tagged(art(C6.tvArt(560, 315), 1, 0, TVY, { seed: 700 }), { tv: 1 });
    const BACK = manT(0.5, 618, { cell: 5, view: 'back' }), people = [], SR6 = [];
    for (let r = 0; r < 7; r++) for (let c = 0; c < 13; c++) { const [x, y, s] = proj((c - 6) * 0.55 + (r % 2 ? 0.27 : 0), 1.7 + r * 0.5, 0, -0.4), m = s * 1.15, yy = y + 170;
      SR6.push([x, yy - 60 * m]); BACK.forEach(p => people.push({ ...p, rsc: m, x: x + p.x * m, y: yy + p.y * m, s: p.s * m * 1.1, bk: r * 13 + c, bx: x, by: yy, rgPose: 'stand' })); }
    SUBS6.src = SR6;
    SH.subs = makeShape([hsort(people), tv], (t, i, p, b) => {
      if (p.tv) { b.a[i] = p.a + 0.25 * flash(t, 42.0, 0.2); return; }
      const fl = 0.12 * (0.5 + 0.5 * Math.sin(t * 9 + p.bk)) * ramp(t, 42.3, 0.4); b.a[i] = p.a * (0.7 + 0.2 * ramp(t, 42.3, 0.5)) + fl; b.t[i] = WHITE;
    });
  }

  // 0:45–0:49 "quem é dono recebe de cada uma dessas pessoas" — the owner (Netflix) in blue at the centre; payment cards fly to him
  {
    const OWN = [0, -50], SR = [], ring = [];
    for (let k = 0; k < 40; k++) { const a = -Math.PI / 2 + k / 40 * 2 * Math.PI, sa = Math.sin(a), x = 440 * Math.cos(a), y = 110 + 280 * sa, m = 0.42 + 0.2 * sa; SR.push([x, y - 50 * m]); PERS_T.forEach(p => ring.push({ ...p, rsc: m, x: x + p.x * m, y: y + p.y * m, s: p.s * m * 1.1, bk: k, bx: x, by: y })); }
    OWNER6.src = SR;
    const own = tagged(manAt(OWN[0], OWN[1], 0.5, 711, { pose: 'hips' }), { own: 1 });
    SH.owner = makeShape([hsort(ring), own], (t, i, p, b) => {
      const pulse = PUL_OWN.reduce((s, P) => s + flash(t, P + 0.75, 0.15), 0);
      if (p.own) { b.t[i] = ramp(t, 45.85, 0.4) > hash(i, 13) ? OWNB : WHITE; b.a[i] = p.a * 0.95 + 0.3 * pulse; return; }
      b.a[i] = p.a * 0.9 + 0.3 * PUL_OWN.reduce((s, P) => s + flash(t, P + 0.05, 0.1), 0); b.t[i] = WHITE;
    });
  }

  // 0:49–0:51 "quem vende o próprio tempo recebe uma vez" — only the clock: it beats like a heart, the hands race, one coin falls, once
  {
    const C = [0, -70], S = 1.0;
    const face = tagged(dotArt(clockArt, S, C[0], C[1], { seed: 721, cell: 4 }), { fc: 1 });
    const hm = tagged(art(handArt(170, 16), S, C[0], C[1], { seed: 722, cell: 4 }), { hand: 1 }), hh = tagged(art(handArt(110, 24), S, C[0], C[1], { seed: 723, cell: 4 }), { hand: 2 });
    const one = tagged(art(coin$(52), 1, 0, 330, { seed: 724, cell: 4 }), { one: 1 });
    SH.onetime = makeShape([face, hm, hh, one], (t, i, p, b) => {
      const beat = Math.pow(Math.abs(Math.sin(Math.PI * (t - 49.3) * 1.6)), 6), sc = 1 + 0.07 * beat;
      if (p.one) { const u = clamp((t - 50.9) / 0.5), y = lerp(-80, 330, u * u), bo = t > 51.4 ? 26 * Math.abs(Math.sin((t - 51.4) * 9)) * Math.exp(-(t - 51.4) * 5) : 0; b.y[i] = p.y - 330 + y - bo; b.a[i] = t < 50.9 ? 0.02 : p.a; b.t[i] = GREEN; return; }
      let x = p.x, y = p.y;
      if (p.hand) { const m = 2 * Math.PI * (t - 49.3) * 3.2, a = p.hand === 1 ? m : m / 12 + 2.1, dx = x - C[0], dy = y - C[1]; x = C[0] + dx * Math.cos(a) - dy * Math.sin(a); y = C[1] + dx * Math.sin(a) + dy * Math.cos(a); }
      b.x[i] = C[0] + (x - C[0]) * sc; b.y[i] = C[1] + (y - C[1]) * sc; b.a[i] = Math.min(1, p.a * 1.15) + 0.25 * beat; if (p.hand) b.t[i] = beat > 0.6 && hash(i, 3) < 0.5 ? RED : WHITE;
    });
  }

  // 0:57–1:01 "um produto pequeno, construído uma vez, já pode ser pago todo mês" — the real app (photo, media) swings in; users pay and cheer
  {
    const SR = [], users = []; [-375, -225, -75, 75, 225, 375].forEach((x, k) => { const y = 330 + 18 * Math.abs(k - 2.5); SR.push([x, y - 60]); users.push(...bustAt(B30, x, y, k, { rgPose: poseAt(PUL_APP[k % 3] + 0.55, 'stand', 'jump', 0.2) })); });
    APP6.src = SR;
    const ph = tagged(art(g => phoneArt(g, { body: OR }), 0.8, 0, -150, { seed: 740 }), { ph: 1 });
    SH.smallapp = makeShape([ph, hsort(users)], (t, i, p, b) => {
      if (p.ph) { const fy = APP6.y(t); b.y[i] = p.y + fy; b.a[i] = Math.min(1, p.a * 1.2) + 0.35 * flash(t, 58.45, 0.15) + 0.2 * PUL_APP.reduce((s, P) => s + flash(t, P + 0.6, 0.12), 0); return; }
      popAt(t, i, p, b, 59.95 + p.bk * 0.05, p.bx, p.by); b.a[i] = Math.min(1, b.a[i] * 1.15); });
  }

  // 1:01–1:06 "isso exigia uma equipe ou muito dinheiro" — eight at their laptops, typing; the salaries go out as banknotes (media), not energy
  {
    const team = []; TEAM_P.forEach(([x, y], k) => { team.push(...bustAt(B30, x, y, k, { rgPose: k % 3 === 1 ? 'talk' : 'type' })); art(laptopArt(x, y + 78, 0.9), 1, 0, 0, { seed: 750 + k, cell: 4, nosort: true }).forEach(p => team.push({ ...p, bk: k, bx: x, by: y, lap: 1 })); });
    const pile = tagged(art(textArt('$', 130, GN), 1, 0, 10, { seed: 759, cell: 4 }), { pile: 1 });
    SH.team = makeShape([hsort(team), pile], (t, i, p, b) => {
      if (p.pile) { const on = dropIn(t, 64.8, 0.3); b.a[i] = p.a * clamp(on, 0.02) * (1 - 0.4 * ramp(t, 65.2, 0.8)); b.t[i] = GREEN; return; }
      popAt(t, i, p, b, 62.3 + p.bk * 0.12, p.bx, p.by); b.a[i] = Math.min(1, b.a[i] * 1.15);
      if (p.lap) { b.a[i] *= 0.8 + 0.2 * Math.sin(t * 9 + p.bk + p.y * 0.05); b.t[i] = hash(i, 4) < 0.3 ? BLUE : WHITE; }
    });
  }

  // 1:06–1:10 "quase 6 mil reais por mês" — R$ 6 MIL in red, big and heavy over the programmer b-roll: money thrown away
  SH.price = makeShape([tagged(art(textArt('R$ 6 MIL', 185, RD), 1, 0, -170, { seed: 762, w: 1060, h: 1100 }), { big: 1 })], (t, i, p, b) => {
    const on = ramp(t, 68.45, 0.35, E.backOut), s = 1.4 - 0.4 * clamp(on), shake = 7 * flash(t, 68.7, 0.18);
    b.a[i] = Math.min(1, p.a * 1.3) * clamp(on * 1.5, 0.02) + 0.5 * flash(t, 68.55, 0.12);
    b.x[i] = p.x * s + shake * Math.sin(t * 70); b.y[i] = -170 + (p.y + 170) * s + 6 * ramp(t, 69.4, 0.8); b.t[i] = RED;
  });

  // 1:10–1:13 "essa equipe inteira cabe… no seu celular" — a bigger phone in the centre; the eight fly in and each works in its own cell
  {
    const PHC = [0, -40], PS = 1.15, ph = tagged(art(g => phoneArt(g, { body: WT }), PS, PHC[0], PHC[1], { seed: 770 }), { ph: 1 });
    const team = []; TEAM_P.forEach(([x, y], k) => B30.forEach(q => team.push({ ...q, x: q.x + x, y: q.y + y, rx: q.x, ry: q.y, tm: k, rgPose: roleOf(k) })));
    SH.inphone = makeShape([ph, hsort(team)], (t, i, p, b) => {
      if (p.tm !== undefined) {
        const q = inQ(t, p.tm), s = lerp(1, 0.62, q), [ox, oy] = TEAM_P[p.tm], [ix, iy] = CELL6[p.tm], arc = -120 * Math.sin(Math.PI * q);
        b.x[i] = lerp(ox, ix, q) + p.rx * s; b.y[i] = lerp(oy, iy + 28, q) + arc + p.ry * s; b.s[i] = p.s * lerp(1, 0.8, q); b.a[i] = Math.min(1, p.a * (0.95 + 0.25 * q)); if (q > 0.6) b.t[i] = PURPLE; return;
      }
      const lit = ramp(t, 71.9, 0.4); b.t[i] = lit > hash(i, 3) ? PURPLE : WHITE; b.a[i] = Math.min(1, p.a * 1.15) + 0.35 * flash(t, 73.1, 0.15);
    });
  }

  // 1:32–1:36 "sem IA… uma equipe inteira de programadores" — the whole team lower and brighter; the IA larger
  {
    const ia = tagged(art(textArt('IA', 200, WT), 1, 0, -360, { seed: 811, cell: 4, h: 1300 }), { ia: 1 });
    const sk = tagged(art(strikeArt(-170, -300, 170, -420), 1, 0, 0, { seed: 812, cell: 4, h: 1300 }), { sk: 1 });
    const devs = []; ringPos(16, 440, 280, 0, 160, -Math.PI / 2).forEach(([x, y], k) => { devs.push(...bustAt(BUSTD_T, x, y, k, { rgPose: 'type' })); art(laptopArt(x, y + 46, 0.45), 1, 0, 0, { seed: 813 + k, cell: 4, nosort: true }).forEach(p => devs.push({ ...p, bk: k, bx: x, by: y })); });
    SH.noai = makeShape([ia, sk, hsort(devs)], (t, i, p, b) => {
      if (p.sk) { b.a[i] = p.x < -170 + 340 * ramp(t, 92.95, 0.3, E.cubicOut) ? p.a : 0.02; return; }
      if (p.ia) { b.t[i] = RED; b.a[i] = Math.min(1, p.a * 1.3) + 0.3 * flash(t, 92.9, 0.2); return; }
      popAt(t, i, p, b, 95.15 + p.bk * 0.04, p.bx, p.by); b.t[i] = WHITE; b.a[i] = Math.min(1, b.a[i] * 1.3);
    });
  }

  // 1:41–1:45 "vende o SALG por assinatura" — no gold ring; the subscribers jump, happy (it solved their pain); the cards fly in (overlay)
  {
    const subs = []; for (let k = 0; k < 7; k++) { const x = (k - 3) * 145, y = 330 + 16 * Math.abs(k - 3); subs.push(...bustAt(B45, x, y, k, { rgPose: poseAt(PAY_AT[k % PAY_AT.length] + 0.75, 'stand', k % 2 ? 'jump' : 'cheer', 0.2) })); }
    SH.subscr = makeShape([hsort(subs)], (t, i, p, b) => { popAt(t, i, p, b, 101.6 + p.bk * 0.08, p.bx, p.by); b.a[i] = Math.min(1, b.a[i] * 1.15); });
  }

  // 1:45–1:49 "e ele é nosso… continua dono" — the staircase turns blue step by step (ownership); the SALG revenue behind (media)
  {
    const steps = []; STEP5.forEach(([x, y], k) => dotArt(stepColArt(k), 1, x, y, { seed: 831 + k, nosort: true }).forEach(p => steps.push({ ...p, stp: k })));
    const three = []; for (let k = 0; k < 3; k++) FULL_T.forEach(p => three.push({ ...p, rsc: 0.42, rx: p.x * 0.42, ry: p.y * 0.42, s: p.s * 0.6, pp: k, rgPose: 'walk' }));
    SH.ours = makeShape([hsort(steps), three], (t, i, p, b) => {
      if (p.pp !== undefined) {
        const lvl = STEP_AT5.filter(T => t >= T).length, k0 = Math.max(0, lvl - 1), k1 = lvl, pr = lvl === 0 ? 1 : ramp(t, STEP_AT5[lvl - 1], 0.45, E.inOut);
        const top = k => [STEP5[k][0], STEP5[k][1] - 60 * k], [x0, y0] = top(k0), [x1, y1] = top(k1);
        b.x[i] = lerp(x0, x1, pr) + (p.pp - 1) * 40 + p.rx; b.y[i] = lerp(y0, y1, pr) - (lvl ? 70 * Math.sin(Math.PI * pr) : 0) - 63 + p.ry; if (ramp(t, 108.04, 0.4) > hash(i, 5)) b.t[i] = OWNB; return;
      }
      const T0 = p.stp === 0 ? 105.2 : STEP_AT5[p.stp - 1] + 0.2, lit = t >= T0; if (lit && hash(i, 3) < ramp(t, T0, 0.4)) b.t[i] = OWNB;
      b.a[i] = p.a * (lit ? 1 : 0.55) + 0.3 * flash(t, 108.1, 0.25);
    });
  }

  // 1:55–1:58 "com 16 anos, dropshipping" — the box is cardboard brown with tape; the day-trade candles keep their red and green
  SH.drop = makeShape([TLP.map(p => ({ ...p })), tagged(art(boxArt, 1.35, 30, -120, { seed: 860, cell: 4 }), { bx2: 1 })], (t, i, p, b) => {
    if (p.bx2) { b.x[i] = p.x + 6 * Math.sin(t * 2); b.y[i] = p.y + 4 * Math.sin(t * 2.4); b.t[i] = p.v > 0.85 ? CREAM : CHOCO; return; }
    tlLife6(t, i, p, b);
  });

  // 1:59–2:03 "qualquer coisa nova prometendo dinheiro" — eight different promises, each in its own colour; the $ green; the ages 14 and 16 turn red
  {
    const pts = [];
    HY_POS.forEach(([x, y], k) => art(k < 4 ? HYPE_ART[k] : hypeExtra(k - 4), 0.42, x, y, { seed: 870 + k, cell: 4, nosort: true }).forEach(p => pts.push({ ...p, hy: k })));
    const dl = []; HY_POS.forEach(([x, y], k) => art(textArt('$', 70, GN), 1, x + 70, y - 70, { seed: 880 + k, cell: 4, nosort: true }).forEach(p => dl.push({ ...p, hdk: k })));
    SH.hype = makeShape([TLP.map(p => ({ ...p })), hsort(pts), hsort(dl)], (t, i, p, b) => {
      if (p.hy !== undefined) { popAt(t, i, p, b, 119.35 + p.hy * 0.28, HY_POS[p.hy][0], HY_POS[p.hy][1]); b.y[i] += 5 * Math.sin(t * 2 + p.hy); if (p.v < 0.9 || p.hy >= 4) b.t[i] = HY_TINT[p.hy]; return; }
      if (p.hdk !== undefined) { popAt(t, i, p, b, 121.7 + p.hdk * 0.08, HY_POS[p.hdk][0] + 70, HY_POS[p.hdk][1] - 70); b.t[i] = GREEN; return; }
      tlLife6(t, i, p, b, true);
    });
  }

  // 2:03–2:08 "os olhos no mesmo lugar" — the $ swings from side to side; every eye follows it
  {
    const DL = [0, -440], lids = [], iris = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) { const x = (c - 1) * 320, y = -60 + r * 230, k = r * 3 + c, dd = Math.hypot(DL[0] - x, DL[1] - y), ox = (DL[0] - x) / dd * 40, oy = (DL[1] - y) / dd * 40;
      dotArt(lidArt(ox, oy), 0.78, x, y, { seed: 890 + k, cell: 3, nosort: true }).forEach(p => lids.push({ ...p, ek: k })); dotArt(irisArt(ox, oy), 0.78, x, y, { seed: 910 + k, cell: 3, nosort: true }).forEach(p => iris.push({ ...p, ex: x, ey: y, iox: ox * 0.78, ioy: oy * 0.78 })); }
    const dl = tagged(art(textArt('$', 210, GN), 1, DL[0], DL[1], { seed: 930 }), { dl: 1 });
    const dlx = t => 330 * Math.sin((t - 124.5) * 2.1) * ramp(t, 124.5, 0.5);
    SH.eyes = makeShape([hsort(lids), hsort(iris), dl], (t, i, p, b) => {
      if (p.dl) { b.t[i] = GREEN; b.x[i] = p.x + dlx(t); b.a[i] = p.a + 0.4 * flash(t, 126.85, 0.2); return; }
      if (p.ex !== undefined) { const look = ramp(t, 124.2, 0.4, E.cubicOut), tx = DL[0] + dlx(t) - p.ex, ty = DL[1] - p.ey, d = Math.hypot(tx, ty), nx = tx / d * 31, ny = ty / d * 31;
        b.x[i] = p.x + lerp(-p.iox * 1.5, nx - p.iox, look); b.y[i] = p.y + lerp(-p.ioy * 1.5, ny - p.ioy, look); }
      b.a[i] = Math.min(1, p.a * 1.15);
    });
  }

  // 2:08–2:13 "milhares de pessoas já estavam" — the $ spins at the centre; the crowd brighter
  {
    const pts = []; let k = 0;
    [[26, 205, 140], [38, 305, 208], [48, 410, 282]].forEach(([n, rx, ry], ri) => { for (let j = 0; j < n; j++) { const a = (j / n) * 2 * Math.PI + ri * 0.3; pts.push(...bustAt(BUSTD_T, rx * Math.cos(a), 30 + ry * Math.sin(a), k++, { rgPose: 'reach' })); } });
    const dl = tagged(art(textArt('$', 230, GN), 1, 0, 20, { seed: 940 }), { dl: 1 });
    const me = tagged(manAt(0, 0, 0.34, 941, { pose: 'shrug' }), { me: 1 });
    SH.late = makeShape([hsort(pts), dl, me], (t, i, p, b) => {
      if (p.me) { const q = ramp(t, 129.45, 0.65, E.cubicOut); b.x[i] = p.x + lerp(600, 470, q); b.y[i] = p.y + 380; b.a[i] = p.a * clamp(q * 2, 0.02); return; }
      if (p.dl) { b.t[i] = GREEN; b.x[i] = p.x * Math.cos((t - 128.15) * 3.2); b.a[i] = p.a + 0.3 * flash(t, 131.0, 0.3); return; }
      const q = E.cubicOut(ramp(t, 130.25 + 0.7 * hash(p.bk, 3), 1.0)), sx = p.bx * 2.7, sy = 30 + (p.by - 30) * 2.7, run = (1 - q) * 9 * Math.abs(Math.sin(t * 15 + p.bk));
      b.x[i] = lerp(sx, p.bx, q) + (p.x - p.bx); b.y[i] = lerp(sy, p.by, q) + (p.y - p.by) - run; b.a[i] = Math.min(1, p.a * 1.35) * clamp(ramp(t, 130.2 + 0.7 * hash(p.bk, 3), 0.3), 0.02); b.t[i] = WHITE;
    });
  }

  // 2:13–2:16 "aparecia outra novidade e eu começava de novo do zero" — a shiny NOVO runs ahead; I run after it, the bar fills… and snaps back
  {
    const W2 = 760, BY = 120;
    const out = tagged(art(barArt(W2), 1, 0, BY, { seed: 950, cell: 4 }), { bo: 1 }), fill = tagged(art(barFill(W2, OR), 1, 0, BY, { seed: 951, cell: 4 }), { bf: 1 });
    const tag = tagged(art(novoTag(1), 1, 0, -230, { seed: 952, cell: 4 }), { tg: 1 });
    const spark = [...Array(260)].map((_, k) => ({ spk: k, x: 0, y: -230, a: 0.8, c: pick('*+·', hash(k, 3)), t: hash(k, 4) > 0.5 ? BLUE : WHITE, s: 0.4 }));
    const runX = t => t < 135.5 ? lerp(-420, 120, E.inOut(ramp(t, 133.3, 2.2))) : lerp(120, -420, E.inOut(ramp(t, 135.85, 0.6)));
    const tagX = t => t < 135.5 ? lerp(-60, 330, E.inOut(ramp(t, 134.05, 1.45))) : 330;
    RESTART6.runX = runX;
    const pose = t => t < 135.5 ? walkAt(u => [runX(u), 0, 0.38], 133.3, t, 'side', 1, { D: 95 }) : t < 135.85 ? MAN_POSES.sad(t) : mixPose(MAN_POSES.sad(t), walkAt(u => [runX(u), 0, 0.38], 135.85, t, 'side'), ramp(t, 135.85, 0.2));
    const me = manT(1, 953, { k: 0.38 * 1.15, base: 330, view: 'side', pose }).map(p => ({ ...p, me: 1 }));
    SH.restart = makeShape([out, fill, tag, spark, hsort(me)], (t, i, p, b) => {
      if (p.bf) { b.a[i] = p.x < -W2 / 2 + 12 + (W2 - 24) * barF(t) ? p.a : 0.02; if (t > 135.5) b.t[i] = RED; return; }
      if (p.bo) { if (flash(t, 136.0, 0.3) > hash(i, 3)) b.t[i] = RED; return; }
      if (p.tg) { popAt(t, i, p, b, 134.05, 0, -230, 0.35, 0.6); b.x[i] += tagX(t); b.y[i] += 8 * Math.sin(t * 3); if (t > 135.5) b.a[i] *= 1 - ramp(t, 135.5, 0.3); return; }
      if (p.spk !== undefined) { const a = hash(p.spk, 1) * 6.283 + t * 1.5, r = 130 + 60 * hash(p.spk, 2); b.x[i] = tagX(t) + r * Math.cos(a); b.y[i] = -230 + r * Math.sin(a) * 0.5; b.a[i] = Math.max(0.02, (0.4 + 0.5 * Math.sin(t * 9 + p.spk)) * ramp(t, 134.1, 0.3) * (1 - ramp(t, 135.5, 0.3))); return; }
      const X = runX(t), back = t > 135.85; b.x[i] += X; if (back) b.x[i] = 2 * X - b.x[i]; b.t[i] = t > 135.5 ? GRAY : WHITE; b.a[i] = Math.min(1, p.a * 1.15);
    });
  }

  // 2:16–2:22 "eu acumulava informação e nenhuma me dava dinheiro" — a brain seen from the side; books fly into it; the $ stays empty and red
  {
    const BR = [-90, -90], brain = tagged(art(C6.brainSide, 1, BR[0], BR[1], { seed: 960, tint: PINK, h: 1100 }), { br: 1 });
    const COLS = ['#4D8DFF', '#3DDC84', '#FF9B55', '#A68BFF', '#FF5A52', '#F6E3C2', '#4D8DFF', '#FF9B55', '#3DDC84', '#A68BFF'], books = [];
    COLS.forEach((hex, k) => art(C6.book(hex), 0.9, 0, 0, { seed: 961 + k, cell: 4, nosort: true }).forEach(p => books.push({ ...p, bk6: k, lx: p.x, ly: p.y })));
    const dl = tagged(art(textArt('$', 220, RD), 1, 330, 120, { seed: 975 }), { dl: 1 });
    SH.learn = makeShape([hsort(brain), books, dl], (t, i, p, b) => {
      if (p.dl) { const on = dropIn(t, 141.55, 0.3); b.t[i] = RED; b.a[i] = Math.max(0.02, p.a * (0.35 + 0.65 * clamp(on))) + 0.3 * flash(t, 142.35, 0.2); b.x[i] = p.x + 8 * Math.sin(t * 40) * flash(t, 142.35, 0.25); return; }
      if (p.bk6 !== undefined) { const T0 = 137.0 + p.bk6 * 0.38, u = clamp((t - T0) / 0.75); if (u <= 0 || u >= 1) { b.a[i] = 0.02; return; }
        const side = p.bk6 % 2 ? 1 : -1, sx = side * 560, sy = -420 + 120 * hash(p.bk6, 3), tx = BR[0] + 20, ty = BR[1] - 120, q = E.inOut(u), s = lerp(1, 0.15, q * q), rot = side * 2.2 * q;
        const x = lerp(sx, tx, q), y = lerp(sy, ty, q) - 140 * Math.sin(Math.PI * q), c = Math.cos(rot), sn = Math.sin(rot);
        b.x[i] = x + (p.lx * c - p.ly * sn) * s; b.y[i] = y + (p.lx * sn + p.ly * c) * s; b.a[i] = p.a * Math.min(1, 4 * (1 - u)); return; }
      const fullness = ramp(t, 137.4, 3.6); b.a[i] = p.a * (0.75 + 0.25 * fullness) + 0.2 * Math.max(...[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(k => flash(t, 137.75 + k * 0.38, 0.12)));
      const sw = 1 + 0.015 * Math.sin(t * 2); b.x[i] = BR[0] + (p.x - BR[0]) * sw; b.y[i] = BR[1] + (p.y - BR[1]) * sw;
    });
  }

  // 2:22–2:25 "não tinha nada que fosse meu" — an empty shop from inside: bare shelves, a bulb flickering, and me in the middle with nothing
  {
    const room = tagged(art(emptyRoomArt, 1, 0, 0, { seed: 980, h: 1100, w: 1100 }), { rm: 1 });
    const me = tagged(manAt(0, 210, 0.62, 983, { pose: 'shrug' }), { me: 1 });
    const dust = [...Array(300)].map((_, k) => ({ du: k, x: (hash(k, 1) - 0.5) * 700, y: (hash(k, 2) - 0.5) * 600, a: 0.3, c: CI['·'], t: WHITE, s: 0.35 }));
    SH.nothing = makeShape([room, me, dust], (t, i, p, b) => {
      if (p.rm) { const fl = p.t === CREAM ? (Math.sin(t * 23) > 0.6 || Math.sin(t * 7) > 0.9 ? 0.3 : 1) : 1; b.a[i] = p.a * 0.85 * fl; return; }
      if (p.du !== undefined) { b.y[i] = p.y + 20 * Math.sin(t * 0.6 + p.du); b.x[i] = p.x + 14 * Math.sin(t * 0.4 + p.du * 2); b.a[i] = 0.15 + 0.15 * Math.sin(t * 2 + p.du); return; }
      b.a[i] = Math.min(1, p.a * 1.15);
    });
  }

  // 2:36–2:38 "na internet, a comida é a novidade" — under the trap: a sparkling NOVO and a red $ (no thumbnail)
  {
    const ground = tagged(art(g => { g.fillStyle = tone(WT, 0.45); RR(g, -480, 212, 960, 8, 4); g.fill(); }, 1, 0, 0, { seed: 990, cell: 4 }), { gr: 1 });
    const crate = tagged(dotArt(crateArt, 1, 0, 60, { seed: 991 }), { cr: 1 });
    const stick = tagged(art(g => { g.strokeStyle = LG(g, 0, 50, 0, 205, [[0, tone(WT, 0.95)], [1, tone(WT, 0.5)]]); g.lineWidth = 14; g.beginPath(); g.moveTo(140, 205); g.lineTo(130, 52); g.stroke(); g.strokeStyle = tone(WT, 0.55); g.lineWidth = 4; g.beginPath(); g.moveTo(136, 130); g.quadraticCurveTo(320, 230, 520, 205); g.stroke(); }, 1, 0, 0, { seed: 992, cell: 4 }), { sk2: 1 });
    const tag = tagged(art(novoTag(0.62), 1, 0, 150, { seed: 1005, cell: 4 }), { tg: 1 }), dl = tagged(art(textArt('$', 90, RD), 1, 110, 120, { seed: 1006, cell: 4 }), { dl: 1 });
    const spk = [...Array(400)].map((_, k) => ({ spk5: k, x: 30 + (hash(k, 1) - 0.5) * 300, y: 150 + (hash(k, 2) - 0.5) * 140, a: 0.8, c: pick('*+·', hash(k, 3)), t: hash(k, 4) > 0.5 ? BLUE : WHITE, s: 0.4 }));
    SH.bait = makeShape([ground, crate, stick, tag, dl, spk], (t, i, p, b) => {
      if (p.cr) { rot(b, i, p, HINGE[0], HINGE[1], A0); return; }
      if (p.tg) { popAt(t, i, p, b, 156.75, 0, 150, 0.3, 0.6); b.y[i] += 5 * Math.sin(t * 3); return; }
      if (p.dl) { popAt(t, i, p, b, 157.4, 110, 120, 0.3, 0.6); b.t[i] = RED; b.y[i] += 4 * Math.sin(t * 3 + 1); return; }
      if (p.spk5 !== undefined) { b.a[i] = Math.max(0.02, (0.5 + 0.5 * Math.sin(t * 8 + p.spk5)) * ramp(t, 156.9, 0.4)); b.y[i] = p.y - 14 * ((t * 0.5 + hash(p.spk5, 5)) % 1); }
    });
  }

  // 2:51–2:54 "essa gente ganha dinheiro com o tempo que você passa assistindo" — the sand runs; the screen shows the week's novelty (media),
  // pulsing; my banknotes feed it (overlay); no stream of coins
  {
    const HG = [-250, 0], S = 0.55;
    const frame = dotArt(hgFrame, S, HG[0], HG[1], { seed: 1020, cell: 4 }), sand = tagged(dotArt(hgSand, S, HG[0], HG[1], { seed: 1021, cell: 4 }), { sand: 1 });
    const scr = tagged(art(screenArt(), 0.62, 250, -290, { seed: 1022, cell: 4 }), { scr: 1 });
    const viewer = tagged(manAt(180, 300, 0.5, 1023, { pose: 'sad' }), { vw: 1 });
    SH.watch = makeShape([frame, sand, scr, viewer], (t, i, p, b) => {
      if (p.sand) { const u = ramp(t, 170.6, 3.6, E.lin), ly = (p.y - HG[1]) / S; const on = ly < 0 ? ly > -270 + 262 * u : ly > 292 - 250 * u * (1 - 0.55 * Math.pow((p.x - HG[0]) / S / 120, 2)); b.a[i] = on ? p.a : 0.02; b.t[i] = CREAM; return; }
      if (p.scr) { const s = 1 + 0.025 * Math.sin(t * 5); b.x[i] = 250 + (p.x - 250) * s; b.y[i] = -290 + (p.y + 290) * s; return; }
      if (p.vw) { const no = ramp(t, 173.65, 0.4); b.t[i] = no * 0.6 > hash(i, 4) ? RED : WHITE; b.a[i] = p.a * (0.85 + 0.3 * flash(t, 173.8, 0.15)); return; }
    });
  }

  // 2:54–3:01 "o melhor é você nunca construir nada e voltar todo dia atrás da próxima novidade" — the loop turns; I start building,
  // a lamp (the new thing) lights up, I drop everything and the blocks fall; again; NOVO on the lamp
  {
    const lp = tagged(dotArt(loopArt, 0.95, 0, 40, { seed: 1031 }), { lp: 1 });
    const lamp = tagged(art(C6.lamp, 0.8, 0, -300, { seed: 1035, cell: 4 }), { lm: 1 });
    const LAMP_AT = [175.9, 178.3, 179.65], built = []; for (let k = 0; k < 3; k++) art(g => cube(g, 0, 0, 40, 0.92), 1, 90, 250 - k * 62, { seed: 1036 + k, cell: 4, nosort: true }).forEach(p => built.push({ ...p, bl6: k }));
    const pose = t => { const lit = LAMP_AT.some(T => t >= T && t < T + 0.6); return lit ? MAN_POSES.point(t) : MAN_POSES.hammer(t); };
    const me = tagged(manAt(-80, 140, 0.48, 1030, { pose }), { me: 1 });
    const tag = tagged(art(novoTag(0.7), 1, 0, -430, { seed: 1034, cell: 4 }), { tg: 1 });
    SH.loopx = makeShape([lp, lamp, built, me, tag], (t, i, p, b) => {
      if (p.lp) { const a = 1.2 * (t - 174.5) + 2.6 * Math.max(0, t - 177.7); rot(b, i, p, 0, 40, a); b.a[i] = p.a * 0.6; return; }
      if (p.lm) { const lit = LAMP_AT.reduce((s, T) => s + Math.exp(-Math.max(0, t - T) * 1.6) * (t >= T ? 1 : 0), 0); b.a[i] = Math.min(1, p.a * (0.55 + 0.6 * clamp(lit))) ; b.t[i] = lit > 0.3 && hash(i, 2) < 0.7 ? CREAM : WHITE; return; }
      if (p.bl6 !== undefined) { // each lap: the blocks go up one by one, then fall when the lamp lights
        const lap = t < LAMP_AT[0] ? 0 : t < LAMP_AT[1] ? 1 : 2, T0 = [174.7, LAMP_AT[0] + 0.5, LAMP_AT[1] + 0.4][lap], Tf = LAMP_AT[lap], on = ramp(t, T0 + p.bl6 * 0.45, 0.25, E.backOut), fall = ramp(t, Tf + 0.05, 0.45, E.quadIn);
        b.y[i] = p.y - 40 * (1 - clamp(on)) + 260 * fall; b.x[i] = p.x + 50 * fall * (p.bl6 - 1); b.a[i] = p.a * clamp(on, 0.02) * (1 - fall); b.t[i] = CLAUDE; return; }
      if (p.tg) { popAt(t, i, p, b, 179.65, 0, -430, 0.35, 0.6); return; }
      b.a[i] = Math.min(1, p.a * 1.1);
    });
  }

  // 3:01–3:05 "se empolgou na primeira semana e parou" — the days fill green with a check (overlay), then Friday to Sunday get a red X
  {
    const tiles = []; DAYS.forEach((_, k) => { const x = (k - 3) * 132; art(tileArt(x, false), 1, 0, 0, { seed: 1040 + k, cell: 4, nosort: true }).forEach(p => tiles.push({ ...p, dy: k })); if (k < 4) art(tileArt(x, true), 1, 0, 0, { seed: 1050 + k, cell: 4, nosort: true }).filter(p => p.t === ORANGE).forEach(p => tiles.push({ ...p, dfill: k })); });
    const me = bustAt(B45, 0, 330, 0, { rgPose: poseAt(185.42, 'cheer', 'sad', 0.4) });
    SH.start = makeShape([hsort(tiles), hsort(me)], (t, i, p, b) => {
      const broke = ramp(t, 185.42, 0.4);
      if (p.dfill !== undefined) { const on = ramp(t, DAY_AT[p.dfill], 0.18, E.backOut); b.a[i] = Math.max(0.02, p.a * clamp(on)) * (1 - 0.5 * broke); b.t[i] = GREEN; return; }
      if (p.dy !== undefined) { b.a[i] = p.a * (t < 183.3 ? 0.5 + 0.35 * Math.abs(Math.sin(t * 2.5)) : 0.9); if (p.dy >= 4 && broke > 0.5) b.t[i] = RED; return; }
      b.y[i] = p.y + 14 * broke; b.t[i] = broke > 0.5 ? GRAY : WHITE;
    });
  }

  // 3:09–3:13 "sozinho, com o vídeo feito pra você assistir, não pra você construir" — everything bigger; the box to build gets an X
  {
    const cone = [...Array(1500)].map((_, k) => { const v = hash(k, 1), w = (hash(k, 2) - 0.5) * 2; return { cone: 1, x: w * lerp(30, 360, v), y: -660 + 1050 * v, a: 0.18 + 0.16 * hash(k, 3), c: pick('.·:', hash(k, 4)), t: WHITE, s: 0.45 }; });
    const me = tagged(manAt(-60, 300, 0.75, 1060, { pose: 'sad' }), { me: 1 });
    const SW = 1.18, scr = tagged(art(g => { const w = 640, h = 360; g.fillStyle = LG(g, -w / 2, -h / 2, w / 2, h / 2, [[0, tone(WT, 1)], [0.5, tone(WT, 0.7)], [1, tone(WT, 0.45)]]); RR(g, -w / 2 - 16, -h / 2 - 16, w + 32, h + 32, 24); g.fill(); g.fillStyle = VOID; RR(g, -w / 2, -h / 2, w, h, 12); g.fill(); }, SW, 0, -250, { seed: 1061, cell: 4, w: 1100 }), { scr: 1 });
    const blk = tagged(art(g => { g.strokeStyle = tone(OR, 0.95); g.lineWidth = 6; g.setLineDash([14, 10]); poly(g, [[0, -50], [60, -20], [0, 10], [-60, -20]]); g.stroke(); poly(g, [[-60, -20], [-60, 50], [0, 80], [60, 50], [60, -20]]); g.stroke(); g.beginPath(); g.moveTo(0, 10); g.lineTo(0, 80); g.stroke(); g.setLineDash([]); }, 1.7, 300, 330, { seed: 1062, cell: 4 }), { blk: 1 });
    SH.alone = makeShape([hsort(cone), me, scr, blk], (t, i, p, b) => {
      if (p.scr) { popAt(t, i, p, b, 190.85, 0, -250); return; }
      if (p.blk) { const on = ramp(t, 192.6, 0.3); b.a[i] = p.a * clamp(on * (0.7 + 0.3 * Math.sin(t * 4)), 0.02); return; }
      if (p.cone) { b.a[i] = p.a * (0.8 + 0.2 * Math.sin(t * 1.5 + p.y * 0.01)); return; }
      b.a[i] = Math.min(1, p.a * 1.2);
    });
  }

  // 3:14–3:17 the race to the finish: the start crowd brighter; the arch and FIM white (no yellow)
  {
    const track = []; for (let k = 0; k < 900; k++) { const ln = k % 6, v = (k / 6 | 0) / 150, sc = lerp(1, 0.3, v), x = (ln - 2.5) * 150 * sc, y = lerp(470, -150, v); track.push({ tr: 1, x, y, a: 0.55 * (1 - 0.4 * v), c: CI['·'], t: WHITE, s: 0.5 * sc + 0.2 }); }
    const arch = tagged(dotArt(archArt, 0.82, 0, -250, { seed: 1071 }), { ar: 1 });
    const confetti = [...Array(500)].map((_, k) => ({ cf: k, x: (hash(k, 1) - 0.5) * 380, y: -420 + hash(k, 2) * 300, a: 0.8, c: pick('▪•*', hash(k, 3)), t: hash(k, 4) > 0.5 ? WHITE : GREEN, s: 0.35 }));
    const crowd = []; for (let r = 0; r < 3; r++) for (let c = 0; c < 9; c++) crowd.push(...bustAt(BUSTD_T, (c - 4) * 70 + (r % 2) * 30, 400 + r * 46, r * 9 + c));
    const runners = []; RUN5.forEach((_, k) => FULL_T.forEach(p => runners.push({ ...p, rsc: 0.4, rx: p.x * 0.4, ry: p.y * 0.4, rn: k, rgPose: 'walk' })));
    SH.path = makeShape([track, arch, confetti, hsort(crowd), runners], (t, i, p, b) => {
      if (p.ar) { b.t[i] = WHITE; b.a[i] = Math.min(1, p.a * 1.1) + 0.2 * Math.sin(t * 3); return; }
      if (p.cf !== undefined) { b.y[i] = -420 + ((hash(p.cf, 2) * 300 + t * 40) % 300); b.x[i] = p.x + 8 * Math.sin(t * 2 + p.cf); b.a[i] = 0.25 + 0.35 * Math.sin(t * 5 + p.cf); return; }
      if (p.tr) return;
      if (p.rn !== undefined) {
        const [dist, lx] = RUN5[p.rn], q = E.cubicOut(ramp(t, 195.3 + p.rn * 0.12, 1.5)), v = dist * q, sc = lerp(1, 0.3, v), stop = ramp(t, 196.3 + p.rn * 0.15, 0.4);
        b.x[i] = lx * sc + p.rx * sc; b.y[i] = lerp(430, -150, v) + p.ry * sc - 60 * sc; b.s[i] = p.s * (0.5 + 0.6 * sc);
        b.a[i] = p.a * clamp(ramp(t, 195.2, 0.3), 0.02) * (1 - 0.5 * stop); if (stop > hash(i, 5)) b.t[i] = RED; return;
      }
      b.t[i] = WHITE; b.a[i] = Math.min(1, p.a * 1.3);
    });
  }

  // 3:17–3:24 the "Ganhe dinheiro com IA" phone: the ? whole on screen (no cut at the top)
  {
    const ph = tagged(art(g => phoneArt(g), 0.95, 0, -40, { seed: 1080 }), { ph: 1 });
    const q = tagged(art(textArt('?', 200, WT), 1, 0, -505, { seed: 1083, cell: 4, h: 1400 }), { q: 1 });
    SH.flex = makeShape([ph, q], (t, i, p, b) => {
      if (p.q) { popAt(t, i, p, b, 204.1, 0, -505, 0.35, 0.6); b.t[i] = ramp(t, 204.5, 0.5) * 0.5 > hash(i, 3) ? RED : WHITE; return; }
      b.a[i] = Math.min(1, p.a * 1.1);
    });
  }

  // 3:40–3:47 the endless feed: real YouTube covers scroll (media); the ASCII cards stay as a faint frame. Then the chest: a key turns in it,
  // the lid opens on the money (what few people noticed)
  {
    const base = tagged(art(C6.chestBase, 1.3, 0, 140, { seed: 1140, cell: 4 }), { cb6: 1 }), lid = tagged(art(C6.chestLid, 1.3, 0, 127, { seed: 1141, cell: 4 }), { cl6: 1 }), key = tagged(art(C6.keyArt, 0.75, 0, 0, { seed: 1142, cell: 4 }), { ky6: 1 });
    SH.info = makeShape([base, lid, key], (t, i, p, b) => {
      const go = ramp(t, 225.0, 0.5, E.cubicOut);
      if (p.cb6) { b.a[i] = Math.min(1, p.a * 1.25) * clamp(go, 0.02); b.y[i] = p.y + 60 * (1 - go); b.t[i] = p.v > 0.8 ? GOLD : CHOCO; return; }
      if (p.cl6) { const op = ramp(t, 226.25, 0.5, E.cubicOut), a = 1.9 * op, hb = 127 - 1.3 * 125, y = hb + (p.y - hb) * Math.cos(a); b.y[i] = y + 60 * (1 - go); b.a[i] = Math.min(1, p.a * 1.25) * clamp(go, 0.02) * (Math.cos(a) < 0 ? 0.8 : 1); b.t[i] = p.v > 0.8 ? GOLD : CHOCO; return; }
      const kin = ramp(t, 225.3, 0.6, E.inOut), turn = ramp(t, 225.95, 0.3, E.inOut), out = ramp(t, 226.3, 0.25);
      const kx = lerp(-560, -92, kin), ky = lerp(-200, 202, kin) - 120 * Math.sin(Math.PI * kin), sx = Math.cos(turn * Math.PI / 2 * 0.9);
      b.x[i] = kx + p.x * (0.55 + 0.45 * sx); b.y[i] = ky + p.y; b.a[i] = p.a * clamp(kin * 3, 0.02) * (1 - out); b.t[i] = GOLD;
    });
  }

  // 3:50–3:53 "quem entende o jogo de verdade" — a solid pawn; the crown drops, turns and lands on it with a bounce
  SH.game = makeShape([dotArt(boardIsoArt, 1, 0, 300, { seed: 1180, cell: 4 }), tagged(art(C6.pawn, 1, 0, 60, { seed: 1181 }), { pw: 1 }), tagged(art(C6.crown, 0.85, 0, 0, { seed: 1182, cell: 4 }), { cr2: 1 })], (t, i, p, b) => {
    if (p.pw) { const land = flash(t, 232.55, 0.12); b.y[i] = 60 + (p.y - 60) * (1 - 0.04 * land); b.a[i] = Math.min(1, p.a * 1.1) + 0.2 * land; return; }
    if (!p.cr2) return;
    const u = ramp(t, 231.9, 0.65, E.backOut), y = lerp(-760, -168, u), spin = (1 - clamp(u)) * 5, sq = 1 - 0.12 * flash(t, 232.55, 0.1), wob = 0.12 * Math.sin((t - 232.5) * 14) * Math.exp(-Math.max(0, t - 232.5) * 4);
    const c = Math.cos(spin + wob), s = Math.sin(spin + wob); b.x[i] = p.x * c - p.y * s; b.y[i] = y + (p.x * s + p.y * c) * sq; b.a[i] = p.a * clamp(ramp(t, 231.9, 0.15), 0.02) + 0.3 * flash(t, 232.55, 0.15); b.t[i] = GOLD;
  });

  // 3:53–4:00 "a história se repete… só um grupo pequeno" — the crowd starts big and close (a lot of people), then the camera pulls back
  // through it; the small group steps forward in front
  {
    const ia = tagged(art(textArt('IA', 230, BL), 1, 0, -380, { seed: 1190, h: 1300 }), { ia: 1 });
    const crowd = crowd3Pts(CROWD3.filter((_, k) => k >= 9), false);
    const g7r = []; for (let k = 0; k < 7; k++) FULL_T.forEach(p => g7r.push({ ...p, rsc: 0.6, x: p.x * 0.6 + G7X(k) * 0.8, y: p.y * 0.6 + 360 + 8 * Math.abs(k - 3), s: p.s * 0.75, g7: k, bx: G7X(k) * 0.8, by: 360, rgPose: 'type' }));
    const win = tagged(art(winArt, 0.62, 0, 150, { seed: 1192, cell: 4 }), { wn: 1 });
    SH.repeat = makeShape([ia, hsort(crowd), hsort(g7r), win], (t, i, p, b) => {
      if (p.ia) { const on = ramp(t, 233.6, 0.4); b.t[i] = BLUE; b.a[i] = Math.min(1, p.a * 1.15) * clamp(on, 0.02) + 0.3 * flash(t, 233.8, 0.2); return; }
      if (p.g7 !== undefined) { popAt(t, i, p, b, 237.0 + p.g7 * 0.05, p.bx, p.by); b.a[i] = Math.min(1, b.a[i] * 1.2); return; }
      if (p.wn) { const at = 238.7 + 0.5 * clamp((p.y - 80) / 140), on = dropIn(t, at, 0.3); b.a[i] = p.a * clamp(on, 0.02) + 0.3 * flash(t, 239.3, 0.2); b.y[i] = p.y - 30 * (1 - clamp(on)); if (ramp(t, 239.25, 0.4) > hash(i, 3)) b.t[i] = WHITE; return; }
      const d = place3(b, i, p, repCam(t), 6 * ramp(t, 235.3, 0.5)), far = 0.45 + 0.55 * clamp(2.2 / d - 0.15), near = clamp((d - 0.25) / 0.35);
      b.t[i] = WHITE; b.a[i] = Math.min(1, p.a * far * near * (1.05 - 0.35 * ramp(t, 236.6, 0.6)));
    });
  }
}
// the timeline at the bottom (the ages): its markers turn red once the promises begin (they failed), the line stays faint
function tlLife6(t, i, p, b, fail = false) {
  if (p.mk === undefined) { b.a[i] = p.a * 0.4; b.t[i] = GRAY; return; }
  const lit = ramp(t, TL.at[p.mk], 0.25); b.t[i] = fail && p.mk < 2 ? RED : lit > 0.5 ? WHITE : GRAY; b.a[i] = p.a * (0.45 + 0.55 * lit) + 0.4 * flash(t, TL.at[p.mk] + 0.05, 0.12);
}
const SUBS6 = { src: [] }, OWNER6 = { src: [] }, APP6 = { src: [], y: t => 260 * (1 - E.backOut(clamp((t - 57.25) / 0.7))) - 8 * Math.sin(t * 1.6) }, RESTART6 = {};
// the cells inside the big phone (2 × 4) for the team
const CELL6 = [...Array(8)].map((_, k) => [(k % 2 ? 1 : -1) * 92, -40 - 270 + Math.floor(k / 2) * 178]);



// ───────────────────────── v6 media and overlays
function drawMediaBG6(g, t) {
  drawMediaBG5(g, t);
  const bg = (id, t0, t1, a0, o = {}) => { const a = a0 * ramp(t, t0, 0.4) * (1 - ramp(t, t1 - 0.4, 0.4)); if (a > 0.01) mediaDraw(g, seqImg(id, t), 0, 0, W, H, { a, blur: 1.1, grain: 0.32, br: 0.7, sat: 0.75, ...o }); };
  bg('scrollinsta', 7.4, 12.7, 0.4, { br: 0.8 });
  bg('b339', 219.3, 227.4, 0.6 - 0.25 * ramp(t, 225.0, 0.5));
}
function drawMediaWorld6(g, t, M) {
  drawMediaWorld5(g, t, M);
  g.setTransform(M[0], M[1], M[2], M[3], M[4], M[5]);
  // 0:41 the TV switches on and plays; the Netflix N in its corner; cards fly from the audience to it
  if (t > 41.8 && t < 45.75) {
    const a = 1 - ramp(t, 45.4, 0.3), on = ramp(t, 41.95, 0.55);
    C6.screen(g, seqImg('saindo43', t), 0, -300, 548, 303, a, { on, grain: 0.32, br: 1.0, r: 10 });
    if (on >= 1) mediaDraw(g, IMGS['netflix_n.png'], -262, -440, 44, 70, { contain: true, a: a * 0.95, grain: 0.1, blur: 0.2, sat: 1 });
    const src = SUBS6.src; for (let k = 0; k < 16; k++) { const T0 = 43.4 + k * 0.13, u = clamp((t - T0) / 0.85); if (u <= 0 || u >= 1 || !src.length) continue;
      const [sx, sy] = src[(hash(k, 3) * src.length) | 0], q = E.inOut(u); C6.pay(g, lerp(sx, (hash(k, 4) - 0.5) * 300, q), lerp(sy, -170, q) - 70 * Math.sin(Math.PI * q), lerp(0.55, 0.32, q), a * Math.sin(Math.PI * Math.min(1, u * 1.15)), 'NETFLIX', 'R$ 55,90 · MÊS', CARD_N); }
  }
  // 0:45 the owner: the Netflix N over his head; each pulse, the ring pays him (cards)
  if (t > 45.6 && t < 49.6) {
    const a = ramp(t, 45.9, 0.4) * (1 - ramp(t, 49.2, 0.3)); g.save(); g.shadowColor = 'rgba(229,9,20,0.8)'; g.shadowBlur = 26 * a; mediaDraw(g, IMGS['netflix_n.png'], -26, -262, 52, 84, { contain: true, a, grain: 0.12, blur: 0.2, sat: 1 }); g.restore();
    const src = OWNER6.src; PUL_OWN.forEach((P, pl) => { for (let k = 0; k < 9; k++) { const T0 = P + 0.04 * k, u = clamp((t - T0) / 0.7); if (u <= 0 || u >= 1 || !src.length) continue;
      const [sx, sy] = src[((k * 4 + pl * 13) % src.length)], q = E.inOut(u); C6.pay(g, lerp(sx, 0, q), lerp(sy, -40, q) - 40 * Math.sin(Math.PI * q), lerp(0.45, 0.2, q), Math.sin(Math.PI * u), 'NETFLIX', 'PAGO', CARD_N); } });
  }
  // 0:56 "você não precisa ser a Netflix": a thin, glowing strike across the name on the roof
  if (t > 56.0 && t < 57.6) { const off = ramp(t, 55.9, 0.6), s = 1 - 0.1 * off, Y = y => 420 + (y - 420) * s, a = 1 - ramp(t, 57.15, 0.3); g.save(); g.globalAlpha = a; C6.strike(g, -135 * s, Y(-468), 135 * s, Y(-492), ramp(t, 56.15, 0.4), '#FF4D4D', 6); g.restore(); }
  // 0:57 the real app (its screen, media) inside the phone; it scrolls gently; users pay it every month (cards)
  if (t > 57.2 && t < 61.75) {
    const a = ramp(t, 57.45, 0.35) * (1 - ramp(t, 61.4, 0.3)), fy = APP6.y(t), u = t - 57.5;
    g.save(); RR(g, -133, -150 + fy - 269, 266, 538, 32); g.clip(); mediaDraw(g, C6.im('app57_tela.jpg'), -133, -150 + fy - 269, 266, 538, { a, zoom: 1.02, panY: -0.9 + 1.8 * E.inOut(clamp(u / 3.5)), blur: 0.3, grain: 0.22, br: 1.05, sat: 1 }); g.restore();
    const src = APP6.src; PUL_APP.forEach((P, pl) => src.forEach(([sx, sy], k) => { const T0 = P + 0.06 * k, u2 = clamp((t - T0) / 0.6); if (u2 <= 0 || u2 >= 1) return; const q = E.inOut(u2);
      C6.pay(g, lerp(sx, 0, q), lerp(sy, 60, q) - 60 * Math.sin(Math.PI * q), lerp(0.5, 0.25, q), a * Math.sin(Math.PI * u2), 'ASSINATURA', 'R$ 29,90 · MÊS', '#3DDC84'); }));
  }
  // 1:04 the salaries: banknotes fly from the $ to each of the eight
  if (t > 64.8 && t < 66.3) TEAM_P.forEach(([tx, ty], k) => { for (let j = 0; j < 3; j++) { const T0 = 64.9 + k * 0.06 + j * 0.35, u = clamp((t - T0) / 0.6); if (u <= 0 || u >= 1) continue; const q = E.inOut(u); C6.bill(g, lerp(0, tx, q), lerp(10, ty - 40, q) - 60 * Math.sin(Math.PI * q), 0.45, 1.5 * q + k, Math.sin(Math.PI * u) * (1 - ramp(t, 66.0, 0.25))); } });
  // 1:10 the roles inside the phone, each in its own cell (clipped to the screen)
  if (t > 71.0 && t < 73.6) { const a = 1 - ramp(t, 73.3, 0.25); g.save(); RR(g, -166 * 1.15, -336 * 1.15 - 40, 332 * 1.15, 672 * 1.15, 40); g.clip();
    CELL6.forEach(([x, y], k) => { const q = inQ(t, k); if (q < 0.85) return; const b = ramp(q, 0.85, 0.15); g.globalAlpha = a * b * 0.5; g.strokeStyle = '#BBA3FF'; g.lineWidth = 2; RR(g, x - 86, y - 70, 172, 160, 14); g.stroke(); g.globalAlpha = 1;
      text(g, ROLES[k], x, y + 78, `700 15px 'JetBrains Mono'`, '#E6DEFF', a * b, 'center', 2); }); g.restore(); }
  // 1:18 the partners: Igor first; at "junto com Emmanuel" Igor slides aside and Emmanuel takes the frame, big (less blown out)
  if (t > 78.2 && t < 86.1) {
    const A = ramp(t, 78.4, 0.5) * (1 - ramp(t, 85.75, 0.3)), sw = E.inOut(ramp(t, 83.5, 0.6)), s1 = 0.95 + 0.05 * ramp(t, 78.4, 0.6, E.cubicOut);
    const iw = lerp(660 * s1, 380, sw), ix = lerp(-330 * s1, -500, sw), iy = lerp(-260, -60, sw);
    mediaDraw(g, seqImg('igor', t), ix, iy, iw, iw * 1.777, { a: A * lerp(1, 0.75, sw), fade: 0.55, fadeX: 0.16, blur: 0.4, grain: 0.3, sat: 0.8, br: 0.95 });
    const ea = A * ramp(t, 83.65, 0.45), ew = lerp(560, 720, E.cubicOut(ramp(t, 83.65, 0.8)));
    if (ea > 0.01) mediaDraw(g, seqImg('emm', t), -ew / 2 + 60, -330, ew, ew * 1.777, { a: ea, fade: 0.6, fadeX: 0.14, blur: 0.45, grain: 0.3, sat: 0.95, br: 0.98 });
  }
  // 1:45 the SALG revenue behind the stairs (the real print), and the subscription coming in every month
  if (false && t > 104.9 && t < 109.0) { const a = ramp(t, 105.0, 0.5) * (1 - ramp(t, 108.6, 0.3)), im = IMGS['print.jpg'], w = 250, h = Math.min(440, im ? w * im.height / im.width : 300); g.save(); g.shadowColor = 'rgba(77,141,255,0.6)'; g.shadowBlur = 34 * a; mediaQuad(g, im, panel3(-290, -300, 0, w, h, 0.25 + 0.08 * Math.sin(t * 0.6), 0.06), { a: a * 0.95, stroke: 'rgba(77,141,255,0.9)', br: 1.08, grain: 0.24 }); g.restore();
    C6.plate(g, 'TODO MÊS', -290, -300 + h / 2 + 40, 22, '#93BCFF', a * ramp(t, 105.6, 0.4), { mono: true, sp: 6 }); }
  // 2:47 the trap's TV plays the cat (AI video, media), LIVE in its corner
  if (false && t > 166.7 && t < 170.5) { const a = ramp(t, 166.85, 0.4) * (1 - ramp(t, 170.2, 0.3)), on = ramp(t, 166.9, 0.5); C6.screen(g, seqImg('gatinho', t), 0, -90, 612, 348, a, { on, grain: 0.3, r: 12 });
    if (on >= 1) { const bl = 0.6 + 0.4 * Math.sin(t * 7); g.save(); g.globalAlpha = a; g.fillStyle = '#E5242A'; RR(g, -290, -250, 118, 38, 19); g.fill(); g.fillStyle = `rgba(255,255,255,${bl})`; g.beginPath(); g.arc(-268, -231, 7, 0, 7); g.fill(); g.restore(); text(g, 'AO VIVO', -222, -231, `800 17px 'Inter'`, '#FFFFFF', a, 'center', 1); } }
  // 2:51 the week's novelty in the small screen, pulsing; my banknotes feed it
  if (false && t > 170.5 && t < 174.6) { const a = ramp(t, 170.6, 0.4) * (1 - ramp(t, 174.3, 0.25)), s = 1 + 0.025 * Math.sin(t * 5);
    C6.screen(g, C6.im('sem4.jpg'), 250, -290, 322 * s, 186 * s, a, { grain: 0.3, r: 8 });
    for (let k = 0; k < 10; k++) { const T0 = 171.3 + k * 0.28, u = clamp((t - T0) / 0.8); if (u <= 0 || u >= 1) continue; const q = E.inOut(u); C6.bill(g, lerp(180, 250, q), lerp(250, -200, q) - 50 * Math.sin(Math.PI * q), lerp(0.55, 0.25, q), 2 * q + k, a * Math.sin(Math.PI * u)); } }
  // 2:54 the lamp's glow each time it lights
  if (false && t > 174.5 && t < 181.0) { const lit = [175.9, 178.3, 179.65].reduce((s, T) => s + (t >= T ? Math.exp(-(t - T) * 1.6) : 0), 0); if (lit > 0.02) { g.save(); g.globalCompositeOperation = 'lighter'; const r = g.createRadialGradient(0, -330, 0, 0, -330, 260); r.addColorStop(0, `rgba(255,240,200,${0.35 * clamp(lit)})`); r.addColorStop(1, 'rgba(255,240,200,0)'); g.fillStyle = r; g.fillRect(-300, -630, 600, 600); g.restore(); } }
  // 3:01 the week: a check on each day kept, a red X on each day dropped
  if (t > 181.0 && t < 185.8) { const a = 1 - ramp(t, 185.55, 0.25); DAYS.forEach((_, k) => { const x = (k - 3) * 132; if (k < 4) C6.mark(g, x, -128, 0.8 * (0.8 + 0.2 * clamp(dropIn(t, DAY_AT[k], 0.3))), a * clamp(ramp(t, DAY_AT[k], 0.2)), true); else C6.mark(g, x, -128, 0.8, a * ramp(t, 185.42 + (k - 4) * 0.06, 0.15), false); }); }
  // 3:09 the tutorial in the big screen; at "construir" a red X over the box he never builds
  if (t > 190.6 && t < 194.0) { const on = dropIn(t, 190.85, 0.3), a = clamp(on) * (1 - ramp(t, 193.75, 0.25)), s = (0.8 + 0.2 * clamp(on)) * 1.18; mediaDraw(g, seqImg('tut', t), -320 * s, -250 - 180 * s, 640 * s, 360 * s, { a, r: 12, blur: 0.5, grain: 0.3, br: 1.0, sat: 0.9 });
    g.save(); g.globalAlpha = 1 - ramp(t, 193.75, 0.25); C6.strike(g, 220, 220, 380, 440, ramp(t, 193.0, 0.25), '#FF4D4D', 9); C6.strike(g, 380, 220, 220, 440, ramp(t, 193.18, 0.25), '#FF4D4D', 9); g.restore(); }
  // 3:37 where I am looking: a banknote glowing in the daylight of the cave
  if (false && t > 218.6 && t < 220.3) { const a = ramp(t, 218.9, 0.4) * (1 - ramp(t, 220.0, 0.25)); g.save(); g.shadowColor = '#3DDC84'; g.shadowBlur = 40 * a; C6.bill(g, 330, -150 + 8 * Math.sin(t * 2.2), 1.05, -0.12 + 0.05 * Math.sin(t * 1.7), a); g.restore(); }
  // 3:40 the feed: real YouTube covers in two columns, scrolling with the b-roll behind; grain; they dim and go
  if (t > 220.1 && t < 225.6) { const a = ramp(t, 220.2, 0.4) * (1 - ramp(t, 225.0, 0.5)), dim = ramp(t, 223.2, 0.6), sp = 300;
    for (let k = 0; k < 16; k++) { const col = k % 2, row = k >> 1, per = 8 * 230, y0 = -560 + row * 230 + (col ? 115 : 0), y = ((y0 - (t - 220.2) * sp) % per + per) % per - 620; if (y < -720 || y > 640) continue;
      mediaDraw(g, C6.im(`yt${k + 1}.jpg`), (col ? 30 : -400), y, 370, 208, { a: a * (1 - 0.45 * dim), r: 10, blur: 0.6, grain: 0.36, br: 1 - 0.3 * dim, sat: 1 - 0.5 * dim, gray: 0.6 * dim }); } }
  // 3:46 the chest opens: light and banknotes rise out of it
  if (t > 226.3 && t < 227.6) { const a = 1 - ramp(t, 227.3, 0.25), op = ramp(t, 226.3, 0.4); g.save(); g.globalCompositeOperation = 'lighter'; const r = g.createRadialGradient(0, 120, 0, 0, 120, 320); r.addColorStop(0, `rgba(120,255,170,${0.35 * op * a})`); r.addColorStop(1, 'rgba(120,255,170,0)'); g.fillStyle = r; g.fillRect(-320, -170, 640, 640); g.restore();
    for (let k = 0; k < 7; k++) { const u = clamp((t - 226.45 - k * 0.06) / 0.7); if (u <= 0) continue; C6.bill(g, (k - 3) * 60 * u, 120 - 300 * E.cubicOut(u), 0.55, (k - 3) * 0.2 * u, a * clamp(u * 3)); } }
  g.setTransform(1, 0, 0, 1, 0, 0);
}


// ═════════════════════════ v7 — os ajustes do Igor de 23/10 (sobre a v3 juntada). A última definição vence.
// The narrator: a longer fade-out that starts earlier (L-cut: his voice goes on, he leaves first; he no longer reaches for the camera
// on screen); the next scene starts forming under him.
NARR.forEach(w => { if (w[1] < 900) w[1] -= 0.3; });
KEYS.forEach(k => { if (k.s === 'void') return; const w = NARR.find(([a, b]) => Math.abs(k.t - (b + 0.3)) < 0.36); if (w) k.t = w[1] - 0.05; });
PLAY.push(['scrollinsta', 7.3, 9.9, 0, true]);
// the seam into Parte 2: he leaves on his last word and the opening b-roll of Parte 2 is already running under him, frame-locked to it
NARR.forEach(w => { if (w[1] > 900) w[1] = 244.95; }); PLAY.push(['b406', 244.7, 246.6, 0.35, true]);
// the small group around a table, building: a light-blue crew (outside the crowd), leaning over a laptop table, a hologram of what
// they build floating above it; returns points (s = scale, around cx, cy)
function tableGroup(cx, cy, s, seed, poses, o = {}) {
  const pts = [];
  art(g => { // the table (iso ellipse top + an edge), three laptops on it
    g.fillStyle = LG(g, -330, -90, 330, 90, [[0, tone(WT, 0.75)], [1, tone(WT, 0.4)]]); g.beginPath(); g.ellipse(0, 0, 330, 95, 0, 0, 7); g.fill();
    g.fillStyle = tone(WT, 0.28); g.beginPath(); g.ellipse(0, 22, 330, 95, 0, 0, Math.PI); g.lineTo(-330, 0); g.fill();
    [[-150, -10], [0, -32], [150, -10]].forEach(([x, y]) => { g.fillStyle = tone(WT, 0.9); poly(g, [[x - 55, y + 10], [x + 55, y + 10], [x + 68, y + 30], [x - 68, y + 30]]); g.fill(); g.fillStyle = tone(BL, 0.95); poly(g, [[x - 50, y + 8], [x + 50, y + 8], [x + 42, y - 52], [x - 42, y - 52]]); g.fill(); });
  }, s, cx, cy, { seed, cell: 4, nosort: true }).forEach(p => pts.push({ ...p, tbl: 1 }));
  const SEATS = [[-300, -70, 'front'], [-110, -110, 'front'], [110, -110, 'front'], [300, -70, 'front'], [-230, 110, 'back'], [0, 135, 'back'], [230, 110, 'back']];
  SEATS.forEach(([x, y, view], k) => manT(0.5, seed + 10 + k, { view, x: cx + x * s, y: cy + y * s - 20 * s, k: 0.82 * s, base: 0, pose: poses[k % poses.length] }).forEach(p => pts.push({ ...p, gp: k, tint7: o.tint ?? BLUE })));
  return pts;
}
const holo = (cx, cy, s) => art(g => { g.strokeStyle = tone(BL, 1); g.lineWidth = 6; poly(g, [[-90, 60], [-90, -20], [0, -90], [90, -20], [90, 60]]); g.stroke(); g.strokeRect(-25, 10, 50, 50); g.beginPath(); g.moveTo(-90, -20); g.lineTo(90, -20); g.stroke(); }, s, cx, cy, { seed: 7701, cell: 4 }).map(p => ({ ...p, ho: 1 }));

function buildShapesV7() {
  // 0:08 only the b-roll (no ASCII phone)
  SH.feed = makeShape([]);
  // 0:22–0:25 "um grupo pequeno, sem ser expert em tecnologia" — the crew around a table, light blue, building; the crowd behind, grey, looking the other way
  {
    const ring = crowd3Pts(BRAWL3.map(([R, a]) => [R * Math.cos(a), BRZ + 1.2 + R * Math.sin(a) * 0.9]), false).map(p => ({ ...p, R: BRAWL3[p.pk][0], a0: BRAWL3[p.pk][1] }));
    const grp = tableGroup(0, 250, 1, 7600, ['plan', 'type', 'point', 'plan', 'type', 'present', 'type']), ho = holo(0, 60, 0.9);
    const code = tagged(art(textArt('</>', 150, WT), 1, 0, -430, { seed: 660, cell: 4 }), { code: 1 });
    SH.group = makeShape([hsort(grp), ho, hsort(ring), code], (t, i, p, b) => {
      if (p.tbl) { const on = ramp(t, 22.8, 0.5); b.a[i] = p.a * clamp(on, 0.02); return; }
      if (p.gp !== undefined) { const st = ramp(t, 22.85 + p.gp * 0.07, 0.5, E.cubicOut); b.y[i] += 40 * (1 - st); b.a[i] = Math.min(1, p.a * 1.1) * clamp(st * 2, 0.02); if (hash(i, 3) < 0.55) b.t[i] = p.tint7; return; }
      if (p.ho) { const on = ramp(t, 23.4, 0.6); b.a[i] = p.a * clamp(on, 0.02) * (0.7 + 0.3 * Math.sin(t * 5)); b.y[i] += 6 * Math.sin(t * 2); b.t[i] = BLUE; return; }
      if (p.code) { const on = dropIn(t, 23.85, 0.3); b.a[i] = p.a * clamp(on, 0.02); if (hash(i, 7) < ramp(t, 24.3, 0.4)) { b.t[i] = GRAY; b.a[i] *= 0.65; } return; }
      const rot = 0.13 * (t - 20.1), sink = ramp(t, 22.8, 1.2, E.inOut), [px, py, m] = ORB(p.R, p.a0 + rot, lerp(70, -170, sink), lerp(1, 0.55, sink));
      b.x[i] = px + p.rx * m; b.y[i] = py + p.ry * m; b.s[i] = p.s * clamp(m * 1.1, 0.4, 2); b.t[i] = GRAY; b.a[i] = p.a * lerp(0.6, 0.22, sink);
    });
  }
  // 0:25–0:29 the same crew (smaller, at the bottom) builds with the IA
  {
    const grp = tableGroup(0, 350, 0.62, 7650, ['type', 'type', 'point', 'type', 'plan', 'present', 'plan']);
    const IAY = -400, ia = tagged(art(textArt('IA', 210, BL), 1, 0, IAY, { seed: 670, cell: 4, h: 1300 }), { ia: 1 });
    const st = buildPts(14000, 71).map(p => ({ ...p, y: p.y - 10, a: p.a * 0.82 }));
    const thread = [...Array(700)].map((_, k) => ({ th: k, x: 0, y: -330, a: 0.02, c: pick('|:·•', hash(k, 2)), t: BLUE, s: 0.4 + 0.3 * hash(k, 3) }));
    SH.build = makeShape([hsort(grp), ia, hsort(st), thread], (t, i, p, b) => {
      if (p.tbl) return; if (p.gp !== undefined) { if (hash(i, 3) < 0.55) b.t[i] = p.tint7; b.a[i] = Math.min(1, p.a * 1.1); return; }
      if (p.ia) { const on = ramp(t, 26.85, 0.35, E.backOut), s = 0.8 + 0.2 * clamp(on); b.t[i] = BLUE; b.a[i] = p.a * clamp(on, 0.02) + 0.3 * flash(t, 27.0, 0.15); b.x[i] = p.x * s; b.y[i] = IAY + (p.y - IAY) * s; return; }
      if (p.th !== undefined) { if (t < 27.25 || t > 28.95) { b.a[i] = 0.02; return; } const u = (hash(p.th, 4) + (t - 27.25) * 1.5) % 1; b.x[i] = (hash(p.th, 5) - 0.5) * (30 + 180 * u); b.y[i] = -330 + 90 * u; b.a[i] = Math.max(0.02, 0.85 * Math.sin(Math.PI * u)); return; }
      const at = 27.55 + p.block * 0.13, q = dropIn(t, at); b.y[i] = p.y - 70 * (1 - q); b.a[i] = p.a * clamp((t - at) / 0.12, t < 26.75 ? 0.03 : 0); b.t[i] = CLAUDE; b.a[i] += 0.12 * flash(t, 28.75, 0.25);
    });
  }
  // 1:06–1:10 "quase 6 mil reais" — the number is crisp lettering (overlay), the ASCII steps back
  SH.price = makeShape([]);
  // 1:32–1:36 "sem IA… uma equipe inteira" — the system in a laptop, centred and big; the team at their laptops in two arcs, working
  {
    const ia = tagged(art(textArt('IA', 170, WT), 1, 0, -520, { seed: 811, cell: 4, h: 1400 }), { ia: 1 });
    const devs = []; for (let k = 0; k < 12; k++) { const side = k < 6 ? -1 : 1, j = k % 6, x = side * (330 + 70 * Math.sin(j / 5 * Math.PI)), y = -260 + j * 120; devs.push(...bustAt(BUSTD_T, x, y + 40, k, { rgPose: j % 3 === 1 ? 'talk' : 'type' })); art(laptopArt(x, y + 86, 0.42), 1, 0, 0, { seed: 813 + k, cell: 4, nosort: true }).forEach(p => devs.push({ ...p, bk: k, bx: x, by: y })); }
    SH.noai = makeShape([ia, hsort(devs)], (t, i, p, b) => {
      if (p.ia) { b.t[i] = RED; b.a[i] = Math.min(1, p.a * 1.3) + 0.3 * flash(t, 92.9, 0.2); return; }
      popAt(t, i, p, b, 95.15 + p.bk * 0.04, p.bx, p.by); b.t[i] = WHITE; b.a[i] = Math.min(1, b.a[i] * 1.3);
    });
  }
  // 1:45–1:49 the stairs: no revenue print here (it is not ours); a green chart climbs behind instead
  // (the chart is an overlay; the scene itself stays)
  // 2:03–2:08 the eyes: the iris moves inside the eye only, smoothly
  {
    const DL = [0, -440], lids = [], iris = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) { const x = (c - 1) * 320, y = -60 + r * 230, k = r * 3 + c;
      dotArt(lidArt(0, 0), 0.78, x, y, { seed: 890 + k, cell: 3, nosort: true }).forEach(p => lids.push({ ...p, ek: k })); dotArt(irisArt(0, 0), 0.78, x, y, { seed: 910 + k, cell: 3, nosort: true }).forEach(p => iris.push({ ...p, ex: x, ey: y })); }
    const dl = tagged(art(textArt('$', 210, GN), 1, DL[0], DL[1], { seed: 930 }), { dl: 1 });
    const dlx = t => 300 * Math.sin((t - 124.5) * 1.6) * ramp(t, 124.5, 0.6);
    SH.eyes = makeShape([hsort(lids), hsort(iris), dl], (t, i, p, b) => {
      if (p.dl) { b.t[i] = GREEN; b.x[i] = p.x + dlx(t); b.a[i] = p.a + 0.4 * flash(t, 126.85, 0.2); return; }
      if (p.ex !== undefined) { const look = ramp(t, 124.0, 0.5, E.inOut), tx = DL[0] + dlx(t) - p.ex, ty = DL[1] - p.ey, d = Math.hypot(tx, ty), mx = 24 * look * tx / d, my = 14 * look * ty / d;
        const x = p.x + mx, y = p.y + my, ux = (x - p.ex) / (125 * 0.78), uy = (y - p.ey) / (70 * 0.78); b.x[i] = x; b.y[i] = y; if (ux * ux + uy * uy > 1) b.a[i] = 0.02; }
      b.a[i] = Math.min(1, b.a[i] * 1.15);
    });
  }
  // 2:16–2:22 the brain: the real brain photo read in our ASCII; each book that hits it fills it a step more (blue = knowledge)
  {
    const BR = [-60, -110], brain = tagged(art(g => { const im = C6.im('cerebro.png'); if (im) { g.filter = 'brightness(1.75) contrast(1.15)'; g.drawImage(im, -330, -330, 660, 660); g.filter = 'none'; } }, 1, BR[0], BR[1], { seed: 960, h: 1100, min: 0.12 }), { br: 1 });
    const COLS = ['#4D8DFF', '#3DDC84', '#FF9B55', '#A68BFF', '#FF5A52', '#F6E3C2', '#4D8DFF', '#FF9B55', '#3DDC84', '#A68BFF'], books = [];
    COLS.forEach((hex, k) => art(C6.book(hex), 0.9, 0, 0, { seed: 961 + k, cell: 4, nosort: true }).forEach(p => books.push({ ...p, bk6: k, lx: p.x, ly: p.y })));
    const dl = tagged(art(textArt('$', 200, RD), 1, 340, 230, { seed: 975 }), { dl: 1 });
    const HIT = k => 137.0 + k * 0.38 + 0.75, level = t => [...Array(10).keys()].filter(k => t >= HIT(k)).length / 10;
    SH.learn = makeShape([hsort(brain), books, dl], (t, i, p, b) => {
      if (p.dl) { const on = dropIn(t, 141.55, 0.3); b.t[i] = RED; b.a[i] = Math.max(0.02, p.a * (0.35 + 0.65 * clamp(on))) + 0.3 * flash(t, 142.35, 0.2); b.x[i] = p.x + 8 * Math.sin(t * 40) * flash(t, 142.35, 0.25); return; }
      if (p.bk6 !== undefined) { const T0 = 137.0 + p.bk6 * 0.38, u = clamp((t - T0) / 0.75); if (u <= 0 || u >= 1) { b.a[i] = 0.02; return; }
        const side = p.bk6 % 2 ? 1 : -1, sx = side * 560, sy = -480 + 100 * hash(p.bk6, 3), tx = BR[0] + 40, ty = BR[1] - 150, q = E.inOut(u), s = lerp(1, 0.15, q * q), rot = side * 2.2 * q;
        const x = lerp(sx, tx, q), y = lerp(sy, ty, q) - 140 * Math.sin(Math.PI * q), c = Math.cos(rot), sn = Math.sin(rot); b.x[i] = x + (p.lx * c - p.ly * sn) * s; b.y[i] = y + (p.lx * sn + p.ly * c) * s; b.a[i] = p.a * Math.min(1, 4 * (1 - u)); return; }
      const lvl = level(t), fillY = BR[1] + 300 - 600 * lvl, lit = p.y > fillY, hit = Math.max(...[...Array(10).keys()].map(k => flash(t, HIT(k), 0.1)));
      b.t[i] = lit ? (hash(i, 6) < 0.75 ? BLUE : WHITE) : GRAY; b.a[i] = Math.min(1, p.a * (lit ? 1.15 : 0.6)) + 0.35 * hit * (lit ? 1 : 0.3);
      const sw = 1 + 0.012 * Math.sin(t * 2) + 0.025 * hit; b.x[i] = BR[0] + (p.x - BR[0]) * sw; b.y[i] = BR[1] + (p.y - BR[1]) * sw;
    });
  }
  // 2:46–2:55 the trap TV and the hourglass: someone on a sofa, stuck watching (the cat video, then the week's novelty, both inside the TV)
  {
    const TV = [-140, -260], tv = tagged(art(C6.tvArt(540, 304), 1, TV[0], TV[1], { seed: 1010 }), { tv: 1 });
    const sofa = tagged(art(g => { g.fillStyle = LG(g, -180, -60, 180, 80, [[0, tone(WT, 0.7)], [1, tone(WT, 0.35)]]); RR(g, -170, 0, 340, 70, 18); g.fill(); RR(g, 110, -150, 70, 220, 22); g.fill(); RR(g, -190, -40, 50, 110, 16); g.fill(); g.fillStyle = tone(WT, 0.5); g.fillRect(-150, 70, 16, 40); g.fillRect(140, 70, 16, 40); }, 1, 240, 300, { seed: 1012, cell: 4 }), { sf: 1 });
    const viewerSide = manT(1, 1013, { view: 'side', k: 0.62, base: 0, x: 250, y: 365, pose: t => t < 170.4 ? MAN_POSES.sit(t) : MAN_POSES.sitPhone(t) }).map(p => ({ ...p, vw: 1 }));
    const HG = [-390, 260], frame = tagged(dotArt(hgFrame, 0.4, HG[0], HG[1], { seed: 1020, cell: 4 }), { hg: 1 }), sand = tagged(dotArt(hgSand, 0.4, HG[0], HG[1], { seed: 1021, cell: 4 }), { sand: 1 });
    const dyn = (show) => (t, i, p, b) => {
      if (p.vw) { b.x[i] = 2 * 250 - b.x[i]; b.a[i] = Math.min(1, p.a * 1.15); if (t > 173.65 && ramp(t, 173.65, 0.4) * 0.6 > hash(i, 4)) b.t[i] = RED; return; } // faces the TV (mirrored)
      if (p.hg || p.sand) { if (!show) { b.a[i] = 0.02; return; } if (p.sand) { const u = ramp(t, 170.6, 3.6, E.lin), ly = (p.y - HG[1]) / 0.4, on = ly < 0 ? ly > -270 + 262 * u : ly > 292 - 250 * u; b.a[i] = on ? p.a : 0.02; b.t[i] = CREAM; } return; }
      if (p.tv) { b.a[i] = p.a + 0.15 * Math.sin(t * 9) * 0.3; return; }
    };
    SH.showman = makeShape([tv, sofa, viewerSide, frame, sand], dyn(false));
    SH.watch = makeShape([tv, sofa, viewerSide, frame, sand], dyn(true));
    TRAP7.tv = TV;
  }
  // 2:54–3:01 the loop: he builds (in profile); the lamp blinks a soft yellow with NOVO; he turns to it, looks up, the blocks fall; again, and again
  {
    const BLINK = [176.05, 178.05, 179.75], lp = tagged(dotArt(loopArt, 0.95, 0, 40, { seed: 1031 }), { lp: 1 }), lamp = tagged(art(C6.lamp, 0.8, 0, -330, { seed: 1035, cell: 4 }), { lm: 1 });
    const blocks = []; for (let k = 0; k < 3; k++) art(g => cube(g, 0, 0, 40, 0.92), 1, 110, 260 - k * 62, { seed: 1036 + k, cell: 4, nosort: true }).forEach(p => blocks.push({ ...p, bl6: k }));
    const turned = t => BLINK.some(T => t >= T && t < T + 0.7);
    const side = manT(0.48, 1037, { view: 'side', x: -40, y: 140, pose: 'hammer' }).map(p => ({ ...p, sd: 1 })), front = manT(0.48, 1038, { view: 'front', x: -40, y: 140, pose: 'point' }).map(p => ({ ...p, fr: 1 }));
    const tag = tagged(art(novoTag(0.7), 1, 0, -480, { seed: 1034, cell: 4 }), { tg: 1 });
    SH.loopx = makeShape([lp, lamp, blocks, side, front, tag], (t, i, p, b) => {
      if (p.lp) { const a = 1.2 * (t - 174.5) + 2.6 * Math.max(0, t - 177.7); rot(b, i, p, 0, 40, a); b.a[i] = p.a * 0.5; return; }
      if (p.lm) { const lit = BLINK.reduce((s, T) => s + (t >= T ? Math.exp(-(t - T) * 2.2) * (0.6 + 0.4 * Math.abs(Math.sin((t - T) * 18))) : 0), 0); b.t[i] = lit > 0.2 && hash(i, 2) < 0.8 ? GOLD : WHITE; b.a[i] = Math.min(1, p.a * (0.55 + 0.6 * clamp(lit))); return; }
      if (p.tg) { const k = BLINK.filter(T => t >= T).length; if (!k) { b.a[i] = 0.02; return; } const T = BLINK[k - 1]; popAt(t, i, p, b, T, 0, -480, 0.25, 0.6); b.a[i] *= 1 - 0.85 * ramp(t, T + 0.8, 0.3) * (k < 3 ? 1 : 0); return; }
      if (p.bl6 !== undefined) { const lap = BLINK.filter(T => t >= T + 0.05).length, T0 = [174.7, BLINK[0] + 0.75, BLINK[1] + 0.75][Math.min(lap, 2)], Tf = BLINK[Math.min(lap, 2)];
        const on = ramp(t, T0 + p.bl6 * 0.4, 0.25, E.backOut), fall = t >= Tf ? ramp(t, Tf + 0.05, 0.45, E.quadIn) : 0; b.y[i] = p.y - 40 * (1 - clamp(on)) + 260 * fall; b.x[i] = p.x + 60 * fall * (p.bl6 - 1); b.a[i] = p.a * clamp(on, 0.02) * (1 - fall); b.t[i] = CLAUDE; return; }
      const tn = turned(t); if ((p.sd && tn) || (p.fr && !tn)) { b.a[i] = 0.02; return; } b.a[i] = Math.min(1, p.a * 1.15);
    });
  }
  // 3:01–3:05 the week: he jumps at each day kept, then slumps when it breaks
  {
    const tiles = []; DAYS.forEach((_, k) => { const x = (k - 3) * 132; art(tileArt(x, false), 1, 0, 0, { seed: 1040 + k, cell: 4, nosort: true }).forEach(p => tiles.push({ ...p, dy: k })); if (k < 4) art(tileArt(x, true), 1, 0, 0, { seed: 1050 + k, cell: 4, nosort: true }).filter(p => p.t === ORANGE).forEach(p => tiles.push({ ...p, dfill: k })); });
    const pose = t => { if (t >= 185.42) return mixPose(MAN_POSES.cheer(t), MAN_POSES.sad(t), ramp(t, 185.42, 0.4)); const hop = Math.max(...DAY_AT.map(T => Math.exp(-(((t - T - 0.15) / 0.18) ** 2)))); return { ...MAN_POSES.cheer(t), dy: -40 * hop }; };
    const me = bustAt(B45, 0, 360, 0, { rgPose: pose });
    SH.start = makeShape([hsort(tiles), hsort(me)], (t, i, p, b) => {
      const broke = ramp(t, 185.42, 0.4);
      if (p.dfill !== undefined) { const on = ramp(t, DAY_AT[p.dfill], 0.18, E.backOut); b.a[i] = Math.max(0.02, p.a * clamp(on)) * (1 - 0.5 * broke); b.t[i] = GREEN; return; }
      if (p.dy !== undefined) { b.a[i] = p.a * (t < 183.3 ? 0.5 + 0.35 * Math.abs(Math.sin(t * 2.5)) : 0.9); if (p.dy >= 4 && broke > 0.5) b.t[i] = RED; return; }
      b.t[i] = broke > 0.5 ? GRAY : WHITE;
    });
  }
  // 3:37–3:40 where I look: a closed chest in the light, the key in my hand — what nobody else noticed
  {
    const crowd = []; for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) crowd.push(...bustAt(BUSTD_T, -470 + c * 62 + (r % 2) * 20, -20 + r * 80, r * 6 + c, { rgPose: 'scroll' }));
    const me = FULL_T.map(p => ({ ...p, rsc: 0.7, x: p.x * 0.7 + 150, y: p.y * 0.7 + 260, s: p.s * 0.9, me5: 1, rgPose: 'present' }));
    const chestB = tagged(art(C6.chestBase, 0.75, 330, -120, { seed: 1112, cell: 4 }), { cb: 1 }), chestL = tagged(art(C6.chestLid, 0.75, 330, -128, { seed: 1113, cell: 4 }), { cb: 1 });
    const key = tagged(art(C6.keyArt, 0.38, 225, 105, { seed: 1114, cell: 4 }), { ky: 1 });
    const sight = [...dotted(-300, 60, -330, -230, 40, { s1: 1 }, GRAY), ...dotted(180, 150, 300, -60, 40, { s2: 1 })];
    SH.look = makeShape([hsort(crowd), me, chestB, chestL, key, sight], (t, i, p, b) => {
      if (p.s1) { b.a[i] = p.a * clamp(ramp(t, 217.5, 0.4), 0.02); return; }
      if (p.s2) { b.a[i] = p.a * clamp(ramp(t, 218.9, 0.5), 0.02); return; }
      if (p.cb) { const on = ramp(t, 218.6, 0.5); b.a[i] = Math.min(1, p.a * 1.2) * clamp(on, 0.02) + 0.25 * flash(t, 219.4, 0.3); b.t[i] = p.v > 0.8 ? GOLD : CHOCO; b.y[i] += 5 * Math.sin(t * 2); return; }
      if (p.ky) { b.t[i] = GOLD; b.a[i] = Math.min(1, p.a * 1.3) + 0.3 * flash(t, 219.4, 0.3); b.y[i] += 4 * Math.sin(t * 3); return; }
      if (p.me5) { b.a[i] = Math.min(1, p.a * 1.1); return; }
      if (p.bk !== undefined) { b.t[i] = WHITE; b.a[i] = p.a * 0.9; }
    });
  }
  // 3:53–4:00 the small group again, now as architects: light blue, around the blueprint table, each doing something different
  {
    const ia = tagged(art(textArt('IA', 230, BL), 1, 0, -380, { seed: 1190, h: 1300 }), { ia: 1 });
    const crowd = crowd3Pts(CROWD3.filter((_, k) => k >= 9), false);
    const grp = tableGroup(0, 330, 0.75, 7700, ['present', 'plan', 'point', 'type', 'plan', 'present', 'type'], { tint: OWNB }), ho = holo(0, 190, 0.6);
    SH.repeat = makeShape([ia, hsort(crowd), hsort(grp), ho], (t, i, p, b) => {
      if (p.ia) { const on = ramp(t, 233.6, 0.4); b.t[i] = BLUE; b.a[i] = Math.min(1, p.a * 1.15) * clamp(on, 0.02) + 0.3 * flash(t, 233.8, 0.2); return; }
      if (p.tbl) { b.a[i] = p.a * clamp(ramp(t, 236.8, 0.5), 0.02); return; }
      if (p.gp !== undefined) { const on = ramp(t, 237.0 + p.gp * 0.06, 0.4, E.backOut); b.y[i] += 30 * (1 - clamp(on)); b.a[i] = Math.min(1, p.a * 1.2) * clamp(on * 2, 0.02); if (hash(i, 3) < 0.6) b.t[i] = p.tint7; return; }
      if (p.ho) { b.a[i] = p.a * clamp(ramp(t, 238.4, 0.5), 0.02) * (0.7 + 0.3 * Math.sin(t * 5)); b.t[i] = BLUE; b.y[i] += 5 * Math.sin(t * 2); return; }
      const d = place3(b, i, p, repCam(t), 6 * ramp(t, 235.3, 0.5)), far = 0.45 + 0.55 * clamp(2.2 / d - 0.15), near = clamp((d - 0.25) / 0.35);
      b.t[i] = WHITE; b.a[i] = Math.min(1, p.a * far * near * (1.05 - 0.45 * ramp(t, 236.6, 0.6)));
    });
  }
}
const TRAP7 = {};
function buildShapes() { buildShapesHook(); buildShapesB(); buildShapesV5(); buildShapesV6(); buildShapesV7(); }

// ───────────────────────── v7 media and overlays
function drawMediaBG(g, t) {
  if (t > 244.7) { drawMediaBG6(g, t); mediaDraw(g, seqImg('b406', t), 0, 0, W, H, { a: 0.9 * ramp(t, 244.75, 0.3), br: 0.78, blur: 0.8, grain: 0.3, sat: 0.85 }); return; }
  if (!(t > 7.3 && t < 9.9)) return drawMediaBG6(g, t);
  drawMediaBG5(g, t); const a = ramp(t, 7.4, 0.3) * (1 - ramp(t, 9.6, 0.35)); if (a > 0.01) mediaDraw(g, seqImg('scrollinsta', t), 0, 0, W, H, { a: a, blur: 0.4, grain: 0.28, br: 1.35, sat: 0.95 });
  if (t > 9.4) { const a2 = 0.4 * ramp(t, 9.5, 0.4); mediaDraw(g, seqImg('scrollinsta', t), 0, 0, W, H, { a: a2, blur: 1.1, grain: 0.32, br: 0.8, sat: 0.75 }); }
}
function drawMediaWorld(g, t, M) {
  drawMediaWorld6(g, t, M);
  g.setTransform(M[0], M[1], M[2], M[3], M[4], M[5]);
  // 1:08 R$ 6.000: crisp, bright, counted up, with a hit
  if (t > 68.2 && t < 70.0) { const on = ramp(t, 68.45, 0.35, E.backOut), v = Math.round(6000 * E.cubicOut(ramp(t, 68.45, 0.55))), a = clamp(on * 1.5) * (1 - ramp(t, 69.75, 0.25)), sh = 9 * flash(t, 69.0, 0.15);
    g.save(); g.globalAlpha = a; g.translate(sh * Math.sin(t * 80), 0); g.font = `900 ${Math.round(200 * (1.25 - 0.25 * clamp(on)))}px 'Inter'`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = 'rgba(255,60,50,0.9)'; g.shadowBlur = 50;
    g.fillStyle = '#FF4D45'; g.fillText('R$ ' + v.toLocaleString('pt-BR'), 0, -160); g.shadowBlur = 0; g.fillStyle = '#FFFFFF'; g.font = `800 46px 'Inter'`; g.letterSpacing = '8px'; g.fillText('POR MÊS', 0, -20); g.letterSpacing = '0px'; g.restore(); }
  // 1:26–1:33 the SALG inside a laptop: first the landing scrolling, then the real screens changing, the laptop turning slowly
  if (t > 85.8 && t < 92.7) {
    const A = ramp(t, 85.9, 0.45) * (1 - ramp(t, 92.4, 0.3)), en = E.cubicOut(ramp(t, 85.9, 1.0)), ry = lerp(0.9, -0.22, en) + 0.12 * Math.sin((t - 86) * 0.6), x = lerp(420, 0, en), w = 860;
    const SL = [['salg_dash.jpg', 88.1], ['salg_criativos.jpg', 89.2], ['salg_funil2.jpg', 90.2], ['salg_ranking.jpg', 91.15], ['salg_crm.jpg', 92.0]];
    if (t < 88.4) C6.laptop(g, C6.im('salg_scroll_top.jpg'), x, -120, w, ry, A * (1 - ramp(t, 88.1, 0.3)), { win: lerp(0, 1150, E.inOut(ramp(t, 86.1, 2.0, E.lin))), glow: 'rgba(166,139,255,0.45)' });
    for (let k = 0; k < SL.length; k++) { const [n, T] = SL[k], T1 = k + 1 < SL.length ? SL[k + 1][0] && SL[k + 1][1] : 99, a = ramp(t, T, 0.3) * (1 - ramp(t, T1, 0.3)); if (a < 0.01) continue;
      const sl = (1 - E.cubicOut(ramp(t, T, 0.45))) * 120; C6.laptop(g, C6.im(n), x + sl, -120, w, ry, A * a, { glow: 'rgba(166,139,255,0.45)' }); }
    const lb = SL.findIndex(([_, T], k) => t >= T && (k + 1 >= SL.length || t < SL[k + 1][1])); if (lb >= 0) C6.plate(g, ['PAINEL DE LUCRO', 'CRIATIVOS', 'FUNIL', 'RANKING', 'CRM'][lb], 0, 260, 24, '#BBA3FF', A * ramp(t, SL[lb][1], 0.25), { mono: true, sp: 5 });
  }
  // 1:32–1:36 the system without IA: the laptop centred, big
  if (t > 92.6 && t < 97.0) { const a = ramp(t, 92.7, 0.4) * (1 - ramp(t, 96.55, 0.3)); C6.laptop(g, C6.im('salg_dash.jpg'), 0, -80, 560, -0.12 + 0.08 * Math.sin(t * 0.8), a, { glow: 'rgba(255,90,82,0.4)' }); }
  // 1:40–1:45 the SALG by subscription: the laptop above; each payment that lands adds to the monthly revenue, which ticks up
  if (t > 100.9 && t < 105.1) { const a = ramp(t, 101.0, 0.5) * (1 - ramp(t, 104.75, 0.3)); C6.laptop(g, C6.im('salg_dash.jpg'), 0, -250, 560, 0.1 * Math.sin(t * 0.7), a, { glow: 'rgba(61,220,132,0.45)' });
    let n = 0, last = -9; PAY_AT.forEach((P, j) => { for (let k = 0; k < 7; k++) { const T = P + k * 0.05 + 0.2 * hash(k, j) + 0.7; if (t >= T) { n++; last = Math.max(last, T); } } });
    const v = n * 97.9, pop = Math.exp(-Math.max(0, t - last) * 6) * (last > 0 ? 1 : 0);
    g.save(); g.globalAlpha = a; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `600 20px 'JetBrains Mono'`; g.fillStyle = '#93BCFF'; g.letterSpacing = '5px'; g.fillText('RECEITA RECORRENTE', 0, -540); g.letterSpacing = '0px';
    g.font = `900 ${Math.round(64 * (1 + 0.12 * pop))}px 'Inter'`; g.shadowColor = '#3DDC84'; g.shadowBlur = 16 + 40 * pop; g.fillStyle = '#5BE39A'; g.fillText('R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 0, -480); g.restore(); }
  // 1:45–1:49 a green chart that keeps climbing behind the stairs (our numbers' direction, not someone else's print)
  if (t > 104.9 && t < 109.0) { const a = ramp(t, 105.0, 0.5) * (1 - ramp(t, 108.6, 0.3)), u = ramp(t, 105.1, 3.2, E.lin), P = [...Array(13)].map((_, k) => [-500 + k * 46, -150 - 300 * Math.pow(k / 12, 1.6) - 25 * Math.sin(k * 1.7) * (k % 3 ? 1 : -0.4)]);
    g.save(); g.globalAlpha = a; g.strokeStyle = 'rgba(255,255,255,0.14)'; g.lineWidth = 1.5; for (let r = 0; r < 4; r++) { g.beginPath(); g.moveTo(-510, -150 - r * 100); g.lineTo(60, -150 - r * 100); g.stroke(); }
    const n = 1 + u * 12, k0 = Math.floor(n); g.strokeStyle = '#3DDC84'; g.lineWidth = 7; g.shadowColor = '#3DDC84'; g.shadowBlur = 20; g.beginPath(); for (let k = 0; k <= Math.min(12, k0); k++) k ? g.lineTo(...P[k]) : g.moveTo(...P[k]);
    if (k0 < 12) { const f = n - k0; g.lineTo(lerp(P[k0][0], P[k0 + 1][0], f), lerp(P[k0][1], P[k0 + 1][1], f)); } g.stroke(); g.restore();
    C6.plate(g, 'TODO MÊS', -230, -560, 22, '#5BE39A', a * ramp(t, 105.6, 0.4), { mono: true, sp: 6 }); }
  // 2:46–2:55 inside the TV: the cat (AI video), then the week's novelty pulsing; banknotes from the viewer feed it
  if (t > 166.7 && t < 174.6) { const TV = TRAP7.tv || [-140, -260], A = ramp(t, 166.85, 0.35) * (1 - ramp(t, 174.3, 0.3)), on = ramp(t, 166.9, 0.5);
    if (t < 170.55) { C6.screen(g, seqImg('gatinho', t), TV[0], TV[1], 528, 292, A * (1 - ramp(t, 170.3, 0.25)), { on, grain: 0.3, r: 10 });
      if (on >= 1) { const bl = 0.6 + 0.4 * Math.sin(t * 7); g.save(); g.globalAlpha = A; g.fillStyle = '#E5242A'; RR(g, TV[0] - 254, TV[1] - 136, 118, 38, 19); g.fill(); g.fillStyle = `rgba(255,255,255,${bl})`; g.beginPath(); g.arc(TV[0] - 232, TV[1] - 117, 7, 0, 7); g.fill(); g.restore(); text(g, 'AO VIVO', TV[0] - 186, TV[1] - 117, `800 17px 'Inter'`, '#FFFFFF', A, 'center', 1); } }
    else { const s = 1 + 0.02 * Math.sin(t * 5); C6.screen(g, C6.im('sem4.jpg'), TV[0], TV[1], 528 * s, 292 * s, A * ramp(t, 170.45, 0.25), { grain: 0.3, r: 10 });
      for (let k = 0; k < 10; k++) { const T0 = 171.3 + k * 0.28, u = clamp((t - T0) / 0.8); if (u <= 0 || u >= 1) continue; const q = E.inOut(u); C6.bill(g, lerp(220, TV[0] + 80, q), lerp(200, TV[1] + 60, q) - 70 * Math.sin(Math.PI * q), lerp(0.55, 0.25, q), 2 * q + k, A * Math.sin(Math.PI * u)); } } }
  // 2:54 the lamp's soft yellow glow at each blink
  if (t > 174.5 && t < 181.0) { const lit = [176.05, 178.05, 179.75].reduce((s, T) => s + (t >= T ? Math.exp(-(t - T) * 2.2) : 0), 0); if (lit > 0.02) { g.save(); g.globalCompositeOperation = 'lighter'; const r = g.createRadialGradient(0, -360, 0, 0, -360, 260); r.addColorStop(0, `rgba(255,226,140,${0.32 * clamp(lit)})`); r.addColorStop(1, 'rgba(255,226,140,0)'); g.fillStyle = r; g.fillRect(-300, -660, 600, 600); g.restore(); } }
  // 3:37 the chest glows where I look
  if (t > 218.5 && t < 220.3) { const a = ramp(t, 218.7, 0.4) * (1 - ramp(t, 220.0, 0.25)); g.save(); g.globalCompositeOperation = 'lighter'; const r = g.createRadialGradient(330, -110, 0, 330, -110, 240); r.addColorStop(0, `rgba(255,214,120,${0.28 * a})`); r.addColorStop(1, 'rgba(255,214,120,0)'); g.fillStyle = r; g.fillRect(80, -360, 500, 500); g.restore(); }
  g.setTransform(1, 0, 0, 1, 0, 0);
}
