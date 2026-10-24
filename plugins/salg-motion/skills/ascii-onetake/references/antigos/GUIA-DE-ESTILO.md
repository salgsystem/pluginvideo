# Guia de estilo: VSL ASCII onetake

> **Atualizado em 19/10/2026** com o reel **Confeiteira** (v4, postado), que trouxe o **estilo realista**: objetos com luz e sombra lidos em grade como ASCII art, 17 mil agentes e cores de confeitaria. Tudo sobre ele está na **§14**; as seções antigas continuam valendo para o estilo de traço (Hook C/D).

Documento de referência do estilo das animações da VSL (Hook C, Hook D e os próximos). Reúne a estética, o movimento, as cores, o som, as ferramentas e o passo a passo para fazer um filme completo a partir de um áudio novo.

> **Em uma frase:** um único plano contínuo em que **6.000 caracteres ASCII** se reorganizam a cada frase da narração para formar o símbolo do que está sendo dito. Nada corta, tudo se transforma. O fundo é preto, com cor apenas onde ela tem significado.

---

## 1. O conceito: "Campo de 6 mil"

- O filme inteiro é feito de **6.000 glifos ASCII (os "agentes")**. O número vem do Hook C ("quase 6 mil profissionais") e virou a assinatura visual da VSL.
- **Reels avulsos** que não citam os 6 mil podem usar mais agentes para ganhar detalhe: o Confeiteira usa **17.000** (ver §14). O princípio é o mesmo: os agentes nunca saem do filme.
- **Os agentes nunca saem do filme.** Cada beat do roteiro é uma **forma-alvo** nova para os mesmos agentes: um $, um bolso, um "?", um celular, uma multidão, blocos, camadas…
- **Onetake:** não há corte seco. A passagem de uma ideia para a outra é sempre uma **transformação visível**, em que algo da cena anterior sobrevive e vira a próxima. É o que separa isto de um "PowerPoint animado".
- **A ideia mora no desenho:** o símbolo precisa contar a frase sozinho, sem depender de texto explicativo. A legenda reforça e não substitui.

### Regras de ouro
1. **Nunca substituir: transformar.** Toda troca de beat tem um elemento que carrega para o próximo.
2. **Nunca cortar no metrônomo.** Beats de duração variada: palavras de 0,3 s ao lado de pausas de 2 s.
3. **Precisa ter respiro.** Momentos quase vazios e quase silenciosos (o "sozinho" no Hook C, a saída da torre) fazem os picos pesarem.
4. **Elemento pequeno, fundo grande.** Muito preto em volta; o símbolo ocupa o centro, não a tela inteira.
5. **Cor só com significado** (ver §3). Branco é o padrão.
6. **Tudo é função do tempo.** O mesmo instante gera sempre o mesmo frame (determinístico), o que permite render em paralelo e motion blur real.

---

## 2. Identidade visual

### Formato
- **9:16 vertical, 1080×1920, 30 fps** (draft e entrega). A versão 4K/60 fps fica para depois da aprovação final.
- Margens: o conteúdo principal fica entre y≈180 e y≈1380. A legenda fica em y=1580.

### Fundo e textura
| camada | valor |
|---|---|
| Fundo | `#050506` (preto quente, nunca `#000` puro) |
| Brilho central | gradiente radial (raio 900 px) que **assume a cor do beat**: ouro no dinheiro, roxo na IA, azul no feed, vermelho na briga |
| Poeira de fundo | cerca de 260 pontinhos `.` `·` em parallax lento (profundidade) |
| Bloom | os glifos borrados a ¼ de resolução, somados por cima (alpha 0,85) |
| Grão | ruído em overlay, alpha 0,045, muda a cada frame |
| Vinheta | escurece as bordas até 55% |

### Glifos (o "material")
- Fonte dos glifos: **JetBrains Mono 500**, renderizada num atlas de 64 px por tinta.
- Conjunto principal: `. · : - = + * # % @ $ ? ! 0 1 < > / \ | _ ▶ ▪ █ ▓ ▒ ░ o`, mais o alfabeto (para o "barulho" do feed).
- **Embaralhamento em trânsito:** enquanto viaja, o glifo vira `0 1 < > / \ | = + * # % $ ? !` e assenta no caractere final ao chegar.
- Tamanho base: 14 px × fator individual (0,55 a 2,3). Bordas e contornos usam `# █ ▓`; preenchimentos usam `+ : . ·`.
- **Estilo realista (§14):** glifos de ~7 a 9 px, um por célula de uma grade fixa de 5 px; o caractere sai do brilho da célula pela rampa `. · : - = + * # % @`.

### Tipografia
| uso | fonte | tamanho |
|---|---|---|
| Legenda | **Inter 400** (normal) / **Inter 700** (palavra-chave) | 54 px |
| HUD, callouts, contadores, rótulos | **JetBrains Mono 500/700**, CAIXA ALTA, espaçamento de 3 a 5 px | 15 a 52 px |
| (reserva) legendas de "arquivo", como na referência | Instrument Serif itálico | — |
Todas são OFL (uso comercial livre) e ficam em `fonts/`.

### Elementos fixos da tela
- **Selo do topo (HUD):** pílula com contorno fino em y=128, texto mono `01 · A PERGUNTA`. Quando a seção muda, o texto "decodifica" (caracteres aleatórios que resolvem da esquerda para a direita em 0,5 s).
- **Cantoneiras:** quatro marcas de enquadramento discretas (alpha 0,22) a 56 px das bordas.
- **Legenda:** palavra por palavra no tempo exato da fala. Cada palavra sobe 14 px e aparece em 0,2 s. A palavra-chave vai em **negrito e na cor do significado**; as outras ficam em cinza-claro `#CDCDD3`. Uma faixa escura (scrim) por trás garante a leitura.
- **Callouts:** ponto no objeto, linha-guia que se desenha, rótulo mono que decodifica. Exemplos: `VOCÊ`, `CAMADA OCULTA`, `GRUPO PEQUENO`. Ficam presos ao mundo e se movem com a câmera.
- **Contadores:** números em mono que rolam até o valor (`R$ 0,00`, `6.000`, `12 PAÍSES`). Números só quando estão no roteiro ou são claramente ilustrativos.

---

## 3. Psicologia das cores

| cor | hex (glifo) | hex (texto) | significado | onde usar |
|---|---|---|---|---|
| Branco | `#F2F2F5` | `#FFFFFF` | neutro, o padrão | quase tudo |
| **Ouro** | `#F2C14E` | `#F5CB62` | dinheiro, valor, posse | $, bolso, "próprio", "dono" |
| **Verde** | `#3DDC84` | `#5BE39A` | prosperidade (misturado ao ouro, ~25%) | o $, a estrutura final |
| **Roxo** (marca) | `#A68BFF` | `#BBA3FF` | IA, conhecimento oculto | "?", faíscas de IA, chip, camada oculta |
| **Azul** (marca) | `#6EA6FF` | `#93BCFF` | feed, social, massa, alcance | celular, onda de alcance, "milhões" |
| **Laranja** (marca) | `#FF9B55` | `#FFB07A` | ação, construção | blocos sendo construídos (depois viram ouro) |
| Cinza | `#7C7C86` | — | anonimato, commodity | multidão, "nunca viu" |
| **Vermelho** | `#FF5A52` | `#FF7A70` | perda, conflito | "nada", "ninguém", a briga |
| **Rosa** (confeitaria) | `#FF8FB8` | — | doçura, carinho | só comida: cobertura, morangos, recheio de morango |
| **Creme** (confeitaria) | `#F6E3C2` | — | aconchego, caseiro | só comida: massa, trigo, ovos, manteiga, chama da vela |
| **Chocolate** (confeitaria) | `#B97A55` | — | conforto, sabor | só comida: andar de chocolate, barra, recheio trocado |

**Cores de confeitaria (desde o Confeiteira):** rosa, creme e chocolate **só aparecem em comida**, nunca em dinheiro, perda ou interface, para não competir com ouro/verde/vermelho. O produto colorido representa o valor do trabalho; quando o roteiro fala de perda ("não saber quanto ganhou"), o bolo **perde a cor e vira cinza**: é o contraste mais forte do filme.

**Regras:** a cor entra no instante da palavra e nunca como enfeite. Mistura com pontilhado (hash por glifo) para parecer textura, não tinta chapada. O **final** é o único momento em que as cores de ganho explodem juntas (ouro e verde).
**Marcas na legenda** (em `CHUNKS`): `*` branco · `^` roxo · `~` azul · `!` ouro · `+` verde · `&` vermelho · `=` laranja.

---

## 4. Gramática de movimento

### A transformação (morph)
Cada beat é uma linha em `KEYS`: `{ t, s: 'forma', d, st, e, sw, dl }`
| parâmetro | o que é | valores típicos |
|---|---|---|
| `t` | início (s), cerca de 0,1 a 0,3 s **antes** da palavra, para pousar nela | — |
| `d` | duração da viagem de cada glifo | 0,5 a 1,0 s |
| `st` | espalhamento do atraso entre glifos | 0,2 a 0,6 s (até 2 s para "contagem") |
| `e` | curva: `expoOut` (estalo que pousa, o padrão), `inOut` (passagem suave), `quadIn` (queda) | — |
| `sw` | arco lateral da trajetória (px), que dá organicidade | 0 a 200 |
| `dl` | ordem do atraso: `radial` (do centro para fora, padrão), `top`, `bottom`, `index` (contagem), `random` | — |

- **Ordem de Hilbert:** o glifo *i* vai para o ponto *i* de cada forma, ordenado por uma curva de Hilbert fixa. Resultado: regiões fluem para regiões, sem embaralhamento caótico.
- **Entrar e sair dissolvendo:** glifos que não são usados na forma nova **se dissolvem no lugar** (andam no máximo 90 px e somem). Nunca atravessam a tela voando.
- **Brilho de trânsito:** +0,3 de alpha no meio da viagem, que faz o "rastro" de luz.
- **Vida interna (`dyn`):** cada forma pode ter movimento próprio enquanto está parada: respirar, rolar o feed, o globo girar, a multidão marchar no mesmo passo, a briga tremer, os blocos caírem um a um, a chuva de dinheiro.

### Ritmo
- O tempo vem **da voz:** cada morph pousa numa palavra-chave (transcrição palavra por palavra).
- Alternar **estalo** (`expoOut`, 0,5 a 0,8 s) com **contemplação** (`inOut`, 1 a 1,2 s) e **respiro** (cena quase vazia).
- Picos de energia: impactos (o "82%"), glitch (o chip), a briga. Depois de cada pico, um respiro.

### Câmera (operada, não estática)
- Keys em `CAMK`: `{ t, d, x, y, z, r, e }`. Empurra (z 1,05 a 1,2) para dar intimidade, abre (z 0,85 a 0,95) para escala ("milhões"), segue a queda (y +), faz chicote para a próxima ideia (`expoOut`).
- **Mão do operador:** flutuação lenta de duas senoides (±5 px, ±0,002 rad) o tempo todo.
- **Tremor de pouso:** 5 px que decaem em 0,25 s nos impactos. Tremor contínuo na briga.
- **Regra:** a câmera nunca perde o sujeito; antes de um estalo, mira onde ele vai pousar.

### Motion blur
- **Obturador real de 180°:** cada frame é a média de 1 a 10 instantes, escolhidos automaticamente pela velocidade (um a cada 5 px de deslocamento). Em média ~2,9 amostras por frame.

---

## 5. Biblioteca de formas (já prontas, reutilizáveis)

| forma | o que é | usada em |
|---|---|---|
| `dust` | poeira espalhada, estado inicial | abertura |
| `dollar` | $ gigante, ouro e verde | "dinheiro" |
| `pocket` | bolso de calça com $ caindo dentro | "caiu no seu bolso" (D v1) |
| `question` | ? roxo/branco que cede e sangra vermelho | "IA?" / "nada" |
| `line` | linha no chão, vermelha e cinza | "nada" |
| `chatter` | linhas de texto rolando ("renda extra", "prompt secreto"…) | "gente falando sobre isso" |
| `phone` | celular com feed rolando e tags "IA" | "seu feed" |
| `broadcast` | celular pequeno com uma onda azul por um disco de pessoas | "milhões de pessoas" |
| `crowd` | grade de pessoas `o`/`A` idênticas, com faíscas de IA e um $ que desmancha | "todo mundo faz" |
| `brawl` | multidão espremida em volta de um $, tremendo e avermelhando | "briga pelo mesmo dinheiro" |
| `group` | sete pessoas se separando da multidão | "grupo pequeno" |
| `build` | blocos isométricos caindo um a um, de laranja para ouro | "construir algo próprio" |
| `layers` | três planos isométricos; o do meio é a camada oculta | "camada que ninguém mostra" |
| `split` | linha que divide: multidão cinza × dono em ouro | "separa… próprio dono" |
| Hook C: `grid`, `globe`, `n82`, `waffle`, `chip`, `tower`, `alone`, `videos` | grade de 6.000, globo com 12 países, "82%", blocos de empresas, chip IA com glitch, torre vazando $, pessoa sozinha, vídeos soltos | `hook-c/comp.js` |

**Como criar uma forma nova:**
- **De um desenho ou texto:** `maskPts(N, g => { g.font = HEAVY(800); g.fillText('X', 0, 0); })` amostra pontos do desenho. Funções opcionais escolhem o caractere, a cor e o brilho de cada ponto.
- **Procedural:** gera a lista de pontos `{x, y, a, c, t, s}` na mão (grade, espiral, esfera…).
- **Pessoa:** `personPts(M, seed)` (boneco de traço). **Multidão:** `crowdGrid(colunas, linhas, …)`.
- **Iso (estilo Hairline):** contornos finos e arredondados, uma "dobra" interna mais fraca, faces de trás escondidas pelas da frente.
- Grupos (`makeShape([grupoA, grupoB], dyn)`): com o mesmo tamanho de grupo em formas seguidas, **os mesmos agentes mantêm o papel** (o $ da multidão vira o grupo pequeno, que vira o dono).

---

## 6. Narrador em cena (Vitor)

- **Camadas:** `fundo do vídeo → ASCII → Vitor recortado → legenda/HUD`. O ASCII **nunca cobre o rosto**.
- **Recorte (matte):** `rembg` com o modelo `birefnet-portrait`, cerca de 10 s por frame no CPU. Fica limpo em cabelo, óculos e mãos.
- **Disposição dos símbolos: ✅ PADRÃO = A, acima da cabeça** (escolhida pelos sócios em 18/10/2026). O símbolo fica pequeno (escala 0,36), centralizado entre o topo da cabeça e o selo do topo, com glifos reduzidos para manter a textura ASCII. Funciona como um "balão de pensamento" do narrador.
  - Alternativas guardadas para casos específicos: `side` (ao lado esquerdo, escala 0,56) e `behind` (atrás da cabeça, escala 1). Escolha com `?layout=` no preview ou `--layout` no render.
- **Saída do narrador:** o vídeo se quebra em 48 faixas horizontais que escorregam e somem (0,36 s). O símbolo que estava ao lado dele **cresce e vai para o centro**, emendando no motion.
- **Áudio:** o som do próprio vídeo no trecho dele, depois a narração. Igualar o volume antes (medir com `ebur128`), usar crossfade de 20 ms e cortar entre duas palavras. O ideal é que todo o áudio venha do **mesmo microfone**.
- Legendas: as mesmas do motion, também nos trechos com o narrador.

## 7. Imagens reais (próximo passo)
- A imagem vira forma: a luminância dela é amostrada em glifos, os agentes **formam a foto em ASCII**, depois a foto real (pontilhada) aparece dentro de uma moldura "ARQUIVO 0X" e pode voltar a virar glifos. Mesmo princípio de carregar a cena, nunca um slide.

---

## 8. Som

- **Tudo sintetizado** (`sfx.py`), sem trilha licenciada: drone grave (55/82/110 Hz) com LFO lento, **queda para quase silêncio** num momento-chave, e um **acorde quente** (Lá maior) no fecho.
- **Materiais:** whoosh (ruído filtrado) em cada morph · ticks nos contadores · thud/impacto · chime (sinos) · scan (varredura) · glitch (bitcrush) · chuva de moedas · murmúrio de multidão · tensão · batidas de construção · slice (o corte) · loss (descida) · **pop** (balão/card aparecendo) · **type** (digitação) · **spin** (roleta: um clique por segmento, desacelerando junto com ela).
- **Uma sala só:** toda a trilha passa pelo mesmo reverb, o que evita o "um bip por evento".
- **Ducking:** a trilha abaixa até 45% sob a voz.
- **Master:** **−14 LUFS**, pico ≤ −1,5 dBTP (padrão de Reels/TikTok). O `loudnorm` usa **TP −2,2**, porque a compressão AAC do MP4 sobe o pico em ~0,3 dB (com −1,5 no WAV, o MP4 saía em −1,2). Confira sempre no MP4 final. Também sai `sfx_stem.wav` (só a trilha) para o editor.
- **Voz antes de tudo:** os silêncios são encurtados (`cortar.py`): pausa < 0,30 s vira 0,12 s, maior vira 0,20 s, início e fim zerados, fade de 15 ms em cada corte. Vários arquivos (conteúdo + finalização) são emendados com 0,35 s de respiro e o volume igualado ao do primeiro (medido com `ebur128`). Gaguejos e retakes, se houver, saem antes disso.
- Os eventos vêm de `events()` no `comp.js` (`{ t, kind, d }`), então o som acompanha qualquer mudança de tempo.

---

## 9. Passo a passo: filme completo a partir de um áudio novo

1. **Gravar o áudio** (de preferência no mesmo microfone que vai para a VSL) e salvar na caixa de entrada `gravacao/` (na raiz).
2. **Criar o projeto:**
   ```
   python novo_projeto.py "reels 19 10/reel-x"                                 (pega a gravação mais recente de gravacao/)
   python novo_projeto.py "reels 19 10/reel-x" "gravacao/conteudo.wav" "gravacao/final.wav"   (vários arquivos, na ordem)
   ```
   Isso corta os silêncios e iguala os volumes (`cortar.py`), cria `reel-x/` com o motor **realista** (padrão; `--modelo traco` para o estilo Hook D, `--narrador` para o Vitor em cena), `vo.wav` (com 0,3 s de respiro), a transcrição palavra por palavra (`words.js`), o `roteiro.txt` e a duração já configurada. `--sem-corte` mantém as pausas originais.
3. **Corrigir nomes** em `words.js` quando o Whisper errar (ex.: "Century"→"Accenture", "experto"→"expert"). Confira também os **tempos** de palavras arrastadas: o Whisper às vezes estica uma palavra sobre uma pausa (no Confeiteira, "calcula" começava 0,4 s cedo). O envelope de volume do `vo.wav` mostra onde cada sílaba realmente está.
4. **Planejar o beat sheet**: para cada frase, o símbolo, a cor e o que carrega para a próxima:
   ```
   tempo  · frase                      · forma / símbolo        · cor    · o que carrega
   0.8 s  · "Quanto dinheiro…"         · $ gigante              · ouro   · o $ cai no bolso
   3.9 s  · "…por causa da IA?"        · ? sobe do bolso        · roxo   · o ? desaba no "nada"
   ```
5. **Escrever em `comp.js`**: formas (`buildShapes`), `KEYS`, `CAMK`, `CHUNKS` (legenda com as marcas de cor), `SECTIONS` (selo do topo), overlays (contadores/callouts) e `events()` (som).
6. **Conferir**: abrir `comp.html` no Chrome (play com áudio e barra de tempo; `?t=12.5` pula para um instante, `?mb` liga o blur) ou `python render.py stills 1.0,4.5,8.2`, que gera `stills/sheet.png`.
7. **Som**: `python render.py events` e depois `python sfx.py` (gera `mix.wav`).
8. **Render**: `python render.py video --out hook-e.mp4` (cerca de 70 a 190 s). Para compartilhar, reencode com `-crf 19` (cerca de 60 a 100 MB).
9. **Ajuste pontual sem re-renderizar tudo:** `python render.py video --start 55 --end 62.3 --force --out _trecho.mp4` refaz só os frames do trecho; depois `python render.py video --out final.mp4` (sem `--force`) reaproveita o resto e remonta. Inclua no trecho o morph de entrada e o de saída da forma alterada.

### Pedido pronto para o Claude
> "Criei o projeto `hook-e` com o áudio X. Siga o GUIA-DE-ESTILO.md: monte o beat sheet, escreva as formas novas que o roteiro pedir, aplique a psicologia das cores, gere stills para eu ver e depois renderize com som."

---

## 10. Skills e ferramentas usadas

| o quê | papel no projeto |
|---|---|
| **onetake** (skill) | **O método**: desconstruir a referência em números, conceito antes de beats, carregar sempre (nunca substituir), ritmo variado com respiro, câmera operada, obturador real, som numa sala só, checagem antes de mostrar. |
| **hairline-create** (skill, @lucasmarkes/hairline) | **O estilo iso**: figuras isométricas de traço fino, cantos arredondados, uma dobra interna mais fraca, faces honestas (o que está atrás fica escondido). Usado nas camadas e nos blocos. |
| faster-whisper `large-v3` (CPU int8) | transcrição palavra por palavra (a GPU não tem cuBLAS, por isso CPU) |
| rembg + `birefnet-portrait` | recorte do narrador frame a frame |
| Playwright + Chromium | renderiza a composição HTML/Canvas frame a frame, em paralelo |
| ffmpeg | extração de frames, áudio, loudness (ebur128/loudnorm), encode H.264 |
| numpy / scipy | síntese e mixagem da trilha |
| Fontes: Inter, JetBrains Mono, Instrument Serif | tipografia (OFL) |
Outras skills de motion instaladas que podem entrar depois: `hyperframes` (+ registry com blocos prontos de glitch/CRT/terminal), `video-storytelling`, `motion-showreel`, `cinematic-shot`, `media-use`, `short-form-edit`.

---

## 11. Estrutura de uma pasta de filme

```
hook-x/
  comp.html          página da composição (preview com play/scrubber)
  comp.js            TUDO do filme: formas, beats, câmera, legenda, HUD, overlays, eventos de som
  words.js / .json   transcrição palavra por palavra (tempos já com o respiro)
  roteiro.txt        frases com tempos, para planejar
  vo.wav             voz final (48 kHz)
  sfx.py             trilha sintetizada → mix.wav + sfx_stem.wav
  render.py          stills | events | video (--layout, --start/--end, --force)
  fonts/             fontes OFL
  narr/              (se houver narrador) bg/ frames, fg/ recortes, matte.py
  cortar.py          corte de silêncios / emenda de gravações
  beat-sheet.md      o plano do filme (tempo · frase · forma · cor · o que carrega)
  frames/            PNGs do render (≈4 GB num reel de 70 s; apague depois de aprovar)
```

Pasta-mãe de reels avulsos (`Reels 18 10/`): documentos (`GUIA-DE-ESTILO.md`, `DOC-*.md`, `LEIA-ME.md`), `novo_projeto.py`, `_motor/` (motor + modelos `comp_realista.js`, `comp_motion.js`, `comp_narrador.js`, `cortar.py`), `gravacao/` (**caixa de entrada**: as gravações saem dela para dentro do reel) e as pastas de reels (`reel-confeiteira/`, `reels 19 10/…`).

Cada reel tem a mesma estrutura (criada pelo `novo_projeto.py`): `LEIA-ME.md`, `projeto/` (o filme: o bloco acima), `gravacao/` (originais + cortada), `videos/` (todas as versões e o final; render com `--out ../videos/nome.mp4`) e `referencias/` (quadros-chave e referências usadas).

## 12. Checklist antes de entregar
- [ ] Cada troca de beat **carrega** algo; nenhuma cena substitui a anterior.
- [ ] Ritmo variado e pelo menos um **respiro** quase vazio.
- [ ] Cor só onde tem significado; o final é o único "estouro" de cor.
- [ ] Legenda sincronizada, nomes próprios corrigidos, palavra-chave colorida.
- [ ] Nenhum número inventado apresentado como dado real (os ilustrativos ficam claramente ilustrativos).
- [ ] Narrador: ASCII nunca sobre o rosto; volume dos dois áudios igualado.
- [ ] Áudio em −14 LUFS e pico ≤ −1,5 dB **medido no MP4 final**.
- [ ] Silêncios cortados e volumes das gravações igualados.
- [ ] Símbolo-chave legível: nada importante em cinza escuro, nada cortado na borda da área de desenho (§14).
- [ ] Assistir uma vez inteiro com som antes de mandar.

## 13. Histórico de decisões
- **Hook C** (voz de teste do Igor): conceito "Campo de 6 mil" aprovado como "sensacional".
- **Hook D** (Vitor, narrador oficial): psicologia das cores; o Vitor em cena na abertura. Teste de disposição A (acima) × B (ao lado): **os sócios escolheram A, acima da cabeça**, que vira o padrão para todo trecho com narrador.
- A VSL vai alternar: **narrador em cena**, **áudio + motion** e **áudio + motion + imagens reais**.
- **Reel Confeiteira** (19/10/2026, narração do Igor, só motion + legenda; **postado na v4**):
  - v1: estilo de traço (contornos, 6 mil agentes). Roteiro visual aprovado.
  - v2: pedido do Igor: "objetos mais reais, pontos menores". Nasce o **estilo realista** (luz e sombra lidas em grade, 12 mil agentes, glifos ~9 px).
  - v3: o "?" de "não saber quanto ganhou" estava apagado (desenhado em cinza escuro) e cortado no topo; passou a branco, maior, sangrando vermelho.
  - v4: **bolos e ingredientes coloridos** com as cores de confeitaria (rosa/creme/chocolate) e **17 mil agentes** com grade de 5 px. Aprovado como "magnífico" e postado. Vira o modelo padrão (`comp_realista.js`).

---

## 14. Estilo realista (reel Confeiteira, v4: o padrão para reels avulsos)

Referência visual: `reel-confeiteira/referencias/confeiteira-quadros-chave.png` (19 quadros) e os frames soltos `confeiteira-*.png`. Código: `_motor/comp_realista.js` (cópia do `reel-confeiteira/projeto/comp.js` final).

### A ideia
Em vez de contornos preenchidos com glifos sorteados, **cada objeto é pintado de verdade** (gradientes, luz, sombra, reflexo, textura) num canvas e depois **lido célula por célula**, como ASCII art clássico. Os agentes continuam os mesmos, viajando de forma em forma; só o destino de cada um ficou mais rico.

### Como funciona (`imgPts`)
| etapa | valor |
|---|---|
| Grade | `CELLPX = 5` px por célula, **fixa para todas as formas**, então a textura não muda de um objeto para outro. Objetos pequenos podem usar 4 ou 3 (`{ cell }`). |
| Brilho da célula | média do canvas na célula; `li = lum^0,8` (clareia os meios-tons) |
| Caractere | rampa `. · : - = + * # % @` pelo brilho: **a densidade do caractere carrega o tom** |
| Opacidade | `0,38 + 0,62·li`: alta em tudo (sombra = caractere leve, não glifo apagado). Testes com opacidade baixa deixaram o filme cinza e sem contraste. |
| Tamanho | `célula × 1,55 / 14 × (0,8 + 0,35·li)`: ~7 a 9 px |
| Corte | célula com cobertura < 30% ou brilho < 0,08 não vira agente (o preto do desenho fica vazio) |
| Cor | **mapa de cores**: o mesmo desenho é pintado uma segunda vez com códigos chapados (`F(TINTA, estilo)`), com a oclusão preservada, e cada célula pega a tinta do mapa (`{ ids: true }`). Sem mapa, a cor vem do matiz do desenho, só entre as 8 cores originais. |
| Orçamento | `N = 17000`. Se uma forma passar disso, `makeShape` afina todos os grupos por igual. Nenhuma forma do Confeiteira passa de ~14 mil. |

### Regras de desenho para ficar "real"
- **Pinte como ilustração, não como diagrama:** cilindro com gradiente horizontal (escuro nas bordas, luz a 40%), topo em elipse mais claro, cobertura escorrendo mais clara que a lateral, pérolas e frutas como esferas com brilho no canto, sombra de contato fraca embaixo.
- **O contraste vem do desenho:** a lateral precisa ser bem mais escura que a cobertura (lateral até ~0,7, cobertura 1,0), senão os detalhes somem.
- **Tudo opaco:** cores semitransparentes caem abaixo da cobertura mínima e somem. Para "vidro" ou "reflexo", use um tom escuro opaco (0,12).
- **Áreas grandes escuras viram vazio:** tela de celular, buracos e janelas em tom < 0,08 não geram agentes. É isso que mantém o preto em volta.
- **Texto dentro de objeto:** desenhe em contraste (escuro sobre claro ou o contrário); o texto aparece como "falta" de glifos.
- **Símbolo-chave sempre claro:** o "?" desenhado em cinza escuro ficou ilegível (v2→v3). Desenhe em branco e mude a tinta só pela animação.
- **Área de desenho:** o canvas padrão vai de −500 a 500 em x e de −550 a 550 em y. Formas mais altas precisam de `{ h: 1500 }`, senão saem cortadas.
- **Iso (Hairline)** continua valendo para blocos, colunas, chocolate e açúcar: face de cima 1,0, esquerda ~0,6, direita ~0,4.

### Biblioteca nova (em `comp_realista.js`)
| forma / função | o que é |
|---|---|
| `cakeArt` + `flameArt` (`cakePts(escala, x, y)`) | bolo de 3 andares: rosa com cobertura branca, creme com cobertura rosa, chocolate com cobertura creme; pérolas, morangos, vela listrada, chama com halo (a chama tremula via `cakeLife`) |
| `photoArt` | "foto" de referência: bolinho colorido num fundo cinza com moldura |
| fatia (`SH.recheio`) | massa de baunilha com miolo poroso, recheio de morango que troca em onda (chocolate → ninho), profundidade lateral, frutinhas que pulam e trocam de cor |
| `phoneArt` | celular com moldura metálica, tela vazia, reflexo diagonal, ilha e botões; `body` muda a cor (laranja no app, roxo no sistema) e `screen` desenha dentro |
| `shopArt` | lojinha com placa, toldo listrado, vitrine com reflexo e porta |
| `textArt` | letra/símbolo com degradê vertical e faixa de brilho ("IA", "$", "?", "R$") |
| etiqueta (`SH.tag`) | etiqueta de papelão com ilhós e barbante, balançando |
| `ING_ART` | trigo (saco creme), ovos, morangos, barra de chocolate meio aberta, manteiga |
| colunas iso (`SH.bars`) | preço × custo; o custo cresce e fica vermelho acima do preço |
| app, ficha do pedido, comentário, roleta, ícones sociais | interface desenhada com cards, ícones esféricos e lâmpadas que correm na borda da roleta |

### Ritmo de construção
Com mais agentes os morphs ficam mais densos e fluidos, e o render sobe de ~100 s (12 mil) para ~150 s (17 mil) em 72 s de filme. Os parâmetros de morph (§4) não mudaram.

### Lições do Confeiteira
- **Alfa mínimo no morph:** agente com alfa 0 durante uma transformação vira "dissolve no lugar"; se o alfa sobe no meio da viagem, ele pula. Use piso de 0,02 nas formas que acendem durante o morph (e 0 depois que ele termina).
- **Rótulos de interface só aparecem quando acendem:** decodificar texto apagado vira lixo visual.
- **O fundo do beat acompanha a comida:** brilho rosado quente nas cenas de bolo (`glowColour`).
