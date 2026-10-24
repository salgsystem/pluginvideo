# Documentação de estilo para carrossel do Instagram: "Campo ASCII"

> Como levar o estilo dos reels (Confeiteira, Arquiteto) para carrosséis do Instagram, com cada decisão explicada e cada valor exato.
> Os valores vêm do código real dos vídeos (`_motor/comp_realista.js` e `reels 20 10/reel-arquiteto/projeto/comp.js`). No vídeo o quadro é 1080 × 1920; no carrossel é **1080 × 1350**. A conversão está em cada seção.
> Documentos irmãos: `GUIA-DE-ESTILO.md` (guia dos vídeos), `DOC-PRODUCAO-VIDEOS.md` (produção dos vídeos), `DOC-LANDING-PAGE-ESTILO.md` (o estilo na web).
> Referências visuais: `reel-confeiteira/referencias/` e `reels 20 10/reel-arquiteto/referencias/prancha_1.png`, `prancha_2.png`.

---

## Sumário
1. A essência em 10 regras
2. Do vídeo para o carrossel: tabela de equivalências
3. Formato, tamanhos e zonas seguras
4. Grade do slide (as coordenadas)
5. Cores: tokens, significados e regras
6. Tipografia
7. Fundo e textura (as camadas)
8. O símbolo ASCII parado: como um still continua vivo
9. Continuidade entre slides (o "onetake" do carrossel)
10. Biblioteca de tipos de slide
11. Estrutura narrativa: do roteiro ao carrossel
12. Texto, voz e marcação de palavras-chave
13. Produção: dois caminhos
14. Exportação e publicação
15. Exemplo completo: o carrossel "Arquiteto"
16. Checklist final
17. Pedidos prontos para o Claude

---

## 1. A essência em 10 regras

1. **Um carrossel é um reel congelado.** Cada slide é um beat: uma ideia = um símbolo ASCII no centro. O deslizar do dedo faz o papel do tempo.
2. **Nada corta, tudo se transforma.** Entre um slide e o próximo, algo sobrevive: o símbolo atravessa a borda e continua no slide seguinte, ou reaparece transformado (a onda vira a planta, a planta vira a máquina). Se um slide pudesse ser trocado de lugar sem ninguém perceber, ele está substituindo, não transformando.
3. **A ideia mora no desenho.** O símbolo conta o slide sozinho. O texto reforça. Teste: cubra o texto; o desenho ainda diz algo?
4. **Preto quente, nunca preto puro.** Fundo `#050506`, com o brilho radial da cor do beat.
5. **Elemento pequeno, fundo grande.** O símbolo ocupa o terço central do slide, não a tela inteira.
6. **Cor só com significado.** Branco é o padrão; ouro = dinheiro; verde = prosperidade; roxo = IA; azul = social, feed, alcance; laranja = construção; vermelho = perda, erro; cinza = anonimato, consumo.
7. **O único estouro de ouro + verde é no fim**, no slide da virada final ou do CTA. Uma vez por carrossel.
8. **Ritmo com respiro.** Pelo menos um slide quase vazio (um cursor, uma frase sozinha). É ele que faz o slide seguinte pesar.
9. **Textura de terminal, legibilidade de produto.** Rótulos em mono, caixa alta e espaçados; frases em Inter, grandes e limpas. O carrossel é lido num celular, a 1/3 do tamanho.
10. **Números só reais.** Nenhum dado inventado; exemplo ilustrativo tem que parecer exemplo ("tela de exemplo", "×3" que conta o que a frase diz).

---

## 2. Do vídeo para o carrossel: tabela de equivalências

| no vídeo | no carrossel |
|---|---|
| Filme de um plano só (onetake) | Sequência de slides com o símbolo atravessando as bordas (§9) |
| Beat (uma frase = uma forma) | Slide (uma frase = um símbolo) |
| Tempo `t` | O deslizar; o número do slide `03/09` |
| Morph entre formas | Símbolo que começa num slide e termina no próximo; quadro "no meio do morph" usado como transição (§8.3) |
| Legenda palavra por palavra (Inter 54 px, y 1580) | Frase do slide (Inter 700, 64–84 px), com as mesmas marcas de cor |
| Selo do topo `01 · A PROMESSA` | Selo do topo, igual, com o número do slide |
| Cantoneiras | Cantoneiras, iguais |
| Callout (ponto + linha + rótulo mono) | Callout, igual (é o melhor recurso do carrossel: anota o desenho) |
| Contador que rola | Número parado no valor final, com o rótulo mono abaixo |
| Câmera operada | Enquadramento: zoom do símbolo por slide (close num detalhe, aberto no todo) |
| Motion blur, vida interna (`dyn`) | Rastro de glifos embaralhados e o instante escolhido da vida interna (§8) |
| Brilho central por beat | Brilho central por slide, mesma cor de significado |
| Respiro | Slide quase vazio |
| Estouro final ouro + verde | Slide final (virada ou CTA) |
| Trilha sintetizada | Música opcional do Instagram (o carrossel aceita áudio); sem efeitos |

---

## 3. Formato, tamanhos e zonas seguras

| item | valor | por quê |
|---|---|---|
| Tamanho do slide | **1080 × 1350 px (4:5)** | o maior retrato que o feed aceita; ocupa mais tela que o quadrado |
| Alternativa | 1080 × 1080 (1:1) | só se o carrossel for reaproveitado em outro lugar quadrado |
| Todos os slides | **mesmo tamanho** | o Instagram corta todos pela proporção do primeiro |
| Quantidade | até 20; **ideal 7 a 10** | o suficiente para um arco (gancho → problema → virada → CTA) sem cansar |
| Cor | sRGB | o Instagram converte o resto e o preto quente pode virar cinza |
| Grade do perfil | miniatura em **3:4** (corte das laterais: área central de **1012 × 1350**) | o slide 1 aparece cortado no perfil: nada importante a menos de 34 px das laterais |
| Indicador de páginas (bolinhas) | sobreposto embaixo, fora da imagem na maioria das telas | mesmo assim, nada essencial abaixo de y = 1290 |

**Zona segura do conteúdo:** x de 72 a 1008, y de 72 a 1278. Cantoneiras e selo podem ficar fora dela (são moldura).

---

## 4. Grade do slide (as coordenadas)

Origem no canto superior esquerdo, 1080 × 1350. Centro do símbolo em **(540, 640)**: um pouco acima do meio, porque o texto mora embaixo (no vídeo o símbolo fica em CY = 800 de 1920, a 42% da altura; aqui 640 de 1350 dá 47%, porque o texto ocupa menos espaço).

```
y    0 ┌──────────────────────────────────────────────┐
     48│ ┌─                                        ─┐ │  cantoneiras: a 48 px das bordas, braços de 24 px
     96│            ( 03 · A VIRADA )      03/09     │  selo: pílula centralizada, y 96; contador à direita
    170│                                              │
       │                                              │
       │               ░▒▓ SÍMBOLO ▓▒░                │  zona do símbolo: y 170 a 1000, centro (540, 640)
       │            (callouts nas laterais)           │  largura útil do símbolo: 560 a 760 px
   1000│                                              │
   1040│        Frase do slide em Inter 700           │  zona do texto: y 1040 a 1250
       │        com *palavras-chave* coloridas        │  até 2 linhas; scrim atrás
   1250│                                              │
   1302│ └─                                        ─┘ │
   1350└──────────────────────────────────────────────┘
```

| elemento | posição e medidas |
|---|---|
| Cantoneiras | 4 "L" a **48 px** das bordas, braços de **24 px**, traço 1,5 px, branco a 22% |
| Selo do topo | pílula centrada em x 540, **y 96**, altura 40, raio 20, contorno `#CFCFD6` a 50%, 1,2 px; texto mono 500 19 px, espaçamento 5 px, `#E6E6EA` a 85% |
| Contador de slide | mono 500 19 px, espaçamento 4 px, `#8A8A94`, alinhado à direita em x 1008, y 96: `03/09` |
| Zona do símbolo | y 170 a 1000; o desenho tem no máximo 760 px de largura e 760 px de altura |
| Callouts | rótulos a no mínimo 72 px das laterais; linha de 1,4 px, ponto de 4 px |
| Scrim do texto | gradiente vertical de y 960 a 1350: transparente → `rgba(5,5,6,.78)` aos 40% → 0,78 |
| Frase | centralizada, primeira linha em y 1090; entrelinha 1,15; largura máxima 900 px |
| Linha de apoio (opcional) | Inter 400 34 px, `#CDCDD3` a 92%, 24 px abaixo da frase |

---

## 5. Cores: tokens, significados e regras

### 5.1 Fundo e texto
| token | hex | uso |
|---|---|---|
| fundo | `#050506` | sempre |
| brilho base | `rgb(16,16,20)` | centro do gradiente radial quando o slide é neutro |
| texto comum | `#CDCDD3` a 92% | palavras normais da frase |
| texto forte | `#FFFFFF` | palavra-chave neutra (`*`) |
| rótulo secundário | `#8A8A94` | rótulos mono, contador de slide |
| rótulo apagado | `#7C7C86` | o lado "perdedor" de uma comparação |

### 5.2 Cores de significado (glifo · texto · brilho de fundo)
| significado | glifo | texto (marca) | brilho: soma ao `rgb(16,16,20)` por unidade |
|---|---|---|---|
| Dinheiro, valor | `#F2C14E` | `#F5CB62` (`!`) | `(34, 26, 4)` |
| Prosperidade (sempre misturado ao ouro, ~26%) | `#3DDC84` | `#5BE39A` (`+`) | `(2, 26, 10)` |
| IA, conhecimento | `#A68BFF` | `#BBA3FF` (`^`) | `(22, 6, 36)` |
| Social, feed, onda | `#6EA6FF` | `#93BCFF` (`~`) | `(2, 12, 36)` |
| Construção, ação | `#FF9B55` | `#FFB07A` (`=`) | `(30, 14, 2)` |
| Perda, erro | `#FF5A52` | `#FF7A70` (`&`) | `(38, 4, 4)` |
| Anonimato, consumo | `#7C7C86` | — | — |
| Comida (só comida) | rosa `#FF8FB8`, creme `#F6E3C2`, chocolate `#B97A55` | — | rosa `(30, 8, 16)` |

**Brilho de fundo do slide:** gradiente radial com centro em (540, 640), raio **640 px** (no vídeo, 900 de 1920; mesma proporção), da cor calculada até transparente. Intensidade típica 0,4 a 0,9 da unidade. Um significado por slide; dois só na virada final (ouro 0,9 + verde 0,35).

### 5.3 Regras
- A cor entra no slide em que a palavra aparece e sai no seguinte.
- Mistura por glifo (textura), nunca forma chapada de uma cor só.
- O estouro ouro + verde aparece **uma vez**, no fim.
- Quando o símbolo representa perda, ele perde a cor (fica cinza) e o detalhe-chave sangra vermelho.

---

## 6. Tipografia

As mesmas fontes do motor (`_motor/fonts/`, licença OFL): Inter 300/400/700, JetBrains Mono 400/700, Instrument Serif itálico.

| uso | fonte | tamanho | cor | observação |
|---|---|---|---|---|
| Frase da capa (gancho) | Inter 700 | **84 px**, entrelinha 1,08 | `#FFFFFF` + marcas | até 3 linhas, até 9 palavras |
| Frase de slide comum | Inter 700 (palavra-chave) / 400 (resto) | **64 px**, entrelinha 1,15 | `#CDCDD3` + marcas | até 2 linhas, até 14 palavras |
| Linha de apoio | Inter 400 | 34 px | `#CDCDD3` a 92% | opcional, até 20 palavras |
| Selo | JetBrains Mono 500 | 19 px, espaçamento 5 | `#E6E6EA` a 85% | `NN · NOME` em caixa alta |
| Callout | JetBrains Mono 500 | **26 px**, espaçamento 3 | cor do significado ou `#EDEDF0` | no vídeo é 21 px; o slide é visto menor, então sobe |
| Rótulo de interface / passo | JetBrains Mono 700 | 26–30 px, espaçamento 4 | `#F2F2F5` | `VISÃO`, `PROBLEMA`, `SOLUÇÃO` |
| Número de prova | JetBrains Mono 700 | 72–96 px, espaçamento 2 | cor do significado | só número real |
| Rótulo do número | JetBrains Mono 500 | 20 px, espaçamento 5 | `#8A8A94` | acima ou abaixo do número |
| Contador de slide | JetBrains Mono 500 | 19 px, espaçamento 4 | `#8A8A94` | `03/09` |

Tamanho mínimo de qualquer texto: **20 px** (no celular, um slide de 1080 px aparece com ~390 pontos de largura; 20 px viram ~7 pt).

---

## 7. Fundo e textura (as camadas)

Da mais funda para a mais alta, como no vídeo:
1. **Fundo** `#050506`.
2. **Brilho central** (§5.2).
3. **Poeira**: ~180 pontos `.`/`·`, alfa 0,04–0,16, espalhados no slide inteiro. Mantêm a sensação de "campo" mesmo no slide de respiro.
4. **Campo ASCII** (o símbolo).
5. **Bloom**: o campo reduzido a ¼, desfocado 3 px, somado por cima a 0,85 (modo `lighter`).
6. **Scrim do texto** (§4).
7. **Overlays**: callouts, números, rótulos.
8. **Selo, contador e cantoneiras.**
9. **Frase.**
10. **Grão**: ruído em modo `overlay`, alfa 0,045.
11. **Vinheta**: radial do centro, transparente até 32% da altura, `rgba(0,0,0,.55)` em 75%.

---

## 8. O símbolo ASCII parado: como um still continua vivo

No vídeo o símbolo convence porque se mexe. Parado, ele convence por três coisas: **densidade, luz e o instante certo**.

### 8.1 Densidade
- Estilo realista do motor: grade de **5 px**, glifos de 7 a 9 px, rampa `. · : - = + * # % @` pelo brilho, opacidade `0,38 + 0,62·brilho`.
- No carrossel o símbolo ocupa 560–760 px de largura (no reel ocupa ~800 px de 1080). Mantenha a grade de 5 px; em objetos pequenos, grade de 4 px; nunca menor que 3 px, porque vira cinza liso no celular.
- Glifos maiores (grade de 6 px) só para símbolos simples e gráficos (letras "IA", "?", "$"), quando o desenho precisa ser lido na miniatura do perfil.

### 8.2 Luz
- Pinte como ilustração: volume, luz no canto superior esquerdo, sombra embaixo. As laterais vão até ~0,7 de brilho e o detalhe-chave fica em 1,0.
- Áreas escuras grandes viram vazio (tela de celular, buraco do quebra-cabeça, cano da onda): é o preto que dá forma.
- O símbolo-chave é sempre claro. Nada importante em cinza escuro.

### 8.3 O instante certo (o substituto do movimento)
- **Pouso:** use o instante logo depois do morph terminar e antes da vida interna mudar (no `comp.js`: `t > key.t + key.d + key.st`).
- **Ação congelada:** escolha o quadro em que a vida interna está no auge: engrenagens giradas, a peça a meio caminho do encaixe, moedas caindo, a areia passando da metade.
- **Rastro:** para sugerir movimento num still, use o quadro **com motion blur** (`render.py stills … --mb`): os glifos em trânsito deixam um borrão direcional.
- **Quadro de transição:** um quadro no meio do morph (glifos embaralhados `0 1 < > / \ | = + * # % $ ? !` voando entre duas formas) é um ótimo slide de virada: mostra "isto está virando aquilo". Use no máximo um por carrossel.

---

## 9. Continuidade entre slides (o "onetake" do carrossel)

A regra "nunca substituir, transformar" vira três técnicas:

| técnica | como | quando |
|---|---|---|
| **Atravessar a borda** | o símbolo é desenhado numa tela larga (2 slides = 2160 × 1350) e fatiado: metade termina no slide 3 e a outra metade começa no slide 4 | entre o problema e a virada; no máximo 2 vezes por carrossel |
| **Carregar o elemento** | o mesmo objeto reaparece transformado no slide seguinte, no mesmo lugar da tela (a planta cinza no slide 4 vira a máquina branca no slide 6, mesmo centro) | sempre que possível |
| **Rastro de glifos na borda** | uma faixa de 60–120 px de glifos embaralhados saindo pela borda direita, que reaparecem entrando pela borda esquerda do slide seguinte | slides comuns, para convidar a deslizar |

Detalhes da borda:
- A emenda fica **exatamente** em x = 1080 da tela larga. Nada de texto ou callout a menos de 72 px da emenda.
- O símbolo que atravessa deve ser legível nos dois lados sozinho (meia onda ainda é onda).
- O selo e as cantoneiras são de cada slide, não atravessam.

---

## 10. Biblioteca de tipos de slide

| tipo | composição | símbolo | texto | exemplo (Arquiteto) |
|---|---|---|---|---|
| **Capa (gancho)** | símbolo grande no centro (até 760 px), frase de 84 px | o "inimigo" ou a promessa | pergunta ou contraste, até 9 palavras | 4 ícones de hype + "Quantas dessas já *mudaram* a sua vida?" |
| **Problema** | símbolo cinza ou com vermelho | o que dá errado | uma frase | a onda dos outros + surfista |
| **Respiro** | quase vazio: cursor, um ponto, um símbolo de 120 px | mínimo | uma frase curta, ou nenhuma | o cursor piscando: "E o melhor:" |
| **Virada** | quadro de transição ou o símbolo mudando de cor | o elemento carregado | a frase que muda o jogo | a planta cinza virando máquina |
| **Passo a passo** | 3 ícones em linha (x 225, 540, 855) com rótulo mono abaixo, ou 1 passo por slide com `1/3` | um ícone por passo | rótulos de 1 palavra + uma frase | olho → lupa → planta: VISÃO, PROBLEMA, SOLUÇÃO |
| **Comparação** | divisória tracejada em x 540; esquerda apagada (cinza), direita acesa | os dois lados | um rótulo mono por lado | CONSUMIR × CONSTRUIR |
| **Prova / número** | número mono 72–96 px no centro, símbolo pequeno acima | o objeto do número | rótulo mono + uma frase | só com número real |
| **Resumo** | 3 a 4 itens em lista mono, cada um com um mini-símbolo de 120 px | mini-símbolos | uma linha por item | — |
| **CTA (fim)** | caixa de comentário com a palavra digitada + seta para baixo; o único estouro ouro + verde | caixa de comentário, chave, máquina dourada | "Comenta **ARQUITETO**" + o que a pessoa recebe | caixa com ARQUITETO + chave dourada |

---

## 11. Estrutura narrativa: do roteiro ao carrossel

1. **Comece do roteiro do reel** (`beat-sheet.md`) ou de um texto novo. Se vier de um reel, o carrossel tem **metade ou menos** dos beats.
2. **Escolha o elemento que atravessa tudo** (no Arquiteto: a máquina, de planta cinza a máquina dourada).
3. Monte o mapa de slides, com a mesma tabela do beat sheet:

```
slide · tipo        · frase (com marcas)                          · símbolo                 · cor        · o que carrega
1     · capa        · Quantas dessas já &mudaram a sua vida?       · 4 ícones de hype        · branco     · os ícones
2     · problema    · Te ensinaram a ~surfar a ~onda dos outros    · onda + surfista         · azul       · a onda
…
```

4. **Arco padrão (9 slides):** 1 capa → 2–3 problema → 4 respiro ou virada → 5–7 a solução em passos → 8 a máquina pronta (estouro) → 9 CTA.
5. **A capa decide tudo.** Ela precisa funcionar sozinha na miniatura 3:4 do perfil: símbolo claro + no máximo 9 palavras.
6. **O penúltimo slide paga a promessa da capa** (a capa pergunta, o penúltimo responde com o estouro).

---

## 12. Texto, voz e marcação de palavras-chave

- **Mesma voz do reel**: frases curtas, segunda pessoa ("você"), sem jargão.
- **Uma ideia por slide.** Até 14 palavras na frase; a linha de apoio é opcional.
- **Marcas de cor** (as mesmas da legenda do motor), antes da palavra: `*` branco forte · `^` roxo · `~` azul · `!` ouro · `+` verde · `&` vermelho · `=` laranja.
- No máximo **2 palavras-chave coloridas por frase**; a cor da palavra é a mesma do símbolo.
- Rótulos mono em CAIXA ALTA, de 1 a 3 palavras.
- **Legenda do post:** a primeira linha repete o gancho da capa; depois, 3 a 5 linhas com o que o carrossel ensina; por fim o CTA ("Comenta ARQUITETO que eu te mando…"). Até 5 hashtags, no fim.
- **Texto alternativo** (acessibilidade): escreva o alt de cada slide descrevendo o símbolo e a frase.

---

## 13. Produção: dois caminhos

### 13.1 Caminho rápido (já funciona hoje): stills do reel + montagem
Serve quando o carrossel vem de um reel já pronto.

1. Escolha os instantes de cada slide no reel (o pouso de cada forma, §8.3).
2. Gere os quadros sem legenda de cima:
   ```
   cd "<reel>/projeto"
   python render.py stills 3.6,17.8,20.2,44.6,49.9,54.9,94.6,96.6 [--mb]
   ```
   Saem em `stills/tNNN.NN.png`, 1080 × 1920.
3. **Recorte 4:5:** a caixa `(0, 170, 1080, 1520)` pega o símbolo (centro do mundo em y 800) e os callouts, e deixa de fora o selo do vídeo (y 128) e a legenda (y 1580):
   ```
   ffmpeg -i stills/t017.80.png -vf "crop=1080:1350:0:170" slide02.png
   ```
4. Monte no Figma ou no Canva, num quadro de 1080 × 1350: o recorte como fundo e, por cima, o selo, o contador, as cantoneiras, o scrim e a frase, seguindo §4 e §6. As fontes estão em `_motor/fonts/`.
5. Exporte em PNG (§14).

Limite deste caminho: o símbolo fica no enquadramento do vídeo (centro em y 630 do recorte, não 640) e a técnica de atravessar a borda (§9) não é possível.

### 13.2 Caminho completo (a construir): o motor em modo carrossel
O mesmo motor, com estas mudanças, num modelo `_motor/carrossel.js` + `carrossel.html` + `render_carrossel.py` (ainda **não existe**; peça ao Claude, §17):

| mudança | valor |
|---|---|
| Tela | `W = 1080 × nSlides`, `H = 1350` (uma tela larga; cada slide é uma fatia de 1080) |
| Centro de cada slide | `CX = 540 + 1080·k`, `CY = 640` |
| Estado | sem tempo: cada slide é **uma forma em um instante** (`{ slide, s: 'machine', t: 54.9 }`), desenhada pelas mesmas funções `art()`/`imgPts()` e `dyn` |
| Formas | importadas dos `comp.js` dos reels (a biblioteca do `DOC-PRODUCAO-VIDEOS.md` §20 e as do Arquiteto) |
| Camadas | as de §7, por slide; a poeira e o rastro de glifos atravessam a tela larga |
| Texto | a frase de cada slide com as marcas de cor, desenhada como a legenda do motor (§4, §6) |
| Saída | `carrossel/slide01.png … slideNN.png` (fatias de 1080 × 1350) + `carrossel/prancha.png` (todos lado a lado) |

Fluxo: `python novo_carrossel.py "<pasta>/carrossel-nome"` → escrever o mapa de slides → `python render_carrossel.py` → revisar a prancha → exportar.

---

## 14. Exportação e publicação

| item | valor |
|---|---|
| Formato | **PNG** (sem perda; o Instagram recomprime uma vez só). JPG qualidade 95 se o PNG passar de 8 MB |
| Perfil de cor | sRGB, sem transparência |
| Nomes | `slide01.png`, `slide02.png`… (a ordem do upload é a ordem do nome) |
| Pasta | `<carrossel>/exportar/` + `legenda.txt` (legenda do post, alts e hashtags) |
| Upload | todos de uma vez, na ordem; conferir na prévia se o corte 4:5 foi mantido (o Instagram às vezes sugere 1:1) |
| Música | opcional; trilha calma e baixa, nunca efeitos |

---

## 15. Exemplo completo: o carrossel "Arquiteto" (9 slides)

Elemento que atravessa: **a máquina** (planta cinza → construída pela IA → dourada).

| slide | tipo | frase | símbolo (instante do reel) | cor | o que carrega |
|---|---|---|---|---|---|
| 1 | capa | Low ticket, dropshipping, quiz… Quantas já &mudaram a sua vida? | os 4 ícones (`hype`, 3,6 s) | branco | os ícones |
| 2 | problema | Te ensinaram a ~surfar a ~onda dos outros. | onda + surfista (`wave`, 17,8 s), **atravessando a borda** para o slide 3 | azul | a onda |
| 3 | problema | E nunca a construir a sua própria *máquina*. | o fim da onda vira a planta cinza (`blueprint`, 20,2 s) | cinza | a planta |
| 4 | virada | Usar a ^IA pra figurinha é cometer o mesmo &erro. | o loop vermelho com a IA dentro (`loop`, 34,4 s) | vermelho + roxo | a IA |
| 5 | respiro | A oportunidade está em =construir. | um bloco laranja sozinho (`code`, 65,8 s, só o cubo) | laranja | o bloco |
| 6 | passo a passo | *Visão* → &problema → =solução. | olho, lupa, planta acesos (`steps`, 50,4 s) | branco / vermelho / laranja | a planta |
| 7 | passo a passo | A ^IA ajuda a =construir, =executar e =escalar. | a máquina com o chip e as cópias (`machine`, 54,9 s) | branco + roxo | a máquina |
| 8 | virada final | Pare de surfar. Construa a sua própria !máquina. | a máquina em ouro + verde explodindo (`final`, 94,6 s) | **ouro + verde** (único) | a máquina |
| 9 | CTA | Comenta *ARQUITETO* e receba um !acesso !exclusivo. | caixa de comentário com ARQUITETO + chave dourada pequena | branco + ouro | fim |

Os slides 2 e 3 usam "atravessar a borda" (só no caminho completo, §13.2). No caminho rápido, o slide 3 repete a onda pequena no canto esquerdo para carregar.

---

## 16. Checklist final

- [ ] Todos os slides em 1080 × 1350, sRGB, mesmo tamanho.
- [ ] A capa funciona sozinha na miniatura 3:4 (nada essencial a menos de 34 px das laterais; até 9 palavras).
- [ ] Cada slide tem um símbolo que conta a ideia sem o texto.
- [ ] Cada passagem de slide carrega algo (borda atravessada, objeto transformado ou rastro de glifos).
- [ ] Pelo menos um slide de respiro.
- [ ] Cor só com significado; ouro + verde juntos só uma vez, no fim; comida é a única coisa rosa/creme/chocolate.
- [ ] No máximo 2 palavras coloridas por frase, na cor do símbolo.
- [ ] Nenhum texto menor que 20 px; frases até 14 palavras.
- [ ] Nada essencial abaixo de y 1290 nem a menos de 72 px de uma emenda.
- [ ] Nenhum número inventado.
- [ ] Legenda do post, alts e hashtags em `legenda.txt`.
- [ ] Revisado na prancha (todos lado a lado) e num celular de verdade antes de postar.

---

## 17. Pedidos prontos para o Claude

**Carrossel a partir de um reel (caminho rápido):**
> "Faça um carrossel de 9 slides a partir do `reels 20 10/reel-arquiteto`, seguindo o DOC-CARROSSEL-ESTILO.md: monte o mapa de slides, gere os stills nos instantes certos, recorte em 4:5 e me entregue a prancha e a legenda do post."

**Construir o modo carrossel no motor (caminho completo, uma vez só):**
> "Construa o modelo de carrossel descrito no §13.2 do DOC-CARROSSEL-ESTILO.md (`_motor/carrossel.js`, `carrossel.html`, `render_carrossel.py`, `novo_carrossel.py`), reaproveitando as formas dos reels, e teste com o exemplo Arquiteto do §15."

**Carrossel a partir de um texto novo:**
> "Tenho este texto: <texto>. Faça um carrossel no estilo Campo ASCII seguindo o DOC-CARROSSEL-ESTILO.md: escolha o elemento que atravessa tudo, desenhe as formas novas que precisar e entregue os PNGs em `exportar/` com a legenda."
