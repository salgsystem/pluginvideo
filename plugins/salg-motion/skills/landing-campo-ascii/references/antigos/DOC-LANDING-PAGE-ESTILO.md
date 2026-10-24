# Documentação de estilo para landing page: "Campo ASCII"

> Como levar o estilo dos vídeos (VSL Hook C/D e reel Confeiteira) para uma landing page, com cada decisão explicada e cada valor exato.
> Os valores vêm do código real dos vídeos (`_motor/comp_realista.js`). Os números do vídeo são em pixels de um quadro de 1080 × 1920; a conversão para a web está em cada seção.
> Documentos irmãos: `GUIA-DE-ESTILO.md` (guia dos vídeos) e `DOC-PRODUCAO-VIDEOS.md` (produção completa dos vídeos).
> Referências visuais: `reel-confeiteira/referencias/confeiteira-quadros-chave.png` e `reel-confeiteira/referencias/confeiteira-*.png`.

---

## Sumário
1. A essência em 10 regras
2. Do vídeo para a web: tabela de equivalências
3. Cores: tokens, significados e regras
4. Tipografia
5. Layout, grade e espaçamento
6. Fundo e textura (as 6 camadas)
7. O Campo ASCII: o elemento-assinatura (conceito e código)
8. Componentes
9. Movimento e interação
10. Texto, voz e marcação de palavras-chave
11. Ilustração e iconografia
12. Estrutura de página sugerida (seções como "beats")
13. Acessibilidade
14. Performance
15. Arquivos, fontes e assets
16. Checklist final
17. Anexo: CSS base completo

---

## 1. A essência em 10 regras

1. **Tudo é feito do mesmo material.** No vídeo, milhares de caracteres ASCII (`. · : = + * # % @`) nunca saem de cena: a cada frase eles se reorganizam para formar o símbolo do que está sendo dito. Na página, o mesmo campo de caracteres acompanha a rolagem e se transforma de seção em seção.
2. **Nada corta, tudo se transforma.** A passagem entre seções nunca é um corte seco nem um "slide novo". Algo da seção anterior sobrevive e vira a próxima (o "$" vira um bolso, o bolo vira etiqueta, o cursor vira o app).
3. **A ideia mora no desenho.** O símbolo precisa contar a frase sozinho. O texto reforça; não substitui.
4. **Preto quente, nunca preto puro.** O fundo é `#050506`. Nunca `#000000`.
5. **Elemento pequeno, fundo grande.** Muito preto em volta; o símbolo ocupa o centro, não a tela inteira.
6. **Cor só com significado.** Branco é o padrão. Ouro = dinheiro; verde = prosperidade; roxo = IA/conhecimento; azul = social/alcance; laranja = ação/construção; vermelho = perda; cinza = anonimato. Nunca cor como enfeite.
7. **O único estouro de cor é no fim.** Ouro e verde juntos aparecem uma vez, no fechamento (no vídeo: "solução viável"; na página: a seção de oferta/CTA final).
8. **Ritmo variado, com respiro.** Seções densas alternam com seções quase vazias (um cursor piscando no escuro, uma frase sozinha). O respiro faz os picos pesarem.
9. **Interface com textura de terminal, legibilidade de produto.** Rótulos em mono, caixa alta e espaçados; texto corrido em Inter, limpo e grande.
10. **Números só reais.** Contadores e dados só quando são verdadeiros; se for ilustrativo, que pareça claramente ilustrativo (uma "tela de exemplo").

---

## 2. Do vídeo para a web: tabela de equivalências

| no vídeo | na landing page |
|---|---|
| Filme de um plano só (onetake) | Página de rolagem contínua, sem cortes visuais entre seções |
| Beat (uma frase = uma forma) | Seção (um argumento = um símbolo do campo ASCII) |
| Tempo `t` | Progresso da rolagem / entrada da seção na tela |
| Morph entre formas | Transição do campo quando a seção entra (IntersectionObserver) |
| Legenda palavra por palavra | Headline cinética: palavras sobem 14 px (vídeo) / ~6 px (web) e aparecem em sequência |
| Selo do topo (HUD) `01 · A PERGUNTA` | Rótulo da seção, fixo no topo (sticky), que "decodifica" ao trocar |
| Cantoneiras de enquadramento | Marcas de canto fixas na viewport (decorativas) |
| Callout (ponto + linha + rótulo mono) | Anotações sobre ilustrações, prints e dados |
| Contador que rola (`R$ 0,00`, `6.000`) | Números de prova que rolam ao entrar na tela |
| Câmera operada (empurra, abre, flutua) | Leve parallax/zoom do campo; flutuação de ±5 px |
| Brilho central que muda de cor por beat | Gradiente radial atrás do campo, cor da seção atual |
| Respiro (cena quase vazia) | Seção com uma frase sozinha e muito espaço |
| Estouro final ouro + verde | Seção de oferta / CTA final |
| Trilha sintetizada | **Sem som automático na página.** Som só por ação do usuário |

---

## 3. Cores: tokens, significados e regras

### 3.1 Fundo e superfícies
| token | hex | uso |
|---|---|---|
| `--bg` | `#050506` | fundo de tudo (preto quente) |
| `--bg-raise` | `#0B0B0D` | superfície levemente elevada (cards, campos) |
| `--bg-raise-2` | `#111114` | hover de card, dropdown |
| `--line` | `rgba(207,207,214,0.22)` | contornos finos (o vídeo usa `#CFCFD6` a 22% a 50%) |
| `--line-strong` | `rgba(207,207,214,0.5)` | contorno do selo/pílula e de cards em foco |
| `--scrim` | `rgba(5,5,6,0.78)` | faixa escura atrás de texto sobre o campo |

### 3.2 Texto (níveis de cinza, do mais forte ao mais fraco)
| token | hex | uso no vídeo | uso na web |
|---|---|---|---|
| `--text-max` | `#FFFFFF` | palavra-chave branca, títulos de interface | títulos H1/H2, botão |
| `--text-1` | `#F2F2F5` | glifo branco padrão, rótulos ativos | texto de destaque |
| `--text-hud` | `#E6E6EA` | texto do selo do topo | rótulos sticky |
| `--text-2` | `#CDCDD3` | palavras comuns da legenda (a 92%) | **corpo de texto** |
| `--text-3` | `#A0A0AA` | callouts secundários, rótulos da roleta | texto auxiliar, legendas de imagem |
| `--text-4` | `#8A8A94` | rótulos de contador ("NO SEU BOLSO") | metadados, notas |
| `--text-5` | `#7C7C86` | cinza de anonimato, placeholder | placeholder, desativado |

### 3.3 Cores com significado (glifo = cor no campo ASCII; texto = cor quando é palavra)
| nome | glifo | texto | significado | quando usar na página |
|---|---|---|---|---|
| Branco | `#F2F2F5` | `#FFFFFF` | neutro, o padrão | quase tudo |
| **Ouro** | `#F2C14E` | `#F5CB62` | dinheiro, valor, posse | preço, ganho, "seu", "próprio", "dono" |
| **Verde** | `#3DDC84` | `#5BE39A` | prosperidade (misturado ao ouro, ~25%) | confirmação de ganho, "pago", o fechamento |
| **Roxo** (marca) | `#A68BFF` | `#BBA3FF` | IA, conhecimento oculto | tudo sobre IA, o "mecanismo", a "camada que ninguém mostra" |
| **Azul** (marca) | `#6EA6FF` | `#93BCFF` | social, feed, massa, alcance | redes sociais, WhatsApp, "milhões", audiência |
| **Laranja** (marca) | `#FF9B55` | `#FFB07A` | ação, construção | o que está sendo construído; **botão de ação** |
| Cinza | `#7C7C86` | `#7C7C86` | anonimato, commodity | a multidão, "todo mundo faz", o que é genérico |
| **Vermelho** | `#FF5A52` | `#FF7A70` | perda, conflito | prejuízo, "nada", "ninguém", o problema |
| Rosa (confeitaria) | `#FF8FB8` | — | doçura, carinho | **só comida/produto artesanal** (ver 3.5) |
| Creme (confeitaria) | `#F6E3C2` | — | aconchego, caseiro | **só comida/produto artesanal** |
| Chocolate (confeitaria) | `#B97A55` | — | conforto, sabor | **só comida/produto artesanal** |

### 3.4 Regras de uso
- **A cor entra no instante da palavra.** No vídeo, a cor aparece exatamente quando a palavra é dita. Na página, a cor de uma seção aparece quando ela entra na tela, não antes.
- **Uma cor de significado por bloco**, no máximo duas (ouro + verde no fechamento; roxo + azul na "camada oculta").
- **Mistura com textura, não com tinta chapada.** No campo ASCII, ouro e verde se misturam por glifo (~74% ouro, ~26% verde, sorteado por um hash estável). Nunca um degradê liso entre eles.
- **O estouro ouro + verde é único.** Reserve-o para a oferta/CTA final. Se a página inteira for dourada, o final não pesa.
- **Vermelho nunca em botão.** Vermelho é perda; um botão vermelho comunica "erro".
- **Nunca colorir só para decorar** ícones, bordas ou fundos de seção sem significado.

### 3.5 Cores de confeitaria (extensão do reel Confeiteira)
Rosa, creme e chocolate existem **só para o produto artesanal** (bolos, comida). Nunca em dinheiro, perda ou interface. Use-as se a página tiver um nicho de comida/artesanato como exemplo. Lição do vídeo: o produto colorido representa o valor do trabalho; quando o texto fala de perda ("não saber quanto ganhou"), o mesmo produto **perde a cor e fica cinza**. É o contraste mais forte que o estilo tem.

### 3.6 O brilho de fundo por seção (glow)
Atrás do campo há um gradiente radial (raio 900 px no vídeo ≈ 85% da largura da tela) cuja cor muda com o significado da seção. Valores RGB do centro do brilho (a borda é sempre transparente sobre `#050506`):

| seção sobre… | RGB no centro (intensidade máxima) |
|---|---|
| neutra | `rgb(16,16,20)` |
| dinheiro (ouro) | `rgb(50,42,24)` |
| IA (roxo) | `rgb(38,22,56)` |
| social (azul) | `rgb(18,28,56)` |
| perda (vermelho) | `rgb(54,20,24)` |
| construção (laranja) | `rgb(46,30,22)` |
| prosperidade (verde) | `rgb(18,42,30)` |
| comida (rosa) | `rgb(46,24,36)` |

Esses números vêm da fórmula do vídeo: base `(16,16,20)` + `34/26/4` por unidade de ouro, `22/6/36` de roxo, `2/12/36` de azul, `38/4/4` de vermelho, `30/14/2` de laranja, `2/26/10` de verde, `30/8/16` de rosa. A cor sobe e desce em ~0,8 s. **O brilho é sutil**: se ele parecer "colorido", está forte demais.

---

## 4. Tipografia

### 4.1 Famílias (todas OFL, uso comercial livre; arquivos em `_motor/fonts/`)
| família | pesos | papel |
|---|---|---|
| **Inter** | 300, 400, **700** | texto corrido, headlines, legendas. Palavra-chave em 700; o resto em 400 |
| **JetBrains Mono** | 400 (e 700) | rótulos, selo do topo, callouts, contadores, números, botões secundários. **Sempre CAIXA ALTA e espaçado** |
| **Instrument Serif** itálico | 400 | reserva: legendas de "arquivo", citações, depoimentos ("ARQUIVO 03") |

> Nota técnica: o vídeo pede JetBrains Mono 500, mas só os arquivos 400 e 700 estão na pasta, então o navegador usa o 400. Na web, carregue 400/500/700 do Google Fonts ou use 400 e 700 dos arquivos locais.

### 4.2 Escala no vídeo (referência de proporção, em px sobre 1080 de largura)
| uso | fonte | tamanho | espaçamento | cor |
|---|---|---|---|---|
| Legenda (palavra comum) | Inter 400 | 54 | 0 | `#CDCDD3` a 92% |
| Legenda (palavra-chave) | Inter 700 | 54 | 0 | cor do significado |
| Selo do topo (HUD) | Mono 500 | 19 | 5 px | `#E6E6EA` a 85% |
| Callout | Mono 500 | 21 | 3 px | `#EDEDF0` ou cor |
| Rótulo de contador | Mono 500 | 16–18 | 4–5 px | `#8A8A94` |
| Contador grande | Mono 700 | 40–52 | 1–2 px | cor do significado |
| Texto digitado (campo de comentário) | Inter 700 | 40 | 1 px | `#FFFFFF` |

### 4.3 Escala para a web (mobile-first, `clamp()`)
Proporção derivada do vídeo (a legenda de 54 px ocupa ~5% da largura; o selo de 19 px é ~1/3 da legenda), ajustada para leitura em tela:

| token | mobile (390 px) | desktop (1440 px) | `clamp()` sugerido | fonte |
|---|---|---|---|---|
| `--fs-display` | 40 px | 88 px | `clamp(2.5rem, 1.6rem + 4.2vw, 5.5rem)` | Inter 700, entrelinha 1.02, tracking −0.02em |
| `--fs-h1` | 32 px | 64 px | `clamp(2rem, 1.4rem + 3vw, 4rem)` | Inter 700, 1.05, −0.015em |
| `--fs-h2` | 26 px | 44 px | `clamp(1.625rem, 1.2rem + 1.9vw, 2.75rem)` | Inter 700, 1.1 |
| `--fs-lead` | 19 px | 24 px | `clamp(1.1875rem, 1.05rem + 0.5vw, 1.5rem)` | Inter 400, 1.45 |
| `--fs-body` | 17 px | 18 px | `clamp(1.0625rem, 1rem + 0.2vw, 1.125rem)` | Inter 400, 1.6 |
| `--fs-label` | 11 px | 13 px | `clamp(0.6875rem, 0.64rem + 0.2vw, 0.8125rem)` | Mono, CAIXA ALTA, tracking 0.28em |
| `--fs-callout` | 12 px | 14 px | `clamp(0.75rem, 0.7rem + 0.2vw, 0.875rem)` | Mono, CAIXA ALTA, tracking 0.18em |
| `--fs-counter` | 36 px | 64 px | `clamp(2.25rem, 1.6rem + 2.8vw, 4rem)` | Mono 700, tracking 0.02em, `font-variant-numeric: tabular-nums` |

Regras:
- **Mono é sempre caixa alta** e com tracking largo (0,18–0,3 em). Sem isso, perde a cara de "HUD".
- **Inter carrega a mensagem.** Nunca escreva parágrafo em mono.
- **Palavra-chave = Inter 700 + cor do significado**; o resto em 400 `--text-2`. É exatamente a legenda do vídeo.
- Use **números tabulares** (`tabular-nums`) em contadores, para não "pular" ao rolar.
- Números e moeda em formato brasileiro: `R$ 142,50`, `6.000`, `12 PAÍSES`.

---

## 5. Layout, grade e espaçamento

### 5.1 Herança do quadro 9:16
- No vídeo, o conteúdo vive entre y ≈ 180 e y ≈ 1380 (de 1920); a legenda fica em y = 1580; o selo em y = 128; as cantoneiras a 56 px das bordas.
- Na página, isso vira: **símbolo no centro, texto embaixo dele, rótulo no topo**. Em mobile, cada seção é praticamente um quadro do vídeo: campo ASCII em cima/centro e headline embaixo.

### 5.2 Grade
| breakpoint | colunas | margem lateral | gutter | largura máx. do conteúdo |
|---|---|---|---|---|
| < 600 px | 4 | 20 px | 16 px | 100% |
| 600–1024 px | 8 | 40 px | 24 px | 720 px |
| > 1024 px | 12 | 64 px | 24 px | 1200 px (texto corrido: 680 px) |

- **Texto corrido nunca passa de ~65 caracteres por linha** (680 px).
- Em desktop, o campo ASCII pode ficar à direita (colunas 7–12) com o texto à esquerda (1–6), ou centralizado em seções de respiro.

### 5.3 Espaçamento (escala de 4 px)
`4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128 · 160`
- Entre seções: **128–160 px** em desktop, **96 px** em mobile. O estilo pede muito preto.
- Seções de respiro: **altura mínima de 100vh** com um só elemento.
- Raio de canto: **20 px** em pílulas (selo: 40 px de altura, raio 20 no vídeo); **14–24 px** em cards; **36 px** em caixas grandes (caixa de comentário).

### 5.4 "Elemento pequeno, fundo grande"
O símbolo ocupa **40–60% da largura** da área dele, nunca 100%. Se o campo ASCII encostar nas bordas, diminua.

---

## 6. Fundo e textura (as 6 camadas)

Ordem de baixo para cima, exatamente como no vídeo:

| # | camada | valor no vídeo | na web |
|---|---|---|---|
| 1 | Fundo | `#050506` | `body { background: #050506 }` |
| 2 | Brilho central | radial, raio 900 px, cor da seção | `radial-gradient` em pseudo-elemento fixo, cor por variável CSS que muda por seção (transição de 0,8 s) |
| 3 | Poeira de fundo | 260 pontinhos `.` `·`, alfa 0,04–0,16, parallax com profundidade 0,35–0,85, deriva para cima ~8 px/s | canvas leve ou SVG com ~120 pontos (mobile) / 260 (desktop), deslocamento com o scroll × profundidade |
| 4 | O campo ASCII | ver §7 | canvas principal |
| 5 | Bloom | campo borrado a ¼ da resolução (`blur(3px)`), somado por cima com alfa 0,85 (modo *lighter*) | no canvas: segunda passada com `filter: blur()` em um canvas reduzido + `globalCompositeOperation='lighter'`; ou `filter: drop-shadow(0 0 6px rgba(255,255,255,.25))` no canvas (mais barato) |
| 6 | Grão + vinheta | grão: ruído em *overlay* a 4,5%, muda a cada quadro; vinheta: escurece as bordas até 55% (radial de 32% a 75% da altura) | grão: PNG de ruído 256 px em `mix-blend-mode: overlay; opacity: .045` (animar a posição a ~12 fps, ou estático); vinheta: `radial-gradient(… transparent 32%, rgba(0,0,0,.55) 75%)` fixo por cima de tudo |

Extra: **scrim de legibilidade**. Quando houver texto sobre o campo, uma faixa vertical de `rgba(5,5,6,0)` → `rgba(5,5,6,.78)` (a 45% da faixa) → `rgba(5,5,6,.78)` atrás do texto, como a faixa da legenda do vídeo (y 1380 → 1760).

Código pronto no §17.

---

## 7. O Campo ASCII: o elemento-assinatura

### 7.1 O que é
Um canvas com N "agentes". Cada agente é um caractere ASCII com posição, opacidade, caractere, cor e tamanho. Uma **forma** é uma lista de destinos. Quando a seção muda, cada agente viaja do lugar atual até o seu destino na forma nova. Os agentes nunca são criados nem destruídos: os que sobram **dissolvem no lugar** (andam no máximo 90 px e somem), e os que faltam **aparecem no lugar**.

### 7.2 Estilo "realista" (o padrão atual)
Os objetos não são contornos. Cada objeto é **pintado como uma ilustração** (gradientes, luz, sombra, reflexo) num canvas fora da tela e depois **lido em grade**:
- **Grade fixa** (no vídeo, 5 px por célula sobre 1080 de largura; na web, **4–5 px de tela** em desktop e **3 px** em mobile (testado: 5 px em mobile fica grosso, 2 px gera listras): a opção `cellPx` do `createField` já converte para o espaço do desenho, que é sempre 1000 × 1100).
- **Brilho da célula** → `li = brilho^0,8` (clareia os meios-tons).
- **Caractere** pela rampa: `. · : - = + * # % @` (do mais escuro ao mais claro). **A densidade do caractere carrega o tom.**
- **Opacidade** `0,38 + 0,62·li`: alta em tudo. Sombra = caractere leve, **não** glifo apagado. Com opacidade baixa, o resultado fica cinza e sem contraste (foi testado e rejeitado).
- **Tamanho do glifo** = `célula × 1,55 × (0,8 + 0,35·li)`.
- **Célula vazia** se a cobertura for < 30% ou o brilho < 0,08: o preto do desenho vira vazio, e é isso que deixa o fundo grande.
- **Cor**: pinte o objeto já nas cores de significado; cada célula pega a cor da paleta mais próxima. Para objetos com várias partes coloridas (o bolo), pinte um segundo "mapa de cores" chapado e leia a cor dele.

### 7.3 Orçamento de agentes na web
| dispositivo | agentes | célula |
|---|---|---|
| desktop potente | 8.000–12.000 | `cellPx` 4 |
| desktop comum / tablet | 5.000–8.000 | `cellPx` 4–5 |
| mobile | 2.500–4.500 | `cellPx` 3 |
| `prefers-reduced-motion` | 0: mostrar um PNG estático pré-renderizado da forma | — |

O vídeo usa 17.000 porque é renderizado offline. Na web, o limite é o frame budget (16 ms); meça (§14).

### 7.4 Gramática da transformação
| parâmetro | significado | valores |
|---|---|---|
| `d` | duração da viagem de cada glifo | 0,5–1,0 s |
| `st` | espalhamento do atraso entre glifos | 0,2–0,6 s |
| `ease` | curva | `expoOut` (estalo que pousa, padrão), `inOut` (passagem suave), `quadIn` (queda) |
| `sw` | arco lateral da trajetória | 0–200 px (dá organicidade) |
| `dl` | ordem do atraso | `radial` (do centro para fora, padrão), `top`, `bottom`, `random` |

- **Brilho de trânsito:** +0,3 de opacidade no meio da viagem (`0,3·sin(π·q)`), o que faz o "rastro".
- **Embaralhamento em trânsito:** enquanto viaja, o caractere vira um de `0 1 < > / \ | = + * # % $ ? !`, trocando ~22 vezes por segundo, e assenta no caractere final ao chegar (q > 0,9).
- **Ordem de Hilbert:** os destinos de cada forma são ordenados por uma curva de Hilbert numa caixa fixa; o agente *i* vai para o ponto *i*. Assim regiões fluem para regiões, sem caos.
- **Vida interna:** parada, cada forma respira (escala ±1%, ~0,4 Hz), a chama tremula, os balões pulsam. Nunca 100% estática.

### 7.5 Código de referência (JavaScript puro, sem dependências)
Uma versão para web do motor dos vídeos. Funciona como base; ajuste N, célula e formas.

```html
<canvas id="campo" aria-hidden="true"></canvas>
<script type="module" src="campo-ascii.js"></script>
```

```js
// campo-ascii.js — Campo ASCII para a landing page (porta do motor dos reels)
const RAMP = ' .·:-=+*#%@';
const SCR = '01<>/\\|=+*#%$?!';
const CHARS = [...new Set([...RAMP, ...SCR, 'o', '▪'])];
const CI = Object.fromEntries(CHARS.map((c, i) => [c, i]));
const TINT = ['#F2F2F5', '#A68BFF', '#6EA6FF', '#FF9B55', '#7C7C86', '#F2C14E', '#3DDC84', '#FF5A52'];
const PAL = TINT.map(h => [1, 3, 5].map(k => parseInt(h.slice(k, k + 2), 16)));
const GOLD = 5, GREEN = 6;

const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const E = {
  expoOut: p => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p)),
  inOut: p => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
  quadIn: p => p * p,
};
function hash(i, k = 0) { // determinístico: o mesmo agente sempre sorteia o mesmo
  let h = (Math.imul(i | 0, 374761393) + Math.imul(k | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296;
}
function xy2d(n, x, y) { // índice na curva de Hilbert
  let d = 0;
  for (let s = n >> 1; s > 0; s >>= 1) {
    const rx = (x & s) > 0 ? 1 : 0, ry = (y & s) > 0 ? 1 : 0;
    d += s * s * ((3 * rx) ^ ry);
    if (ry === 0) { if (rx === 1) { x = s - 1 - x; y = s - 1 - y; } const t = x; x = y; y = t; }
  }
  return d;
}

// cellPx = tamanho da célula na TELA (px CSS). A forma é desenhada num espaço de 1000 × 1100 e escalada para caber
// no canvas; a célula de leitura é convertida para esse espaço, então a densidade na tela é sempre ~cellPx.
export function createField(canvas, { N = 8000, cellPx = 4 } = {}) {
  const dpr = Math.min(2, devicePixelRatio || 1), ctx = canvas.getContext('2d');
  let W = 0, H = 0, cell = 10;
  const fit = () => Math.min(W / 1000, H / 1150);           // escala do espaço da forma para a tela
  // atlas: cada caractere em cada cor, desenhado uma vez
  const C = 48, atlas = document.createElement('canvas');
  atlas.width = CHARS.length * C; atlas.height = TINT.length * C;
  const ag = atlas.getContext('2d');
  ag.font = `500 ${C * 0.78}px 'JetBrains Mono', monospace`; ag.textAlign = 'center'; ag.textBaseline = 'middle';
  TINT.forEach((col, t) => { ag.fillStyle = col; CHARS.forEach((ch, c) => ag.fillText(ch, c * C + C / 2, t * C + C / 2 + 1)); });

  // estado dos agentes: atual (F), destino (G), saída (O)
  const mkBuf = () => ({ x: new Float32Array(N), y: new Float32Array(N), a: new Float32Array(N),
    c: new Uint8Array(N), t: new Uint8Array(N), s: new Float32Array(N) });
  const F = mkBuf(), G = mkBuf(), O = mkBuf(), D = new Float32Array(N);
  for (let i = 0; i < N; i++) { O.x[i] = (hash(i, 1) - 0.5) * 1400; O.y[i] = (hash(i, 2) - 0.5) * 1600; O.a[i] = 0.12 * hash(i, 3); O.c[i] = CI['.']; O.s[i] = 0.6; }
  let morph = null;

  // lê um desenho em grade → lista de destinos {x, y, a, c, t, s}
  function imgPts(draw, { w = 1000, h = 1100, money = false } = {}) {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const g = cv.getContext('2d', { willReadFrequently: true });
    g.translate(w / 2, h / 2); draw(g);
    const d = g.getImageData(0, 0, w, h).data, pts = [];
    for (let cy = 0; cy + cell <= h; cy += cell) for (let cx = 0; cx + cell <= w; cx += cell) {
      let R = 0, Gc = 0, B = 0, A = 0, n = 0;
      for (let y = cy; y < cy + cell; y += 2) for (let x = cx; x < cx + cell; x += 2) {
        const k = (y * w + x) * 4, a = d[k + 3] / 255; R += d[k] * a; Gc += d[k + 1] * a; B += d[k + 2] * a; A += a; n++;
      }
      const cov = A / n; if (cov < 0.3) continue;
      R /= A; Gc /= A; B /= A;
      const lum = ((0.299 * R + 0.587 * Gc + 0.114 * B) / 255) * Math.min(1, cov * 1.15);
      if (lum < 0.08) continue;
      const mx = Math.max(R, Gc, B), mn = Math.min(R, Gc, B);
      let t = 0;
      if (mx > 0 && (mx - mn) / mx > 0.25) { // cor de significado mais próxima pelo matiz
        let best = 1e9;
        PAL.forEach(([pr, pg, pb], ti) => { if (ti === 0 || ti === 4) return; const s = Math.max(pr, pg, pb);
          const dd = (R / mx - pr / s) ** 2 + (Gc / mx - pg / s) ** 2 + (B / mx - pb / s) ** 2; if (dd < best) { best = dd; t = ti; } });
      }
      const rr = hash(cx * 7 + cy, 9), li = clamp(Math.pow(lum, 0.8) + (rr - 0.5) * 0.08);
      if (money && t === GOLD && rr > 0.74) t = GREEN;
      pts.push({ x: cx + cell / 2 - w / 2, y: cy + cell / 2 - h / 2, a: 0.38 + 0.62 * li,
        c: CI[RAMP[clamp(Math.round(li * (RAMP.length - 1)), 1, RAMP.length - 1)]], t, s: 0.8 + 0.35 * li });
    }
    for (const p of pts) p.hd = xy2d(1024, clamp(((p.x + 700) / 1400) * 1024 | 0, 0, 1023), clamp(((p.y + 1000) / 2000) * 1024 | 0, 0, 1023));
    return pts.sort((a, b) => a.hd - b.hd);
  }

  // muda para uma forma nova (lista de pontos)
  function setShape(pts, { d = 0.8, st = 0.4, ease = 'expoOut', sw = 80, dl = 'radial' } = {}) {
    for (let i = 0; i < N; i++) { F.x[i] = O.x[i]; F.y[i] = O.y[i]; F.a[i] = O.a[i]; F.c[i] = O.c[i]; F.t[i] = O.t[i]; F.s[i] = O.s[i]; }
    const M = pts.length, step = M > N ? M / N : 1; // se a forma tem mais pontos que agentes, amostra uniformemente
    let mx = 1;
    for (let i = 0; i < N; i++) {
      const k = Math.floor(i * step);
      if (k < M) { const p = pts[k]; G.x[i] = p.x; G.y[i] = p.y; G.a[i] = p.a; G.c[i] = p.c; G.t[i] = p.t; G.s[i] = p.s; }
      else { G.x[i] = F.x[i]; G.y[i] = F.y[i]; G.a[i] = 0; G.c[i] = F.c[i]; G.t[i] = F.t[i]; G.s[i] = F.s[i]; }
      mx = Math.max(mx, Math.hypot(G.x[i], G.y[i]));
    }
    for (let i = 0; i < N; i++) {
      const r = hash(i, 77);
      D[i] = dl === 'radial' ? 0.75 * Math.hypot(G.x[i], G.y[i]) / mx + 0.25 * r
           : dl === 'top' ? 0.8 * clamp((G.y[i] + 600) / 1200) + 0.2 * r
           : dl === 'bottom' ? 0.8 * clamp((600 - G.y[i]) / 1200) + 0.2 * r : r;
    }
    morph = { t0: performance.now() / 1000, d, st, ease: E[ease], sw };
  }

  function step(now) {
    const m = morph; if (!m) return;
    const fr = Math.floor(now * 22);
    for (let i = 0; i < N; i++) {
      const p = clamp((now - m.t0 - m.st * D[i]) / m.d);
      if (p <= 0) { O.x[i] = F.x[i]; O.y[i] = F.y[i]; O.a[i] = F.a[i]; O.c[i] = F.c[i]; O.t[i] = F.t[i]; O.s[i] = F.s[i]; continue; }
      const q = m.ease(p);
      if (G.a[i] < 0.01 || F.a[i] < 0.01) { // saindo ou chegando: dissolve no lugar, nunca atravessa a tela
        const leaving = G.a[i] < 0.01, ql = leaving ? q : 1 - q, Bx = leaving ? F : G, Ox = leaving ? G : F;
        const dx = Ox.x[i] - Bx.x[i], dy = Ox.y[i] - Bx.y[i], dlen = Math.hypot(dx, dy) + 1e-3, mv = Math.min(dlen, 90) * ql;
        O.x[i] = Bx.x[i] + dx / dlen * mv; O.y[i] = Bx.y[i] + dy / dlen * mv;
        O.a[i] = Bx.a[i] * (1 - ql) ** 2; O.c[i] = ql > 0.3 ? CI[SCR[(hash(i, fr) * SCR.length) | 0]] : Bx.c[i];
        O.t[i] = Bx.t[i]; O.s[i] = Bx.s[i]; continue;
      }
      const dx = G.x[i] - F.x[i], dy = G.y[i] - F.y[i], len = Math.hypot(dx, dy) + 1e-3;
      const arc = m.sw * (hash(i, 5) - 0.5) * 2 * Math.sin(Math.PI * q) * Math.min(1, len / 300);
      O.x[i] = F.x[i] + dx * q - (dy / len) * arc; O.y[i] = F.y[i] + dy * q + (dx / len) * arc;
      O.a[i] = F.a[i] + (G.a[i] - F.a[i]) * q + 0.3 * Math.sin(Math.PI * q); // brilho de trânsito
      O.c[i] = q < 0.06 ? F.c[i] : q > 0.9 ? G.c[i] : CI[SCR[(hash(i, fr) * SCR.length) | 0]];
      O.t[i] = q < 0.5 ? F.t[i] : G.t[i]; O.s[i] = F.s[i] + (G.s[i] - F.s[i]) * q;
    }
  }

  function draw(now) {
    const breathe = 1 + 0.01 * Math.sin(now * 2.4);           // vida interna
    const fx = 5 * Math.sin(now * 0.61), fy = 4 * Math.sin(now * 0.53 + 2); // mão do operador
    const z = fit() * breathe;                                  // a forma cabe na área com folga
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    for (let i = 0; i < N; i++) {
      const a = O.a[i]; if (a < 0.01) continue;
      const sz = cell * z * 1.55 * O.s[i], x = W / 2 + fx + O.x[i] * z, y = H / 2 + fy + O.y[i] * z;
      ctx.globalAlpha = a > 1 ? 1 : a;
      ctx.drawImage(atlas, O.c[i] * C, O.t[i] * C, C, C, x - sz / 2, y - sz / 2, sz, sz);
    }
    ctx.globalAlpha = 1;
  }

  function resize() {
    const r = canvas.getBoundingClientRect(); W = r.width; H = r.height;
    canvas.width = W * dpr; canvas.height = H * dpr;
    cell = Math.max(4, Math.round(cellPx / fit()));          // célula no espaço da forma
  }
  new ResizeObserver(resize).observe(canvas); resize();
  let running = true;
  (function loop() { if (!running) return; const now = performance.now() / 1000; step(now); draw(now); requestAnimationFrame(loop); })();
  return { imgPts, setShape, stop: () => (running = false) };
}
```

Ligar as seções às formas:

```js
import { createField } from './campo-ascii.js';
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = matchMedia('(max-width: 600px)').matches;
await document.fonts.ready;                       // o atlas precisa da JetBrains Mono carregada
const field = createField(document.getElementById('campo'), { N: mobile ? 3500 : 9000, cellPx: mobile ? 3 : 4 });

// cada forma é um desenho sombreado (ver §11 para como pintar)
const SHAPES = {
  ia: field.imgPts(g => { g.font = "700 520px Inter"; g.textAlign = 'center'; g.textBaseline = 'middle';
    const gr = g.createLinearGradient(0, -220, 0, 220); gr.addColorStop(0, '#A68BFF'); gr.addColorStop(1, '#6a58b0');
    g.fillStyle = gr; g.fillText('IA', 0, 0); }),
  dinheiro: field.imgPts(g => { g.font = "700 760px Inter"; g.textAlign = 'center'; g.textBaseline = 'middle';
    const gr = g.createLinearGradient(0, -320, 0, 320); gr.addColorStop(0, '#F2C14E'); gr.addColorStop(1, '#8a6d2a');
    g.fillStyle = gr; g.fillText('$', 0, 30); }, { money: true }),
};
const PARAMS = { ia: { ease: 'expoOut', d: 0.8 }, dinheiro: { ease: 'expoOut', d: 0.7, sw: 140 } };

const io = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  const k = e.target.dataset.shape;
  document.documentElement.style.setProperty('--glow', e.target.dataset.glow || '16,16,20');
  if (SHAPES[k] && !reduce) field.setShape(SHAPES[k], PARAMS[k]);
}), { threshold: 0.55 });
document.querySelectorAll('[data-shape]').forEach(s => io.observe(s));
```

```html
<section data-shape="ia" data-glow="38,22,56"> … </section>
<section data-shape="dinheiro" data-glow="50,42,24"> … </section>
```

Padrões de montagem:
- **Campo fixo (`position: sticky` ou `fixed`)** atrás do conteúdo, com as seções rolando por cima: é o mais fiel ao "onetake".
- **Ou campo por seção**, se a página for longa: um canvas por bloco, ativado só quando visível (economiza CPU).
- **Pré-calcule as formas** no carregamento ociosa (`requestIdleCallback`) ou gere JSON offline com o motor dos vídeos e carregue pronto (mais rápido em mobile).

---

## 8. Componentes

### 8.1 Selo de seção (o "HUD" do topo)
- Pílula com contorno fino: altura 40 px no vídeo → **32 px web**; raio = metade da altura; contorno `1px solid rgba(207,207,214,.5)`; sem preenchimento.
- Texto: `--fs-label`, mono, caixa alta, tracking 0,28em, cor `#E6E6EA` a 85%. Formato **`NN · NOME`** (ex.: `01 · A PERGUNTA`, `05 · A CONTA`, `09 · SUA VEZ`). O ponto do meio é `·` (U+00B7) com espaços.
- **Fixo no topo** (sticky), centralizado, a ~24 px do topo.
- **Decodifica ao trocar de seção:** em 0,5 s, os caracteres resolvem da esquerda para a direita; os que ainda não resolveram mostram aleatórios de `#%&@$01<>/`; espaços nunca embaralham. Código:

```js
function decode(str, p, seed = 1) {           // p de 0 a 1
  const n = Math.floor(p * str.length); let o = '';
  for (let k = 0; k < str.length; k++)
    o += k < n || str[k] === ' ' ? str[k] : '#%&@$01<>/'[Math.floor(hash(k, seed) * 10)];
  return o;
}
function playDecode(el, str, ms = 500) {
  const t0 = performance.now(), seed = (Math.random() * 1e6) | 0;
  (function f(now) { const p = Math.min(1, (now - t0) / ms); el.textContent = decode(str, p, seed); if (p < 1) requestAnimationFrame(f); })(t0);
}
```

### 8.2 Cantoneiras
Quatro "L" finos nos cantos da viewport, `position: fixed`: a 56 px das bordas no vídeo → **20 px (mobile) / 32 px (desktop)**; braços de 26 px → **16–20 px**; traço 1,5 px branco a **22%**. Puramente decorativas (`aria-hidden`). Dão a sensação de "enquadramento de câmera".

### 8.3 Headline cinética (a "legenda" do vídeo)
- Cada palavra entra separada: **sobe ~6 px (web) e vai de 0 a 100% de opacidade em 0,2 s**, curva `cubicOut`, em sequência. No vídeo, cada palavra entra no instante exato da fala; na web, escalone **60–90 ms** por palavra (varie: palavras-chave podem segurar 150 ms antes, um respiro).
- Palavras comuns: Inter 400 `#CDCDD3` a 92%. **Palavra-chave: Inter 700 na cor do significado** (§10).
- Dispare quando a seção entra na tela, uma vez só (não repita ao rolar de volta, ou repita apenas se estiver fora da tela há mais de alguns segundos).

### 8.4 Callout (anotação)
Anatomia (tempos do vídeo):
1. **Ponto** no objeto: círculo de 4 px que "estala" (`backOut`) no primeiro terço da animação.
2. **Linha-guia** de 1,4 px que se desenha do ponto até o rótulo (`cubicOut`, ~0,28 s), e termina com uma "cauda" horizontal de 26 px.
3. **Rótulo** mono caixa alta (21 px no vídeo → `--fs-callout` web), tracking 3 px, que **decodifica** enquanto a linha chega.
4. Entrada total: 0,45 s. Saída: some em 0,35 s.
Cores: `#EDEDF0` para informação neutra; `#A0A0AA` para secundária; cor de significado quando o rótulo é o argumento (`ALGO PRÓPRIO` em ouro, `CAMADA OCULTA` em roxo).
Implementação: SVG absoluto sobre a ilustração (`<circle>`, `<path>` com `stroke-dasharray` animado, `<text>`).

### 8.5 Contador
- Mono 700, `tabular-nums`, cor do significado (`#F5CB62` para dinheiro, `#93BCFF` para alcance, `#FF6B62` para perda).
- Rola até o valor com `cubicOut` em 1,2 s (contadores grandes podem usar curva `p^2,2` em 2,5 s, que começa devagar e explode).
- Rótulo acima ou abaixo em mono 16–18 px, `#8A8A94`, tracking 4–5 px (`PESSOAS · NO MESMO DIA`, `NO SEU BOLSO`).
- Formato BR: `R$ 142,50`, `12.000.000`.
- Ticks sonoros: só se o usuário ativou o som.

### 8.6 Botões
| tipo | estilo | quando |
|---|---|---|
| **Primário (ação)** | fundo `#FF9B55` (laranja = ação), texto `#050506` Inter 700, raio 999 px, altura 52–56 px, padding 0 28 px; hover: `#FFB07A` + brilho `0 0 24px rgba(255,155,85,.35)` | o CTA principal ao longo da página |
| **Primário de oferta** | fundo `#F2C14E` → texto `#050506`; hover com leve brilho ouro/verde | **só na seção de oferta/fechamento** (o estouro de ouro) |
| Secundário | contorno `1px rgba(207,207,214,.5)`, texto mono caixa alta `#E6E6EA` tracking .2em, fundo transparente; hover: contorno 0,9 + fundo `#0B0B0D` | "ver mais", "assistir" |
| Link | Inter 400 `#F2F2F5` com sublinhado 1 px a 40%, offset 4 px | no texto |
Regras: nunca vermelho, nunca degradê colorido, nunca sombra preta (o fundo já é preto). Foco visível: `outline: 2px solid #F2F2F5; outline-offset: 3px`.

### 8.7 Cards (a partir das telas do vídeo: app, ficha do pedido)
- Fundo `#0B0B0D`, contorno `1px rgba(242,242,245,.18)`, raio 20 px, padding 24 px.
- Cabeçalho em mono caixa alta (`PEDIDO SALVO`), corpo em Inter.
- **Card em destaque/"aceso"**: contorno 0,85 de opacidade + flash rápido ao entrar (opacidade de 0,18 para 1 em 0,35 s, com um pico de +0,4 em 0,12 s), como as seções do app no vídeo.
- Card de **valor**: contorno e número em ouro, fundo com 20% de ouro escurecido (`rgba(242,193,78,.06)`).
- Ícone do card: esfera com brilho no canto superior esquerdo (`radial-gradient(circle at 35% 35%, #fff, #8a8a94 55%, #222 100%)`), 24–48 px.

### 8.8 Campo de formulário (a "caixa de comentário" do vídeo)
- Caixa com raio 36 px (grande) ou 16 px (compacto), contorno `1px rgba(242,242,245,.6)`, fundo `#0B0B0D`.
- Placeholder Inter 400 `#7C7C86`; valor digitado Inter 700 `#FFFFFF`.
- Cursor: barra branca de 4 px piscando ~1,3 Hz (no vídeo: 2,6 trocas/s).
- Avatar opcional à esquerda (esfera com silhueta).
- Erro: borda `#FF7A70` + mensagem Inter 400 `#FF7A70` (o vermelho aqui é "perda/erro", coerente).

### 8.9 Barra de progresso / status (a "barra de pagamento" do vídeo)
- Trilho com raio 16 px, fundo `rgba(242,242,245,.08)`, contorno 0,6.
- Parte concluída: degradê vertical verde `#3DDC84 → 55%` (pago, confirmado).
- Parte pendente: ouro a 32–60% (valor a receber).
- Rótulos embaixo em mono 700 18 px: `SINAL PAGO` (verde `#5BE39A`), `RESTANTE` (ouro `#F5CB62`).
- O preenchimento entra varrendo da esquerda para a direita em 0,5 s.

### 8.10 Depoimento / prova social
- Texto em **Instrument Serif itálico** (a reserva de "arquivo"), `#F2F2F5`, 22–28 px.
- Autor em mono caixa alta `#8A8A94` tracking .2em.
- Moldura tipo "ARQUIVO 0X": rótulo mono no canto, contorno fino. Fotos reais podem aparecer **pontilhadas em ASCII primeiro** e depois revelar a foto (§11).

### 8.11 Roleta / seletor (componente opcional)
Do fechamento do Confeiteira: uma roleta de segmentos alternando 50%/24% de branco, lâmpadas na borda que acendem em sequência (uma a cada 4, rodando ~9 Hz), ponteiro em cima; gira com `cubicOut` em 1,8 s e para no item escolhido, que acende. Use para "escolha seu nicho/sua profissão".

### 8.12 FAQ
- Pergunta em Inter 700 `#F2F2F5`; sinal `+`/`−` em mono à direita.
- Resposta em Inter 400 `#CDCDD3`.
- Divisória `1px rgba(207,207,214,.12)`.
- Abrir: altura com `inOut` em 0,35 s; o `+` decodifica para `−`.

### 8.13 Rodapé
Mono caixa alta pequeno, `#7C7C86`, cantoneiras ainda visíveis, muito preto.

---

## 9. Movimento e interação

### 9.1 Curvas (equivalentes em CSS)
| nome no motor | fórmula | `cubic-bezier` aproximado | uso |
|---|---|---|---|
| `expoOut` | `1 − 2^(−10p)` | `cubic-bezier(0.16, 1, 0.3, 1)` | **padrão**: estalo que pousa (morphs, entradas) |
| `cubicOut` | `1 − (1−p)³` | `cubic-bezier(0.33, 1, 0.68, 1)` | palavras da headline, linhas de callout, contadores |
| `inOut` (cúbico) | — | `cubic-bezier(0.65, 0, 0.35, 1)` | passagens suaves, abrir/fechar |
| `sine` | `−(cos(πp)−1)/2` | `cubic-bezier(0.37, 0, 0.63, 1)` | flutuação, câmera lenta |
| `quadIn` | `p²` | `cubic-bezier(0.11, 0, 0.5, 0)` | queda (algo caindo, saindo) |
| `backOut` (c1 = 1,25) | — | `cubic-bezier(0.34, 1.45, 0.64, 1)` | "pop" de ponto, balão, card |

### 9.2 Durações
| ação | duração |
|---|---|
| Palavra da headline | 0,2 s, escalonada 60–90 ms |
| Decodificação de rótulo | 0,5 s |
| Callout (entrada / saída) | 0,45 s / 0,35 s |
| Morph do campo | 0,5–1,0 s + espalhamento 0,2–0,6 s |
| Contador | 1,2 s (até 2,5 s para números grandes) |
| Cor do brilho de fundo | 0,8 s |
| Pop de card/balão | 0,22–0,3 s `backOut` |
| Hover | 0,15–0,2 s |

### 9.3 Regras de ritmo
- **Nunca no metrônomo:** não use o mesmo atraso e a mesma duração para tudo. Alterne **estalo** (`expoOut`, 0,5–0,8 s) com **contemplação** (`inOut`, 1–1,2 s) e **respiro** (seção quase vazia).
- **Depois de cada pico, um respiro.**
- **Câmera operada:** o campo nunca fica perfeitamente parado. Flutuação de duas senoides (±5 px, ±0,002 rad) o tempo todo; um leve "empurrão" (escala 1,05–1,2) em momentos íntimos; um "abrir" (0,85–0,95) em momentos de escala ("milhões").
- **Tremor de impacto:** 5 px que decaem em 0,25 s quando algo "pousa" com peso (um número, um preço). Use com parcimônia (2–3 vezes na página).
- **A câmera mira antes:** se algo vai aparecer à direita, o campo já começa a se deslocar para lá.

### 9.4 Rolagem
- Uma seção = um "beat". Troque de forma quando **55%** da seção estiver visível.
- Não prenda a rolagem (*scroll-jacking*). O campo reage; o usuário controla.
- Para seções de respiro, deixe o campo quase vazio (só poeira ou um cursor piscando).

### 9.5 Hover e foco
- Hover sutil: contorno sobe de 0,5 para 0,9; um brilho tênue na cor do componente.
- O campo pode reagir ao ponteiro (opcional): agentes num raio de 80 px se afastam 6–10 px e voltam com mola. Nunca em mobile.

---

## 10. Texto, voz e marcação de palavras-chave

### 10.1 Marcação (igual à legenda do vídeo)
No vídeo, as palavras-chave são marcadas com um símbolo antes da palavra. Use a mesma convenção no conteúdo da página (CMS/markdown → HTML):

| marca | cor do texto | significado |
|---|---|---|
| `*palavra` | `#FFFFFF` (branco, 700) | ênfase neutra |
| `^palavra` | `#BBA3FF` (roxo) | IA, conhecimento |
| `~palavra` | `#93BCFF` (azul) | social, alcance |
| `!palavra` | `#F5CB62` (ouro) | dinheiro, valor |
| `+palavra` | `#5BE39A` (verde) | prosperidade, confirmação |
| `&palavra` | `#FF7A70` (vermelho) | perda, problema |
| `=palavra` | `#FFB07A` (laranja) | ação, construção |

Exemplo: `Usar ^IA está virando coisa que *todo *mundo faz.` → "IA" em roxo bold; "todo mundo" em branco bold.

```js
const MARK = { '*': '#FFFFFF', '^': '#BBA3FF', '~': '#93BCFF', '!': '#F5CB62', '+': '#5BE39A', '&': '#FF7A70', '=': '#FFB07A' };
const marked = s => s.split(' ').map(w => MARK[w[0]]
  ? `<b style="color:${MARK[w[0]]}">${w.slice(1)}</b>` : `<span>${w}</span>`).join(' ');
```

### 10.2 Voz
- Frases curtas, uma ideia por linha (a legenda do vídeo tem blocos de 2 a 6 palavras).
- Perguntas diretas abrem seções ("Você ainda acredita que…?").
- Palavras-chave coloridas: **no máximo 1–2 por frase**.
- Números concretos só quando são verdadeiros.
- Rótulos (mono) são substantivos curtos, sem verbo: `GRUPO PEQUENO`, `CAMADA OCULTA`, `CUSTO REAL`.

---

## 11. Ilustração e iconografia

### 11.1 Tudo vira ASCII a partir de uma ilustração sombreada
Para criar um "objeto" do campo, **pinte-o como ilustração** num canvas e deixe o `imgPts` ler. Regras (aprendidas no reel Confeiteira):
- **Pinte como ilustração, não como diagrama:** cilindro com degradê horizontal (escuro nas bordas, luz a ~40%), topo em elipse mais claro, detalhes (pérolas, frutas, botões) como esferas com brilho no canto, sombra de contato fraca embaixo.
- **O contraste vem do desenho:** a lateral de um objeto deve ser bem mais escura (até ~0,7) que o detalhe claro (1,0), senão o detalhe some.
- **Tudo opaco:** cores semitransparentes somem (célula com cobertura < 30% é descartada). Para vidro/reflexo, use um tom escuro opaco (~0,12).
- **Áreas escuras grandes viram vazio:** tela de celular, janelas e buracos em tom < 0,08 não geram glifos. É isso que mantém o preto.
- **Texto dentro do objeto:** escuro sobre claro (ou o contrário); aparece como "falta" de glifos.
- **Símbolo-chave sempre claro:** um "?" pintado em cinza escuro fica ilegível. Pinte em branco e mude a cor pela animação.
- **Iso (estilo Hairline)** para diagramas, blocos, camadas, colunas: faces de cima 1,0, esquerda ~0,6, direita ~0,4; traço fino com cantos arredondados; o que está atrás fica escondido pelo que está na frente.

### 11.2 Biblioteca já pronta (no `comp_realista.js`; copie o desenho para a web)
| objeto | função de desenho | ideia que representa |
|---|---|---|
| "IA" com faixa de brilho | `textArt('IA', …, PU)` | inteligência artificial |
| "$" ouro com textura verde | `textArt('$', …, GD)` + `money` | dinheiro |
| "?" | `textArt('?', …)` | dúvida, pergunta |
| Lojinha com toldo listrado | `shopArt` | negócio, "todos os negócios" |
| Celular realista | `phoneArt({ body, screen })` | feed, WhatsApp, app |
| Bolo de 3 andares | `cakeArt` + `flameArt` | produto artesanal, o trabalho |
| Etiqueta de preço | (`SH.tag`) | preço, "quanto custa" |
| Colunas iso PREÇO × CUSTO | (`SH.bars`) | conta que não fecha |
| Blocos iso caindo | `buildPts` | construir algo próprio |
| Roleta | (`SH.wheel`) | escolha, "a próxima pode ser a sua" |
| Ícones seguir/curtir/compartilhar | (`SH.social`) | chamada social |
| Hook C/D (estilo traço, `comp_motion.js`): `$`, bolso, multidão, briga, grupo pequeno, camadas iso, divisão multidão × dono, globo, chip IA, torre | | ver `GUIA-DE-ESTILO.md` §5 |

### 11.3 Ícones de interface (fora do campo)
- Traço de **1,5–2 px**, cantos arredondados, `currentColor`, 20–24 px. Sem preenchimento colorido.
- Ou ícones "esfera" (§8.7) para destaques.
- Proibido: ícones coloridos de biblioteca genérica, emojis como ícone, ilustrações 3D brilhantes "de stock".

### 11.4 Fotos reais
Princípio do vídeo para imagens reais: **a foto vira forma.** A luminância da foto é lida em glifos; os agentes formam a foto em ASCII; depois a foto real (pontilhada) aparece dentro de uma moldura `ARQUIVO 0X` e pode voltar a virar glifos.
Na web: mostre a foto em ASCII (canvas) e faça *crossfade* para a foto real com um filtro de pontilhado (`filter: grayscale(1) contrast(1.2)` + máscara de pontos), com rótulo mono `ARQUIVO 01`.

---

## 12. Estrutura de página sugerida (seções como "beats")

Modelo baseado na lógica dos filmes. Os textos são **estrutura**, não copy pronta. A copy vem do roteiro/oferta real.

| # | seção | selo (HUD) | forma do campo | cor | o que carrega para a próxima |
|---|---|---|---|---|---|
| 0 | Abertura | — | poeira (os agentes antes de serem algo) | neutro | a poeira se junta na pergunta |
| 1 | **Hero: a pergunta** | `01 · A PERGUNTA` | o símbolo da pergunta (ex.: "IA", "$", "?") | roxo ou ouro | o símbolo cede |
| 2 | O problema | `02 · O PROBLEMA` | o símbolo desmorona / a conta que não fecha | vermelho/cinza | os restos viram a multidão |
| 3 | O comum (o que todo mundo faz) | `03 · TODO MUNDO` | multidão cinza idêntica | cinza | um grupo se separa |
| 4 | **Respiro** | — | quase vazio: um cursor piscando | neutro | o cursor constrói |
| 5 | O mecanismo / a virada | `04 · A CAMADA` | camadas iso, a do meio acende | roxo + azul | a camada vira estrutura |
| 6 | Como funciona (passos) | `05 · O MÉTODO` | o app/os cards acendendo um por um | laranja → ouro | os cards viram prova |
| 7 | Prova | `06 · A PROVA` | contadores, depoimentos em "arquivo" | branco + azul | os números viram valor |
| 8 | Oferta | `07 · A OFERTA` | blocos iso caindo e virando ouro | laranja → **ouro + verde (o estouro)** | a estrutura sobe pequena |
| 9 | CTA final | `08 · SUA VEZ` | estrutura pequena em cima + ação | ouro/branco | — |
| 10 | FAQ / rodapé | — | poeira | neutro | — |

Regras da estrutura:
- **Toda seção tem um símbolo** que conta a ideia sozinho.
- **Toda transição carrega algo** (escreva a última coluna antes de desenhar).
- **Pelo menos um respiro** na página (seção 4).
- **O estouro ouro + verde só na oferta.** Antes dela, ouro aparece pontualmente (preço, "seu").

---

## 13. Acessibilidade

- **Contraste** sobre `#050506` (aproximado): `#FFFFFF` ~20:1; `#F2F2F5` ~18:1; `#CDCDD3` ~12,8:1; `#A0A0AA` ~7,9:1; `#8A8A94` ~5,9:1; `#7C7C86` ~4,9:1. **Corpo de texto: no mínimo `#CDCDD3`.** `#7C7C86` só para placeholder/desativado (passa AA para texto grande, no limite para texto normal). Ouro `#F5CB62` ~12:1; roxo `#BBA3FF` ~8,7:1; azul `#93BCFF` ~9,8:1; vermelho `#FF7A70` ~7,4:1; verde `#5BE39A` ~12:1; laranja `#FFB07A` ~10:1.
- **O canvas é decorativo:** `aria-hidden="true"`. Toda informação dele também existe em HTML (headline, rótulos). Se o símbolo carrega significado essencial, descreva-o em texto visível ou `aria-label` na seção.
- **`prefers-reduced-motion: reduce`:** sem morphs, sem decodificação, sem flutuação, sem grão animado; mostre a forma final estática (PNG ou o canvas desenhado uma vez); palavras aparecem sem movimento.
- **Som:** nunca automático. Se houver trilha/efeitos, botão explícito "ativar som".
- **Foco visível** em tudo que é interativo (`outline: 2px solid #F2F2F5; outline-offset: 3px`).
- **Texto real** (nunca headline como imagem/canvas): SEO e leitores de tela.
- Navegação por teclado no FAQ, na roleta e nos formulários.

---

## 14. Performance

- **Orçamento de quadro: 16 ms.** Meça o `step + draw` do campo com `performance.now()`; se passar de ~8 ms em mobile médio, reduza N ou aumente a célula.
- **Atlas de glifos:** desenhe cada caractere × cor uma vez (`drawImage` do atlas é muito mais barato que `fillText` por agente).
- **Typed arrays** para o estado dos agentes (nada de objetos por agente no loop).
- **Pause o loop** quando o campo não estiver visível (IntersectionObserver no canvas) ou com a aba oculta (`visibilitychange`).
- **`devicePixelRatio` limitado a 2.**
- **Pré-cálculo das formas:** gere os pontos offline (JSON compacto, ~6 bytes por ponto em binário) ou em `requestIdleCallback`. Gerar 8 formas de 8 mil pontos no carregamento trava mobile.
- **Fontes:** `font-display: swap`; pré-carregue Inter 400/700 e JetBrains Mono 400/700 (`<link rel=preload>`); o atlas só é construído depois de `document.fonts.ready`.
- **LCP:** a headline em HTML deve aparecer antes do campo. O campo entra com a poeira e se forma depois.
- **Bloom:** se pesar, troque pela sombra de luz via CSS no canvas (`filter: drop-shadow(...)`) ou desligue no mobile.
- **Grão:** PNG estático pequeno em *overlay* (animar a posição a 12 fps é opcional).

---

## 15. Arquivos, fontes e assets

| o quê | onde |
|---|---|
| Fontes (Inter 300/400/700, JetBrains Mono 400/700, Instrument Serif itálico) | `_motor/fonts/` (`inter-300.ttf`, `inter-400.ttf`, `inter-700.ttf`, `mono-400.ttf`, `mono-700.ttf`, `serif-italic.ttf`) ou Google Fonts |
| Motor completo dos vídeos (formas, desenho, imgPts, morphs) | `_motor/comp_realista.js` |
| Motor do estilo traço (Hook C/D) | `_motor/comp_motion.js` |
| Referências visuais do estilo realista | `reel-confeiteira/referencias/confeiteira-quadros-chave.png`, `reel-confeiteira/referencias/confeiteira-*.png` |
| Vídeos finais (para extrair quadros, ou usar em loop/background) | `reel-confeiteira/videos/Confeiteira - FINAL postado (v4).mp4`, `../VSL MOTION/Hook D - Vitor - narrador + ASCII (v3 final A).mp4` |
| Guia completo dos vídeos | `GUIA-DE-ESTILO.md` |

Dica: um trecho do reel em loop (sem áudio, `muted playsinline autoplay loop`) pode ser o fundo do hero em mobile, se o campo em tempo real pesar.

---

## 16. Checklist final

**Identidade**
- [ ] Fundo `#050506` (nunca `#000`), com brilho central, poeira, grão 4,5% e vinheta 55%.
- [ ] Toda seção tem um símbolo do campo que conta a ideia sozinho.
- [ ] Toda transição carrega algo da seção anterior.
- [ ] Pelo menos um respiro quase vazio.
- [ ] Elemento pequeno, fundo grande (símbolo em 40–60% da largura).

**Cor**
- [ ] Branco é o padrão; cada cor usada tem significado (tabela §3.3).
- [ ] O estouro ouro + verde aparece uma vez, na oferta/fechamento.
- [ ] Nenhum vermelho em botão; nenhum degradê decorativo.
- [ ] Cores de confeitaria só em comida/produto artesanal.

**Tipografia**
- [ ] Inter para mensagem; mono só em rótulos, sempre caixa alta e espaçada.
- [ ] Palavras-chave em Inter 700 na cor do significado, no máximo 1–2 por frase.
- [ ] Números tabulares e formato BR.

**Movimento**
- [ ] Ritmo variado (estalo × contemplação × respiro), nada no metrônomo.
- [ ] Rótulos de seção decodificam em 0,5 s; headlines entram palavra por palavra.
- [ ] `prefers-reduced-motion` respeitado.

**Técnica**
- [ ] Campo ASCII ≤ 8 ms por quadro em mobile médio; pausa fora da tela.
- [ ] Canvas `aria-hidden`; todo conteúdo em HTML real.
- [ ] Contraste do corpo ≥ `#CDCDD3`.
- [ ] Nenhum número inventado apresentado como dado real.

---

## 17. Anexo: CSS base completo

```css
/* ── fontes */
@font-face { font-family: 'Inter'; font-weight: 400; font-display: swap; src: url(fonts/inter-400.ttf); }
@font-face { font-family: 'Inter'; font-weight: 700; font-display: swap; src: url(fonts/inter-700.ttf); }
@font-face { font-family: 'Inter'; font-weight: 300; font-display: swap; src: url(fonts/inter-300.ttf); }
@font-face { font-family: 'JetBrains Mono'; font-weight: 400; font-display: swap; src: url(fonts/mono-400.ttf); }
@font-face { font-family: 'JetBrains Mono'; font-weight: 700; font-display: swap; src: url(fonts/mono-700.ttf); }
@font-face { font-family: 'Instrument Serif'; font-style: italic; font-display: swap; src: url(fonts/serif-italic.ttf); }

:root {
  /* fundo e superfícies */
  --bg: #050506; --bg-raise: #0B0B0D; --bg-raise-2: #111114;
  --line: rgba(207,207,214,.22); --line-strong: rgba(207,207,214,.5); --scrim: rgba(5,5,6,.78);
  /* texto */
  --text-max: #FFFFFF; --text-1: #F2F2F5; --text-hud: #E6E6EA; --text-2: #CDCDD3;
  --text-3: #A0A0AA; --text-4: #8A8A94; --text-5: #7C7C86;
  /* significado: glifo / texto */
  --gold: #F2C14E;   --gold-text: #F5CB62;
  --green: #3DDC84;  --green-text: #5BE39A;
  --purple: #A68BFF; --purple-text: #BBA3FF;
  --blue: #6EA6FF;   --blue-text: #93BCFF;
  --orange: #FF9B55; --orange-text: #FFB07A;
  --gray: #7C7C86;
  --red: #FF5A52;    --red-text: #FF7A70;
  --pink: #FF8FB8; --cream: #F6E3C2; --choco: #B97A55; /* só comida */
  /* brilho da seção atual (RGB), trocado por JS */
  --glow: 16,16,20;
  /* tipografia */
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;
  --font-serif: 'Instrument Serif', Georgia, serif;
  --fs-display: clamp(2.5rem, 1.6rem + 4.2vw, 5.5rem);
  --fs-h1: clamp(2rem, 1.4rem + 3vw, 4rem);
  --fs-h2: clamp(1.625rem, 1.2rem + 1.9vw, 2.75rem);
  --fs-lead: clamp(1.1875rem, 1.05rem + .5vw, 1.5rem);
  --fs-body: clamp(1.0625rem, 1rem + .2vw, 1.125rem);
  --fs-label: clamp(.6875rem, .64rem + .2vw, .8125rem);
  --fs-callout: clamp(.75rem, .7rem + .2vw, .875rem);
  --fs-counter: clamp(2.25rem, 1.6rem + 2.8vw, 4rem);
  /* movimento */
  --ease-snap: cubic-bezier(.16, 1, .3, 1);     /* expoOut */
  --ease-out: cubic-bezier(.33, 1, .68, 1);     /* cubicOut */
  --ease-inout: cubic-bezier(.65, 0, .35, 1);   /* inOut */
  --ease-pop: cubic-bezier(.34, 1.45, .64, 1);  /* backOut */
  /* espaço */
  --gutter: 20px; --section-gap: 96px;
}
@media (min-width: 600px)  { :root { --gutter: 40px; } }
@media (min-width: 1024px) { :root { --gutter: 64px; --section-gap: 144px; } }

html { background: var(--bg); color-scheme: dark; }
body {
  margin: 0; background: var(--bg); color: var(--text-2);
  font: 400 var(--fs-body)/1.6 var(--font-sans); -webkit-font-smoothing: antialiased;
}

/* camada 2: brilho da seção */
body::before {
  content: ''; position: fixed; inset: 0; z-index: -3; pointer-events: none;
  background: radial-gradient(circle at 50% 42%, rgb(var(--glow)) 0, rgba(5,5,6,0) min(85vw, 900px));
  transition: background .8s var(--ease-inout);
}
/* camada 6: vinheta + grão */
body::after {
  content: ''; position: fixed; inset: 0; z-index: 50; pointer-events: none;
  background: radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 32%, rgba(0,0,0,.55) 75%);
}
.grain { position: fixed; inset: -50%; z-index: 51; pointer-events: none; opacity: .045; mix-blend-mode: overlay;
  background: url(noise-256.png); animation: grain 1s steps(12) infinite; }
@keyframes grain { to { transform: translate(7%, -5%); } }

/* camada 4: o campo */
#campo { position: fixed; inset: 0; width: 100%; height: 100%; z-index: -1; }

/* selo de seção */
.hud { position: fixed; top: 24px; left: 50%; transform: translateX(-50%); z-index: 40;
  height: 32px; padding: 0 18px; border: 1px solid var(--line-strong); border-radius: 16px;
  display: flex; align-items: center; font: 400 var(--fs-label)/1 var(--font-mono);
  letter-spacing: .28em; text-transform: uppercase; color: var(--text-hud); opacity: .85; }

/* cantoneiras */
.corner { position: fixed; width: 18px; height: 18px; z-index: 40; opacity: .22; pointer-events: none; }
.corner--tl { top: 20px; left: 20px; border-top: 1.5px solid #fff; border-left: 1.5px solid #fff; }
.corner--tr { top: 20px; right: 20px; border-top: 1.5px solid #fff; border-right: 1.5px solid #fff; }
.corner--bl { bottom: 20px; left: 20px; border-bottom: 1.5px solid #fff; border-left: 1.5px solid #fff; }
.corner--br { bottom: 20px; right: 20px; border-bottom: 1.5px solid #fff; border-right: 1.5px solid #fff; }
@media (min-width: 1024px) { .corner--tl, .corner--tr { top: 32px; } .corner--bl, .corner--br { bottom: 32px; }
  .corner--tl, .corner--bl { left: 32px; } .corner--tr, .corner--br { right: 32px; } }

/* headline cinética */
.kinetic { font: 700 var(--fs-h1)/1.05 var(--font-sans); letter-spacing: -.015em; color: var(--text-2); }
.kinetic span, .kinetic b { display: inline-block; opacity: 0; transform: translateY(6px);
  transition: opacity .2s var(--ease-out), transform .2s var(--ease-out); }
.kinetic span { font-weight: 400; }
.kinetic.is-in span, .kinetic.is-in b { opacity: 1; transform: none; }
.kinetic.is-in span { opacity: .92; }

/* scrim atrás de texto sobre o campo */
.scrim { background: linear-gradient(to bottom, rgba(5,5,6,0), var(--scrim) 45%, var(--scrim)); }

/* rótulos */
.label { font: 400 var(--fs-label)/1.2 var(--font-mono); letter-spacing: .28em; text-transform: uppercase; color: var(--text-4); }
.counter { font: 700 var(--fs-counter)/1 var(--font-mono); letter-spacing: .02em; font-variant-numeric: tabular-nums; }

/* botões */
.btn { display: inline-flex; align-items: center; justify-content: center; height: 54px; padding: 0 28px;
  border-radius: 999px; border: 0; font: 700 1rem/1 var(--font-sans); cursor: pointer;
  transition: background .18s, box-shadow .18s, border-color .18s; }
.btn--action { background: var(--orange); color: var(--bg); }
.btn--action:hover { background: var(--orange-text); box-shadow: 0 0 24px rgba(255,155,85,.35); }
.btn--offer { background: var(--gold); color: var(--bg); }
.btn--offer:hover { box-shadow: 0 0 28px rgba(242,193,78,.35), 0 0 60px rgba(61,220,132,.12); }
.btn--ghost { background: transparent; color: var(--text-hud); border: 1px solid var(--line-strong);
  font: 400 var(--fs-label)/1 var(--font-mono); letter-spacing: .2em; text-transform: uppercase; }
.btn--ghost:hover { border-color: rgba(207,207,214,.9); background: var(--bg-raise); }
:focus-visible { outline: 2px solid var(--text-1); outline-offset: 3px; }

/* cards */
.card { background: var(--bg-raise); border: 1px solid rgba(242,242,245,.18); border-radius: 20px; padding: 24px; }
.card.is-lit { border-color: rgba(242,242,245,.85); animation: lit .35s var(--ease-out); }
@keyframes lit { 0% { opacity: .18 } 35% { opacity: 1; box-shadow: 0 0 30px rgba(242,242,245,.18) } 100% { opacity: 1 } }
.card--value { border-color: rgba(242,193,78,.6); background: rgba(242,193,78,.06); }

/* movimento reduzido */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation: none !important; transition: none !important; }
  .kinetic span, .kinetic b { opacity: 1; transform: none; }
}
```
