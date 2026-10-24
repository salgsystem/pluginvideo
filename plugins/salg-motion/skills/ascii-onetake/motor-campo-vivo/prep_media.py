"""Prepara a mídia nova (b-rolls e imagens) para os dois projetos, em partes/media_comum/.
  python prep_media.py
Vídeo → quadros JPG a 30 fps (no máximo 1080 de largura), em media_comum/<nome>/0001.jpg…
Imagem → media_comum/img/<nome> (no máximo 1600 px no lado maior).
No comp: SEQS[nome] = { dir: COMUM + nome, n, ext: 'jpg', fps: 30 } e IMGS via MEDIA_IMG.push(COMUMI + arquivo).
"""
import json, subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'media_comum'
BR = Path(__file__).resolve().parent.parent / 'imagens' / 'Broll vsl'
IM = ROOT.parent / 'imagens'

VIDS = {'scrollinsta': BR / 'Scroll insta.mp4', 'saindo43': BR / 'Saindo do seu bolso ou não 43.mp4', 'gatinho': BR / '2 47 quem armou essa armadilha.mp4',
        'b339': BR / 'broll 3 39.mp4', 'b406': BR / 'b roll 4 06.mp4', 'sistema': BR / 'SISTEMA broll-1.mp4', 'site': BR / 'SITE broll-1.mp4',
        'aplicativo2': BR / 'aplicativo 2.mp4', 'celularvitor': BR / 'celular vitor.mp4', 'salgclub': BR / 'motion salg club.mp4'}
IMGS = {'app57.jpg': BR / 'construido uma vez 57.jpg', 'app_broll.jpg': BR / 'aplicativo broll -1.webp', 'ats_logo.png': IM / 'Logo ATS.png',
        'cap_spark.jpg': IM / 'SPARK CAPA.jpg.jpeg', 'cap_forge.jpg': IM / 'FORGE CAPA.jpg.jpeg', 'cap_apex.jpg': IM / 'APEX CAPA.jpg.jpeg',
        'cap_claude.jpg': IM / 'CLAUDE CAPA.png', 'cap_hermes.jpg': IM / 'HERMES CAPA.png', 'salg_material.jpg': IM / 'salg club material.png',
        'whats.jpg': IM / 'whatsapp 8 02.jpg', 'whats_logo.png': IM / 'whatsapp logo.jpg',
        'logo_preto.png': IM / 'Logo Fundo preto.png', 'a7d.jpg': IM / 'a7d.png', 'live.jpg': IM / 'live.png', 'whatsapp2.jpg': IM / 'whatsapp.png',
        **{f'aula{k}.jpg': IM / f'aula nova 0{k}.jpeg' for k in (1, 2, 3)},
        **{f'yt{k}.jpg': IM / (f'capas yt {k}.png' if k > 1 else 'capas yt.png') for k in range(1, 17)},
        **{f'sem{k}.jpg': IM / n for k, n in enumerate(['semana1.png', 'semana 2 .png', 'semana 3 .png', 'semana 4.png', 'semana 5.png', 'semana 6.png', 'semana 7.png', 'semana 8.png'], 1)}}


def run(*a): subprocess.run(['ffmpeg', '-v', 'error', '-y', *a], check=True)


info = {}
for name, src in VIDS.items():
    d = OUT / name; d.mkdir(parents=True, exist_ok=True)
    if not any(d.glob('*.jpg')):
        run('-i', str(src), '-vf', "fps=30,scale='min(1280,iw)':-2:flags=lanczos" if name == 'salgclub' else "fps=30,scale='min(1080,iw)':-2:flags=lanczos", '-q:v', '3', str(d / '%04d.jpg'))
    info[name] = len(list(d.glob('*.jpg')))
(OUT / 'img').mkdir(parents=True, exist_ok=True)
for name, src in IMGS.items():
    dst = OUT / 'img' / name
    if not dst.exists():
        run('-i', str(src), '-vf', "scale='if(gt(iw,ih),min(1600,iw),-2)':'if(gt(iw,ih),-2,min(1600,ih))':flags=lanczos", *(['-q:v', '2'] if name.endswith('.jpg') else []), str(dst))
(OUT / 'info.json').write_text(json.dumps(info, indent=1))
print(info)
