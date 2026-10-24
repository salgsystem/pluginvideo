"""Quadros do Vitor para as janelas VITOR do filme: só a imagem (o som continua o do mix do filme).
  python prep_vitor.py vitor_takes.json --videos ../inputs/videos --dur 246.53
vitor_takes.json (gerado pelo alinhar_takes.py, com a "janela" preenchida à mão = a mesma janela do VITOR no comp):
  [{"take": "take 01.mp4", "off": 31.67, "janela": [32.25, 34.02]}, ...]     (janela final: [a, null] = até o fim)
Sai assets/vitor/NNNNN.jpg (NNNNN = quadro do filme, 30 fps, 1080×1920), só nas janelas (+0,25 s de cada lado para o fade).
Takes de iPhone: vídeo VFR, girado, às vezes HDR — o fps=60 fixo e o tone-map abaixo cuidam disso.
"""
import argparse, json, shutil, subprocess, tempfile
from pathlib import Path

ap = argparse.ArgumentParser()
ap.add_argument('json'); ap.add_argument('--videos', required=True); ap.add_argument('--dur', type=float, required=True)
ap.add_argument('--out', default='assets/vitor'); ap.add_argument('--fps', type=int, default=30)
a = ap.parse_args()
FPS, DUR, PAD = a.fps, a.dur, 0.5
OUT = Path(a.out)
HDR2SDR = 'zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p,'


def probe(p, entries):
    return subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', entries, '-of', 'csv=p=0', str(p)],
                          capture_output=True, text=True, check=True).stdout.strip()


if OUT.exists(): shutil.rmtree(OUT)
OUT.mkdir(parents=True)
for e in json.loads(Path(a.json).read_text(encoding='utf-8')):
    src = Path(a.videos) / e['take']; off = e['off']; ja, jb = e['janela']; jb = DUR if jb is None else jb
    td = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(src)], capture_output=True, text=True, check=True).stdout)
    hdr = probe(src, 'stream=color_transfer') in ('arib-std-b67', 'smpte2084')
    f0 = max(0, int((ja - PAD) * FPS)); f1 = min(int(DUR * FPS) - 1, int((jb + PAD) * FPS) + 1)
    s0 = max(0.0, f0 / FPS - off - 0.05)
    with tempfile.TemporaryDirectory() as tmp:  # 60 fps constantes (o take é VFR), depois o quadro mais próximo de cada quadro do filme
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{s0:.3f}', '-i', str(src), '-t', f'{(f1 - f0) / FPS + 0.2:.3f}',
                        '-vf', (HDR2SDR if hdr else '') + 'fps=60,scale=1080:1920:force_original_aspect_ratio=increase:flags=lanczos,crop=1080:1920',
                        '-q:v', '2', '-start_number', '0', f'{tmp}/%04d.jpg'], check=True)
        got = sorted(Path(tmp).glob('*.jpg')); n = 0
        for f in range(f0, f1 + 1):
            tt = f / FPS - off
            if tt < 0 or tt > td or not got: continue
            shutil.copy(got[min(len(got) - 1, max(0, round((tt - s0) * 60)))], OUT / f'{f:05d}.jpg'); n += 1
    print(f"{e['take']}: janela {ja}–{jb}  quadros {f0}–{f1} ({n}){'  [HDR→SDR]' if hdr else ''}")
print(len(list(OUT.glob('*.jpg'))), 'quadros ->', OUT)
