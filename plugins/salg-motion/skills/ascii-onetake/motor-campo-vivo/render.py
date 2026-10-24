"""Render comp.html frame by frame (real shutter motion blur inside the page) and mux with the mixed audio.

  python render.py stills 1.0,4.5,8 [--mb]       -> stills/ + stills/sheet.png
  python render.py video [--workers 6] [--start 0 --end 47.5] [--no-mb] [--out draft.mp4]
"""
import argparse, base64, json, math, os, subprocess, sys, time
from multiprocessing import Process, Queue
from pathlib import Path

ROOT = Path(__file__).resolve().parent
URL = (ROOT / 'comp.html').as_uri() + '?render'
FRAMES = 'frames'
FPS, DUR = 30, 270.62


def open_page(pw, url=None):
    b = pw.chromium.launch(args=['--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--allow-file-access-from-files'])
    p = b.new_page(viewport={'width': 1100, 'height': 1950})
    logs = []
    p.on('console', lambda m: logs.append(m.text) if m.type in ('warning', 'error') else None)
    p.on('pageerror', lambda e: logs.append('PAGEERROR ' + str(e)))
    p.goto(url or URL, timeout=240000)  # the page loads a lot of media; with several workers at once 30 s is not enough
    p.evaluate('window.__ready')
    for l in logs:
        print('[page]', l, file=sys.stderr)
    return b, p


def grab(p, i, mb):
    k = p.evaluate(f'window.__frame({i}, {str(mb).lower()})')
    data = p.evaluate('window.__png()')
    return k, base64.b64decode(data.split(',', 1)[1])


def stills(times, mb):
    from playwright.sync_api import sync_playwright
    out = ROOT / 'stills'; out.mkdir(exist_ok=True)
    paths = []
    with sync_playwright() as pw:
        b, p = open_page(pw)
        for t in times:
            i = round(t * FPS)
            k, png = grab(p, i, mb)
            path = out / f't{t:06.2f}.png'; path.write_bytes(png); paths.append(path)
            print(f't={t:.2f} K={k}')
        b.close()
    # contact sheet
    cols = min(len(paths), 5)
    rows = math.ceil(len(paths) / cols)
    inputs = sum([['-i', str(x)] for x in paths], [])
    filt = ''.join(f'[{k}:v]scale=360:-1,drawtext=text=\'{times[k]:.2f}\':x=12:y=12:fontsize=26:fontcolor=white[v{k}];' for k in range(len(paths)))
    lay = '|'.join(f'{(k % cols) * 360}_{(k // cols) * 640}' for k in range(len(paths)))
    filt += ''.join(f'[v{k}]' for k in range(len(paths))) + f'xstack=inputs={len(paths)}:layout={lay}:fill=black'
    if len(paths) == 1:
        filt = '[0:v]scale=360:-1'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', *inputs, '-filter_complex', filt, str(out / 'sheet.png')], check=True)
    print('sheet ->', out / 'sheet.png')


def worker(wid, frames, mb, outdir, q, url):
    from playwright.sync_api import sync_playwright
    with sync_playwright() as pw:
        b, p = open_page(pw, url)
        for i in frames:
            k, png = grab(p, i, mb)
            (outdir / f'{i:05d}.png').write_bytes(png)
            q.put((wid, i, k))
        b.close()
    q.put((wid, None, None))


def video(a):
    outdir = ROOT / FRAMES; outdir.mkdir(exist_ok=True)
    f0, f1 = round(a.start * FPS), round(a.end * FPS)
    todo = [i for i in range(f0, f1) if a.force or not (outdir / f'{i:05d}.png').exists()]
    print(f'{len(todo)} frames to render on {a.workers} workers')
    q, procs = Queue(), []
    for w in range(a.workers):
        pr = Process(target=worker, args=(w, todo[w::a.workers], not a.no_mb, outdir, q, URL)); pr.start(); procs.append(pr)
    done, alive, t0, ks = 0, a.workers, time.time(), []
    while alive:
        try:
            wid, i, k = q.get(timeout=300)
        except Exception:  # a worker died without reporting: stop instead of waiting forever
            if not any(pr.is_alive() for pr in procs): break
            continue
        if i is None:
            alive -= 1; continue
        done += 1; ks.append(k)
        if done % 60 == 0 or done == len(todo):
            el = time.time() - t0
            print(f'{done}/{len(todo)}  {el:.0f}s  eta {el / done * (len(todo) - done):.0f}s  meanK {sum(ks) / len(ks):.1f}', flush=True)
    for pr in procs: pr.join()
    audio = ROOT / 'mix.wav'
    cmd = ['ffmpeg', '-v', 'error', '-y', '-framerate', str(FPS), '-start_number', str(f0), '-i', str(outdir / '%05d.png')]
    if audio.exists():
        cmd += ['-ss', str(a.start), '-i', str(audio), '-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-b:a', '256k', '-shortest']
    cmd += ['-frames:v', str(f1 - f0), '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p',
            '-movflags', '+faststart', str(ROOT / a.out)]
    subprocess.run(cmd, check=True)
    print('->', ROOT / a.out)


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('mode', choices=['stills', 'video', 'events'])
    ap.add_argument('times', nargs='?')
    ap.add_argument('--mb', action='store_true')
    ap.add_argument('--no-mb', action='store_true')
    ap.add_argument('--workers', type=int, default=max(1, min(8, (os.cpu_count() or 4) - 2)))
    ap.add_argument('--start', type=float, default=0)
    ap.add_argument('--end', type=float, default=DUR)
    ap.add_argument('--force', action='store_true')
    ap.add_argument('--out', default='draft.mp4')
    ap.add_argument('--layout', default='')
    a = ap.parse_args()
    if a.layout:
        URL += '&layout=' + a.layout; FRAMES = 'frames_' + a.layout
    if a.mode == 'stills':
        stills([float(x) for x in a.times.split(',')], a.mb)
    elif a.mode == 'events':
        from playwright.sync_api import sync_playwright
        with sync_playwright() as pw:
            b, p = open_page(pw)
            ev = p.evaluate('window.__events()')
            (ROOT / 'events.json').write_text(json.dumps(ev, indent=1))
            b.close()
        print(len(ev), 'events -> events.json')
    else:
        video(a)
