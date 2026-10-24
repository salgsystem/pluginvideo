---
name: ascii-onetake
description: "Produz VSL, reels e trechos de vídeo no estilo visual da Salg/ATS. O padrão atual é o 'Campo Vivo' (VSL ATS v4): milhares de caracteres ASCII limpos numa grade formam o símbolo de cada frase, com fusão no lugar, câmera parada, boneco articulado sempre em ação, mídia real (prints do SALG, logos, b-rolls) e o narrador (Vitor) em cena com corte em L. Use quando pedirem uma VSL, reel, vídeo ou motion a partir de um áudio narrado; 'fazer o motion desse áudio', 'nova parte da VSL', 'beat sheet', 'juntar as partes'; ajustes por minutagem num filme existente; ou quando citarem o DOC-ESTILO, o Campo Vivo, o boneco/manequim, o pacote do Emmanuel, os takes do Vitor, o estilo realista ou o reel Confeiteira."
---

# ASCII onetake (Salg) — padrão atual: Campo Vivo

**Campo Vivo** é um filme de um plano só. Milhares de caracteres ASCII, **limpos e alinhados numa grade de 4 px**, formam o símbolo de cada frase da narração. O campo convive com **mídia real** (prints do produto, logos, b-rolls, fotos com granulado) e com um **boneco articulado** que representa quem assiste e está sempre fazendo alguma coisa. Fundo `#050506`, cor só com significado e **sem amarelo**.

O documento único é **`references/DOC-ESTILO.md`**: estilo, produção de vídeo, carrossel e landing page. Ele substituiu o DOC-PRODUCAO-VIDEOS, o DOC-LANDING-PAGE-ESTILO e o DOC-CARROSSEL-ESTILO. Se o documento e o código do exemplo discordarem, vale o código, e o documento é corrigido.

## O que tem nesta skill
- `references/DOC-ESTILO.md`: **leia antes de qualquer coisa** (Parte A = estilo, B = vídeo, C = carrossel, D = web, §19 = histórico).
- `references/ESPEC-PARTE3-EMMANUEL.md`: as diferenças entre a Parte 3 do Emmanuel e as nossas partes, e o que fazer para unificar.
- `motor-campo-vivo/`: **o motor atual** (render, som, junção, mídia, narrador, `comum.js`). Veja o `LEIA-ME.md` dele.
- `exemplos/vsl-ats/`: a VSL ATS v4 (Hook ao bloco 4 e Parte 2): `comp.js`, transcrição, takes do Vitor, eventos de som e a prancha `vsl-v4-quadros-chave.jpg`.
- `motor/` + `exemplos/confeiteira/`: o **estilo realista** (reels de 19/10, Confeiteira v4). Continua funcionando para reels nesse visual; documentação em `references/antigos/`.
- `references/antigos/`: DOC-PRODUCAO-VIDEOS, GUIA-DE-ESTILO, DOC-CARROSSEL-ESTILO e NARRADOR-EM-CENA (histórico; o que vale é o DOC-ESTILO).

**Caminhos no DOC-ESTILO:**
- `partes/comum.js`, `partes/juntar.py` e `partes/prep_*.py` estão em `motor-campo-vivo/`.
- `partes/<parte>/projeto/` é um projeto; o modelo está em `exemplos/vsl-ats/`.
- `pacote-socio/ferramentas/alinhar_takes.py` está em `motor-campo-vivo/alinhar_takes.py`.

## As 12 regras (DOC §1)
1. **Nada corta, tudo se funde** (fusão `xf` no lugar). Nunca buraco preto entre cenas, nem entre a animação e o Vitor.
2. **Textura limpa:** grade de 4 px, 6 tons, rampa `' .:=+#@'` com piso em `=`, opacidade `0,66 + 0,34·li`. Se parece chuvisco ou nuvem, está errado.
3. **Cada frase tem uma animação visível do seu conceito.** O símbolo conta a ideia sozinho.
4. **Nada parado por mais de ~2 s** (respiro, mecânica, boneco em pose, entradas escalonadas, luz).
5. **O boneco é quem assiste:** sempre em ação, olha para onde vai, anda com o pé plantado (`walkAt`); o capacete de arquiteto fica preso ao osso da cabeça.
6. **Produto real é real:** prints do SALG, logos de verdade, foto do app, dentro de mockups (notebook, celular, TV) centrados e grandes.
7. **Dinheiro é cédula (`C6.bill`) e pagamento é cartão (`C6.pay`).** Nunca partículas de "energia".
8. **Cor só com significado, sem amarelo:**
   - dono azul `#4D8DFF`, valor verde `#3DDC84`, construção laranja Claude `#E07A55` ou marrom `#9C6B3F`;
   - ouro só em tesouro (coroa, chave, baú);
   - destaque "dinheiro" da legenda (`!`) em verde.
9. **Texto inteiro e legível.** Lettering sobre vídeo sem tarja (`C6.kinetic`), sem cobrir o principal; placa (`C6.plate`) só sobre ASCII cheio.
10. **Câmera parada; o movimento vem do ASCII** (avanço, parallax e perspectiva dentro da forma).
11. **Elemento pequeno, fundo grande.**
12. **Números só reais.**

## Protocolo (filme novo ou parte nova)
1. **Áudio:** `cortar.py` + `transcribe.py`; revise `words.json` (nomes, palavras arrastadas) e regenere `words.js` (DOC §11.1).
2. **Beat sheet:** tempo · frase · conceito animado · mídia real · **pose do boneco** · cor · o que continua para a próxima cena (§11.2). Use o agente `diretor-motion`.
3. **Narrador:** `alinhar_takes.py` → `vitor_takes.json` → `prep_vitor.py` (§11.3).
   - Fade de entrada de 0,35 s e de saída de 0,6 s.
   - **Corte em L:** a janela termina 0,3 s antes de a fala acabar.
   - Ele é desenhado por cima dos rótulos e do HUD.
4. **Mídia:** `prep_media.py` (b-roll em quadros, imagens em ≤ 1600 px). **Vídeo HDR do iPhone: converta para SDR antes** (§8.4).
5. **Filme:** parta de `exemplos/vsl-ats/parte2/comp.js`.
   - Cenas por nome.
   - Keys começando 0,1–0,3 s antes da palavra-chave.
   - Legenda com as marcas `* ^ ~ ! + & = W` (§4.4).
   - A última legenda sai 0,3 s após a fala.
6. **Checar:**
   - sintaxe (`node --check comp.js`);
   - orçamento (`peek.py`, N = 40000);
   - stills **depois** de cada fusão terminar (`render.py stills …`).

   Mostre a prancha ao usuário.
7. **Som:** `render.py events` + `sfx.py` (−14 LUFS, pico ≤ −1,5 dB no MP4).
8. **Render:** `render.py video --workers 6 --out parte.mp4` (só refaz o que falta).
9. **Junção:** `juntar.py`.
   - Sobreposição de ~1,15 s por emenda (pausa de ~0,6 s entre as falas).
   - Se a parte seguinte abre com b-roll, ele já roda por baixo do Vitor, **sincronizado quadro a quadro**.
   - Em `video/` fica só o filme atual.
10. **QA:** checklist do DOC §16.1 e os quadros das emendas no MP4 final. Use o agente `revisor-motion`.

## Ajuste pontual (o Igor manda minutagem)
1. Converta a minutagem do filme para o tempo da parte (na VSL ATS, Parte 2 = filme − 245,38 s).
2. Escreva a mudança numa seção nova no fim do `comp.js` que redefine a cena pelo nome.
3. Gere os stills.
4. Se alguma key mudou, refaça events + sfx.
5. Apague só os quadros do trecho em `frames/` (ou use `--start/--end --force`), remonte a parte e junte de novo.

## Quando ler o quê
- Regras de estilo, cores, boneco, mídia, Vitor → DOC §1–§9.
- Motor, pastas, pipeline, som, render, emenda → DOC §10–§15 + `motor-campo-vivo/LEIA-ME.md`.
- Algo deu errado → DOC §16.2 (problemas conhecidos).
- Carrossel → DOC §17 (skill `carrossel-campo-vivo`). Landing page → DOC §18 (skill `landing-campo-ascii`).
- Reel no estilo realista antigo → `references/antigos/DOC-PRODUCAO-VIDEOS.md` + `motor/` + `exemplos/confeiteira/`.

## Requisitos da máquina
- Python 3.11+ (testado em 3.14) com as versões de `motor-campo-vivo/requirements.txt`.
- `python -m playwright install chromium`.
- ffmpeg/ffprobe no PATH.
- Node, para o `node --check`.

No Git Bash, use `PYTHONIOENCODING=utf-8`. Caminhos com espaço sempre entre aspas. Rode Python sobre mídia de terceiros com `-I`.

## Skills relacionadas (no mesmo plugin)
- `carrossel-campo-vivo`: o filme congelado em slides 4:5.
- `landing-campo-ascii`: o estilo numa landing page.
- `onetake`: o método de origem (composição como função do tempo, render com obturador real).
- `hairline-create`: o estilo isométrico de traço fino.
