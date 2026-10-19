"""Encurta silêncios (silencedetect), iguala volume e emenda os áudios.
  python cortar.py saida.wav arq1.wav[:ganho_dB] arq2.wav[:ganho_dB] ... [--sem-corte]
Silêncio < 0,30 s vira 0,12 s; maior vira 0,20 s; início e fim zerados; 15 ms de fade em cada corte; 0,35 s entre arquivos.
"""
import re, subprocess, sys
import numpy as np

SR, NOISE, MIN_D = 48000, '-38dB', 0.18
CURTA, LONGA, LIMIAR = 0.12, 0.20, 0.30   # silêncio < LIMIAR vira CURTA, senão LONGA
EMENDA, FADE = 0.35, 0.015

def load(p):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', p, '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).copy()

def silences(p):
    err = subprocess.run(['ffmpeg', '-hide_banner', '-i', p, '-af', f'silencedetect=noise={NOISE}:d={MIN_D}', '-f', 'null', '-'],
                         capture_output=True, text=True).stderr
    st = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', err)]
    en = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', err)]
    return list(zip(st, en))

def tighten(p, gain_db):
    x = load(p) * (10 ** (gain_db / 20)); n = len(x); dur = n / SR
    sil = [] if SEM_CORTE else silences(p)
    # trechos de voz a manter, com metade da pausa-alvo de cada lado
    keep, cur = [], 0.0
    for s, e in sil:
        if s <= 0.001:            # silêncio inicial: corta tudo
            cur = e; continue
        if e >= dur - 0.001:      # silêncio final: corta tudo
            keep.append((cur, s)); cur = None; break
        alvo = CURTA if e - s < LIMIAR else LONGA
        keep.append((cur, s + alvo / 2)); cur = e - alvo / 2
    if cur is not None: keep.append((cur, dur))
    f = int(FADE * SR); ramp = np.linspace(0, 1, f, dtype=np.float32)[:, None]
    parts = []
    for a, b in keep:
        seg = x[int(a * SR):int(b * SR)].copy()
        if len(seg) > 2 * f:
            seg[:f] *= ramp; seg[-f:] *= ramp[::-1]
        parts.append(seg)
    y = np.concatenate(parts)
    print(f'{p}: {dur:.2f} s -> {len(y)/SR:.2f} s ({len(sil)} pausas)')
    return y

SEM_CORTE = '--sem-corte' in sys.argv
argv = [x for x in sys.argv[1:] if x != '--sem-corte']
out, srcs = argv[0], argv[1:]
gap = np.zeros((int(EMENDA * SR), 2), np.float32)
chunks = []
for i, s in enumerate(srcs):
    p, g = (s.rsplit(':', 1) + ['0'])[:2] if re.search(r':-?[\d.]+$', s) else (s, '0')
    if i: chunks.append(gap)
    chunks.append(tighten(p, float(g)))
y = np.clip(np.concatenate(chunks), -1, 1)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'pcm_s24le', out],
               input=y.astype(np.float32).tobytes(), check=True)
print(f'-> {out}: {len(y)/SR:.2f} s')
