---
description: "Gera stills, refaz o som ou renderiza (inteiro ou só um trecho) um reel ASCII onetake existente"
argument-hint: "<pasta do reel> [stills 1.0,4.5,8.2 | video vN | trecho INICIO FIM vN | som]"
---

Renderize o reel com estes argumentos: `$ARGUMENTS`

Use a skill `ascii-onetake` deste plugin (referência: `references/DOC-ESTILO.md` §15 e §16). Todos os comandos rodam dentro de `<reel>/projeto/` (numa VSL, `partes/<parte>/projeto/`), com caminhos entre aspas. O `render.py` é o mesmo nos dois motores. Se ele parar de avançar, mate o processo e rode de novo sem `--force`: só os quadros que faltam são refeitos.

- **stills t1,t2,…** → `python render.py stills t1,t2,…`; leia `stills/sheet.png` e mostre ao usuário. Escolha instantes **depois** que cada morph termina.
- **som** → `python render.py events` e `python sfx.py`; depois remonte o vídeo sem re-renderizar a imagem (`python render.py video --out …`, sem `--force`).
- **video vN** → `python render.py video --out "../videos/<Reel> - ASCII onetake (vN).mp4"`, depois a cópia para postar:
  `ffmpeg -i master.mp4 -c:v libx264 -preset slow -crf 19 -pix_fmt yuv420p -c:a copy -movflags +faststart final.mp4`.
- **trecho INICIO FIM vN** → `python render.py video --start INICIO --end FIM --force --out _trecho.mp4` (inclua o morph de entrada e o de saída da forma alterada), apague `_trecho.mp4` e remonte o vídeo inteiro como vN sem `--force`.

Sempre no final: meça o MP4 (`ffmpeg -i final.mp4 -af ebur128=peak=true -f null -` → −14 LUFS, pico ≤ −1,5 dB), confira 3–6 quadros tirados do MP4 final e informe o caminho do arquivo.
