// VSL ATS · hook ao bloco 4 — padrão v4 (hook = v4 aprovado; blocos 2–4 refeitos no mesmo padrão: dotwork + profundidade) — ASCII onetake, estilo realista (GUIA-DE-ESTILO.md §14). 17000 agentes que nunca saem do filme:
// o bolso vazio → o barulho → o feed → milhões → todo mundo igual → a briga → o grupo pequeno → a IA construindo → a camada → o dono.
// Motor: o do reel Arquiteto (exemplos/reel-arquiteto/projeto/comp.js). Trechos do narrador: tela preta por enquanto (NARR).
'use strict';

const W = 1080, H = 1920, CX = 540, CY = 800, FPS = 30, DUR = 270.62, N = 40000;
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
    p.rgKey = p.rgT + ':' + [p.bk, p.tm, p.g7, p.pk, p.rn, p.pp, p.who, p.dk, p.ek].join(',');
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
const repCam = t => ({ x: 0.15 * Math.sin((t - 233.2) * 0.5), z: -0.35 + 0.15 * ramp(t, 233.2, 6, E.inOut) });
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
function drawMediaBG(g, t) {
  const bg = (id, t0, t1, a0, o = {}) => { const a = a0 * ramp(t, t0, 0.4) * (1 - ramp(t, t1 - 0.4, 0.4)); if (a > 0.01) mediaDraw(g, seqImg(id, t), 0, 0, W, H, { a, blur: 1.1, grain: 0.32, br: 0.75, sat: 0.7, ...o }); };
  bg('prog', 65.8, 70.4, 0.85 - 0.55 * ramp(t, 68.4, 0.4));
  bg('ratos', 204.9, 209.0, 0.55);
  bg('scroll', 219.9, 225.6, 0.6);
}
// media living inside the world (follow the camera)
function drawMediaWorld(g, t, M) {
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
  if (t > 78.2 && t < 86.1) {
    const a1 = ramp(t, 78.4, 0.5) * (1 - ramp(t, 83.55, 0.35)), s1 = 0.95 + 0.05 * ramp(t, 78.4, 0.6, E.cubicOut);
    if (a1 > 0.01) mediaDraw(g, seqImg('igor', t), -330 * s1, -260, 660 * s1, 1173 * s1, { a: a1, fade: 0.55, fadeX: 0.16, blur: 0.4, grain: 0.3, sat: 0.8, br: 0.95 });
    const a2 = ramp(t, 83.55, 0.4) * (1 - ramp(t, 85.75, 0.3));
    if (a2 > 0.01) { mediaDraw(g, seqImg('igor', t), -470, -200, 480, 853, { a: a2, fade: 0.6, fadeX: 0.16, blur: 0.4, grain: 0.3, sat: 0.8 }); mediaDraw(g, seqImg('emm', t), -40, -300, 560, 996, { a: a2 * ramp(t, 84.1, 0.4), fade: 0.6, fadeX: 0.16, blur: 0.4, grain: 0.3, sat: 0.8 }); }
  }
  // the SALG on real screens, in 3D
  if (t > 85.7 && t < 93.0) {
    const A = ramp(t, 85.85, 0.5) * (1 - ramp(t, 92.55, 0.35)), fl = k => 14 * Math.sin(t * 1.1 + k), orb = 0.08 * Math.sin((t - 86) * 0.5);
    const enter = (at, d = 0.9) => E.cubicOut(ramp(t, at, d)), push = ramp(t, 90.6, 0.8, E.inOut), fun = ramp(t, 91.5, 0.8, E.inOut);
    const P = [
      { im: 'salg_tracker.jpg', x: -290, y: -330 + fl(1), z: 520, w: 680, ry: 0.42 + orb, a: enter(88.0) },
      { im: 'salg_mapa.jpg', x: 300, y: 300 + fl(2), z: 560, w: 680, ry: -0.42 + orb, a: enter(88.5) },
      { im: 'salg_funil.jpg', x: lerp(-260, 0, fun), y: lerp(330, 250, fun) + fl(3), z: lerp(620, -150, fun), w: 680, ry: lerp(0.35, 0.05, fun) + orb, a: enter(89.0) },
      { im: 'salg_dashboard.jpg', x: 0, y: lerp(-130, -220 - 120 * fun, push) + fl(0), z: lerp(1700, 0, enter(85.9, 1.2)) - 250 * push + 380 * fun, w: 900, ry: lerp(0.9, -0.18, enter(85.9, 1.2)) + orb, a: 1 },
    ].sort((a, b) => b.z - a.z);
    for (const q of P) { const im = IMGS[q.im], h = q.w * (im ? im.height / im.width : 0.5); mediaQuad(g, im, panel3(q.x, q.y, q.z, q.w, h, q.ry, 0.12), { a: A * q.a, stroke: 'rgba(187,163,255,0.8)', grain: 0.22, br: 1.18 }); }
  }
  if (t > 92.6 && t < 97.0) { const a = ramp(t, 92.7, 0.4) * (1 - ramp(t, 96.55, 0.3)); mediaQuad(g, IMGS['salg_dashboard.jpg'], panel3(0, 30, 0, 460, 221, 0.15 * Math.sin(t * 0.8), 0.1), { a: a * 0.85, stroke: 'rgba(255,122,112,0.7)', br: 1.0 }); }
  if (t > 100.9 && t < 105.1) { const a = ramp(t, 101.0, 0.5) * (1 - ramp(t, 104.75, 0.3)); g.save(); g.shadowColor = 'rgba(242,193,78,0.6)'; g.shadowBlur = 30 * a; mediaQuad(g, IMGS['salg_dashboard.jpg'], panel3(0, -200, 0, 640, 307, 0.12 * Math.sin(t * 0.7), 0.08), { a, stroke: 'rgba(245,203,98,0.95)', br: 1.12 }); g.restore(); }
  if (t > 104.9 && t < 109.0) { const a = ramp(t, 105.0, 0.5) * (1 - ramp(t, 108.6, 0.3)); mediaQuad(g, IMGS['salg_dashboard.jpg'], panel3(250, -380, 0, 360, 173, -0.2, 0.08), { a: a * 0.9, stroke: 'rgba(245,203,98,0.95)', br: 1.1 }); }
  // the bait: a real thumbnail under the trap
  if (t > 156.4 && t < 159.0) { const a = ramp(t, 156.7, 0.4) * (1 - ramp(t, 158.75, 0.25)); g.save(); g.shadowColor = 'rgba(147,188,255,0.9)'; g.shadowBlur = 40 * a * (0.7 + 0.3 * Math.sin(t * 6)); mediaDraw(g, IMGS['week7.jpg'], -80, 92, 230, 129, { a, r: 10, grain: 0.25, blur: 0.5, sat: 1.05, br: 1.05 }); g.restore(); }
  // the eight weeks: thumbnails living inside the cards (mini b-rolls)
  if (t > 161.2 && t < 167.0) TOOL8_POS.forEach(([x, y], k) => {
    const on = dropIn(t, TOOL8_AT[k], 0.3), s = 0.8 + 0.2 * clamp(on), old = Math.max(k < 7 ? ramp(t, TOOL8_AT[k + 1], 0.3) : 0, ramp(t, 166.24, 0.4)), a = clamp(on) * (1 - ramp(t, 166.6, 0.25));
    if (a < 0.01) return; const { w, h } = CARD5, u = t - TOOL8_AT[k];
    mediaDraw(g, IMGS[`week${k + 1}.jpg`], x - w / 2 * s, y - h / 2 * s + 10 * old, w * s, h * s, { a, r: 10, zoom: 1.04 + 0.05 * u, panX: 0.4 * Math.sin(u * 0.9 + k), panY: 0.3 * Math.cos(u * 0.7 + k), blur: 0.7, grain: 0.28, gray: old * 0.9, br: 1 - 0.35 * old, sat: 1 });
  });
  // the tutorial inside the big screen
  if (t > 190.6 && t < 194.0) { const on = dropIn(t, 190.85, 0.3), a = clamp(on) * (1 - ramp(t, 193.75, 0.25)); mediaDraw(g, seqImg('tut', t), -320 * (0.8 + 0.2 * clamp(on)), -230 - 180 * (0.8 + 0.2 * clamp(on)), 640 * (0.8 + 0.2 * clamp(on)), 360 * (0.8 + 0.2 * clamp(on)), { a, r: 12, blur: 0.5, grain: 0.3, br: 1.0, sat: 0.9 }); }
  // the 'ganhe dinheiro com IA' world: a thumbnail in the phone, the car and the print as panels
  if (t > 197.5 && t < 205.2) {
    const A = ramp(t, 197.9, 0.4) * (1 - ramp(t, 204.9, 0.3)), dim = ramp(t, 203.1, 0.6);
    mediaDraw(g, IMGS['week8.jpg'], -150, -320, 300, 169, { a: A, r: 10, blur: 0.5, grain: 0.25, br: 1.02 - 0.4 * dim, gray: dim * 0.8, sat: 1 });
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
    M.forEach((m, k) => { const x = -300 + k * 150 - off + 600; if (x < -520 || x > 520) return; const paid = x < 0; g.globalAlpha = a; g.strokeStyle = paid ? '#5BE39A' : '#7C7C86'; g.lineWidth = 2; RR(g, x - 56, 100, 112, 70, 12); g.stroke(); g.globalAlpha = 1; text(g, m, x, 122, mono(20, 700), paid ? '#5BE39A' : '#A0A0AA', a, 'center', 3); text(g, paid ? '✓ PAGO' : '…', x, 150, mono(15, 700), paid ? '#F5CB62' : '#7C7C86', a, 'center', 2); }); }
  // the roles of the team, and again inside the phone
  TEAM_P.forEach(([x, y], k) => lbl(ROLES[k], x, y + 128, 62.4 + k * 0.12, 65.95, '#FFB07A', 17, 700, 70 + k, 3));
  if (t > 70.0 && t < 73.6) TEAM_P.forEach(([x, y], k) => { const q = inQ(t, k), [ix, iy] = IN5[k], a = 1 - ramp(t, 73.3, 0.25); text(g, ROLES[k], lerp(x, ix + 18, q), lerp(y + 128, iy, q) - 120 * Math.sin(Math.PI * q), mono(lerp(17, 15, q), 700), q > 0.6 ? '#BBA3FF' : '#FFB07A', a, q > 0.6 ? 'left' : 'center', 2); });
  // the payment cards flying into the SALG
  PAY_AT.forEach((P, j) => { for (let k = 0; k < 7; k++) { const at = P + k * 0.05 + 0.2 * hash(k, j), u = clamp((t - at) / 0.7); if (u <= 0 || u >= 1) continue; const sx = (k - 3) * 145, sy = 250, q = E.inOut(u); payCard(g, lerp(sx, 0, q), lerp(sy, -200, q) - 80 * Math.sin(Math.PI * q), lerp(0.75, 0.35, q), Math.sin(Math.PI * Math.min(1, u * 1.2))); } });
  { const n = PAY_AT.filter(P => t >= P + 0.75).length * 7; if (t > 101.6 && t < 104.9 && n) lbl(`+${n} ASSINANTES`, 0, -10, 102.6, 104.9, '#5BE39A', 24, 700, 99); }
  // the levels of the staircase
  ['NÍVEL 1', 'NÍVEL 2', 'NÍVEL 3'].forEach((s, k) => lbl(s, STEP5[k + 1][0], STEP5[k + 1][1] - 60 * (k + 1) - 170, STEP_AT5[k] + 0.2, 108.75, k === 2 ? '#F5CB62' : '#FFFFFF', 20, 700, 80 + k));
  // the days of the week
  DAYS.forEach((d, k) => { const x = (k - 3) * 132, lit = k < 4 && t > DAY_AT[k], broke = t > 185.42; text(g, d, x, 0, mono(22, 700), lit && !broke ? '#050506' : broke && k >= 4 ? '#FF7A70' : '#CDCDD3', ramp(t, 181.1, 0.4) * (1 - ramp(t, 185.75, 0.2)), 'center', 2); if (broke && k >= 4) { const a = ramp(t, 185.45 + (k - 4) * 0.06, 0.15) * (1 - ramp(t, 185.75, 0.2)); g.globalAlpha = a; g.strokeStyle = '#FF5A52'; g.lineWidth = 6; g.beginPath(); g.moveTo(x - 40, -50); g.lineTo(x + 40, 50); g.moveTo(x + 40, -50); g.lineTo(x - 40, 50); g.stroke(); g.globalAlpha = 1; } });
  lbl('A PRIMEIRA SEMANA', 0, -150, 183.4, 185.75, '#FFB07A', 22, 700, 85);
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
  SUBS.forEach((c, i) => { const nx = SUBS[i + 1]; c.end = nx ? (nx.s - c.e < 0.7 ? nx.s : c.e + 0.45) : c.e + 0.3; }); // the last one leaves before the seam, so it never sits on top of the next part's first line
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
  const counter = (pulses, x, y, t0, t1) => { const n = pulses.filter(P => t >= P + 0.7).length; if (n) lbl(`TODO MÊS ×${n}`, x, y, t0, t1, '#F5CB62', 24, 700, 90 + n); };
  counter(PUL_OWN, 0, 80, 46.9, 49.2);
  lbl('DONO · TODO MÊS', -250, 140, 49.5, 51.65, '#F5CB62', 22, 700, 11);
  lbl('SEU TEMPO', 250, 120, 50.15, 51.65, '#F2F2F5', 22, 700, 12);
  lbl('UMA VEZ', 250, 312, 51.2, 51.65, '#FFFFFF', 26, 700, 13);
  lbl('CONSTRUÍDO 1 VEZ', 0, 70, 58.45, 61.55, '#FFB07A', 22, 700, 14);
  lbl('PAGO TODO MÊS', 0, 420, 60.25, 61.55, '#F5CB62', 22, 700, 15);
  lbl('SÓ UM PROGRAMADOR', 0, 250, 66.5, 69.85, '#F2F2F5', 26, 700, 16);
  lbl('EM MÉDIA', 0, 200, 67.9, 69.85, '#A0A0AA', 20, 500, 17);
  lbl('QUASE R$', 0, -330, 68.32, 69.85, '#5BE39A', 40, 700, 18, 6);
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
  lbl('O DINHEIRO DELES', 250, -160, 171.4, 174.45, '#F5CB62', 20, 700, 50);
  lbl('SEU TEMPO', -250, 210, 171.9, 174.45, '#F2F2F5', 20, 700, 51);
  callout(g, t, 173.7, 174.45, 180, 270, 350, 120, 'VOCÊ NÃO', '#FF7A70', 'right');
  lbl('PAROU', 0, -240, 185.42, 185.75, '#FF7A70', 44, 700, 52, 8);
  lbl('O PROBLEMA É VOCÊ', 0, -332, 187.6, 188.85, '#FF7A70', 30, 700, 53, 4);
  callout(g, t, 190.1, 193.8, 40, 240, 250, 140, 'SOZINHO', '#CDCDD3', 'left');
  lbl('COMEÇO', -400, 380, 194.0, 197.35, '#A0A0AA', 20, 700, 54);
  lbl('FIM', 0, -320, 194.0, 197.35, '#F5CB62', 40, 700, 55, 10);
  lbl('GANHE', 0, -110, 199.45, 205.0, '#FFFFFF', 34, 700, 56, 4);
  lbl('DINHEIRO', 0, -62, 199.7, 205.0, '#F5CB62', 34, 700, 57, 4);
  lbl('COM IA', 0, -14, 200.15, 205.0, '#BBA3FF', 34, 700, 58, 4);
  lbl('COMO CHEGAR LÁ?', 0, -360, 204.3, 205.0, '#CDCDD3', 22, 700, 59);
  callout(g, t, 207.6, 208.7, 30, 111, 270, 330, 'MESMO LUGAR', '#FF7A70', 'left');
  lbl('A MAIORIA', -320, 330, 218.6, 220.15, '#A0A0AA', 20, 700, 60);
  callout(g, t, 217.6, 220.15, 160, 150, 70, -40, 'EU', '#FFFFFF', 'right');
  lbl('R$ 0', 0, 380, 224.5, 225.9, '#FF7A70', 36, 700, 61, 4);
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
  callout(g, t, 35.2, 35.5, 286, -48, 430, -250, 'DONO', '#F5CB62', 'right');
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


// ═════════════════════════ VSL parts 2 & 3 — the v5 engine, with a scene layer on top (this file replaces the content)
NARR.length = 0; KEYS.length = 0; CAMK.length = 0; CHUNKS.length = 0; SECTIONS.length = 0; PLAY.length = 0; TREMOR2.length = 0;
const PART = { keys: [], cams: [], lbls: [], calls: [], media: [], bg: [], ev: [], tremor: [], over: [] };

// ───────────────────────── elements: a scene = a list of drawn things, each with its own entrance and life
const ELS = {};
function el(draw, x, y, s = 1, o = {}) { return { draw, x, y, s, ...o }; }
const TX = (str, px, hex, o = {}) => el(textArt(str, px, hex), 0, 0, 1, o);       // lettering (place with o.x / o.y)
let SCN_SEED = 3000;
function scene(name, els, extra = [], extraDyn = null) {
  const groups = [];
  els.forEach((e, k) => {
    if (e.x === undefined) e.x = 0; if (e.y === undefined) e.y = 0;
    let pts;
    if (e.pts) pts = e.pts.map(p => ({ ...p }));
    else { pts = (e.dot ? dotArt : art)(e.draw, e.s, e.x, e.y, { seed: SCN_SEED++, cell: e.cell || 4, tint: e.tint, money: e.money, h: e.h, w: e.w, nosort: true, ids: e.ids }); }
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; pts.forEach(p => { p.ek = k; x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); });
    e.bx0 = x0; e.bw = Math.max(1, x1 - x0); e.by0 = y0; e.bh = Math.max(1, y1 - y0);
    if (e.cx === undefined) e.cx = (x0 + x1) / 2; if (e.cy === undefined) e.cy = (y0 + y1) / 2;
    groups.push(e.nosort ? pts : hsort(pts));
  });
  extra.forEach(g => groups.push(g));
  ELS[name] = els;
  SH[name] = makeShape(groups, (t, i, p, b) => { if (p.ek === undefined) { if (extraDyn) extraDyn(t, i, p, b); return; } elLife(t, i, p, b, els[p.ek]); });
}
function elLife(t, i, p, b, e) {
  let ox = 0, oy = 0, sc = 1, a = 1, rot = 0;
  if (e.at !== undefined) { const on = dropIn(t, e.at, e.pd || 0.35), s0 = e.s0 ?? 0.75; sc *= s0 + (1 - s0) * clamp(on); a *= clamp(on, 0.02); if (e.from) { const q = 1 - E.cubicOut(clamp(ramp(t, e.at, e.pd || 0.5))); ox += e.from[0] * q; oy += e.from[1] * q; } }
  if (e.moves) for (const [t0, d, dx, dy, ds, ease] of e.moves) { const q = ramp(t, t0, d, E[ease || 'inOut']); ox += dx * q; oy += dy * q; sc *= 1 + (ds || 0) * q; }
  if (e.bob) oy += e.bob * Math.sin(t * (e.bobf || 2) + (e.ph || 0));
  if (e.spin) rot += e.spin * (t - (e.at || 0));
  if (e.wob) rot += e.wob * Math.sin(t * 3 + (e.ph || 0));
  if (e.pulse) sc *= 1 + e.pulse * Math.sin(t * (e.pulsef || 5));
  if (e.out !== undefined) a *= 1 - ramp(t, e.out, e.outd || 0.3);
  if (e.dim) a *= 1 - e.dim[1] * ramp(t, e.dim[0], 0.4);
  let dx = p.x - e.cx, dy = p.y - e.cy;
  if (rot) { const c = Math.cos(rot), s = Math.sin(rot), x2 = dx * c - dy * s; dy = dx * s + dy * c; dx = x2; }
  b.x[i] = e.cx + ox + dx * sc; b.y[i] = e.cy + oy + dy * sc;
  let fl = 0; if (e.flash) for (const T of e.flash) fl += flash(t, T, 0.16);
  b.a[i] = Math.min(1, p.a * (e.br || 1)) * a + 0.35 * fl * clamp(a * 4);
  if (e.tints) for (const [T, ti, frac] of e.tints) if (ramp(t, T, 0.4) * (frac ?? 1) > hash(i, 17)) b.t[i] = ti;
  if (e.reveal) { const [t0, d, dir] = e.reveal, f = ramp(t, t0, d, E.inOut), u = dir === 'y' ? (p.y - e.by0) / e.bh : dir === '-y' ? 1 - (p.y - e.by0) / e.bh : (p.x - e.bx0) / e.bw; if (u > f) b.a[i] = 0.02; }
  if (e.life) e.life(t, i, p, b, e);
}
// particles flowing from a to b (coins, ideas, glyphs)
function flowEl(n, from, to, t0, t1, o = {}) {
  const pts = [...Array(n)].map((_, k) => ({ fk: k, x: from[0], y: from[1], a: 0.02, c: pick(o.glyphs || '$o0$', hash(k + n, 2)), t: o.tint !== undefined ? o.tint : money(hash(k + n, 3)), s: (o.size || 0.45) + 0.3 * hash(k + n, 4) }));
  return { pts, x: 0, y: 0, cx: 0, cy: 0, nosort: true, life: (t, i, p, b) => {
    if (t < t0 || t > t1 + 1) { b.a[i] = 0.02; return; }
    const u = (hash(p.fk, 6) + (t - t0) * (o.speed || 0.9)) % 1, src = typeof from === 'function' ? from(p.fk) : from, dst = typeof to === 'function' ? to(p.fk) : to;
    flowTo(b, i, src[0] + (hash(p.fk, 9) - 0.5) * (o.spread || 0), src[1], dst[0], dst[1], u, o.arc ?? 80, o.jit ?? 20, p.fk);
    b.a[i] = Math.max(0.02, 0.9 * Math.sin(Math.PI * u) * ramp(t, t0, 0.3) * (1 - ramp(t, t1, 0.4)));
  } };
}
// a 2-D crowd of small dotwork busts (rows recede: smaller and higher)
function crowdEl(cols, rows, x0, x1, y0, y1, o = {}) {
  const pts = []; let k = 0;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const v = rows > 1 ? r / (rows - 1) : 1, m = (o.m0 ?? 0.75) + ((o.m1 ?? 1.1) - (o.m0 ?? 0.75)) * v, x = lerp(x0, x1, cols > 1 ? c / (cols - 1) : 0.5) + (r % 2 ? 14 : -14), y = lerp(y0, y1, v);
    (o.tpl || BUSTD_T).forEach(p => pts.push({ ...p, rsc: m, x: x + p.x * m, y: y + p.y * m, s: p.s * m, pk: k, bx: x, by: y })); k++;
  }
  return { pts, x: 0, y: 0, cx: 0, cy: 0, nosort: false, ...o };
}

// ───────────────────────── icons (all drawn around the origin)
const W1 = (g, hex, v0, v1, x0, x1) => LG(g, x0, 0, x1, 0, [[0, tone(hex, v0)], [0.45, tone(hex, v1)], [1, tone(hex, v0 * 0.9)]]);
const pathArt = g => { g.strokeStyle = tone(WT, 0.65); g.lineWidth = 10; g.beginPath(); g.moveTo(-380, 0); g.lineTo(380, 0); g.stroke(); [-380, 0, 380].forEach(x => sphere(g, x, 0, 34, WT, 1)); };
const bricksArt = g => { for (let r = 0; r < 4; r++) for (let c = 0; c <= 3 - r; c++) { const x = -150 + c * 100 + r * 50, y = 60 - r * 46; g.fillStyle = LG(g, x, y, x + 90, y + 40, [[0, tone(OR, 1)], [1, tone(OR, 0.55)]]); RR(g, x - 45, y - 20, 90, 40, 6); g.fill(); g.fillStyle = tone(OR, 0.35); g.fillRect(x - 45, y + 12, 90, 8); } };
const bagArt = g => { g.fillStyle = W1(g, WT, 0.5, 0.95, -110, 110); poly(g, [[-100, -130], [100, -130], [115, 120], [-115, 120]]); g.fill(); g.fillStyle = VOID; RR(g, -70, -30, 140, 50, 8); g.fill(); g.fillStyle = tone(WT, 0.7); poly(g, [[-100, -130], [-80, -160], [80, -160], [100, -130]]); g.fill(); };
const helmet = (g, x, y, r, hex = OR) => { g.fillStyle = LG(g, x - r, y - r, x + r, y, [[0, tone(hex, 1)], [1, tone(hex, 0.55)]]); g.beginPath(); g.arc(x, y, r, Math.PI, 0); g.fill(); RR(g, x - r * 1.25, y - 4, r * 2.5, 10, 4); g.fill(); };
const workerArt = g => { personFull(g); helmet(g, 0, -150, 30); };
const archFigArt = g => { personFull(g); g.fillStyle = LG(g, 40, -60, 110, -10, [[0, tone(BL, 1)], [1, tone(BL, 0.55)]]); g.save(); g.translate(70, -40); g.rotate(-0.6); RR(g, -70, -14, 140, 28, 14); g.fill(); g.restore(); };
const houseBase = g => { const P = (u, v, z) => [(u - v) * 0.95, (u + v) * 0.48 - z]; g.fillStyle = tone(WT, 0.55); poly(g, [P(-170, 170, 0), P(170, 170, 0), P(170, 170, -30), P(-170, 170, -30)].map(([x, y]) => [x, y + 120])); g.fill(); g.fillStyle = tone(WT, 0.85); poly(g, [P(-170, -170, 0), P(170, -170, 0), P(170, 170, 0), P(-170, 170, 0)].map(([x, y]) => [x, y + 120])); g.fill(); };
const houseWalls = g => { const P = (u, v, z) => [(u - v) * 0.95, (u + v) * 0.48 - z + 120]; g.fillStyle = tone(WT, 0.62); poly(g, [P(-140, 140, 0), P(140, 140, 0), P(140, 140, 180), P(-140, 140, 180)]); g.fill(); g.fillStyle = tone(WT, 0.4); poly(g, [P(140, -140, 0), P(140, 140, 0), P(140, 140, 180), P(140, -140, 180)]); g.fill(); g.fillStyle = VOID; poly(g, [P(-40, 140, 0), P(30, 140, 0), P(30, 140, 110), P(-40, 140, 110)]); g.fill(); poly(g, [P(140, -90, 70), P(140, -20, 70), P(140, -20, 130), P(140, -90, 130)]); g.fill(); };
const houseRoof = g => { const P = (u, v, z) => [(u - v) * 0.95, (u + v) * 0.48 - z + 120]; g.fillStyle = LG(g, -200, -300, 200, -100, [[0, tone(OR, 1)], [1, tone(OR, 0.5)]]); poly(g, [P(-150, 150, 180), P(150, 150, 180), P(150, 0, 300), P(-150, 0, 300)]); g.fill(); g.fillStyle = tone(OR, 0.45); poly(g, [P(150, -150, 180), P(150, 150, 180), P(150, 0, 300)]); g.fill(); g.fillStyle = tone(OR, 0.75); poly(g, [P(-150, -150, 180), P(150, -150, 180), P(150, 0, 300), P(-150, 0, 300)]); g.fill(); };
const blueprintArt = g => { g.fillStyle = tone(BL, 0.3); RR(g, -300, -220, 600, 440, 10); g.fill(); g.strokeStyle = tone(BL, 0.6); g.lineWidth = 2; for (let x = -280; x < 300; x += 40) { g.beginPath(); g.moveTo(x, -210); g.lineTo(x, 210); g.stroke(); } for (let y = -200; y < 220; y += 40) { g.beginPath(); g.moveTo(-290, y); g.lineTo(290, y); g.stroke(); }
  g.strokeStyle = tone(WT, 1); g.lineWidth = 7; poly(g, [[-170, 150], [-170, -10], [0, -150], [170, -10], [170, 150]]); g.stroke(); g.strokeRect(-40, 50, 80, 100); g.strokeRect(70, 0, 60, 50); g.beginPath(); g.moveTo(-230, 180); g.lineTo(230, 180); g.stroke(); };
const botArt = g => { g.fillStyle = W1(g, WT, 0.5, 0.95, -60, 60); RR(g, -55, -50, 110, 90, 22); g.fill(); g.fillStyle = tone(BL, 1); RR(g, -40, -30, 80, 30, 12); g.fill(); g.fillStyle = W1(g, WT, 0.45, 0.85, -50, 50); RR(g, -45, 48, 90, 80, 14); g.fill(); helmet(g, 0, -52, 52); g.fillStyle = tone(WT, 0.7); RR(g, -75, 60, 20, 50, 8); g.fill(); RR(g, 55, 60, 20, 50, 8); g.fill(); };
const floorsArt = n => g => { for (let k = 0; k < n; k++) cubeC(g, 0, -k * 52, 120, WT, 0.85 + 0.01 * k); };
const silArt = k => g => { g.fillStyle = W1(g, WT, 0.45, 0.95, -110, 110); if (k === 0) { poly(g, [[-110, 120], [-110, -20], [0, -120], [110, -20], [110, 120]]); g.fill(); } else if (k === 1) { g.fillRect(-120, -30, 240, 150); g.fillRect(-60, -110, 120, 80); } else { g.fillRect(-60, -170, 120, 290); poly(g, [[-60, -170], [0, -230], [60, -170]]); g.fill(); } g.fillStyle = VOID; g.fillRect(-25, 50, 50, 70); };
const bulbArt = g => { sphere(g, 0, -30, 70, GD, 1, GOLD); g.fillStyle = tone(WT, 0.75); RR(g, -32, 40, 64, 50, 10); g.fill(); g.fillStyle = VOID; g.fillRect(-32, 56, 64, 6); g.fillRect(-32, 72, 64, 6); };
const cardArt = (w = 240, h = 300) => g => { g.fillStyle = W1(g, WT, 0.35, 0.75, -w / 2, w / 2); RR(g, -w / 2, -h / 2, w, h, 20); g.fill(); g.fillStyle = VOID; RR(g, -w / 2 + 16, -h / 2 + 16, w - 32, h * 0.5, 12); g.fill(); g.fillStyle = tone(WT, 0.9); RR(g, -w / 2 + 20, h * 0.12, w * 0.7, 16, 8); g.fill(); RR(g, -w / 2 + 20, h * 0.25, w * 0.5, 16, 8); g.fill(); };
const scaleArt = g => { g.fillStyle = W1(g, WT, 0.5, 1, -20, 20); g.fillRect(-12, -150, 24, 300); RR(g, -120, 140, 240, 30, 10); g.fill(); sphere(g, 0, -160, 22, WT, 1); };
const beamArt = g => { g.fillStyle = W1(g, WT, 0.6, 1, -320, 320); RR(g, -320, -12, 640, 24, 10); g.fill(); g.strokeStyle = tone(WT, 0.7); g.lineWidth = 4; [-290, 290].forEach(x => { g.beginPath(); g.moveTo(x, 0); g.lineTo(x - 70, 120); g.moveTo(x, 0); g.lineTo(x + 70, 120); g.stroke(); g.fillStyle = W1(g, WT, 0.5, 0.95, x - 90, x + 90); g.beginPath(); g.ellipse(x, 125, 95, 22, 0, 0, 7); g.fill(); }); };
const rocketArt = g => { g.fillStyle = W1(g, WT, 0.45, 1, -60, 60); g.beginPath(); g.moveTo(0, -200); g.bezierCurveTo(70, -140, 70, 60, 50, 120); g.lineTo(-50, 120); g.bezierCurveTo(-70, 60, -70, -140, 0, -200); g.fill(); g.fillStyle = tone(BL, 0.9); g.beginPath(); g.arc(0, -60, 26, 0, 7); g.fill(); g.fillStyle = tone(OR, 0.9); poly(g, [[-50, 60], [-110, 150], [-50, 120]]); g.fill(); poly(g, [[50, 60], [110, 150], [50, 120]]); g.fill(); };
const flameArt = g => { g.fillStyle = RG(g, 0, 20, 5, 120, [[0, tone(WT, 1)], [0.4, tone(GD, 1)], [1, tone(OR, 0.6)]]); g.beginPath(); g.moveTo(-45, 0); g.quadraticCurveTo(0, 220, 45, 0); g.closePath(); g.fill(); };
const sealArt = (hex = GN) => g => { g.fillStyle = W1(g, hex, 0.55, 1, -150, 150); g.beginPath(); g.moveTo(0, -170); g.lineTo(140, -110); g.lineTo(130, 40); g.quadraticCurveTo(100, 140, 0, 180); g.quadraticCurveTo(-100, 140, -130, 40); g.lineTo(-140, -110); g.closePath(); g.fill(); g.strokeStyle = VOID; g.lineWidth = 26; g.beginPath(); g.moveTo(-60, 0); g.lineTo(-15, 50); g.lineTo(70, -50); g.stroke(); };
const browserArt = g => { g.fillStyle = W1(g, WT, 0.45, 0.9, -230, 230); RR(g, -230, -160, 460, 320, 18); g.fill(); g.fillStyle = VOID; RR(g, -214, -120, 428, 266, 10); g.fill(); g.fillStyle = tone(WT, 0.7); [-206, -184, -162].forEach(x => { g.beginPath(); g.arc(x, -140, 7, 0, 7); g.fill(); }); RR(g, -130, -150, 300, 20, 10); g.fill(); g.fillStyle = tone(BL, 0.9); RR(g, -190, -96, 380, 90, 12); g.fill(); g.fillStyle = tone(WT, 0.8); for (let k = 0; k < 3; k++) { RR(g, -190 + k * 130, 14, 116, 110, 10); g.fill(); } };
const infArt = g => { g.strokeStyle = LG(g, -220, 0, 220, 0, [[0, tone(GN, 1)], [0.5, tone(WT, 1)], [1, tone(GN, 1)]]); g.lineWidth = 40; g.beginPath(); for (let a = 0; a <= 6.3; a += 0.05) { const x = 200 * Math.cos(a) / (1 + Math.sin(a) ** 2), y = 200 * Math.sin(a) * Math.cos(a) / (1 + Math.sin(a) ** 2); a ? g.lineTo(x, y) : g.moveTo(x, y); } g.closePath(); g.stroke(); };
const puzzleArt = g => { const PZ = 150, pp = (x, y) => { g.beginPath(); g.rect(x - PZ / 2, y - PZ / 2, PZ, PZ); g.moveTo(x + 24, y - PZ / 2); g.arc(x, y - PZ / 2, 24, 0, 7); }; for (let r = -1; r <= 1; r++) for (let c = -1; c <= 1; c++) { if (r === 0 && c === 1) continue; pp(c * PZ, r * PZ); g.fillStyle = tone(WT, (r + c) % 2 ? 0.9 : 0.6); g.fill(); g.strokeStyle = VOID; g.lineWidth = 6; g.stroke(); } g.strokeStyle = tone(WT, 0.5); g.setLineDash([12, 10]); g.lineWidth = 4; g.strokeRect(PZ / 2, -PZ / 2, PZ, PZ); g.setLineDash([]); };
const signpostArt = g => { g.fillStyle = W1(g, WT, 0.5, 0.95, -15, 15); g.fillRect(-12, -200, 24, 360); [[-1, -150, -0.12], [1, -80, 0.1], [-1, -10, 0.15], [1, 60, -0.08]].forEach(([sd, y, r]) => { g.save(); g.translate(0, y); g.rotate(r); g.fillStyle = W1(g, WT, 0.5, 0.95, 0, sd * 200); poly(g, [[0, -22], [sd * 170, -22], [sd * 200, 0], [sd * 170, 22], [0, 22]]); g.fill(); g.restore(); }); };
const loginArt = g => { g.fillStyle = W1(g, WT, 0.3, 0.7, -200, 200); RR(g, -200, -200, 400, 400, 26); g.fill(); g.fillStyle = VOID; RR(g, -160, -80, 320, 56, 12); g.fill(); RR(g, -160, 0, 320, 56, 12); g.fill(); g.fillStyle = tone(BL, 1); RR(g, -160, 90, 320, 60, 14); g.fill(); sphere(g, 0, -140, 34, WT, 0.9); };
const chatUIArt = g => { g.fillStyle = W1(g, WT, 0.25, 0.5, -230, 230); RR(g, -230, -330, 460, 660, 34); g.fill(); g.fillStyle = tone(GN, 0.85); RR(g, -230, -330, 460, 90, 34); g.fill(); g.fillRect(-230, -270, 460, 30); g.fillStyle = VOID; RR(g, -214, -230, 428, 540, 18); g.fill(); [-1, 0, 1].forEach((k, j) => sphere(g, -170 + j * 50, -290, 20, WT, 0.9)); };
const targetArt = g => { [100, 70, 40, 14].forEach((r, k) => { g.fillStyle = tone(k % 2 ? WT : RD, k % 2 ? 0.9 : 1); g.beginPath(); g.arc(0, 0, r, 0, 7); g.fill(); }); g.strokeStyle = tone(WT, 1); g.lineWidth = 8; g.beginPath(); g.moveTo(0, 0); g.lineTo(110, -110); g.stroke(); };
const tagArt = (hex = GD) => g => { g.fillStyle = W1(g, hex, 0.55, 1, -110, 110); poly(g, [[-110, -60], [60, -60], [120, 0], [60, 60], [-110, 60]]); g.fill(); g.fillStyle = VOID; g.beginPath(); g.arc(70, 0, 14, 0, 7); g.fill(); };
const calArt = g => { g.fillStyle = W1(g, WT, 0.5, 0.95, -130, 130); RR(g, -130, -120, 260, 250, 18); g.fill(); g.fillStyle = tone(RD, 1); RR(g, -130, -120, 260, 60, 18); g.fill(); g.fillStyle = VOID; for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) g.fillRect(-100 + c * 54, -40 + r * 52, 36, 36); };
const railsArt = g => { for (let k = 0; k < 5; k++) { const x = -360 + k * 180; g.fillStyle = tone(WT, 0.4); RR(g, x - 6, -300, 12, 600, 6); g.fill(); for (let j = 0; j < 18; j++) sphere(g, x, -280 + j * 33, 9, WT, 0.85); } };
const lessonArt = g => { g.fillStyle = W1(g, WT, 0.35, 0.75, -300, 120); RR(g, -300, -170, 420, 260, 18); g.fill(); g.fillStyle = VOID; RR(g, -284, -154, 388, 228, 12); g.fill(); sphere(g, -90, -40, 50, WT, 1); g.fillStyle = VOID; poly(g, [[-108, -66], [-60, -40], [-108, -14]]); g.fill();
  g.fillStyle = W1(g, WT, 0.5, 0.95, 150, 320); RR(g, 150, -170, 170, 230, 12); g.fill(); g.fillStyle = VOID; for (let k = 0; k < 5; k++) { RR(g, 170, -140 + k * 38, 120 - (k % 2) * 30, 12, 6); g.fill(); } };
const checkArt = g => { g.fillStyle = W1(g, GN, 0.55, 1, -60, 60); g.beginPath(); g.arc(0, 0, 60, 0, 7); g.fill(); g.strokeStyle = VOID; g.lineWidth = 16; g.beginPath(); g.moveTo(-26, 2); g.lineTo(-6, 24); g.lineTo(30, -20); g.stroke(); };
const xArt = (r = 60) => g => { g.strokeStyle = tone(RD, 1); g.lineWidth = r * 0.3; g.beginPath(); g.moveTo(-r, -r); g.lineTo(r, r); g.moveTo(r, -r); g.lineTo(-r, r); g.stroke(); };
const ringsArt = g => { [320, 230, 140].forEach((r, k) => { g.strokeStyle = tone(k === 2 ? GN : WT, 0.5 + 0.2 * k); g.lineWidth = 6; g.beginPath(); g.arc(0, 0, r, 0, 7); g.stroke(); }); sphere(g, 0, 0, 70, GN, 1, GREEN); };
const giftArt = g => { g.fillStyle = W1(g, OR, 0.55, 1, -160, 160); g.fillRect(-150, -40, 300, 200); g.fillStyle = W1(g, OR, 0.7, 1, -170, 170); g.fillRect(-170, -100, 340, 70); g.fillStyle = tone(GD, 1); g.fillRect(-22, -100, 44, 260); g.beginPath(); g.ellipse(-50, -125, 50, 28, -0.4, 0, 7); g.ellipse(50, -125, 50, 28, 0.4, 0, 7); g.fill(); };
const mapArt = g => { g.fillStyle = W1(g, WT, 0.3, 0.65, -340, 340); poly(g, [[-340, -240], [-110, -270], [110, -240], [340, -270], [340, 240], [110, 270], [-110, 240], [-340, 270]]); g.fill(); g.strokeStyle = tone(WT, 0.25); g.lineWidth = 3; [-110, 110].forEach(x => { g.beginPath(); g.moveTo(x, -260); g.lineTo(x, 260); g.stroke(); });
  const N5 = [[-240, -130], [-40, -170], [180, -90], [-170, 110], [60, 60], [250, 150]]; g.strokeStyle = tone(GN, 0.9); g.lineWidth = 6; g.setLineDash([16, 10]); g.beginPath(); N5.forEach(([x, y], k) => (k ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); g.setLineDash([]); N5.forEach(([x, y]) => sphere(g, x, y, 22, GN, 1, GREEN)); };
const shelfArt = g => { g.fillStyle = W1(g, WT, 0.35, 0.6, -330, 330); RR(g, -330, -280, 660, 560, 16); g.fill(); g.fillStyle = VOID; for (let k = 0; k < 4; k++) g.fillRect(-310, -260 + k * 136, 620, 114); const r = rng(9); for (let k = 0; k < 4; k++) { let x = -300; while (x < 280) { const w = 22 + r() * 22, h = 70 + r() * 36; g.fillStyle = tone([WT, BL, OR, GN][k], 0.55 + 0.4 * r()); g.fillRect(x, -260 + k * 136 + 114 - h, w, h); x += w + 5; } } };
const warnArt = g => { g.fillStyle = W1(g, GD, 0.6, 1, -170, 170); g.beginPath(); g.moveTo(0, -170); g.lineTo(180, 150); g.lineTo(-180, 150); g.closePath(); g.fill(); g.fillStyle = VOID; RR(g, -16, -80, 32, 140, 14); g.fill(); g.beginPath(); g.arc(0, 100, 18, 0, 7); g.fill(); };
const magArt2 = g => { g.fillStyle = tone(WT, 0.08); g.beginPath(); g.arc(-30, -30, 110, 0, 7); g.fill(); g.strokeStyle = W1(g, WT, 0.5, 1, -140, 80); g.lineWidth = 26; g.beginPath(); g.arc(-30, -30, 110, 0, 7); g.stroke(); g.save(); g.translate(50, 50); g.rotate(Math.PI / 4); g.fillStyle = W1(g, WT, 0.45, 1, -20, 20); RR(g, 40, -22, 160, 44, 18); g.fill(); g.restore(); };
const companyArt = g => { g.fillStyle = W1(g, WT, 0.4, 0.9, -200, 200); g.fillRect(-200, -260, 400, 520); g.fillStyle = tone(WT, 0.25); poly(g, [[200, -260], [250, -290], [250, 230], [200, 260]]); g.fill(); for (let r = 0; r < 8; r++) for (let c = 0; c < 5; c++) { g.fillStyle = (r + c) % 4 === 1 ? tone(GD, 0.95) : VOID; g.fillRect(-170 + c * 70, -230 + r * 58, 44, 34); } g.fillStyle = VOID; g.fillRect(-40, 180, 80, 80); };
const testiArt = g => { g.fillStyle = W1(g, WT, 0.35, 0.8, -220, 220); RR(g, -220, -110, 440, 220, 22); g.fill(); sphere(g, -150, -40, 40, WT, 0.9); for (let k = 0; k < 5; k++) { g.fillStyle = tone(GD, 1); const x = -80 + k * 40, y = -60; g.beginPath(); for (let j = 0; j < 10; j++) { const r = j % 2 ? 7 : 16, a = -Math.PI / 2 + j * Math.PI / 5; g.lineTo(x + r * Math.cos(a), y + r * Math.sin(a)); } g.fill(); } g.fillStyle = VOID; RR(g, -80, -10, 260, 14, 7); g.fill(); RR(g, -80, 20, 200, 14, 7); g.fill(); RR(g, -80, 50, 230, 14, 7); g.fill(); };
const chainArt = g => { g.strokeStyle = W1(g, WT, 0.5, 1, -300, 300); g.lineWidth = 18; for (let k = 0; k < 6; k++) { g.save(); g.translate(-275 + k * 110, 0); g.beginPath(); g.ellipse(0, 0, 64, k % 2 ? 22 : 34, 0, 0, 7); g.stroke(); g.restore(); } };
const pastelArt = g => { g.fillStyle = F(CREAM, LG(g, 0, -80, 0, 80, [[0, tone('#F6E3C2', 1)], [1, tone('#F6E3C2', 0.55)]])); g.beginPath(); g.moveTo(-200, 40); g.quadraticCurveTo(0, -150, 200, 40); g.quadraticCurveTo(0, 90, -200, 40); g.fill(); g.strokeStyle = F(CREAM, tone('#F6E3C2', 0.45)); g.lineWidth = 6; for (let k = 0; k < 9; k++) { const x = -170 + k * 42; g.beginPath(); g.moveTo(x, 40 + 10 * Math.sin(k)); g.lineTo(x + 12, 58); g.stroke(); } };
const ccardArt = g => { g.fillStyle = W1(g, BL, 0.5, 1, -170, 170); RR(g, -170, -105, 340, 210, 20); g.fill(); g.fillStyle = tone(GD, 1); RR(g, -130, -50, 60, 44, 8); g.fill(); g.fillStyle = VOID; g.fillRect(-170, 30, 340, 26); };
const thinkArt = g => { g.fillStyle = W1(g, WT, 0.35, 0.75, -260, 260); g.beginPath(); g.ellipse(0, 0, 260, 120, 0, 0, 7); g.fill(); g.beginPath(); g.arc(-150, 150, 30, 0, 7); g.arc(-190, 210, 18, 0, 7); g.fill(); g.fillStyle = VOID; g.beginPath(); g.ellipse(0, 0, 236, 100, 0, 0, 7); g.fill(); };
const treeArt = g => { g.fillStyle = W1(g, WT, 0.45, 0.85, -20, 20); g.fillRect(-14, -40, 28, 200); [[0, -150, 120], [-90, -80, 90], [90, -80, 90], [0, -40, 100]].forEach(([x, y, r]) => sphere(g, x, y, r, GN, 1, GREEN)); };
const editorArt = g => { g.fillStyle = W1(g, WT, 0.25, 0.5, -340, 340); RR(g, -340, -200, 680, 400, 20); g.fillStyle = W1(g, WT, 0.25, 0.5, -340, 340); g.fill(); g.fillStyle = VOID; RR(g, -320, -180, 640, 200, 12); g.fill(); [[BL, -300, 60, 260], [OR, -60, 60, 200], [GN, -300, 110, 380], [PU, 100, 110, 180], [WT, -300, 160, 560]].forEach(([c, x, y, w]) => { g.fillStyle = tone(c, 0.9); RR(g, x, y, w, 34, 8); g.fill(); }); g.fillStyle = tone(RD, 1); g.fillRect(40, 40, 6, 160); };
const forkArt = g => { g.strokeStyle = tone(WT, 0.75); g.lineWidth = 26; g.lineCap = 'round'; g.beginPath(); g.moveTo(0, 300); g.lineTo(0, 60); g.quadraticCurveTo(0, -40, -260, -220); g.moveTo(0, 60); g.quadraticCurveTo(0, -40, 260, -220); g.stroke(); };
const btnArt = g => { g.fillStyle = LG(g, 0, -70, 0, 70, [[0, tone(GN, 1)], [1, tone(GN, 0.55)]]); RR(g, -330, -70, 660, 140, 70); g.fill(); g.fillStyle = tone(WT, 0.95); RR(g, -322, -66, 644, 24, 12); g.fill(); };
const arrowDown = g => { g.fillStyle = W1(g, WT, 0.5, 1, -40, 40); g.fillRect(-18, -120, 36, 140); poly(g, [[-70, 10], [70, 10], [0, 100]]); g.fill(); };
const typeLinesArt = g => { g.fillStyle = W1(g, WT, 0.3, 0.6, -300, 300); RR(g, -300, -260, 600, 520, 18); g.fill(); g.fillStyle = VOID; RR(g, -280, -240, 560, 480, 12); g.fill(); g.fillStyle = tone(WT, 0.85); for (let k = 0; k < 9; k++) { RR(g, -250, -210 + k * 50, 300 + 140 * Math.sin(k * 1.7), 18, 9); g.fill(); } };
const stomachArt = g => { g.strokeStyle = tone(BL, 0.9); g.lineWidth = 8; for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(-80 + k * 50, -60); g.lineTo(-80 + k * 50 + 20, -30); g.lineTo(-80 + k * 50 - 10, 0); g.stroke(); } };
const doorArt = g => { g.fillStyle = W1(g, WT, 0.3, 0.75, -150, 150); RR(g, -150, -260, 300, 520, 14); g.fill(); g.fillStyle = tone(WT, 0.15); RR(g, -120, -230, 240, 460, 8); g.fill(); sphere(g, 90, 10, 18, GD, 1); };
const liveArt = g => { g.fillStyle = tone(RD, 1); RR(g, -150, -50, 300, 100, 50); g.fill(); g.fillStyle = tone(WT, 1); g.beginPath(); g.arc(-95, 0, 18, 0, 7); g.fill(); };
const appFinArt = g => { // finance app screen (inside a phone frame drawn separately): balance, donut, in/out list
  g.fillStyle = tone(GN, 0.9); RR(g, -140, -270, 280, 90, 18); g.fill(); g.fillStyle = VOID; RR(g, -120, -250, 120, 20, 8); g.fill(); RR(g, -120, -218, 180, 26, 8); g.fill();
  g.lineWidth = 34; [[GN, 0, 2.2], [RD, 2.2, 3.6], [BL, 3.6, 5.0], [GD, 5.0, 6.28]].forEach(([c, a0, a1]) => { g.strokeStyle = tone(c, 1); g.beginPath(); g.arc(0, -60, 70, a0, a1); g.stroke(); });
  for (let k = 0; k < 4; k++) { const y = 70 + k * 56; g.fillStyle = tone(WT, 0.85); RR(g, -140, y, 160, 14, 7); g.fill(); g.fillStyle = tone(k % 2 ? RD : GN, 1); RR(g, 60, y - 4, 80, 22, 8); g.fill(); } };

// ───────────────────────── the narrator, labels, media, sound: data-driven
function buildTemplates() {
  SH.void = makeShape([]);
  BUST_T = manT(0.17, 610, { cell: 4 });
  PERS_T = manT(0.5, 616, { cell: 6 });
  FULL_T = manFull(620);
  FULL_SIDE = manFull(621, { view: 'side' });                 // in profile, for the ones who walk across
  BUSTD_T = manT(0.17, 619, { cell: 3 });
  B30 = manT(0.3, 612, { cell: 4 });
  B45 = manT(0.45, 613);
  B60 = manT(0.6, 614);
}
let FULL_SIDE = null;
// a full mannequin at (x, y), scale s; o.pose names its pose (MAN_POSES), o.side = in profile (walking across)
const fullAt = (x, y, s, o = {}) => ({ pts: (o.side ? FULL_SIDE : FULL_T).map(p => ({ ...p, rsc: s, rgPose: o.pose || p.rgPose, x: p.x * s + x, y: p.y * s + y, s: p.s * Math.max(0.6, s) })), x, y, cx: x, cy: y, ...o });
const bustAtEl = (tpl, x, y, s, o = {}) => ({ pts: tpl.map(p => ({ ...p, rsc: s, x: p.x * s + x, y: p.y * s + y, s: p.s * Math.max(0.6, s) })), x, y, cx: x, cy: y, ...o });
function camAt(t) { // the camera never moves (Parte 3)
  return { x: 0, y: -40, z: 1, r: 0 };
}
function camAtOld(t) {
  const c = { ...CAM0 };
  for (const k of CAMK) { if (t < k.t) break; const p = E[k.e](clamp((t - k.t) / k.d)); c.x = lerp(c.x, k.x, p); c.y = lerp(c.y, k.y, p); c.z = lerp(c.z, k.z, p); c.r = lerp(c.r, k.r, p); }
  c.x += 5 * Math.sin(t * 0.61) + 2.5 * Math.sin(t * 1.37 + 1); c.y += 4 * Math.sin(t * 0.53 + 2) + 2 * Math.sin(t * 1.11); c.r += 0.0022 * Math.sin(t * 0.43 + 0.5);
  for (const tl of PART.tremor) { const u = t - tl; if (u > 0 && u < 0.3) { const amp = 5 * Math.exp(-u * 16); c.x += amp * Math.sin(u * 90); c.y += amp * Math.cos(u * 75); } }
  return c;
}
function glowColour(t) { const [r, g, b] = glowKeys(t), n = 1 - narrAt(t); return [lerp(5, r, n), lerp(5, g, n), lerp(6, b, n)]; }
function drawWorldOverlays(g, t, M) {
  g.setTransform(M[0], M[1], M[2], M[3], M[4], M[5]);
  const mono = (px, w = 700) => `${w} ${px}px 'JetBrains Mono'`;
  for (const [s, x, y, t0, t1, col, px, sp] of PART.lbls) { const p = clamp((t - t0) / 0.35), a = clamp(p * 3) * (1 - ramp(t, t1, 0.25)); if (a > 0) text(g, decode(s, p, (x * 7 + y) | 0), x, y, mono(px || 22), col || '#FFFFFF', a, 'center', sp ?? 4); }
  for (const [t0, t1, ax, ay, lx, ly, label, col, al] of PART.calls) callout(g, t, t0, t1, ax, ay, lx, ly, label, col || '#FFFFFF', al || 'left');
  for (const f of PART.over) f(g, t);
  g.setTransform(1, 0, 0, 1, 0, 0);
}
function drawMediaBG(g, t) { for (const [id, t0, t1, a0, o] of PART.bg) { const a = a0 * ramp(t, t0, 0.4) * (1 - ramp(t, t1 - 0.4, 0.4)); if (a > 0.01) mediaDraw(g, id.endsWith('.jpg') || id.endsWith('.png') ? IMGS[id] : seqImg(id, t), 0, 0, W, H, { a, blur: 1.1, grain: 0.32, br: 0.75, sat: 0.7, ...(o || {}) }); } }
function drawMediaWorld(g, t, M) {
  g.setTransform(M[0], M[1], M[2], M[3], M[4], M[5]);
  for (const m of PART.media) {
    if (t < m.t0 - 0.05 || t > m.t1 + 0.05) continue;
    const on = m.pop ? dropIn(t, m.t0, 0.35) : ramp(t, m.t0, 0.4), a = clamp(on) * (1 - ramp(t, m.t1 - 0.3, 0.3)) * (m.a ?? 1); if (a < 0.01) continue;
    const img = m.seq ? seqImg(m.seq, t) : IMGS[m.img]; const s = m.pop ? 0.8 + 0.2 * clamp(on) : 1, dy = m.bob ? m.bob * Math.sin(t * 1.5 + (m.ph || 0)) : 0, u = t - m.t0;
    let x = m.x, y = m.y + dy; if (m.move) { const q = ramp(t, m.move[0], m.move[1], E.inOut); x += m.move[2] * q; y += m.move[3] * q; }
    g.save(); if (m.glow) { g.shadowColor = m.glow; g.shadowBlur = 36 * a; }
    if (m.quad) mediaQuad(g, img, panel3(x, y, m.z || 0, m.w * s, m.h * s, m.quad[0] + (m.sway || 0) * Math.sin(t * 0.8 + (m.ph || 0)), m.quad[1] || 0.06), { a, stroke: m.stroke, br: m.br ?? 1.08, grain: m.grain ?? 0.24 });
    else mediaDraw(g, img, x - m.w * s / 2, y - m.h * s / 2, m.w * s, m.h * s, { a, r: m.r, contain: m.contain, fade: m.fade, fadeX: m.fadeX, zoom: m.kb ? 1.04 + m.kb * u : undefined, panX: m.kb ? 0.3 * Math.sin(u * 0.8 + (m.ph || 0)) : 0, panY: m.kb ? 0.2 * Math.cos(u * 0.6) : 0, blur: m.blur ?? 0.6, grain: m.grain ?? 0.26, br: m.br ?? 1.0, sat: m.sat ?? 0.95, gray: m.gray ? ramp(t, m.gray, 0.5) * 0.9 : 0 });
    g.restore();
  }
  g.setTransform(1, 0, 0, 1, 0, 0);
}
function events() {
  const ev = [];
  KEYS.slice(1).forEach(k => { if (k.s !== 'void') ev.push({ t: k.t, kind: 'morph', d: k.d + k.st, shape: k.s }); });
  let last = -9; for (const k of KEYS) { const els = ELS[k.s]; if (!els) continue; els.filter(e => e.at !== undefined && e.snd !== false).map(e => e.at).sort((a, b) => a - b).forEach(T => { if (T - last > 0.12) { ev.push({ t: T, kind: 'pop' }); last = T; } }); }
  ev.push(...PART.ev);
  return ev;
}
// keys: [t, name, glow, d, e] ; cams: [t, x, y, z]
function finishPart() {
  PART.keys.forEach(([t, s, gl, d, e]) => KEYS.push({ t, s, d: d || (s === 'void' ? 0.45 : 0.9), st: s === 'void' ? 0.25 : 0.34, e: e || (s === 'void' ? 'quadIn' : 'inOut'), sw: s === 'void' ? 0 : 80, dl: s === 'void' ? 'random' : 'radial', g: gl || {} }));
  KEYS.forEach(k => { if (k.s !== 'void' && !k.fly) k.dl = 'xf'; });
  KEYS.sort((a, b) => a.t - b.t);
  const C = PART.cams.slice().sort((a, b) => a[0] - b[0]);
  C.forEach(([t, x, y, z], k) => { CAMK.push({ t, d: 0.95, x, y, z, r: 0, e: 'inOut' }); const nx = C[k + 1]; if (!nx || nx[0] - t > 1.7) CAMK.push({ t: t + 1.0, d: Math.min(2.6, (nx ? nx[0] : t + 3) - t - 1.05), x: x + 15 * Math.sin(k), y: y - 12, z: z * 1.045, r: 0.005 * Math.sin(k * 1.7), e: 'sine' }); });
}
// subtitles straight from the transcription, keyword colours by meaning
function autoChunks(marks) {
  const norm = s => s.toLowerCase().replace(/[^\p{L}\p{N}%]/gu, '');
  const phr = []; let cur = [];
  WORDS.forEach((x, i) => { cur.push(x); const gap = i + 1 < WORDS.length ? WORDS[i + 1].s - x.e : 9; if (/[.?!,:;]$/.test(x.w) || gap > 0.4) { phr.push(cur); cur = []; } });
  if (cur.length) phr.push(cur);
  phr.forEach(p => { const L = p.reduce((s, x) => s + x.w.length + 1, 0), n = Math.max(Math.ceil(p.length / 5), Math.ceil(L / 26)), size = Math.ceil(p.length / n);
    for (let k = 0; k < p.length; k += size) CHUNKS.push(p.slice(k, k + size).map(x => { const m = marks[norm(x.w)]; return (m || '') + x.w; }).join(' ')); });
}
const MARKS = {};
[['W', 'whatsapp'], ['!', 'dinheiro dono reais preço pagou pagar paga investimento valor centavos vale'], ['+', 'ar garantia volta reembolso vitalício sempre bônus'], ['^', 'ia'], ['~', 'feed whatsapp live assiste assistindo'], ['&', 'golpe fake mentira sozinho gasto perder medo multidão armadilha'],
 ['=', 'construir constrói construindo construiu arquiteto obra projeto sistema aplicativo site'], ['*', 'singularidade arquitetos 7d trilhas aulas ideias mapa biblioteca agentes ambiente acompanhamento centro']]
  .forEach(([m, ws]) => ws.split(' ').forEach(w => (MARKS[w] = m)));


// ═════════════════════════ PARTE 2 — bloco 5 (o arquiteto), bloco 6 (o lado de fora), o pitch até "o centro de tudo"
NARR.push([32.55, 36.45], [66.8, 68.0], [74.4, 80.95], [87.6, 92.75], [137.1, 139.5], [231.1, 235.4], [257.5, 260.1]);
SECTIONS.push([0, '21 · O ARQUITETO'], [41.15, '22 · O LADO DE FORA'], [81.0, '23 · A OFERTA'], [101.35, '24 · O TREINAMENTO'], [133.0, '25 · O EXEMPLO'], [162.1, '26 · O CAMINHO'], [198.2, '27 · O QUE FALTA'], [235.5, '28 · JUNTO']);
autoChunks(MARKS);
const K = (t, s, gl, cam, d) => { PART.keys.push([t, s, gl, d]); if (cam) PART.cams.push([t, ...cam]); };
[[0, 'void'], [32.5, 'void'], [66.75, 'void'], [74.35, 'void'], [87.55, 'void'], [137.05, 'void'], [231.05, 'void'], [257.45, 'void']].forEach(([t, s]) => K(t, s, {}, [0, 0, 1]));
const L = (...a) => PART.lbls.push(a), C = (...a) => PART.calls.push(a), EV = (...a) => PART.ev.push(...a);
const scrollLife = (y0, period, speed, t0) => (t, i, p, b) => { const y = (((p.y - y0 - speed * (t - t0)) % period) + period) % period + y0; b.y[i] = y; b.a[i] = p.a * clamp((330 - Math.abs(y - (y0 + period / 2))) / 50, 0.02) * (b.a[i] > 0.02 ? 1 : 0.02); };
const postsArt = g => { for (let k = 0; k < 5; k++) { const y = -300 + k * 150; g.fillStyle = tone(BL, 0.2); RR(g, -140, y - 60, 280, 120, 16); g.fill(); g.strokeStyle = tone(BL, 0.9); g.lineWidth = 5; RR(g, -140, y - 60, 280, 120, 16); g.stroke(); g.fillStyle = tone(WT, 0.75); RR(g, -120, y - 44, 90, 88, 10); g.fill(); g.fillStyle = tone(WT, 0.85); RR(g, -10, y - 36, 120, 13, 6); g.fill(); RR(g, -10, y - 10, 90, 13, 6); g.fill(); g.fillStyle = tone(PU, 1); RR(g, -10, y + 16, 60, 26, 9); g.fill(); } };

function buildPart() {
  buildTemplates();
  // "E construir exige uma coisa que o feed nunca te dá."
  scene('feedx', [el(g => phoneArt(g), 0, -20, 0.95, { at: 0.3, br: 1.1, dim: [2.7, 0.55] }), el(postsArt, 0, -20, 0.95, { cell: 4, at: 0.4, life: scrollLife(-330, 750, 260, 0.3), tints: [[2.7, GRAY, 0.9]] }),
    el(xArt(90), 0, -20, 1, { at: 2.75, s0: 1.4 })]);
  K(0.25, 'feedx', { blue: 0.6 }, [0, -20, 1.0]); L('UM CAMINHO?', 0, 420, 2.7, 3.5, '#FF7A70', 26);
  // "Um caminho com começo, meio e fim."
  scene('path3', [el(pathArt, 0, 0, 1, { dot: true, reveal: [3.6, 2.0, 'x'], br: 1.2, tints: [[5.6, GREEN, 1]] })]);
  K(3.55, 'path3', { green: 0.3 }, [0, 0, 0.95]); L('COMEÇO', -380, 90, 4.36, 5.95, '#FFFFFF', 22); L('MEIO', 0, 90, 5.06, 5.95, '#FFFFFF', 22); L('FIM', 380, 90, 5.6, 5.95, '#5BE39A', 26);
  // "Imagina uma obra, tijolo, cimento e pedreiro."
  scene('obra', [el(bricksArt, -300, 140, 0.9, { dot: true, at: 7.0, from: [0, -120] }), el(bagArt, 0, 110, 0.85, { dot: true, at: 7.62, from: [0, -120] }), { ...fullAt(300, 60, 1.1), at: 8.2, from: [0, -60], life: null }, el(g => helmet(g, 0, 0, 33), 300, -105, 1, { dot: true, at: 8.2, from: [0, -60] })]);
  K(5.95, 'obra', { orange: 0.4 }, [0, 40, 0.95]); L('TIJOLO', -300, 300, 7.04, 8.7, '#FFB07A'); L('CIMENTO', 0, 300, 7.66, 8.7, '#FFFFFF'); L('PEDREIRO', 300, 300, 8.24, 8.7, '#FFFFFF');
  // "Qualquer um tem acesso."
  scene('access', [el(bricksArt, -170, 60, 0.6, { dot: true }), el(bagArt, 40, 50, 0.55, { dot: true }), { ...fullAt(220, 30, 0.75) },
    { ...crowdEl(11, 3, -470, 470, 280, 450, { m0: 0.8, m1: 1.1 }), life: (t, i, p, b) => { const on = dropIn(t, 8.95 + 0.012 * p.pk, 0.3); b.a[i] = p.a * clamp(on, 0.02) * 0.8; b.t[i] = GRAY; b.y[i] = p.y + 40 * (1 - clamp(on)); } }]);
  K(8.7, 'access', {}, [0, 80, 0.92]);
  // "O que faz a casa ficar de pé é decidir o que vai em cada lugar e em que ordem."
  scene('order', [el(houseBase, 0, 0, 1, { dot: true, at: 10.45, from: [0, -200] }), el(houseWalls, 0, 0, 1, { dot: true, at: 12.6, from: [0, -220] }), el(houseRoof, 0, 0, 1, { dot: true, at: 14.0, from: [0, -240] })]);
  K(10.05, 'order', { orange: 0.3 }, [0, -20, 1.0]); L('1', -260, 250, 10.5, 14.7, '#FFB07A', 40); L('2', -260, 60, 12.65, 14.7, '#FFB07A', 40); L('3', -260, -140, 14.1, 14.7, '#FFB07A', 40);
  // "Esse alguém é o arquiteto."
  scene('arch', [{ ...fullAt(0, 120, 1.6), br: 1.15 }, el(g => { g.fillStyle = LG(g, -70, -14, 70, 14, [[0, tone(BL, 1)], [1, tone(BL, 0.55)]]); RR(g, -100, -18, 200, 36, 18); g.fill(); }, 120, 60, 1, { dot: true, wob: 0.04 })]);
  K(14.7, 'arch', { blue: 0.25 }, [0, 40, 1.05]); C(15.76, 16.6, 30, -100, 230, -260, 'ARQUITETO', '#93BCFF', 'left');
  // "Ele não assenta tijolo."
  scene('notbrick', [{ ...fullAt(-230, 120, 1.3) }, el(bricksArt, 220, 160, 0.75, { dot: true }), el(xArt(150), 220, 140, 1, { at: 17.45, s0: 1.4 })]);
  K(16.6, 'notbrick', { red: 0.2 }, [0, 60, 1.0]);
  // "Ele desenha a casa antes dela existir e dirige a obra."
  scene('draw', [el(blueprintArt, 0, -130, 1, { reveal: [18.15, 2.0, 'x'], br: 1.15 }), { ...fullAt(-330, 300, 0.8) }, { ...fullAt(150, 330, 0.6), at: 20.55, from: [60, 0] }, el(g => helmet(g, 0, 0, 26), 150, 237, 1, { at: 20.55, from: [60, 0] }), { ...fullAt(300, 330, 0.6), at: 20.75, from: [60, 0] }, el(g => helmet(g, 0, 0, 26), 300, 237, 1, { at: 20.75, from: [60, 0] })]);
  K(18.0, 'draw', { blue: 0.5 }, [0, -40, 0.98]); L('DIRIGE A OBRA', 220, 470, 20.6, 21.5, '#FFB07A', 20);
  // "Com a IA é igual. A IA é sua equipe de obra."
  const bots = k => el(botArt, -360 + k * 180, 220, 0.85, { dot: true, at: 23.4 + k * 0.1, bob: 5, ph: k });
  scene('iateam', [TX('IA', 260, WT, { x: 0, y: -260, at: 21.8, br: 1.15 }), ...[0, 1, 2, 3, 4].map(bots)]);
  K(21.5, 'iateam', { blue: 0.3 }, [0, -20, 0.98]); L('SUA EQUIPE DE OBRA', 0, 400, 23.56, 24.3, '#FFB07A', 22);
  // "Trabalha mais rápido que qualquer outra e constrói o que você mandar."
  scene('fast', [...[0, 1, 2, 3, 4, 5].map(k => el(g => cubeC(g, 0, 0, 120, WT, 0.85 + 0.02 * k), 0, 260 - k * 62, 1, { dot: true, at: 24.9 + k * 0.22, from: [0, -150], pd: 0.25, tints: [[26.4, GOLD, 0.6]] })),
    el(botArt, -330, 300, 0.7, { dot: true, bob: 10, bobf: 9 }), el(botArt, 330, 300, 0.7, { dot: true, bob: 10, bobf: 9, ph: 2 }),
    flowEl(500, [-330, 220], [0, -40], 24.6, 27.4, { glyphs: '-=>', tint: ORANGE, speed: 2.2, arc: 40, spread: 60 }), flowEl(500, [330, 220], [0, -40], 24.6, 27.4, { glyphs: '-=<', tint: ORANGE, speed: 2.2, arc: 40, spread: 60 })]);
  K(24.35, 'fast', { orange: 0.4 }, [0, 0, 0.95]); EV({ t: 24.9, kind: 'knocks', n: 6, step: 0.22 });
  // "Só que equipe nenhuma escolhe qual casa construir."
  scene('which', [...[0, 1, 2].map(k => el(silArt(k), -310 + k * 310, -80, 0.9, { dot: true, at: 28.5 + k * 0.2, tints: [[28.4, GRAY, 0.7]] })), ...[0, 1, 2].map(k => el(botArt, -200 + k * 200, 330, 0.55, { dot: true, tints: [[27.6, GRAY, 0.8]] }))]);
  K(27.55, 'which', {}, [0, 0, 0.95]); [0, 1, 2].forEach(k => L('?', -310 + k * 310, -320, 29.4 + k * 0.15, 30.6, '#FFB07A', 70));
  // "Quem escolhe é o arquiteto."
  scene('choose', [...[0, 1, 2].map(k => el(silArt(k), -310 + k * 310, -100, 0.9, { dot: true, tints: k === 1 ? [[31.6, GREEN, 0.85]] : [[30.7, GRAY, 1]], dim: k === 1 ? undefined : [31.6, 0.5], flash: k === 1 ? [31.76] : undefined })), { ...fullAt(0, 290, 0.9), br: 1.2 }]);
  K(30.6, 'choose', { green: 0.3 }, [0, -20, 1.0]); EV({ t: 31.76, kind: 'chime' });
  // "Precisa saber o que vale a pena construir."
  scene('worth', [...[0, 1, 2, 3, 4].map(k => el(cardArt(200, 260), -400 + k * 200, -40 + 30 * Math.abs(k - 2), 0.9, { dot: true, at: 36.7 + k * 0.08, tints: k === 2 ? [[37.7, GREEN, 0.8]] : [[37.6, GRAY, 0.9]], dim: k === 2 ? undefined : [37.7, 0.5], flash: k === 2 ? [37.75] : undefined, moves: k === 2 ? [[37.7, 0.5, 0, -60, 0.15]] : undefined })), TX('$', 120, GN, { x: 0, y: -330, at: 37.75, tint: GREEN })]);
  K(36.5, 'worth', { green: 0.35 }, [0, -30, 1.0]); L('VALE A PENA', 0, 230, 37.8, 39.1, '#5BE39A', 24);
  // "E isso quase ninguém te mostra."
  scene('hidden', [el(doorArt, 0, -40, 1, { dot: true, br: 1.1 }), flowEl(700, [0, -40], [0, -40], 39.3, 41.2, { glyphs: '·•*', tint: GOLD, speed: 0.6, arc: 0, jit: 260, size: 0.35 }), { ...crowdEl(9, 2, -440, 440, 380, 460, { m0: 0.9, m1: 1.1 }), life: (t, i, p, b) => { b.t[i] = GRAY; b.a[i] = p.a * 0.5; } }]);
  K(39.2, 'hidden', { gold: 0.3 }, [0, 0, 1.0]); L('QUASE NINGUÉM TE MOSTRA', 0, -360, 39.9, 41.1, '#F5CB62', 22);
  // "Enquanto a multidão briga pelo mesmo dinheiro dentro do feed, tem dinheiro do lado de fora com muita pouca gente olhando."
  scene('inout', [el(g => phoneArt(g), -170, -40, 0.95, { br: 1.1 }), { ...crowdEl(7, 6, -290, -50, -280, 200, { m0: 0.75, m1: 0.95 }), life: (t, i, p, b) => { const k = ramp(t, 42.2, 0.4) * (1 - ramp(t, 44.0, 0.4)); b.x[i] = p.x + (1 + 3 * k) * Math.sin(t * 41 + p.pk); b.t[i] = hash(p.pk, 9) < 0.5 * k ? RED : GRAY; b.a[i] = p.a * 0.9; } },
    TX('$', 110, GN, { x: -170, y: -60, tint: GREEN, pulse: 0.05 }), ...[0, 1, 2, 3, 4].map(k => el(coin$(40), 230 + 110 * Math.cos(k * 1.3), 60 + 260 * Math.sin(k * 2.1) * 0.6, 1, { at: 44.6 + k * 0.12, bob: 8, ph: k, money: true })), { ...bustAtEl(B45, 330, 330, 1), at: 46.6 }]);
  K(41.15, 'inout', { blue: 0.35, green: 0.2 }, [40, 0, 0.95]); L('DENTRO DO FEED', -170, 420, 43.4, 47.8, '#93BCFF', 20); L('LADO DE FORA', 300, -330, 45.1, 47.8, '#5BE39A', 22);
  // "No feed, milhões de pessoas fazem a mesma coisa ao mesmo tempo e sobra pouco pra cada uma."
  const GRID = []; for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) GRID.push([-375 + c * 150, -150 + r * 130]);
  scene('split', [...GRID.map(([x, y], k) => el(cardArt(110, 100), x, y, 1, { at: 48.5 + 0.02 * k, pd: 0.2, tints: [[49.4, BLUE, 0.7]] })), TX('$', 160, GN, { x: 0, y: -380, tint: GREEN, out: 52.0 }),
    flowEl(720, [0, -380], k => GRID[k % 24], 51.7, 53.2, { glyphs: '·.', tint: GREEN, speed: 1.2, arc: 30, size: 0.3 })]);
  K(47.85, 'split', { blue: 0.5 }, [0, -40, 0.95]); L('SOBRA POUCO PRA CADA UM', 0, 420, 52.0, 53.2, '#FF7A70', 20);
  // "E essa multidão só cresce."
  scene('grow', [{ ...crowdEl(15, 8, -520, 520, -380, 420, { m0: 0.65, m1: 1.0 }), life: (t, i, p, b) => { const on = dropIn(t, 53.3 + 0.008 * p.pk, 0.25); b.a[i] = p.a * clamp(on, 0.02) * 0.85; b.t[i] = GRAY; } }]);
  K(53.2, 'grow', {}, [0, 0, 1.12]); PART.cams.push([53.7, 0, 0, 0.82]);
  // "Do lado de fora, quase ninguém tá construindo."
  scene('outside', [el(g => { g.fillStyle = tone(WT, 0.4); g.fillRect(-520, 0, 1040, 6); }, 0, 330, 1, {}), ...[0, 1, 2].map(k => el(g => cubeC(g, 0, 0, 70, WT, 0.9), 230, 270 - k * 38, 1, { dot: true, at: 55.6 + k * 0.3, from: [0, -80], tints: [[55.6, ORANGE, 0.8]] })), { ...fullAt(110, 230, 0.6) }]);
  K(54.75, 'outside', { green: 0.2 }, [0, 100, 0.95]); L('LADO DE FORA', 0, -300, 54.9, 57.3, '#5BE39A', 26); L('QUASE NINGUÉM', -250, 120, 55.9, 57.3, '#A0A0AA', 20);
  // "Porque a maioria ainda acha que isso é coisa de programador."
  scene('coder', [TX('</>', 260, WT, { x: 0, y: -150, at: 57.9, br: 1.1 }), { ...crowdEl(11, 3, -460, 460, 230, 430), life: (t, i, p, b) => { b.t[i] = GRAY; b.a[i] = p.a * 0.75; } }]);
  K(57.4, 'coder', { red: 0.2 }, [0, 0, 0.98]); L('COISA DE PROGRAMADOR', 0, 30, 59.2, 61.6, '#FF7A70', 24);
  // "E você já viu que não é."
  scene('notcoder', [TX('</>', 260, WT, { x: 0, y: -150, tints: [[60.4, GRAY, 0.8]], dim: [60.5, 0.4], moves: [[60.6, 0.6, 0, 120, -0.2, 'quadIn']] }), el(g => { g.strokeStyle = tone(RD, 1); g.lineWidth = 26; g.beginPath(); g.moveTo(-280, -40); g.lineTo(280, -260); g.stroke(); }, 0, 0, 1, { reveal: [60.4, 0.3, 'x'] }), el(checkArt, 0, 230, 1.4, { dot: true, at: 61.1 })]);
  K(60.25, 'notcoder', { green: 0.25 }, [0, 0, 1.0]);
  // "A partir de agora, você enxerga o que a multidão não enxerga."
  scene('see', [el(lidArt(0, 0), 0, -230, 1.5, { dot: true, cell: 3, br: 1.2 }), el(irisArt(0, 0), 0, -230, 1.5, { dot: true, cell: 3, at: 62.9, s0: 0.2 }), { ...crowdEl(11, 3, -460, 460, 220, 420), life: (t, i, p, b) => { b.t[i] = GRAY; b.a[i] = p.a * 0.55; } }]);
  K(61.6, 'see', { green: 0.15 }, [0, -60, 1.0]); L('VOCÊ ENXERGA', 0, -20, 62.9, 65.0, '#FFFFFF', 24);
  // "E isso é uma vantagem enorme."
  scene('adv', [{ ...fullAt(330, 160, 1.0), tints: [[65.6, GREEN, 0.7]], br: 1.2 }, { ...crowdEl(6, 3, -470, -120, 120, 300, { m0: 0.85, m1: 1.0 }), life: (t, i, p, b) => { b.t[i] = GRAY; b.a[i] = p.a * 0.6; } }, el(g => { g.fillStyle = tone(GN, 1); RR(g, -200, -10, 360, 20, 10); g.fill(); poly(g, [[160, -40], [220, 0], [160, 40]]); g.fill(); }, 70, -60, 1, { reveal: [65.6, 0.6, 'x'] })]);
  K(65.0, 'adv', { green: 0.35 }, [100, 0, 1.0]); L('VANTAGEM', 70, -130, 65.64, 66.7, '#5BE39A', 26);
  // "Quem só enxerga e não faz nada, continua igual à multidão."
  scene('still', [{ ...fullAt(0, 80, 1.1), tints: [[70.3, GRAY, 1]], dim: [70.3, 0.3] }, el(lidArt(0, 0), 0, -170, 0.35, { dot: true }), { ...crowdEl(13, 4, -500, 500, -60, 360, { m0: 0.8, m1: 1.1 }), life: (t, i, p, b) => { const on = ramp(t, 69.3 + 0.004 * p.pk, 0.5); b.a[i] = p.a * clamp(on, 0.02) * 0.65; b.t[i] = GRAY; } }]);
  K(68.1, 'still', {}, [0, 40, 1.05]); L('NÃO FAZ NADA', 0, -300, 69.1, 71.2, '#FF7A70', 22);
  // "Com a informação na cabeça e o bolso do mesmo jeito."
  scene('headpocket', [el(brainArt, -230, -100, 0.75, { dot: true, tints: [[71.6, BLUE, 0.8]] }), el(walletFlat, 230, 60, 0.75, { dot: true, at: 72.9, tints: [[73.4, RED, 0.25]] })]);
  K(71.3, 'headpocket', { blue: 0.3 }, [0, 0, 1.0]); L('R$ 0,00', 230, 260, 73.4, 74.3, '#FF7A70', 40);
  // "Só que antes de te falar do preço… quem sai ganhando muito mais, é você."
  const tilt = (t) => -0.28 * ramp(t, 85.4, 0.9, E.backOut);
  const beamLife = (t, i, p, b) => { const a = tilt(t), dx = b.x[i], dy = b.y[i] + 100; b.x[i] = dx * Math.cos(a) - dy * Math.sin(a); b.y[i] = -100 + dx * Math.sin(a) + dy * Math.cos(a); };
  scene('scale', [el(scaleArt, 0, 60, 1, { dot: true }), el(beamArt, 0, -100, 1, { dot: true, life: beamLife }), el(tagArt(GD), -290, -20, 0.6, { dot: true, at: 82.2, life: beamLife }),
    ...[0, 1, 2, 3].map(k => el(g => cubeC(g, 0, 0, 40, GN, 0.9), 290 + (k % 2) * 46 - 23, -10 - Math.floor(k / 2) * 40, 1, { dot: true, at: 84.6 + k * 0.15, life: beamLife }))]);
  K(81.0, 'scale', { green: 0.3 }, [0, 0, 1.0]); L('PREÇO', -290, 200, 82.3, 87.5, '#F5CB62', 20); L('VOCÊ', 290, 200, 87.0, 87.5, '#5BE39A', 26); EV({ t: 85.4, kind: 'thud' });
  // "Um projeto seu no ar em 7 dias."
  const launch = t => ramp(t, 96.05, 1.0, E.quadIn);
  scene('launch', [el(rocketArt, 0, -60, 1, { dot: true, br: 1.15, life: (t, i, p, b) => { b.y[i] -= 700 * launch(t); b.x[i] += 3 * Math.sin(t * 50) * ramp(t, 95.6, 0.3) * (1 - launch(t)); } }), el(flameArt, 0, 130, 0.9, { at: 95.7, life: (t, i, p, b) => { b.y[i] -= 700 * launch(t); b.a[i] *= 0.7 + 0.3 * Math.sin(t * 30 + p.x); } }),
    ...[0, 1, 2, 3, 4, 5, 6].map(k => el(tileArt(0, true), -390 + k * 130, 360, 0.75, { at: 94.95 + k * 0.27, pd: 0.2, tints: [[96.1, GREEN, 1]] }))]);
  K(92.85, 'launch', { orange: 0.3, green: 0.2 }, [0, 40, 0.95]); [0, 1, 2, 3, 4, 5, 6].forEach(k => L(`D${k + 1}`, -390 + k * 130, 360, 95.0 + k * 0.27, 97.2, '#050506', 18, 2)); L('NO AR', 0, -350, 96.2, 97.2, '#5BE39A', 44, 8); EV({ t: 96.05, kind: 'wave', d: 1.4 }, { t: 96.1, kind: 'impact' });
  // "E se ele não estiver no ar em 7 dias, eu te devolvo o que você pagou."
  scene('guarantee', [el(sealArt(GN), 0, -140, 1.1, { dot: true, at: 97.5, br: 1.15 }), el(walletFlat, 0, 330, 0.5, { dot: true, at: 99.5 }), flowEl(400, [0, -100], [0, 330], 99.7, 101.2, { speed: 1.4, arc: 60 })]);
  K(97.3, 'guarantee', { green: 0.45 }, [0, 0, 1.0]); L('GARANTIA', 0, 90, 97.9, 101.2, '#5BE39A', 30, 8); L('DEVOLVO', 0, 470, 99.9, 101.2, '#FFFFFF', 22);
  // "O treinamento se chama Arquitetos da Singularidade."
  scene('title', [TX('ARQUITETOS', 150, WT, { y: -120, at: 102.5, br: 1.2, flash: [102.6] }), TX('DA SINGULARIDADE', 92, WT, { y: 40, at: 103.55, br: 1.2, tints: [[103.6, GOLD, 0.35]] }), flowEl(900, [0, -40], [0, -40], 102.4, 104.4, { glyphs: '·*+', tint: WHITE, speed: 0.5, arc: 0, jit: 900, size: 0.3 })]);
  K(101.35, 'title', { gold: 0.35 }, [0, -40, 1.0]); EV({ t: 102.5, kind: 'impact' }, { t: 103.6, kind: 'bloom' });
  // "E ele começa pelo Arquiteto 7D. O seu primeiro passo."
  scene('d7', [TX('7D', 360, GN, { y: -140, at: 106.1, tint: GREEN, br: 1.2, flash: [106.2] }), ...[0, 1, 2, 3].map(k => el(stepColArt(k, 50), -270 + k * 180, 330, 1, { dot: true, tints: k === 0 ? [[107.0, GREEN, 1]] : [], dim: k ? [107.0, 0.5] : undefined })), { ...fullAt(-270, 222, 0.38), at: 107.0 }]);
  K(104.45, 'd7', { green: 0.45 }, [0, 0, 0.98]); L('ARQUITETO', 0, 70, 105.4, 107.8, '#FFFFFF', 26, 8); L('O PRIMEIRO PASSO', -270, 440, 107.0, 107.8, '#5BE39A', 20);
  // "Nele, começando do zero, você constrói o seu primeiro projeto e coloca no ar."
  scene('zero', [el(browserArt, 0, -120, 1.05, { reveal: [108.6, 3.2, 'y'], br: 1.15 }), el(barArt(760), 0, 220, 1, {}), el(barFill(760, GN), 0, 220, 1, { life: (t, i, p, b) => { if (p.x > -368 + 736 * ramp(t, 109.1, 3.0, E.inOut)) b.a[i] = 0.02; } })]);
  K(107.9, 'zero', { green: 0.3 }, [0, 0, 0.98]); PART.over.push((g, t) => { if (t > 108.9 && t < 112.6) { const v = Math.round(100 * ramp(t, 109.1, 3.0, E.inOut)); text(g, `${v}%`, 0, 300, `700 34px 'JetBrains Mono'`, v === 100 ? '#5BE39A' : '#FFFFFF', ramp(t, 109, 0.2) * (1 - ramp(t, 112.3, 0.2)), 'center', 4); } }); L('NO AR', 0, -360, 112.2, 112.6, '#5BE39A', 40, 8);
  // "Você escolhe o que construir. Um site, um aplicativo, um sistema."
  scene('choose3', [...[-330, 0, 330].map(x => el(g => { g.strokeStyle = tone(WT, 0.7); g.lineWidth = 5; g.setLineDash([14, 10]); RR(g, -140, -190, 280, 380, 22); g.stroke(); g.setLineDash([]); }, x, -40, 1, { at: 112.8 + (x + 330) / 1500, out: 114.3 + (x + 330) / 600 })), el(browserArt, -330, -40, 0.55, { at: 114.35 }), el(g => phoneArt(g, { body: OR, screen: appScreen }), 0, -40, 0.55, { at: 114.95 }), el(dashArt(), 330, -40, 0.42, { at: 115.9 })]);
  K(112.55, 'choose3', { orange: 0.25 }, [0, 0, 0.92]); L('SITE', -330, 160, 114.4, 116.3, '#FFFFFF', 22); L('APLICATIVO', 0, 200, 114.98, 116.3, '#FFB07A', 22); L('SISTEMA', 330, 160, 115.94, 116.3, '#FFFFFF', 22);
  // "Faz uma conta comigo. Quanto tempo você passa só rolando o feed?"
  scene('scroll2', [el(g => phoneArt(g), -150, -20, 0.85, { br: 1.1 }), el(postsArt, -150, -20, 0.85, { cell: 4, life: scrollLife(-330, 750, 700, 116.3) }), el(clockArt, 260, -80, 0.6, { dot: true, at: 118.0 }), el(handArt(170, 16), 260, -80, 0.6, { at: 118.0, spin: 9, cx: 260, cy: -80 }), el(handArt(110, 24), 260, -80, 0.6, { at: 118.0, spin: 0.8, cx: 260, cy: -80 })]);
  K(116.3, 'scroll2', { blue: 0.5 }, [0, 0, 0.98]);
  // "Se for só meia hora por dia, num ano, são mais de 180 horas."
  scene('h180', [TX('180 H', 280, WT, { y: -80, at: 123.45, br: 1.2, flash: [123.5], tints: [[124.0, RED, 0.5]] }), el(hgFrame, 0, 300, 0.4, { dot: true }), el(hgSand, 0, 300, 0.4, { dot: true })]);
  K(120.55, 'h180', { red: 0.3 }, [0, 0, 1.0]); PART.over.push((g, t) => { if (t > 120.8 && t < 123.5) { const v = Math.round(182 * ramp(t, 120.9, 2.5, E.cubicOut)); text(g, String(v) + ' H', 0, -80, "700 120px 'JetBrains Mono'", '#FFFFFF', ramp(t, 120.8, 0.2) * (1 - ramp(t, 123.3, 0.2)), 'center', 4); } }); L('30 MIN × 365 DIAS', 0, -330, 121.2, 125.0, '#FFFFFF', 26, 4); L('POR ANO, SÓ ROLANDO O FEED', 0, 80, 123.8, 125.0, '#FF7A70', 20); EV({ t: 123.5, kind: 'impact' });
  // "No 7D, pede 14, em média. Isso dá em torno de duas horas por dia, durante uma semana."
  scene('vs14', [el(g => { g.fillStyle = LG(g, -60, 0, 60, 0, [[0, tone(WT, 0.4)], [0.5, tone(WT, 0.8)], [1, tone(WT, 0.4)]]); g.fillRect(-60, -520, 120, 520); }, -230, 260, 1, { reveal: [125.1, 0.6, '-y'], tints: [[125.1, GRAY, 1]] }),
    el(g => { g.fillStyle = LG(g, -60, 0, 60, 0, [[0, tone(GN, 0.55)], [0.5, tone(GN, 1)], [1, tone(GN, 0.5)]]); g.fillRect(-60, -60, 120, 60); }, 230, 260, 1, { at: 125.9 }),
    ...[0, 1, 2, 3, 4, 5, 6].map(k => el(tileArt(0, true), -390 + k * 130, 430, 0.6, { at: 128.1 + k * 0.23, pd: 0.2, tints: [[128.1, GREEN, 1]] }))]);
  K(125.0, 'vs14', { green: 0.3 }, [0, 60, 0.95]); L('180 H', -230, -300, 125.2, 130.3, '#A0A0AA', 30); L('FEED', -230, 320, 125.2, 130.3, '#A0A0AA', 20); L('14 H', 230, 150, 125.94, 130.3, '#5BE39A', 34); L('7D', 230, 320, 125.94, 130.3, '#5BE39A', 22); [0, 1, 2, 3, 4, 5, 6].forEach(k => L('2H', -390 + k * 130, 430, 128.15 + k * 0.23, 130.3, '#050506', 16, 1));
  // "E no fim dela, você tem uma coisa sua no ar."
  scene('yours', [el(browserArt, 0, -80, 1.0, { br: 1.15, tints: [[131.6, GREEN, 0.3]], pulse: 0.01 }), el(sealArt(GN), 0, 270, 0.45, { dot: true, at: 132.7 })]);
  K(130.35, 'yours', { green: 0.4 }, [0, 0, 1.0]); L('SUA', 0, -320, 131.9, 133.0, '#5BE39A', 34, 8); L('NO AR', 0, 410, 132.75, 133.0, '#5BE39A', 28, 8);
  // "E tudo isso dá pra fazer pelo celular, sem pagar nenhuma ferramenta."
  scene('phone0', [el(g => phoneArt(g, { body: OR, screen: appScreen }), 0, -40, 0.8, { br: 1.1 }), ...[0, 1, 2, 3].map(k => el(tagArt(GD), [-330, 330, -330, 330][k], [-250, -250, 170, 170][k], 0.55, { dot: true, at: 134.0 + k * 0.12, tints: [[135.3, GRAY, 1]], dim: [135.3, 0.4] })), ...[0, 1, 2, 3].map(k => el(xArt(60), [-330, 330, -330, 330][k], [-250, -250, 170, 170][k], 1, { at: 135.4 + k * 0.08 }))]);
  K(133.0, 'phone0', { orange: 0.3 }, [0, -20, 0.98]); L('R$ 0', 0, 400, 135.5, 137.0, '#5BE39A', 40, 6);
  // "Lembra da pergunta do começo? Quanto sai do seu bolso todo mês?"
  scene('bolso2', [el(walletFlat, 0, -60, 0.95, { dot: true, br: 1.1 }), flowEl(700, [0, 40], [0, 600], 141.4, 143.2, { speed: 1.4, arc: -40, spread: 300 }), el(calArt, 340, -320, 0.55, { dot: true, at: 142.5 })]);
  K(139.6, 'bolso2', { red: 0.2 }, [0, 0, 1.0]); L('TODO MÊS', 340, -170, 142.6, 143.2, '#FF7A70', 20);
  // "Eu pedi pra IA um aplicativo que responde isso."
  scene('askia', [el(g => phoneArt(g), 0, 40, 0.85, { br: 1.1 }), el(appFinArt, 0, 40, 0.85, { reveal: [144.2, 1.5, 'y'] }), TX('IA', 120, WT, { x: -330, y: -380, at: 143.7 })]);
  K(143.15, 'askia', { blue: 0.2 }, [0, 0, 0.98]); PART.over.push((g, t) => { if (t > 143.2 && t < 145.9) { const s = 'crie um app que mostra pra onde vai o meu dinheiro', n = Math.floor(clamp((t - 143.3) / 1.2) * s.length), a = ramp(t, 143.25, 0.2) * (1 - ramp(t, 145.6, 0.25)); g.globalAlpha = a; g.fillStyle = 'rgba(147,188,255,0.18)'; RR(g, -430, -330, 640, 90, 22); g.fill(); g.globalAlpha = 1; text(g, s.slice(0, n), -405, -285, `500 22px 'JetBrains Mono'`, '#E6E6EA', a, 'left', 0); } });
  // "Você anota o que entra e o que sai. E ele te mostra pra onde o seu dinheiro está indo."
  scene('finapp', [el(g => phoneArt(g), 0, -10, 1.0, { br: 1.1 }), el(appFinArt, 0, -10, 1.0, { br: 1.15 })]);
  K(145.9, 'finapp', { green: 0.3 }, [0, -10, 1.05]); L('ENTRA', -330, 120, 146.8, 150.4, '#5BE39A', 24); L('SAI', -330, 190, 147.5, 150.4, '#FF7A70', 24); C(148.3, 150.4, 60, -70, 330, -250, 'PRA ONDE VAI', '#FFFFFF', 'right');
  // "Levou 43 minutos pra ficar pronto, sem computador, sem programar nada, e está no ar."
  scene('min43', [TX('43 MIN', 230, GN, { y: -250, at: 150.9, tint: GREEN, br: 1.2, flash: [151.0] }), el(laptopArt(0, 0, 1.8), -230, 170, 1, { at: 153.2 }), el(xArt(110), -230, 140, 1, { at: 153.5 }), TX('</>', 140, WT, { x: 230, y: 150, at: 154.2 }), el(xArt(110), 230, 150, 1, { at: 154.6 })]);
  K(150.5, 'min43', { green: 0.4 }, [0, -40, 1.0]); L('NO AR', 0, 430, 155.5, 156.2, '#5BE39A', 40, 8); EV({ t: 150.95, kind: 'impact' });
  // "É esse tipo de coisa que você constrói no Arquiteto 7D. E esse, do exemplo, é um dos mais simples."
  scene('simple', [el(g => phoneArt(g), -380, 160, 0.38, { br: 1.1, flash: [161.1] }), el(browserArt, -60, 40, 0.42, { at: 157.5 }), el(dashArt(), 200, -100, 0.45, { at: 158.3 }), el(botArt, 380, -270, 0.8, { dot: true, at: 159.1 })]);
  K(156.2, 'simple', { green: 0.2 }, [0, 0, 0.95]); C(160.9, 162.0, -380, 40, -300, -140, 'O MAIS SIMPLES', '#5BE39A', 'left');
  // "você aprende a transformar ele em dinheiro."
  scene('money', [el(g => phoneArt(g, { body: OR, screen: appScreen }), -260, 0, 0.6, {}), flowEl(500, [-180, 0], [260, 0], 164.0, 167.6, { glyphs: '-=>', tint: GREEN, speed: 1.6, arc: 30 }), TX('$', 300, GN, { x: 260, y: 0, at: 167.0, tint: GREEN, flash: [167.1] })]);
  K(162.1, 'money', { green: 0.45 }, [0, 0, 1.0]);
  // "Como achar quem precisa dele, quanto cobrar e como receber todo mês. E não só uma vez."
  scene('howto', [el(targetArt, -320, -60, 0.9, { at: 167.7 }), el(tagArt(GN), 0, -60, 0.85, { dot: true, at: 169.15 }), el(calArt, 320, -60, 0.8, { dot: true, at: 170.1 }), flowEl(400, [0, 380], [320, -60], 170.5, 172.7, { speed: 1.8, arc: 60, spread: 400 })]);
  K(167.55, 'howto', { green: 0.3 }, [0, 0, 0.95]); L('ACHAR', -320, 120, 167.8, 172.7, '#FFFFFF', 20); L('COBRAR', 0, 120, 169.2, 172.7, '#5BE39A', 20); L('TODO MÊS', 320, 120, 170.6, 172.7, '#5BE39A', 20); L('E NÃO SÓ UMA VEZ', 0, 330, 171.6, 172.7, '#F5CB62', 22);
  // "cinco trilhas, com mais de 90 aulas… até um sistema completo de agentes de IA que trabalham sozinho pra você."
  scene('tracks', [el(railsArt, 0, 60, 0.95, { reveal: [173.0, 1.6, 'y'], br: 1.3 }), el(botArt, -130, -420, 0.55, { dot: true, at: 179.3, bob: 8 }), el(botArt, 130, -420, 0.55, { dot: true, at: 179.5, bob: 8, ph: 2 })]);
  K(172.8, 'tracks', { blue: 0.25 }, [0, 0, 0.92]); L('5 TRILHAS', 0, 430, 174.4, 181.9, '#FFFFFF', 28, 6); L('90+ AULAS', 0, 480, 175.5, 181.9, '#93BCFF', 22); L('AGENTES DE IA', 0, -300, 179.4, 181.9, '#93BCFF', 20);
  // "Cada aula tem um material de apoio personalizado do lado e termina com uma tarefa."
  scene('lesson', [el(lessonArt, 0, -60, 1.1, { br: 1.1 }), el(checkArt, 240, 180, 1.2, { dot: true, at: 186.4 })]);
  K(181.95, 'lesson', { blue: 0.2 }, [0, -20, 1.0]); C(183.7, 186.9, 260, -100, 330, -330, 'MATERIAL DE APOIO', '#FFFFFF', 'right'); L('TAREFA', 240, 320, 186.5, 186.95, '#5BE39A', 22);
  // "Aqui você não só assiste, você sai com algo pronto."
  scene('done', [el(g => { sphere(g, 0, 0, 120, WT, 0.95); g.fillStyle = VOID; poly(g, [[-36, -60], [64, 0], [-36, 60]]); g.fill(); }, -230, -40, 1, { dim: [188.4, 0.6] }), el(houseWalls, 230, -60, 0.8, { dot: true, at: 189.2 }), el(houseRoof, 230, -60, 0.8, { dot: true, at: 189.35 }), el(checkArt, 230, 230, 0.9, { dot: true, at: 189.6 })]);
  K(187.0, 'done', { green: 0.3 }, [0, 0, 1.0]); L('ASSISTE', -230, 170, 187.8, 190.1, '#A0A0AA', 20); L('PRONTO', 230, 340, 189.6, 190.1, '#5BE39A', 24);
  // "O acesso é vitalício. Pagou uma vez, é seu pra sempre."
  scene('forever', [el(infArt, 0, -60, 1, { dot: true, reveal: [190.4, 1.0, 'x'], br: 1.2 })]);
  K(190.15, 'forever', { green: 0.45 }, [0, -20, 1.0]); L('VITALÍCIO', 0, 170, 191.0, 193.9, '#5BE39A', 34, 8); L('PAGOU UMA VEZ', 0, 230, 192.0, 193.9, '#FFFFFF', 20);
  // "Quando sai aula nova, entra no seu acesso sem você pagar de novo."
  scene('newclass', [el(g => { g.strokeStyle = tone(WT, 0.9); g.lineWidth = 6; RR(g, -330, -120, 660, 400, 24); g.stroke(); }, 0, 140, 1, {})]);
  K(193.9, 'newclass', { blue: 0.25 }, [0, 0, 0.98]); [1, 3, 5].forEach((wk, k) => PART.media.push({ img: `week${wk}.jpg`, t0: 194.2 + k * 0.45, t1: 198.2, x: -200 + k * 200, y: 140, w: 190, h: 107, r: 8, pop: true, glow: 'rgba(147,188,255,0.7)', move: [194.2 + k * 0.45, 0.6, 0, 0] })); L('AULA NOVA', 0, -150, 194.5, 198.2, '#93BCFF', 26, 6); L('SEM PAGAR DE NOVO', 0, 420, 196.5, 198.2, '#5BE39A', 22);
  // "Agora, a parte que mais importa."
  scene('focus', [{ pts: [...Array(1600)].map((_, k) => { const v = hash(k, 1), w = (hash(k, 2) - 0.5) * 2; return { x: w * lerp(30, 340, v), y: -640 + 900 * v, a: 0.2 + 0.2 * hash(k, 3), c: pick('.·:', hash(k, 4)), t: WHITE, s: 0.45 }; }), x: 0, y: 0, cx: 0, cy: 0 }, el(g => { g.strokeStyle = tone(GD, 1); g.lineWidth = 8; g.beginPath(); g.ellipse(0, 0, 220, 60, 0, 0, 7); g.stroke(); }, 0, 270, 1, { at: 199.6, pulse: 0.05 })]);
  K(198.2, 'focus', { gold: 0.3 }, [0, 60, 1.05]); L('A PARTE QUE MAIS IMPORTA', 0, -370, 199.1, 200.5, '#F5CB62', 24);
  // "Conteúdo sobre IA tem de graça aos montes."
  scene('free', []);
  K(200.5, 'free', { blue: 0.3 }, [0, 0, 0.95]); [1, 2, 3, 4, 5, 6, 7, 8].forEach((wk, k) => PART.media.push({ img: `week${wk}.jpg`, t0: 201.0 + k * 0.1, t1: 203.3, x: -300 + (k % 3) * 300 + (Math.floor(k / 3) % 2) * 150, y: 230 - Math.floor(k / 3) * 150, w: 260, h: 146, r: 8, pop: true, quad: [(k % 2 ? 0.3 : -0.3), 0.15], ph: k, sway: 0.08 })); L('DE GRAÇA', 0, -330, 202.0, 203.3, '#5BE39A', 34, 8); L('AOS MONTES', 0, -270, 202.6, 203.3, '#FFFFFF', 22);
  // "Se conteúdo bastasse, o feed já teria colocado dinheiro no seu bolso."
  scene('feedpocket', [el(g => phoneArt(g), 0, -280, 0.5, { br: 1.1 }), el(postsArt, 0, -280, 0.5, { cell: 4, life: scrollLife(-330, 750, 400, 203.3) }), el(walletFlat, 0, 260, 0.75, { dot: true, at: 205.5, tints: [[206.9, RED, 0.3]] }), flowEl(300, [0, -100], [0, 160], 205.8, 207.4, { speed: 1.2, arc: 0, jit: 120, size: 0.35, glyphs: '·.' })]);
  K(203.25, 'feedpocket', { red: 0.2 }, [0, 0, 1.0]); L('R$ 0,00', 0, 450, 207.0, 207.5, '#FF7A70', 34);
  // "O que te falta é outra coisa. E eu já te falei qual é."
  scene('missing', [el(puzzleArt, 0, -40, 1, { dot: true, br: 1.1 })]);
  K(207.5, 'missing', { gold: 0.2 }, [0, -20, 1.0]); PART.over.push((g, t) => { if (t > 208.4 && t < 210.9) { const a = ramp(t, 208.5, 0.3) * (1 - ramp(t, 210.6, 0.25)) * (0.6 + 0.4 * Math.sin(t * 6)); g.globalAlpha = a; g.strokeStyle = '#F5CB62'; g.lineWidth = 5; g.strokeRect(75, -115, 150, 150); g.globalAlpha = 1; } }); L('O QUE FALTA', 150, 160, 208.6, 210.8, '#F5CB62', 22);
  // "Sozinho, quase ninguém começa. E quem começa, quase nunca chega ao fim."
  scene('alone3', [el(g => { g.fillStyle = tone(WT, 0.5); RR(g, -440, -4, 880, 8, 4); g.fill(); }, 0, 140, 1, {}), el(flagArt, 430, 140, 1.1, { dot: true }), { ...crowdEl(4, 3, -460, -330, 0, 120, { m0: 0.9, m1: 1.0 }), life: (t, i, p, b) => { b.t[i] = GRAY; b.a[i] = p.a * 0.7; } },
    ...[0, 1, 2].map(k => ({ ...fullAt(-300, 60, 0.35, { side: true, pose: t => { const D = [400, 280, 520][k], t0 = 212.8 + k * 0.15; return walkAt(u => [D * E.cubicOut(ramp(u, t0, 1.5)), 0, 0.32], t0, t, 'side'); } }), life: (t, i, p, b) => { const q = E.cubicOut(ramp(t, 212.8 + k * 0.15, 1.5)), stop = ramp(t, 213.7 + k * 0.2, 0.3); b.x[i] += [400, 280, 520][k] * q; if (stop > hash(i, 5)) b.t[i] = RED; b.a[i] *= 1 - 0.5 * stop; } }))]);
  K(210.8, 'alone3', {}, [0, 40, 0.98]); L('SOZINHO', 0, -260, 211.0, 215.0, '#A0A0AA', 26, 6); L('FIM', 430, -40, 214.6, 215.0, '#F5CB62', 26);
  // "Quem nunca começou, não sabe por onde ir."
  scene('cross', [el(signpostArt, 0, -60, 1, { dot: true }), { ...fullAt(0, 330, 0.45) }]);
  K(215.1, 'cross', {}, [0, 0, 1.0]); L('?', 0, 160, 216.3, 217.4, '#FFB07A', 60);
  // "E quem já comprou curso… recebe um login, fica sozinho com um monte de aulas e trava nas primeiras dúvidas."
  scene('login', [el(loginArt, -230, -150, 0.7, { at: 218.2, br: 1.1, flash: [220.75] }), { ...fullAt(230, 200, 0.8), at: 219.2 }, ...[0, 1, 2, 3, 4].map(k => el(cardArt(140, 90), 380, 330 - k * 34, 1, { at: 222.1 + k * 0.08, pd: 0.15 })), el(textArt('?', 220, WT), 230, -150, 1, { at: 223.1, tints: [[223.4, RED, 0.6]], bob: 6 })]);
  K(217.4, 'login', { red: 0.15 }, [0, 0, 0.95]); L('LOGIN', -230, 20, 218.4, 224.8, '#FFFFFF', 20); L('TRAVA', 230, 30, 223.2, 224.8, '#FF7A70', 24);
  // "Nos dois casos, faltam a mesma coisa. Alguém pra responder… e gente em volta fazendo junto."
  scene('answer', [{ ...fullAt(0, 120, 0.8) }, el(textArt('?', 150, WT), -150, -170, 1, { at: 225.0, tints: [[227.7, GRAY, 1]], dim: [227.7, 0.5] }), el(checkArt, 150, -170, 1.0, { dot: true, at: 227.6 }),
    { ...crowdEl(1, 1, 0, 0, 0, 0), pts: [...Array(8)].flatMap((_, k) => { const a = k / 8 * 6.283, x = 330 * Math.cos(a), y = 120 + 200 * Math.sin(a); return B30.map(p => ({ ...p, x: p.x + x, y: p.y + y, pk: k })); }), life: (t, i, p, b) => { const on = dropIn(t, 229.4 + p.pk * 0.06, 0.3); b.a[i] = p.a * clamp(on, 0.02); if (on > 0.5 && hash(i, 3) < 0.3) b.t[i] = GREEN; } }]);
  K(224.8, 'answer', { green: 0.25 }, [0, 0, 0.95]); L('ALGUÉM PRA RESPONDER', 0, -360, 227.7, 231.0, '#5BE39A', 22); L('GENTE FAZENDO JUNTO', 0, 440, 229.5, 231.0, '#FFFFFF', 22);
  // "Você entra no nosso grupo do WhatsApp… Travou? Manda no grupo, a gente responde."
  scene('group', [el(chatUIArt, 0, -40, 1.0, { br: 1.6 })]);
  K(235.5, 'group', { green: 0.4 }, [0, -40, 1.02]);
  PART.over.push((g, t) => { if (t < 235.6 || t > 243.7) return; const A = 1 - ramp(t, 243.35, 0.25), msgs = [[236.4, 0, 'Bora construir! 🚀'], [237.9, 1, 'Fiz meu primeiro site hoje'], [239.5, 2, 'Igor, Emmanuel e Vitor entraram'], [241.1, 0, 'Travei aqui, alguém ajuda?'], [242.6, 1, 'Bora! Faz assim, ó 👇']];
    msgs.forEach(([T, side, s], k) => { const on = ramp(t, T, 0.25, E.backOut); if (on <= 0) return; const y = -200 + k * 92, x = side === 1 ? 20 : -200, w = 260 + (side === 2 ? 120 : 0); g.globalAlpha = A * clamp(on); g.fillStyle = side === 1 ? 'rgba(61,220,132,0.85)' : side === 2 ? 'rgba(124,124,134,0.5)' : 'rgba(242,242,245,0.92)'; RR(g, side === 2 ? -190 : x, y, side === 2 ? 380 : w, 64, 18); g.fill(); g.globalAlpha = 1; text(g, s, (side === 2 ? -190 : x) + 18, y + 33, `600 19px 'Inter'`, side === 1 || side === 0 ? '#06210f' : '#FFFFFF', A * clamp(on), 'left', 0); }); });
  L('3 SÓCIOS', 0, 380, 240.1, 243.4, '#5BE39A', 24); EV({ t: 236.4, kind: 'pop' }, { t: 237.9, kind: 'pop' }, { t: 239.5, kind: 'pop' }, { t: 241.1, kind: 'pop' }, { t: 242.6, kind: 'pop' });
  // "E toda semana tem live com a gente construindo ao vivo."
  scene('live', [el(browserArt, 0, -60, 1.0, { br: 1.1 }), el(liveArt, -150, -290, 0.8, { at: 244.6, pulse: 0.05 }), ...[0, 1, 2].map(k => el(g => cubeC(g, 0, 0, 50, WT, 0.9), 120 - k * 0, 40 - k * 36, 1, { dot: true, at: 245.6 + k * 0.25, from: [0, -60], tints: [[245.6, ORANGE, 0.8]] }))]);
  K(243.55, 'live', { red: 0.15, orange: 0.2 }, [0, -40, 1.0]); L('AO VIVO', -110, -290, 244.7, 247.1, '#FFFFFF', 22, 4); L('TODA SEMANA', 0, 230, 243.8, 247.1, '#FFFFFF', 22);
  // "O ambiente muda quem você é. Se todo mundo à sua volta só assiste… se todo mundo à sua volta constrói, você constrói."
  const RING8 = [...Array(10)].map((_, k) => { const a = k / 10 * 6.283; return [370 * Math.cos(a), 60 + 260 * Math.sin(a)]; });
  scene('env', [{ ...fullAt(0, 60, 0.9), tints: [[253.5, BLUE, 0.8], [256.6, ORANGE, 0.9]] }, { pts: RING8.flatMap(([x, y], k) => B45.map(p => ({ ...p, x: p.x + x, y: p.y + y, pk: k }))), x: 0, y: 0, cx: 0, cy: 0,
    life: (t, i, p, b) => { const w = ramp(t, 252.5 + p.pk * 0.05, 0.3), c = ramp(t, 255.6 + p.pk * 0.05, 0.3); b.t[i] = c > hash(i, 3) ? ORANGE : w > hash(i, 4) ? BLUE : WHITE; } },
    ...RING8.map(([x, y], k) => el(g => cubeC(g, 0, 0, 22, WT, 0.9), x, y - 90, 1, { at: 255.7 + k * 0.05, tints: [[255.7, GOLD, 1]] }))]);
  K(247.1, 'env', {}, [0, 40, 0.95]); L('O AMBIENTE', 0, -330, 249.3, 251.1, '#FFFFFF', 30, 8); L('SÓ ASSISTE', 0, -330, 252.7, 254.5, '#93BCFF', 26, 6); L('CONSTRÓI', 0, -330, 255.8, 257.5, '#FFB07A', 30, 8);
  // "Em cinco anos de mercado, foi isso que eu vi separar quem dava certo de quem ficava pelo caminho."
  scene('years', [el(forkArt, 0, 60, 1, { dot: true, reveal: [260.2, 1.9, '-y'] }), { ...fullAt(-260, -210, 0.5), at: 262.9, tints: [[263.0, GREEN, 0.8]] }, { ...fullAt(260, -210, 0.5), at: 263.9, tints: [[264.0, RED, 0.8]], moves: [[264.2, 0.6, 30, 60]] }]);
  K(260.05, 'years', {}, [0, 0, 0.98]); L('5 ANOS DE MERCADO', 0, -380, 260.3, 265.2, '#FFFFFF', 24, 6); L('DEU CERTO', -260, -40, 263.0, 265.2, '#5BE39A', 22); L('FICOU PELO CAMINHO', 260, -20, 264.0, 265.2, '#FF7A70', 20);
  // "Por isso, aqui, o acompanhamento não é um extra. É o centro de tudo."
  scene('center', [el(ringsArt, 0, -20, 1, { dot: true, br: 1.2, pulse: 0.02 }), flowEl(800, [0, -20], [0, -20], 265.4, 270.6, { glyphs: '·•', tint: GREEN, speed: 0.25, arc: 0, jit: 700, size: 0.3 })]);
  K(265.2, 'center', { green: 0.5 }, [0, -20, 1.02]); L('ACOMPANHAMENTO', 0, -20, 266.3, 270.6, '#FFFFFF', 26, 6); L('O CENTRO DE TUDO', 0, 380, 268.3, 270.6, '#5BE39A', 28, 6); EV({ t: 268.35, kind: 'bloom' });
}

PART.tremor.push(2.75, 17.45, 31.76, 60.5, 85.5, 96.1, 102.55, 106.2, 123.5, 150.95, 153.5, 167.1, 223.1, 263.9);


// ═════════════════════════ PARTE 2 · v6 — os ajustes do Igor de 22/10. Cenas refeitas por nome (scene() substitui), depois da buildPart.
PLAY.push(['b406', -0.5, 3.9, 0.53, true], ['b406', 116.2, 120.7, 0, true], ['sistema', 107.9, 112.6, 0, true], ['sistema', 115.7, 116.4, 0, true], ['sistema', 130.3, 133.1, 0, true], ['sistema', 156.1, 162.2, 0, true],
  ['site', 114.2, 115.9, 0, true], ['site', 156.1, 162.2, 0, true], ['scrollinsta', 203.2, 207.6, 0, true]);
const OV = f => PART.over.push(f);
const dropLbl = (...strs) => { PART.lbls = PART.lbls.filter(l => !strs.includes(l[0])); };
const dropCall = (...strs) => { PART.calls = PART.calls.filter(c => !strs.includes(c[6])); };
const dropOver = (...keys) => { PART.over = PART.over.filter(f => !keys.some(k => f.toString().includes(k))); };
const keyAtName = n => PART.keys.find(k => k[1] === n);
const carryWalk = t => { const w = MAN_POSES.walk(t), c = MAN_POSES.carry(t); return { ...w, uaL: c.uaL, faL: c.faL, uaR: c.uaR, faR: c.faR }; };
const poseAt2 = (T, a, b, d = 0.3) => t => t < T ? MAN_POSES[a](t) : mixPose(MAN_POSES[a](t), MAN_POSES[b](t), E.inOut(ramp(t, T, d)));
const brickOne = g => { g.fillStyle = LG(g, -45, -20, 45, 20, [[0, tone(OR, 1)], [1, tone(OR, 0.55)]]); RR(g, -45, -20, 90, 40, 6); g.fill(); g.fillStyle = tone(OR, 0.35); g.fillRect(-45, 14, 90, 6); };
function greekBust(g) { // a marble bust: curls, a laurel, blank eyes, a straight nose, drapery
  const M = (v) => tone('#F6F1E8', v);
  g.fillStyle = LG(g, -260, 0, 260, 0, [[0, M(0.45)], [0.45, M(0.95)], [1, M(0.4)]]); g.beginPath(); g.moveTo(-250, 330); g.quadraticCurveTo(-240, 170, -120, 140); g.lineTo(120, 140); g.quadraticCurveTo(240, 170, 250, 330); g.closePath(); g.fill();
  g.strokeStyle = M(0.35); g.lineWidth = 7; for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(-200 + k * 40, 330); g.quadraticCurveTo(-150 + k * 50, 230, -40 + k * 30, 160); g.stroke(); }
  g.fillStyle = LG(g, -50, 0, 50, 0, [[0, M(0.5)], [0.5, M(0.9)], [1, M(0.45)]]); g.fillRect(-48, 60, 96, 100);
  g.fillStyle = RG(g, -30, -90, 20, 180, [[0, M(1)], [0.6, M(0.75)], [1, M(0.4)]]); g.beginPath(); g.ellipse(0, -60, 108, 140, 0, 0, 7); g.fill();
  for (let k = 0; k < 14; k++) { const a = Math.PI * (1.05 + 0.9 * k / 13), x = 105 * Math.cos(a), y = -95 + 120 * Math.sin(a); sphere(g, x, y, 26, '#F6F1E8', 0.95); }
  g.fillStyle = tone(GN, 0.85); for (let k = 0; k < 6; k++) [-1, 1].forEach(s => { g.beginPath(); g.ellipse(s * (70 + k * 6), -150 + k * 16, 18, 8, s * (0.7 - k * 0.15), 0, 7); g.fill(); });
  g.fillStyle = M(0.4); [-40, 40].forEach(x => { g.beginPath(); g.ellipse(x, -70, 26, 12, 0, 0, 7); g.fill(); }); g.fillStyle = M(0.95); [-40, 40].forEach(x => { g.beginPath(); g.ellipse(x, -66, 18, 9, 0, 0, 7); g.fill(); });
  g.fillStyle = M(0.55); poly(g, [[-6, -64], [10, -64], [16, -8], [-14, -8]]); g.fill(); g.fillStyle = M(0.4); RR(g, -30, 18, 60, 10, 5); g.fill();
}
const houseArt6 = k => g => { // three different houses: a small cottage, a two-storey house, a modern tower
  const W = (x, y, w, h) => { g.fillStyle = VOID; g.fillRect(x, y, w, h); };
  g.fillStyle = LG(g, -140, -150, 140, 150, [[0, tone(WT, 0.95)], [1, tone(WT, 0.55)]]);
  if (k === 0) { g.fillRect(-120, -20, 240, 160); poly(g, [[-150, -20], [0, -150], [150, -20]]); g.fill(); W(-80, 20, 50, 50); W(30, 50, 50, 90); g.fillStyle = tone(WT, 0.6); g.fillRect(70, -120, 26, 60); }
  else if (k === 1) { g.fillRect(-130, -120, 260, 260); poly(g, [[-150, -120], [0, -210], [150, -120]]); g.fill(); [-90, -20, 50].forEach(x => { W(x, -90, 44, 50); W(x, 0, 44, 50); }); W(-20, 80, 44, 60); }
  else { g.fillRect(-90, -220, 180, 360); for (let r = 0; r < 6; r++) for (let c = 0; c < 3; c++) W(-70 + c * 52, -200 + r * 52, 36, 34); W(-20, 90, 40, 50); }
};
const gearArt = g => { g.fillStyle = tone(WT, 0.9); for (let k = 0; k < 8; k++) { g.save(); g.rotate(k * Math.PI / 4); RR(g, -14, -78, 28, 30, 6); g.fill(); g.restore(); } g.beginPath(); g.arc(0, 0, 58, 0, 7); g.fill(); g.fillStyle = VOID; g.beginPath(); g.arc(0, 0, 24, 0, 7); g.fill(); };
const wrenchArt = g => { g.fillStyle = tone(WT, 0.9); g.save(); g.rotate(-0.7); RR(g, -14, -20, 28, 120, 12); g.fill(); g.beginPath(); g.arc(0, -40, 40, 0, 7); g.fill(); g.fillStyle = VOID; RR(g, -12, -90, 24, 50, 4); g.fill(); g.restore(); };
const cloudArt = g => { g.fillStyle = tone(WT, 0.9); [[-40, 10, 40], [10, -10, 52], [55, 15, 36], [0, 25, 40]].forEach(([x, y, r]) => { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }); };
const dbArt = g => { g.fillStyle = tone(WT, 0.9); [-50, 0, 50].forEach(y => { g.beginPath(); g.ellipse(0, y, 70, 24, 0, 0, 7); g.fill(); g.fillRect(-70, y, 140, 30); }); g.fillStyle = VOID; [-26, 24].forEach(y => g.fillRect(-70, y, 140, 6)); };
const pieceArt = (tabR, tabB, hole) => g => { // a jigsaw piece 200×200: a square with round tabs on the right and the bottom
  g.fillStyle = LG(g, -100, -100, 100, 100, [[0, tone(WT, 0.95)], [1, tone(WT, 0.55)]]); RR(g, -100, -100, 200, 200, 10); g.fill();
  if (tabR) { g.beginPath(); g.arc(118, 0, 30, 0, 7); g.fill(); } if (tabB) { g.beginPath(); g.arc(0, 118, 30, 0, 7); g.fill(); }
  g.fillStyle = VOID; if (!tabR) { g.beginPath(); g.arc(82, 0, 22, 0, 7); g.fill(); } if (!tabB) { g.beginPath(); g.arc(0, 82, 22, 0, 7); g.fill(); }
};
const pieceArtOld = (tabR, tabB, hole) => g => {
  g.fillStyle = hole ? 'rgba(0,0,0,0)' : LG(g, -100, -100, 100, 100, [[0, tone(WT, 0.95)], [1, tone(WT, 0.55)]]); g.beginPath(); g.moveTo(-100, -100); g.lineTo(100, -100); g.lineTo(100, -25);
  if (tabR) g.arc(122, 0, 26, -Math.PI * 0.8, Math.PI * 0.8); g.lineTo(100, 100); g.lineTo(25, 100); if (tabB) g.arc(0, 122, 26, -Math.PI * 0.2 + Math.PI * 0.5 - Math.PI, Math.PI * 0.3 + Math.PI * 0.2, true); g.lineTo(-100, 100); g.closePath();
  if (hole) { g.strokeStyle = tone(WT, 0.8); g.lineWidth = 6; g.setLineDash([14, 10]); g.stroke(); g.setLineDash([]); } else g.fill(); };
const roadArt = (x0, x1, y0, y1, w0, w1) => g => { g.fillStyle = LG(g, 0, y0, 0, y1, [[0, tone(WT, 0.5)], [1, tone(WT, 0.18)]]); poly(g, [[x0 - w0, y0], [x0 + w0, y0], [x1 + w1, y1], [x1 - w1, y1]]); g.fill();
  g.strokeStyle = tone(WT, 0.9); g.lineWidth = 6; for (let k = 0; k < 9; k++) { const u0 = k / 9, u1 = u0 + 0.05; g.beginPath(); g.moveTo(lerp(x0, x1, u0), lerp(y0, y1, u0)); g.lineTo(lerp(x0, x1, u1), lerp(y0, y1, u1)); g.stroke(); } };
const vpanel = (g, img, x, y, w, h, a, o = {}) => { // a portrait b-roll shown as a landscape window, on a 3D panel
  if (!img || a <= 0.01) return; const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height, sh = Math.min(ih, iw * h / w);
  g.save(); if (o.glow) { g.shadowColor = o.glow; g.shadowBlur = 30 * a; } C6.quadWin(g, img, panel3(x, y, o.z || 0, w, h, o.ry || 0, o.rx ?? 0.06), (ih - sh) / 2, sh, { a, stroke: o.stroke || 'rgba(255,255,255,0.55)', grain: o.grain ?? 0.3, br: o.br ?? 1.05 }); g.restore(); };
const imgRot = (g, img, x, y, w, h, rot, a, o = {}) => { if (!img || a <= 0.01) return; g.save(); g.translate(x, y); g.rotate(rot); if (o.glow) { g.shadowColor = o.glow; g.shadowBlur = 26 * a; g.globalAlpha = a; g.fillStyle = '#000'; RR(g, -w / 2, -h / 2, w, h, 12); g.fill(); g.shadowBlur = 0; } mediaDraw(g, img, -w / 2, -h / 2, w, h, { a, r: 12, blur: 0.4, grain: o.grain ?? 0.3, br: 1.02, sat: 1 }); g.restore(); };
let FULL_BACK = null;
TEXT_TINT.W = '#25D366';

function buildPartV6() {
  FULL_BACK = manFull(622, { view: 'back' });
  const fullBack = (x, y, s, o = {}) => ({ pts: FULL_BACK.map(p => ({ ...p, rsc: s, rgPose: o.pose || p.rgPose, x: p.x * s + x, y: p.y * s + y, s: p.s * Math.max(0.6, s) })), x, y, cx: x, cy: y, ...o });

  // 4:07 "E construir exige uma coisa que o feed nunca te dá." — the scrolling man b-roll behind; the sentence as lettering
  scene('feedx', []); dropLbl('UM CAMINHO?'); PART.bg.push(['b406', -0.5, 3.7, 0.9, { br: 0.78, blur: 0.8, grain: 0.3, sat: 0.85 }]);
  OV((g, t) => { if (t > 3.8) return; const A = 1 - ramp(t, 3.45, 0.3), P = (s, T, x, y, px, col, o = {}) => { const on = ramp(t, T, 0.3, E.backOut); C6.plate(g, s, x, y + 30 * (1 - clamp(on)), px * (0.85 + 0.15 * clamp(on)), col, A * clamp(on), o); };
    P('CONSTRUIR', 0.32, 0, -330, 92, '#FFFFFF', { w: 900, sp: 6 }); P('EXIGE UMA COISA', 0.8, 0, -200, 46, '#FFB07A', { sp: 4 }); P('QUE O FEED', 2.1, -150, -90, 46, '#93BCFF', { sp: 4 }); P('NUNCA TE DÁ', 2.64, 120, 20, 62, '#FF5A52', { w: 900, sp: 4 });
    C6.strike(g, -120, -90, 30, -90, ramp(t, 2.75, 0.3), '#FF5A52', 6); });

  // 4:11 "Imagina uma obra, tijolo, cimento e pedreiro." — the bricks drop one by one, the cement lands with a puff, the builder in a helmet hammers
  { const bricks = []; let k = 0; for (let r = 0; r < 4; r++) for (let c = 0; c <= 3 - r; c++) { const x = -300 + (-150 + c * 100 + r * 50) * 0.9, y = 140 + (60 - r * 46) * 0.9; bricks.push(el(brickOne, x, y, 0.9, { at: 6.95 + 0.08 * k++, from: [0, -300], pd: 0.3, tints: [[0, ORANGE, 1]] })); }
    scene('obra', [...bricks, el(bagArt, 0, 110, 0.85, { dot: true, at: 7.62, from: [0, -300], pd: 0.35 }), { ...fullAt(300, 60, 1.1, { pose: poseAt2(8.3, 'stand', 'hammer') }), at: 8.2, from: [0, -60] }, el(g => helmet(g, 0, 0, 34), 300, -100, 1, { at: 8.2, from: [0, -60], tints: [[0, ORANGE, 1]] })]);
    OV((g, t) => { if (t < 7.8 || t > 8.7) return; const u = clamp((t - 7.85) / 0.6); for (let k = 0; k < 14; k++) { const a = Math.PI * (1 + k / 13), r = 30 + 120 * E.cubicOut(u); g.globalAlpha = 0.5 * (1 - u); g.fillStyle = '#CDCDD3'; g.beginPath(); g.arc(r * Math.cos(a), 200 + 0.4 * r * Math.sin(a), 8 + 10 * u, 0, 7); g.fill(); } g.globalAlpha = 1; }); }
  // 4:15 "Qualquer um tem acesso." — the crowd lit, not grey
  scene('access', [el(bricksArt, -170, 60, 0.6, { dot: true }), el(bagArt, 40, 50, 0.55, { dot: true }), { ...fullAt(220, 30, 0.75, { pose: 'hammer' }) }, el(g => helmet(g, 0, 0, 24), 220, -72, 1, { tints: [[0, ORANGE, 1]] }),
    { ...crowdEl(11, 3, -470, 470, 280, 450, { m0: 0.8, m1: 1.1 }), life: (t, i, p, b) => { const on = dropIn(t, 8.95 + 0.012 * p.pk, 0.3); b.a[i] = Math.min(1, p.a * 1.2) * clamp(on, 0.02); b.t[i] = WHITE; b.y[i] = p.y + 40 * (1 - clamp(on)); } }]);

  // 4:19 "decidir o que vai em cada lugar e em que ordem" — the house assembles in three parts and turns slowly, so you see the parts
  { const turn = (t, i, p, b) => { const u = 0.32 * Math.sin((t - 10.1) * 1.05), x = b.x[i]; b.x[i] = x * Math.cos(u); b.y[i] += x * Math.sin(u) * 0.35 - 6 * Math.sin(t * 1.6); };
    scene('order', [el(houseBase, 0, 0, 1, { dot: true, at: 10.45, from: [0, -260], pd: 0.45, life: turn }), el(houseWalls, 0, 0, 1, { dot: true, at: 12.6, from: [0, -280], pd: 0.45, life: turn, flash: [12.95] }), el(houseRoof, 0, 0, 1, { dot: true, at: 14.0, from: [0, -300], pd: 0.45, life: turn, flash: [14.35] })]); }

  // 4:21 "Esse alguém é o arquiteto." — the mannequin, then a close-up: a marble bust, the architect as a classic
  scene('arch', [{ ...fullAt(0, 120, 1.6, { pose: 'hips' }), br: 1.15, out: 15.4, outd: 0.25 }, el(greekBust, 0, -40, 1.25, { at: 15.45, s0: 0.75, pd: 0.45, br: 1.15, bob: 6, bobf: 1.4, h: 1100 })]);

  // 4:23 "Ele não assenta tijolo." — he carries a brick to the pile… and it is crossed out: that is not his job
  scene('notbrick', [{ ...fullAt(-300, 120, 1.2, { pose: t => t < 17.3 ? carryWalk(t) : MAN_POSES.shrug(t) }), moves: [[16.7, 0.6, 170, 0, 0, 'inOut']] },
    el(brickOne, -300, 10, 1.0, { tints: [[0, ORANGE, 1]], moves: [[16.7, 0.6, 170, 0, 0, 'inOut'], [17.45, 0.3, 30, 230, 0, 'quadIn']] }), el(bricksArt, 250, 160, 0.75, { dot: true }), el(xArt(150), 250, 140, 1, { at: 17.45, s0: 1.4 })]);

  // 4:24 "Ele desenha a casa antes dela existir e dirige a obra." — the blueprint unfolds from the middle, the view pulls back; he points, the crew in orange helmets works
  { const unfold = (t, i, p, b, e) => { const o = ramp(t, 18.15, 0.9, E.inOut), z = lerp(1.22, 1, E.inOut(ramp(t, 18.3, 1.5))), dx = b.x[i] - e.cx;
      b.x[i] = e.cx + dx * o * z; b.y[i] = e.cy + (b.y[i] - e.cy) * z; if (Math.abs(dx) > 312 * o + 2) b.a[i] = 0.02; };
    scene('draw', [el(blueprintArt, 0, -130, 1, { life: unfold, br: 1.15 }), { ...fullAt(-330, 300, 0.8, { pose: poseAt2(20.4, 'stand', 'point') }) },
      { ...fullAt(150, 330, 0.6, { pose: 'hammer' }), at: 20.55, from: [60, 0] }, el(g => helmet(g, 0, 0, 26), 150, 240, 1, { at: 20.55, from: [60, 0], tints: [[0, ORANGE, 1]] }),
      { ...fullAt(320, 330, 0.6, { pose: 'build' }), at: 20.75, from: [60, 0] }, el(g => helmet(g, 0, 0, 26), 320, 244, 1, { at: 20.75, from: [60, 0], tints: [[0, ORANGE, 1]] })]);
  }

  // 4:31 "Trabalha mais rápido que qualquer outra e constrói o que você mandar." — six robots; brown blocks stack into a building, fast and clean
  { const blocks = []; let k = 0; for (let L2 = 0; L2 < 5; L2++) for (let c = 0; c < 3; c++) blocks.push(el(g => cubeC(g, 0, 0, 58, '#C08A55', 1), (c - 1) * 116 + (L2 % 2) * 6, 300 - L2 * 66, 1, { dot: true, at: 24.9 + 0.12 * k++, from: [0, -260], pd: 0.22, br: 1.45, tints: [[0, BROWN, 1]] }));
    const bots = [[-430, 300], [-300, 120], [-430, -60], [430, 300], [300, 120], [430, -60]].map(([x, y], k) => el(botArt, x, y, 0.62, { dot: true, at: 24.5 + k * 0.06, bob: 12, bobf: 11, ph: k }));
    scene('fast', [...blocks, ...bots]); OV((g, t) => { if (t > 27.0 && t < 27.6) C6.mark(g, 0, -120, 1.1, ramp(t, 27.05, 0.15) * (1 - ramp(t, 27.4, 0.15)), true); }); }

  // 4:33–4:37 "equipe nenhuma escolhe qual casa construir. Quem escolhe é o arquiteto." — three different houses float; he points; the chosen one rises, green
  { const H3 = [[-310, -80], [0, -110], [310, -60]];
    scene('which', [...H3.map(([x, y], k) => el(houseArt6(k), x, y, 0.85, { at: 28.5 + k * 0.2, bob: 8, bobf: 1.6, ph: k * 2, tints: [[28.4, GRAY, 0.5]] })), ...[0, 1, 2].map(k => el(botArt, -200 + k * 200, 330, 0.55, { dot: true, bob: 6, ph: k, tints: [[27.6, GRAY, 0.8]] }))]);
    scene('choose', [...H3.map(([x, y], k) => el(houseArt6(k), x, y, 0.85, { bob: 8, bobf: 1.6, ph: k * 2, tints: k === 1 ? [[31.6, GREEN, 0.9]] : [[30.7, GRAY, 1]], dim: k === 1 ? undefined : [31.6, 0.6], flash: k === 1 ? [31.76] : undefined, moves: k === 1 ? [[31.6, 0.5, 0, -60, 0.18]] : [[31.6, 0.5, 0, 50, -0.1]] })),
      { ...fullAt(0, 300, 0.9, { pose: poseAt2(31.2, 'look', 'point') }), br: 1.2 }]);
    OV((g, t) => { if (t > 31.6 && t < 32.9) { const a = ramp(t, 31.7, 0.25) * (1 - ramp(t, 32.6, 0.3)); g.save(); g.globalCompositeOperation = 'lighter'; const r = g.createRadialGradient(0, -170, 0, 0, -170, 300); r.addColorStop(0, `rgba(61,220,132,${0.3 * a})`); r.addColorStop(1, 'rgba(61,220,132,0)'); g.fillStyle = r; g.fillRect(-320, -480, 640, 620); g.restore(); C6.mark(g, 0, -400, 1.1, a, true); } }); }

  // 4:41–4:47 "dinheiro dentro do feed… do lado de fora com muita pouca gente olhando" — a big white $ inside the phone (little value);
  // outside, green banknotes fall to three people looking up
  scene('inout', [el(g => phoneArt(g), -170, -40, 0.95, { br: 1.1 }), { ...crowdEl(7, 6, -290, -50, -280, 200, { m0: 0.75, m1: 0.95 }), life: (t, i, p, b) => { const k = ramp(t, 42.2, 0.4) * (1 - ramp(t, 44.0, 0.4)); b.x[i] = p.x + (1 + 3 * k) * Math.sin(t * 41 + p.pk); b.t[i] = hash(p.pk, 9) < 0.5 * k ? RED : WHITE; b.a[i] = Math.min(1, p.a * 1.1); } },
    TX('$', 190, WT, { x: -170, y: -60, tint: WHITE, pulse: 0.04 }), ...[[220, 330], [330, 345], [440, 330]].map(([x, y], k) => ({ ...fullAt(x, y, 0.42, { pose: k === 1 ? 'reach' : 'look' }), at: 44.5 + k * 0.1 }))]);
  dropLbl('LADO DE FORA'); L('LADO DE FORA', 330, -360, 45.1, 47.8, '#5BE39A', 24);
  OV((g, t) => { if (t < 44.5 || t > 47.9) return; const A = 1 - ramp(t, 47.6, 0.3); for (let k = 0; k < 16; k++) { const T0 = 44.55 + k * 0.17, u = clamp((t - T0) / 1.3); if (u <= 0 || u >= 1) continue; const x = 330 + (hash(k, 3) - 0.5) * 380, y = lerp(-520, 200, u); C6.bill(g, x + 40 * Math.sin(t * 2 + k), y, 0.6, Math.sin(t * 3 + k) * 0.6, A * Math.min(1, (1 - u) * 4)); } });

  // 4:47–4:53 "milhões de pessoas fazem a mesma coisa ao mesmo tempo e sobra pouco pra cada uma" — a feed full of people doing the same thing in sync;
  // one banknote breaks into crumbs, one for each
  { const P6 = [], SP = []; for (let r = 0; r < 5; r++) for (let c = 0; c < 6; c++) { const x = -300 + c * 120, y = -250 + r * 140; SP.push([x, y - 50]); P6.push(...bustAt(B30, x, y, r * 6 + c, { rgPose: t => MAN_POSES.type(t) })); }
    scene('split', [el(g => phoneArt(g), 0, -40, 1.32, { br: 0.8, dim: [0, 0.3] }), { pts: P6, x: 0, y: 0, cx: 0, cy: 0, life: (t, i, p, b) => { const on = dropIn(t, 48.4 + 0.02 * p.bk, 0.25); b.a[i] = Math.min(1, p.a * 1.1) * clamp(on, 0.02); b.t[i] = ramp(t, 49.4, 0.4) > hash(p.bk, 5) ? BLUE : WHITE; } }]);
    dropLbl('SOBRA POUCO PRA CADA UM'); L('SOBRA POUCO PRA CADA UM', 0, 470, 52.0, 53.2, '#FF7A70', 22);
    OV((g, t) => { if (t < 50.6 || t > 53.25) return; const A = 1 - ramp(t, 53.0, 0.25), s0 = ramp(t, 50.7, 0.4, E.backOut); if (t < 51.75) { C6.bill(g, 0, -560, 1.5 * s0, 0, A * s0); return; }
      SP.forEach(([x, y], k) => { const u = clamp((t - 51.75 - 0.015 * k) / 0.7), q = E.inOut(u); C6.bill(g, lerp((hash(k, 1) - 0.5) * 200, x, q), lerp(-560, y, q), lerp(0.4, 0.12, q), 3 * q, A * (u > 0 ? 1 : 0)); }); }); }
  // 4:53–4:55 "E essa multidão só cresce." — the rows keep coming, the view keeps pulling back; the counter runs
  scene('grow', [{ ...crowdEl(15, 9, -560, 560, -420, 460, { m0: 0.6, m1: 1.0 }), life: (t, i, p, b) => { const on = dropIn(t, 53.25 + 0.006 * p.pk, 0.25), z = lerp(1.25, 0.82, E.inOut(ramp(t, 53.2, 1.5))); b.x[i] *= z; b.y[i] = (b.y[i] - 20) * z + 20; b.a[i] = Math.min(1, p.a * 1.15) * clamp(on, 0.02); b.t[i] = WHITE; } }]);
  OV((g, t) => { if (t < 53.3 || t > 54.8) return; const n = Math.round(1000000 * E.cubicOut(ramp(t, 53.3, 1.3))); C6.plate(g, '+ ' + n.toLocaleString('pt-BR'), 0, -540, 48, '#FFFFFF', ramp(t, 53.3, 0.2) * (1 - ramp(t, 54.55, 0.2)), { mono: true }); });
  // 4:55–4:57 "Do lado de fora, quase ninguém tá construindo." — a dense grey crowd on one side of a line; on the other, one person, building
  scene('outside', [{ ...crowdEl(6, 8, -500, -120, -360, 380, { m0: 0.7, m1: 1.0 }), life: (t, i, p, b) => { b.t[i] = GRAY; b.a[i] = p.a * 0.8; } }, el(g => { g.fillStyle = tone(GN, 0.8); g.fillRect(-3, -460, 6, 900); }, -40, 0, 1, { reveal: [54.9, 0.5, 'y'] }),
    ...[0, 1, 2, 3].map(k => el(g => cubeC(g, 0, 0, 56, '#FF9B55', 0.95), 300, 330 - k * 60, 1, { dot: true, at: 55.4 + k * 0.35, from: [0, -120], tints: [[0, CLAUDE, 1]] })), { ...fullAt(150, 250, 0.72, { pose: 'build' }), br: 1.2 }]);
  dropLbl('LADO DE FORA', 'QUASE NINGUÉM'); L('LADO DE FORA', 230, -330, 54.9, 57.3, '#5BE39A', 28); L('QUASE NINGUÉM', -300, -440, 55.9, 57.3, '#A0A0AA', 22);
  // 4:57–5:00 "a maioria ainda acha que isso é coisa de programador" — </> over a programmer at his laptop; the crowd points at him
  scene('coder', [TX('</>', 230, WT, { x: 0, y: -300, at: 57.9, br: 1.1 }), { ...fullAt(0, 110, 0.75, { pose: 'type' }), br: 1.15 }, el(laptopArt(0, 0, 1.6), 0, 190, 1, {}),
    { ...crowdEl(11, 2, -460, 460, 360, 460), pts: crowdEl(11, 2, -460, 460, 360, 460).pts.map(p => ({ ...p, rgPose: 'point' })), life: (t, i, p, b) => { b.t[i] = WHITE; b.a[i] = p.a * 0.9; } }]);
  dropLbl('COISA DE PROGRAMADOR'); L('COISA DE PROGRAMADOR', 0, -120, 59.2, 60.3, '#FF7A70', 26);
  // 5:00–5:01 "E você já viu que não é." — the strike goes right across the </>; a green check; the viewer celebrates
  scene('notcoder', [TX('</>', 230, WT, { x: 0, y: -300, tints: [[60.5, GRAY, 0.8]], dim: [60.6, 0.45] }), el(checkArt, 0, 60, 1.4, { dot: true, at: 61.0, tints: [[0, GREEN, 1]] }), { ...fullAt(0, 330, 0.6, { pose: 'cheer' }), at: 61.0 }]);
  OV((g, t) => { if (t > 60.3 && t < 61.7) { g.save(); g.globalAlpha = 1 - ramp(t, 61.4, 0.25); C6.strike(g, -260, -240, 260, -360, ramp(t, 60.4, 0.3), '#FF4D4D', 14); g.restore(); } });

  // 5:02–5:05 "você enxerga o que a multidão não enxerga" — a big eye, awake: it looks around and blinks
  { const EYE = [0, -230], blink = t => Math.max(...[63.55, 64.65].map(T => Math.exp(-(((t - T) / 0.07) ** 2)))), irisXY = t => [55 * Math.sin((t - 62.9) * 1.8) * ramp(t, 63.0, 0.4), 12 * Math.sin((t - 62.9) * 1.3)];
    const shut = (t, i, p, b) => { const s = 1 - 0.95 * blink(t); b.y[i] = EYE[1] + (b.y[i] - EYE[1]) * s; };
    scene('see', [el(lidArt(0, 0), EYE[0], EYE[1], 1.9, { dot: true, cell: 3, br: 1.25, life: shut }), el(irisArt(0, 0), EYE[0], EYE[1], 1.9, { dot: true, cell: 3, at: 62.9, s0: 0.2, life: (t, i, p, b) => { const [dx, dy] = irisXY(t); b.x[i] += dx; b.y[i] += dy; shut(t, i, p, b); } }),
      { ...crowdEl(11, 3, -460, 460, 220, 420), life: (t, i, p, b) => { b.t[i] = GRAY; b.a[i] = p.a * 0.6; } }]); }

  // 5:08–5:11 "Quem só enxerga e não faz nada, continua igual à multidão." — he dissolves back into the crowd; the eye closes and is gone
  scene('still', [{ ...fullAt(0, 60, 1.0, { pose: 'sad' }), life: (t, i, p, b, e) => { const q = E.inOut(ramp(t, 69.4, 1.3)), tx = 140, ty = 260, s = lerp(1, 0.42, q); b.x[i] = lerp(e.cx, tx, q) + (b.x[i] - e.cx) * s; b.y[i] = lerp(e.cy, ty, q) + (b.y[i] - e.cy) * s; if (q > hash(i, 3)) b.t[i] = GRAY; b.a[i] *= 1 - 0.3 * q; } },
    el(lidArt(0, 0), 0, -330, 0.6, { dot: true, life: (t, i, p, b) => { const c = ramp(t, 70.1, 0.35, E.inOut); b.y[i] = -330 + (b.y[i] + 330) * (1 - 0.95 * c); b.a[i] *= 1 - ramp(t, 70.4, 0.4); } }),
    { ...crowdEl(13, 4, -500, 500, -40, 380, { m0: 0.8, m1: 1.1 }), life: (t, i, p, b) => { const on = ramp(t, 68.6 + 0.004 * p.pk, 0.5); b.a[i] = p.a * clamp(on, 0.02) * 0.7; b.t[i] = GRAY; } }]);
  // 5:11 "a informação na cabeça e o bolso do mesmo jeito" — the new brain (side view), the wallet empty
  scene('headpocket', [el(C6.brainSide, -230, -110, 0.68, { tint: PINK, br: 1.1, bob: 5 }), el(walletFlat, 230, 60, 0.75, { dot: true, at: 72.9, tints: [[73.4, RED, 0.25]] })]);

  // 5:21–5:28 the scale: it sways, weighing, then tips; the value side bright green
  { const tilt = t => -0.28 * ramp(t, 85.4, 0.9, E.backOut) + 0.12 * Math.sin((t - 81.3) * 2.3) * (1 - ramp(t, 85.1, 0.4));
    const beam = (t, i, p, b) => { const a = tilt(t), dx = b.x[i], dy = b.y[i] + 100; b.x[i] = dx * Math.cos(a) - dy * Math.sin(a); b.y[i] = -100 + dx * Math.sin(a) + dy * Math.cos(a); };
    scene('scale', [el(scaleArt, 0, 60, 1, { dot: true }), el(beamArt, 0, -100, 1, { dot: true, life: beam }), el(tagArt(GD), -290, -20, 0.6, { dot: true, at: 82.2, life: beam, tints: [[0, CHOCO, 1]] }),
      ...[0, 1, 2, 3].map(k => el(g => cubeC(g, 0, 0, 50, GN, 1), 290 + (k % 2) * 56 - 28, -14 - Math.floor(k / 2) * 50, 1, { dot: true, at: 84.6 + k * 0.15, life: beam, br: 1.5, tints: [[0, GREEN, 1]] }))]);
    dropLbl('PREÇO'); L('PREÇO', -290, 200, 82.3, 87.5, '#FFFFFF', 20); }

  // 5:32–5:37 "Um projeto seu no ar em 7 dias." — the rocket rises onto the pad, hovers, the 7-day bar fills, and it launches smoothly off screen
  { const launch = t => E.quadIn(ramp(t, 96.0, 1.2, E.lin)), enter = t => 1 - E.cubicOut(ramp(t, 93.0, 0.9));
    scene('launch', [el(rocketArt, 0, -60, 1, { dot: true, br: 1.15, life: (t, i, p, b) => { b.y[i] += 520 * enter(t) - 1500 * launch(t) + 8 * Math.sin(t * 2.4) * (1 - ramp(t, 95.6, 0.3)); b.x[i] += 3 * Math.sin(t * 50) * ramp(t, 95.6, 0.3) * (1 - launch(t)); } }),
      el(flameArt, 0, 130, 0.9, { at: 95.7, life: (t, i, p, b) => { b.y[i] += -1500 * launch(t); b.a[i] *= 0.7 + 0.3 * Math.sin(t * 30 + p.x); const st = 1 + 0.6 * launch(t); b.y[i] = 130 - 1500 * launch(t) + (b.y[i] - 130 + 1500 * launch(t)) * st; } }),
      el(barArt(680), 0, 380, 1, {}), el(barFill(680, GN), 0, 380, 1, { life: (t, i, p, b) => { if (p.x > -330 + 660 * ramp(t, 94.95, 1.05, E.inOut)) b.a[i] = 0.02; } })]);
    PART.lbls = PART.lbls.filter(l => !/^D\d$/.test(l[0]) && l[0] !== 'NO AR'); L('7 DIAS', 0, 460, 95.0, 97.2, '#5BE39A', 26, 6); L('NO AR', 0, 260, 96.3, 97.2, '#5BE39A', 44, 8); }

  // 5:37–5:41 the guarantee: a green shield that breathes; a banknote flies back into the wallet
  scene('guarantee', [el(C6.shield, 0, -140, 1.0, { at: 97.5, br: 1.15, pulse: 0.03, pulsef: 3, tints: [[0, GREEN, 1]] }), el(walletFlat, 0, 330, 0.5, { dot: true, at: 99.5 })]);
  OV((g, t) => { if (t < 99.6 || t > 101.3) return; [0, 0.45].forEach((d, k) => { const u = clamp((t - 99.7 - d) / 0.75); if (u <= 0 || u >= 1) return; const q = E.inOut(u); C6.bill(g, lerp(-80 + 160 * k, 0, q), lerp(-60, 300, q) - 60 * Math.sin(Math.PI * q), lerp(0.9, 0.45, q), (1 - q) * 0.8 * (k ? -1 : 1), Math.min(1, (1 - u) * 5)); }); });

  // 5:41 the name: the real ATS logo (media, with grain)
  scene('title', []); PART.media.push({ img: C6.IMG + 'ats_logo.png', t0: 101.6, t1: 104.4, x: 0, y: -60, w: 760, h: 520, contain: true, pop: true, grain: 0.32, blur: 0.4, br: 1.05 });

  // 5:43–5:47 "o Arquiteto 7D. O seu primeiro passo." — he steps onto the first step and it lights; his first win (a flag)
  scene('d7', [TX('7D', 360, GN, { y: -150, at: 106.1, tint: GREEN, br: 1.2, flash: [106.2] }), ...[0, 1, 2, 3].map(k => el(stepColArt(k, 50), -270 + k * 180, 330, 1, { dot: true, tints: k === 0 ? [[107.0, GREEN, 1]] : [], dim: k ? [107.0, 0.45] : undefined })),
    { ...fullAt(-470, 296, 0.42, { pose: t => t < 106.9 ? MAN_POSES.walk(t) : MAN_POSES.cheer(t) }), at: 106.4, moves: [[106.5, 0.5, 200, -74, 0, 'inOut']] }, el(flagArt, -230, 160, 0.6, { dot: true, at: 107.2, tints: [[0, GREEN, 1]] })]);
  // 5:47–5:52 "começando do zero, você constrói o seu primeiro projeto e coloca no ar" — the real system b-roll on a 3D screen while the bar fills
  scene('zero', [el(barArt(760), 0, 260, 1, {}), el(barFill(760, GN), 0, 260, 1, { life: (t, i, p, b) => { if (p.x > -368 + 736 * ramp(t, 109.1, 3.0, E.inOut)) b.a[i] = 0.02; } })]);
  dropOver('`${v}%`'); OV((g, t) => { if (t > 108.9 && t < 112.6) { const v = Math.round(100 * ramp(t, 109.1, 3.0, E.inOut)); text(g, `${v}%`, 0, 340, `700 34px 'JetBrains Mono'`, v === 100 ? '#5BE39A' : '#FFFFFF', ramp(t, 109, 0.2) * (1 - ramp(t, 112.3, 0.2)), 'center', 4); }
    if (t > 107.95 && t < 112.6) vpanel(g, seqImg('sistema', t), 0, -150, 780, 470, ramp(t, 108.0, 0.4) * (1 - ramp(t, 112.3, 0.3)), { ry: 0.22 * Math.sin((t - 108) * 0.5) - 0.1, glow: 'rgba(91,227,154,0.45)' }); });
  // 5:52–5:56 "Um site, um aplicativo, um sistema." — the three real b-rolls, one after the other, each swinging in
  scene('choose3', []); PART.lbls = PART.lbls.filter(l => !['SITE', 'APLICATIVO', 'SISTEMA'].includes(l[0])); L('SITE', 0, 230, 114.4, 114.95, '#FFFFFF', 30, 6); L('APLICATIVO', 0, 230, 114.98, 115.9, '#FFB07A', 30, 6); L('SISTEMA', 0, 230, 115.94, 116.3, '#5BE39A', 30, 6);
  OV((g, t) => { if (t < 112.7 || t > 116.35) return; const show = (T0, T1, f) => { const a = ramp(t, T0, 0.2) * (1 - ramp(t, T1, 0.2)); if (a > 0.01) f(a, E.cubicOut(ramp(t, T0, 0.45))); };
    show(112.8, 114.35, (a, q) => C6.plate(g, 'VOCÊ ESCOLHE', 0, -100, 56, '#FFFFFF', a * q, { sp: 6 }));
    show(114.35, 114.97, (a, q) => vpanel(g, seqImg('site', t), lerp(500, 0, q), -120, 760, 440, a, { ry: lerp(0.9, 0.12, q) }));
    show(114.97, 115.92, (a, q) => { g.save(); mediaQuad(g, C6.im('app_broll.jpg'), panel3(lerp(-500, 0, q), -120, 0, 720, 540, lerp(-0.9, -0.12, q), 0.05), { a, grain: 0.3, br: 1.05, stroke: 'rgba(255,255,255,0.5)' }); g.restore(); });
    show(115.92, 116.3, (a, q) => vpanel(g, seqImg('sistema', t), 0, lerp(200, -120, q), 760, 440, a, { rx: lerp(0.6, 0.06, q) })); });
  // 5:56–6:00 "Quanto tempo você passa só rolando o feed?" — the scrolling b-roll behind; a big clock racing over it
  scene('scroll2', [el(clockArt, 0, -120, 1.05, { dot: true, at: 117.2, br: 1.2 }), el(handArt(170, 16), 0, -120, 1.05, { at: 117.2, spin: 9, cx: 0, cy: -120 }), el(handArt(110, 24), 0, -120, 1.05, { at: 117.2, spin: 0.8, cx: 0, cy: -120 })]);
  PART.bg.push(['b406', 116.3, 120.6, 0.75, { br: 0.7, blur: 0.9, grain: 0.32 }]);
  // 6:00–6:05 "são mais de 180 horas" — 180 H in strong red; the hourglass empties
  scene('h180', [TX('180 H', 280, RD, { y: -80, at: 123.45, br: 1.25, flash: [123.5], tint: RED }), el(hgFrame, 0, 330, 0.55, { dot: true }),
    el(hgSand, 0, 330, 0.55, { dot: true, tints: [[0, RED, 0.6]], life: (t, i, p, b) => { const u = ramp(t, 121.0, 4.0, E.lin), ly = (p.y - 330) / 0.55, on = ly < 0 ? ly > -270 + 262 * u : ly > 292 - 250 * u; b.a[i] = on ? b.a[i] : 0.02; } })]);
  dropOver("String(v) + ' H'"); OV((g, t) => { if (t > 120.8 && t < 123.5) { const v = Math.round(182 * ramp(t, 120.9, 2.5, E.cubicOut)); text(g, String(v) + ' H', 0, -80, "800 130px 'JetBrains Mono'", '#FF4D4D', ramp(t, 120.8, 0.2) * (1 - ramp(t, 123.3, 0.2)), 'center', 4); } });
  // 6:12–6:15 "você tem uma coisa sua no ar" — the real system on a screen, the green shield breathing
  scene('yours', [el(C6.shield, 0, 290, 0.5, { at: 132.6, pulse: 0.04, pulsef: 3, tints: [[0, GREEN, 1]] })]);
  OV((g, t) => { if (t > 130.3 && t < 133.1) vpanel(g, seqImg('sistema', t), 0, -150, 760, 440, ramp(t, 130.4, 0.4) * (1 - ramp(t, 132.8, 0.3)), { ry: -0.15 + 0.1 * Math.sin(t * 0.8), glow: 'rgba(91,227,154,0.5)' }); });
  // 6:15–6:19 "pelo celular, sem pagar nenhuma ferramenta" — tool icons around the phone, each crossed out
  { const TP = [[-330, -250], [330, -250], [-330, 170], [330, 170]], TA = [gearArt, wrenchArt, cloudArt, dbArt];
    scene('phone0', [el(g => phoneArt(g, { body: OR, screen: appScreen }), 0, -40, 0.8, { br: 1.1 }), ...TP.map(([x, y], k) => el(TA[k], x, y, 0.9, { at: 134.0 + k * 0.12, bob: 6, ph: k, tints: [[135.3, GRAY, 1]], dim: [135.3, 0.45] }))]);
    OV((g, t) => { if (t < 135.3 || t > 137.1) return; const a = 1 - ramp(t, 136.8, 0.25); TP.forEach(([x, y], k) => { g.save(); g.globalAlpha = a; C6.strike(g, x - 80, y - 80, x + 80, y + 80, ramp(t, 135.4 + k * 0.08, 0.2), '#FF4D4D', 9); C6.strike(g, x + 80, y - 80, x - 80, y + 80, ramp(t, 135.5 + k * 0.08, 0.2), '#FF4D4D', 9); g.restore(); }); }); }

  // 6:25–6:36 the gap for the video of Vitor's phone (it goes in later): a placeholder frame and the key words as moving lettering
  { const kb = keyAtName('bolso2'); kb[1] = 'vphone'; PART.keys = PART.keys.filter(k => k[1] !== 'askia' && k[1] !== 'finapp');
    scene('vphone', [el(g => { g.strokeStyle = tone(WT, 0.5); g.lineWidth = 5; g.setLineDash([16, 12]); RR(g, -230, -440, 460, 860, 50); g.stroke(); g.setLineDash([]); }, 0, 0, 1, {})]);
    dropLbl('TODO MÊS', 'ENTRA', 'SAI'); dropCall('PRA ONDE VAI'); dropOver('crie um app');
    OV((g, t) => { if (t < 139.5 || t > 150.6) return; const A = ramp(t, 139.7, 0.3) * (1 - ramp(t, 150.3, 0.3));
      text(g, '[ VÍDEO DO CELULAR DO VITOR ]', 0, -10, `600 20px 'JetBrains Mono'`, '#6E6E78', A, 'center', 4);
      const W2 = [[139.66, 142.9, 'QUANTO SAI', '#FFFFFF', -300], [141.6, 142.9, 'DO SEU BOLSO?', '#FF7A70', -230], [143.3, 145.8, 'PEDI PRA IA', '#93BCFF', -300], [144.12, 145.8, 'UM APLICATIVO', '#FFFFFF', -230],
        [146.8, 147.4, 'ENTRA', '#5BE39A', 200], [147.45, 148.2, 'SAI', '#FF7A70', 200], [148.26, 150.4, 'PRA ONDE VAI', '#FFFFFF', 160], [149.5, 150.4, 'O SEU DINHEIRO', '#5BE39A', 230]];
      W2.forEach(([T0, T1, s, col, y]) => { const on = ramp(t, T0, 0.25, E.backOut); if (t < T0 || t > T1 + 0.3) return; C6.plate(g, s, 0, y + 20 * (1 - clamp(on)), 54, col, A * clamp(on) * (1 - ramp(t, T1, 0.25)), { sp: 4 }); }); }); }
  // 6:36–6:41 "43 minutos… sem computador, sem programar" — 43 MIN big and bright; the computer and the code each crossed out properly
  scene('min43', [TX('43 MIN', 290, GN, { y: -270, at: 150.9, tint: GREEN, br: 1.35, flash: [151.0] }), el(laptopArt(0, 0, 1.8), -230, 170, 1, { at: 153.2 }), TX('</>', 140, WT, { x: 230, y: 150, at: 154.2 })]);
  OV((g, t) => { if (t < 153.3 || t > 156.2) return; const a = 1 - ramp(t, 155.95, 0.25); g.save(); g.globalAlpha = a; [[-230, 120, 153.5], [230, 150, 154.6]].forEach(([x, y, T]) => { C6.strike(g, x - 120, y - 90, x + 120, y + 90, ramp(t, T, 0.2), '#FF4D4D', 12); C6.strike(g, x + 120, y - 90, x - 120, y + 90, ramp(t, T + 0.1, 0.2), '#FF4D4D', 12); }); g.restore(); });

  // 6:41–6:47 "É esse tipo de coisa que você constrói no Arquiteto 7D" — site, system and app (real) appear, each with a robot building it
  { const PNL = [[-260, -280, 'site'], [260, -280, 'sistema'], [0, 170, 'app']];
    scene('simple', PNL.map(([x, y], k) => el(botArt, x + (k === 2 ? 300 : 0), y + 230 - (k === 2 ? 100 : 0), 0.55, { dot: true, at: 157.0 + k * 0.6, bob: 10, bobf: 10, ph: k })));
    OV((g, t) => { if (t < 156.2 || t > 162.2) return; const A = 1 - ramp(t, 161.9, 0.3); PNL.forEach(([x, y, id], k) => { const T0 = 156.9 + k * 0.6, q = E.cubicOut(ramp(t, T0, 0.5)), a = A * ramp(t, T0, 0.3);
      if (id === 'app') mediaQuad(g, C6.im('app_broll.jpg'), panel3(x, y, 0, 440, 330, -0.2 + 0.05 * Math.sin(t), 0.05), { a, grain: 0.3, stroke: 'rgba(255,255,255,0.5)' }); else vpanel(g, seqImg(id, t), x, y, 440, 260, a, { ry: (k ? -0.3 : 0.3) * (1 - q * 0.6) });
      const bar = ramp(t, T0 + 0.3, 1.6); g.globalAlpha = a; g.fillStyle = 'rgba(255,255,255,0.2)'; RR(g, x - 150, y + (id === 'app' ? 185 : 150), 300, 10, 5); g.fill(); g.fillStyle = '#5BE39A'; RR(g, x - 150, y + (id === 'app' ? 185 : 150), 300 * bar, 10, 5); g.fill(); g.globalAlpha = 1; }); }); }
  // 6:47–6:52 "você aprende a transformar ele em dinheiro" — the $ leaves the app and goes to the architect (you, as one of us)
  scene('money', [el(g => phoneArt(g, { body: OR, screen: appScreen }), -280, -40, 0.6, {}), { ...fullAt(290, 130, 0.95, { pose: poseAt2(166.9, 'hips', 'cheer') }), br: 1.2 },
    TX('$', 200, GN, { x: -280, y: -60, at: 163.8, tint: GREEN, moves: [[164.4, 2.2, 570, -150, -0.25, 'inOut']], flash: [166.7] })]);
  L('ARQUITETO', 290, 380, 166.6, 167.5, '#93BCFF', 24, 6);
  // 6:52–6:57 "como achar quem precisa, quanto cobrar e como receber todo mês" — PROSPECÇÃO (the arrow hits), PRECIFICAÇÃO (two people pay), MENSALIDADE (the months tick)
  scene('howto', [el(targetArt, -330, -120, 0.75, { at: 167.7 }), { ...fullAt(-60, 120, 0.45, { pose: 'carry' }), at: 169.1 }, { ...fullAt(60, 120, 0.45, { pose: 'carry' }), at: 169.2 }, el(calArt, 330, -120, 0.7, { dot: true, at: 170.1 })]);
  dropLbl('ACHAR', 'COBRAR', 'TODO MÊS', 'E NÃO SÓ UMA VEZ'); L('E NÃO SÓ UMA VEZ', 0, 440, 171.6, 172.7, '#5BE39A', 24);
  OV((g, t) => { if (t < 167.6 || t > 172.85) return; const A = 1 - ramp(t, 172.55, 0.25);
    [[-330, 'PROSPECÇÃO', 167.8, '#FFFFFF'], [0, 'PRECIFICAÇÃO', 169.2, '#93BCFF'], [330, 'MENSALIDADE', 170.2, '#5BE39A']].forEach(([x, s, T, col]) => C6.plate(g, s, x, 300, 24, col, A * ramp(t, T, 0.25), { mono: true, sp: 3 }));
    const u = clamp((t - 168.0) / 0.35); if (u > 0) { const ax = lerp(-620, -330, E.quadIn(u)); g.save(); g.globalAlpha = A; g.strokeStyle = '#FFFFFF'; g.lineWidth = 7; g.beginPath(); g.moveTo(ax - 120, -120); g.lineTo(ax, -120); g.stroke(); g.fillStyle = '#FF5A52'; poly(g, [[ax + 18, -120], [ax - 6, -134], [ax - 6, -106]]); g.fill(); g.restore(); }
    [[-60, 169.4], [60, 169.6]].forEach(([x, T]) => { const v = clamp((t - T) / 0.6); if (v > 0 && v < 1) C6.pay(g, x, lerp(40, -150, E.inOut(v)), 0.42, A * Math.sin(Math.PI * v), 'PAGO', 'R$ 97', '#3DDC84'); });
    for (let k = 0; k < 6; k++) C6.mark(g, 330 - 100 + (k % 3) * 100, -150 + Math.floor(k / 3) * 80, 0.55, A * ramp(t, 170.4 + k * 0.2, 0.15), true); });

  // 6:57–7:07 "cinco trilhas… até um sistema completo de agentes de IA" — the five covers open one at a time like a fan of cards; then the agents, linked, working on their own
  { scene('tracks', []);
    dropLbl('AGENTES DE IA'); L('AGENTES DE IA', 0, -470, 179.4, 181.9, '#93BCFF', 24, 6);
    const CAPS = ['cap_spark.jpg', 'cap_forge.jpg', 'cap_apex.jpg', 'cap_claude.jpg', 'cap_hermes.jpg'], NODES = [...Array(6)].map((_, k) => { const a = -Math.PI / 2 + k / 6 * 6.283; return [260 * Math.cos(a), -80 + 220 * Math.sin(a)]; });
    OV((g, t) => { if (t < 172.9 || t > 182.0) return; const A = 1 - ramp(t, 181.7, 0.3), fold = ramp(t, 178.9, 0.4, E.inOut);
      CAPS.forEach((n, k) => { const T = 173.6 + k * 0.85, on = E.backOut(clamp((t - T) / 0.45)), rot = lerp(0, (k - 2) * 0.2, clamp(on)) * (1 - fold), x = (k - 2) * 120 * clamp(on) * (1 - fold), y = -100 + 30 * Math.abs(k - 2) * (1 - fold); if (t < T) return;
        imgRot(g, C6.im(n), x, y + 300 * fold, 300 * (1 - 0.4 * fold), 430 * (1 - 0.4 * fold), rot, A * clamp(on * 2) * (1 - fold), { glow: 'rgba(147,188,255,0.5)' }); });
      if (t > 179.2) { const a = A * ramp(t, 179.3, 0.4); NODES.forEach(([x, y], k) => NODES.forEach(([x2, y2], j) => { if (j <= k) return; g.globalAlpha = a * 0.25; g.strokeStyle = '#93BCFF'; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke(); const u = ((t * 0.9 + k * 0.3 + j * 0.17) % 1); g.globalAlpha = a; g.fillStyle = '#BBD4FF'; g.beginPath(); g.arc(lerp(x, x2, u), lerp(y, y2, u), 5, 0, 7); g.fill(); }));
        NODES.forEach(([x, y], k) => { const p = 1 + 0.08 * Math.sin(t * 5 + k); g.globalAlpha = a; g.fillStyle = '#0d1424'; g.strokeStyle = '#6EA6FF'; g.lineWidth = 3; g.beginPath(); g.arc(x, y, 46 * p, 0, 7); g.fill(); g.stroke(); g.globalAlpha = 1; text(g, ['PESQUISA', 'CÓDIGO', 'VENDAS', 'SUPORTE', 'CONTEÚDO', 'DADOS'][k], x, y, `700 12px 'JetBrains Mono'`, '#E6EEFF', a, 'center', 1); });
        g.globalAlpha = 1; C6.plate(g, 'AGENTES', 0, -80, 30, '#FFFFFF', a, { mono: true, sp: 6, bg: 'rgba(30,60,120,0.85)' }); } }); }

  // 7:02–7:07 "um material de apoio personalizado do lado" — the real lesson screen (SALG Club) on a 3D panel; the material side lights; a green check
  scene('lesson', [el(checkArt, 300, 300, 1.2, { dot: true, at: 186.4, tints: [[0, GREEN, 1]] })]);
  dropCall('MATERIAL DE APOIO'); OV((g, t) => { if (t < 182.0 || t > 187.1) return; const a = ramp(t, 182.1, 0.4) * (1 - ramp(t, 186.8, 0.3)), im = C6.im('salg_material.jpg'), w = 900, h = im ? w * im.height / im.width : 500;
    g.save(); g.shadowColor = 'rgba(147,188,255,0.5)'; g.shadowBlur = 30 * a; mediaQuad(g, im, panel3(0, -120, 0, w, h, -0.18 + 0.08 * Math.sin((t - 182) * 0.6), 0.06), { a, grain: 0.22, br: 1.05, stroke: 'rgba(255,255,255,0.5)' }); g.restore();
    const hl = ramp(t, 183.7, 0.4) * (1 - ramp(t, 186.4, 0.3)); if (hl > 0.01) { g.save(); g.globalAlpha = a * hl * (0.6 + 0.4 * Math.sin(t * 5)); g.strokeStyle = '#5BE39A'; g.lineWidth = 5; g.shadowColor = '#5BE39A'; g.shadowBlur = 20; RR(g, 120, -120 - h / 2 + 20, w / 2 - 140, h - 40, 14); g.stroke(); g.restore(); C6.plate(g, 'MATERIAL DE APOIO', 260, -120 - h / 2 - 40, 22, '#5BE39A', a * hl, { mono: true }); } });
  // 7:07–7:10 "você não só assiste, você sai com algo pronto" — the play button blinks; then the app you built (real screen) in a phone
  scene('done', [el(g => { sphere(g, 0, 0, 120, WT, 0.95); g.fillStyle = VOID; poly(g, [[-36, -60], [64, 0], [-36, 60]]); g.fill(); }, -250, -40, 0.95, { pulse: 0.06, pulsef: 6, dim: [188.6, 0.6] }), el(g => phoneArt(g), 250, -40, 0.62, { at: 189.0, br: 1.1 }), el(checkArt, 250, 280, 0.8, { dot: true, at: 189.6, tints: [[0, GREEN, 1]] })]);
  OV((g, t) => { if (t < 189.0 || t > 190.2) return; const a = ramp(t, 189.05, 0.3) * (1 - ramp(t, 189.95, 0.2)); g.save(); RR(g, 250 - 103, -40 - 208, 206, 416, 24); g.clip(); mediaDraw(g, C6.im('app57_tela.jpg'), 250 - 103, -40 - 208, 206, 416, { a, grain: 0.2, blur: 0.3, br: 1.05, sat: 1 }); g.restore(); });
  // 7:10–7:14 "vitalício… é seu pra sempre" — a light keeps running round the infinity
  scene('forever', [el(infArt, 0, -60, 1, { dot: true, reveal: [190.4, 1.0, 'x'], br: 1.2, pulse: 0.015, pulsef: 2 })]);
  OV((g, t) => { if (t < 191.2 || t > 194.0) return; const a = ramp(t, 191.3, 0.3) * (1 - ramp(t, 193.7, 0.3)); for (let k = 0; k < 14; k++) { const ph = (t - 191.3) * 2.2 - k * 0.05, s = Math.sin(ph), c = Math.cos(ph), d = 1 + s * s, x = 330 * c / d, y = -60 + 330 * s * c / d; g.globalAlpha = a * (1 - k / 14); g.fillStyle = '#9CF5C2'; g.shadowColor = '#3DDC84'; g.shadowBlur = 20; g.beginPath(); g.arc(x, y, 12 - k * 0.6, 0, 7); g.fill(); } g.globalAlpha = 1; g.shadowBlur = 0; });
  // 7:14–7:18 "aula nova… sem pagar de novo" — our real new lessons pop into the frame; the line inside it
  PART.media = PART.media.filter(m => !(m.img && m.img.startsWith('week') && m.t0 > 193 && m.t0 < 204)); dropLbl('SEM PAGAR DE NOVO', 'AULA NOVA');
  [1, 2, 3].forEach((n, k) => PART.media.push({ img: C6.IMG + `aula${n}.jpg`, t0: 194.3 + k * 0.45, t1: 198.2, x: -210 + k * 210, y: 110, w: 196, h: 110, r: 8, pop: true, glow: 'rgba(147,188,255,0.7)', grain: 0.28 }));
  OV((g, t) => { if (t < 194.4 || t > 198.2) return; const a = ramp(t, 194.5, 0.3) * (1 - ramp(t, 197.95, 0.25)); C6.plate(g, 'AULA NOVA', 0, -30, 30, '#93BCFF', a, { mono: true, sp: 6 }); C6.plate(g, 'SEM PAGAR DE NOVO', 0, 250, 30, '#5BE39A', a * ramp(t, 196.45, 0.3), { sp: 3 }); });
  // 7:20–7:23 "Conteúdo sobre IA tem de graça aos montes." — every week and every YouTube cover we have, raining in
  OV((g, t) => { if (t < 200.6 || t > 203.4) return; const A = 1 - ramp(t, 203.1, 0.3), L2 = [...[...Array(8)].map((_, k) => `sem${k + 1}.jpg`), ...[...Array(16)].map((_, k) => `yt${k + 1}.jpg`)];
    L2.forEach((n, k) => { const T = 200.7 + k * 0.07, u = clamp((t - T) / 0.5); if (u <= 0) return; const col = k % 4, row = Math.floor(k / 4), x = -390 + col * 260, y = -470 + row * 150 + 30 * (1 - E.backOut(u)); imgRot(g, C6.im(n), x, y, 240, 135, (hash(k, 3) - 0.5) * 0.12, A * clamp(u * 2), { grain: 0.32 }); }); });
  PART.media = PART.media.filter(m => !(m.img && m.img.startsWith('week') && m.t0 > 200)); dropLbl('DE GRAÇA', 'AOS MONTES'); L('DE GRAÇA', 0, 470, 202.0, 203.3, '#5BE39A', 40, 8);

  // 7:23–7:27 "Se conteúdo bastasse, o feed já teria colocado dinheiro no seu bolso." — the real feed playing in the phone; the wallet open and empty
  scene('feedpocket', [el(g => phoneArt(g), 0, -230, 0.6, { br: 1.1 }), el(walletFlat, 0, 300, 0.8, { dot: true, at: 205.4, tints: [[206.9, RED, 0.3]] })]);
  OV((g, t) => { if (t < 203.3 || t > 207.6) return; const a = ramp(t, 203.35, 0.3) * (1 - ramp(t, 207.3, 0.3)); g.save(); RR(g, -100, -230 - 202, 200, 404, 24); g.clip(); mediaDraw(g, seqImg('scrollinsta', t), -100, -432, 200, 404, { a, grain: 0.3, blur: 0.4, br: 0.95 }); g.restore();
    for (let k = 0; k < 10; k++) { const u = ((t - 205.6) * 0.5 + hash(k, 2)) % 1; if (t < 205.6) break; g.globalAlpha = a * 0.5 * Math.sin(Math.PI * u); g.fillStyle = '#9A9AA4'; g.beginPath(); g.arc((hash(k, 4) - 0.5) * 200, 260 - 120 * u, 4, 0, 7); g.fill(); } g.globalAlpha = 1; });
  // 7:27–7:30 "O que te falta é outra coisa." — a real jigsaw: three pieces in place, the fourth missing, its slot glowing; a piece waits, with a ?
  scene('missing', [el(pieceArt(true, true), -105, -145, 1, { at: 207.6 }), el(pieceArt(false, true), 105, -145, 1, { at: 207.75 }), el(pieceArt(true, false), -105, 65, 1, { at: 207.9 }),
    el(pieceArt(false, false), 360, 260, 0.75, { at: 208.6, bob: 10, wob: 0.06, tints: [[0, GREEN, 0.7]] })]);
  dropOver('strokeRect(75, -115, 150, 150)'); dropLbl('O QUE FALTA'); OV((g, t) => { if (t < 208.3 || t > 210.9) return; const a = ramp(t, 208.4, 0.3) * (1 - ramp(t, 210.6, 0.25)) * (0.6 + 0.4 * Math.sin(t * 6)); g.save(); g.globalAlpha = a; g.strokeStyle = '#5BE39A'; g.shadowColor = '#5BE39A'; g.shadowBlur = 24; g.lineWidth = 5; g.setLineDash([14, 10]); RR(g, 5, -35, 200, 200, 10); g.stroke(); g.restore(); C6.plate(g, 'O QUE FALTA', 105, 250, 26, '#5BE39A', a, { mono: true, sp: 4 }); });
  // 7:30–7:35 "Sozinho, quase ninguém começa. E quem começa, quase nunca chega ao fim." — a road straight up to the horizon; one person walks it alone, getting smaller, and stops far from the flag
  { const yAt = u => lerp(500, -430, u), sAt = u => lerp(0.75, 0.16, Math.pow(u, 0.8));
    const walkU = t => 0.62 * E.cubicOut(ramp(t, 211.5, 3.0, E.lin));
    scene('alone3', [el(roadArt(0, 0, 520, -440, 250, 22), 0, 0, 1, {}), el(flagArt, 30, -470, 0.38, { dot: true, tints: [[0, WHITE, 1]] }),
      { ...crowdEl(4, 2, -470, -330, 380, 470, { m0: 0.9, m1: 1.0 }), life: (t, i, p, b) => { b.t[i] = GRAY; b.a[i] = p.a * 0.75; } },
      { ...fullBack(0, 500, 0.75, { pose: t => t < 214.3 ? MAN_POSES.walk(t) : MAN_POSES.sad(t) }), life: (t, i, p, b, e) => { const u = walkU(t), s = sAt(u) / 0.75; b.x[i] = (b.x[i] - e.cx) * s; b.y[i] = yAt(u) + (b.y[i] - 500) * s; if (ramp(t, 214.3, 0.4) > hash(i, 5)) b.t[i] = RED; } }]);
    dropLbl('SOZINHO', 'FIM'); L('SOZINHO', 0, -560, 211.0, 215.0, '#CDCDD3', 28, 6); L('FIM', 30, -400, 211.4, 215.0, '#FFFFFF', 24, 6); }
  // 7:35–7:37 "Quem nunca começou, não sabe por onde ir." — three signposts point everywhere and keep turning; he looks left and right, lost
  scene('cross', [el(signpostArt, 0, -80, 1, { dot: true, wob: 0.18 }), el(signpostArt, -330, -40, 0.6, { dot: true, wob: 0.25, ph: 1, dim: [0, 0.35] }), el(signpostArt, 330, -40, 0.6, { dot: true, wob: 0.25, ph: 2.5, dim: [0, 0.35] }),
    { ...fullAt(0, 330, 0.5, { pose: t => ({ ...MAN_POSES.shrug(t), hd: 0.5 * Math.sin(t * 3) }) }) }]);
  // 7:37–7:45 "recebe um login, fica sozinho com um monte de aulas e trava" — a computer with the course login; he sits in front, head going down
  scene('login', [el(screenArt(560, 330), -40, -170, 1.1, { at: 217.6, br: 1.1 }), { ...fullAt(330, 260, 0.75, { pose: poseAt2(221.3, 'stand', 'sad', 0.8) }), at: 218.6 }, el(textArt('?', 200, WT), 330, -120, 1, { at: 223.1, tints: [[223.4, RED, 0.7]], bob: 6 })]);
  dropLbl('LOGIN', 'TRAVA'); L('TRAVA', 330, -10, 223.2, 224.8, '#FF7A70', 26);
  OV((g, t) => { if (t < 217.7 || t > 224.85) return; const a = ramp(t, 217.8, 0.3) * (1 - ramp(t, 224.55, 0.25)), x = -40, y = -170;
    if (t < 220.7) { g.save(); g.globalAlpha = a; g.fillStyle = '#F2F2F5'; RR(g, x - 150, y - 110, 300, 210, 14); g.fill(); g.fillStyle = '#111'; g.font = `800 20px 'Inter'`; g.textAlign = 'center'; g.fillText('ENTRAR NO CURSO', x, y - 70);
      g.fillStyle = '#ddd'; RR(g, x - 120, y - 45, 240, 34, 8); g.fill(); RR(g, x - 120, y + 2, 240, 34, 8); g.fill(); g.fillStyle = '#3B82F6'; RR(g, x - 120, y + 50, 240, 36, 8); g.fill(); g.fillStyle = '#fff'; g.font = `700 16px 'Inter'`; g.fillText('LOGIN', x, y + 74); g.restore(); }
    else { const n = 12; for (let k = 0; k < n; k++) { const c = k % 4, r = Math.floor(k / 4); g.globalAlpha = a * ramp(t, 220.8 + k * 0.05, 0.15); g.fillStyle = 'rgba(147,188,255,0.25)'; RR(g, x - 290 + c * 146, y - 150 + r * 104, 132, 90, 8); g.fill(); g.fillStyle = 'rgba(255,255,255,0.75)'; poly(g, [[x - 236 + c * 146, y - 122 + r * 104], [x - 212 + c * 146, y - 106 + r * 104], [x - 236 + c * 146, y - 90 + r * 104]]); g.fill(); } g.globalAlpha = 1; } });
  // 7:45–7:51 "Alguém pra responder… e gente em volta fazendo junto" — the ? turns into a check; people come close, around him, talking to him
  scene('answer', [{ ...fullAt(0, 120, 0.8, { pose: poseAt2(227.7, 'sad', 'cheer', 0.5) }) }, el(textArt('?', 150, WT), -170, -190, 1, { at: 225.0, tints: [[227.7, GRAY, 1]], dim: [227.7, 0.5] }), el(checkArt, 170, -190, 1.0, { dot: true, at: 227.6, tints: [[0, GREEN, 1]] }),
    { pts: [...Array(8)].flatMap((_, k) => { const a = k / 8 * 6.283; return B45.map(p => ({ ...p, rsc: 1, x: p.x, y: p.y, pk: k, ang: a, rgPose: k % 2 ? 'talk' : 'wave' })); }), x: 0, y: 0, cx: 0, cy: 0,
      life: (t, i, p, b) => { const on = dropIn(t, 229.3 + p.pk * 0.06, 0.3), r = lerp(620, 330, E.cubicOut(ramp(t, 229.3 + p.pk * 0.06, 1.0))), x = r * Math.cos(p.ang), y = 120 + 0.62 * r * Math.sin(p.ang); b.x[i] += x; b.y[i] += y; b.a[i] = p.a * clamp(on, 0.02); if (on > 0.5 && hash(i, 3) < 0.35) b.t[i] = GREEN; } }]);
  OV((g, t) => { if (t < 229.6 || t > 231.05) return; const a = 1 - ramp(t, 230.8, 0.2); ['bora!', 'faz assim', 'te ajudo', 'boa!!'].forEach((s, k) => { const ang = (k * 2 + 1) / 8 * 6.283, x = 330 * Math.cos(ang), y = 120 + 205 * Math.sin(ang) - 110, on = ramp(t, 229.8 + k * 0.15, 0.2, E.backOut); g.globalAlpha = a * clamp(on); g.fillStyle = '#F2F2F5'; RR(g, x - 60, y - 22, 120, 40, 14); g.fill(); g.globalAlpha = 1; text(g, s, x, y - 1, `700 17px 'Inter'`, '#111', a * clamp(on), 'center', 0); }); });
  // 7:55–8:03 the WhatsApp group: the real photo of a hand with a phone (b-roll), messages landing; the WhatsApp logo
  scene('group', []); PART.bg.push([C6.IMG + 'whats.jpg', 235.4, 243.6, 0.8, { br: 0.82, blur: 0.8, grain: 0.32 }]);
  PART.media.push({ img: C6.IMG + 'whats_logo.png', t0: 235.8, t1: 243.4, x: 0, y: -470, w: 130, h: 130, contain: true, pop: true, glow: 'rgba(37,211,102,0.7)', grain: 0.15 });

  // 8:07–8:17 "O ambiente muda quem você é." — he watches those around him watching; then everyone builds, and so does he
  { const envPose = (k) => t => t < 252.5 ? MAN_POSES.stand(t + k) : t < 255.6 ? mixPose(MAN_POSES.stand(t + k), MAN_POSES.type(t + k), ramp(t, 252.5 + k * 0.05, 0.3)) : mixPose(MAN_POSES.type(t + k), MAN_POSES.hammer(t + k), ramp(t, 255.6 + k * 0.05, 0.3));
    const RING8 = [...Array(10)].map((_, k) => { const a = k / 10 * 6.283; return [370 * Math.cos(a), 60 + 260 * Math.sin(a)]; });
    scene('env', [{ ...fullAt(0, 60, 0.9, { pose: t => t < 252.0 ? MAN_POSES.look(t) : t < 255.4 ? MAN_POSES.type(t) : MAN_POSES.hammer(t) }), tints: [[253.5, BLUE, 0.8], [256.6, ORANGE, 0.9]] },
      { pts: RING8.flatMap(([x, y], k) => B45.map(p => ({ ...p, x: p.x + x, y: p.y + y, pk: k, rgPose: envPose(k) }))), x: 0, y: 0, cx: 0, cy: 0, life: (t, i, p, b) => { const w = ramp(t, 252.5 + p.pk * 0.05, 0.3), c = ramp(t, 255.6 + p.pk * 0.05, 0.3); b.t[i] = c > hash(i, 3) ? ORANGE : w > hash(i, 4) ? BLUE : WHITE; b.a[i] = Math.min(1, p.a * 1.1); } },
      ...RING8.map(([x, y], k) => el(g => cubeC(g, 0, 0, 22, '#FF9B55', 0.95), x, y - 90, 1, { at: 255.7 + k * 0.05, tints: [[0, CLAUDE, 1]] }))]); }
  // 8:20–8:25 "o que separa quem dava certo de quem ficava pelo caminho" — two real roads: one goes on, lit; the other breaks off; a walker on each
  scene('years', [el(roadArt(0, 330, 520, -380, 120, 40), 0, 0, 1, { reveal: [260.2, 1.2, '-y'], tints: [[262.9, GREEN, 0.5]] }), el(roadArt(0, -330, 520, -60, 120, 60), 0, 0, 1, { reveal: [260.2, 1.0, '-y'], tints: [[263.9, RED, 0.5]] }),
    { ...fullBack(0, 470, 0.5, { pose: 'walk' }), life: (t, i, p, b, e) => { const u = 0.9 * E.inOut(ramp(t, 261.0, 3.8, E.lin)), s = lerp(1, 0.35, u); b.x[i] = lerp(0, 330, u) + (b.x[i] - e.cx) * s; b.y[i] = lerp(470, -380, u) + (b.y[i] - 470) * s; if (u > 0.5 && hash(i, 4) < 0.6) b.t[i] = GREEN; } },
    { ...fullBack(0, 470, 0.5, { pose: t => t < 263.9 ? MAN_POSES.walk(t + 0.4) : MAN_POSES.sad(t) }), life: (t, i, p, b, e) => { const u = 0.8 * E.inOut(ramp(t, 261.2, 2.6, E.lin)), s = lerp(1, 0.6, u); b.x[i] = lerp(0, -330, u) + (b.x[i] - e.cx) * s; b.y[i] = lerp(470, -60, u) + (b.y[i] - 470) * s; const f = ramp(t, 264.0, 0.8); if (f > hash(i, 6)) b.t[i] = RED; b.a[i] *= 1 - 0.7 * f; } }]);
  dropLbl('DEU CERTO', 'FICOU PELO CAMINHO'); L('DEU CERTO', 330, -460, 262.9, 265.2, '#5BE39A', 26); L('FICOU PELO CAMINHO', -330, -150, 264.0, 265.2, '#FF7A70', 22);
  // 8:25–8:30 "o acompanhamento… é o centro de tudo" — you at the centre; the three of us around you, close, linked; the community in an outer ring
  { const MENT = [0, 1, 2].map(k => -Math.PI / 2 + k * 2.094), COMM = [...Array(14)].map((_, k) => k / 14 * 6.283);
    scene('center', [{ ...fullAt(0, 40, 0.8, { pose: 'cheer' }), br: 1.2 }, ...MENT.map((a, k) => ({ ...fullAt(0, 0, 0.5, { pose: k === 1 ? 'point' : 'talk' }), life: (t, i, p, b, e) => { const ang = a + (t - 265.2) * 0.35; b.x[i] = 280 * Math.cos(ang) + (b.x[i] - e.cx); b.y[i] = -10 + 190 * Math.sin(ang) + (b.y[i] - e.cy); b.t[i] = OWNB; }, at: 265.6 + k * 0.15 })),
      { pts: COMM.flatMap((a, k) => B30.map(p => ({ ...p, pk: k, ang: a }))), x: 0, y: 0, cx: 0, cy: 0, life: (t, i, p, b) => { const ang = p.ang - (t - 265.2) * 0.15, on = ramp(t, 266.6 + p.pk * 0.04, 0.3); b.x[i] += 470 * Math.cos(ang); b.y[i] += 20 + 330 * Math.sin(ang); b.a[i] = p.a * clamp(on, 0.02) * 0.85; } }]);
    dropLbl('ACOMPANHAMENTO', 'O CENTRO DE TUDO');
    OV((g, t) => { if (t < 265.4) return; const a = ramp(t, 265.5, 0.4) * (1 - ramp(t, 270.3, 0.3)); MENT.forEach((a0, k) => { const ang = a0 + (t - 265.2) * 0.35, x = 280 * Math.cos(ang), y = -10 + 190 * Math.sin(ang) - 60; g.globalAlpha = a * 0.6 * ramp(t, 265.8 + k * 0.15, 0.3); g.strokeStyle = '#6EA6FF'; g.lineWidth = 3; g.setLineDash([8, 8]); g.lineDashOffset = -t * 40; g.beginPath(); g.moveTo(0, -60); g.lineTo(x, y); g.stroke(); g.setLineDash([]); });
      g.globalAlpha = 1; C6.plate(g, 'ACOMPANHAMENTO', 0, -420, 30, '#FFFFFF', a * ramp(t, 266.3, 0.3), { mono: true, sp: 6 }); C6.plate(g, 'O CENTRO DE TUDO', 0, 470, 32, '#5BE39A', a * ramp(t, 268.3, 0.3), { sp: 4 }); }); }
}


// ═════════════════════════ PARTE 2 · v7 — os ajustes do Igor de 23/10. Cenas refeitas por nome depois da buildPartV6.
PLAY.push(['celularvitor', 139.4, 150.7, 0, false], ['salgclub', 181.8, 190.3, 0, false], ['aplicativo2', 114.8, 116.0, 0, true], ['aplicativo2', 156.1, 162.2, 0, true], ['tut', 217.4, 224.9, 0, true], ['scrollinsta', 203.0, 207.7, 0, true]);
SEQS.tut = { ...SEQS.tut, fps: 55 };                                        // the tutorial runs fast (accelerated, confusing)
let FULL_HELM = null;
const A7D = [[92, 446], [-22, 332], [47, 227], [44, -212], [47, -334], [53, -474], [6, -577]];   // the 7 steps of the climb on a7d.jpg (world)
const pathAt = u => { const n = A7D.length - 1, f = clamp(u) * n, k = Math.min(n - 1, Math.floor(f)), q = f - k; return [lerp(A7D[k][0], A7D[k + 1][0], q), lerp(A7D[k][1], A7D[k + 1][1], q)]; };

function buildPartV7() {
  FULL_HELM = manFull(624, { helmet: true });
  const fullHelm = (x, y, s, o = {}) => ({ pts: FULL_HELM.map(p => ({ ...p, rsc: s, rgPose: o.pose || p.rgPose, x: p.x * s + x, y: p.y * s + y, s: p.s * Math.max(0.6, s) })), x, y, cx: x, cy: y, ...o });
  const fullBack = (x, y, s, o = {}) => ({ pts: FULL_BACK.map(p => ({ ...p, rsc: s, rgPose: o.pose || p.rgPose, x: p.x * s + x, y: p.y * s + y, s: p.s * Math.max(0.6, s) })), x, y, cx: x, cy: y, ...o });
  const archRoll = (x, y, s = 1, o = {}) => el(g => { g.fillStyle = LG(g, -16, 0, 16, 0, [[0, tone(BL, 0.6)], [0.5, tone(BL, 1)], [1, tone(BL, 0.55)]]); RR(g, -16, -95, 32, 190, 14); g.fill(); g.fillStyle = tone(WT, 0.9); g.beginPath(); g.ellipse(0, -95, 16, 7, 0, 0, 7); g.fill(); }, x, y, s, { tints: [[0, BLUE, 1]], ...o });
  // the narrator's L-cut (his voice goes on, he leaves a little earlier, the next scene forms under him)
  NARR.forEach(w => { if (w[1] < 900) w[1] -= 0.3; });
  PART.keys.forEach(k => { if (k[1] === 'void') return; const w = NARR.find(([a, b]) => Math.abs(k[0] - (b + 0.3)) < 0.36); if (w) k[0] = w[1] - 0.05; });

  // 4:07 the opening sentence: letters that drop in over the b-roll, no plate
  dropOver("'CONSTRUIR', 0.32");
  OV((g, t) => { if (t > 3.8) return; const A = 1 - ramp(t, 3.45, 0.3);
    C6.kinetic(g, 'CONSTRUIR', 0, -330, 104, '#FFFFFF', t, 0.3, { a: A, sp: 6 }); C6.kinetic(g, 'EXIGE UMA COISA', 0, -200, 52, '#FFB07A', t, 0.78, { a: A, sp: 4, w: 800 });
    C6.kinetic(g, 'QUE O FEED', 0, -95, 52, '#93BCFF', t, 2.1, { a: A, sp: 4, w: 800 }); C6.kinetic(g, 'NUNCA TE DÁ', 0, 20, 72, '#FF5A52', t, 2.64, { a: A, sp: 4, glow: 'rgba(255,90,82,0.6)' }); });
  // 4:10 começo, meio e fim: the three dots get their meaning (a start, the work, the finish line)
  scene('path3', [el(pathArt, 0, 0, 1, { dot: true, reveal: [3.6, 2.0, 'x'], br: 1.2, tints: [[5.6, GREEN, 1]] }),
    el(g => { sphere(g, 0, 0, 60, WT, 1); g.fillStyle = VOID; poly(g, [[-18, -30], [32, 0], [-18, 30]]); g.fill(); }, -380, -150, 1, { at: 4.36, s0: 0.3, bob: 6 }),
    el(gearArt, 0, -150, 0.9, { at: 5.06, s0: 0.3, spin: 1.5 }), el(flagArt, 380, -120, 0.9, { dot: true, at: 5.6, s0: 0.3, tints: [[0, GREEN, 1]], wob: 0.05 })]);
  // 4:11 the builder's helmet rides on his head (part of the mannequin now)
  { const bricks = ELS.obra.filter(e => e.draw === brickOne || e.draw === bagArt);
    scene('obra', [...bricks.map(e => ({ ...e })), { ...fullHelm(300, 60, 1.1, { pose: poseAt2(8.3, 'stand', 'hammer') }), at: 8.2, from: [0, -60] }]); }
  scene('access', [el(bricksArt, -170, 60, 0.6, { dot: true }), el(bagArt, 40, 50, 0.55, { dot: true }), { ...fullHelm(220, 30, 0.75, { pose: 'hammer' }) },
    { ...crowdEl(11, 3, -470, 470, 280, 450, { m0: 0.8, m1: 1.1 }), life: (t, i, p, b) => { const on = dropIn(t, 8.95 + 0.012 * p.pk, 0.3); b.a[i] = Math.min(1, p.a * 1.2) * clamp(on, 0.02); b.t[i] = WHITE; b.y[i] = p.y + 40 * (1 - clamp(on)); } }]);
  // 4:24 the blueprint unrolls: two rolls pulled apart by two hands, the plan between them; he points, the helmeted crew works
  { const op = t => ramp(t, 18.15, 1.0, E.inOut), rollX = (t, s) => s * (40 + 300 * op(t));
    const unfold = (t, i, p, b, e) => { const o = op(t), dx = b.x[i] - e.cx; if (Math.abs(dx) > 300 * o + 30) b.a[i] = 0.02; };
    const roll = s => el(g => { g.fillStyle = LG(g, -26, 0, 26, 0, [[0, tone('#DDE8FF', 0.55)], [0.45, tone('#DDE8FF', 1)], [1, tone('#DDE8FF', 0.5)]]); RR(g, -26, -250, 52, 500, 22); g.fill(); g.fillStyle = tone(BL, 0.8); g.beginPath(); g.ellipse(0, -250, 26, 10, 0, 0, 7); g.fill(); }, 0, -130, 1, { life: (t, i, p, b) => { b.x[i] += rollX(t, s); b.a[i] *= 1 - ramp(t, 19.7, 0.4); } });
    const hand = s => el(g => { g.save(); g.scale(s, 1); handGrip(g, s); g.restore(); }, 0, 110, 0.75, { life: (t, i, p, b) => { b.x[i] += rollX(t, s); b.a[i] *= 1 - ramp(t, 19.7, 0.4); }, tints: [[0, CREAM, 1]] });
    scene('draw', [el(blueprintArt, 0, -130, 1, { life: unfold, br: 1.15 }), roll(-1), roll(1), hand(-1), hand(1), { ...fullAt(-330, 300, 0.8, { pose: poseAt2(20.4, 'stand', 'point') }), at: 19.8 },
      { ...fullHelm(150, 330, 0.6, { pose: 'hammer' }), at: 20.55, from: [60, 0] }, { ...fullHelm(320, 330, 0.6, { pose: 'build' }), at: 20.75, from: [60, 0] }]); }
  // 4:31 the crew in helmets builds with the robots (kept), 4:37 he chooses — already the architect: a blueprint roll in hand, a blue touch
  { const H3 = [[-310, -80], [0, -110], [310, -60]];
    scene('choose', [...H3.map(([x, y], k) => el(houseArt6(k), x, y, 0.85, { bob: 8, bobf: 1.6, ph: k * 2, tints: k === 1 ? [[31.6, GREEN, 0.9]] : [[30.7, GRAY, 1]], dim: k === 1 ? undefined : [31.6, 0.6], flash: k === 1 ? [31.76] : undefined, moves: k === 1 ? [[31.6, 0.5, 0, -60, 0.18]] : [[31.6, 0.5, 0, 50, -0.1]] })),
      { ...fullAt(0, 300, 0.9, { pose: poseAt2(31.2, 'look', 'point') }), br: 1.2, tints: [[30.7, OWNB, 0.35]] }, archRoll(-62, 300, 0.8)]); }
  // 4:41–4:47 "dentro do feed… do lado de fora": a phone lying like an arena, the crowd packed inside fighting over one $;
  // outside it, banknotes pile up on the ground and three people walk calmly to them
  { dropOver('330 + (hash(k, 3) - 0.5) * 380');
    const ISO = (u, v) => [-170 + u - 0.9 * v * 0.55, -40 + 0.28 * u + 0.5 * v];
    const arena = el(g => { g.save(); g.transform(1, 0.28, -0.5, 0.5, 0, 0); phoneArt(g); g.restore(); }, -170, -40, 0.95, { br: 1.1 });
    const fight = []; let k = 0; for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) { const [x, y] = ISO((c - 2) * 52, (r - 3) * 80); BUSTD_T.forEach(p => fight.push({ ...p, x: p.x + x, y: p.y + y, pk: k, bx: x, by: y, rgPose: 'reach' })); k++; }
    const D3 = [[290, 'walk', 0], [400, 'walk', 0.25], [510, 'walk', 0.5]];
    scene('inout', [arena, { pts: fight, x: 0, y: 0, cx: 0, cy: 0, life: (t, i, p, b) => { const k2 = ramp(t, 42.2, 0.4) * (1 - ramp(t, 44.2, 0.4)); b.x[i] += (2 + 4 * k2) * Math.sin(t * 37 + p.pk); b.t[i] = hash(p.pk, 9) < 0.6 * k2 ? RED : WHITE; b.a[i] = Math.min(1, p.a * 1.2); } },
      TX('$', 90, WT, { x: -170, y: -50, tint: WHITE, pulse: 0.06 }), el(g => { g.fillStyle = tone(GN, 0.45); RR(g, -260, -3, 520, 6, 3); g.fill(); }, 330, 360, 1, { at: 44.4 }),
      ...D3.map(([x, pose, d]) => ({ ...fullAt(x + 120, 300, 0.42, { side: true, pose: t => walkAt(u => [-120 * E.cubicOut(ramp(u, 44.8 + d, 2.4)), 0, 0.38], 44.8 + d, t, 'side') }), at: 44.6 + d, life: (t, i, p, b) => { b.x[i] += -120 * E.cubicOut(ramp(t, 44.8 + d, 2.4)); b.x[i] = 2 * (x + 120 - 120 * E.cubicOut(ramp(t, 44.8 + d, 2.4))) - b.x[i]; } }))]);
    dropLbl('DENTRO DO FEED', 'LADO DE FORA'); L('DENTRO DO FEED', -200, 330, 43.4, 47.8, '#93BCFF', 22); L('LADO DE FORA', 330, -300, 45.1, 47.8, '#5BE39A', 26);
    OV((g, t) => { if (t < 44.4 || t > 47.9) return; const A = 1 - ramp(t, 47.6, 0.3); for (let k = 0; k < 18; k++) { const T0 = 44.5 + k * 0.12, u = clamp((t - T0) / 0.9); if (u <= 0) continue; const x = 330 + (hash(k, 3) - 0.5) * 360, yG = 340 - 14 * Math.floor(k / 4), y = lerp(-560, yG, E.quadIn(u)); C6.bill(g, x, y, 0.5, u < 1 ? Math.sin(t * 3 + k) * 0.8 : (hash(k, 5) - 0.5) * 0.4, A); } }); }
  // 4:47–4:53 the feed: everyone inside the phone, scrolling the same thing in sync
  { const P6 = [], SP = []; for (let r = 0; r < 6; r++) for (let c = 0; c < 4; c++) { const x = -165 + c * 110, y = -350 + r * 132; SP.push([x, y - 40]); P6.push(...bustAt(B30, x, y, r * 4 + c, { rgPose: t => MAN_POSES.scroll(t) })); }
    scene('split', [el(g => phoneArt(g), 0, -40, 1.32, { br: 0.8 }), { pts: P6, x: 0, y: 0, cx: 0, cy: 0, life: (t, i, p, b) => { const on = dropIn(t, 48.4 + 0.02 * p.bk, 0.25); b.a[i] = Math.min(1, p.a * 1.15) * clamp(on, 0.02); b.t[i] = ramp(t, 49.4, 0.4) > hash(p.bk, 5) ? BLUE : WHITE; } }]);
    dropOver('SP.forEach(([x, y], k) => { const u = clamp((t - 51.75'); OV((g, t) => { if (t < 50.6 || t > 53.25) return; const A = 1 - ramp(t, 53.0, 0.25), s0 = ramp(t, 50.7, 0.4, E.backOut); if (t < 51.75) { C6.bill(g, 0, -560, 1.5 * s0, 0, A * s0); return; }
      SP.forEach(([x, y], k) => { const u = clamp((t - 51.75 - 0.015 * k) / 0.7), q = E.inOut(u); C6.bill(g, lerp((hash(k, 1) - 0.5) * 200, x, q), lerp(-560, y, q), lerp(0.4, 0.12, q), 3 * q, A * (u > 0 ? 1 : 0)); }); }); }
  // 5:02–5:05 the eye: the iris stays inside it, looks around smoothly, blinks
  { const EYE = [0, -230], blink = t => Math.max(...[63.55, 64.65].map(T => Math.exp(-(((t - T) / 0.07) ** 2)))), irisXY = t => [34 * Math.sin((t - 62.9) * 1.4) * ramp(t, 63.0, 0.5), 10 * Math.sin((t - 62.9) * 1.1)];
    const shut = (t, i, p, b) => { const s = 1 - 0.95 * blink(t); b.y[i] = EYE[1] + (b.y[i] - EYE[1]) * s; };
    scene('see', [el(lidArt(0, 0), EYE[0], EYE[1], 1.9, { dot: true, cell: 3, br: 1.25, life: shut }), el(irisArt(0, 0), EYE[0], EYE[1], 1.9, { dot: true, cell: 3, at: 62.9, s0: 0.6, life: (t, i, p, b) => { const [dx, dy] = irisXY(t); b.x[i] += dx; b.y[i] += dy; const ux = (b.x[i] - EYE[0]) / (125 * 1.9), uy = (b.y[i] - EYE[1]) / (70 * 1.9); if (ux * ux + uy * uy > 0.92) b.a[i] = 0.02; shut(t, i, p, b); } }),
      { ...crowdEl(11, 3, -460, 460, 220, 420), life: (t, i, p, b) => { b.t[i] = GRAY; b.a[i] = p.a * 0.6; } }]); }
  // 5:08–5:11 he dissolves into the crowd and is gone; the eye closes
  scene('still', [{ ...fullAt(0, 60, 1.0, { pose: 'sad' }), life: (t, i, p, b, e) => { const q = E.inOut(ramp(t, 69.4, 1.3)), tx = 140, ty = 260, s = lerp(1, 0.42, q); b.x[i] = lerp(e.cx, tx, q) + (b.x[i] - e.cx) * s; b.y[i] = lerp(e.cy, ty, q) + (b.y[i] - e.cy) * s; if (q > hash(i, 3)) b.t[i] = GRAY; b.a[i] *= 1 - ramp(t, 70.5, 0.6); } },
    el(lidArt(0, 0), 0, -330, 0.6, { dot: true, life: (t, i, p, b) => { const c = ramp(t, 70.1, 0.35, E.inOut); b.y[i] = -330 + (b.y[i] + 330) * (1 - 0.95 * c); b.a[i] *= 1 - ramp(t, 70.4, 0.4); } }),
    { ...crowdEl(13, 4, -500, 500, -40, 380, { m0: 0.8, m1: 1.1 }), life: (t, i, p, b) => { const on = ramp(t, 68.6 + 0.004 * p.pk, 0.5); b.a[i] = p.a * clamp(on, 0.02) * 0.7; b.t[i] = GRAY; } }]);
  // 5:21–5:28 the scale tips the right way: YOU weigh more than the price
  { const tilt = t => 0.28 * ramp(t, 85.4, 0.9, E.backOut) + 0.12 * Math.sin((t - 81.3) * 2.3) * (1 - ramp(t, 85.1, 0.4));
    const beam = (t, i, p, b) => { const a = tilt(t), dx = b.x[i], dy = b.y[i] + 100; b.x[i] = dx * Math.cos(a) - dy * Math.sin(a); b.y[i] = -100 + dx * Math.sin(a) + dy * Math.cos(a); };
    scene('scale', [el(scaleArt, 0, 60, 1, { dot: true }), el(beamArt, 0, -100, 1, { dot: true, life: beam }), el(tagArt(GD), -290, -20, 0.6, { dot: true, at: 82.2, life: beam, tints: [[0, CHOCO, 1]] }),
      ...[0, 1, 2, 3].map(k => el(g => cubeC(g, 0, 0, 50, GN, 1), 290 + (k % 2) * 56 - 28, -14 - Math.floor(k / 2) * 50, 1, { dot: true, at: 84.6 + k * 0.15, life: beam, br: 1.5, tints: [[0, GREEN, 1]] }))]); }
  // 5:41 the logo (the new one, black background removed), big and with grain
  PART.media = PART.media.filter(m => !(m.img && m.img.includes('ats_logo')));
  PART.media.push({ img: C6.IMG + 'logo_alpha.png', t0: 101.6, t1: 104.4, x: 0, y: -80, w: 760, h: 760, contain: true, pop: true, grain: 0.3, blur: 0.35, br: 1.0 });
  // 5:43–5:47 the Arquiteto 7D: the climb on the real artwork, seven steps up to the temple, in blue
  scene('d7', [{ ...fullBack(A7D[0][0], A7D[0][1], 0.62, { pose: 'walk' }), at: 104.7, life: (t, i, p, b, e) => { const u = E.inOut(ramp(t, 104.9, 2.8, E.lin)), [x, y] = pathAt(u), s = lerp(1, 0.45, u); b.x[i] = x + (b.x[i] - e.cx) * s; b.y[i] = y + (b.y[i] - e.cy) * s; if (hash(i, 3) < 0.5) b.t[i] = OWNB; } }]);
  PART.bg.push([C6.IMG + 'a7d.jpg', 104.4, 108.0, 0.95, { br: 1.0, blur: 0.3, grain: 0.22, sat: 1 }]);
  dropLbl('ARQUITETO', 'O PRIMEIRO PASSO');
  OV((g, t) => { if (t < 104.6 || t > 108.0) return; const A = 1 - ramp(t, 107.7, 0.3), u = E.inOut(ramp(t, 104.9, 2.8, E.lin)); A7D.forEach(([x, y], k) => { const reached = u * 6 >= k - 0.05; if (!reached) return; const T = 104.9 + 2.8 * (k / 6), p = Math.exp(-Math.max(0, t - T) * 3); g.save(); g.globalAlpha = A; g.fillStyle = '#6EA6FF'; g.shadowColor = '#4D8DFF'; g.shadowBlur = 20 + 30 * p; g.beginPath(); g.arc(x, y - 4, 9 + 8 * p, 0, 7); g.fill(); g.restore(); });
    C6.kinetic(g, 'O PRIMEIRO PASSO', 0, 600, 34, '#93BCFF', t, 105.2, { a: A * (1 - ramp(t, 106.9, 0.3)), w: 800 }); });
  // 5:47–5:56 the projects in a laptop: the system while the bar fills; then site, app and system, each in the laptop
  dropOver("seqImg('sistema', t), 0, -150, 780", 'VOCÊ ESCOLHE');
  OV((g, t) => { if (t > 107.95 && t < 112.6) C6.laptop(g, seqImg('sistema', t), 0, -170, 800, -0.18 + 0.12 * Math.sin((t - 108) * 0.6), ramp(t, 108.0, 0.4) * (1 - ramp(t, 112.3, 0.3)), { glow: 'rgba(91,227,154,0.45)' });
    if (t < 112.7 || t > 116.35) return; const L3 = [[114.35, 114.97, 'site', null], [114.97, 115.92, 'aplicativo2', null], [115.92, 116.35, 'sistema', null]];
    C6.kinetic(g, 'VOCÊ ESCOLHE', 0, -120, 70, '#FFFFFF', t, 112.8, { a: 1 - ramp(t, 114.2, 0.2), sp: 6 });
    L3.forEach(([T0, T1, id]) => { const a = ramp(t, T0, 0.15) * (1 - ramp(t, T1, 0.15)); if (a < 0.01) return; const q = E.cubicOut(ramp(t, T0, 0.4)); C6.laptop(g, seqImg(id, t), lerp(260, 0, q), -130, 800, lerp(0.6, -0.12, q), a, { glow: 'rgba(255,155,85,0.4)' }); }); });
  // 6:00–6:05 180 hours vs 14: the 14 go fast — a ring of seven days that fills quickly, 2 h each, while the 180 crawl
  scene('vs14', []); dropLbl('180 H', 'FEED', '14 H', '7D', '2H');
  OV((g, t) => { if (t < 125.0 || t > 130.4) return; const A = ramp(t, 125.05, 0.3) * (1 - ramp(t, 130.1, 0.3));
    g.save(); g.globalAlpha = A; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `900 92px 'Inter'`; g.fillStyle = '#7C7C86'; g.fillText('180 H', 0, -470); g.font = `600 20px 'JetBrains Mono'`; g.fillStyle = '#7C7C86'; g.fillText('NO FEED · POR ANO', 0, -405);
    const R = 230, cx = 0, cy = 40, u = ramp(t, 125.9, 2.6, E.lin); for (let k = 0; k < 7; k++) { const a0 = -Math.PI / 2 + k * 2 * Math.PI / 7 + 0.04, a1 = a0 + 2 * Math.PI / 7 - 0.08, f = clamp(u * 7 - k);
      g.lineCap = 'round'; g.lineWidth = 34; g.strokeStyle = 'rgba(255,255,255,0.1)'; g.beginPath(); g.arc(cx, cy, R, a0, a1); g.stroke();
      if (f > 0) { g.strokeStyle = '#3DDC84'; g.shadowColor = '#3DDC84'; g.shadowBlur = 20; g.beginPath(); g.arc(cx, cy, R, a0, a0 + (a1 - a0) * f); g.stroke(); g.shadowBlur = 0; }
      const am = (a0 + a1) / 2; g.fillStyle = f >= 1 ? '#5BE39A' : '#8A8A94'; g.font = `700 18px 'JetBrains Mono'`; g.fillText(`D${k + 1}`, cx + (R + 52) * Math.cos(am), cy + (R + 52) * Math.sin(am)); }
    const h = Math.round(14 * u); g.font = `900 120px 'Inter'`; g.fillStyle = '#5BE39A'; g.shadowColor = '#3DDC84'; g.shadowBlur = 30 * (u > 0.99 ? 1 + Math.sin(t * 8) * 0.3 : 0.4); g.fillText(`${h} H`, cx, cy - 10); g.shadowBlur = 0;
    g.font = `700 22px 'JetBrains Mono'`; g.fillStyle = '#FFFFFF'; g.fillText('2 H POR DIA · 7 DIAS', cx, cy + 80); g.restore(); });
  // 6:12 your thing live: the system in a laptop, the shield breathing
  dropOver("seqImg('sistema', t), 0, -150, 760"); OV((g, t) => { if (t > 130.3 && t < 133.1) C6.laptop(g, seqImg('sistema', t), 0, -180, 780, -0.15 + 0.1 * Math.sin(t * 0.8), ramp(t, 130.4, 0.4) * (1 - ramp(t, 132.8, 0.3)), { glow: 'rgba(91,227,154,0.5)' }); });
  // 6:25–6:36 the video of Vitor's phone in a phone mockup; the key words move around it, never over it
  dropOver('VÍDEO DO CELULAR DO VITOR'); scene('vphone', []);
  OV((g, t) => { if (t < 139.5 || t > 150.6) return; const A = ramp(t, 139.6, 0.35) * (1 - ramp(t, 150.3, 0.3)); C6.phone(g, seqImg('celularvitor', t), 0, -60, 380, A, { ratio: 2.17, glow: 'rgba(147,188,255,0.4)' });
    const W2 = [[139.66, 142.9, 'QUANTO SAI', '#FFFFFF', -560], [141.6, 142.9, 'DO SEU BOLSO?', '#FF7A70', -490], [143.3, 145.8, 'PEDI PRA IA', '#93BCFF', -560], [144.12, 145.8, 'UM APLICATIVO', '#FFFFFF', -490],
      [146.8, 147.4, 'ENTRA', '#5BE39A', 430], [147.45, 148.2, 'SAI', '#FF7A70', 430], [148.26, 150.4, 'PRA ONDE VAI', '#FFFFFF', 400], [149.5, 150.4, 'O SEU DINHEIRO', '#5BE39A', 470]];
    W2.forEach(([T0, T1, s, col, y]) => { if (t < T0 || t > T1 + 0.3) return; C6.kinetic(g, s, 0, y, 50, col, t, T0, { a: A * (1 - ramp(t, T1, 0.25)), sp: 4 }); }); });
  // 6:36–6:41 43 MIN, crisp and bright
  scene('min43', [el(laptopArt(0, 0, 1.8), -230, 170, 1, { at: 153.2 }), TX('</>', 140, WT, { x: 230, y: 150, at: 154.2 })]);
  OV((g, t) => { if (t < 150.8 || t > 156.3) return; const on = ramp(t, 150.9, 0.4, E.backOut), A = clamp(on * 1.5) * (1 - ramp(t, 156.0, 0.25)); g.save(); g.globalAlpha = A; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `900 ${Math.round(210 * (1.2 - 0.2 * clamp(on)))}px 'Inter'`;
    g.shadowColor = '#3DDC84'; g.shadowBlur = 50 + 20 * Math.sin(t * 4); g.fillStyle = '#6BFFAE'; g.fillText('43 MIN', 0, -260); g.restore(); });
  // 6:41–6:47 site, app and system in three laptops, each with a robot building it
  dropOver('PNL.forEach'); OV((g, t) => { if (t < 156.2 || t > 162.2) return; const A = 1 - ramp(t, 161.9, 0.3), PN = [[-250, -330, 'site'], [250, -330, 'sistema'], [0, 80, 'aplicativo2']];
    PN.forEach(([x, y, id], k) => { const T0 = 156.9 + k * 0.6, q = E.cubicOut(ramp(t, T0, 0.5)); C6.laptop(g, seqImg(id, t), x, y + 40 * (1 - q), k === 2 ? 520 : 440, (k - 1) * -0.25 + 0.05 * Math.sin(t + k), A * ramp(t, T0, 0.3));
      const bar = ramp(t, T0 + 0.3, 1.6); g.globalAlpha = A * ramp(t, T0, 0.3); g.fillStyle = 'rgba(255,255,255,0.2)'; RR(g, x - 150, y + (k === 2 ? 230 : 200), 300, 10, 5); g.fill(); g.fillStyle = '#5BE39A'; RR(g, x - 150, y + (k === 2 ? 230 : 200), 300 * bar, 10, 5); g.fill(); g.globalAlpha = 1; }); });
  // 6:52–6:57 PROSPECÇÃO (a dart hits the target), PRECIFICAÇÃO (the price tag, two people paying), MENSALIDADE (the months tick)
  { dropOver("'PROSPECÇÃO'");
    scene('howto', [el(targetArt, -330, -150, 0.8, { at: 167.7, bob: 4 }), el(tagArt(GN), 0, -170, 0.75, { dot: true, at: 169.1, bob: 6, tints: [[0, GREEN, 1]] }), { ...fullAt(-70, 120, 0.5, { pose: poseAt2(169.5, 'stand', 'reach') }), at: 169.2 }, { ...fullAt(70, 120, 0.5, { pose: poseAt2(169.7, 'stand', 'reach') }), at: 169.3 },
      el(calArt, 330, -150, 0.75, { dot: true, at: 170.1, bob: 4 })]);
    OV((g, t) => { if (t < 167.6 || t > 172.85) return; const A = 1 - ramp(t, 172.55, 0.25);
      [[-330, 'PROSPECÇÃO', 167.8, '#FFFFFF'], [0, 'PRECIFICAÇÃO', 169.2, '#93BCFF'], [330, 'MENSALIDADE', 170.2, '#5BE39A']].forEach(([x, s, T, col]) => C6.kinetic(g, s, x, 330, 26, col, t, T, { a: A, w: 800, sp: 2 }));
      const u = clamp((t - 167.95) / 0.42), hitT = 168.37; if (t > 167.95) { const x = t < hitT ? lerp(-640, -360, E.quadIn(u)) : -360, y = t < hitT ? -150 - 120 * Math.sin(Math.PI * u) * 0.6 : -150, wob = t > hitT ? 0.12 * Math.sin((t - hitT) * 40) * Math.exp(-(t - hitT) * 6) : -0.25 * (1 - u); C6.dart(g, x, y, 0.85, wob, A); }
      if (t > hitT && t < hitT + 0.5) { const r = (t - hitT) * 300; g.save(); g.globalAlpha = A * (1 - (t - hitT) / 0.5); g.strokeStyle = '#FF5A52'; g.lineWidth = 4; g.beginPath(); g.arc(-330, -150, r, 0, 7); g.stroke(); g.restore(); }
      C6.plate(g, 'R$ 97', 0, -170, 34, '#FFFFFF', A * ramp(t, 169.3, 0.3), { plate: false, glow: '#3DDC84' });
      [[-70, 169.6], [70, 169.85]].forEach(([x, T]) => { const v = clamp((t - T) / 0.6); if (v > 0 && v < 1) C6.pay(g, x, lerp(20, -150, E.inOut(v)), 0.4, A * Math.sin(Math.PI * v), 'PAGO', 'R$ 97', '#3DDC84'); });
      for (let k = 0; k < 6; k++) C6.mark(g, 330 - 100 + (k % 3) * 100, -180 + Math.floor(k / 3) * 80, 0.55, A * ramp(t, 170.4 + k * 0.2, 0.15), true); }); }
  // 6:57–7:06 the five tracks: their real covers, whole (16:9), popping in one by one in a tidy grid; then the agents, each with a job, passing work to each other
  { dropOver('CAPS.forEach');
    const CAPS = ['cap_spark.jpg', 'cap_forge.jpg', 'cap_apex.jpg', 'cap_claude.jpg', 'cap_hermes.jpg'], POS = [[-255, -470], [255, -470], [-255, -180], [255, -180], [0, 110]];
    const AG = [['PESQUISA', '?', -240, -420], ['CONTEÚDO', '✎', 240, -420], ['CÓDIGO', '<>', -240, -210], ['VENDAS', '$', 240, -210], ['DADOS', '▤', -240, 0], ['SUPORTE', '☎', 240, 0]], LINKS = [[0, 1], [1, 3], [2, 4], [4, 3], [3, 5], [0, 2], [5, 1]];
    OV((g, t) => { if (t < 172.9 || t > 182.0) return; const A = 1 - ramp(t, 181.7, 0.3), out = ramp(t, 178.9, 0.35);
      CAPS.forEach((n, k) => { const T = 173.6 + k * 0.65, on = E.backOut(clamp((t - T) / 0.4)); if (t < T) return; const [x, y] = POS[k], s = 0.75 + 0.25 * clamp(on);
        g.save(); g.globalAlpha = A * clamp(on * 2) * (1 - out); g.shadowColor = 'rgba(147,188,255,0.5)'; g.shadowBlur = 24; g.fillStyle = '#000'; RR(g, x - 230 * s, y - 130 * s, 460 * s, 259 * s, 14); g.fill(); g.restore();
        mediaDraw(g, C6.im(n), x - 230 * s, y - 130 * s, 460 * s, 259 * s, { a: A * clamp(on * 2) * (1 - out), r: 14, blur: 0.3, grain: 0.25, br: 1.02, sat: 1 }); });
      if (t < 179.1) return; const a = A * ramp(t, 179.15, 0.35), u = (t - 179.3) / 0.45;
      LINKS.forEach(([p, q], j) => { const [, , x0, y0] = AG[p], [, , x1, y1] = AG[q]; g.globalAlpha = a * 0.35; g.strokeStyle = '#6EA6FF'; g.lineWidth = 3; g.setLineDash([8, 8]); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); g.setLineDash([]);
        const f = clamp(u - j * 0.55, 0, 1); if (f > 0 && f < 1) { g.globalAlpha = a; g.fillStyle = '#F2F2F5'; RR(g, lerp(x0, x1, f) - 16, lerp(y0, y1, f) - 11, 32, 22, 4); g.fill(); g.fillStyle = '#4D8DFF'; g.fillRect(lerp(x0, x1, f) - 10, lerp(y0, y1, f) - 4, 20, 3); } });
      g.globalAlpha = 1; const ST = ['pesquisando', 'escrevendo', 'codando', 'vendendo', 'medindo', 'respondendo'];
      AG.forEach(([nm, gl, x, y], k) => { const recv = LINKS.findIndex(([, q]) => q === k), lit = recv >= 0 ? Math.exp(-Math.abs(u - recv * 0.55 - 1) * 2.5) : 0.3; C6.agent(g, x, y, nm, gl, a * ramp(t, 179.2 + k * 0.08, 0.25), lit, ST[k]); });
      C6.kinetic(g, 'TRABALHANDO SOZINHOS', 0, 200, 30, '#93BCFF', t, 179.8, { a, w: 800, sp: 3 }); }); }
  // 7:02–7:07 the real platform (SALG Club, screen recording) on a 3D screen, scrolling; the support material beside the lesson
  dropOver('salg_material.jpg'); dropCall('MATERIAL DE APOIO');
  OV((g, t) => { if (t < 182.0 || t > 187.1) return; const a = ramp(t, 182.1, 0.4) * (1 - ramp(t, 186.8, 0.3)), en = E.cubicOut(ramp(t, 182.1, 0.9)), im = seqImg('salgclub', t);
    g.save(); g.shadowColor = 'rgba(147,188,255,0.45)'; g.shadowBlur = 40 * a; g.restore(); mediaQuad(g, im, panel3(lerp(300, 0, en), -150, 0, 940, 505, lerp(0.7, -0.14, en) + 0.06 * Math.sin((t - 182) * 0.6), 0.06), { a, grain: 0.18, br: 1.05 });
    C6.kinetic(g, 'MATERIAL DE APOIO', 0, 200, 34, '#5BE39A', t, 183.7, { a: a * (1 - ramp(t, 186.4, 0.3)), w: 800, sp: 3 }); });
  // 7:07–7:10 something ready: the platform playing in a phone (no play button)
  dropOver('app57_tela'); dropLbl('ASSISTE', 'PRONTO'); scene('done', [el(checkArt, 0, 330, 0.9, { dot: true, at: 189.6, tints: [[0, GREEN, 1]] })]);
  OV((g, t) => { if (t < 187.0 || t > 190.3) return; const a = ramp(t, 187.1, 0.35) * (1 - ramp(t, 189.95, 0.3)); C6.phone(g, seqImg('salgclub', t), 0, -140, 300, a, { ratio: 2.05, zoom: 1.0, glow: 'rgba(91,227,154,0.4)' });
    C6.kinetic(g, 'PRONTO', 0, 470, 40, '#5BE39A', t, 189.6, { a, sp: 6 }); });
  // 7:10–7:14 the infinity itself is alive: it turns in 3D, breathes, a light runs round it
  scene('forever', [el(infArt, 0, -60, 1, { dot: true, reveal: [190.4, 0.9, 'x'], br: 1.25, life: (t, i, p, b) => { const r = Math.cos((t - 190.4) * 1.6) * 0.35 + 0.65, s = 1 + 0.04 * Math.sin(t * 3); b.x[i] = b.x[i] * r * s; b.y[i] = -60 + (b.y[i] + 60) * s; } })]);
  // 7:23–7:27 the feed b-roll behind; a big open wallet, empty, the balance stuck at zero
  { dropOver("seqImg('scrollinsta', t), -100, -432");
    scene('feedpocket', [el(C6.walletOpen, 0, 120, 0.95, { at: 203.6, s0: 0.85, bob: 5 })]); PART.bg.push(['scrollinsta', 203.2, 207.6, 0.8, { br: 0.85, blur: 0.8, grain: 0.32 }]);
    OV((g, t) => { if (t < 203.4 || t > 207.6) return; const a = ramp(t, 203.6, 0.3) * (1 - ramp(t, 207.3, 0.3)); C6.kinetic(g, 'R$ 0,00', 0, -260, 110, '#FF5A52', t, 204.2, { a, glow: 'rgba(255,90,82,0.6)' }); C6.kinetic(g, 'SÓ ROLANDO', 0, -150, 34, '#FFFFFF', t, 204.8, { a, w: 800, sp: 4 }); }); }
  // 7:37–7:45 the course on screen runs too fast, with a red grain: you understand nothing and get stuck; he lowers his head
  { dropOver('ENTRAR NO CURSO');
    OV((g, t) => { if (t < 217.5 || t > 224.9) return; const a = ramp(t, 217.7, 0.35) * (1 - ramp(t, 224.6, 0.25)), s = 1.1; mediaDraw(g, seqImg('tut', t), -40 - 280 * s, -170 - 165 * s, 560 * s, 330 * s, { a, r: 10, blur: 0.8, grain: 0.42, br: 0.95, sat: 0.6 });
      g.save(); g.globalAlpha = a * (0.25 + 0.1 * Math.sin(t * 13)); g.globalCompositeOperation = 'multiply'; g.fillStyle = '#FF3B30'; RR(g, -40 - 280 * s, -170 - 165 * s, 560 * s, 330 * s, 10); g.fill(); g.restore();
      ['?', '?', '?'].forEach((q, k) => { const u = ((t - 219 + k * 0.7) * 0.6) % 1; if (t < 219) return; C6.kinetic(g, q, -250 + k * 200, -360 - 80 * u, 60, '#FF7A70', t, 219 + k * 0.3, { a: a * Math.sin(Math.PI * u) }); }); }); }
  // 7:55–8:03 the WhatsApp group: the real image behind (subtle), and a real exchange: a question, someone typing, quick answers
  { dropOver('Bora construir!'); PART.bg = PART.bg.filter(b => !String(b[0]).includes('whats.jpg')); PART.bg.push([C6.IMG + 'whatsapp2.jpg', 235.4, 243.6, 0.38, { br: 0.9, blur: 1.2, grain: 0.3 }]);
    const MSG = [[236.3, 0, 'Travei no deploy 😩 alguém?', 'Rafael'], [237.2, 2, 'digitando…', ''], [237.8, 1, 'Manda print que a gente vê 👇', 'Igor · sócio'], [239.0, 0, '(print)', 'Rafael'], [239.7, 2, 'digitando…', ''], [240.3, 1, 'É a variável de ambiente. Faz assim', 'Emmanuel · sócio'], [241.6, 0, 'FUNCIONOU!! 🚀🚀', 'Rafael'], [242.4, 1, 'Boa, arquiteto! 👏', 'Vitor · sócio']];
    OV((g, t) => { if (t < 235.6 || t > 243.7) return; const A = 1 - ramp(t, 243.35, 0.25); let y = -360;
      MSG.forEach(([T, side, s, who], k) => { const on = ramp(t, T, 0.25, E.backOut); if (on <= 0) return; if (side === 2 && t > T + 0.6) return; const w = side === 2 ? 170 : Math.min(560, 40 + s.length * 16), x = side === 1 ? 470 - w : -470, h = who ? 92 : 64;
        g.globalAlpha = A * clamp(on); g.fillStyle = side === 1 ? 'rgba(37,211,102,0.92)' : side === 2 ? 'rgba(242,242,245,0.55)' : 'rgba(242,242,245,0.95)'; RR(g, x, y, w, h, 20); g.fill(); g.globalAlpha = 1;
        if (who) text(g, who, x + 20, y + 24, `700 15px 'Inter'`, side === 1 ? '#063d1d' : '#555', A * clamp(on), 'left', 0); text(g, s, x + 20, y + (who ? 60 : 33), `600 21px 'Inter'`, '#0b1d12', A * clamp(on), 'left', 0); y += h + 18; });
      C6.kinetic(g, 'RESPOSTA EM MINUTOS', 0, 470, 34, '#25D366', t, 240.4, { a: A, w: 800, sp: 3 }); }); }
  // 8:03–8:07 the weekly live: the image behind, slowly pushing in; LIVE switches on, the viewers climb
  { PART.bg.push([C6.IMG + 'live.jpg', 243.5, 247.2, 0.75, { br: 0.95, blur: 0.5, grain: 0.28 }]); scene('live', []); dropLbl('AO VIVO', 'TODA SEMANA');
    OV((g, t) => { if (t < 243.6 || t > 247.2) return; const A = ramp(t, 243.7, 0.3) * (1 - ramp(t, 246.9, 0.3)), on = ramp(t, 244.5, 0.3, E.backOut), v = Math.round(48 + 312 * E.cubicOut(ramp(t, 244.6, 2.2)));
      g.save(); g.globalAlpha = A * clamp(on); g.translate(0, -470); g.scale(0.7 + 0.3 * clamp(on), 0.7 + 0.3 * clamp(on)); g.fillStyle = '#E5242A'; g.shadowColor = '#FF3B30'; g.shadowBlur = 30 + 20 * Math.sin(t * 6); RR(g, -170, -44, 340, 88, 44); g.fill(); g.shadowBlur = 0;
      g.fillStyle = `rgba(255,255,255,${0.6 + 0.4 * Math.sin(t * 7)})`; g.beginPath(); g.arc(-120, 0, 14, 0, 7); g.fill(); g.fillStyle = '#FFF'; g.font = `900 40px 'Inter'`; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('AO VIVO', -88, 2); g.restore();
      text(g, `👁 ${v} assistindo`, 0, -390, `700 24px 'Inter'`, '#FFFFFF', A * ramp(t, 244.7, 0.3), 'center', 1); C6.kinetic(g, 'TODA SEMANA', 0, 470, 38, '#FFFFFF', t, 243.8, { a: A, sp: 4 }); }); }
  // 8:07–8:17 the environment changes: grey, slumped people on their phones; a wave of colour runs out from him and they get up and build
  { const RING8 = [...Array(10)].map((_, k) => { const a = k / 10 * 6.283; return [370 * Math.cos(a), 60 + 260 * Math.sin(a)]; }), WV = k => 254.6 + 0.08 * k;
    const envPose = k => t => t < WV(k) ? MAN_POSES.scroll(t + k) : mixPose(MAN_POSES.scroll(t + k), MAN_POSES.hammer(t + k), ramp(t, WV(k), 0.35));
    scene('env', [{ ...fullAt(0, 60, 0.9, { pose: t => t < 254.3 ? MAN_POSES.scroll(t) : mixPose(MAN_POSES.scroll(t), MAN_POSES.build(t), ramp(t, 254.3, 0.4)) }), tints: [[254.3, OWNB, 0.6]] },
      { pts: RING8.flatMap(([x, y], k) => B45.map(p => ({ ...p, x: p.x + x, y: p.y + y, pk: k, rgPose: envPose(k) }))), x: 0, y: 0, cx: 0, cy: 0, life: (t, i, p, b) => { const c = ramp(t, WV(p.pk), 0.35); b.t[i] = c > hash(i, 3) ? (hash(i, 4) < 0.5 ? ORANGE : OWNB) : GRAY; b.a[i] = p.a * (0.55 + 0.6 * c); } },
      ...RING8.map(([x, y], k) => el(g => cubeC(g, 0, 0, 22, '#FF9B55', 0.95), x, y - 90, 1, { at: WV(k) + 0.3, tints: [[0, CLAUDE, 1]] }))]);
    OV((g, t) => { if (t < 254.2 || t > 257.5) return; const r = 600 * E.cubicOut(ramp(t, 254.3, 1.4)), a = (1 - ramp(t, 255.7, 0.6)); g.save(); g.globalAlpha = a * 0.6; g.strokeStyle = '#4D8DFF'; g.lineWidth = 10; g.shadowColor = '#4D8DFF'; g.shadowBlur = 30; g.beginPath(); g.ellipse(0, 60, r, r * 0.7, 0, 0, 7); g.stroke(); g.restore(); }); }
  // 8:25–8:30 the centre: the three of us as architects; lines reach the people around, and each pops into an architect too
  { dropOver("'ACOMPANHAMENTO', 0, -420"); const COMM = [...Array(12)].map((_, k) => -Math.PI / 2 + k / 12 * 6.283), TURN = k => 266.4 + k * 0.28;
    scene('center', [...[-170, 0, 170].map((x, k) => ({ ...fullAt(x, 40, 0.62, { pose: k === 1 ? 'present' : 'point' }), tints: [[0, OWNB, 0.6]], at: 265.4 + k * 0.12 })), ...[-235, -62, 108].map(x => archRoll(x, 30, 0.6)),
      { pts: COMM.flatMap((a, k) => B30.map(p => ({ ...p, pk: k, ang: a, rgPose: t => t < TURN(k) ? MAN_POSES.stand(t + k) : MAN_POSES.cheer(t) }))), x: 0, y: 0, cx: 0, cy: 0,
        life: (t, i, p, b) => { const on = ramp(t, 265.7 + p.pk * 0.03, 0.3), turn = ramp(t, TURN(p.pk), 0.3, E.backOut), s = 1 + 0.2 * Math.max(0, Math.sin(Math.PI * clamp(turn))); b.x[i] = 470 * Math.cos(p.ang) + p.x * s; b.y[i] = 40 + 360 * Math.sin(p.ang) + p.y * s; b.a[i] = p.a * clamp(on, 0.02) * (0.7 + 0.4 * clamp(turn)); if (turn > hash(i, 3) * 0.9) b.t[i] = OWNB; } }]);
    OV((g, t) => { if (t < 265.5) return; const a = ramp(t, 265.6, 0.4) * (1 - ramp(t, 270.3, 0.3));
      COMM.forEach((ang, k) => { const f = clamp((t - TURN(k) + 0.45) / 0.45); if (f <= 0) return; const x1 = 470 * Math.cos(ang), y1 = 40 + 360 * Math.sin(ang) - 40, x0 = Math.cos(ang) < -0.35 ? -170 : Math.cos(ang) > 0.35 ? 170 : 0, y0 = -60; g.globalAlpha = a * 0.7; g.strokeStyle = '#6EA6FF'; g.lineWidth = 3; g.shadowColor = '#4D8DFF'; g.shadowBlur = 12; g.beginPath(); g.moveTo(x0, y0); g.lineTo(lerp(x0, x1, f), lerp(y0, y1, f)); g.stroke(); g.shadowBlur = 0; });
      g.globalAlpha = 1; C6.kinetic(g, 'ACOMPANHAMENTO', 0, -470, 40, '#FFFFFF', t, 266.3, { a, sp: 6 }); C6.kinetic(g, 'O CENTRO DE TUDO', 0, 520, 40, '#5BE39A', t, 268.3, { a, sp: 4 }); }); }
}
function buildShapes() { buildPart(); buildPartV6(); buildPartV7(); finishPart(); }
