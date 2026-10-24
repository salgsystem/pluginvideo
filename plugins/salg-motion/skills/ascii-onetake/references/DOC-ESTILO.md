# DOC-ESTILO: o estilo "Campo Vivo" da ATS

> **O documento principal.** Define o estilo visual e de animação da ATS e explica como produzir nele **vídeos, carrosséis e landing pages**. Substitui `DOC-PRODUCAO-VIDEOS.md`, `DOC-CARROSSEL-ESTILO.md` e `DOC-LANDING-PAGE-ESTILO.md`, que estão arquivados em `_arquivo/docs-antigos/`.
> **Referência viva:** o filme `video/VSL - Completa (v4).mp4` (12:33, 24/10/2026): Hook + Parte 2 (nossas) + Parte 3 (do Emmanuel). Todo valor deste documento vem do código desse filme: `partes/hook-ao-bloco4/projeto/comp.js`, `partes/parte2/projeto/comp.js` e `partes/comum.js`.
> **Regra de conflito:** se este documento e o código discordarem, vale o código da última versão aprovada. Depois, corrija o documento.

---

## Sumário

**Parte A · O estilo**
1. Em uma frase e em 12 regras
2. De onde veio: a linhagem e o que mudou em cada etapa
3. O material: a textura limpa
4. Cores: tokens e significados
5. Tipografia e elementos fixos da tela
6. O boneco (manequim articulado)
7. Movimento: transições, vida interna, ritmo e câmera
8. Mídia real: fotos, prints, b-roll, logos e dinheiro
9. O narrador em cena (Vitor)

**Parte B · Vídeo (produção)**

10. Estrutura de pastas e arquivos
11. Pipeline de um filme
12. O motor, peça por peça
13. Biblioteca pronta: artes, poses e overlays
14. Som
15. Render, emenda entre partes e entrega
16. QA, problemas conhecidos e tempos

**Parte C · Carrossel**

17. Do filme para o carrossel

**Parte D · Landing page**

18. Do filme para a web

**Parte E · Referência**

19. Histórico de decisões
20. Pedidos prontos para o Claude
21. Glossário

---

# PARTE A · O ESTILO

## 1. Em uma frase e em 12 regras

**Campo Vivo** é um filme de um plano só em que **milhares de caracteres ASCII, limpos e alinhados numa grade,** formam o símbolo de cada frase da narração. Esse campo convive com **mídia real** (prints do produto, logos, b-rolls e fotos, com granulado) e com um **boneco articulado** que representa quem assiste e está sempre fazendo alguma coisa.

1. **Nada corta, tudo se funde.** Cada troca de cena é uma fusão no lugar: o que sai se apaga onde está e o que entra acende onde vai ficar. Nunca há buraco preto entre as cenas, nem entre a animação e o Vitor.
2. **Textura limpa.** Os caracteres ficam na grade de 4 px, com poucos tons e quase sem grão. Objeto liso é cor chapada. Se algo parece "chuvisco" ou "nuvem se desfazendo", está errado.
3. **Cada frase tem uma animação visível do seu conceito.** O símbolo conta a ideia sozinho, e a legenda só reforça.
4. **Nada parado por mais de ~2 s.** Toda cena tem vida interna: respira, flutua, digita, gira, pisca.
5. **O boneco é quem assiste.** Está sempre em ação (gesto, andar, comemorar, coçar a cabeça), olha para onde vai e anda com o pé plantado.
6. **Produto real é real.** Telas do SALG são prints reais, logos são as de verdade e o app é a foto do app. Metáforas são ASCII.
7. **Dinheiro é cédula e pagamento é cartão.** Nunca partículas voando, que leem como "energia".
8. **Cor só com significado,** e **sem amarelo**: o dono é azul, o valor é verde e a construção é laranja Claude ou marrom.
9. **Texto sempre inteiro e legível.** Nada cortado no topo e contraste garantido. Desde a v7, o lettering sobre vídeo vai **sem tarja preta** (com sombra), em lugar que não cubra nada relevante. A placa escura fica só para texto sobre ASCII cheio.
10. **Câmera parada; o movimento vem do ASCII.** Zoom, avanço e parallax são feitos movendo as formas, nunca a câmera.
11. **Elemento pequeno, fundo grande.** Preto quente em volta (`#050506`), com o símbolo no centro.
12. **Números só reais.** Um exemplo ilustrativo tem que parecer exemplo.

---

## 2. De onde veio: a linhagem

| etapa | data | o que trouxe | o que ficou para trás |
|---|---|---|---|
| **Onetake / Hook C e D** (estilo traço) | 18/10/2026 | um plano só, agentes que nunca saem do filme, tudo função do tempo, motion blur real | contornos de traço, 6 mil agentes |
| **Realista** (reel Confeiteira v4) | 19/10 | objetos pintados com luz e sombra e lidos em grade de 5 px, 17 mil agentes | o traço |
| **VSL v5** (Hook ao bloco 4) | 21/10 | dotwork, 3D (multidão em perspectiva), mídia real com granulado, logos reais | — |
| **Pacote do Emmanuel** (motor da Parte 3, regras do Vitor) | 22/10 | textura limpa, grade de 4 px, fusão no lugar, câmera parada, **manequim articulado**, takes do Vitor sincronizados pelo áudio | chuvisco, dotwork aleatório, caracteres embaralhando em trânsito, câmera operada, bustos e silhuetas rígidas |
| **v6 / v3 juntada** (os ajustes do Igor) | 22–23/10 | piso de brilho na rampa, atlas de 32 px, cédulas e cartões, dono azul, sem amarelo, lettering com placa, mídia real em telas 3D, TV ligando, b-roll de fundo, Vitor por cima dos rótulos e com fade longo, emenda fluida entre as partes | partículas de "energia", amarelo vazado, texto cortado, buracos pretos |

**Por que a textura mudou:** o motor antigo sorteava brilho e posição em cada caractere e usava 10 tons. O resultado lia como chuvisco de TV, e os objetos pareciam nuvens. O modo limpo alinha tudo à grade e usa 6 tons, e os objetos ficam sólidos e nítidos.

---

## 3. O material: a textura limpa

### 3.1 Como um desenho vira ASCII (`imgPts`)
1. O objeto é **pintado como ilustração** (forma, luz, sombra) num canvas fora da tela de **1000 × 1100** (aumente com `{ h: 1400 }` ou `{ w: 1100 }` se ele passar disso).
2. O canvas é lido em **células de 4 px** (`CELLPX = 4`). Cada célula com cobertura ≥ 30% e brilho ≥ 0,08 vira **um agente**.
3. Do brilho saem:

| grandeza | fórmula (modo limpo) | efeito |
|---|---|---|
| brilho `li` | `clamp(lum^0,6 × 1,12)`, depois **quantizado em 6 níveis** (`round(li·5)/5`) | médios-tons claros, sem faixas aleatórias |
| caractere | rampa `' .:=+#@'`, índice `round((0,3 + 0,7·li)·6)`, **mínimo `=`** | o lado escuro do objeto continua sólido; `.` e `:` nunca aparecem num objeto |
| opacidade | `0,66 + 0,34·li` | nada apagado; o tom vem da densidade do caractere |
| tamanho | `(4 × 1,75 / 14) × (0,9 + 0,2·li)` | ~7 px na tela |
| posição | centro exato da célula (sem jitter) | alinhado à grade |
| cor | o matiz da célula vira a cor de significado mais próxima; com `{ ids: true }` vale o **mapa de cores** (§3.3) | |

### 3.2 Regras de desenho (o que dá certo)
- **Cor chapada.** Um degradê vira faixas depois da quantização. Texto (`textArt`) é cor única, sem a faixa de brilho diagonal.
- **Lateral mais escura que o detalhe** (lateral até ~0,7, detalhe em 1,0), senão o detalhe some.
- **Tudo opaco.** Uma cor semitransparente não forma célula. Para vidro e reflexo, use um tom escuro opaco (~0,12).
- **Área escura grande vira vazio** (tela de celular, janela, buraco). É o que dá forma ao objeto.
- **O símbolo-chave é sempre claro.** Um "?" em cinza fica ilegível: pinte em branco e mude a cor pela animação.
- **Isométrico** (blocos, camadas, casas): face de cima 1,0, esquerda ~0,6, direita ~0,4.
- **Nada encostado na borda do canvas de desenho.** Foi o que cortou o "IA" e o "?". Use `h: 1300–1400`.

### 3.3 Mapa de cores (`ids`)
Para objetos com partes de cores diferentes, pinte com `F(TINTA, estilo)`. O motor desenha duas vezes: o desenho normal (luz) e um "mapa" com códigos chapados (`rgb(tinta·12 + 6, 0, 0)`, até 20 tintas), e cada célula pega a tinta do mapa. Sem `ids`, a cor vem do matiz e só funciona com as 8 cores originais.

### 3.4 Camadas do quadro (de trás para a frente)
| # | camada | valor |
|---|---|---|
| 1 | fundo | `#050506` |
| 2 | brilho central | radial, centro (540, 800), raio 900, na cor do significado da cena |
| 3 | b-roll de fundo (quando há) | tela cheia, alfa 0,4–0,9, brilho 0,7–0,85, blur 0,8–1,1, granulado 0,3 |
| 4 | poeira | ~260 pontos `.`/`·`, alfa 0,04–0,16 |
| 5 | **campo ASCII** | até 40 mil agentes |
| 6 | bloom | campo a ¼, blur 3 px, somado a **0,4** (antes era 0,85: menos bloom, bordas mais nítidas) |
| 7 | mídia no mundo | prints, telas 3D, logos, cédulas, cartões, lettering |
| 8 | faixa da legenda | gradiente de y 1380 a 1760, até `rgba(5,5,6,.78)` |
| 9 | rótulos e callouts | |
| 10 | selo do topo e cantoneiras | |
| 11 | **o Vitor** (nos trechos dele) | tela cheia, por cima de tudo, menos da faixa e da legenda |
| 12 | legenda | |
| 13 | grão | overlay a **0,02** |
| 14 | vinheta | escurece as bordas até 55% |

### 3.5 Orçamento de agentes
`N = 40000`. Se uma cena pedir mais, o motor apaga pontos ao acaso e ela fica pontilhada, "desintegrando". Para conferir, rode `python peek.py "[...new Set(KEYS.map(k=>k.s))].map(s=>s+' '+SH[s].raw).join(' | ')"`. Se passar, divida em duas formas.

---

## 4. Cores: tokens e significados

### 4.1 Fundo e texto
| token | hex | uso |
|---|---|---|
| fundo | `#050506` | sempre (nunca `#000`) |
| superfície | `#0B0B0D` / `#111114` | cards, placas (web e lettering) |
| texto comum | `#CDCDD3` a 92% | legenda, corpo |
| texto forte | `#FFFFFF` | palavra-chave neutra, títulos |
| rótulo do selo | `#E6E6EA` a 85% | HUD |
| secundário | `#A0A0AA` / `#8A8A94` | callouts secundários, contadores |
| apagado | `#7C7C86` | o lado "perdedor", a multidão anônima |

### 4.2 Tintas do campo (o índice é a ordem no `TINT`)
| # | nome | hex | significado | quando |
|---|---|---|---|---|
| 0 | branco | `#F2F2F5` | neutro (padrão) | quase tudo, o boneco |
| 1 | roxo | `#A68BFF` | IA, camada oculta | **pouco**: a IA não pode ser roxa o filme inteiro (ela já foi roxa, branca, vermelha e azul em momentos diferentes) |
| 2 | azul | `#6EA6FF` | social, feed, alcance, IA "boa" | o "IA" do grupo pequeno, feed, multidão alcançada |
| 3 | laranja | `#FF9B55` | ação, construção | tijolo, capacete, botão de ação |
| 4 | cinza | `#7C7C86` | anonimato, desistência | a multidão, o que perdeu o interesse |
| 5 | ouro | `#F2C14E` | **só tesouro** | coroa, chave e baú. **Nunca** dinheiro, dono ou blocos |
| 6 | verde | `#3DDC84` | valor, resultado, confirmação | $, cédula, check, "no ar", garantia, o que deu certo |
| 7 | vermelho | `#FF5A52` | perda, erro, desistência | X, risco, "R$ 0", "180 H", quem ficou pelo caminho |
| 8 | rosa | `#FF8FB8` | o cérebro (e comida) | cérebro de lado; só comida no resto |
| 9 | creme | `#F6E3C2` | luz quente | lâmpada, areia da ampulheta |
| 10 | chocolate | `#B97A55` | papelão, madeira | caixa do dropshipping, baú |
| 11 | **laranja Claude** | `#E07A55` | construção feita com IA | os blocos que a IA constrói |
| 12 | **verde WhatsApp** | `#25D366` | comunidade | grupo, mensagens, palavra "WhatsApp" na legenda |
| 13 | **azul-dono** | `#4D8DFF` | propriedade, confiança | o dono, a escada "é nosso", os mentores em volta do aluno |
| 14 | **marrom** | `#9C6B3F` | tijolo, obra | blocos da construção da Parte 2 |

Cores de marca na mídia real: Netflix `#E50914`, check do cartão `#3DDC84`, glow do SALG `rgba(187,163,255,.8)`.

### 4.3 Regras
- **Sem amarelo vazado.** O ouro saiu dos blocos, do dono e do dinheiro (pedido do Igor de 22/10). Ele só aparece em objetos de "tesouro".
- **A cor entra na palavra.** A cor de um objeto muda no instante em que a palavra é dita (por exemplo, o dono fica azul no "dono").
- **Mistura por caractere, nunca degradê.** Para tingir aos poucos, use `ramp(t, T, d) > hash(i)`.
- **Uma cor de significado por cena**, duas no máximo.
- **Brilho de fundo sutil.** A base é `(16,16,20)`, mais por unidade: ouro `(34,26,4)`, roxo `(22,6,36)`, azul `(2,12,36)`, vermelho `(38,4,4)`, laranja `(30,14,2)` e verde `(2,26,10)`. Se o fundo parecer colorido, está forte demais.

### 4.4 Marcas da legenda
A palavra-chave sai em Inter 700 na cor da marca: `*` branco · `^` roxo `#BBA3FF` · `~` azul `#93BCFF` · `!` dinheiro, **verde** `#5BE39A` (era ouro até a v3; trocado na v7 pela regra do sem-amarelo) · `+` verde `#5BE39A` · `&` vermelho `#FF7A70` · `=` laranja `#FFB07A` · `W` verde WhatsApp `#25D366`. Use no máximo duas por frase. As marcas são definidas em `KEYMARK` (Hook) e `MARKS` (Parte 2).

---

## 5. Tipografia e elementos fixos da tela

Fontes (OFL, em `fonts/`): **Inter** 300/400/700, **JetBrains Mono** 400/500/700, **Instrument Serif** itálico (reserva).

| elemento | valores |
|---|---|
| **Legenda** | Inter 54 px; palavra comum 400 `#CDCDD3`, palavra-chave 700 na cor da marca; y = 1580; cada palavra sobe 14 px e aparece em 0,2 s (`cubicOut`) no instante em que é dita. Blocos de até 4 palavras / 22 caracteres; quebra em pontuação ou em pausa > 0,6 s. A última legenda de cada parte sai 0,3 s depois da fala (para não sobrepor na emenda) |
| **Selo do topo (HUD)** | pílula em y 128, altura 40, raio 20, contorno `#CFCFD6` a 50%; mono 500 19 px, espaçamento 5 px, `NN · NOME`; o texto se decodifica em 0,5 s quando a seção muda |
| **Cantoneiras** | 4 "L" a 56 px das bordas, braços de 26 px, traço 1,5 px, branco a 22% |
| **Callout** | ponto que "estala", linha de 1,4 px e rótulo mono 21 px que se decodifica; entra em 0,45 s e sai em 0,35 s |
| **Rótulo (`lbl`/`L`)** | mono 700 18–44 px, caixa alta, espaçado; decodifica ao entrar |
| **Lettering cinético (`C6.kinetic`)** | Inter 800, **sem tarja**: cada letra cai, cresce e assenta; um halo escuro suave garante a leitura sobre vídeo ou ASCII. Nunca fica sobre o elemento principal. É o padrão sobre vídeo desde a v7 ("CONSTRUIR / EXIGE UMA COISA", o celular do Vitor, o "43 MIN") |
| **Lettering com placa (`C6.plate`)** | Inter 800 ou mono, 22–92 px, com placa `rgba(8,8,10,.82)` e raio de 0,35 × o tamanho. Só para texto sobre ASCII cheio ("PROSPECÇÃO", "TODO MÊS"…) |
| **Contador** | mono 700, números tabulares; rola com `cubicOut` (1,2–2,5 s); formato brasileiro (`+ 1.000.000`, `R$ 6 MIL`) |
| **Número de impacto** | ASCII grande (`textArt`, 185–360 px) na cor do significado: `R$ 6 MIL` vermelho, `180 H` vermelho, `43 MIN` verde, `7D` verde |

Escala mínima: nada menor que 15 px no quadro de 1080 de largura.

---

## 6. O boneco (manequim articulado)

### 6.1 O que é
É um manequim de **10 ossos** (coxas, canelas, braços, antebraços, tronco e cabeça) pintado em ASCII. Cada osso é lido em grade uma vez, e o boneco é movido a cada quadro por **cinemática direta**. Ele substituiu os bustos, as silhuetas de frente e os palitos. É **quem assiste ao vídeo**: o espectador se vê nele.

Medidas (`RIG`, em unidades do boneco): tronco 112, braço 60, antebraço 58, coxa 72, canela 70, ombros ±46, quadril ±17, pescoço 12, cabeça raio 30. A altura total é ≈ **344·k** (k = escala), com o pé a `FOOT(k) = 160·k` abaixo do quadril.

### 6.2 Regras (as do Vitor, mais as do Igor)
1. **Sempre animado.** Gesto, andar, digitar, comemorar, coçar a cabeça. **Nunca parado com as mãos na frente do corpo.**
2. **Olha para onde vai.** De perfil quando anda de lado, de costas quando se afasta e de frente quando se aproxima. Para virar: costas → perfil → frente.
3. **Biomecânica real.** O pé fica plantado no chão (sem deslizar), a passada segue a distância percorrida (`walkAt`), a ~2 passos/s.
4. **Reage à frase.** Quando a onda chega, ele acena. Quando paga, pula. Quando desiste, abaixa a cabeça (`sad`). Quando escolhe, aponta.
5. **Multidão também vive.** Cada pessoa sorteia uma pose ociosa (`stand`, `talk`, `hips`, `look`) com fase própria. Numa multidão sincronizada de propósito (todos fazendo a mesma coisa), use uma pose-função sem fase.
6. **Multidão clara.** Pessoas cinza e apagadas foram rejeitadas: use branco, ou cinza só quando o significado for "anônimo".

### 6.3 Poses (`MAN_POSES` + `POSES`)
| pose | o que faz | uso típico |
|---|---|---|
| `stand`, `talk`, `hips`, `look` | ociosas, com gesto | multidão, plateia |
| `wave`, `cheer`, `jump`, `raise` | reação positiva | recebeu, pagou, deu certo |
| `point` | aponta | o arquiteto escolhendo e comandando |
| `type` | digita (antebraços na frente, dedos batendo) | equipe, programador, multidão no feed |
| `hammer`, `build` | martela, constrói agachado | pedreiro, equipe de obra |
| `carry` | carrega com as duas mãos | o tijolo |
| `reach` | estende a mão | a briga pelo $ |
| `shrug` | ombros encolhidos, palmas para cima | "não tinha nada", perdido |
| `sad` | cabeça baixa | desistiu, travou |
| `scratch` | coça a cabeça | "o problema sou eu?" |
| `walk`, `run`, `gait`, `gaitFB` | andar e correr (de frente, de costas, de perfil) | sempre com `walkAt` quando há deslocamento |

**Pose que muda num instante:** `poseAt(T, 'antes', 'depois', d)` (no Hook) ou `poseAt2` (na Parte 2). **Pose como função de t:** `rgPose: t => …`, que permite andar com o pé plantado: `walkAt(u => [x(u), y(u), escala], t0, t, 'side')`.

### 6.4 Como pôr um boneco numa cena
| função | para quê |
|---|---|
| `manT(s, seed, { pose, view, cell, k, base })` | modelo de boneco no quadro de um "busto" de escala `s` (sola na base do busto) |
| `manAt(x, y, s, seed, o)` | um boneco num lugar |
| `manFull(seed, o)` / `FULL_T` | boneco de corpo inteiro no quadro antigo de 314 px (sola em y 151) |
| `fullAt(x, y, s, { pose, side })` (Parte 2) | elemento de cena com boneco; `side: true` = de perfil; `fullBack` = de costas |
| `bustAt(tpl, x, y, k, { rgPose })` | copia um modelo (B30, B45, BUSTD_T…) para o lugar `k` de uma multidão |
| capacete | `el(g => helmet(g,0,0,34), x, yCabeça, 1, { tints: [[0, ORANGE, 1]] })`, com poses de tronco reto (`hammer`, `wave`) |

O motor posa cada ponto antes da animação da cena (`rigPoint` dentro do `makeShape`). Assim, o código que move o boneco (pular, entrar, encolher) continua funcionando com ele em pose.

---

## 7. Movimento

### 7.1 Transições entre cenas: fusão no lugar (`xf`)
- **Padrão para todas as trocas** (`KEYS.forEach(k => k.dl = 'xf')`). Cada agente se apaga onde está (primeira metade) e acende onde vai ficar (segunda metade), com atraso individual (`st`). Nada voa pela tela nem embaralha.
- **Voo** (morph de verdade) só quando o voo **é** a ideia (por exemplo, a equipe entrando no celular), marcado com `fly: true` na key. Mesmo assim, sem caracteres embaralhando em trânsito.
- Durações: fusão de `d` 0,7–0,9 s mais espalhamento `st` 0,3–0,35 s, curva `inOut`.
- **A cena pousa na palavra:** comece a key 0,1–0,3 s antes da palavra-chave.

### 7.2 Vida interna (nada parado por mais de 2 s)
Cada cena tem pelo menos um destes:
- **respiro:** escala ±1–3% (`pulse`), flutuação ±5–12 px (`bob`), oscilação ±0,04–0,25 rad (`wob`);
- **mecânica:** ponteiros girando, areia escorrendo, ciclo rodando, barra enchendo e zerando, olho piscando e olhando em volta;
- **o boneco em pose** (§6);
- **entradas escalonadas:** `dropIn`/`popAt` com `backOut` (0,25–0,45 s), uma peça por vez (os tijolos caem um a um, os cards entram um a um);
- **luz:** `flash(t, T)` no instante da palavra, pulsos de brilho em quem recebe.

### 7.3 A câmera fica parada; o movimento vem do ASCII
`camAt(t)` devolve sempre `{ x: 0, y: −40, z: 1 }`. Sem zoom, pan, rotação ou tremida. Quando a cena pede movimento de câmera (o Igor pediu "um jogo de câmera" na multidão de 0:10), ele é feito **dentro da forma**:
- **Avanço (push-in):** escala as posições de 1 → 1,12 ao longo da cena.
- **Parallax:** desloca as fileiras da frente mais que as do fundo.
- **Perspectiva 3D:** `proj(X, Z, cx, cz)` com uma "câmera" própria da forma (multidão que começa perto e recua, `repCam`).
- **Zoom para dentro do objeto:** troca para um close (o busto grego no "arquiteto") e volta.

### 7.4 Curvas e durações
| curva | uso |
|---|---|
| `expoOut` | estalo que pousa |
| `cubicOut` | palavras, linhas, contadores |
| `inOut` | fusões, passagens, deslocamentos |
| `backOut` | entrada de peça, pop, crown que pousa |
| `quadIn` | queda, lançamento (o foguete acelera e sai da tela) |
| `sine` | fade do Vitor |

> **Cuidado:** `ramp(t, t0, d)` já aplica `cubicOut` por padrão. Para uma rampa linear (rolagem de página, scroll), passe `E.lin`.

### 7.5 Ritmo
- Alterne **estalo** (0,5–0,8 s) com **contemplação** (1–1,5 s) e **respiro** (cena quase vazia).
- Depois de cada pico (impacto, briga, preço), venha um respiro.
- Cenas muito curtas (< 2 s) pedem **um elemento só, com ênfase**: no "recebe uma vez", foi só o relógio pulsando.

---

## 8. Mídia real

### 8.1 Princípios
- **O produto real é real:** telas do SALG, o app, a landing, o material da aula, as aulas novas, as capas das trilhas, a logo ATS. Nada redesenhado em ASCII.
- **Granulado e micro-blur em tudo** (`grain` 0,22–0,36, `blur` 0,3–0,6), para casar com o ASCII.
- **Telas em 3D:** `panel3(x, y, z, w, h, ry, rx)` + `mediaQuad` (imagem) ou `C6.quadWin` (uma janela de uma imagem longa ou de um b-roll vertical). Entram girando (ry de ~0,9 → ~0,1) e flutuam (`0,05·sin`).
- **Tela que liga** (`C6.screen` com `on`): uma linha branca se abre na vertical, a imagem estoura de brilho e assenta. É assim que a TV entra.
- **B-roll de fundo:** em tela cheia, atrás do ASCII, com alfa 0,4–0,9 e brilho 0,7–0,85. O ASCII ou o lettering vêm por cima.
- **B-roll vertical numa tela horizontal:** recorte o centro (`vpanel` usa uma janela do quadro).
- **Logos monocromáticas, exceto Netflix, ApplyFy, SALG e WhatsApp** (essas vão com a cor real).

### 8.2 Dinheiro e pagamento (nunca "energia")
| situação | o que usar |
|---|---|
| alguém paga uma assinatura | **cartão de pagamento** `C6.pay(g, x, y, s, a, 'NETFLIX', 'R$ 55,90 · MÊS', '#E50914')` voando de quem paga até quem recebe, em arco |
| dinheiro entrando ou caindo | **cédula** `C6.bill` (verde, "R$ 100") girando |
| dinheiro dividido entre muitos | uma cédula grande que se divide em migalhas, uma para cada |
| dinheiro voltando (garantia) | cédula voltando para a carteira |
| salário saindo | cédulas do $ até cada pessoa |
| valor de algo | `$` em ASCII, **verde** (`dollar3DG`); `$` branco = pouco valor |
| perda | `$` vermelho, "R$ 0", risco vermelho |

### 8.3 Marcas e anotações
- **Check/X** (`C6.mark`): um círculo verde com check, ou vermelho com X, que pousa com `backOut`.
- **Risco premium** (`C6.strike`): linha fina vermelha com brilho, que se desenha (por exemplo, o "você não precisa ser a Netflix"). Para "anular", use dois riscos em X.
- **Glow de foco:** gradiente radial em `lighter` (verde = escolhido, luz quente = lâmpada).

### 8.4 Onde está a mídia
`partes/media_comum/` é gerado pelo `partes/prep_media.py`:
- **B-rolls** (em quadros, 30 fps): `scrollinsta`, `saindo43`, `gatinho`, `b339`, `b406`, `sistema`, `site`, `aplicativo2`, `celularvitor`, `salgclub` (este a 1280 px de largura).
- **Imagens:** `app57`, `app57_tela`, `app_broll`, `ats_logo`, `cap_spark`, `cap_forge`, `cap_apex`, `cap_claude`, `cap_hermes`, `salg_material`, `whats`, `whats_logo`, `aula1-3`, `yt1-16`, `sem1-8`, `salg_dash`, `salg_criativos`, `salg_funil2`, `salg_crm`, `salg_ranking`, `salg_scroll(_top)`, `logo_preto` + `logo_alpha` (logo ATS com o preto transparente), `cerebro` (cérebro real, fundo branco transparente), `a7d`, `live`, `whatsapp2`.
- **Vídeo HDR (iPhone em HLG):** converta para SDR antes de usar (`zscale=t=linear:npl=100,tonemap=hable,zscale=t=bt709:m=bt709:r=tv`), ou ele entra lavado. Foi o caso do vídeo do Emmanuel em 1:20.

Fontes: `imagens/`, `imagens/Broll vsl/` e `imagens/salg-landing/`. Os prints da landing foram capturados direto da salg.online com Playwright: desktop 2×, celular 3×, cookies aceitos, uma foto por rolagem. A mídia dos primeiros blocos fica em `media/` de cada projeto.

---

## 9. O narrador em cena (Vitor)

- **O que entra:** só a imagem do take, em tela cheia. O som é o do mix (o áudio do take é a própria narração).
- **Janelas** (`NARR` no comp): Hook = 11 janelas (takes 1–11); Parte 2 = 7 janelas (takes 12–18). O take 18 ganhou janela própria em [257,5; 260,1].
- **Entrada e saída:** fade `sine` de **0,35 s** na entrada (começa antes da janela) e de **0,6 s** na saída. **A cena seguinte já começa a se formar por baixo dele** enquanto ele se dissolve. Isso acabou com o "ponto preto" entre o Vitor e a animação.
- **Corte em L (v7):** a janela dele termina 0,3 s antes do fim da fala. A voz continua enquanto a imagem já saiu, e a key seguinte começa em `b − 0,05`. Nas emendas entre partes, o b-roll que abre a parte seguinte já roda por baixo dele, **sincronizado quadro a quadro** com o da outra parte (mesmo deslocamento no `PLAY`), para não haver salto na dissolução.
- **Ordem:** ele é desenhado **por cima dos rótulos, callouts e HUD** (eles somem debaixo dele) e por baixo da faixa e da legenda.
- **Lacuna:** quando o vídeo ainda não chegou (por exemplo, o celular do Vitor em 6:25–6:36), entra uma moldura tracejada com `[ VÍDEO DO CELULAR DO VITOR ]` e lettering das palavras-chave.
- **Takes:** iPhone 4K, gravados de pé, taxa de quadros variável, com sobra antes e depois. Não corte nem converta à mão: os scripts cuidam disso (§11.3).

---

# PARTE B · VÍDEO (PRODUÇÃO)

## 10. Estrutura de pastas e arquivos

```
VSL FINAL MOTION/
  DOC-ESTILO.md                  ESTE DOCUMENTO (o principal)
  GUIA-DE-ESTILO.md, NARRADOR-EM-CENA.md, VSL-V4.md, LEIA-ME.md
  _arquivo/docs-antigos/         os 3 documentos substituídos
  video/                         SÓ o filme juntado da versão atual
  imagens/                       mídia de origem (Broll vsl/, salg-landing/, capas, semanas…)
  TAKES VITOR 1-18/              os takes do Vitor
  partes/
    comum.js                     o que os dois filmes compartilham (C6: overlays, artes, poses, mídia)
    media_comum/                 b-rolls em quadros + imagens (gerado por prep_media.py)
    prep_media.py                vídeo → quadros, imagem → tamanho certo
    prep_vitor.py                take → quadros do filme (margem de 0,5 s)
    juntar.py                    junta as partes com sobreposição fluida
    hook-ao-bloco4/projeto/      o Hook (0–4:06,5 do filme)
    parte2/projeto/              a Parte 2 (do filme 4:05,4 até 8:36)
      comp.html, comp.js         o filme da parte (motor + cenas; termina na seção v6)
      vo.wav, words.json/js      voz e transcrição palavra por palavra
      vitor_takes.json           take → segundo do filme → janela
      assets/vitor/NNNNN.jpg     quadros do Vitor
      media/                     mídia própria da parte
      events.json, sfx.py, mix.wav
      render.py, peek.py
      parte.mp4                  o vídeo da parte (entra no juntar.py)
      frames/, stills/           regeneráveis
```

**Tempo da Parte 2 = tempo do filme − 245,38 s** (a emenda tem 1,15 s de sobreposição).

---

## 11. Pipeline de um filme

### 11.1 Áudio
Gravar sem música, com o mesmo microfone; o `cortar.py` encurta os silêncios (< 0,30 s vira 0,12 s; ≥ 0,30 s vira 0,20 s). O `vo.wav` sai em 48 kHz estéreo, com 0,3 s de respiro no início. A transcrição é feita com faster-whisper `large-v3` (`transcribe.py`). Corrija nomes e palavras arrastadas em `words.json` e regenere `words.js`.

### 11.2 Planejamento (beat sheet)
Para cada frase, anote o tempo, a frase, **o conceito animado**, a mídia real (se houver), a pose do boneco, a cor e **o que continua para a próxima cena**. A coluna "pose do boneco" é nova: se ela ficar vazia numa cena com gente, a cena vai sair parada.

### 11.3 O Vitor
```
python ../../../Downloads/pacote-socio/ferramentas/alinhar_takes.py vo.wav "../../../TAKES VITOR 1-18"/take* --json vitor_takes.json
#  confiança da onda ≥ 0,4 = certo; "conferir" = fala curta ou take de outra parte
#  preencha "janela" de cada take com a janela NARR correspondente ([a, null] = até o fim)
python -I ../../prep_vitor.py vitor_takes.json --videos "../../../TAKES VITOR 1-18" --dur <DUR>
```
Se o take terminar antes do fim do filme, segure o último quadro.

### 11.4 Escrever o filme
1. Escreva as cenas (`SH.nome = makeShape(...)` no Hook; `scene('nome', [el(...)])` na Parte 2) e as keys (`KEYS`, ou `K(t, 'nome', glow)`).
2. Para ajustar uma parte já existente: **edite a seção v6** no fim do comp.js. Ela redefine a cena pelo nome, e a última definição vence.
3. Sintaxe: `node -e "new Function(require('fs').readFileSync('comp.js','utf8')+require('fs').readFileSync('../../comum.js','utf8'))"`.
4. Orçamento: `python peek.py …` (§3.5).
5. Stills: `python render.py stills 9.0,10.3,…` gera `stills/sheet.png`. Olhe **depois** de a fusão terminar; no meio dela, a imagem parece bagunçada, e isso é normal.

### 11.5 Som, render e emenda
```
python render.py events && python sfx.py              # quando o tempo de uma key mudar
python render.py video --workers 7 --out parte.mp4      # só refaz os quadros que faltam (--force refaz tudo)
cd .. && cd .. && python juntar.py "../video/VSL - Completa (vN).mp4"
```
**Ajuste pontual:** apague só os quadros do trecho em `frames/` e rode `render.py video` de novo. Ele refaz só esses quadros e remonta a parte.

---

## 12. O motor, peça por peça

| peça | o que faz | valores |
|---|---|---|
| `W, H, CX, CY, FPS, DUR, N` | quadro 1080 × 1920, centro (540, 800), 30 fps, N = 40000 | |
| `TINT`, `F()`, `imgPts` | tintas, mapa de cores, leitura em grade limpa | §3, §4 |
| atlas de glifos | `CELL = 32`, 53 colunas, 2 linhas por tinta, JetBrains Mono 500 a 25 px | o atlas de 64 px fazia `+` e `=` sumirem em faixas ao reduzir para 7 px |
| `makeShape(groups, dyn)` | grupos de pontos → agentes (ordem de Hilbert); posa os bonecos (`rigPoint`) e chama a vida da cena (`dyn`) | |
| `KEYS` / `evalKey` | linha do tempo; fusão `xf` | §7.1 |
| `camAt` | câmera fixa `{0, −40, 1}`; mundo → tela: y + 840 | §7.3 |
| `NARR`, `narrAt`, `vitorLoad`, `drawVitor` | janelas, fade e quadros do Vitor carregados sob demanda (±2 quadros) | §9 |
| `PLAY`, `SEQS`, `seqImg`, `ensureMedia` | b-rolls em quadros; `PLAY.push([id, t0, t1, 0, loop])` | |
| `mediaDraw`, `mediaQuad`, `panel3` | foto 2D com grade, blur, granulado e máscara; foto em 3D | |
| `drawMediaBG` / `drawMediaWorld` | mídia de fundo / mídia no mundo (no Hook, as versões *5 + v6) | |
| `drawWorldOverlays` | rótulos, callouts, overlays vetoriais (Parte 2: `PART.over`) | |
| `renderScene` | a ordem das camadas | §3.4 |
| `window.__frame(i)` | assíncrono: espera mídia e Vitor, renderiza o quadro `i` com motion blur | |

**Determinismo:** tudo é função de `t` (sem `Math.random` no render; use `hash(i, k)`). Por isso o render paralelo e o motion blur real funcionam.

---

## 13. Biblioteca pronta

### 13.1 Artes em ASCII (para `art(desenho, escala, x, y, opções)`)
**Pessoas:** manequim (§6), capacete (`helmet`), busto grego de mármore (`greekBust`).

**Dinheiro e valor:** `dollar3DG` ($ verde com volume), `textArt('$')`, `coin$`, carteira (`walletFlat`), baú (`C6.chestBase` / `C6.chestLid`), chave (`C6.keyArt`), coroa (`C6.crown`), peão (`C6.pawn`).

**Tela e produto:** celular (`phoneArt`), TV (`C6.tvArt`), monitor (`screenArt`), laptop (`laptopArt`), navegador (`browserArt`), escudo verde (`C6.shield`), selo (`sealArt`).

**Construção:** tijolo (`brickOne`), tijolos (`bricksArt`), saco de cimento (`bagArt`), cubo iso (`cubeC`), casa em 3 partes (`houseBase/Walls/Roof`), três casas diferentes (`houseArt6`), planta (`blueprintArt`), estrutura de blocos (`buildPts`), robôs (`botArt`).

**Tempo:** relógio (`clockArt` + `handArt`), ampulheta (`hgFrame` + `hgSand`), calendário (`calArt`), dias (`tileArt`).

**Cabeça e atenção:** cérebro de lado (`C6.brainSide`), livros (`C6.book`), olho (`lidArt` + `irisArt`), lâmpada (`C6.lamp`).

**Caminho:** estrada em perspectiva (`roadArt`), placas (`signpostArt`), bandeira (`flagArt`), arco de chegada (`archArt`), escada (`stepColArt`), foguete (`rocketArt` + `flameArt`), infinito (`infArt`).

**Outros:** peças de quebra-cabeça (`pieceArt`), loja vazia por dentro (`emptyRoomArt`), ícones de ferramenta (`gearArt`, `wrenchArt`, `cloudArt`, `dbArt`), promessas (`ticketArt`, `boxArt`, `quizArt`, `linkArt`, `hypeExtra`), armadilha e pássaro (`crateArt`, `birdBody/Head`), alvo (`targetArt`), balança (`scaleArt` + `beamArt`).

### 13.2 Overlays vetoriais (`C6`, em `partes/comum.js`)
`C6.bill` · `C6.pay` · `C6.plate` · `C6.kinetic` · `C6.strike` · `C6.mark` · `C6.screen` · `C6.quadWin` · `C6.laptop` / `C6.phone` (mockups com a mídia dentro, centrados) · `C6.dart` · `C6.agent` (agentes que conversam) · `C6.play` · `vpanel` · `imgRot`.
Artes vetoriais: `C6.tvArt`, `C6.brainSide`, `C6.book`, `C6.chestBase`/`chestLid`, `C6.keyArt`, `C6.lamp`, `C6.pawn`, `C6.crown`, `C6.shield`, `C6.walletOpen`.

### 13.3 Cenas que viraram padrão (copie a ideia)
| ideia | cena de referência |
|---|---|
| algo chega a milhões | celular encolhendo para o alto + onda + multidão reagindo + avanço lento |
| todo mundo paga | TV ligando com b-roll + plateia de costas + cartões voando para a TV |
| o dono recebe | dono azul no centro + anel de pessoas + cartões em pulsos + logo real acima |
| tempo vendido uma vez | só o relógio, batendo como coração, ponteiros disparados, uma moeda cai |
| produto pago todo mês | celular com a tela real rolando + usuários pulando + cartões de assinatura |
| sobra pouco pra cada um | feed cheio de gente digitando em sincronia + cédula virando migalhas |
| a multidão só cresce | fileiras chegando + recuo + contador `+ 1.000.000` |
| novidade / recomeço | o boneco corre atrás do NOVO, a barra enche e zera, ele volta de cabeça baixa |
| informação sem dinheiro | cérebro de lado + livros entrando + $ vermelho vazio |
| o que poucos perceberam | chave que entra no baú, a tampa abre e as cédulas sobem com luz verde |
| quem entende o jogo | peão sólido + coroa caindo, girando e pousando com quique |
| sozinho não chega | estrada vertical até o horizonte, um boneco de costas encolhendo e parando |
| não está sozinho | pessoas se aproximando em anel + balões ("bora!", "te ajudo") |
| quem dá certo × quem fica | duas estradas, uma acesa verde e outra que acaba; um andando em cada |
| acompanhamento é o centro | aluno no centro + três mentores azuis em órbita ligados por linhas + comunidade |

---

## 14. Som (`sfx.py`)

- A trilha é **sintetizada a partir de `events.json`**, que o comp.js exporta: a fusão de cada key vira um whoosh, e a entrada de cada elemento vira um pop. Os eventos extras ficam em `EVENTS2` (Hook) ou `EV(...)`/`PART.ev` (Parte 2): `pop`, `coins`, `chime`, `thud`, `impact`, `scan`, `ticks`, `knocks`, `wave`, `loss`, `swell`, `murmur`, `tension`, `bloom`, `sparkle`, `slice`, `dim`.
- A cama é feita de drone (55/82/110 Hz) e ar. A trilha passa por uma sala única (reverb de 1,4 s) e faz **ducking** sob a voz (até 45%). O master usa `loudnorm I=−14 TP=−2,2`. **O alvo no MP4 é −14 LUFS, com pico ≤ −1,5 dB.**
- **Mudou o tempo de alguma key? Regere** `render.py events` e `sfx.py`. Para não mudar os outros sons, use um gerador aleatório próprio para os sons novos.
- Na emenda entre as partes, a trilha que sai desce ao longo da sobreposição e a que entra sobe em 0,2 s, para a primeira palavra não sair baixa.

---

## 15. Render, emenda e entrega

- **Render:** Playwright + Chromium headless, 7 workers, motion blur real (K médio ≈ 2,3), PNG por quadro, encode `libx264 -preset slow -crf 14`, áudio `mix.wav` em AAC 256 kbps.
- **Emenda entre partes (`juntar.py`):** três partes (Hook, Parte 2 e Parte 3 do Emmanuel, que entra pronta), com sobreposição de **1,15 s** em cada emenda. Na imagem, o Vitor se dissolve enquanto a abertura da Parte 2 (um b-roll que já corria por baixo dele) se forma por cima, de vídeo para vídeo. No som, a trilha que sai desce e a que entra sobe em 0,2 s. A sobreposição é escolhida para a pausa entre a última fala de uma parte e a primeira da outra ficar em ~0,6 s. **Nunca cole uma parte na outra sem transição.**
- **Entrega:** em `video/` fica **só** `VSL - Completa (vN).mp4`. As versões antigas são apagadas assim que a nova sai. O vídeo de cada parte fica no projeto dela (`parte.mp4`).
- **Limpeza:** os `frames/` ficam até a aprovação final (para os ajustes pontuais saírem rápidos). Depois, apague.

---

## 16. QA, problemas conhecidos e tempos

### 16.1 Antes de entregar
- [ ] Cada troca de cena é fusão; nenhum buraco preto, nem na entrada nem na saída do Vitor.
- [ ] Nenhuma cena parada por mais de ~2 s; todo boneco em pose.
- [ ] Nenhuma nuvem ou chuvisco; nenhuma cena acima de N.
- [ ] Sem amarelo fora de coroa, chave e baú; dinheiro em cédula ou cartão; dono azul.
- [ ] Nenhum texto cortado; lettering sobre vídeo sem tarja e sem cobrir o principal; placa só sobre ASCII cheio.
- [ ] Rótulos antigos não sobram por cima de cena nova (`dropLbl` na Parte 2).
- [ ] Legenda sincronizada, com marcas certas (ApplyFy, SALG, "pra", WhatsApp verde).
- [ ] Mídia real com granulado; logos certas.
- [ ] Som em −14 LUFS no MP4; eventos regerados se o tempo mudou.
- [ ] Quadros conferidos no MP4 final; emenda conferida; assistido com som.

### 16.2 Problemas conhecidos
| sintoma | causa | solução |
|---|---|---|
| objeto com lado sumido, linhas faltando | atlas de 64 px reduzido a 7 px; traço fino cai entre os pixels | atlas de 32 px (já está) |
| objeto apagado na textura limpa | lado escuro virou `.`/`:` | piso da rampa em `=` e `li = lum^0,6·1,12` (já está) |
| texto com faixa quebrada | degradê ou faixa de brilho no `textArt` | cor chapada no modo limpo (já está) |
| "IA"/"?" cortado no topo | passou do canvas de desenho de 1100 | `{ h: 1300–1400 }` ou desça o y |
| painel 3D vazio ou listrado | sombra (`shadowBlur`) aplicada em cada faixa, ou recorte de imagem muito alta | `C6.quadWin` zera a sombra e copia a janela para um canvas pequeno (já está) |
| rolagem rápida demais | `ramp` usa `cubicOut` por padrão | `ramp(t, t0, d, E.lin)` |
| imagem comum não carrega | caminho relativo errado | `C6.IMG = '../../../../media_comum/img/'` (de `media/img/`), `C6.DIR = '../../../media_comum/'` (de `media/`) |
| `Identifier … has already been declared` | nome novo igual a um `const` do comp.js | use nome novo (`houseArt6`) ou o namespace `C6` |
| rótulos por cima do Vitor | Vitor desenhado antes dos overlays | Vitor depois do HUD (já está) |
| legenda de uma parte sobre a da outra na emenda | última legenda até o fim da parte | última legenda sai 0,3 s após a fala (já está) |
| "thinned" no console | cena acima de N | dividir a cena ou subir N |
| `Fontconfig error` no terminal | aviso do Chromium no Windows | inofensivo |
| render para de avançar e não sai nada no log | a página do Hook leva mais de 30 s para abrir com vários workers; o worker estoura o tempo, morre e o principal espera para sempre | `goto(..., timeout=240000)` e `q.get(timeout=300)` no `render.py` (já está). Retome sem `--force`: ele só refaz os quadros que faltam |
| vídeo real lavado, sem contraste | vídeo HDR (HLG) lido como SDR | converter para SDR antes (§8.4) |

### 16.3 Tempos de referência (esta máquina)
Render do Hook (7.396 quadros): ~35–40 min. Parte 2 (8.119): ~40 min. Emenda: ~10 min. Stills (20): ~1 min. Um trecho de 2 s: ~1 min mais a remontagem.

---

# PARTE C · CARROSSEL

## 17. Do filme para o carrossel

**Um carrossel é o filme congelado:** cada slide é uma cena, e deslizar o dedo faz o papel do tempo. Valem todas as regras da Parte A. As diferenças:

| item | valor |
|---|---|
| formato | **1080 × 1350 (4:5)**, sRGB, todos do mesmo tamanho, 7 a 10 slides |
| zona segura | x 72–1008, y 72–1278; na capa, nada essencial a menos de 34 px das laterais (miniatura 3:4 do perfil) |
| centro do símbolo | (540, 640); zona do símbolo de y 170 a 1000, até 760 px de largura |
| selo | pílula em y 96 + contador `03/09` à direita (mono 19 px) |
| cantoneiras | a 48 px das bordas, braços de 24 px |
| frase | Inter 700/400, **64 px** (capa: 84 px), até 2 linhas e 14 palavras, a partir de y 1090, com faixa escura de y 960 a 1350 |
| lettering | `C6.plate`, como no filme (placa escura) |
| tamanho mínimo | 20 px |

**O que muda com o Campo Vivo:**
- A **textura é a limpa** (grade de 4 px). Num slide parado, o símbolo convence pela densidade e pela luz, sem movimento: escolha o quadro em que a cena **pousou**, não o do meio da fusão.
- **O boneco dá a ação congelada.** Escolha o quadro do auge da pose (o pulo no ar, o dedo apontando, a cabeça baixa).
- **Mídia real entra no slide** do jeito do filme: o print do SALG numa tela 3D com granulado, a logo real, a cédula, o cartão de pagamento.
- **Continuidade entre slides:** o mesmo objeto reaparece transformado no mesmo lugar (a planta vira a casa), ou atravessa a borda (desenhado numa tela de 2160 px e cortado ao meio). No máximo duas travessias por carrossel.
- **Arco padrão:** capa (gancho) → 2–3 problema → respiro → 3 solução em passos → resultado (verde) → CTA.

**Produção (caminho rápido):** gere stills do filme nos instantes certos e recorte em 4:5:
```
python render.py stills 44.2,59.4,72.6,…
ffmpeg -i stills/t044.20.png -vf "crop=1080:1350:0:170" slide02.png
```
Depois, componha o selo, o contador, as cantoneiras e a frase por cima (Figma ou Canva) e exporte em PNG (`slide01.png…`) com `legenda.txt` (legenda do post, texto alternativo e até 5 hashtags). Para um carrossel do zero, peça o modo carrossel do motor (tela larga de `1080 × nSlides` por 1350, uma forma num instante por slide).

**Checklist:**
- [ ] Capa legível na miniatura.
- [ ] Cada slide tem um símbolo que conta a ideia sem o texto.
- [ ] Cada passagem carrega algo.
- [ ] Pelo menos um respiro.
- [ ] Sem amarelo.
- [ ] Texto com contraste.
- [ ] Nenhum número inventado.
- [ ] Revisado num celular de verdade.

---

# PARTE D · LANDING PAGE

## 18. Do filme para a web

### 18.1 Equivalências
| no filme | na página |
|---|---|
| um plano só | rolagem contínua, sem cortes visuais entre seções |
| cena (frase = símbolo) | seção (argumento = símbolo do campo ASCII) |
| fusão `xf` | ao entrar a seção (55% visível), o campo funde para a forma nova |
| legenda palavra por palavra | headline cinética: cada palavra sobe ~6 px em 0,2 s, de 60 a 90 ms entre elas |
| selo do topo | rótulo `NN · NOME` fixo (sticky), que decodifica ao trocar |
| mídia real em 3D | prints do produto em cards com leve perspectiva e granulado; nada de mockup genérico |
| boneco | ilustração do manequim em ASCII, ou vídeo curto renderizado pelo motor (`webm`/`mp4` sem som, em loop) |
| cédula / cartão | os mesmos componentes vetoriais (§8.2) em SVG |
| câmera parada | sem scroll-jacking; o campo reage, o usuário controla |
| som | **nunca automático** |

### 18.2 Tokens CSS
```css
:root{
  --bg:#050506; --bg-raise:#0B0B0D; --bg-raise-2:#111114;
  --line:rgba(207,207,214,.22); --line-strong:rgba(207,207,214,.5); --scrim:rgba(5,5,6,.78);
  --text-max:#FFFFFF; --text-1:#F2F2F5; --text-hud:#E6E6EA; --text-2:#CDCDD3; --text-3:#A0A0AA; --text-4:#8A8A94; --text-5:#7C7C86;
  --valor:#3DDC84; --valor-txt:#5BE39A;          /* valor, resultado, confirmação, oferta */
  --dono:#4D8DFF;  --social:#6EA6FF; --social-txt:#93BCFF;
  --acao:#FF9B55;  --acao-txt:#FFB07A; --claude:#E07A55; --tijolo:#9C6B3F;
  --ia:#A68BFF;    --ia-txt:#BBA3FF;            /* com moderação */
  --perda:#FF5A52; --perda-txt:#FF7A70; --whats:#25D366;
  --fs-display:clamp(2.5rem,1.6rem + 4.2vw,5.5rem); --fs-h1:clamp(2rem,1.4rem + 3vw,4rem); --fs-h2:clamp(1.625rem,1.2rem + 1.9vw,2.75rem);
  --fs-lead:clamp(1.1875rem,1.05rem + .5vw,1.5rem); --fs-body:clamp(1.0625rem,1rem + .2vw,1.125rem);
  --fs-label:clamp(.6875rem,.64rem + .2vw,.8125rem); --fs-counter:clamp(2.25rem,1.6rem + 2.8vw,4rem);
  --e-out:cubic-bezier(.16,1,.3,1); --e-cubic:cubic-bezier(.33,1,.68,1); --e-inout:cubic-bezier(.65,0,.35,1); --e-back:cubic-bezier(.34,1.45,.64,1);
}
body{background:var(--bg);color:var(--text-2);font:400 var(--fs-body)/1.6 Inter,system-ui,sans-serif}
.label{font:500 var(--fs-label)/1 'JetBrains Mono',monospace;letter-spacing:.28em;text-transform:uppercase;color:var(--text-hud)}
.plate{background:rgba(8,8,10,.82);border-radius:.35em;padding:.42em .55em}   /* texto sobre campo ou vídeo */
.grain{position:fixed;inset:0;pointer-events:none;mix-blend-mode:overlay;opacity:.02;background:url(grain.png)}
.vignette{position:fixed;inset:0;pointer-events:none;background:radial-gradient(circle at 50% 50%,transparent 32%,rgba(0,0,0,.55) 75%)}
```
Mudanças em relação à página antiga:
- O **botão de oferta é verde** (`--valor`), não ouro.
- O grão caiu para **0,02**.
- O "dono" tem cor própria (`--dono`).

### 18.3 O campo ASCII na web
O mesmo princípio do filme, em canvas 2D com atlas de glifos e typed arrays. O que muda em relação ao motor antigo da web:

| parâmetro | antes | agora (limpo) |
|---|---|---|
| célula | 4–5 px | **4 px** desktop / **3 px** mobile |
| rampa | `' .·:-=+*#%@'` | `' .:=+#@'`, piso em `=` |
| brilho | `lum^0,8` + ruído | `clamp(lum^0,6·1,12)`, 6 níveis |
| opacidade | `0,38 + 0,62·li` | `0,66 + 0,34·li` |
| posição | jitter ±10% da célula | centro exato |
| caractere em trânsito | embaralha | **não embaralha**: fusão no lugar |
| atlas | 48 px | **32 px** (traço fino não some ao reduzir) |
| bloom | 0,85 | 0,4, ou só `filter: drop-shadow(0 0 4px rgba(255,255,255,.2))` |

Os agentes por dispositivo:

| dispositivo | agentes |
|---|---|
| desktop | 8–12 mil |
| mobile | 2,5–4,5 mil |
| `prefers-reduced-motion` | 0 (mostre o PNG da forma pousada) |

O núcleo da leitura limpa (troque no `imgPts` da web):
```js
const RAMP = ' .:=+#@';
const li0 = Math.min(1, Math.pow(lum, 0.6) * 1.12), li = Math.round(li0 * 5) / 5;
const ch = RAMP[Math.max(3, Math.min(6, Math.round((0.3 + 0.7 * li) * 6)))];
pts.push({ x: cx + cell / 2 - w / 2, y: cy + cell / 2 - h / 2, a: 0.66 + 0.34 * li, c: CI[ch], t, s: 1.75 / 1.55 * (0.9 + 0.2 * li) });
// troca de seção: fusão — cada agente apaga onde está (q < .5) e acende no destino (q ≥ .5), com atraso D[i]
```
A forma é pré-calculada offline (JSON gerado pelo motor) ou em `requestIdleCallback`. O loop pausa fora da tela e com a aba oculta. O `devicePixelRatio` fica limitado a 2.

### 18.4 Componentes
| componente | estilo |
|---|---|
| selo de seção | pílula 32 px, contorno `--line-strong`, mono caixa alta, decodifica em 0,5 s |
| headline | Inter 700, palavra-chave na cor do significado (marcas §4.4), entrada palavra por palavra |
| botão primário | `--acao`, texto `--bg` Inter 700, raio 999 px, 52–56 px de altura |
| botão de oferta | `--valor`, texto `--bg`, brilho verde no hover (**só** na seção de oferta) |
| botão secundário | contorno, mono caixa alta |
| card de produto | `--bg-raise`, contorno 18%, raio 20 px; **o print real** dentro, com granulado e leve perspectiva (`transform: perspective(1200px) rotateY(-8deg)`) |
| prova / número | contador mono 700 tabular; só número real |
| pagamento | o cartão de pagamento (§8.2) em SVG animado de quem paga até quem recebe |
| depoimento | **não usar depoimento fake**; prova = produto real funcionando |
| WhatsApp / comunidade | logo real + bolhas chegando, palavra "WhatsApp" em `--whats` |
| FAQ | Inter 700 a pergunta, 400 a resposta; o `+` decodifica para `−` |

**Nunca:** botão vermelho, degradê colorido, ícone de stock, emoji como ícone, mockup genérico no lugar do print real, amarelo.

### 18.5 Estrutura de página (seções como cenas)
| # | seção | campo / mídia | cor |
|---|---|---|---|
| 1 | hero: a pergunta | símbolo do gancho | neutro |
| 2 | o problema | multidão do feed, $ dividido em migalhas | vermelho / cinza |
| 3 | respiro | uma frase sozinha | — |
| 4 | o mecanismo (a camada / o arquiteto) | casa em 3 partes, busto, planta | laranja / azul |
| 5 | a prova | prints reais do SALG em 3D, dono azul recebendo | azul-dono |
| 6 | como funciona | 7D: escada + primeiro passo; site, app e sistema reais | verde |
| 7 | a comunidade | WhatsApp real, pessoas em volta | verde WhatsApp |
| 8 | oferta | garantia (escudo verde), preço | **verde** |
| 9 | CTA | botão de oferta | verde |
| 10 | FAQ / rodapé | poeira | neutro |

### 18.6 Acessibilidade e performance
- Contraste do corpo: no mínimo `#CDCDD3` (~12,8:1).
- O canvas leva `aria-hidden`, com todo texto em HTML.
- Com `prefers-reduced-motion`, a página fica estática.
- Foco visível: `outline: 2px solid #F2F2F5`.
- A headline (LCP) aparece antes do campo.
- Fontes com `font-display: swap`, e o atlas só depois de `document.fonts.ready`.
- O orçamento de quadro é de 16 ms; meça.

---

# PARTE E · REFERÊNCIA

## 19. Histórico de decisões

- **18/10:** "Campo de 6 mil" (Hook C) aprovado. Vitor em cena, disposição A.
- **19/10:** estilo realista (Confeiteira v4), padrão para reels.
- **21/10:**
  - VSL v5 com dotwork, 3D e mídia real.
  - O Igor rejeita palitos, $ chapado, bolso virado, pessoas cinza, elementos escuros e blocos dourados.
  - Pede logos reais, granulado, verde no lugar do dourado e nada parado por mais de 2 s.
- **22/10, manhã:** pacote do Emmanuel portado (textura limpa, `xf`, câmera parada, manequim, N = 40000). Takes do Vitor no Hook (v7) e na Parte 2 (v2). "O novo estilo está bem mais agradável."
- **22/10, noite:**
  - O Igor pede ~80 ajustes. Nasce a seção v6 (`comum.js`, `media_comum`), junto com:
    - cédulas e cartões;
    - dono azul;
    - laranja Claude e marrom;
    - lettering com placa;
    - TV ligando e telas 3D;
    - prints novos da salg.online;
    - boneco em pose em todas as cenas;
    - fade longo do Vitor;
    - reformulação completa de 4:54–5:07, 5:52–6:02, 7:29–7:56 e 8:13–8:36.
  - Regra: "as partes juntas têm que ser fluidas, não coladas seco" (`juntar.py`).
- **23/10:** v3 juntada (8:36). Este documento substitui os três anteriores.
- **23–24/10, rodada v7 (~40 ajustes) e VSL completa (v4):**
  - **Vitor e emendas**: o Vitor sai com fade mais longo (0,6 s) e em corte em L: a voz continua e ele sai antes. Na emenda Hook → Parte 2, o b-roll seguinte já corre sob ele, sincronizado quadro a quadro.
  - **Mídia**:
    - prints e apps vão dentro de mockups (notebook, celular, TV), centrados e grandes;
    - letreiros sem tarja preta, sem cobrir nada relevante;
    - o vídeo do Emmanuel (HDR) é convertido para SDR antes do recorte.
  - **Boneco**: o capacete de arquiteto acompanha o osso da cabeça em todas as cenas.
  - **Cor**: destaques "!" da legenda (dinheiro) passam de ouro para verde.
  - **Ordem de carga**: imagens carregam antes de montar as cenas.
  - **Parte 3**: entra a Parte 3 do Emmanuel (v12) como terceira parte. Comparativo em `ESPEC - Parte 3 do Emmanuel vs nossas partes.md`.

## 20. Pedidos prontos para o Claude

**Ajuste pontual num filme:**
> "No minuto M:SS do filme juntado vN, <o que está errado>. Siga o DOC-ESTILO.md: ache a parte e a cena, ajuste na seção v6, mostre stills, re-renderize só o trecho e gere a vN+1 com o juntar.py."

**Bloco novo de VSL:**
> "Tenho o áudio de <bloco>. Crie o projeto, transcreva, monte o beat sheet com conceito animado, mídia real e pose do boneco por frase, alinhe os takes do Vitor e produza no estilo Campo Vivo do DOC-ESTILO.md."

**Carrossel:**
> "Faça um carrossel de 9 slides sobre <tema> seguindo a Parte C do DOC-ESTILO.md, usando stills da v3 quando servirem e mídia real do SALG."

**Landing page:**
> "Construa a landing de <oferta> seguindo a Parte D do DOC-ESTILO.md, com o campo ASCII limpo, os prints reais do SALG e o botão de oferta verde."

## 21. Glossário

| termo | significado |
|---|---|
| **Campo Vivo** | o estilo: ASCII limpo + mídia real + boneco articulado |
| agente | um caractere do campo; nunca sai do filme |
| forma / cena | o conjunto de destinos dos agentes (`SH.nome`) e a vida deles (`dyn`) |
| fusão (`xf`) | troca de cena em que cada agente apaga onde está e acende onde vai |
| vida interna | o movimento de uma cena parada |
| textura limpa | grade de 4 px, 6 tons, piso em `=`, sem jitter |
| manequim | o boneco de 10 ossos; `rgPose` é a pose de cada um |
| `walkAt` | andar com o pé plantado, com a passada pela distância |
| placa | o fundo escuro atrás de um lettering (`C6.plate`) |
| seção v6 | o fim de cada comp.js, onde ficam os ajustes do Igor (a última definição vence) |
| `media_comum` | a mídia compartilhada entre as partes |
| emenda | a passagem entre duas partes do filme (`juntar.py`, sobreposição de 1,15 s) |
| janela do Vitor | trecho do filme em que o take dele aparece (`NARR`) |
| lacuna | lugar reservado para um vídeo que ainda vai chegar |
