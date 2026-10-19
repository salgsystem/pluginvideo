// campo-ascii.js — Campo ASCII para a landing page (porta do motor dos reels)
const RAMP = ' .·:-=+*#%@';
const SCR = '01<>/\\|=+*#%$?!';
const CHARS = [...new Set([...RAMP, ...SCR, 'o', '▪'])];
const CI = Object.fromEntries(CHARS.map((c, i) => [c, i]));
const TINT = ['#F2F2F5', '#A68BFF', '#6EA6FF', '#FF9B55', '#7C7C86', '#F2C14E', '#3DDC84', '#FF5A52'];
const PAL = TINT.map(h => [1, 3, 5].map(k => parseInt(h.slice(k, k + 2), 16)));
const GOLD = 5, GREEN = 6;

const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const E = {
  expoOut: p => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p)),
  inOut: p => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
  quadIn: p => p * p,
};
function hash(i, k = 0) { // determinístico: o mesmo agente sempre sorteia o mesmo
  let h = (Math.imul(i | 0, 374761393) + Math.imul(k | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296;
}
function xy2d(n, x, y) { // índice na curva de Hilbert
  let d = 0;
  for (let s = n >> 1; s > 0; s >>= 1) {
    const rx = (x & s) > 0 ? 1 : 0, ry = (y & s) > 0 ? 1 : 0;
    d += s * s * ((3 * rx) ^ ry);
    if (ry === 0) { if (rx === 1) { x = s - 1 - x; y = s - 1 - y; } const t = x; x = y; y = t; }
  }
  return d;
}

// cellPx = tamanho da célula na TELA (px CSS). A forma é desenhada num espaço de 1000 × 1100 e escalada para caber
// no canvas; a célula de leitura é convertida para esse espaço, então a densidade na tela é sempre ~cellPx.
export function createField(canvas, { N = 8000, cellPx = 4 } = {}) {
  const dpr = Math.min(2, devicePixelRatio || 1), ctx = canvas.getContext('2d');
  let W = 0, H = 0, cell = 10;
  const fit = () => Math.min(W / 1000, H / 1150);           // escala do espaço da forma para a tela
  // atlas: cada caractere em cada cor, desenhado uma vez
  const C = 48, atlas = document.createElement('canvas');
  atlas.width = CHARS.length * C; atlas.height = TINT.length * C;
  const ag = atlas.getContext('2d');
  ag.font = `500 ${C * 0.78}px 'JetBrains Mono', monospace`; ag.textAlign = 'center'; ag.textBaseline = 'middle';
  TINT.forEach((col, t) => { ag.fillStyle = col; CHARS.forEach((ch, c) => ag.fillText(ch, c * C + C / 2, t * C + C / 2 + 1)); });

  // estado dos agentes: atual (F), destino (G), saída (O)
  const mkBuf = () => ({ x: new Float32Array(N), y: new Float32Array(N), a: new Float32Array(N),
    c: new Uint8Array(N), t: new Uint8Array(N), s: new Float32Array(N) });
  const F = mkBuf(), G = mkBuf(), O = mkBuf(), D = new Float32Array(N);
  for (let i = 0; i < N; i++) { O.x[i] = (hash(i, 1) - 0.5) * 1400; O.y[i] = (hash(i, 2) - 0.5) * 1600; O.a[i] = 0.12 * hash(i, 3); O.c[i] = CI['.']; O.s[i] = 0.6; }
  let morph = null;

  // lê um desenho em grade → lista de destinos {x, y, a, c, t, s}
  function imgPts(draw, { w = 1000, h = 1100, money = false } = {}) {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const g = cv.getContext('2d', { willReadFrequently: true });
    g.translate(w / 2, h / 2); draw(g);
    const d = g.getImageData(0, 0, w, h).data, pts = [];
    for (let cy = 0; cy + cell <= h; cy += cell) for (let cx = 0; cx + cell <= w; cx += cell) {
      let R = 0, Gc = 0, B = 0, A = 0, n = 0;
      for (let y = cy; y < cy + cell; y += 2) for (let x = cx; x < cx + cell; x += 2) {
        const k = (y * w + x) * 4, a = d[k + 3] / 255; R += d[k] * a; Gc += d[k + 1] * a; B += d[k + 2] * a; A += a; n++;
      }
      const cov = A / n; if (cov < 0.3) continue;
      R /= A; Gc /= A; B /= A;
      const lum = ((0.299 * R + 0.587 * Gc + 0.114 * B) / 255) * Math.min(1, cov * 1.15);
      if (lum < 0.08) continue;
      const mx = Math.max(R, Gc, B), mn = Math.min(R, Gc, B);
      let t = 0;
      if (mx > 0 && (mx - mn) / mx > 0.25) { // cor de significado mais próxima pelo matiz
        let best = 1e9;
        PAL.forEach(([pr, pg, pb], ti) => { if (ti === 0 || ti === 4) return; const s = Math.max(pr, pg, pb);
          const dd = (R / mx - pr / s) ** 2 + (Gc / mx - pg / s) ** 2 + (B / mx - pb / s) ** 2; if (dd < best) { best = dd; t = ti; } });
      }
      const rr = hash(cx * 7 + cy, 9), li = clamp(Math.pow(lum, 0.8) + (rr - 0.5) * 0.08);
      if (money && t === GOLD && rr > 0.74) t = GREEN;
      pts.push({ x: cx + cell / 2 - w / 2, y: cy + cell / 2 - h / 2, a: 0.38 + 0.62 * li,
        c: CI[RAMP[clamp(Math.round(li * (RAMP.length - 1)), 1, RAMP.length - 1)]], t, s: 0.8 + 0.35 * li });
    }
    for (const p of pts) p.hd = xy2d(1024, clamp(((p.x + 700) / 1400) * 1024 | 0, 0, 1023), clamp(((p.y + 1000) / 2000) * 1024 | 0, 0, 1023));
    return pts.sort((a, b) => a.hd - b.hd);
  }

  // muda para uma forma nova (lista de pontos)
  function setShape(pts, { d = 0.8, st = 0.4, ease = 'expoOut', sw = 80, dl = 'radial' } = {}) {
    for (let i = 0; i < N; i++) { F.x[i] = O.x[i]; F.y[i] = O.y[i]; F.a[i] = O.a[i]; F.c[i] = O.c[i]; F.t[i] = O.t[i]; F.s[i] = O.s[i]; }
    const M = pts.length, step = M > N ? M / N : 1; // se a forma tem mais pontos que agentes, amostra uniformemente
    let mx = 1;
    for (let i = 0; i < N; i++) {
      const k = Math.floor(i * step);
      if (k < M) { const p = pts[k]; G.x[i] = p.x; G.y[i] = p.y; G.a[i] = p.a; G.c[i] = p.c; G.t[i] = p.t; G.s[i] = p.s; }
      else { G.x[i] = F.x[i]; G.y[i] = F.y[i]; G.a[i] = 0; G.c[i] = F.c[i]; G.t[i] = F.t[i]; G.s[i] = F.s[i]; }
      mx = Math.max(mx, Math.hypot(G.x[i], G.y[i]));
    }
    for (let i = 0; i < N; i++) {
      const r = hash(i, 77);
      D[i] = dl === 'radial' ? 0.75 * Math.hypot(G.x[i], G.y[i]) / mx + 0.25 * r
           : dl === 'top' ? 0.8 * clamp((G.y[i] + 600) / 1200) + 0.2 * r
           : dl === 'bottom' ? 0.8 * clamp((600 - G.y[i]) / 1200) + 0.2 * r : r;
    }
    morph = { t0: performance.now() / 1000, d, st, ease: E[ease], sw };
  }

  function step(now) {
    const m = morph; if (!m) return;
    const fr = Math.floor(now * 22);
    for (let i = 0; i < N; i++) {
      const p = clamp((now - m.t0 - m.st * D[i]) / m.d);
      if (p <= 0) { O.x[i] = F.x[i]; O.y[i] = F.y[i]; O.a[i] = F.a[i]; O.c[i] = F.c[i]; O.t[i] = F.t[i]; O.s[i] = F.s[i]; continue; }
      const q = m.ease(p);
      if (G.a[i] < 0.01 || F.a[i] < 0.01) { // saindo ou chegando: dissolve no lugar, nunca atravessa a tela
        const leaving = G.a[i] < 0.01, ql = leaving ? q : 1 - q, Bx = leaving ? F : G, Ox = leaving ? G : F;
        const dx = Ox.x[i] - Bx.x[i], dy = Ox.y[i] - Bx.y[i], dlen = Math.hypot(dx, dy) + 1e-3, mv = Math.min(dlen, 90) * ql;
        O.x[i] = Bx.x[i] + dx / dlen * mv; O.y[i] = Bx.y[i] + dy / dlen * mv;
        O.a[i] = Bx.a[i] * (1 - ql) ** 2; O.c[i] = ql > 0.3 ? CI[SCR[(hash(i, fr) * SCR.length) | 0]] : Bx.c[i];
        O.t[i] = Bx.t[i]; O.s[i] = Bx.s[i]; continue;
      }
      const dx = G.x[i] - F.x[i], dy = G.y[i] - F.y[i], len = Math.hypot(dx, dy) + 1e-3;
      const arc = m.sw * (hash(i, 5) - 0.5) * 2 * Math.sin(Math.PI * q) * Math.min(1, len / 300);
      O.x[i] = F.x[i] + dx * q - (dy / len) * arc; O.y[i] = F.y[i] + dy * q + (dx / len) * arc;
      O.a[i] = F.a[i] + (G.a[i] - F.a[i]) * q + 0.3 * Math.sin(Math.PI * q); // brilho de trânsito
      O.c[i] = q < 0.06 ? F.c[i] : q > 0.9 ? G.c[i] : CI[SCR[(hash(i, fr) * SCR.length) | 0]];
      O.t[i] = q < 0.5 ? F.t[i] : G.t[i]; O.s[i] = F.s[i] + (G.s[i] - F.s[i]) * q;
    }
  }

  function draw(now) {
    const breathe = 1 + 0.01 * Math.sin(now * 2.4);           // vida interna
    const fx = 5 * Math.sin(now * 0.61), fy = 4 * Math.sin(now * 0.53 + 2); // mão do operador
    const z = fit() * breathe;                                  // a forma cabe na área com folga
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    for (let i = 0; i < N; i++) {
      const a = O.a[i]; if (a < 0.01) continue;
      const sz = cell * z * 1.55 * O.s[i], x = W / 2 + fx + O.x[i] * z, y = H / 2 + fy + O.y[i] * z;
      ctx.globalAlpha = a > 1 ? 1 : a;
      ctx.drawImage(atlas, O.c[i] * C, O.t[i] * C, C, C, x - sz / 2, y - sz / 2, sz, sz);
    }
    ctx.globalAlpha = 1;
  }

  function resize() {
    const r = canvas.getBoundingClientRect(); W = r.width; H = r.height;
    canvas.width = W * dpr; canvas.height = H * dpr;
    cell = Math.max(4, Math.round(cellPx / fit()));          // célula no espaço da forma
  }
  new ResizeObserver(resize).observe(canvas); resize();
  let running = true;
  (function loop() { if (!running) return; const now = performance.now() / 1000; step(now); draw(now); requestAnimationFrame(loop); })();
  return { imgPts, setShape, stop: () => (running = false) };
}
