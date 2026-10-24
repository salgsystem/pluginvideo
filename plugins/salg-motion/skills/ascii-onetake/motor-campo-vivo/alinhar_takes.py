"""Acha em que segundo do filme começa cada take do Vitor, comparando o áudio do take com o vo.wav do projeto.
  python alinhar_takes.py projeto/vo.wav "inputs/videos/take 01.mp4" "inputs/videos/take 02.mp4" ...
  python alinhar_takes.py projeto/vo.wav inputs/videos/take*.mp4 --json vitor_takes.json

Funciona porque a narração do filme É o áudio desses takes (a fala do Vitor gravada na câmera). Para cada take:
  OFF   = segundo do filme em que o take começa (pode ser negativo se o take começa antes do filme)
  onda  = confiança (correlação da onda); o script avisa "conferir" quando o 2º candidato chega perto
Com --json grava a lista que o prep_vitor.py lê; depois é só preencher a "janela" de cada take (a mesma do VITOR no comp).
"""
import argparse, json, subprocess, sys
from pathlib import Path
import numpy as np

SR, HOP = 16000, 160  # envelope a cada 10 ms


def pcm(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-vn', '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float64)


def env(x):  # loudness envelope in log scale: robust to different mics (camera × lapela) and to the mix
    m = len(x) // HOP
    e = np.sqrt((x[:m * HOP].reshape(m, HOP) ** 2).mean(1))
    return np.log(e + 1e-3 * (e.max() + 1e-9))


def ncc(big, small):  # normalised cross-correlation of `small` sliding over `big` (FFT)
    n, m = len(big), len(small)
    s = (small - small.mean()) / (small.std() + 1e-9)
    L = 1 << int(np.ceil(np.log2(n + m)))
    c = np.fft.irfft(np.fft.rfft(big, L) * np.conj(np.fft.rfft(s, L)), L)[:n - m + 1]
    cs, cs2 = np.concatenate([[0], np.cumsum(big)]), np.concatenate([[0], np.cumsum(big ** 2)])
    mu = (cs[m:] - cs[:-m]) / m
    sd = np.sqrt(np.maximum((cs2[m:] - cs2[:-m]) / m - mu ** 2, 1e-12))
    return c / (m * sd)


def wave_ncc(vr, tr, o):  # waveform correlation of the take placed at sample o of the vo (±0.3 s), normalised
    pad = int(0.3 * SR); a0 = max(0, o - pad); seg = vr[a0:o + len(tr) + pad]
    if len(seg) < len(tr) // 2: return -1, o
    if len(seg) < len(tr): seg = np.concatenate([seg, np.zeros(len(tr) - len(seg) + 1)])
    L = 1 << int(np.ceil(np.log2(len(seg) + len(tr))))
    c = np.fft.irfft(np.fft.rfft(seg, L) * np.conj(np.fft.rfft(tr, L)), L)[:len(seg) - len(tr) + 1]
    cs = np.concatenate([[0], np.cumsum(seg ** 2)]); e = np.sqrt(np.maximum(cs[len(tr):] - cs[:-len(tr)], 1e-9) * (tr ** 2).sum())
    k = int(np.argmax(np.abs(c) / e)); return float(np.abs(c[k]) / e[k]), a0 + k


ap = argparse.ArgumentParser()
ap.add_argument('vo'); ap.add_argument('takes', nargs='+'); ap.add_argument('--json')
a = ap.parse_args()
vr = pcm(a.vo); V0 = env(vr)
out = []
for tk in a.takes:
    tr0 = pcm(tk); T0 = env(tr0)
    # only the speech: the room tone before/after the line says nothing about where it sits
    fl = np.percentile(T0, 10); sp = np.where(T0 > fl + 1.5)[0]; s0, s1 = (sp[0], sp[-1] + 1) if len(sp) else (0, len(T0))
    T = T0[s0:s1]; tr = tr0[s0 * HOP:s1 * HOP]
    # the take may start before the film or run past its end: pad the vo with its own floor
    padn = len(T); V = np.concatenate([np.full(padn, V0.min()), V0, np.full(padn, V0.min())])
    c = ncc(V, T); cand = []
    for _ in range(5):  # the 5 best envelope matches, at least 1 s apart…
        i = int(np.argmax(c)); cand.append(i - padn); c[max(0, i - 100):i + 100] = -9
    # …decided by the waveform itself (much more specific than the envelope)
    best = max((wave_ncc(vr, tr, max(0, o) * HOP) + (o,) for o in cand), key=lambda x: x[0])
    w, smp, o = best; off = (smp if o >= 0 else o * HOP) / SR - s0 * HOP / SR   # back to the take's own start
    others = sorted((wave_ncc(vr, tr, max(0, q) * HOP)[0] for q in cand if abs(q - o) > 50), reverse=True)
    runner = others[0] if others else 0
    flag = '' if w >= 0.2 and w > 1.6 * runner else '   <-- conferir (Whisper ou a olho)'
    print(f'{Path(tk).name}: OFF = {off:8.2f} s   onda = {w:.2f} (2º candidato {runner:.2f})   take = {len(tr0) / SR:.2f} s (fala {s0 / 100:.2f}–{s1 / 100:.2f}){flag}')
    out.append({'take': Path(tk).name, 'off': round(off, 2), 'janela': [None, None], 'conf': round(w, 2)})
if a.json:
    Path(a.json).write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding='utf-8'); print('->', a.json)
