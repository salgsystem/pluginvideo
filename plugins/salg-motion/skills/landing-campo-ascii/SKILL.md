---
name: landing-campo-ascii
description: "Cria ou revisa landing pages no estilo 'Campo Vivo' dos vídeos da Salg/ATS: fundo preto quente #050506, um Campo ASCII limpo (grade exata, 6 tons) em canvas que funde para o símbolo de cada seção ao rolar, cor só com significado e sem amarelo (valor e oferta verdes, dono azul, construção laranja Claude), prints reais do produto com granulado, selo de seção que decodifica, headline palavra por palavra e mono caixa alta nos rótulos. Use quando pedirem landing page, página de vendas, site, hero ou componentes 'no estilo dos vídeos', 'no estilo ASCII', 'no estilo da VSL' ou 'do reel'."
---

# Landing page no estilo "Campo Vivo"

A página é o filme traduzido para a rolagem. **Cada seção é uma cena**, com um símbolo do campo ASCII que conta a ideia sozinho, e a troca de seção é uma **fusão no lugar**. Há pelo menos um **respiro**, e o **verde de oferta** só aparece na oferta.

Nesta skill:
- **A especificação** é o `../ascii-onetake/references/DOC-ESTILO.md`. Leia a Parte A (o estilo, §1–§8) e a Parte D (§18: equivalências, tokens CSS, campo na web, componentes, estrutura da página, acessibilidade).
- `campo-ascii.js`: o módulo do campo, sem dependências, já na **leitura limpa**. A API é `createField(canvas, { N, cellPx })`, que devolve `{ imgPts(desenho, { tint }), setShape(pts, { d, st, fly }), stop }`.
  - Rampa `' .:=+#@'`, 6 níveis, atlas de 32 px.
  - Fusão por padrão; `fly: true` só quando o voo é a ideia.
  - O matiz do desenho cai em roxo, azul, laranja, verde ou vermelho. Ouro, dono, Claude, WhatsApp e marrom entram por `{ tint: n }`.
- `base.css`: tokens (com `--valor`, `--dono`, `--claude`, `--whats`) e estilos base: fundo, brilho, vinheta, grão a 0,02, selo, cantoneiras, headline cinética, botões (oferta verde), cards, placa e lettering.
- `references/antigos/DOC-LANDING-PAGE-ESTILO.md`: a especificação antiga (com ouro). É histórico; o que vale é o DOC-ESTILO §18.
- Fontes: `../ascii-onetake/motor/fonts/` (Inter, JetBrains Mono, Instrument Serif; todas OFL).
- Referência visual: `../ascii-onetake/exemplos/vsl-ats/vsl-v4-quadros-chave.jpg`.

## Protocolo
1. Leia o DOC-ESTILO §1–§8 e §18.
2. Monte a estrutura em cenas (§18.5). Para cada seção, defina:
   - o selo `NN · NOME`;
   - o símbolo do campo;
   - a mídia real;
   - a cor;
   - o que continua para a próxima.

   Use a copy real do produto. Nunca invente prova, número ou depoimento.
3. Comece de `base.css` + `campo-ascii.js`. O campo fica fixo atrás do conteúdo, e cada `<section data-shape data-glow>` funde para a forma nova quando 55% dela está visível.
4. Desenhe os símbolos como **ilustração em cor chapada** (DOC §3.2: lateral mais escura, tudo opaco, nada encostado na borda) e leia-os com `field.imgPts(desenho)`. Os prints do produto entram como imagem real em card com leve perspectiva e granulado, nunca redesenhados.
5. Garanta:
   - `prefers-reduced-motion`;
   - canvas com `aria-hidden` e todo o conteúdo em HTML real;
   - contraste do corpo ≥ `#CDCDD3`;
   - agentes: 2.500–4.500 em mobile e 8.000–12.000 em desktop;
   - ≤ 16 ms por quadro.
6. Verifique no navegador em 375, 768 e 1440 px antes de entregar.

## Regras que mais quebram
- Fundo `#000` (errado) em vez de `#050506`.
- **Amarelo/ouro no botão ou no dinheiro:** a oferta é verde e o ouro é só tesouro.
- Cor como enfeite ou botão vermelho.
- Mockup genérico no lugar do print real; depoimento inventado.
- Parágrafo em mono, ou mono sem caixa alta e sem tracking largo.
- Campo ASCII ocupando a tela toda (o símbolo deve ficar em 40–60% da largura).
- Transições que "trocam slide" ou caracteres embaralhando em trânsito.
