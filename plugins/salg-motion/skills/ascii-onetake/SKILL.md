---
name: ascii-onetake
description: "Produz reels e trechos de VSL no estilo 'ASCII onetake' da Salg — um plano contínuo em que milhares de caracteres ASCII (os agentes) se transformam no símbolo de cada frase da narração, com fundo preto quente, cor só com significado, legenda palavra por palavra, câmera operada, motion blur real e trilha sintetizada. Use quando pedirem um reel/VSL/vídeo de motion a partir de um áudio narrado, 'fazer o motion desse áudio', 'criar o reel', 'novo reel', 'beat sheet', 'formas ASCII', ajustar/re-renderizar um reel existente, ou quando citarem o motor, o GUIA-DE-ESTILO, o estilo realista, o Hook C/D ou o reel Confeiteira."
---

# ASCII onetake (Salg)

Um único plano contínuo em que **milhares de caracteres ASCII** se reorganizam a cada frase da narração para formar o **símbolo do que está sendo dito**. Nada corta; tudo se transforma. O fundo é `#050506`, com cor apenas onde ela tem significado.

Esta skill tem tudo dentro dela:
- `motor/`: o motor (`comp.html`, `comp_realista.js` padrão, `comp_motion.js` traço, `comp_narrador.js`), `novo_projeto.py`, `cortar.py`, `transcribe.py`, `render.py`, `sfx.py`, `matte.py`, `fonts/`.
- `references/GUIA-DE-ESTILO.md`: o guia do estilo (§14 = estilo realista).
- `references/DOC-PRODUCAO-VIDEOS.md`: a produção completa (cada parâmetro, som, render, QA, problemas conhecidos).
- `exemplos/confeiteira/`: o reel Confeiteira v4 (postado): `comp.js` completo, `beat-sheet.md`, transcrição, eventos de som e quadros-chave.

Nos documentos, `_motor/` = a pasta `motor/` desta skill. `novo_projeto.py` = `motor/novo_projeto.py`.

## Regras de ouro (não negociáveis)
1. **Nunca substituir: transformar.** Toda troca de beat carrega um elemento da cena anterior para a próxima. Escreva a coluna "o que carrega" do beat sheet antes de desenhar.
2. **Nunca no metrônomo.** Durações variadas; alterne estalo (`expoOut` 0,5–0,8 s), contemplação (`inOut` 1–1,2 s) e respiro.
3. **Pelo menos um respiro** quase vazio e quase silencioso (`drop` na trilha).
4. **Elemento pequeno, fundo grande.**
5. **Cor só com significado:** branco padrão · ouro dinheiro · verde prosperidade (misturado ao ouro) · roxo IA · azul social/alcance · laranja ação/construção · cinza anonimato · vermelho perda · rosa/creme/chocolate **só comida**. O final é o único estouro ouro + verde.
6. **A ideia mora no desenho.** O símbolo conta a frase sozinho.
7. **Tudo é função do tempo** (determinístico: `hash()`, nunca `Math.random()` no render).
8. **Os agentes nunca saem do filme** (dissolvem no lugar, no máximo 90 px).
9. **Câmera operada**, nunca estática.
10. **Números só reais** (ou claramente ilustrativos).

## Protocolo (nesta ordem)
1. **Pasta-mãe.** Trabalhe numa pasta-mãe de reels com a caixa de entrada `gravacao/`. Se não existir, o `novo_projeto.py` cria.
2. **Criar o projeto** (da pasta-mãe):
   ```
   python "<esta skill>/motor/novo_projeto.py" "reels DD MM/reel-nome" [gravacao/conteudo.wav gravacao/final.wav]
   ```
   Isso move as gravações da caixa de entrada para `reel-nome/gravacao/`, corta os silêncios (0,12 s nas vírgulas, 0,20 s no fim de frase, fade de 15 ms), iguala os volumes, cria `projeto/ gravacao/ videos/ referencias/ LEIA-ME.md`, gera `vo.wav` (0,3 s de respiro + 1,2 s de cauda), transcreve (faster-whisper large-v3, CPU) e ajusta a duração. Opções: `--modelo realista|traco|narrador` (padrão realista), `--sem-corte`, `--raiz`.
3. **Revisar a transcrição** (`projeto/roteiro.txt`): nomes próprios e tempos de palavras arrastadas (confira no envelope de volume; ver DOC §10). Regenere `words.js` depois de editar `words.json`.
4. **Conceito + beat sheet** (`reel-nome/beat-sheet.md`): tempo · frase · forma/símbolo · cor · o que carrega. Use o agente `diretor-motion` se quiser um segundo olhar.
5. **Escrever o filme** em `projeto/comp.js` (parta do modelo realista; reaproveite a biblioteca do exemplo da Confeiteira): formas em `buildShapes` (objetos pintados com luz e sombra via `art()`/`imgPts`, mapa de cores `{ ids: true }` + `F(TINTA, estilo)`), `KEYS`, `CAMK`, `CHUNKS` (legenda com marcas `* ^ ~ ! + & =`), `SECTIONS`, `glowColour`, overlays e `events()`.
6. **Checar:** sintaxe (`node -e "new Function(require('fs').readFileSync('comp.js','utf8'))"`), agentes por forma (≤ N), sem `subtitle mismatch` no terminal, stills (`python render.py stills 1.0,4.5,…` → `stills/sheet.png`), olhando os stills depois que cada morph termina.
7. **Som:** `python render.py events` e `python sfx.py`.
8. **Render:** `python render.py video --out "../videos/<Reel> - ASCII onetake (v1).mp4"`; cópia para postar com `-crf 19`; meça no MP4: −14 LUFS, pico ≤ −1,5 dB.
9. **Mostrar ao usuário** a prancha de stills e o vídeo; ajustes pontuais com `--start/--end --force` e remontagem sem `--force`.
10. **Fechar** (quando postado): `/fechar-reel`.

## Regras do estilo realista (o padrão)
- Pinte cada objeto **como ilustração** (degradês, luz, sombra, reflexo, esferas com brilho) e deixe o `imgPts` ler em grade de 5 px.
- **Opacidade alta** (`0,38 + 0,62·li`); o tom vem da densidade do caractere (`. · : - = + * # % @`). Opacidade baixa = filme cinza.
- **Contraste vem do desenho:** lateral até ~0,7, detalhe 1,0. **Tudo opaco.** Áreas escuras grandes viram vazio (é o que mantém o preto).
- **Símbolo-chave sempre claro** (desenhe em branco; mude a tinta pela animação).
- Formas altas: `{ h: 1500 }` (o canvas padrão vai de −550 a 550 em y).
- Formas que acendem durante o morph: opacidade mínima 0,02.
- Rótulos de interface só aparecem quando acendem.
- N = 17.000; o `makeShape` afina sozinho se passar.

## Quando ler o quê
- Vai escrever ou ajustar formas, câmera, legenda ou som → `references/DOC-PRODUCAO-VIDEOS.md` (§12–§22).
- Dúvida de cor, ritmo, narrador ou histórico de decisões → `references/GUIA-DE-ESTILO.md`.
- Quer um exemplo completo e aprovado → `exemplos/confeiteira/comp.js` + `beat-sheet.md` + os PNGs.
- Algo deu errado → DOC §25 (problemas conhecidos e soluções).

## Requisitos da máquina
Python 3.11+ com `faster-whisper`, `playwright` (+ `python -m playwright install chromium`), `numpy`, `scipy` (e `rembg` + `pillow` para narrador); ffmpeg/ffprobe no PATH; Node (opcional, só para checar sintaxe). No Git Bash, use `PYTHONIOENCODING=utf-8`. Caminhos com espaço sempre entre aspas.

## Skills relacionadas (no mesmo plugin)
- `onetake`: o método de origem (composição HTML como função do tempo, carregar, câmera operada, obturador real, som numa sala só).
- `hairline-create`: o estilo isométrico de traço fino (blocos, camadas, colunas).
- `landing-campo-ascii`: o mesmo estilo aplicado a uma landing page.
