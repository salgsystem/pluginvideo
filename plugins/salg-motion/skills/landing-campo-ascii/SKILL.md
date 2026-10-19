---
name: landing-campo-ascii
description: "Cria ou revisa landing pages no estilo visual dos vídeos ASCII onetake da Salg — fundo preto quente #050506, um 'Campo ASCII' em canvas que se transforma no símbolo de cada seção ao rolar, cor só com significado (ouro dinheiro, roxo IA, azul social, laranja ação, vermelho perda), selo de seção que decodifica, headline palavra por palavra, mono caixa alta nos rótulos. Use quando pedirem landing page, página de vendas, site, hero ou componentes 'no estilo dos vídeos', 'no estilo ASCII', 'no estilo da VSL' ou 'do reel'."
---

# Landing page no estilo "Campo ASCII"

A página é o vídeo traduzido para a rolagem: **cada seção é um beat**, com um símbolo do Campo ASCII que conta a ideia sozinho; a transição entre seções **carrega** algo da anterior; há pelo menos um **respiro**; o **estouro ouro + verde** só aparece na oferta.

Nesta skill:
- `references/DOC-LANDING-PAGE-ESTILO.md`: **a especificação completa** (leia antes de escrever qualquer coisa): regras, tabela vídeo → web, tokens de cor e texto, glow por seção, tipografia com `clamp()`, grade e espaçamento, as 6 camadas do fundo, o Campo ASCII, todos os componentes com medidas, curvas e durações, marcação de palavras-chave, ilustração, estrutura de página em beats, acessibilidade, performance e checklist.
- `campo-ascii.js`: o módulo do Campo ASCII (`createField(canvas, { N, cell })` → `{ imgPts, setShape, stop }`), sem dependências.
- `base.css`: tokens e estilos base (fundo, glow, vinheta, grão, selo, cantoneiras, headline cinética, botões, cards, movimento reduzido).
- Fontes: `../ascii-onetake/motor/fonts/` (Inter 300/400/700, JetBrains Mono 400/700, Instrument Serif itálico; todas OFL).
- Referência visual: `../ascii-onetake/exemplos/confeiteira/*.png`.

## Protocolo
1. Leia `references/DOC-LANDING-PAGE-ESTILO.md` inteiro.
2. Monte a estrutura em beats (DOC §12): para cada seção, o selo `NN · NOME`, o símbolo do campo, a cor e o que carrega para a próxima. Copy real do produto; nunca invente prova, número ou depoimento.
3. Comece de `base.css` + `campo-ascii.js`. O campo fica fixo atrás do conteúdo; cada `<section data-shape data-glow>` troca a forma quando 55% dela está visível.
4. Desenhe os símbolos como **ilustrações sombreadas** (DOC §11) e leia-os com `field.imgPts(desenho)`. Para objetos já prontos (bolo, celular, lojinha, etiqueta, ingredientes, blocos iso, roleta), copie as funções de desenho de `../ascii-onetake/motor/comp_realista.js`.
5. Garanta `prefers-reduced-motion`, canvas `aria-hidden`, todo o conteúdo em HTML real, contraste do corpo ≥ `#CDCDD3`, campo ≤ 8 ms por quadro em mobile (N 2.500–4.500 em mobile, 5.000–12.000 em desktop).
6. Verifique no navegador em 375, 768 e 1440 px antes de entregar e passe o checklist (DOC §16).

## Regras que mais quebram
- Fundo `#000` (errado) em vez de `#050506`.
- Cor como enfeite; vermelho em botão; ouro espalhado pela página inteira (o final perde o peso).
- Parágrafo em mono, ou mono sem caixa alta e sem tracking largo.
- Campo ASCII ocupando a tela toda (o símbolo deve ficar em 40–60% da largura).
- Transições que "trocam slide" em vez de transformar.
