// VSL ATS — o que os dois filmes (Hook ao bloco 4 e Parte 2) compartilham desde os ajustes de 22/10.
// Carregado depois do comp.js (comp.html). Só funções e um namespace (C6): nada de const com nome do comp.js.
'use strict';
const C6 = {};

// ───────────────────────── mídia comum (partes/media_comum, gerada pelo prep_media.py)
C6.DIR = '../../../media_comum/';       // relativo a media/ (seqSrc monta media/<dir>/0001.jpg)
C6.IMG = '../../../../media_comum/img/'; // relativo a media/img/ (media/img → partes)
C6.SEQ = { scrollinsta: 128, saindo43: 170, gatinho: 444, b339: 204, b406: 77, sistema: 422, site: 276, aplicativo2: 390, celularvitor: 300, salgclub: 854 };
Object.entries(C6.SEQ).forEach(([k, n]) => { SEQS[k] = { dir: C6.DIR + k, n, ext: 'jpg', fps: 30 }; });
C6.IMGS = ['logo_alpha.png', 'a7d.jpg', 'live.jpg', 'whatsapp2.jpg', 'cerebro.png', 'app57.jpg', 'app57_tela.jpg', 'salg_criativos.jpg', 'salg_funil2.jpg', 'salg_crm.jpg', 'salg_ranking.jpg', 'salg_dash.jpg', 'salg_scroll.jpg', 'salg_scroll_top.jpg', 'app_broll.jpg', 'ats_logo.png', 'cap_spark.jpg', 'cap_forge.jpg', 'cap_apex.jpg', 'cap_claude.jpg', 'cap_hermes.jpg', 'salg_material.jpg',
  'whats.jpg', 'whats_logo.png', 'aula1.jpg', 'aula2.jpg', 'aula3.jpg', ...[...Array(16)].map((_, k) => `yt${k + 1}.jpg`), ...[...Array(8)].map((_, k) => `sem${k + 1}.jpg`)];
C6.IMGS.forEach(n => MEDIA_IMG.push(C6.IMG + n));
C6.im = n => IMGS[C6.IMG + n];
// play a common b-roll between t0 and t1 (loops when shorter)
C6.play = (id, t0, t1, loop = true) => PLAY.push([id, t0, t1, 0, loop]);

// ───────────────────────── poses (the mannequin is always doing something)
Object.assign(MAN_POSES, {
  type: t => ({ ...POSES.stand(t), tr: 0.06, uaL: -0.55, faL: -1.45 + 0.12 * Math.sin(t * 13), uaR: 0.55, faR: 1.45 + 0.12 * Math.sin(t * 11 + 1), hd: 0.12 + 0.04 * Math.sin(t * 3) }),
  shrug: t => { const u = 0.5 + 0.5 * Math.sin(t * 2.2); return { ...POSES.stand(t), uaL: -0.75 - 0.15 * u, faL: -2.1, uaR: 0.75 + 0.15 * u, faR: 2.1, dy: -4 * u, hd: 0.15 * Math.sin(t * 1.1) }; },
  sad: t => ({ ...POSES.stand(t), tr: 0.08, uaL: -0.05, faL: -0.02, uaR: 0.05, faR: 0.02, hd: 0.55 + 0.04 * Math.sin(t * 1.3), dy: 4 }),
  point: t => ({ ...POSES.stand(t), uaR: 1.75, faR: 1.8 + 0.08 * Math.sin(t * 4), hd: -0.1 }),
  wave: t => ({ ...POSES.stand(t), uaR: 2.55, faR: 2.9 + 0.45 * Math.sin(t * 9), hd: 0.08 * Math.sin(t * 2) }),
  jump: t => { const u = Math.abs(Math.sin(t * 5.2)); return { ...POSES.stand(t), dy: -26 * u, uaL: -2.4 - 0.3 * u, faL: -2.7, uaR: 2.4 + 0.3 * u, faR: 2.7, thL: -0.2 * u, shL: 0.35 * u, thR: 0.2 * u, shR: -0.35 * u }; },
  carry: t => ({ ...POSES.stand(t), tr: 0.1, uaL: -0.5, faL: -1.9, uaR: 0.5, faR: 1.9, hd: 0.05 }),
  build: t => { const u = Math.sin(t * 9); return { ...POSES.stand(t), tr: 0.25 + 0.08 * u, dy: 10, uaL: 1.2 + 0.4 * u, faL: 1.5 + 0.4 * u, uaR: 1.1 - 0.4 * u, faR: 1.4 - 0.4 * u, thL: -0.25, shL: 0.3, thR: 0.25, shR: -0.1, hd: 0.3 }; },
  hammer: t => { const u = Math.max(0, Math.sin(t * 8)); return { ...POSES.stand(t), tr: 0.15, uaR: 2.2 - 1.6 * u, faR: 2.6 - 1.4 * u, uaL: 0.9, faL: 1.2, hd: 0.25 }; },
});

// ───────────────────────── vector overlays (crisp, drawn over the ASCII in world space)
// a banknote: green, "R$ 100", a portrait medallion; rot in radians; a = alpha
C6.bill = (g, x, y, s, rot = 0, a = 1, col = '#3DDC84') => {
  if (a <= 0.01) return; g.save(); g.globalAlpha = a; g.translate(x, y); g.rotate(rot); g.scale(s, s);
  g.fillStyle = col; RR(g, -80, -38, 160, 76, 8); g.fill();
  g.strokeStyle = 'rgba(6,40,20,0.75)'; g.lineWidth = 3; RR(g, -72, -30, 144, 60, 5); g.stroke();
  g.fillStyle = 'rgba(6,40,20,0.35)'; g.beginPath(); g.ellipse(30, 0, 22, 24, 0, 0, 7); g.fill();
  g.fillStyle = '#06281a'; g.font = `800 26px 'Inter'`; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('R$', -62, -2);
  g.font = `700 14px 'JetBrains Mono'`; g.fillText('100', -60, 20);
  g.restore();
};
// a payment card: title + line, a coloured check; col = accent
C6.pay = (g, x, y, s, a, title = 'PAGO', line = 'MENSAL', col = '#3DDC84', ink = '#111') => {
  if (a <= 0.01) return; g.save(); g.globalAlpha = a; g.translate(x, y); g.scale(s, s);
  g.shadowColor = col; g.shadowBlur = 14; g.fillStyle = '#F4F4F7'; RR(g, -100, -34, 200, 68, 14); g.fill(); g.shadowBlur = 0;
  g.fillStyle = col; g.beginPath(); g.arc(-66, 0, 20, 0, 7); g.fill();
  g.strokeStyle = '#fff'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(-76, 0); g.lineTo(-68, 9); g.lineTo(-55, -9); g.stroke();
  g.fillStyle = ink; g.font = `800 19px 'Inter'`; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(title, -38, -10);
  g.fillStyle = '#555'; g.font = `600 14px 'JetBrains Mono'`; g.fillText(line, -38, 13);
  g.restore();
};
// lettering on a dark plate (rule 10: text over ASCII needs contrast)
C6.plate = (g, str, x, y, px, col = '#FFFFFF', a = 1, o = {}) => {
  if (a <= 0.01) return; g.save(); g.globalAlpha = a;
  g.font = `${o.w || 800} ${px}px ${o.mono ? "'JetBrains Mono'" : "'Inter'"}`; g.letterSpacing = (o.sp ?? 2) + 'px';
  const w = g.measureText(str).width, padX = px * 0.55, padY = px * 0.42;
  if (o.plate !== false) { g.fillStyle = o.bg || 'rgba(8,8,10,0.82)'; RR(g, x - w / 2 - padX, y - px / 2 - padY, w + 2 * padX, px + 2 * padY, px * 0.35); g.fill();
    if (o.stroke) { g.strokeStyle = o.stroke; g.lineWidth = 2; g.stroke(); } }
  if (o.glow) { g.shadowColor = o.glow; g.shadowBlur = o.blur || 24; }
  g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(str, x, y + px * 0.04);
  g.letterSpacing = '0px'; g.restore();
};
// a thin, premium strike: a line drawn across (p 0→1), with a soft glow
C6.strike = (g, x0, y0, x1, y1, p, col = '#FF4D4D', w = 7) => {
  if (p <= 0) return; g.save(); g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.shadowColor = col; g.shadowBlur = 16;
  g.beginPath(); g.moveTo(x0, y0); g.lineTo(lerp(x0, x1, E.cubicOut(clamp(p))), lerp(y0, y1, E.cubicOut(clamp(p)))); g.stroke(); g.restore();
};
// a check or an X in a circle (vector)
C6.mark = (g, x, y, s, a, ok = true) => {
  if (a <= 0.01) return; g.save(); g.globalAlpha = a; g.translate(x, y); g.scale(s, s);
  const col = ok ? '#3DDC84' : '#FF5A52'; g.fillStyle = col; g.shadowColor = col; g.shadowBlur = 18; g.beginPath(); g.arc(0, 0, 30, 0, 7); g.fill(); g.shadowBlur = 0;
  g.strokeStyle = '#fff'; g.lineWidth = 7; g.lineCap = 'round'; g.beginPath();
  if (ok) { g.moveTo(-13, 1); g.lineTo(-3, 11); g.lineTo(14, -10); } else { g.moveTo(-11, -11); g.lineTo(11, 11); g.moveTo(11, -11); g.lineTo(-11, 11); }
  g.stroke(); g.restore();
};
// a real-media panel with a frame (the TV, a phone screen…): img cover-fit inside a rounded rect, grain; on = 0…1 "switching on"
C6.screen = (g, img, x, y, w, h, a, o = {}) => {
  if (a <= 0.01 || !img) return; const on = o.on ?? 1;
  if (on < 1) { // a CRT switching on: a bright line opens vertically
    const hh = Math.max(4, h * E.cubicOut(clamp((on - 0.25) / 0.75)));
    g.save(); RR(g, x - w / 2, y - hh / 2, w, hh, Math.min(o.r ?? 10, hh / 2)); g.clip();
    mediaDraw(g, img, x - w / 2, y - h / 2, w, h, { a: a * clamp(on * 2), blur: o.blur ?? 0.5, grain: o.grain ?? 0.3, br: (o.br ?? 1) * (1 + 1.5 * (1 - clamp(on * 1.3))), sat: o.sat ?? 1 });
    g.restore(); if (on < 0.4) { g.save(); g.globalAlpha = a * (1 - on / 0.4); g.fillStyle = '#fff'; g.shadowColor = '#fff'; g.shadowBlur = 30; RR(g, x - w / 2 * clamp(on * 4), y - 2, w * clamp(on * 4), 4, 2); g.fill(); g.restore(); }
    return;
  }
  mediaDraw(g, img, x - w / 2, y - h / 2, w, h, { a, r: o.r ?? 10, blur: o.blur ?? 0.5, grain: o.grain ?? 0.3, br: o.br ?? 1, sat: o.sat ?? 1, zoom: o.zoom, panX: o.panX, panY: o.panY, gray: o.gray });
};

// ───────────────────────── drawings for the ASCII (white on dark, read on the grid)
C6.tvArt = (w = 560, h = 330) => g => { // a TV: a thick bezel, a dark screen, two feet
  g.fillStyle = LG(g, -w / 2, -h / 2, w / 2, h / 2, [[0, tone(WT, 0.95)], [1, tone(WT, 0.6)]]); RR(g, -w / 2 - 22, -h / 2 - 22, w + 44, h + 44, 26); g.fill();
  g.fillStyle = VOID; RR(g, -w / 2, -h / 2, w, h, 12); g.fill();
  g.fillStyle = tone(WT, 0.7); poly(g, [[-w * 0.3, h / 2 + 22], [-w * 0.34, h / 2 + 70], [-w * 0.27, h / 2 + 70], [-w * 0.22, h / 2 + 22]]); g.fill(); poly(g, [[w * 0.3, h / 2 + 22], [w * 0.34, h / 2 + 70], [w * 0.27, h / 2 + 70], [w * 0.22, h / 2 + 22]]); g.fill();
  g.fillStyle = tone(RD, 1); g.beginPath(); g.arc(w / 2 - 6, h / 2 + 11, 5, 0, 7); g.fill();
};
C6.brainSide = g => { // a brain seen from the side: frontal, parietal, occipital and temporal lobes, the cerebellum and the stem; folds as dark grooves
  const lobe = (pts, v) => { g.fillStyle = LG(g, -200, -150, 200, 150, [[0, tone('#FF9FB2', v)], [1, tone('#D96C86', v * 0.8)]]); g.beginPath(); pts.forEach(([x, y], k) => k ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill(); };
  g.save();
  g.beginPath(); g.moveTo(-210, 10); g.bezierCurveTo(-230, -120, -120, -190, 0, -185); g.bezierCurveTo(120, -185, 215, -120, 215, -20); g.bezierCurveTo(215, 50, 175, 95, 120, 100);
  g.bezierCurveTo(80, 135, 10, 130, -30, 105); g.bezierCurveTo(-90, 120, -160, 100, -190, 60); g.closePath();
  g.fillStyle = LG(g, -210, -180, 210, 120, [[0, tone(PINKH, 1)], [1, tone(PINKH, 0.62)]]); g.fill();
  g.strokeStyle = tone(PINKH, 0.25); g.lineWidth = 9; g.lineCap = 'round';
  [[[-150, -60], [-100, -110], [-40, -95], [10, -140]], [[-180, 10], [-120, -20], [-60, 5], [0, -40], [60, -30], [120, -90]], [[-120, 60], [-60, 40], [10, 60], [70, 30], [150, 40]],
   [[40, -150], [70, -100], [130, -120], [180, -60]], [[-60, -150], [-30, -60], [30, -10], [90, 0]], [[130, 20], [170, -20], [200, 10]]].forEach(c => { g.beginPath(); c.forEach(([x, y], k) => k ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke(); });
  g.strokeStyle = tone(PINKH, 0.18); g.lineWidth = 12; g.beginPath(); g.moveTo(-200, 40); g.quadraticCurveTo(-60, 0, 60, 80); g.stroke(); // the lateral sulcus
  g.fillStyle = LG(g, 60, 90, 180, 170, [[0, tone(PINKH, 0.9)], [1, tone(PINKH, 0.5)]]); g.beginPath(); g.ellipse(120, 125, 70, 42, -0.15, 0, 7); g.fill(); // cerebellum
  g.strokeStyle = tone(PINKH, 0.3); g.lineWidth = 5; for (let k = 0; k < 4; k++) { g.beginPath(); g.ellipse(120, 125, 60 - k * 12, 34 - k * 7, -0.15, 3.3, 6.1); g.stroke(); }
  g.fillStyle = tone(PINKH, 0.7); RR(g, 30, 110, 46, 120, 20); g.fill(); // the stem
  g.restore();
};
const PINKH = '#FF8FB8';
C6.book = (hex = '#4D8DFF') => g => { g.fillStyle = LG(g, -60, 0, 60, 0, [[0, tone(hex, 0.6)], [0.5, tone(hex, 1)], [1, tone(hex, 0.7)]]); RR(g, -60, -42, 120, 84, 8); g.fill(); g.fillStyle = tone(WT, 0.92); RR(g, -60, 30, 120, 12, 3); g.fill(); g.fillStyle = VOID; RR(g, -40, -22, 60, 8, 4); g.fill(); RR(g, -40, -6, 44, 8, 4); g.fill(); };
C6.chestBase = g => { // the chest body (iso-ish), wood with gold bands
  g.fillStyle = LG(g, -170, 0, 170, 0, [[0, tone('#B97A55', 0.65)], [0.5, tone('#B97A55', 1)], [1, tone('#B97A55', 0.6)]]); RR(g, -170, -10, 340, 170, 14); g.fill();
  g.fillStyle = tone('#F2C14E', 0.95); g.fillRect(-150, -10, 26, 170); g.fillRect(124, -10, 26, 170); RR(g, -34, 20, 68, 70, 10); g.fill();
  g.fillStyle = VOID; g.beginPath(); g.arc(0, 48, 10, 0, 7); g.fill(); g.fillRect(-4, 50, 8, 22);
};
C6.chestLid = g => { // the lid, hinged at its back edge (y = 0 at the hinge)
  g.fillStyle = LG(g, -170, -90, 170, 0, [[0, tone('#B97A55', 1)], [1, tone('#B97A55', 0.6)]]); g.beginPath(); g.moveTo(-170, 0); g.lineTo(-170, -40); g.quadraticCurveTo(0, -130, 170, -40); g.lineTo(170, 0); g.closePath(); g.fill();
  g.fillStyle = tone('#F2C14E', 0.95); g.fillRect(-150, -62, 26, 62); g.fillRect(124, -62, 26, 62);
};
C6.keyArt = g => { g.lineWidth = 22; g.strokeStyle = LG(g, -120, -40, -40, 40, [[0, tone('#F2C14E', 1)], [1, tone('#F2C14E', 0.6)]]); g.beginPath(); g.arc(-90, 0, 40, 0, 7); g.stroke();
  g.fillStyle = tone('#F2C14E', 0.9); RR(g, -50, -11, 190, 22, 8); g.fill(); poly(g, [[100, 8], [140, 8], [140, 52], [126, 52], [126, 34], [114, 34], [114, 46], [100, 46]]); g.fill(); };
C6.lamp = g => { // a light bulb (the next shiny new thing)
  sphere(g, 0, -40, 70, '#F6E3C2', 1, CREAM); g.fillStyle = tone(WT, 0.7); RR(g, -32, 26, 64, 18, 6); g.fill(); RR(g, -28, 48, 56, 14, 6); g.fill(); RR(g, -18, 66, 36, 12, 6); g.fill();
  g.strokeStyle = tone(GD, 0.9); g.lineWidth = 5; g.beginPath(); g.moveTo(-18, 20); g.lineTo(-10, -40); g.lineTo(0, -10); g.lineTo(10, -40); g.lineTo(18, 20); g.stroke(); };
C6.pawn = g => { // a chess pawn with volume: ball head, collar, flared base
  g.fillStyle = LG(g, -120, 0, 120, 0, [[0, tone(WT, 0.45)], [0.42, tone(WT, 1)], [1, tone(WT, 0.4)]]);
  g.beginPath(); g.moveTo(-60, -40); g.quadraticCurveTo(-40, 40, -70, 120); g.lineTo(-115, 150); g.lineTo(-115, 190); g.lineTo(115, 190); g.lineTo(115, 150); g.lineTo(70, 120); g.quadraticCurveTo(40, 40, 60, -40); g.closePath(); g.fill();
  RR(g, -80, -62, 160, 30, 14); g.fill(); sphere(g, 0, -120, 62, WT, 1);
  g.fillStyle = tone(WT, 0.3); RR(g, -115, 160, 230, 8, 4); g.fill();
};
C6.crown = g => { g.fillStyle = LG(g, -110, -80, 110, 40, [[0, tone(GD, 1)], [1, tone(GD, 0.6)]]); poly(g, [[-110, 40], [-120, -60], [-60, -10], [0, -90], [60, -10], [120, -60], [110, 40]]); g.fill();
  RR(g, -112, 30, 224, 30, 8); g.fill(); [[-120, -60], [0, -90], [120, -60]].forEach(([x, y]) => sphere(g, x, y, 14, GD, 1, GOLD)); sphere(g, 0, 0, 14, RD, 1, RED); };
C6.shield = g => { g.fillStyle = LG(g, -130, -150, 130, 150, [[0, tone(GN, 1)], [1, tone(GN, 0.65)]]); g.beginPath(); g.moveTo(0, -160); g.lineTo(140, -110); g.quadraticCurveTo(140, 90, 0, 170); g.quadraticCurveTo(-140, 90, -140, -110); g.closePath(); g.fill();
  g.strokeStyle = tone(WT, 0.95); g.lineWidth = 26; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(-55, 0); g.lineTo(-12, 45); g.lineTo(65, -45); g.stroke(); };
// an image window (sx, sy, sw, sh of the source) on a 3D quad — for a long page scrolling on a tilted screen
C6.quadWin = (g, img, Q, sy, sh, o = {}) => {
  if (!img) return; const iw = img.naturalWidth || img.width, S = 48, a = o.a ?? 1; if (a <= 0.003) return;
  const [tl, tr, br, bl] = Q, L = (p, q, u) => [p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u];
  // the window is copied to a small canvas first: drawing a sub-rect of a very tall image strip by strip fails on the GPU
  const CW = C6.qwc || (C6.qwc = mk(1080, 1400)), cg = CW.getContext('2d'), ww = Math.min(1080, iw), wh = Math.min(1400, Math.round(sh * ww / iw));
  cg.setTransform(1, 0, 0, 1, 0, 0); cg.clearRect(0, 0, CW.width, CW.height); cg.filter = `saturate(${o.sat ?? 1}) brightness(${o.br ?? 1.05}) contrast(1.05)`; cg.drawImage(img, 0, sy, iw, sh, 0, 0, ww, wh); cg.filter = 'none';
  g.save(); g.globalAlpha = a; const sc0 = g.shadowColor, sb0 = g.shadowBlur; g.shadowBlur = 0; // a shadow per strip would cover the picture
  const base = g.getTransform();
  for (let k = 0; k < S; k++) {
    const u0 = k / S, u1 = (k + 1.04) / S, P0 = L(tl, tr, u0), P1 = L(tl, tr, u1), Q0 = L(bl, br, u0), sx = u0 * ww, sw = ww / S * 1.04;
    g.setTransform(base); g.transform((P1[0] - P0[0]) / sw, (P1[1] - P0[1]) / sw, (Q0[0] - P0[0]) / wh, (Q0[1] - P0[1]) / wh, P0[0], P0[1]);
    g.drawImage(CW, sx, 0, sw, wh, 0, 0, sw, wh);
  }
  g.setTransform(base);
  g.beginPath(); g.moveTo(...tl); g.lineTo(...tr); g.lineTo(...br); g.lineTo(...bl); g.closePath();
  g.save(); g.clip(); g.globalCompositeOperation = 'overlay'; g.globalAlpha = a * (o.grain ?? 0.2); g.fillStyle = g.createPattern(grain[CUR_FI % 4], 'repeat'); g.fill(); g.restore();
  if (o.stroke) { g.globalAlpha = a * 0.8; g.shadowColor = sc0; g.shadowBlur = sb0; g.strokeStyle = o.stroke; g.lineWidth = 2.5; g.stroke(); }
  g.restore();
};

// ───────────────────────── v7 (23/10): mockups, dart, agent cards, more poses
Object.assign(MAN_POSES, {
  sit: t => ({ tr: -0.18, dy: 52, thL: 1.45, shL: 0.1, thR: 1.5, shR: 0.05, uaL: -0.35, faL: 0.6, uaR: 0.35, faR: 1.2 + 0.05 * Math.sin(t * 1.3), hd: -0.1 + 0.05 * Math.sin(t * 0.9) }),
  sitPhone: t => ({ tr: 0.05, dy: 52, thL: 1.45, shL: 0.1, thR: 1.5, shR: 0.05, uaL: -0.3, faL: -2.0, uaR: 0.3, faR: 2.0 + 0.06 * Math.sin(t * 7), hd: 0.45 }),
  scroll: t => ({ ...POSES.stand(t), uaL: -0.12, faL: -0.05, uaR: 0.35, faR: 2.5 + 0.07 * Math.sin(t * 6), hd: 0.4 + 0.03 * Math.sin(t * 2) }),
  plan: t => ({ ...POSES.stand(t), tr: 0.18, uaL: -0.9, faL: -1.7, uaR: 0.9, faR: 1.7 + 0.15 * Math.sin(t * 3), hd: 0.35 }),       // leaning over a table, hands on it
  present: t => ({ ...POSES.stand(t), uaR: 1.9 + 0.2 * Math.sin(t * 1.7), faR: 2.2, uaL: -0.4, faL: -0.9, hd: -0.15 }),             // shows something up and aside
});
// a laptop mockup in 3D: the screen (an image or a window of a tall image) on a panel, the bezel, the keyboard deck under it
C6.laptop = (g, img, x, y, w, ry, a, o = {}) => {
  if (a <= 0.01) return; const h = w * 0.625, rx = o.rx ?? 0.05, Q = panel3(x, y, o.z || 0, w, h, ry, rx), [tl, tr, br, bl] = Q;
  const ex = (p, q, k) => [p[0] + (p[0] - q[0]) * k, p[1] + (p[1] - q[1]) * k];
  g.save(); g.globalAlpha = a;
  const bt = ex(tl, bl, 0.035), bb = ex(bl, tl, 0.035), tr2 = ex(tr, br, 0.035), br2 = ex(br, tr, 0.035), B = [ex(bt, tr2, 0.025), ex(tr2, bt, 0.025), ex(br2, bb, 0.025), ex(bb, br2, 0.025)];
  g.fillStyle = '#16161b'; g.strokeStyle = 'rgba(230,230,240,0.55)'; g.lineWidth = 2.5; g.shadowColor = o.glow || 'rgba(147,188,255,0.35)'; g.shadowBlur = 40 * a;
  g.beginPath(); B.forEach((p, k) => k ? g.lineTo(...p) : g.moveTo(...p)); g.closePath(); g.fill(); g.shadowBlur = 0; g.stroke();
  const d0 = B[3], d1 = B[2], dw = Math.hypot(d1[0] - d0[0], d1[1] - d0[1]), deck = [d0, d1, [d1[0] + dw * 0.07, d1[1] + dw * 0.1], [d0[0] - dw * 0.07, d0[1] + dw * 0.1]];
  g.fillStyle = '#24242b'; g.beginPath(); deck.forEach((p, k) => k ? g.lineTo(...p) : g.moveTo(...p)); g.closePath(); g.fill(); g.stroke();
  g.strokeStyle = 'rgba(230,230,240,0.18)'; g.lineWidth = 1.2; for (let r = 1; r < 4; r++) { const u = r / 4.3, L0 = [lerp(deck[0][0], deck[3][0], u), lerp(deck[0][1], deck[3][1], u)], L1 = [lerp(deck[1][0], deck[2][0], u), lerp(deck[1][1], deck[2][1], u)]; g.beginPath(); g.moveTo(lerp(L0[0], L1[0], 0.12), lerp(L0[1], L1[1], 0.12)); g.lineTo(lerp(L0[0], L1[0], 0.88), lerp(L0[1], L1[1], 0.88)); g.stroke(); }
  g.restore();
  if (o.win !== undefined && img) C6.quadWin(g, img, Q, o.win, Math.min((img.naturalHeight || img.height) - o.win, (img.naturalWidth || img.width) * h / w), { a, grain: o.grain ?? 0.18, br: o.br ?? 1.05 });
  else if (img) { const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height, sh = Math.min(ih, iw * h / w); C6.quadWin(g, img, Q, (ih - sh) / 2 * (o.crop ?? 1), sh, { a, grain: o.grain ?? 0.18, br: o.br ?? 1.05 }); }
  if (o.after) o.after(Q);
};
// a phone mockup (flat, slightly floating): dark body, thin light edge, the island; the content cover-fits the screen
C6.phone = (g, img, x, y, w, a, o = {}) => {
  if (a <= 0.01) return; const h = w * (o.ratio || 2.08), r = w * 0.14;
  g.save(); g.globalAlpha = a; g.translate(x, y); if (o.rot) g.rotate(o.rot);
  g.shadowColor = o.glow || 'rgba(147,188,255,0.35)'; g.shadowBlur = 40 * a; g.fillStyle = '#121216'; RR(g, -w / 2 - 12, -h / 2 - 12, w + 24, h + 24, r + 10); g.fill(); g.shadowBlur = 0;
  g.strokeStyle = 'rgba(235,235,245,0.55)'; g.lineWidth = 2.5; RR(g, -w / 2 - 12, -h / 2 - 12, w + 24, h + 24, r + 10); g.stroke();
  g.save(); RR(g, -w / 2, -h / 2, w, h, r); g.clip(); if (img) mediaDraw(g, img, -w / 2, -h / 2, w, h, { a: 1, blur: 0.3, grain: o.grain ?? 0.18, br: o.br ?? 1.02, sat: 1, zoom: o.zoom, panY: o.panY }); g.restore();
  g.fillStyle = '#050506'; RR(g, -w * 0.16, -h / 2 + 12, w * 0.32, 22, 11); g.fill(); g.restore();
};
// a dart: steel tip, body, flights; drawn pointing +x
C6.dart = (g, x, y, s, rot, a) => { if (a <= 0.01) return; g.save(); g.globalAlpha = a; g.translate(x, y); g.rotate(rot); g.scale(s, s);
  g.fillStyle = '#E8E8EE'; poly(g, [[0, 0], [-34, -4], [-34, 4]]); g.fill(); g.fillStyle = '#FF5A52'; RR(g, -90, -7, 58, 14, 6); g.fill(); g.fillStyle = '#8A8A94'; g.fillRect(-120, -3, 32, 6);
  g.fillStyle = '#FF5A52'; poly(g, [[-112, 0], [-150, -26], [-160, -24], [-132, 0]]); g.fill(); poly(g, [[-112, 0], [-150, 26], [-160, 24], [-132, 0]]); g.fill(); g.restore(); };
// an agent card: icon glyph, name, a status line that types; lit = receiving work
C6.agent = (g, x, y, name, glyph, a, lit = 0, status = 'trabalhando') => { if (a <= 0.01) return; g.save(); g.globalAlpha = a;
  g.shadowColor = '#6EA6FF'; g.shadowBlur = 10 + 30 * lit; g.fillStyle = `rgba(${13 + 20 * lit},${20 + 30 * lit},${36 + 40 * lit},0.95)`; RR(g, x - 120, y - 52, 240, 104, 18); g.fill(); g.shadowBlur = 0;
  g.strokeStyle = lit > 0.3 ? '#93BCFF' : 'rgba(110,166,255,0.5)'; g.lineWidth = 2; RR(g, x - 120, y - 52, 240, 104, 18); g.stroke();
  g.fillStyle = '#6EA6FF'; g.beginPath(); g.arc(x - 78, y - 6, 26, 0, 7); g.fill(); g.fillStyle = '#071226'; g.font = `800 24px 'JetBrains Mono'`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(glyph, x - 78, y - 5);
  g.fillStyle = '#FFFFFF'; g.font = `800 19px 'Inter'`; g.textAlign = 'left'; g.fillText(name, x - 40, y - 16);
  g.fillStyle = '#93BCFF'; g.font = `500 14px 'JetBrains Mono'`; g.fillText(status + '.'.repeat(1 + (Math.floor(performance.now ? 0 : 0) % 3)), x - 40, y + 14); g.restore(); };
// kinetic lettering, no plate: each letter drops in, scales and settles; a soft dark halo keeps it legible over video or ASCII
C6.kinetic = (g, str, x, y, px, col, t, T0, o = {}) => {
  if (t < T0) return; const a0 = o.a ?? 1; if (a0 <= 0.01) return;
  g.save(); g.font = `${o.w || 900} ${px}px 'Inter'`; g.textBaseline = 'middle'; g.textAlign = 'left'; g.letterSpacing = (o.sp ?? 2) + 'px';
  const chars = [...str], ws = chars.map(c => g.measureText(c).width + (o.sp ?? 2)), tot = ws.reduce((s, w) => s + w, 0); let cx = x - tot / 2;
  chars.forEach((c, k) => { const u = clamp((t - T0 - k * (o.stagger ?? 0.035)) / 0.32), q = E.backOut(u); if (u > 0) {
    g.globalAlpha = a0 * clamp(u * 2); const s = 1.6 - 0.6 * q; g.save(); g.translate(cx + ws[k] / 2, y - 26 * (1 - clamp(q))); g.scale(s, s);
    g.shadowColor = 'rgba(0,0,0,0.95)'; g.shadowBlur = px * 0.5; g.fillStyle = col; g.fillText(c, -ws[k] / 2, 0); if (o.glow) { g.shadowColor = o.glow; g.shadowBlur = px * 0.4; g.fillText(c, -ws[k] / 2, 0); } g.restore(); }
    cx += ws[k]; });
  g.restore();
};
// an open wallet, seen from the front: two flaps, empty card slots, the empty note pocket (ASCII)
C6.walletOpen = g => {
  const L = (x) => LG(g, x - 230, -150, x + 230, 150, [[0, tone('#B97A55', 0.95)], [1, tone('#B97A55', 0.55)]]);
  g.fillStyle = L(-230); RR(g, -460, -150, 450, 300, 26); g.fill(); g.fillStyle = L(230); RR(g, 10, -150, 450, 300, 26); g.fill();
  g.fillStyle = tone('#B97A55', 0.35); [-110, -40, 30].forEach(y => { RR(g, -420, y, 360, 52, 10); g.fill(); });
  g.fillStyle = VOID; RR(g, 60, -110, 360, 220, 16); g.fill(); g.strokeStyle = tone(WT, 0.6); g.lineWidth = 5; g.setLineDash([12, 10]); RR(g, 60, -110, 360, 220, 16); g.stroke(); g.setLineDash([]);
  g.strokeStyle = tone('#F6E3C2', 0.7); g.lineWidth = 4; g.setLineDash([10, 8]); RR(g, -450, -140, 430, 280, 22); g.stroke(); RR(g, 20, -140, 430, 280, 22); g.stroke(); g.setLineDash([]);
};
