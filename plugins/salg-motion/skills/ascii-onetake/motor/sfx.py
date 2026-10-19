"""Synthesised score for the "Confeiteira" reel: one room, few materials, timed from the comp's events.json.
Bed (drone → near-silence on "Então," → warm chord on "solução viável"), air whooshes on morphs, pops, ticks,
the wheel, coin rain. Ducked under the voice, mastered with ffmpeg loudnorm.  ->  mix.wav
"""
import json, subprocess
from pathlib import Path
import numpy as np
from scipy import signal

ROOT = Path(__file__).resolve().parent
SR, DUR = 48000, 71.81
NS = int(SR * DUR)
rng = np.random.default_rng(7)


def load_vo():
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(ROOT / 'vo.wav'), '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'],
                         capture_output=True, check=True).stdout
    x = np.frombuffer(raw, np.float32).reshape(-1, 2).copy()
    out = np.zeros((NS, 2), np.float32); n = min(NS, len(x)); out[:n] = x[:n]
    return out


def db(x): return 10 ** (x / 20)
def bp(x, lo, hi, order=2): return signal.sosfilt(signal.butter(order, [lo, hi], 'band', fs=SR, output='sos'), x)
def lp(x, f, order=2): return signal.sosfilt(signal.butter(order, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, order=2): return signal.sosfilt(signal.butter(order, f, 'high', fs=SR, output='sos'), x)
def tt(n): return np.arange(n) / SR


sfx = np.zeros((NS, 2), np.float32)
bed = np.zeros((NS, 2), np.float32)


def add(buf, t0, mono, gain_db=0, pan=0.0):
    i = int(t0 * SR)
    if i >= NS: return
    m = mono[: NS - i] * db(gain_db)
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    buf[i:i + len(m), 0] += m * l * 1.414
    buf[i:i + len(m), 1] += m * r * 1.414


def env_ar(n, a, r_shape=3.0):
    x = np.linspace(0, 1, n)
    e = np.where(x < a, x / max(a, 1e-4), (1 - (x - a) / (1 - a)) ** r_shape)
    return e


# ── materials
def whoosh(d, lo=250, hi=3200):
    n = int(SR * (d + 0.3)); x = rng.standard_normal(n)
    x = bp(x, lo, hi)
    # brightness rises with the swell
    bright = hp(x, 1800) * np.linspace(0, 1, n) ** 2
    return (x + 0.6 * bright) * env_ar(n, 0.55, 2.2) * 0.25


def tick():
    n = int(SR * 0.012); x = rng.standard_normal(n) * np.exp(-tt(n) * 600)
    return hp(x, 2500) * 0.5


def thud(f0=62, f1=38, d=0.5):
    n = int(SR * d); t = tt(n); f = f1 + (f0 - f1) * np.exp(-t * 18)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7)
    click = lp(rng.standard_normal(n), 1200) * np.exp(-t * 90) * 0.4
    return s + click


def chime(fs=(880, 1318.5, 1760, 2637), d=1.6):
    n = int(SR * d); t = tt(n)
    return sum(np.sin(2 * np.pi * f * t + k) * np.exp(-t * (2.2 + k * 0.9)) / (k + 1) for k, f in enumerate(fs)) * 0.35


def sweep(f0, f1, d):
    n = int(SR * d); t = tt(n); f = np.geomspace(f0, f1, n)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / d) ** 2 * 0.3


def glitch(d):
    n = int(SR * d); out = np.zeros(n)
    k = 0
    while k < n:
        seg = int(SR * rng.uniform(0.02, 0.09)); gap = int(SR * rng.uniform(0.01, 0.12) * (1.3 - k / n))
        if rng.random() < 0.55:
            f = rng.choice([110, 220, 440, 880, 1760]) * rng.uniform(0.98, 1.02)
            s = np.sign(np.sin(2 * np.pi * f * tt(seg)))
        else:
            s = rng.standard_normal(seg)
        s = np.round(s * 4) / 4  # crush
        out[k:k + seg] += s[: max(0, min(seg, n - k))] * (0.25 + 0.75 * k / n)
        k += seg + gap
    return lp(out, 6000) * 0.22


def coin_rain(d, density):
    n = int(SR * d); out = np.zeros(n)
    count = int(density * d)
    for _ in range(count):
        i = int(rng.uniform(0, 1) ** 0.7 * (n - 4000)); f = rng.uniform(2600, 5200); m = int(SR * 0.06)
        out[i:i + m] += np.sin(2 * np.pi * f * tt(m)) * np.exp(-tt(m) * 70) * rng.uniform(0.2, 1)
    return out * 0.18


def murmur(d):
    n = int(SR * d); x = bp(rng.standard_normal(n), 250, 900)
    am = 0.6 + 0.4 * np.abs(signal.sosfilt(signal.butter(1, 4, 'low', fs=SR, output='sos'), rng.standard_normal(n))) * 4
    return x * np.clip(am, 0, 1.4) * env_ar(n, 0.15, 0.6) * 0.3


def knock():
    n = int(SR * 0.18); t = tt(n)
    return (np.sin(2 * np.pi * 180 * t) * np.exp(-t * 38) + 0.5 * lp(rng.standard_normal(n), 2500) * np.exp(-t * 80)) * 0.7


def pop():
    n = int(SR * 0.09); t = tt(n); f = np.geomspace(700, 1300, n)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 45) * 0.5


def slice_():
    n = int(SR * 0.45); t = tt(n); x = hp(rng.standard_normal(n), 3000) * np.exp(-t * 14)
    return x * 0.6 + sweep(3000, 900, 0.45) * 0.6


ev = json.loads((ROOT / 'events.json').read_text())
T_DROP = next((e['t'] for e in ev if e['kind'] == 'drop'), DUR + 10)   # no drop → the bed never dips
T_BLOOM = next((e['t'] for e in ev if e['kind'] == 'bloom'), DUR + 10) # no bloom → no closing chord
# ── bed: drone that thins to silence on "sozinho", then a warm chord on the payoff
t = tt(NS)
lfo = 0.75 + 0.25 * np.sin(2 * np.pi * 0.07 * t)
drone = (np.sin(2 * np.pi * 55 * t) * 0.5 + np.sin(2 * np.pi * 82.41 * t) * 0.28 + np.sin(2 * np.pi * 110.3 * t) * 0.18)
air = lp(hp(rng.standard_normal(NS), 200), 1400) * 0.05
level = np.clip(t / 1.5, 0, 1)
level *= 1 - 0.85 * np.clip((t - T_DROP + 0.1) / 0.3, 0, 1) * (1 - np.clip((t - T_DROP - 1.2) / 2.0, 0, 1))  # the drop
lift = np.clip((t - T_BLOOM + 2.5) / 3.0, 0, 1)
chord = sum(np.sin(2 * np.pi * f * t + k) * a for k, (f, a) in enumerate([(110, .3), (138.59, .22), (164.81, .22), (220, .14), (277.18, .08)]))
chord = lp(chord, 900) * (np.clip((t - T_BLOOM + 0.2) / 1.4, 0, 1)) * (1 - np.clip((t - DUR + 1.2) / 1.0, 0, 1))
mono_bed = (drone * lfo + air) * level * (1 - 0.4 * lift) + chord * 0.9
mono_bed *= 1 - np.clip((t - DUR + 0.6) / 0.6, 0, 1)
bed[:, 0] = mono_bed * 0.5; bed[:, 1] = np.roll(mono_bed, 240) * 0.5

# ── events
for e in ev:
    k, t0 = e['kind'], e['t']
    if k == 'morph':
        d = min(e['d'], 1.6)
        pan = {'chatter': -0.3, 'grid': 0.2, 'tower': -0.15, 'videos': 0.3}.get(e['shape'], 0)
        add(sfx, t0 - 0.1, whoosh(d), -15, pan)
    elif k == 'ticks':
        n = int(e['d'] * e['rate'])
        for j in range(n):
            add(sfx, t0 + j / e['rate'] + rng.uniform(-0.01, 0.01), tick(), -22 + rng.uniform(-4, 2), rng.uniform(-0.5, 0.5))
    elif k == 'thud': add(sfx, t0, thud(), -14)
    elif k == 'impact': add(sfx, t0 - 0.02, thud(70, 34, 1.1), -8); add(sfx, t0, whoosh(0.2, 80, 900), -14)
    elif k == 'dim':
        for j in range(8): add(sfx, t0 + j * e['d'] / 8, sweep(700 - j * 50, 300 - j * 20, 0.12), -28)
    elif k == 'chime': add(sfx, t0, chime(), -22, 0.15)
    elif k == 'scan': add(sfx, t0, sweep(500, 2400, e['d']), -26)
    elif k == 'glitch': add(sfx, t0, glitch(e['d']), -14)
    elif k == 'rain': add(sfx, t0, coin_rain(e['d'], 18), -15, -0.1); add(sfx, t0 + 1.26, coin_rain(0.8, 40), -15, 0.1)
    elif k == 'drop': add(sfx, t0, thud(48, 30, 1.4), -18)
    elif k == 'swell': add(sfx, t0, whoosh(e['d'], 150, 2400), -16); add(sfx, t0 + 1.7, chime((660, 990, 1320), 1.4), -26)
    elif k == 'slice': add(sfx, t0, slice_(), -12)
    elif k == 'coins': add(sfx, t0 - 0.05, coin_rain(0.5, 40), -16); add(sfx, t0, thud(90, 60, 0.3), -20)
    elif k == 'loss': add(sfx, t0, sweep(420, 140, 0.7), -20)
    elif k == 'wave': add(sfx, t0, whoosh(e['d'], 300, 5000), -18); add(sfx, t0, sweep(200, 1400, e['d']), -28)
    elif k == 'sparkle': add(sfx, t0, coin_rain(e['d'], 60), -24)
    elif k == 'murmur': add(sfx, t0, murmur(e['d']), -14)
    elif k == 'tension': add(sfx, t0, murmur(e['d']) * 1.6 + sweep(70, 120, e['d']), -10)
    elif k == 'knocks':
        for j in range(e['n']): add(sfx, t0 + j * e['step'], knock(), -14 + j * 0.4, (j % 3 - 1) * 0.3)
    elif k == 'pop': add(sfx, t0, pop(), -19, rng.uniform(-0.3, 0.3))
    elif k == 'type':
        for j in range(int(e['d'] * 18)): add(sfx, t0 + j / 18 + rng.uniform(-0.012, 0.012), tick(), -19 + rng.uniform(-3, 2), rng.uniform(-0.2, 0.2))
    elif k == 'spin':  # one click per segment passing the pointer, slowing with the wheel (cubic ease-out)
        seg = 2 * np.pi / e['n']; last = 0
        for j in range(1, int(e['d'] * 400)):
            u = j / (e['d'] * 400); th = e['end'] * (1 - (1 - u) ** 3); c = int(th // seg)
            if c > last: add(sfx, t0 + u * e['d'], knock(), -20, 0.1); last = c
    elif k == 'bloom': add(sfx, t0, chime((440, 659.25, 880, 1108.7), 2.6), -22)

# ── one room: the same short synthetic hall on every sfx
n_ir = int(SR * 1.4); ir = rng.standard_normal((n_ir, 2)) * np.exp(-tt(n_ir) * 4.2)[:, None]
ir = np.stack([lp(ir[:, 0], 5000), lp(ir[:, 1], 5000)], 1); ir /= np.abs(ir).sum(0).max() / 6
wet = np.stack([signal.fftconvolve(sfx[:, c], ir[:, c])[:NS] for c in range(2)], 1)
sfx_room = sfx + 0.35 * wet

# ── duck everything under the voice
vo = load_vo()
envv = np.abs(vo).mean(1)
envv = signal.sosfiltfilt(signal.butter(1, 6, 'low', fs=SR, output='sos'), envv)
duck = 1 - 0.45 * np.clip(envv / (np.percentile(envv, 90) + 1e-6), 0, 1)
music = (bed * db(-17) + sfx_room) * duck[:, None]
mix = vo + music
mix /= max(1.0, np.abs(mix).max() / 0.95)
pre = ROOT / 'mix_pre.wav'
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-',
                str(pre)], input=mix.astype(np.float32).tobytes(), check=True)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(pre), '-af', 'loudnorm=I=-14:TP=-2.2:LRA=9', '-ar', str(SR),
                str(ROOT / 'mix.wav')], check=True)
# a music-only stem helps the editor
m = music / max(1.0, np.abs(music).max() / 0.9)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', str(ROOT / 'sfx_stem.wav')],
               input=m.astype(np.float32).tobytes(), check=True)
print('mix.wav + sfx_stem.wav written')
