// Hook D (Vitor) — "Campo de 6 mil", colour-psychology pass.
// One take, 6000 ASCII agents that never leave the film: every beat is a new target shape for the same glyphs.
// Colour carries meaning: gold/green = money · purple = IA · blue = feed/mass · gray = crowd · red = loss/fight
// · orange = building. Everything is a pure function of t; deterministic (no Math.random on the render path).
'use strict';

const W = 1080, H = 1920, CX = 540, CY = 800, FPS = 30, DUR = 38.2, N = 6000;
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
const TINT = ['#F2F2F5', '#A68BFF', '#6EA6FF', '#FF9B55', '#7C7C86', '#F2C14E', '#3DDC84', '#FF5A52'];
const WHITE = 0, PURPLE = 1, BLUE = 2, ORANGE = 3, GRAY = 4, GOLD = 5, GREEN = 6, RED = 7;
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

function buildShapes() {
  const r = rng(3);

  // dust — the 6000 before they are anything
  SH.dust = makeShape([hsort([...Array(N)].map((_, i) => ({ x: HOME.x[i], y: HOME.y[i], i0: i,
    a: 0.18 + 0.5 * Math.pow(hash(i, 1), 2), c: HOME.c[i], t: hash(i, 3) > 0.9 ? GOLD : WHITE, s: 0.7 + 0.5 * hash(i, 2) })))],
    (t, i, p, b) => {
      const pull = 1 - 0.14 * Math.min(t, 1);
      b.x[i] = p.x * pull + 14 * Math.sin(t * 0.31 + p.i0 * 0.7);
      b.y[i] = p.y * pull + 10 * Math.cos(t * 0.27 + p.i0);
    });

  // "$" — dinheiro: gold with green
  const dollarDraw = g => { g.font = HEAVY(820); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('$', 0, 30); };
  SH.dollar = makeShape([maskPts(N, dollarDraw, { seed: 11, char: (v, rr) => pick('$$$S#%@*:', rr), tint: (v, rr) => money(rr),
    alpha: (v, rr) => 0.5 + 0.5 * rr })],
    (t, i, p, b) => { const br = 1 + 0.012 * Math.sin(t * 2.4); b.x[i] = p.x * br; b.y[i] = p.y * br; });

  // pocket — "já caiu no seu bolso": the $ shrinks and drops into a back pocket
  {
    const pocket = maskPts(3400, g => {
      g.lineWidth = 10;
      g.beginPath(); g.moveTo(-230, -120); g.lineTo(230, -120); g.lineTo(215, 170); g.lineTo(0, 290); g.lineTo(-215, 170); g.closePath(); g.stroke();
      g.lineWidth = 4; g.setLineDash([10, 12]);
      g.beginPath(); g.moveTo(-200, -92); g.lineTo(200, -92); g.lineTo(187, 152); g.lineTo(0, 258); g.lineTo(-187, 152); g.closePath(); g.stroke();
    }, { seed: 21, char: (v, rr) => (v > 0.8 ? pick('#█▓=', rr) : pick('-=:', rr)), alpha: v => (v > 0.8 ? 0.85 : 0.45), tint: () => WHITE });
    const coin = xf(maskPts(N - 3400, dollarDraw, { seed: 22, char: (v, rr) => pick('$$S#@', rr), tint: (v, rr) => money(rr), alpha: (v, rr) => 0.6 + 0.4 * rr }),
      0.36, 0, 40, { coin: 1 });
    SH.pocket = makeShape([xf(pocket, 1, 0, 150), coin], (t, i, p, b) => {
      if (!p.coin) return;
      const fall = ramp(t, 2.0, 0.65, E.quadIn), land = ramp(t, 2.62, 0.3, E.backOut);
      b.y[i] = p.y - 420 * (1 - fall) + 160 * fall + 8 * (1 - land);
      b.a[i] = p.a * (0.4 + 0.6 * fall);
    });
  }

  // "?" — por causa da IA?
  SH.question = makeShape([maskPts(N, g => {
    g.font = HEAVY(860); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', 0, 20);
  }, { seed: 12, char: (v, rr) => pick('01?<>/\\|01', rr), tint: (v, rr) => (rr > 0.45 ? PURPLE : WHITE), alpha: (v, rr) => 0.45 + 0.55 * rr })],
    (t, i, p, b) => {
      const sag = ramp(t, 4.16, 0.6, E.sine);
      b.y[i] = p.y + sag * (20 + (p.y + 400) * 0.04);
      b.x[i] = p.x * (1 + 0.01 * Math.sin(t * 2.2));
      if (sag > 0.3 && hash(i, 4) < 0.5 * sag) b.t[i] = RED; // the question bleeds red on "nada"
    });

  // the line — "nada": loss, red
  {
    const pts = [];
    for (let k = 0; k < N; k++) pts.push({ x: (r() - 0.5) * 860, y: 430 + (r() - 0.5) * 10 + Math.pow(r(), 6) * -30,
      a: 0.25 + 0.6 * r(), c: pick('_.-_·', r()), t: r() > 0.55 ? RED : GRAY, s: 0.7 + 0.3 * r() });
    SH.line = makeShape([hsort(pts)]);
  }

  // chatter — "não é por falta de gente falando sobre isso": the feed's noise, blue with purple IA
  {
    const PH = ['ganhe 10x com IA', 'renda extra', 'prompt secreto', 'agentes', 'automação', 'o futuro chegou',
      'R$ 50k/mês', 'curso grátis', 'fique rico', 'hack novo', 'ferramenta nova', 'mude de vida', 'IA', 'IA', 'IA',
      'dinheiro', 'chatbot', 'faça isso agora', 'o segredo', 'link na bio', 'urgente', 'ninguém fala disso'];
    const rows = 46, cols = 72, sp = 12.6, rowH = 23.5, pts = [];
    for (let rr = 0; rr < rows; rr++) {
      let str = '';
      const rr2 = rng(500 + rr);
      while (str.length < cols * 3) str += PH[(rr2() * PH.length) | 0] + '  ·  ';
      const dir = rr % 2 ? 1 : -1, speed = (30 + rr2() * 70) * dir;
      for (let k = 0; k < cols; k++) {
        const ch = str[k];
        const ia = /IA/.test(str.slice(Math.max(0, k - 1), k + 2)), cash = /R\$|dinheiro|50k/.test(str.slice(Math.max(0, k - 8), k + 8));
        pts.push({ row: rr, col: k, speed, str, x: -cols * sp / 2 + k * sp, y: -540 + rr * rowH,
          a: ch === ' ' ? 0.14 : ia || cash ? 0.95 : 0.42 + 0.25 * rr2(), c: chi(ch),
          t: ia ? PURPLE : cash ? GOLD : rr2() > 0.55 ? BLUE : WHITE, s: 0.82 });
      }
    }
    const back = [...Array(N - pts.length)].map(() => ({ x: (r() - 0.5) * 1150, y: (r() - 0.5) * 1300,
      a: 0.06 + 0.1 * r(), c: pick('.·', r()), t: BLUE, s: 0.6, back: 1 }));
    SH.chatter = makeShape([hsort(pts), hsort(back)], (t, i, p, b) => {
      if (p.back) return;
      const span = 72 * 12.6, off = (t - 5.1) * p.speed;
      let x = p.x + off; const wrap = Math.floor((x + span / 2) / span);
      x -= wrap * span; b.x[i] = x;
      if (wrap !== 0) b.c[i] = chi(p.str[(((p.col - wrap * 72) % p.str.length) + p.str.length) % p.str.length]);
      b.a[i] = p.a * clamp((span / 2 - Math.abs(x)) / 90) * (0.75 + 0.25 * Math.sin(t * 9 + p.row * 1.7 + p.col));
    });
  }

  // phone feed — "tudo que aparece no seu feed sobre IA"
  const phoneOutline = maskPts(1500, g => {
    g.lineWidth = 9; g.beginPath(); g.roundRect(-180, -350, 360, 700, 46); g.stroke();
    g.lineWidth = 7; g.beginPath(); g.roundRect(-50, -330, 100, 20, 10); g.stroke();
  }, { seed: 31, char: (v, rr) => pick('#█▓', rr), alpha: () => 0.9, tint: () => WHITE });
  {
    const cards = maskPts(4500, g => {
      for (let k = 0; k < 8; k++) {
        const y0 = -700 + k * 175 + 10;
        g.globalAlpha = 0.35; g.lineWidth = 3; g.beginPath(); g.roundRect(-150, y0, 300, 155, 14); g.stroke();
        g.globalAlpha = 1; g.beginPath(); g.arc(-118, y0 + 30, 14, 0, 7); g.fill();
        g.globalAlpha = 0.75; g.fillRect(-92, y0 + 22, 120, 10);
        g.globalAlpha = 0.5; g.fillRect(-130, y0 + 62, 260, 8); g.fillRect(-130, y0 + 82, 220, 8); g.fillRect(-130, y0 + 102, 180, 8);
        g.globalAlpha = 0.95; g.beginPath(); g.roundRect(70, y0 + 120, 56, 22, 11); g.fill(); // the "IA" tag
      }
    }, { seed: 32, w: 400, h: 1420, step: 2, nosort: true,
         char: (v, rr) => (v > 0.9 ? pick('@#', rr) : v > 0.6 ? pick('abcdefghijklmnrstu', rr) : pick('.:-', rr)),
         alpha: v => (v > 0.9 ? 0.95 : v > 0.6 ? 0.7 : 0.35), tint: (v, rr, x, y) => (v > 0.9 && x > 60 ? PURPLE : v > 0.6 && rr > 0.6 ? BLUE : WHITE) });
    SH.phone = makeShape([phoneOutline, hsort(cards.map(p => ({ ...p, hy: p.y * 0.45 })))], (t, i, p, b) => {
      if (p.g !== 1) return;
      const off = (t - 7.9) * 120;
      const y = ((((p.y + 700 - off) % 1420) + 1420) % 1420) - 710;
      b.y[i] = y; b.x[i] = p.x;
      b.a[i] = p.a * clamp((318 - Math.abs(y)) / 40);
    });
  }

  // broadcast — "chega, no mesmo dia, para milhões de pessoas": a wave from the phone through a disc of people (blue)
  {
    const small = xf(phoneOutline, 0.3, 0, 0);
    const people = [];
    for (let k = 0; k < 4500; k++) {
      const rr = 90 + 470 * Math.sqrt(k / 4500), th = k * GOLDEN;
      people.push({ rr, x: rr * Math.cos(th), y: rr * Math.sin(th), a: 0, c: hash(k, 9) > 0.8 ? CI['o'] : CI['·'], t: BLUE, s: 0.75 });
    }
    SH.broadcast = makeShape([small, hsort(people)], (t, i, p, b) => {
      if (p.g !== 1) return;
      const front = (t - 9.85) * 330 + 60, d = front - p.rr;
      const lit = clamp(d / 60), ring = Math.exp(-((d / 30) ** 2));
      b.a[i] = 0.06 + 0.55 * lit + 0.5 * ring;
      b.s[i] = 0.75 + 0.5 * ring;
      if (ring > 0.5) b.t[i] = WHITE;
    });
  }

  // crowd — "usar IA está virando coisa que todo mundo faz" (gray, identical) + purple IA sparks over heads,
  // then the sparks gather into a gold $ above the crowd ("dinheiro a mais") that crumbles on "ninguém"
  const crowd = crowdGrid(54, 46, 16, 22, 0, 40);
  const dollarSmall = xf(maskPts(N - 2 * P_CROWD, dollarDraw, { seed: 41, nosort: true }), 0.42, 0, -330);
  {
    const sparks = dollarSmall.map((p, k) => {
      const host = crowd[((hash(k, 51) * P_CROWD) | 0) * 2];
      return { spark: k, hxp: host.x, hyp: host.y - 20, dx: p.x, dy: p.y, x: host.x, y: host.y - 20, a: 0, c: CI['*'], t: PURPLE, s: 0.85 };
    });
    SH.crowd = makeShape([crowd, sparks], (t, i, p, b) => {
      if (p.spark === undefined) {
        const bob = Math.sin(t * 5.2 + (p.col + p.row) * 0.0) * 1.6; // everyone in step: the same move
        b.y[i] = p.y + bob;
        const flash = Math.exp(-((((t - 14.75) - (p.row * 0.008)) / 0.18) ** 2));
        b.a[i] = p.a + 0.4 * flash;
        return;
      }
      const on = ramp(t, 13.45 + hash(p.spark, 3) * 0.5, 0.25);
      const gather = ramp(t, 17.95 + hash(p.spark, 4) * 0.25, 0.55, E.expoOut);
      const crumble = ramp(t, 19.6 + hash(p.spark, 5) * 0.3, 0.7, E.quadIn);
      b.x[i] = lerp(p.hxp, p.dx, gather);
      b.y[i] = lerp(p.hyp - 4 * Math.sin(t * 6 + p.spark), p.dy, gather) + crumble * (200 + 300 * hash(p.spark, 6));
      b.a[i] = on * (0.85 + 0.15 * gather) * (1 - 0.8 * crumble);
      if (gather > 0.4) { b.c[i] = pick('$$S#@', hash(p.spark, 7)); b.t[i] = money(hash(p.spark, 8)); b.s[i] = 0.9; }
      if (crumble > 0.25) { b.c[i] = CI['.']; b.t[i] = GRAY; }
    });
  }

  // brawl — "enquanto essa multidão briga pelo mesmo dinheiro": the crowd packs around one gold $, shoving; red spreads
  {
    const ring = [];
    for (let n = 0; n < P_CROWD; n++) {
      const rr = 175 + 330 * Math.sqrt(n / P_CROWD), th = n * GOLDEN;
      ring.push({ n, x: rr * Math.cos(th), y: rr * Math.sin(th) * 0.95 + 20 });
    }
    hsort(ring);
    const pts = [];
    ring.forEach((p, m) => {
      pts.push({ ...p, m, part: 0, y: p.y - 6, a: 0.9, c: CI['o'], t: GRAY, s: 0.8 });
      pts.push({ ...p, m, part: 1, y: p.y + 5, a: 0.85, c: CI['A'], t: GRAY, s: 0.9 });
    });
    const prize = xf(dollarSmall, 0.68, 0, 248, {}).map((p, k) => ({ ...p, a: 0.95, c: pick('$$S#@', hash(k, 7)), t: money(hash(k, 8)), s: 0.85 }));
    SH.brawl = makeShape([pts, prize], (t, i, p, b) => {
      if (p.m === undefined) { b.a[i] = p.a * (0.85 + 0.15 * Math.sin(t * 7 + i)); return; }
      const agit = 0.5 + 1.5 * ramp(t, 21.5, 0.5);
      const fr = Math.floor(t * 12);
      b.x[i] = p.x + (hash(p.m, fr) - 0.5) * 7 * agit + 6 * Math.sin(t * 3 + p.m);
      b.y[i] = p.y + (hash(p.m, fr + 1) - 0.5) * 6 * agit;
      if (t > 21.55 && hash(p.m, 11) < 0.45 * ramp(t, 21.55, 0.5)) b.t[i] = RED;
    });
  }

  // group — "um grupo pequeno, sem ser expert em tecnologia": the brawl shrinks back-left, gray;
  // the agents that were the gold $ become seven people standing apart
  const figures7 = [];
  {
    const spots = [[-150, 0], [-100, 40], [-45, -10], [10, 45], [65, -5], [120, 40], [170, 5]];
    const per = Math.floor((N - 2 * P_CROWD) / 7);
    spots.forEach(([x, y], f) => personPts(f === 6 ? N - 2 * P_CROWD - per * 6 : per, 60 + f).forEach(p =>
      figures7.push({ ...p, f, x: p.x * 0.42 + x, y: p.y * 0.42 + y, s: 0.62, t: WHITE })));
  }
  {
    const back = SH.brawl.pts.filter(p => p.g === 0).map(p => ({ ...p, x: p.x * 0.5 - 250, y: p.y * 0.5 - 40, a: p.a * 0.6, t: GRAY }));
    SH.group = makeShape([back, figures7.map(p => ({ ...p, x: p.x + 230, y: p.y + 60 }))], (t, i, p, b) => {
      if (p.m !== undefined) { const fr = Math.floor(t * 12); b.x[i] = p.x + (hash(p.m, fr) - 0.5) * 4; b.y[i] = p.y + (hash(p.m, fr + 1) - 0.5) * 3; return; }
      b.y[i] = p.y + 2 * Math.sin(t * 2 + p.f);
      const warm = ramp(t, 23.4, 0.6);
      b.a[i] = p.a * (0.75 + 0.25 * warm);
    });
  }

  // build — "está usando essa mesma IA para construir uma coisa própria": iso blocks (Hairline: rounded, thin,
  // painted back to front so near faces hide far ones), dropping in one by one, orange settling to gold
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
    const d = g.getImageData(0, 0, w, h).data, cand = [];
    for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) {
      const k = (y * w + x) * 4; if (d[k + 3] < 200) continue;
      const id = Math.round((d[k] - 10) / 20), sh = d[k + 1];
      const keep = sh > 200 ? 1 : sh > 100 ? 0.45 : sh > 60 ? 0.3 : 0.2;
      cand.push([x - w / 2, y - h / 2 - 120 + 60, id, sh, keep]);
    }
    const rr = rng(seed), out = [];
    const weights = cand.map(c => c[4]), tot = weights.reduce((a, b) => a + b, 0);
    for (let k = 0; k < M; k++) {
      let u = rr() * tot, j = 0; while (u > weights[j]) { u -= weights[j]; j++; }
      const [x, y, id, sh] = cand[j], q = rr();
      out.push({ x: x + (rr() - 0.5) * 2, y: y + (rr() - 0.5) * 2, block: id, edge: sh > 200, a: sh > 200 ? 0.95 : sh > 100 ? 0.4 : sh > 60 ? 0.28 : 0.18,
        c: sh > 200 ? pick('#█▓', q) : sh > 100 ? pick('+:', q) : sh > 60 ? pick(':.', q) : CI['.'], t: ORANGE, s: sh > 200 ? 0.8 : 0.7, q });
    }
    return hsort(out);
  }
  const structure = buildPts(3000, 71);
  {
    const ia = maskPts(1968, g => { g.font = HEAVY(170); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('IA', 0, 0); },
      { seed: 72, char: (v, rr) => pick('01<>/\\', rr), tint: () => PURPLE, alpha: (v, rr) => 0.6 + 0.4 * rr, w: 500, h: 300 });
    const team = figures7.map(p => ({ ...p, x: p.x * 1.15, y: p.y + 380 }));
    SH.build = makeShape([structure.map(p => ({ ...p })), xf(ia, 1, 0, -40).map(p => ({ ...p, ia: 1 })), team], (t, i, p, b) => {
      if (p.ia) { // the IA hovers, then pours down into the blocks as they appear
        const pour = ramp(t, 27.75 + p.r * 0.5, 0.5, E.quadIn);
        b.y[i] = p.y + pour * 260; b.a[i] = p.a * (1 - pour) * ramp(t, 27.1, 0.3); return;
      }
      if (p.f !== undefined) { b.y[i] = p.y + 2 * Math.sin(t * 2 + p.f); return; }
      const at = 27.8 + p.block * 0.12, q = ramp(t, at, 0.4, E.backOut);
      b.y[i] = p.y - 70 * (1 - q); b.a[i] = p.a * clamp((t - at) / 0.12);
      const gold = ramp(t, 28.6, 0.5);
      if (gold > p.q) b.t[i] = p.q > 0.75 ? GREEN : GOLD;
    });
  }

  // layers — "existe uma camada da IA que quase ninguém te mostra" (Hairline iso planes; the middle one is the hidden layer)
  {
    const pts = [], S = 230, rad = 34;
    const rrPoint = (u, inset) => {
      const s = S - inset, rr2 = rad - inset * 0.6, straight = 2 * (s - rr2), arc = (Math.PI / 2) * rr2, side = straight + arc;
      let d = u * 4 * side; const sideI = Math.floor(d / side); d -= sideI * side;
      let x, y;
      if (d < straight) { x = -s + rr2 + d; y = -s; }
      else { const a = -Math.PI / 2 + ((d - straight) / arc) * (Math.PI / 2); x = s - rr2 + Math.cos(a) * rr2; y = -s + rr2 + Math.sin(a) * rr2; }
      const ang = sideI * Math.PI / 2, c = Math.cos(ang), sn = Math.sin(ang);
      return [x * c - y * sn, x * sn + y * c];
    };
    for (let pl = 0; pl < 3; pl++) for (let k = 0; k < 2000; k++) {
      let u, v, kind;
      if (k < 560) { [u, v] = rrPoint(k / 560, 0); kind = 0; }
      else if (k < 800) { [u, v] = rrPoint((k - 560) / 240, 16); kind = 1; }
      else { u = (r() - 0.5) * 2 * (S - 20); v = (r() - 0.5) * 2 * (S - 20); kind = 2; }
      const z = [150, 0, -150][pl];
      pts.push({ pl, u, v, kind, x: u - v, y: (u + v) / 2 - z, a: 0,
        c: kind === 0 ? pick('·:·+', r()) : kind === 1 ? CI['·'] : pick('..·', r()), t: WHITE, s: kind === 2 ? 0.7 : kind === 0 ? 1.15 : 0.9 });
    }
    const inTop = (x, y, z) => { const u = (2 * y + 2 * z + x) / 2, v = (2 * y + 2 * z - x) / 2; return Math.abs(u) < S && Math.abs(v) < S; };
    SH.layers = makeShape([hsort(pts)], (t, i, p, b) => {
      const lift = ramp(t, 30.2, 1.0, E.inOut), hl = ramp(t, 31.3, 0.5);
      let z = [150, 0, -150][p.pl];
      if (p.pl === 0) z += 330 * lift;
      b.x[i] = p.u - p.v; b.y[i] = (p.u + p.v) / 2 - z + 40;
      let a = p.kind === 0 ? 1 : p.kind === 1 ? 0.5 : 0.2;
      if (p.pl === 0) a *= 1 - 0.85 * lift;
      if (p.pl === 2) a *= 1 - 0.55 * lift;
      if (p.pl === 1) {
        a *= 0.5 + 0.5 * lift;
        if (lift > 0.2) { const gpos = (p.u + S) / (2 * S) + (hash(i, 8) - 0.5) * 0.3; b.t[i] = gpos < 0.5 ? PURPLE : BLUE; }
        if (p.kind === 2 && lift > 0.4) b.c[i] = pick('·:+', hash(i, 9));
        if (p.kind === 0) a = Math.min(1, a + 0.4 * hl * (0.6 + 0.4 * Math.sin(t * 6 - (p.u + p.v) * 0.02)));
      }
      if (p.pl > 0 && lift < 0.6 && inTop(b.x[i], b.y[i] - 40, 150 + 330 * lift)) a *= 0.25 + 0.75 * lift;
      b.a[i] = a;
    });
  }

  // split — "e é ela que separa quem fica na multidão de quem vira o próprio dono"
  {
    const left = crowdGrid(22, 45, 15.5, 19.5, -222, 30).slice(0, 1968);
    const right = structure.map(p => ({ ...p, x: p.x * 0.66 + 222, y: p.y * 0.66 + 150 }));
    const owner = xf(personPts(N - 3000 - 1968, 81, { size: () => 0.8 }), 0.95, 222, -175).map(p => ({ ...p, owner: 1 }));
    SH.split = makeShape([right, left, owner], (t, i, p, b) => {
      const sep = ramp(t, 33.2, 0.6, E.expoOut);
      const side = p.owner || p.block !== undefined ? 1 : -1;
      b.x[i] = b.x[i] + side * 34 * sep;
      if (side < 0) { // the crowd stays gray, stepping in place
        b.y[i] = p.y + 1.4 * Math.sin(t * 5.2);
        const look = ramp(t, 33.66, 0.5);
        b.a[i] = p.a * (0.7 + 0.25 * look);
        return;
      }
      const own = ramp(t, 35.1 + (p.owner ? 0.35 : (p.y + 300) / 900 * 0.6), 0.6);
      if (p.owner) {
        b.y[i] = p.y + 2 * Math.sin(t * 2);
        b.a[i] = p.a * (0.6 + 0.4 * own);
        if (own > 0.3) { b.t[i] = hash(i, 3) > 0.75 ? GREEN : GOLD; b.c[i] = pick('@#$%', hash(i, 4)); }
      } else {
        b.a[i] = p.a * (0.55 + 0.45 * own);
        b.t[i] = own > p.q ? (p.q > 0.78 ? GREEN : GOLD) : WHITE;
      }
    });
  }
}

// ───────────────────────── timeline of shapes
const KEYS = [
  { t: 0, s: 'dust' },
  { t: 0.45, s: 'dollar', d: 0.8, st: 0.4, e: 'expoOut', sw: 140, dl: 'radial' },
  { t: 1.9, s: 'pocket', d: 0.7, st: 0.3, e: 'expoOut', sw: 60, dl: 'radial' },
  { t: 3.55, s: 'question', d: 0.6, st: 0.3, e: 'expoOut', sw: 90, dl: 'radial' },
  { t: 4.62, s: 'line', d: 0.45, st: 0.2, e: 'quadIn', sw: 0, dl: 'top' },
  { t: 5.12, s: 'chatter', d: 0.75, st: 0.5, e: 'expoOut', sw: 60, dl: 'bottom' },
  { t: 7.82, s: 'phone', d: 0.8, st: 0.45, e: 'expoOut', sw: 80, dl: 'radial' },
  { t: 9.7, s: 'broadcast', d: 0.55, st: 0.2, e: 'expoOut', sw: 40, dl: 'radial' },
  { t: 12.85, s: 'crowd', d: 0.75, st: 0.4, e: 'expoOut', sw: 40, dl: 'radial' },
  { t: 20.4, s: 'brawl', d: 0.7, st: 0.35, e: 'inOut', sw: 120, dl: 'radial' },
  { t: 22.75, s: 'group', d: 0.8, st: 0.3, e: 'expoOut', sw: 60, dl: 'random' },
  { t: 25.7, s: 'build', d: 0.9, st: 0.4, e: 'expoOut', sw: 80, dl: 'radial' },
  { t: 29.0, s: 'layers', d: 0.9, st: 0.4, e: 'expoOut', sw: 90, dl: 'radial' },
  { t: 32.15, s: 'split', d: 0.9, st: 0.35, e: 'inOut', sw: 60, dl: 'radial' },
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
  { t: 1.0, d: 1.5, x: 0, y: 0, z: 1.05, r: -0.012, e: 'sine' },
  { t: 1.95, d: 0.9, x: 0, y: 90, z: 1.0, r: 0, e: 'inOut' },         // follow the $ into the pocket
  { t: 3.55, d: 0.7, x: 0, y: 0, z: 1.06, r: 0.01, e: 'expoOut' },    // the ? rises
  { t: 4.3, d: 0.8, x: 0, y: 140, z: 1.12, r: 0, e: 'inOut' },        // follow the fall
  { t: 5.15, d: 0.9, x: 0, y: 0, z: 0.98, r: 0.01, e: 'expoOut' },    // whip into the noise
  { t: 6.0, d: 1.6, x: 30, y: -20, z: 1.03, r: 0, e: 'sine' },
  { t: 7.82, d: 1.1, x: 0, y: 0, z: 1.1, r: -0.015, e: 'expoOut' },   // into the phone
  { t: 9.7, d: 1.6, x: 0, y: 0, z: 0.86, r: 0, e: 'inOut' },          // pull out as it reaches millions
  { t: 12.85, d: 1.2, x: 0, y: 20, z: 0.95, r: 0, e: 'expoOut' },
  { t: 14.1, d: 5.4, x: 0, y: -60, z: 1.08, r: 0.008, e: 'sine' },    // slow creep up to the $ above the crowd
  { t: 19.6, d: 0.8, x: 0, y: 40, z: 1.02, r: 0, e: 'inOut' },        // the $ falls through them
  { t: 20.4, d: 0.8, x: 0, y: 0, z: 1.12, r: -0.01, e: 'expoOut' },   // brawl: close and tight
  { t: 21.5, d: 1.0, x: 0, y: 0, z: 1.18, r: 0.012, e: 'sine' },
  { t: 22.75, d: 1.1, x: 150, y: 40, z: 1.25, r: 0, e: 'inOut' },     // turn away to the small group
  { t: 25.7, d: 1.1, x: 0, y: 40, z: 0.98, r: 0, e: 'expoOut' },      // build
  { t: 27.7, d: 1.4, x: 0, y: 0, z: 1.08, r: -0.01, e: 'sine' },
  { t: 29.0, d: 1.0, x: 0, y: 30, z: 0.98, r: -0.02, e: 'expoOut' },  // layers
  { t: 30.2, d: 1.4, x: 0, y: 70, z: 1.14, r: 0, e: 'inOut' },        // follow the hidden layer
  { t: 32.15, d: 1.0, x: 0, y: 0, z: 1.0, r: 0, e: 'expoOut' },
  { t: 33.6, d: 0.9, x: -50, y: 0, z: 1.06, r: 0, e: 'sine' },        // look at the crowd
  { t: 35.0, d: 1.0, x: 60, y: -20, z: 1.1, r: 0, e: 'sine' },        // turn to the owner
  { t: 36.2, d: 2.0, x: 0, y: 0, z: 0.96, r: 0, e: 'sine' },          // settle wide and hold
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
  for (const tl of [1.3, 2.9, 5.0, 21.6, 28.7]) {
    const u = t - tl; if (u > 0 && u < 0.3) { const amp = 5 * Math.exp(-u * 16); c.x += amp * Math.sin(u * 90); c.y += amp * Math.cos(u * 75); }
  }
  if (t > 21.5 && t < 22.6) { const k = Math.sin(Math.PI * (t - 21.5) / 1.1); c.x += k * 3 * Math.sin(t * 41); c.y += k * 2.4 * Math.sin(t * 37); }
  return c;
}
function camMatrix(c) {
  const a = c.z * Math.cos(c.r), b = c.z * Math.sin(c.r);
  return [a, b, -b, a, CX - a * c.x + b * c.y, CY - b * c.x - a * c.y];
}

// ───────────────────────── subtitles (word by word; marks colour the keyword by meaning)
// * white · ^ purple (IA) · ~ blue (feed/mass) · ! gold (money) · + green · & red (loss/fight) · = orange (build)
const CHUNKS = [
  'Quanto !dinheiro a mais', 'já caiu no seu !bolso', 'por causa da ^IA?',
  'Se não caiu &nada,', 'não é por falta de *gente*', 'falando sobre *isso.*',
  'Tudo que aparece no seu ~feed', 'sobre ^IA ~chega,', 'no *mesmo* *dia,*', 'para ~milhões ~de ~pessoas.',
  'Usar ^IA está virando', 'coisa que *todo* *mundo* faz.',
  'E fazer o que todo mundo faz', 'não coloca !dinheiro a mais', 'no bolso de &ninguém.',
  'Enquanto essa *multidão*', '&briga pelo mesmo !dinheiro,',
  'um *grupo* *pequeno,*', 'sem ser expert em tecnologia,', 'está usando essa mesma ^IA', 'para =construir uma coisa !própria.',
  'Existe uma ^camada da ^IA', 'que quase *ninguém* te mostra',
  'e é ela que *separa*', 'quem fica na *multidão*', 'de quem vira o !próprio !dono.',
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
  [0, '01 · A PERGUNTA'], [4.1, '02 · O BARULHO'], [7.82, '03 · O FEED'], [12.85, '04 · TODO MUNDO'],
  [20.4, '05 · A DISPUTA'], [22.75, '06 · O GRUPO PEQUENO'], [29.0, '07 · A CAMADA'], [32.15, '08 · A DIVISÃO'],
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
  const gold = Math.max(win(0.5, 3.5), win(17.9, 19.7, 0.6, 0.6) * 0.7, win(28.5, 29.2) * 0.8, ramp(t, 35.1, 1.2) * 0.9);
  const purple = Math.max(win(3.55, 4.6, 0.5, 0.5), win(13.4, 14.6) * 0.5, win(26.9, 28.2) * 0.6, win(30.2, 32.4, 1, 0.8));
  const blue = Math.max(win(7.8, 12.9) * 0.9, win(5.2, 7.6) * 0.4);
  const red = Math.max(win(4.5, 5.3, 0.3, 0.5) * 0.8, win(21.5, 22.9, 0.5, 0.6));
  const r = 16 + 34 * gold + 22 * purple + 2 * blue + 38 * red, g = 16 + 26 * gold + 6 * purple + 12 * blue + 4 * red,
        b = 20 + 4 * gold + 36 * purple + 36 * blue + 4 * red;
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
  // R$ counter — "quanto já caiu no seu bolso" → "nada" (red)
  {
    const a = ramp(t, 3.7, 0.3) * (1 - ramp(t, 4.65, 0.35));
    if (a > 0) {
      const nada = t >= 4.75;
      const fall = 220 * ramp(t, 4.65, 0.4, E.quadIn);
      text(g, 'NO SEU BOLSO', 0, 440 + fall, `500 18px 'JetBrains Mono'`, '#8A8A94', a, 'center', 5);
      text(g, 'R$ 0,00', 0, 488 + fall, `700 52px 'JetBrains Mono'`, nada ? '#FF6B62' : '#F5CB62', a, 'center', 2);
    }
  }
  // reach counter — "milhões de pessoas" (blue)
  {
    const a = ramp(t, 9.85, 0.3) * (1 - ramp(t, 12.8, 0.3));
    const n = 12e6 * Math.pow(clamp((t - 9.85) / 2.5), 2.2);
    text(g, fmtBR(n), 0, -575, `700 40px 'JetBrains Mono'`, '#93BCFF', a, 'center', 1);
    text(g, 'PESSOAS · NO MESMO DIA', 0, -536, `500 16px 'JetBrains Mono'`, '#8A8A94', a, 'center', 4);
  }
  callout(g, t, 14.7, 17.8, -300, -470, -330, -560, 'MESMA IA · MESMO USO', '#A0A0AA', 'left');
  text(g, '+ R$ 0,00', 0, -150, `700 30px 'JetBrains Mono'`, '#FF6B62', ramp(t, 19.65, 0.3) * (1 - ramp(t, 20.4, 0.3)), 'center', 2);
  // the group
  callout(g, t, 23.3, 25.6, 230, -40, 330, -260, 'GRUPO PEQUENO', '#F2F2F5', 'right');
  callout(g, t, 24.4, 25.6, 150, 130, 260, 300, 'SEM SER EXPERT', '#A0A0AA', 'right');
  callout(g, t, 28.7, 28.95, 150, -150, 300, -380, 'ALGO PRÓPRIO', '#F5CB62', 'right');
  // layers
  callout(g, t, 29.15, 30.0, -230, -190, -330, -390, 'O QUE TODO MUNDO VÊ', '#A0A0AA', 'left');
  callout(g, t, 31.3, 32.15, 455, 40, 400, 300, 'CAMADA OCULTA', '#BBA3FF', 'right');
  // the slice
  {
    const p = ramp(t, 33.2, 0.35, E.expoOut);
    if (p > 0) {
      g.strokeStyle = '#FFFFFF'; g.lineWidth = 1.6; g.globalAlpha = 0.9;
      g.beginPath(); g.moveTo(0, -520); g.lineTo(0, -520 + 1040 * p); g.stroke(); g.globalAlpha = 1;
    }
    text(g, 'MULTIDÃO', -256, 500, `500 22px 'JetBrains Mono'`, '#8A8A94', ramp(t, 34.2, 0.4), 'center', 5);
    text(g, 'DONO', 256, 500, `700 22px 'JetBrains Mono'`, '#F5CB62', ramp(t, 35.9, 0.4), 'center', 6);
  }
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
  ev.push({ t: 2.62, kind: 'coins' }, { t: 4.62, kind: 'thud' }, { t: 4.78, kind: 'loss' },
    { t: 9.85, kind: 'wave', d: 2.6 }, { t: 9.85, kind: 'ticks', d: 2.5, rate: 24 },
    { t: 13.45, kind: 'sparkle', d: 0.6 }, { t: 13.0, kind: 'murmur', d: 7.4 }, { t: 14.75, kind: 'thud' },
    { t: 17.95, kind: 'chime' }, { t: 19.6, kind: 'dim', d: 0.8 },
    { t: 20.4, kind: 'tension', d: 2.3 }, { t: 21.55, kind: 'glitch', d: 1.0 }, { t: 22.75, kind: 'drop' },
    { t: 27.1, kind: 'scan', d: 0.7 }, { t: 27.8, kind: 'knocks', n: 8, step: 0.12 }, { t: 28.68, kind: 'chime' },
    { t: 30.2, kind: 'swell', d: 2.0 }, { t: 31.3, kind: 'chime' }, { t: 33.2, kind: 'slice' }, { t: 35.1, kind: 'bloom', d: 3.1 });
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
