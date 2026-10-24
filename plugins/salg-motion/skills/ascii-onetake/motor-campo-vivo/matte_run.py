import sys, time
from pathlib import Path
from PIL import Image
from rembg import new_session, remove
s = new_session('birefnet-portrait')
for name in sys.argv[1:]:
    src = sorted(Path(name + '_src').glob('*.jpg')); out = Path(name + '_fg'); out.mkdir(exist_ok=True)
    t0 = time.time()
    for k, p in enumerate(src):
        o = out / (p.stem + '.png')
        if o.exists(): continue
        remove(Image.open(p).convert('RGB'), session=s, post_process_mask=True).save(o)
        if k % 10 == 0: print(name, k, len(src), f'{time.time()-t0:.0f}s', flush=True)
    print('done', name, flush=True)
