# Documentação completa de produção dos vídeos: "ASCII onetake"

> Tudo o que é preciso para produzir um vídeo neste estilo do zero: o método, as skills, o framework, as ferramentas e versões, a estrutura de pastas, o motor (cada função e cada parâmetro), o estilo visual, o som, o render, a verificação, os problemas conhecidos e o histórico.
> Base: o código real em `_motor/comp_realista.js` (modelo padrão, vindo do reel Confeiteira v4), `_motor/render.py`, `_motor/sfx.py`, `_motor/cortar.py`, `_motor/transcribe.py` e `novo_projeto.py`.
> Documentos irmãos: `GUIA-DE-ESTILO.md` (o guia resumido do estilo) e `DOC-LANDING-PAGE-ESTILO.md` (o estilo na web).

---

## Sumário
1. O que é este estilo
2. Regras de ouro
3. Skills utilizadas
4. Framework e stack (e por que não HyperFrames/Remotion)
5. Ferramentas, versões e ambiente
6. Estrutura de pastas e arquivos
7. Pipeline completo, passo a passo
8. Captação do áudio
9. Edição do áudio (cortes, volumes, emendas)
10. Transcrição e correção
11. Planejamento: conceito e beat sheet
12. O motor `comp.js`, seção por seção
13. O estilo realista (como os objetos viram ASCII)
14. Paleta e psicologia das cores
15. Tipografia, HUD, legenda, callouts e contadores
16. Gramática de movimento (morph)
17. Câmera
18. Camadas de imagem (fundo, poeira, bloom, grão, vinheta)
19. Motion blur
20. Biblioteca de formas
21. Som (`sfx.py`)
22. Render (`render.py`) e entrega
23. Narrador em cena (Vitor)
24. Verificação (QA) e checklist
25. Problemas conhecidos e soluções
26. Tempos de referência
27. Histórico de decisões
28. Pedidos prontos para o Claude
29. Glossário

---

## 1. O que é este estilo

Um **único plano contínuo** (onetake) em que milhares de **caracteres ASCII** (os "agentes") se reorganizam a cada frase da narração para formar o **símbolo do que está sendo dito**. Nada corta; tudo se transforma. O fundo é preto quente (`#050506`), com cor apenas onde ela tem significado.

- **Formato:** vertical 9:16, **1080 × 1920, 30 fps** (draft e entrega). 4K/60 fica para depois da aprovação, se um dia for necessário.
- **Duração típica:** 30 a 75 s (Hook C 47,5 s; Hook D 38,2 s; Confeiteira 71,8 s).
- **Camadas do quadro:** fundo → brilho central → poeira em parallax → **campo ASCII** → bloom → faixa escura da legenda → overlays (callouts, contadores) → selo do topo e cantoneiras → legenda → grão → vinheta.
- **Dois estilos de forma:**
  - **Traço** (Hook C/D, `comp_motion.js`): contornos e preenchimentos amostrados aleatoriamente, 6.000 agentes, glifos de 12 a 14 px.
  - **Realista** (Confeiteira v4, `comp_realista.js`, **padrão atual**): objetos pintados com luz e sombra e lidos em grade de 5 px como ASCII art; 17.000 agentes; glifos de 7 a 9 px; cores de confeitaria só em comida.

---

## 2. Regras de ouro

1. **Nunca substituir: transformar.** Toda troca de beat tem um elemento que carrega para o próximo (o $ cai no bolso; a loja vira bolo; o cursor constrói o app; o bolo colorido perde a cor).
2. **Nunca cortar no metrônomo.** Beats de duração variada: palavras de 0,3 s ao lado de pausas de 2 s.
3. **Respiro.** Pelo menos um momento quase vazio e quase silencioso (no Confeiteira: o cursor piscando em "Então," e o bolo sozinho antes de "não saber quanto ganhou").
4. **Elemento pequeno, fundo grande.** O símbolo ocupa o centro, não a tela.
5. **Cor só com significado** (§14). Branco é o padrão. O final é o único estouro de ouro + verde.
6. **A ideia mora no desenho.** O símbolo conta a frase sozinho; a legenda reforça.
7. **Tudo é função do tempo.** O mesmo instante gera sempre o mesmo frame (determinístico, sem `Math.random` no caminho do render). Isso permite render em paralelo e motion blur real.
8. **Os agentes nunca saem do filme.** Os que sobram dissolvem no lugar (no máximo 90 px); os que faltam surgem no lugar.
9. **A câmera é operada, nunca estática** (§17).
10. **Números só reais** (ou claramente ilustrativos, como a tela de exemplo do app com "R$ 142,50").

---

## 3. Skills utilizadas

### 3.1 Skills que formam o método
| skill | origem | papel exato no projeto |
|---|---|---|
| **onetake** | `~/.claude/skills/onetake` (Patrick / feitangyuan, licença PolyForm Noncommercial 1.0.0) | **O método e a arquitetura do motor.** Dela vêm: uma única composição HTML em que todo valor é função do tempo (`window.__seek(t)`); desconstruir a referência em números antes de começar; conceito antes de beats ("um elemento que se transforma através de tudo"); **carregar** em vez de substituir; ritmo variado com respiro; câmera operada; **obturador real** (motion blur por subamostragem); **trilha sintetizada numa sala só**; checagem antes de mostrar. O motor ASCII foi construído sobre esses princípios no Hook C. |
| **hairline-create** | `~/.claude/skills/hairline-create` (estilo e motor de `@lucasmarkes/hairline`) | **O estilo isométrico.** Figuras iso de traço fino, cantos arredondados, uma "dobra" interna mais fraca, faces honestas (o que está atrás fica escondido pelo que está na frente). Usado nas camadas (Hook D), nos blocos de construção (`buildPts`), nas colunas preço × custo, no chocolate e nos cubos. |

### 3.2 Skills instaladas que podem entrar (não usadas nos filmes até agora)
| skill | quando usar |
|---|---|
| `edit`, `short-form-edit` | editar um reel com talking-head (cortes, legendas, b-roll, música, export para Reels) |
| `cut-mistakes` | remover gaguejos, repetições e retakes de uma gravação longa, com aprovação de cada corte (o `cortar.py` só encurta silêncios) |
| `media-use` | resolver trilha, efeitos, voz, imagens, remoção de fundo |
| `video-storytelling` | vídeo longo de talking-head com um "mundo" visual persistente |
| `motion-showreel` | showreel de marca de 10 a 30 s cortado na música |
| `cinematic-shot` | filme de produto com UI em close cinematográfico |
| `hyperframes` (+ `-core`, `-animation`, `-audio`, `-cli`, `-creative`, `-keyframes`, `-registry`, `-studio`) | se um dia o projeto migrar para HyperFrames; o `hyperframes-registry` tem blocos prontos (glitch, CRT, terminal) que podem inspirar |
| `animate`, `animation-vocabulary`, `apple-design`, `emil-design-eng`, `review-animations` | vocabulário e crítica de movimento |
| `virality` | roteiro de reel a partir do que funciona no nicho |
| agente **copywriter** (Salg) | roteiros, ganchos e copy de criativos do A.T.S, a partir do vault do Igor |

### 3.3 Skills de processo (superpowers)
`brainstorming` (antes de criar algo novo), `systematic-debugging` (antes de corrigir um bug), `verification-before-completion` (provar antes de dizer que está pronto). São processos de trabalho do Claude, não ferramentas do vídeo.

---

## 4. Framework e stack

**Não usamos HyperFrames nem Remotion.** O vídeo é uma **página HTML com um `<canvas>` 2D** (`comp.html` + `comp.js`) que o **Playwright** abre num Chromium sem tela e fotografa quadro a quadro.

Por que:
- O campo precisa mover **17 mil agentes por quadro com motion blur real**. Canvas 2D com atlas de glifos e typed arrays faz isso em milissegundos; DOM/React não.
- **Determinismo total:** `t → quadro`. Qualquer quadro pode ser renderizado isolado, em qualquer ordem, em 8 processos paralelos.
- **Zero build:** um arquivo `.js` puro, aberto direto no Chrome para preview (com play, barra de tempo e áudio).
- A skill onetake recomenda exatamente isso ("without HyperFrames or Remotion").

Stack completa:
| camada | tecnologia |
|---|---|
| Composição | HTML + JavaScript puro + Canvas 2D (`comp.html`, `comp.js`) |
| Preview | Chrome abrindo `comp.html` (play, barra de tempo, `?t=`, `?mb`) |
| Render | Python + Playwright (Chromium headless), N processos em paralelo, PNG por quadro |
| Encode | ffmpeg (libx264 + AAC) |
| Voz | ffmpeg (conversão, corte), numpy (`cortar.py`) |
| Transcrição | faster-whisper `large-v3` (CTranslate2, CPU int8) |
| Trilha | Python numpy + scipy (síntese, filtros, reverb por convolução, ducking), ffmpeg `loudnorm` |
| Recorte do narrador | rembg + modelo `birefnet-portrait` |
| Checagem de sintaxe | Node.js (`new Function(...)`) |

---

## 5. Ferramentas, versões e ambiente

Medidos nesta máquina (Windows 11 Pro, 19/10/2026):
| ferramenta | versão | observação |
|---|---|---|
| Python | 3.14.7 | `python` no PATH (WindowsApps) |
| faster-whisper | 1.2.1 | modelo `large-v3` já em cache (`~/.cache/huggingface/hub/models--Systran--faster-whisper-large-v3`); também `medium` e `small` |
| Playwright (Python) | 1.64.0 | Chromium instalado |
| numpy / scipy | 2.5.4 / 1.18.1 | |
| rembg | instalado | modelo `birefnet-portrait` (~10 s por quadro no CPU) |
| ffmpeg / ffprobe | 9.0.2 full_build (gyan.dev, via WinGet) | inclui `ebur128`, `loudnorm`, `silencedetect`, `drawtext` |
| Node.js | 24.18.0 | só para checar sintaxe |
| GPU | sem cuBLAS | por isso o Whisper roda no CPU (int8) |

Shell: os comandos funcionam em Git Bash ou PowerShell. Use `PYTHONIOENCODING=utf-8` no Git Bash para os acentos aparecerem certos.

Instalação do zero (se trocar de máquina):
```
pip install faster-whisper playwright numpy scipy rembg pillow
python -m playwright install chromium
winget install Gyan.FFmpeg
```

---

## 6. Estrutura de pastas e arquivos

```
Reels 18 10/                          pasta-mãe dos reels avulsos
  LEIA-ME.md                          mapa da pasta + como fazer um reel novo
  GUIA-DE-ESTILO.md                   guia resumido do estilo (§14 = estilo realista)
  DOC-PRODUCAO-VIDEOS.md              este documento
  DOC-LANDING-PAGE-ESTILO.md          o estilo para landing page
  novo_projeto.py                     cria um reel novo a partir das gravações
  _motor/                             o motor (fonte dos modelos)
    comp.html                         página da composição (preview com play/barra)
    comp_realista.js                  MODELO PADRÃO (Confeiteira v4: realista, 17 mil agentes)
    comp_motion.js                    modelo traço (Hook D só-motion, 6 mil agentes)
    comp_narrador.js                  modelo com o Vitor em cena (layout A)
    render.py                         stills | events | video
    sfx.py                            trilha sintetizada → mix.wav + sfx_stem.wav
    cortar.py                         corte de silêncios e emenda de gravações
    transcribe.py                     faster-whisper → words.json
    matte.py                          recorte do narrador (rembg)
    fonts/                            inter-300/400/700, mono-400/700, serif-italic (.ttf, OFL)
  gravacao/                           CAIXA DE ENTRADA: jogue o áudio do próximo reel aqui
  reel-confeiteira/                   reel postado (v4)
  reels 19 10/                        reels do dia 19/10

<um reel>/                            (estrutura criada pelo novo_projeto.py)
  LEIA-ME.md
  beat-sheet.md                       o plano (tempo · frase · forma · cor · o que carrega)
  gravacao/                           originais + gravacao_cortada.wav
  videos/                             todas as versões e o final
  referencias/                        quadros-chave, prancha, referências usadas
  projeto/
    comp.html, comp.js                o filme inteiro (formas, beats, câmera, legenda, HUD, overlays, eventos)
    words.json / words.js             transcrição palavra por palavra (tempos já com o respiro)
    roteiro.txt                       frases com tempos (palavra@segundo), para planejar
    vo.wav                            voz final (48 kHz estéreo, 0,3 s de respiro + 1,2 s de cauda)
    events.json                       eventos de som exportados do comp.js
    mix.wav, sfx_stem.wav             mix final (voz + trilha, −14 LUFS) e só a trilha
    render.py, sfx.py, cortar.py, transcribe.py, fonts/
    stills/                           checagens (podem ser apagadas)
    frames/                           PNGs do render (~4 GB num reel de 70 s; apagar depois de aprovar)
```

Vídeos de referência: `reel-confeiteira/videos/` e, para o estilo traço e o narrador, `../VSL MOTION/` (Hook C, Hook D v1–v3, testes de disposição).

---

## 7. Pipeline completo, passo a passo

| # | etapa | comando / ação | tempo |
|---|---|---|---|
| 1 | Gravar | salvar em `gravacao/` (§8) | — |
| 2 | Criar o projeto | `python novo_projeto.py "reels 19 10/reel-nome" [arquivos…]` | ~1 min por 30 s de áudio (transcrição) |
| 3 | Revisar a transcrição | ler `projeto/roteiro.txt`; corrigir nomes e tempos em `words.json` → regenerar `words.js` (§10) | 5 min |
| 4 | Conceito + beat sheet | escrever `beat-sheet.md` (§11) | — |
| 5 | Escrever o filme | `projeto/comp.js`: formas, `KEYS`, `CAMK`, `CHUNKS`, `SECTIONS`, `glowColour`, overlays, `events()` (§12) | — |
| 6 | Checar sintaxe | `node -e "new Function(require('fs').readFileSync('comp.js','utf8'))"` | 1 s |
| 7 | Contar agentes por forma | abrir a página e ler `SH[k].pts.length` (§24) | 10 s |
| 8 | Stills | `python render.py stills 1.0,4.5,8.2,…` → `stills/sheet.png` | ~10–30 s |
| 9 | Preview | abrir `comp.html` no Chrome (`?t=12.5` pula; `?mb` liga o blur) | — |
| 10 | Som | `python render.py events` e `python sfx.py` → `mix.wav`, `sfx_stem.wav` | ~20 s |
| 11 | Render | `python render.py video --out "../videos/nome_v1.mp4"` | ~100–150 s (72 s de filme, 17 mil agentes, 8 workers) |
| 12 | Cópia para postar | `ffmpeg -i master.mp4 -c:v libx264 -preset slow -crf 19 -pix_fmt yuv420p -c:a copy -movflags +faststart final.mp4` | ~1 min |
| 13 | Medir o som no MP4 | `ffmpeg -i final.mp4 -af ebur128=peak=true -f null -` → I ≈ −14 LUFS, pico ≤ −1,5 dB | 5 s |
| 14 | Assistir inteiro com som | — | — |

O `novo_projeto.py` faz, nesta ordem:
0. Move as gravações da caixa de entrada para `<reel>/gravacao/` (arquivos de fora são copiados); mede o LUFS de cada uma; corta os silêncios e emenda (`cortar.py`), igualando cada arquivo ao volume do primeiro.
1. Cria `projeto/` com o motor (`comp.html`, o modelo escolhido como `comp.js`, `render.py`, `sfx.py`, `cortar.py`, `transcribe.py`, `fonts/`); com `--narrador`, também `narr/bg`, `narr/fg` e `matte.py`.
2. Converte para `vo.wav`: 48 kHz estéreo, `adelay` de 0,3 s (respiro) e `apad` de 1,2 s (cauda).
3. Transcreve o `vo.wav` (os tempos já incluem o respiro) → `words.json`, `words.js`, `roteiro.txt` (quebra de frase em `. ? ! , : ;`).
4. Ajusta `DUR` em `comp.js` (`DUR = …`), `render.py` (`FPS, DUR = 30, …`) e `sfx.py` (`SR, DUR = 48000, …`).
5. Escreve o `LEIA-ME.md` do reel.

Opções: `--modelo realista|traco|narrador` (padrão realista), `--narrador`, `--sem-corte`, `--respiro 0.3`, `--cauda 1.2`.

---

## 8. Captação do áudio

- **Mesmo microfone** para tudo que vai ser emendado (conteúdo + finalização); se não der, o volume é igualado automaticamente, mas o timbre não.
- WAV 48 kHz quando possível; mp3/m4a funcionam.
- Ambiente silencioso: o corte de silêncio usa limiar de **−38 dB**. Ruído de fundo acima disso impede o corte.
- **Sem música** na gravação (a trilha é sintetizada depois e faz *ducking* sob a voz).
- Pode gravar em partes (ex.: `Confeiteira.wav` = conteúdo, `Gravando (2).wav` = finalização).
- Se errar, repita a frase inteira; os retakes são tirados à mão ou com a skill `cut-mistakes` antes do `novo_projeto.py`.

---

## 9. Edição do áudio (`cortar.py`)

```
python cortar.py saida.wav arq1.wav[:ganho_dB] arq2.wav[:ganho_dB] … [--sem-corte]
```
| regra | valor |
|---|---|
| Detecção | `silencedetect=noise=-38dB:d=0.18` (silêncio ≥ 0,18 s abaixo de −38 dB) |
| Silêncio curto (< 0,30 s, vírgula/respiro) | vira **0,12 s** |
| Silêncio longo (≥ 0,30 s, fim de frase) | vira **0,20 s** |
| Silêncio no início e no fim do arquivo | removido |
| Corte | metade da pausa-alvo de cada lado; **fade de 15 ms** na entrada e na saída de cada trecho (sem estalo) |
| Emenda entre arquivos | **0,35 s** de silêncio |
| Volume | cada arquivo após o primeiro recebe `ganho = LUFS(primeiro) − LUFS(arquivo)` (medido com `ebur128`) |
| Saída | WAV PCM 24 bits, 48 kHz, estéreo, com clip em ±1 |

Resultado no Confeiteira: 66,69 s → 60,32 s (33 pausas) + 11,47 s → 9,64 s (7 pausas), finalização −1,8 dB, total **70,31 s**, nenhuma palavra cortada.

---

## 10. Transcrição e correção

`transcribe.py`: `WhisperModel("large-v3", device="cpu", compute_type="int8")`, `language="pt"`, `word_timestamps=True`, `vad_filter=True`. Saída: lista `{ "w": palavra, "s": início, "e": fim }` (segundos, 3 casas).

Correções a fazer sempre:
1. **Nomes próprios** que o Whisper erra ("Century" → "Accenture", "experto" → "expert").
2. **Tempos de palavras arrastadas:** às vezes o Whisper estica uma palavra por cima de uma pausa. No Confeiteira, "calcula" estava em 51,58 s, mas pelo envelope do áudio começava em 51,98 s. Para conferir, imprima a energia em janelas de 50 ms ao redor da palavra:
   ```python
   import subprocess, numpy as np
   raw = subprocess.run(['ffmpeg','-v','error','-ss','51.4','-t','2.2','-i','vo.wav','-f','f32le','-ac','1','-ar','16000','-'], capture_output=True).stdout
   x = np.frombuffer(raw, np.float32)
   for k in range(0, len(x), 800): r = np.sqrt((x[k:k+800]**2).mean()); print(f'{51.4+k/16000:.2f}', '#'*int(max(0, 60+20*np.log10(r+1e-9))))
   ```
3. **A primeira palavra** às vezes sai em 0,0 s embora a voz comece em 0,3 s (o respiro); ajuste para 0,3.
4. Depois de editar `words.json`, regenere `words.js` (`window.WORDS=[…];`).

A legenda (`CHUNKS`) precisa ter **exatamente as mesmas palavras, na mesma ordem**: o `buildSubs` compara cada token normalizado (minúsculas, só letras/números/%) e avisa `subtitle mismatch` ou `subtitle word count` no console (aparece no terminal durante o `render.py stills`). Sem avisos = legenda sincronizada.

---

## 11. Planejamento: conceito e beat sheet

### 11.1 Conceito
Uma frase sobre a **imagem**, não sobre o produto: a ideia de que o filme é feito. Ex.: "6 mil agentes que nunca saem do filme" (Hook C); no Confeiteira, "o produto do trabalho (o bolo) atravessa o filme e perde a cor quando o dinheiro não é medido".

### 11.2 Beat sheet (`beat-sheet.md`)
Para cada frase: tempo, frase, forma/símbolo, cor, **o que carrega para a próxima**. Escreva a última coluna antes de desenhar; se ela ficar vazia, a transição vai parecer slide.
```
tempo · frase                          · forma / símbolo                        · cor            · o que carrega
1,2   · "…a inteligência artificial"   · IA gigante                             · roxo           · as letras da IA
2,5   · "…não cabe"                    · IA espremida sobre uma lojinha         · roxo → vermelho · a loja
3,5   · "…em todos os negócios?"       · 12 lojas, cada uma com uma faísca de IA · branco + roxo   · uma loja se destaca
```
O beat sheet completo do Confeiteira está em `reel-confeiteira/beat-sheet.md`.

### 11.3 Ritmo
- Cada morph **pousa numa palavra-chave**: comece 0,1 a 0,3 s antes dela.
- Alterne **estalo** (`expoOut`, 0,5–0,8 s) com **contemplação** (`inOut`, 1–1,2 s) e **respiro**.
- Depois de cada pico (impacto, glitch, briga, estouro), um respiro.
- Seções do selo do topo: 6 a 9 por filme (`01 · A PERGUNTA` … `09 · SUA VEZ`).

---

## 12. O motor `comp.js`, seção por seção

### 12.1 Constantes
```js
const W = 1080, H = 1920, CX = 540, CY = 800, FPS = 30, DUR = <duração>, N = 17000;
const SHUTTER = 0.5 / FPS; // obturador de 180°
```
- Origem do "mundo": o centro da forma fica em (CX, CY) = (540, 800) na tela. As coordenadas das formas vão de cerca de −500 a 500 em x e de −550 a 550 em y.
- `N`: 17.000 no realista, 6.000 no traço.

### 12.2 Utilidades
- `clamp`, `lerp`, `ramp(t, t0, d, ease)` (0→1 entre t0 e t0+d).
- Curvas `E`: `lin`, `expoOut` (`1−2^(−10p)`), `cubicOut`, `quadIn`, `inOut` (cúbico), `sine`, `backOut` (c1 = 1,25).
- `hash(i, k)`: ruído determinístico em [0,1) (multiplicações inteiras). **Toda aleatoriedade do render vem dele.**
- `rng(seed)`: gerador mulberry32, usado só na construção das formas.
- `mk(w, h)`: cria canvas.

### 12.3 Glifos e tintas
- `CH`: `' .·:-=+*#%@$?!01<>/\|_▶▪█▓▒░o'` + alfabeto minúsculo com acentos + maiúsculas + `23456789,`.
- `SCR` (embaralhamento em trânsito): `0 1 < > / \ | = + * # % $ ? !`.
- `TINT` (11 tintas; índice = constante): `WHITE #F2F2F5`, `PURPLE #A68BFF`, `BLUE #6EA6FF`, `ORANGE #FF9B55`, `GRAY #7C7C86`, `GOLD #F2C14E`, `GREEN #3DDC84`, `RED #FF5A52`, `PINK #FF8FB8`, `CREAM #F6E3C2`, `CHOCO #B97A55`.
- `money(r)`: `r > 0,72 ? GREEN : GOLD` (mistura ouro/verde por glifo).
- **Atlas:** cada caractere × cada tinta desenhado uma vez em células de 64 px (`500 50px 'JetBrains Mono'`); cada agente é um `drawImage` do atlas (rápido).

### 12.4 Agentes
- Buffers `{ x, y, a, c, t, s }` (Float32/Uint8 de tamanho N): posição, opacidade, caractere, tinta, tamanho.
- `RANK`: permutação aleatória fixa (semente 99) dos agentes. `HOME`: posição "de poeira" de cada agente.
- **Ordem de Hilbert** (`hsort`): os pontos de cada forma são ordenados pela posição numa curva de Hilbert 1024 × 1024 sobre uma caixa fixa (x de −700 a 700, y de −1000 a 1000). O agente de rank *r* vai para o ponto *r*. Regiões fluem para regiões.

### 12.5 `makeShape(groups, dyn)`
- Uma forma é uma lista de **grupos** de pontos. O agente com rank *r* entra no grupo cujo intervalo de ranks contém *r*.
- **Mesmos tamanhos de grupo em formas seguidas → os mesmos agentes mantêm o papel** (o $ da multidão vira o grupo pequeno, que vira o dono; a estrutura da "solução" sobe e vira a estrutura pequena do final).
- Agentes sem ponto ficam com opacidade 0 (dissolvem).
- **Orçamento:** se a soma dos grupos passar de N, todos os grupos são afinados por igual (filtro determinístico).
- `dyn(t, i, p, b)`: a "vida interna" da forma, chamada por agente a cada quadro (respirar, tremer, acender, girar, cair). Recebe o ponto `p` (com as etiquetas que você colocou, ex.: `p.flame`, `p.card`) e escreve no buffer `b`.

### 12.6 `buildShapes()`
Constrói todas as formas uma vez no carregamento (`SH.nome = makeShape(…)`). No realista, cada forma vem de `art(desenho, escala, dx, dy, opções)` → `imgPts` (§13).

### 12.7 Linha do tempo: `KEYS`
```js
{ t: 6.1, s: 'cake', d: 0.9, st: 0.4, e: 'inOut', sw: 90, dl: 'radial' }
```
| campo | significado |
|---|---|
| `t` | início do morph (0,1–0,3 s antes da palavra) |
| `s` | nome da forma em `SH` |
| `d` | duração da viagem de cada agente |
| `st` | espalhamento do atraso entre agentes |
| `e` | curva (`expoOut`, `inOut`, `quadIn`) |
| `sw` | arco lateral da trajetória (px) |
| `dl` | ordem do atraso: `radial` (centro → fora), `top`, `bottom`, `random` |

O primeiro item é sempre `{ t: 0, s: 'dust' }`.

### 12.8 Como o morph é calculado (`evalKey`)
- O estado num instante = a forma do key atual; se o morph ainda não acabou (`t < t_key + d + st`), mistura com o estado do key anterior (recursivo; até 10 morphs sobrepostos, por causa do *pool* de buffers).
- Atraso por agente `D[i]` (calculado uma vez em `buildDelays`, na posição de destino):
  - `radial`: `0,75 · distância/máx + 0,25 · hash`
  - `top`: `0,2 · altura + 0,8 · hash`; `bottom`: `0,8 · (de baixo para cima) + 0,2 · hash`; `random`: `hash`
- Progresso: `p = clamp((t − t_key − st·D[i]) / d)`, `q = ease(p)`.
- **Saindo ou chegando** (opacidade do destino ou da origem < 0,01): o agente anda no máximo 90 px na direção do outro lado e some (`a·(1−q)²`), embaralhando o caractere depois de 30% do caminho. **Nunca atravessa a tela.**
- **Viajando:** `pos = origem + Δ·q + arco`, com `arco = sw · (hash−0,5)·2 · sin(πq) · min(1, distância/300)`, perpendicular à trajetória.
- **Brilho de trânsito:** `a = lerp(a0, a1, q) + 0,3·sin(πq)`.
- **Caractere:** origem até q = 0,06, aleatório de `SCR` (troca 22×/s) no meio, destino depois de q = 0,9. **Tinta:** troca em q = 0,5. **Tamanho:** interpolado.

### 12.9 Câmera: `CAMK` e `camAt` (§17)

### 12.10 Legenda: `CHUNKS` e `buildSubs`
- `CHUNKS`: os blocos da legenda (2 a 6 palavras), com **marcas de cor** antes das palavras-chave: `*` branco · `^` roxo · `~` azul · `!` ouro · `+` verde · `&` vermelho · `=` laranja (§15).
- Cada bloco começa 0,1 s antes da primeira palavra; termina no início do próximo se o intervalo for < 0,7 s, senão 0,45 s depois da última palavra. Some nos últimos 0,12 s.

### 12.11 Selo do topo: `SECTIONS`
`[[0, '01 · A PERGUNTA'], [4.9, '02 · O EXEMPLO'], …]`. A troca decodifica em 0,5 s (§15).

### 12.12 Brilho de fundo: `glowColour(t)`
Janelas `win(início, fim, fadeIn, fadeOut)` por significado → RGB do centro do gradiente (§18).

### 12.13 Overlays: `drawWorldOverlays(g, t, M)`
Desenhados **no espaço do mundo** (acompanham a câmera): callouts, contadores, rótulos de interface, preços que embaralham, a legenda girando na roleta, o texto digitado. Usam `text()`, `callout()`, `decode()` e `fmtBR()`.

### 12.14 Eventos de som: `events()`
Lista `{ t, kind, d, … }`. Os morphs entram sozinhos (`kind: 'morph'`); os outros são escritos à mão (§21). Exportados com `python render.py events` → `events.json`.

### 12.15 API da página (usada pelo `render.py`)
| função | o que faz |
|---|---|
| `window.__ready` | promessa: fontes carregadas, atlas, formas, delays e legenda prontos |
| `window.__seek(t)` | desenha o instante t sem motion blur |
| `window.__frame(i, mb)` | desenha o quadro i (com motion blur se `mb`) e devolve K (amostras usadas) |
| `window.__png()` | o canvas em PNG (data URL) |
| `window.__events()` | a lista de eventos de som |
| `window.__meta` | `{ W, H, FPS, DUR, N }` |

Parâmetros da URL no preview: `?t=12.5` (abre nesse instante), `?mb` (liga o motion blur no preview), `?play` (toca ao abrir), `?render` (modo render: esconde a barra; o canvas fica em 1080 px).

---

## 13. O estilo realista (como os objetos viram ASCII)

### 13.1 `imgPts(desenho, opções)`
1. Cria um canvas fora da tela (padrão **1000 × 1100**, origem no centro) e chama `desenho(g)`.
2. Percorre uma **grade fixa** de `CELLPX = 5` px (opção `cell` para 4 ou 3 em objetos pequenos).
3. Para cada célula, faz a média de cor e cobertura (amostrando a cada 2 px).
4. Descarta a célula se a **cobertura < 30%** ou o **brilho < 0,08** (o preto do desenho vira vazio).
5. `li = clamp(brilho^0,8 + (hash−0,5)·0,08)`.
6. **Caractere** = rampa `' .·:-=+*#%@'[round(li·10)]` (mínimo `.`).
7. **Opacidade** = `0,38 + 0,62·li`.
8. **Tamanho** = `(célula · 1,55 / 14) · (0,8 + 0,35·li)` (relativo aos 14 px base).
9. **Tinta:**
   - com `{ ids: true }`: lê o **mapa de cores** (o mesmo desenho pintado de novo com códigos chapados `rgb(tinta·20+10, 0, 0)` via `F(TINTA, estilo)`; a oclusão é preservada) no centro da célula;
   - sem mapa: a tinta das 8 cores originais (exceto branco/cinza) com matiz mais próximo, se a saturação for > 0,25; senão branco;
   - `{ tint: X }` força uma tinta; `{ money: true }` mistura 26% de verde no ouro.
10. Ordena pela curva de Hilbert (a não ser que `nosort`).

`art(desenho, escala, dx, dy, opções)` envolve o `imgPts` com `translate/scale` (desenhe sempre na escala final, para a grade ter a mesma densidade em tudo).

### 13.2 Funções de desenho
- `tone(hex, v)`: a cor `hex` multiplicada por `v` (0–1), **sempre opaca**.
- `LG` / `RG`: gradientes linear e radial; `RR`: retângulo arredondado; `poly`: polígono; `sphere(g, x, y, r, hex, v, tinta)`: esfera com brilho no canto superior esquerdo.
- `F(tinta, estilo)`: devolve o estilo normal ou, no mapa de cores, o código da tinta.

### 13.3 Regras de desenho
- Pinte como **ilustração** (volume, luz, sombra, reflexo), não como diagrama.
- **Contraste vem do desenho:** lateral até ~0,7, detalhe claro 1,0.
- **Tudo opaco.** Vidro e reflexo = tom escuro opaco (~0,12).
- **Áreas escuras grandes viram vazio** (tela do celular, janelas): é o que mantém o preto.
- **Texto dentro de objeto:** contraste forte; aparece como falta de glifos.
- **Símbolo-chave sempre claro** (o "?" em cinza escuro ficou ilegível na v2).
- **Canvas de 1000 × 1100:** forma mais alta precisa de `{ h: 1500 }` (o "?" saiu cortado no topo na v2).
- **Iso:** faces de cima 1,0, esquerda ~0,6, direita ~0,4.

---

## 14. Paleta e psicologia das cores

| cor | glifo | texto | significado | exemplos |
|---|---|---|---|---|
| Branco | `#F2F2F5` | `#FFFFFF` | neutro, o padrão | quase tudo |
| Ouro | `#F2C14E` | `#F5CB62` | dinheiro, valor, posse | $, R$, custo real, restante, "ganhou" |
| Verde | `#3DDC84` | `#5BE39A` | prosperidade (misturado ao ouro, ~26%) | sinal pago, "solução viável" |
| Roxo (marca) | `#A68BFF` | `#BBA3FF` | IA, conhecimento oculto, sistema | "IA", faíscas, celular do sistema |
| Azul (marca) | `#6EA6FF` | `#93BCFF` | social, feed, alcance | WhatsApp, balões, "milhões" |
| Laranja (marca) | `#FF9B55` | `#FFB07A` | ação, construção | app sendo construído, blocos caindo |
| Cinza | `#7C7C86` | — | anonimato, commodity | multidão, lojas não escolhidas, o bolo sem cor |
| Vermelho | `#FF5A52` | `#FF7A70` | perda, conflito | "não cabe", custo > preço, "?" de "não saber" |
| Rosa | `#FF8FB8` | — | doçura, carinho | só comida: cobertura, morangos, recheio |
| Creme | `#F6E3C2` | — | aconchego, caseiro | só comida: massa, trigo, ovos, manteiga, chama |
| Chocolate | `#B97A55` | — | conforto, sabor | só comida: andar de chocolate, barra, recheio trocado |

Regras: a cor entra no instante da palavra; mistura por glifo (textura, não tinta chapada); o final é o único estouro de ouro + verde; cores de confeitaria só em comida; quando o produto representa perda, ele perde a cor.

---

## 15. Tipografia, HUD, legenda, callouts e contadores

### 15.1 Fontes (`fonts/`, todas OFL)
| fonte | arquivo | uso |
|---|---|---|
| Inter 300/400/700 | `inter-300/400/700.ttf` | legenda (400 normal, 700 palavra-chave), texto digitado |
| JetBrains Mono 400/700 | `mono-400/700.ttf` | glifos do atlas, selo, callouts, contadores, rótulos (o código pede 500; sem arquivo 500, o navegador usa o 400) |
| Instrument Serif itálico | `serif-italic.ttf` | reserva: legendas de "arquivo" |

### 15.2 Selo do topo (HUD)
- Pílula: centro x = 540, **y = 128**, altura 40, raio 20, contorno `#CFCFD6` a 50%, espessura 1,2.
- Texto: `500 19px 'JetBrains Mono'`, espaçamento 5 px, `#E6E6EA` a 85%, centralizado em y = 149.
- Aparece em 0,5 s no início; **decodifica** em 0,5 s a cada seção: os caracteres resolvem da esquerda para a direita, os não resolvidos mostram `#%&@$01<>/`, espaços nunca embaralham.

### 15.3 Cantoneiras
Quatro "L" a **56 px** das bordas, braços de **26 px**, traço 1,5 px branco a **22%**.

### 15.4 Legenda
- **Inter 54 px, y = 1580**, centralizada, uma linha por bloco.
- Palavra comum: `400`, `#CDCDD3`, opacidade 92%. Palavra-chave: `700`, cor da marca, 100%.
- Cada palavra aparece em **0,2 s** (`cubicOut`) a partir de 0,06 s antes do seu tempo, **subindo 14 px**.
- **Faixa escura (scrim)** atrás: gradiente vertical de y = 1380 a 1760: transparente → `rgba(5,5,6,.78)` a 45% → 0,78.
- Marcas: `*` `#FFFFFF` · `^` `#BBA3FF` · `~` `#93BCFF` · `!` `#F5CB62` · `+` `#5BE39A` · `&` `#FF7A70` · `=` `#FFB07A`.

### 15.5 Callout
`callout(g, t, t0, t1, ax, ay, lx, ly, rótulo, cor, alinhamento)`:
- Entrada em 0,45 s: **ponto** de 4 px com `backOut` (primeiro terço), **linha** de 1,4 px desenhada com `cubicOut`, **cauda** horizontal de 26 px, **rótulo** `500 21px 'JetBrains Mono'`, espaçamento 3, que decodifica.
- Saída em 0,35 s a partir de t1.
- `align: 'left'` = texto começa 34 px à direita de `lx`; `'right'` = texto termina 34 px à esquerda.
- Cores: `#EDEDF0`/`#F2F2F5` (neutro), `#A0A0AA` (secundário), cor de significado quando o rótulo é o argumento.

### 15.6 Contadores e rótulos de interface
- Contador: `700 40–52px` mono, cor do significado, espaçamento 1–2 px; rola até o valor (`cubicOut` 1,2 s, ou `p^2,2` em 2,5 s para números enormes). `fmtBR` formata com ponto de milhar.
- Rótulo do contador: mono 16–18 px, `#8A8A94`, espaçamento 4–5 px.
- Rótulos de interface (app, pedido): mono 700 22–24 px `#F2F2F5`/`#FFFFFF`, decodificam ao acender e **só aparecem quando acendem**.
- Preços "esquecidos" (ingredientes): `R$ ?,??` que embaralham dígitos 14×/s enquanto "ela tenta lembrar".

---

## 16. Gramática de movimento (morph)

| parâmetro | valores típicos |
|---|---|
| `t` | 0,1–0,3 s antes da palavra |
| `d` | 0,5–1,0 s |
| `st` | 0,2–0,6 s (até 2 s para "contagem") |
| `e` | `expoOut` (padrão), `inOut` (passagem suave), `quadIn` (queda, saída para o respiro) |
| `sw` | 0–200 px (0 em quedas; 60–140 em transformações) |
| `dl` | `radial` (padrão), `top`, `bottom` (subindo do chão), `random` (dissolução) |

**Vida interna (`dyn`) usada nos filmes:** respirar (escala ±0,8–1%, 2,2–2,6 rad/s), chama tremulando (±2,2 px, alfa 0,75–1), balões e cards "pop" (`backOut` 0,22 s, escala 0,85 → 1), onda de troca do recheio (varre da esquerda para a direita em 0,35 s com flash de brilho), frutinhas pulando (`|sin|` a 4,5 Hz), barra crescendo (escala vertical a partir da base), ingredientes "esquecendo" (alfa pisca 6×/s, tremor de 6 px), números fluindo numa curva de Bézier (velocidade 0,55/s), roleta girando (`cubicOut` 1,8 s, ~2 voltas), lâmpadas correndo (1 em 4, 9 Hz), blocos caindo um a um (0,16 s entre blocos, `backOut`), estouro radial (`expoOut` 1,4 s, raio 150 → 450–710 px), bolo perdendo a cor (glifos viram cinza em 1,2 s, sorteados por hash).

**Piso de opacidade:** formas que acendem *durante* o morph devem ter opacidade mínima de 0,02 (senão o agente pula do caminho de "dissolver" para o de "viajar"). Depois que o morph termina, 0 é seguro.

---

## 17. Câmera

`CAMK`: `{ t, d, x, y, z, r, e }`. A câmera parte de `CAM0 = { x: 0, y: 40, z: 0,9, r: 0 }` e cada key interpola até seus valores com a curva `e` durante `d`.

| movimento | valores |
|---|---|
| Empurrar (intimidade, foco) | z 1,05–1,2 |
| Abrir (escala, "todos", "milhões", estouro) | z 0,85–0,95 |
| Seguir (o que cai, o que sobe) | y + / y − |
| Chicote para a próxima ideia | `expoOut` |
| Contemplação | `sine`, 1,6–2,6 s |
| Rotação | ±0,006–0,02 rad |

**Mão do operador (sempre):** `x += 5·sin(0,61t) + 2,5·sin(1,37t+1)`; `y += 4·sin(0,53t+2) + 2·sin(1,11t)`; `r += 0,0022·sin(0,43t+0,5)`.
**Tremor de pouso:** em instantes listados, 5 px que decaem com `e^(−16u)` em 0,3 s (`sin(90u)`, `cos(75u)`). No Confeiteira: 3,15 (não cabe), 12,6, 22,08, 29,86 (custos), 40,88 (salvo), 65,1 (roleta para), 67,14 (estouro).
**Tremor contínuo** em momentos de conflito (`k·2,5·sin(41t)`, `k·2·sin(37t)` com envelope senoidal).
**Regra:** a câmera nunca perde o sujeito; antes de um estalo, ela já mira onde ele vai pousar.

Matriz: `[z·cos r, z·sin r, −z·sin r, z·cos r, CX − …, CY − …]` (`camMatrix`).

---

## 18. Camadas de imagem

| camada | valores exatos |
|---|---|
| Fundo | `#050506` |
| Brilho central | gradiente radial no centro (540, 800), raio 900 px, da cor `glowColour(t)` até transparente. Base `rgb(16,16,20)` + por unidade de: ouro `(34,26,4)`, roxo `(22,6,36)`, azul `(2,12,36)`, vermelho `(38,4,4)`, laranja `(30,14,2)`, verde `(2,26,10)`, rosa `(30,8,16)`. Janelas com fade de ~0,8 s |
| Poeira | 260 pontos `.`/`·`, alfa 0,04–0,16, profundidade 0,35–0,85 (parallax com a câmera), deriva para cima 8 px/s × profundidade, modo `lighter` |
| Campo ASCII | `drawImage` do atlas por agente, tamanho `14·s·zoom` |
| Bloom | o campo reduzido a ¼ (270 × 480) com `blur(3px)`, somado por cima com alfa 0,85 (modo `lighter`) |
| Scrim da legenda | y 1380 → 1760, transparente → 0,78 |
| Overlays, HUD, legenda | §15 |
| Grão | 4 texturas de ruído 256 × 256 pré-geradas, modo `overlay`, alfa 0,045, textura e deslocamento mudam a cada quadro (hash do índice) |
| Vinheta | radial do centro: transparente até 32% da altura, `rgba(0,0,0,.55)` em 75% |

---

## 19. Motion blur

- **Obturador de 180°:** a exposição de cada quadro dura meio quadro (1/60 s).
- `travel(t0, t1)` mede o maior deslocamento em tela (a cada 3 agentes, ignorando saltos > 400 px).
- Número de amostras **K = clamp(ceil(deslocamento / 5 px), 1, 10)**.
- O quadro é a média de K cenas renderizadas em instantes igualmente espaçados dentro do obturador (soma em `lighter` com alfa 1/K).
- Média típica: K ≈ 2,1 (Confeiteira), 2,9 (Hook C).
- O grão e a vinheta são aplicados uma vez, depois da média.

---

## 20. Biblioteca de formas

### 20.1 Estilo traço (`comp_motion.js`, Hook C/D)
`dust` (poeira inicial) · `dollar` ($ ouro/verde) · `pocket` (bolso com $ caindo) · `question` (? roxo que cede e sangra vermelho) · `line` (linha no chão, "nada") · `chatter` (linhas de texto rolando: "renda extra", "prompt secreto"…) · `phone` (celular com feed rolando e tags IA) · `broadcast` (onda azul por um disco de pessoas) · `crowd` (grade de pessoas `o`/`A` idênticas + faíscas de IA + $ que desmancha) · `brawl` (multidão espremida brigando por um $) · `group` (sete pessoas que se separam) · `build` (blocos iso caindo, laranja → ouro) · `layers` (três planos iso, o do meio é a camada oculta) · `split` (linha que separa a multidão cinza do dono em ouro). Hook C: `grid`, `globe`, `n82`, `waffle`, `chip`, `tower`, `alone`, `videos` (em `../VSL MOTION/hook-c/comp.js`). Pessoa: `personPts`; multidão: `crowdGrid`.

### 20.2 Estilo realista (`comp_realista.js`, Confeiteira)
| forma | desenho | vida interna | agentes |
|---|---|---|---|
| `dust` | posições de poeira | deriva lenta | 17.000 |
| `ia` | `textArt('IA', 560, roxo)` com faixa de brilho | respira | ~5.000 |
| `nofit` | lojinha (0,72×) + IA (420 px) acima | a IA desce 45 px, achata 14%, treme; o que encosta fica vermelho | ~4.800 |
| `shops` | 12 lojinhas (0,42×, célula 4) + 90 faíscas roxas cada | faíscas acendem uma a uma; a loja do meio se destaca, as outras ficam cinza | ~13.700 |
| `cake` | bolo de 3 andares + chama | respira; chama tremula | ~8.500 |
| `cakeq` | bolo (0,62×) + "?" branco + "$" ouro | "?" surge na palavra "descobrir", "$" sobe em "dinheiro" | ~6.500 |
| `orders` | 5 bolinhos (0,33×, célula 4) + "?" cinza | aparecem em sequência (`backOut`) | ~8.500 |
| `chat` | celular + teclado + balões azuis + 3 fotos de referência | cada balão/foto "pipoca" no seu tempo | ~7.200 |
| `recheio` | fatia: massa creme com miolo, recheio rosa, frosting branco, profundidade, 7 frutinhas | onda troca o recheio (rosa → chocolate → ninho); frutinhas pulam e trocam de cor | ~11.100 |
| `tag` | etiqueta de papelão + ilhós + barbante + "R$" ouro + "?" | balança no ilhós; o "?" embaralha | ~9.000 |
| `ingr` | trigo, ovos, morangos, chocolate, manteiga (1,45×) | flutuam; piscam ao "tentar lembrar" | ~4.400 |
| `bars` | colunas iso PREÇO e CUSTO + chão + linha tracejada | preço sobe; custo sobe, passa o preço e fica vermelho | ~6.500 |
| `cursor` | bloco de 200 glifos `█▓` | pisca 2,4×/s (respiro) | 200 |
| `app` | celular laranja (1,195×) + 3 cards + card de valor ouro | cards acendem na palavra; moldura vira ouro em "custo real" | ~11.800 |
| `order` | ficha do pedido: cabeçalho, 3 fotos, calendário, barra sinal/restante | flash de "salvo"; fotos sobem; calendário e restante pulsam em "dia da entrega" | ~10.300 |
| `cake2` | bolo + 2.000 brilhos | brilhos piscam e sobem | ~10.500 |
| `cakesys` | bolo pequeno + celular roxo + 3 linhas + 3.000 números | rio de dígitos dourados do bolo ao celular; linhas acendem | ~9.800 |
| `cakealone` | bolo (1,08×) + "?" branco (h 1500) | o bolo perde a cor; o "?" nasce branco e sangra vermelho | ~10.500 |
| `comment` | caixa de comentário com avatar + seta 3D | a seta quica para baixo | ~7.000 |
| `wheel` | roleta (célula 6): segmentos, raios, cubo, aro, 20 lâmpadas, ponteiro | gira e para em VOCÊ; lâmpadas correm | ~10.400 |
| `solution` | blocos iso (célula 4) + 4.500 faíscas | blocos caem um a um; em "viável" viram ouro/verde e as faíscas explodem | ~11.500 |
| `social` | estrutura pequena no alto + ícones seguir/curtir/compartilhar | ícones acendem palavra a palavra | ~8.300 |

---

## 21. Som (`sfx.py`)

### 21.1 Estrutura
1. Lê `events.json` (exportado do `comp.js`).
2. Sintetiza a **cama** (drone + ar + acorde) e os **efeitos** de cada evento.
3. Passa os efeitos por uma **sala única** (reverb por convolução).
4. Faz **ducking** sob a voz.
5. Soma voz + trilha, normaliza, masteriza com `loudnorm` → `mix.wav`; grava `sfx_stem.wav` (só a trilha).

### 21.2 A cama
- **Drone:** senos de 55 Hz (0,5), 82,41 Hz (0,28) e 110,3 Hz (0,18), com LFO de 0,07 Hz (0,75 ± 0,25), mais "ar" (ruído filtrado 200 Hz–1,4 kHz, 0,05).
- Entra em 1,5 s.
- **Queda (`drop`):** no primeiro evento `drop`, o nível cai 85% em 0,3 s e volta em 2 s, depois de 1,2 s. É o momento quase silencioso (Confeiteira: "Então," em 30,55 s).
- **Acorde quente (`bloom`):** Lá maior, 110 / 138,59 / 164,81 / 220 / 277,18 Hz (pesos 0,3 / 0,22 / 0,22 / 0,14 / 0,08), filtrado em 900 Hz, entra 0,2 s antes do evento em 1,4 s; o drone cai 40% nos 2,5 s anteriores. Some no fim. Confeiteira: 67,12 s ("viável").
- Fade-out final de 0,6 s. Estéreo com 5 ms de diferença entre os canais. Ganho da cama: −17 dB.

### 21.3 Materiais e ganhos
| evento (`kind`) | som | ganho |
|---|---|---|
| `morph` (automático) | whoosh: ruído filtrado 250–3.200 Hz + brilho acima de 1,8 kHz que cresce; começa 0,1 s antes; duração até 1,6 s | −15 dB |
| `ticks` | cliques de 12 ms acima de 2,5 kHz, na taxa `rate`/s, com jitter | −22 dB |
| `thud` | grave que desce de 62 para 38 Hz + clique | −14 dB |
| `impact` | thud longo 70→34 Hz + whoosh grave | −8 dB |
| `dim` | 8 varreduras descendentes curtas | −28 dB |
| `chime` | sinos 880 / 1.318,5 / 1.760 / 2.637 Hz | −22 dB |
| `scan` | varredura 500 → 2.400 Hz | −26 dB |
| `glitch` | blocos de onda quadrada/ruído com bitcrush | −14 dB |
| `rain` / `coins` | chuva de moedas 2,6–5,2 kHz (+ thud 90→60 Hz em `coins`) | −15/−16 dB |
| `drop` | thud muito grave 48→30 Hz (e a queda da cama) | −18 dB |
| `swell` | whoosh longo + sinos | −16 dB |
| `slice` | corte agudo + varredura 3.000 → 900 Hz | −12 dB |
| `loss` | varredura descendente 420 → 140 Hz | −20 dB |
| `wave` | whoosh largo + varredura 200 → 1.400 Hz | −18 dB |
| `sparkle` | moedas densas e baixas | −24 dB |
| `murmur` | murmúrio de multidão (250–900 Hz modulado) | −14 dB |
| `tension` | murmúrio forte + varredura grave 70 → 120 Hz | −10 dB |
| `knocks` | batidas de construção (180 Hz), `n` vezes a cada `step` s | −14 dB (+0,4 por batida) |
| `bloom` | sinos 440 / 659,25 / 880 / 1.108,7 Hz (e o acorde da cama) | −22 dB |
| **`pop`** | blip 700 → 1.300 Hz em 90 ms (balão, card) | −19 dB |
| **`type`** | 18 cliques/s (digitação) | −19 dB |
| **`spin`** | um clique de madeira por segmento que passa pelo ponteiro, seguindo a mesma curva da roleta (`end`, `n`, `d`) | −20 dB |

### 21.4 Sala, ducking e master
- **Sala única:** resposta ao impulso de ruído de 1,4 s com decaimento `e^(−4,2t)`, filtrada em 5 kHz, normalizada; mistura úmida de 35%.
- **Ducking:** envelope da voz (filtrado em 6 Hz, fase zero); a trilha cai até **45%** onde a voz está no percentil 90.
- **Mix:** voz + (cama −17 dB + efeitos) × ducking; normalizado para pico 0,95.
- **Master:** `loudnorm=I=-14:TP=-2.2:LRA=9` (o AAC do MP4 sobe o pico ~0,3 dB; com TP −1,5 o MP4 saía em −1,2). Alvo no MP4: **−14 LUFS, pico ≤ −1,5 dB**. Confeiteira final: −14,0 LUFS, pico −2,0 dB.
- `sfx_stem.wav`: só a trilha (pico 0,9), para edição externa.

### 21.5 Eventos no `comp.js` (exemplo do Confeiteira)
```js
{ t: 3.15, kind: 'thud' }, { t: 3.85, kind: 'sparkle', d: 0.8 }, { t: 6.5, kind: 'chime' },
{ t: 13.85, kind: 'pop' }, { t: 18.35, kind: 'scan', d: 0.9 }, { t: 24.5, kind: 'ticks', d: 2.4, rate: 16 },
{ t: 28.45, kind: 'tension', d: 1.4 }, { t: 29.86, kind: 'loss' }, { t: 30.55, kind: 'drop' },
{ t: WH.t0, kind: 'spin', d: WH.d, end: WH.end, n: WH.n }, { t: 67.12, kind: 'bloom' }
```

---

## 22. Render (`render.py`) e entrega

```
python render.py stills 1.0,4.5,8.2 [--mb]          → stills/tNNN.NN.png + stills/sheet.png (prancha 5 colunas, 360 px)
python render.py events                             → events.json
python render.py video [--out arquivo.mp4] [--start s --end s] [--force] [--no-mb] [--workers n] [--layout above|side|behind]
```
- Abre `comp.html?render` no Chromium headless (viewport 1100 × 1950; flags `--ignore-gpu-blocklist --enable-gpu-rasterization --allow-file-access-from-files`). Erros e avisos da página aparecem no terminal como `[page] …` (é assim que os avisos de legenda aparecem).
- **Workers:** padrão `min(8, núcleos − 2)`, cada um com sua página, dividindo os quadros. Quadros já existentes em `frames/` são pulados (a menos que `--force`).
- **Encode do master:** `libx264 -preset slow -crf 14 -pix_fmt yuv420p`, áudio `mix.wav` em AAC 256 kbps, `-shortest`, `+faststart` (~150 MB para 72 s).
- **Cópia para postar:** `-crf 19` (~96 MB para 72 s), áudio copiado.
- **Ajuste pontual:** `--start 55 --end 62.3 --force --out _trecho.mp4` refaz só o trecho; depois `video` sem `--force` remonta usando os quadros salvos. Inclua o morph de entrada e o de saída da forma alterada. Mudou som? Rode `events` + `sfx.py` e remonte (sem re-renderizar a imagem).
- **Nomes de entrega:** `videos/<Reel> - ASCII onetake (vN).mp4`; final: `videos/<Reel> - FINAL postado (vN).mp4` + `… FINAL master alta (vN).mp4`.
- **Limpeza:** depois de aprovado, apague `projeto/frames/` (~4 GB) e `projeto/stills/`.

---

## 23. Narrador em cena (Vitor)

- **Camadas:** fundo do vídeo → ASCII → Vitor recortado → legenda/HUD. **O ASCII nunca cobre o rosto.**
- **Recorte:** `rembg` + `birefnet-portrait` (~10 s por quadro no CPU), limpo em cabelo, óculos e mãos. Quadros em `narr/bg/0000.jpg`, recortes em `narr/fg/0000.png` (`matte.py`).
- **Disposição padrão: A, acima da cabeça** (escolhida pelos sócios em 18/10/2026): símbolo em escala 0,36 entre o topo da cabeça e o selo, com glifos reduzidos ("balão de pensamento"). Alternativas: `side` (lado esquerdo, 0,56) e `behind` (atrás da cabeça, 1,0). `?layout=` no preview; `--layout` no render.
- **Saída do narrador:** o vídeo se quebra em 48 faixas horizontais que escorregam e somem em 0,36 s; o símbolo cresce e vai ao centro, emendando no motion.
- **Áudio:** o som do próprio vídeo no trecho dele, depois a narração; igualar volume (`ebur128`), crossfade de 20 ms, corte entre duas palavras. Ideal: mesmo microfone.
- Modelo: `python novo_projeto.py "pasta/reel-x" --narrador` (cria `narr/`; a montagem do trecho do narrador ainda é manual, ver `../VSL MOTION/hook-d/`).

---

## 24. Verificação (QA) e checklist

### 24.1 Verificações automáticas
- **Sintaxe:** `node -e "new Function(require('fs').readFileSync('comp.js','utf8'))"`.
- **Legenda:** nenhum `subtitle mismatch` / `subtitle word count` no terminal ao rodar `stills`.
- **Agentes por forma** (nenhuma acima de N sem querer):
  ```
  python -c "from playwright.sync_api import sync_playwright; import render
  with sync_playwright() as pw:
      b,p=render.open_page(pw); print(p.evaluate('Object.entries(SH).map(([k,v])=>k+\":\"+v.pts.length).join(\"  \")')); b.close()"
  ```
- **Som no MP4:** `ffmpeg -i final.mp4 -af ebur128=peak=true -f null -` → I ≈ −14, pico ≤ −1,5.
- **Duração/formato:** `ffprobe -show_entries format=duration,size:stream=width,height,r_frame_rate`.

### 24.2 Verificação visual
- Prancha de stills nos momentos-chave **depois** de cada morph terminar (stills no meio do morph parecem bagunçados, e isso é normal).
- Quadros tirados do MP4 final (`ffmpeg -ss t -i final.mp4 -frames:v 1`), para confirmar que o encode está igual aos stills.
- Assistir inteiro com som antes de entregar.

### 24.3 Checklist de entrega
- [ ] Cada troca de beat **carrega** algo; nenhuma cena substitui a anterior.
- [ ] Ritmo variado e pelo menos um **respiro** quase vazio.
- [ ] Cor só onde tem significado; o final é o único estouro ouro + verde; cores de confeitaria só em comida.
- [ ] Legenda sincronizada, nomes próprios corrigidos, palavras-chave coloridas.
- [ ] Símbolos-chave legíveis (nada importante em cinza escuro; nada cortado na borda do canvas de desenho).
- [ ] Rótulos de interface só aparecem quando acendem.
- [ ] Nenhum número inventado apresentado como dado real.
- [ ] Silêncios cortados e volumes das gravações igualados.
- [ ] Áudio em −14 LUFS e pico ≤ −1,5 dB **medido no MP4 final**.
- [ ] Narrador: ASCII nunca sobre o rosto; volume dos dois áudios igualado.
- [ ] Assistido inteiro com som.
- [ ] Entrega em `videos/`, frames apagados, `LEIA-ME.md` do reel atualizado, referências salvas em `referencias/`.

---

## 25. Problemas conhecidos e soluções

| sintoma | causa | solução |
|---|---|---|
| `Fontconfig error: Cannot load default config file` no terminal | aviso do Chromium no Windows | inofensivo; ignore |
| `mv: Device or resource busy` ao mover/renomear vídeo | o arquivo está aberto no player | feche o player e repita |
| Script Python embutido no Bash falha com aspas ou `\n` | o shell interpreta barras e aspas do texto | grave o script num arquivo `.py` e execute o arquivo |
| Símbolo cortado no topo/base | passou da área de desenho (1000 × 1100) | `{ h: 1500 }` (ou `w`) no `art`/`imgPts` |
| Símbolo-chave apagado | desenhado em cinza escuro / tinta cinza | desenhe em branco e mude a tinta só pela animação |
| Filme cinza, sem contraste | opacidade ligada ao brilho (sombra = glifo apagado) | opacidade alta (`0,38 + 0,62·li`) e tom pela densidade do caractere |
| Detalhe do objeto some (gotas, pérolas) | lateral tão clara quanto o detalhe | lateral mais escura (até ~0,7), detalhe 1,0 |
| Agente "pula" no meio do morph | opacidade 0 → > 0 durante o morph | piso de 0,02 enquanto o morph roda |
| Lixo de caracteres em rótulos apagados | `decode()` com p = 0 mostra aleatórios | só desenhe o rótulo quando acende (alfa × `clamp(p·3)`) |
| Legenda adiantada/atrasada numa palavra | Whisper esticou a palavra sobre a pausa | conferir no envelope de volume e corrigir `words.json` |
| Pico −1,2 dB no MP4 com −1,5 no WAV | AAC sobe o pico | `loudnorm` com `TP=-2.2` |
| Pele/objeto sem a cor certa | sem mapa de cores, a tinta vem do matiz (só as 8 originais) | `{ ids: true }` e pinte com `F(TINTA, estilo)` |
| Forma com muito mais pontos que N | grade fina demais ou área grande | o `makeShape` afina sozinho; se perder detalhe, aumente a célula daquela forma |
| Comando falha em pasta com espaço (`reels 19 10`) | caminho sem aspas | sempre entre aspas: `"reels 19 10/reel-x"` |
| `novo_projeto.py` diz "já existe e não está vazia" | proteção contra sobrescrever | escolha outro nome ou apague a pasta de teste |

---

## 26. Tempos de referência

| etapa | tempo |
|---|---|
| Transcrição (`large-v3`, CPU) | ~1 min por 30 s de áudio |
| Boot da página (17 mil agentes, ~22 formas) | ~1,5 s |
| Stills (10–15 instantes) | 10–30 s |
| `events` + `sfx.py` (72 s) | ~20 s |
| Render 72 s, 12 mil agentes, 8 workers | ~100 s (K médio 2,1) |
| Render 72 s, 17 mil agentes, 8 workers | ~150 s |
| Re-render de um trecho de 7 s | ~40 s |
| Encode da cópia crf 19 | ~1 min |
| Recorte do narrador (rembg) | ~10 s por quadro |

---

## 27. Histórico de decisões

- **Hook C** (voz de teste do Igor): conceito "Campo de 6 mil" aprovado como "sensacional".
- **Hook D** (Vitor, narrador oficial): psicologia das cores; Vitor em cena na abertura; teste de disposição A × B → **A, acima da cabeça**, padrão para todo trecho com narrador.
- A VSL vai alternar narrador em cena, áudio + motion e áudio + motion + imagens reais.
- **Reel Confeiteira** (19/10/2026, narração do Igor, só motion + legenda, **postado na v4**):
  - v1: estilo traço, 6 mil agentes; roteiro visual aprovado.
  - v2: "objetos mais reais, pontos menores" → nasce o **estilo realista** (luz e sombra lidas em grade, 12 mil agentes, glifos ~9 px).
  - v3: o "?" de "não saber quanto ganhou" estava apagado e cortado → branco, maior, sangrando vermelho.
  - v4: bolos e ingredientes coloridos (rosa/creme/chocolate) + 17 mil agentes, grade de 5 px → "magnífico", postado; vira o modelo padrão `comp_realista.js`.

---

## 28. Pedidos prontos para o Claude

**Reel novo:**
> "Joguei o áudio em `gravacao/`. Crie o projeto em `reels 19 10/reel-<nome>` com o `novo_projeto.py`, corrija nomes e tempos da transcrição, monte o beat sheet seguindo o GUIA-DE-ESTILO.md e o DOC-PRODUCAO-VIDEOS.md (estilo realista, psicologia das cores, sempre carregando de um beat para o outro), desenhe as formas novas que o roteiro pedir, gere stills para eu ver e depois renderize com som em `videos/`."

**Ajuste pontual:**
> "No segundo X do `<reel>`, o <elemento> está <problema>. Corrija só esse trecho, re-renderize o trecho e remonte o vídeo como vN."

**Fechamento:**
> "A vN foi postada. Marque como final, salve as referências em `referencias/`, apague os frames e registre as decisões no histórico do GUIA-DE-ESTILO.md."

---

## 29. Glossário

| termo | significado |
|---|---|
| **Agente** | um caractere ASCII do campo; nunca sai do filme |
| **Forma** | um conjunto de destinos para os agentes (`SH.nome`) |
| **Beat** | uma frase do roteiro = uma forma |
| **Morph** | a viagem dos agentes de uma forma para a próxima |
| **Carregar** | um elemento da cena anterior sobrevive e vira a próxima |
| **Respiro** | momento quase vazio e quase silencioso |
| **Estalo** | morph rápido que pousa (`expoOut`) |
| **Vida interna (`dyn`)** | o movimento de uma forma parada |
| **Selo / HUD** | a pílula `NN · NOME` no topo |
| **Callout** | ponto + linha + rótulo mono que anota um objeto |
| **Scrim** | faixa escura atrás da legenda |
| **Glow** | o brilho radial de fundo, na cor do significado |
| **Mapa de cores (`ids`)** | o desenho pintado com códigos chapados para dar a tinta de cada célula |
| **Grade / célula** | a malha de 5 px em que os desenhos são lidos |
| **Rampa** | `. · : - = + * # % @`: o caractere pelo brilho |
| **K** | número de amostras do motion blur num quadro |
| **Caixa de entrada** | a pasta `gravacao/` da raiz |
