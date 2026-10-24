---
description: "Junta as partes de uma VSL num filme só, com passagem fluida entre elas, confere as emendas e deixa em video/ só a versão nova"
argument-hint: "<versão, ex.: v5>"
---

Junte a VSL com estes argumentos: `$ARGUMENTS`

Use a skill `ascii-onetake` deste plugin (`references/DOC-ESTILO.md` §15; script `motor-campo-vivo/juntar.py`, que no projeto fica em `partes/juntar.py`).

1. Confira que o `parte.mp4` de cada parte está atualizado (mais novo que o `comp.js` e o `mix.wav` dela). Se não estiver, renderize antes (`python render.py video --out parte.mp4`).
2. Confira em `juntar.py`:
   - `PARTS`: a ordem das partes, incluindo partes prontas de terceiros (por exemplo, a Parte 3 do Emmanuel);
   - `OVER`: a sobreposição de cada emenda, ~1,15 s, escolhida para a pausa entre a última fala de uma parte e a primeira da seguinte ficar em ~0,6 s. Meça com `silencedetect` se uma parte for nova;
   - o volume das partes de terceiros (`loudnorm`, alvo −14 LUFS).
3. Rode da pasta `partes/`: `python juntar.py "../video/VSL - Completa (<versão>).mp4"`.
4. **Confira cada emenda** com quadros a 4 fps (de 1 s antes a 2 s depois) e olhe as pranchas:
   - nada de buraco preto;
   - nada de salto no b-roll (ele precisa estar sincronizado quadro a quadro dos dois lados);
   - nada de duas legendas sobrepostas (a última legenda de cada parte sai 0,3 s após a fala).
5. Meça o MP4 (−14 LUFS, pico ≤ −1,5 dB). Só então apague a versão anterior em `video/`; lá fica só o filme atual.
6. Informe o caminho, a duração e a minutagem de cada emenda.
