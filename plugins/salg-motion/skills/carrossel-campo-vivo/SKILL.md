---
name: carrossel-campo-vivo
description: "Cria carrosséis de Instagram (1080×1350, 4:5) no estilo 'Campo Vivo' da Salg/ATS: o filme congelado em slides, com cada slide sendo uma cena em ASCII limpo, o boneco no auge da pose, mídia real (prints do SALG, cédula, cartão) e continuidade de um slide para o outro, sem amarelo. Use quando pedirem carrossel, post em slides, 'carrossel no estilo da VSL/dos vídeos', ou para transformar trechos de um filme em slides."
---

# Carrossel no estilo "Campo Vivo"

**Um carrossel é o filme congelado:** cada slide é uma cena, e deslizar o dedo faz o papel do tempo. Valem todas as regras do estilo (DOC-ESTILO Parte A). O que muda está no **§17**.

Leia antes: `../ascii-onetake/references/DOC-ESTILO.md`, §1–§8 e §17. O DOC-CARROSSEL-ESTILO antigo está em `../ascii-onetake/references/antigos/` (histórico).

## Medidas (DOC §17)
| item | valor |
|---|---|
| formato | 1080 × 1350 (4:5), sRGB, 7 a 10 slides |
| zona segura | x 72–1008, y 72–1278; na capa, nada essencial a menos de 34 px das laterais |
| símbolo | centro (540, 640), de y 170 a 1000, até 760 px de largura |
| selo | pílula em y 96 + contador `03/09` à direita (mono 19 px) |
| cantoneiras | a 48 px das bordas, braços de 24 px |
| frase | Inter 700/400 64 px (capa: 84 px), até 2 linhas e 14 palavras, a partir de y 1090, com faixa escura de y 960 a 1350 |
| tamanho mínimo | 20 px |

## Protocolo
1. **Arco:** capa (gancho) → 2–3 slides de problema → respiro → 3 de solução em passos → resultado (verde) → CTA.
2. **Cada slide:** um símbolo que conta a ideia sem o texto. Use o quadro em que a cena **pousou** (nunca o meio da fusão) e o boneco **no auge da pose** (o pulo no ar, o dedo apontando).
3. **Continuidade:** o mesmo objeto reaparece transformado no mesmo lugar, ou atravessa a borda entre dois slides (no máximo duas travessias).
4. **Produção rápida:** gere stills do filme (`motor-campo-vivo/render.py stills t1,t2,…`) e recorte em 4:5 (`ffmpeg -i stills/t044.20.png -vf "crop=1080:1350:0:170" slide02.png`). Depois componha o selo, o contador, as cantoneiras e a frase. Para um carrossel do zero, use o motor com uma forma por slide.
5. **Entrega:** `slide01.png…` + `legenda.txt` (legenda do post, texto alternativo e até 5 hashtags).

## Checklist
- [ ] Capa legível na miniatura.
- [ ] Cada slide tem um símbolo que conta a ideia sem o texto.
- [ ] Cada passagem carrega algo; há pelo menos um respiro.
- [ ] **Sem amarelo** (valor verde, dono azul, construção laranja Claude/marrom; ouro só em tesouro).
- [ ] Texto com contraste; nenhum número inventado.
- [ ] Revisado num celular de verdade.
