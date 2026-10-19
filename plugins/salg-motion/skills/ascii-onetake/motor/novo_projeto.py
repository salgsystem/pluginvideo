"""Cria a pasta de um novo filme ASCII onetake a partir de uma gravação.

  python novo_projeto.py "<pasta do reel>" ["<áudio ou vídeo>" ...] [--respiro 0.3] [--cauda 1.2] [--sem-corte] [--modelo realista|traco|narrador]
  ex.: python novo_projeto.py "reels 19 10/reel-dentista"

No plugin: o motor é a pasta deste script; a "pasta-mãe" (onde ficam gravacao/ e os reels) é a pasta atual,
ou a indicada em --raiz. A caixa de entrada gravacao/ é criada se não existir.

Sem caminho, usa a gravação mais recente da caixa de entrada gravacao/ (áudio ou vídeo; do vídeo só sai o som).
As gravações que estavam na caixa de entrada são MOVIDAS para <reel>/gravacao/, e a caixa fica vazia para o próximo.

Estrutura criada:
  <reel>/LEIA-ME.md   <reel>/projeto/ (motor, voz, legenda, trilha, render)   <reel>/gravacao/ (originais + cortada)
  <reel>/videos/ (entregas)   <reel>/referencias/ (quadros-chave e referências)
Vários arquivos (ex.: conteúdo + finalização) são emendados na ordem, com o volume igualado ao do primeiro.
Por padrão os silêncios são encurtados (cortar.py: 0,12 s nas vírgulas, 0,20 s no fim de frase).

O que faz:
  0. corta silêncios, iguala volumes e emenda as gravações (cortar.py);
  1. cria <reel>/projeto/ com o motor de _motor/ (comp.html, comp.js modelo, render.py, sfx.py, fontes, transcribe.py);
  2. converte o áudio para vo.wav (48 kHz estéreo), com respiro no início e cauda no fim;
  3. transcreve palavra por palavra (faster-whisper large-v3, CPU) → words.json, words.js e roteiro.txt;
  4. ajusta DUR (duração) em comp.js, render.py e sfx.py.
Modelos: realista (padrão: objetos com luz e sombra lidos em grade, 17 mil agentes, cores de confeitaria — o reel Confeiteira),
traco (contornos, 6 mil agentes — Hook D) e narrador (Vitor em cena, layout A; cria narr/ com matte.py).
Depois disso: escrever os beats em comp.js (ver GUIA-DE-ESTILO.md, seção 9).
"""
import argparse, json, re, shutil, subprocess, sys
from pathlib import Path

MOTOR = Path(__file__).resolve().parent
MIDIA = {'.wav', '.mp3', '.m4a', '.aac', '.flac', '.ogg', '.opus', '.mpeg', '.mp4', '.mov', '.mkv', '.webm'}

ap = argparse.ArgumentParser()
ap.add_argument('pasta')
ap.add_argument('audio', nargs='*', help='áudio(s) ou vídeo(s); sem nada, usa o mais recente de gravacao/')
ap.add_argument('--respiro', type=float, default=0.3, help='segundos de silêncio antes da voz')
ap.add_argument('--cauda', type=float, default=1.2, help='segundos de imagem depois da última palavra')
ap.add_argument('--modelo', choices=['realista', 'traco', 'narrador'], default='realista')
ap.add_argument('--narrador', action='store_true', help='atalho para --modelo narrador')
ap.add_argument('--sem-corte', action='store_true', help='não encurta os silêncios')
ap.add_argument('--raiz', default='.', help='pasta-mãe dos reels (padrão: a pasta atual)')
a = ap.parse_args()
ROOT = Path(a.raiz).resolve()
GRAVACAO = ROOT / 'gravacao'
GRAVACAO.mkdir(parents=True, exist_ok=True)

if a.narrador: a.modelo = 'narrador'
if a.audio:
    fontes = [Path(x) for x in a.audio]
else:
    cands = [p for p in GRAVACAO.glob('*') if p.suffix.lower() in MIDIA]
    if not cands:
        sys.exit(f'Nenhuma gravação em {GRAVACAO} — salve o áudio lá ou passe o caminho.')
    fontes = [max(cands, key=lambda p: p.stat().st_mtime)]
for f in fontes:
    if not f.exists(): sys.exit(f'Não achei {f}')
print('Gravação:', ' + '.join(str(f) for f in fontes))

reel = ROOT / a.pasta
if reel.exists() and any(reel.iterdir()):
    sys.exit(f'A pasta {reel} já existe e não está vazia — escolha outro nome.')
dst = reel / 'projeto'
for sub in ['projeto', 'gravacao', 'videos', 'referencias']:
    (reel / sub).mkdir(parents=True, exist_ok=True)

# as gravações vão para dentro do reel (as da caixa de entrada são movidas; as de fora, copiadas)
movidas = []
for f in fontes:
    alvo = reel / 'gravacao' / f.name
    if f.resolve().parent == GRAVACAO.resolve(): shutil.move(str(f), alvo)
    else: shutil.copy2(f, alvo)
    movidas.append(alvo)
fontes = movidas

# 0 · corte de silêncios e emenda (o volume de cada arquivo é igualado ao do primeiro)
def lufs(p):
    err = subprocess.run(['ffmpeg', '-hide_banner', '-i', str(p), '-vn', '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr
    return float(re.findall(r'I:\s+(-?[\d.]+) LUFS', err)[-1])
if a.sem_corte and len(fontes) == 1:
    audio = fontes[0]
else:
    ref = lufs(fontes[0])
    args = [str(fontes[0])] + [f'{f}:{ref - lufs(f):.1f}' for f in fontes[1:]]
    audio = reel / 'gravacao' / 'gravacao_cortada.wav'
    cmd = [sys.executable, str(MOTOR / 'cortar.py'), str(audio), *args]
    if a.sem_corte: cmd.append('--sem-corte')
    subprocess.run(cmd, check=True)

# 1 · motor
for f in ['comp.html', 'render.py', 'sfx.py', 'transcribe.py']:
    shutil.copy2(MOTOR / f, dst / f)
shutil.copy2(MOTOR / {'realista': 'comp_realista.js', 'traco': 'comp_motion.js', 'narrador': 'comp_narrador.js'}[a.modelo], dst / 'comp.js')
shutil.copy2(MOTOR / 'cortar.py', dst / 'cortar.py')
shutil.copytree(MOTOR / 'fonts', dst / 'fonts')
if a.modelo == 'narrador':
    for sub in ['bg', 'fg']:
        (dst / 'narr' / sub).mkdir(parents=True, exist_ok=True)
    shutil.copy2(MOTOR / 'matte.py', dst / 'narr' / 'matte.py')

# 2 · áudio
ms = int(a.respiro * 1000)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(audio), '-vn', '-af', f'adelay={ms}|{ms},apad=pad_dur={a.cauda}',
                '-ar', '48000', '-ac', '2', str(dst / 'vo.wav')], check=True)
dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(dst / 'vo.wav')],
                           capture_output=True, text=True, check=True).stdout)
dur = round(dur, 2)

# 3 · transcrição (os tempos já incluem o respiro, porque transcrevemos o vo.wav)
print('Transcrevendo (leva ~1 min por 30 s de áudio)…')
subprocess.run([sys.executable, 'transcribe.py', 'vo.wav', 'words.json'], cwd=dst, check=True)
words = json.loads((dst / 'words.json').read_text(encoding='utf-8'))
(dst / 'words.js').write_text('window.WORDS=' + json.dumps(words, ensure_ascii=False) + ';\n', encoding='utf-8')
linhas = [f'Duração total: {dur:.2f} s  ·  {len(words)} palavras\n']
frase = []
for w in words:
    frase.append(f"{w['w']}@{w['s']:.2f}")
    if re.search(r'[.?!,:;]$', w['w']):
        linhas.append(' '.join(frase)); frase = []
if frase: linhas.append(' '.join(frase))
(dst / 'roteiro.txt').write_text('\n'.join(linhas) + '\n', encoding='utf-8')

# 4 · duração
def troca(arq, padrao, novo):
    p = dst / arq; s = p.read_text(encoding='utf-8'); s2, n = re.subn(padrao, novo, s, count=1)
    if not n: print(f'  aviso: não achei DUR em {arq}')
    p.write_text(s2, encoding='utf-8')
troca('comp.js', r'DUR = [\d.]+', f'DUR = {dur}')
troca('render.py', r'FPS, DUR = 30, [\d.]+', f'FPS, DUR = 30, {dur}')
troca('sfx.py', r'SR, DUR = 48000, [\d.]+', f'SR, DUR = 48000, {dur}')

(reel / 'LEIA-ME.md').write_text(f"""# {reel.name}

- `projeto/`: o filme (comp.js = formas, beats, câmera, legenda; vo.wav = voz; render.py; sfx.py). Abra `projeto/comp.html` no Chrome para ver.
- `gravacao/`: gravações originais e a versão com silêncios cortados.
- `videos/`: entregas (render: `python render.py video --out ../videos/{reel.name}_v1.mp4`).
- `referencias/`: referências e quadros-chave.
- Modelo usado: {a.modelo}. Duração: {dur:.2f} s.
""", encoding='utf-8')
print(f'\nPronto: {reel}')
print((dst / 'roteiro.txt').read_text(encoding='utf-8'))
print('Próximo passo: corrigir nomes próprios em words.js e escrever os beats em comp.js (GUIA-DE-ESTILO.md §9).')
