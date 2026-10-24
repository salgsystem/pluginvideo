"""Junta as partes da VSL num filme só, com passagem fluida (nunca colagem seca).
  python juntar.py "../video/VSL - Completa (v4).mp4"

Em cada emenda, as duas partes se sobrepõem por OVER segundos:
  imagem: a parte que sai se dissolve enquanto a que entra se forma por cima (o ASCII nasce sobre o Vitor);
  som:    a trilha que sai desce durante a sobreposição; a que entra sobe em 0,2 s (a primeira palavra não sai baixa).
OVER é escolhido para a pausa entre a última fala de uma parte e a primeira da outra ficar natural (~0,6 s).
Os vídeos de cada parte ficam no projeto dela (parte.mp4), gerados pelo render.py.
"""
import subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
PARTS = [ROOT / 'hook-ao-bloco4/projeto/parte.mp4', ROOT / 'parte2/projeto/parte.mp4',
         ROOT.parent / 'Gerado pelo Emmanuel/Parte 3 - ASCII onetake (v12).mp4']
# sobreposição em cada emenda (s):
#   Hook → Parte 2: fim da fala do Hook 245,08 · início da fala da Parte 2 0,3 (o b-roll 4:06 já corre sob o Vitor, sincronizado)
#   Parte 2 → Parte 3: fim da fala da Parte 2 269,16 de 270,62 · início da fala da Parte 3 0,29 → pausa ~0,6 s
OVER = [1.15, 1.15]


def dur(p):
    return float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(p)],
                                capture_output=True, text=True, check=True).stdout)


out = Path(sys.argv[1]).resolve()
ins = sum([['-i', str(p)] for p in PARTS], [])
v, a, acc, fl = '[0:v]', '[0:a]', dur(PARTS[0]), []
for k, p in enumerate(PARTS[1:], 1):
    o = OVER[k - 1]; off = acc - o
    fl.append(f'{v}[{k}:v]xfade=transition=fade:duration={o}:offset={off:.3f}[v{k}]')
    fl.append(f'{a}afade=t=out:st={off:.3f}:d={o}[ao{k}];[{k}:a]afade=t=in:d=0.2,adelay={int(off * 1000)}:all=1[ai{k}];'
              f'[ao{k}][ai{k}]amix=inputs=2:normalize=0:duration=longest[a{k}]')
    v, a, acc = f'[v{k}]', f'[a{k}]', off + dur(p)
subprocess.run(['ffmpeg', '-v', 'error', '-y', *ins, '-filter_complex', ';'.join(fl), '-map', v, '-map', a,
                '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p', '-r', '30',
                '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', str(out)], check=True)
print(f'-> {out}  ({acc:.2f} s)')
