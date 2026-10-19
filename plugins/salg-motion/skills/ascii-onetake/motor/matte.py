import sys, time
from pathlib import Path
from PIL import Image
from rembg import new_session, remove
model = sys.argv[1] if len(sys.argv) > 1 else 'u2net_human_seg'
only = sys.argv[2:] 
s = new_session(model)
src = sorted(Path('bg').glob('*.jpg'))
if only: src = [p for p in src if p.stem in only]
t0 = time.time()
for k, p in enumerate(src):
    im = Image.open(p).convert('RGB')
    out = remove(im, session=s, post_process_mask=True)
    out.save(Path('fg') / (p.stem + '.png'))
    if k % 20 == 0: print(k, f'{time.time()-t0:.0f}s', flush=True)
print('done', len(src), f'{time.time()-t0:.0f}s')
