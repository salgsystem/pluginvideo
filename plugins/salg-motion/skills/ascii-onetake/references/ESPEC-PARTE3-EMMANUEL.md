# Parte 3 (Emmanuel, v12) × Hook + Parte 2 (nossas) — divergências e o que ajustar

Comparação feita quadro a quadro: Parte 3 v12 (238 s) contra o filme v3 (Hook + Parte 2, 516 s).
Objetivo: a VSL completa parecer feita por uma mão só.

## O que já está igual (não mexer)

- **Base técnica**: mesma textura ASCII limpa, mesmo boneco articulado, mesma câmera estática, 1080×1920 a 30 fps.
- **Moldura**: a etiqueta de capítulo no topo ("04 · O VALOR") e os cantos em colchete são idênticos.
- **Legenda**: mesma fonte e posição, mesmo efeito karaokê (a palavra seguinte aparece apagada e acende quando é dita).
- **Vitor**: os takes dele entram em tela cheia, sobre o mesmo fundo escuro.
- **Som e luz**: volume final de −14 LUFS nas duas, brilho médio praticamente igual (30,0 × 30,7).

## Divergências principais

| # | Ponto | Parte 3 (Emmanuel) | Nossas partes | Peso |
|---|---|---|---|---|
| 1 | **Amarelo** | Usa bastante: moeda dourada, chave, etiquetas "VALOR", "QUASE R$ 300", "7 DIAS", "CADA CENTAVO", palavra **valor** em amarelo | Regra nossa: sem amarelo (dono azul, valor verde, blocos laranja Claude/marrom). Exceções: tesouro e a lâmpada de 2:55 | Alto |
| 2 | **Transição entre cenas** | Quase toda troca é uma **dissolução em partículas**: o objeto se desfaz em pó e o próximo se forma do mesmo pó (blocos → maleta de dinheiro → moeda → programador) | Mais fusões cruzadas (xf), e as cenas às vezes só aparecem ou somem | Alto |
| 3 | **Um objeto por cena** | Um herói central, grande, com muito espaço vazio em volta e no máximo uma etiqueta pequena | Várias cenas cheias: multidões de 40–60 bonecos, 9 olhos, grupos, painéis | Médio |
| 4 | **Volume dos objetos** | Objetos isométricos sólidos com faces claras e escuras (pilhas de dinheiro, prédio SALG, blocos, maleta) | Mais desenho de linha e silhueta; menos objetos com volume | Médio |
| 5 | **Brilho de fundo** | Cada cena tem um halo quente de fundo, tingido pelo tema (marrom/âmbar no valor, roxo na IA, vermelho na urgência) | O halo é quase sempre neutro ou azulado | Médio |
| 6 | **Cores das palavras na legenda** | Código fixo: vermelho = perigo (Novidade, urgência, perder, medo), amarelo = valor, roxo/azul = sistema/IA/gente, verde = investimento, laranja = construir | Laranja, azul e verde, mas também **dinheiro** em amarelo-ouro (fere a nossa regra) e quase nenhum vermelho | Médio |
| 7 | **Texto "embaralhado"** | Números e rótulos nascem embaralhados e se resolvem ("INVE0#1$$>%%" → INVESTIMENTO, "% @& 1 0/<"), sempre em fonte mono | Usamos pouco; quase todo letreiro nasce inteiro | Baixo |
| 8 | **Mídia real** | Sempre dentro de um suporte: telas do SALG no notebook, Netflix na TV, grade de chamada com rostos borrados. Nunca em tela cheia | Vários b-rolls em tela cheia (por pedido seu: scroll insta, celular, etc.). Já trocamos os letreiros com tarja por letreiros sem fundo | Baixo (decisão sua) |
| 9 | **Respiro** | Pequenos momentos sem legenda e com a cena parada, logo depois de uma frase forte | Legenda quase contínua | Baixo |

## O que ajustar

### Nas nossas partes (para ficarem mais perto da Parte 3)

1. **Transição de partículas como padrão.** Toda troca de cena dentro de um mesmo capítulo vira dissolução em pó: o objeto se espalha e o próximo se forma do mesmo pó. A fusão simples fica só para entrar e sair do Vitor. Esse é o item que mais aproxima as partes.
2. **Halo de fundo por tema.** Usar a mesma paleta do Emmanuel, sem amarelo: azul no dono, verde no valor, laranja/marrom na construção, vermelho na urgência, roxo na IA.
3. **Enxugar as cenas cheias.** Multidões passam a ser um herói em destaque com um coro desfocado atrás, que a Parte 3 já usa ("E quem", a multidão em perspectiva). Nove olhos viram um olho grande ou três.
4. **Mais objetos com volume** nas cenas de dinheiro e de construção: pilhas de notas, blocos isométricos, maleta. São do mesmo pacote e já combinam com a nossa regra (cédulas e cartões, nada de partículas de "energia").
5. **Legenda**:
   - trocar **dinheiro** de amarelo para verde;
   - adotar vermelho nas palavras de perigo (Novidade, medo, perder, armadilha);
   - manter laranja em construir/construído.
6. **Números e rótulos embaralhados** ao nascer, em fonte mono: 6000, 43 MIN, 180 × 14, R$.

### Na Parte 3 (pedir ao Emmanuel, ou eu ajusto sobre o vídeo dele)

7. **Tirar o amarelo** para seguir a regra:
   - a moeda e as etiquetas "VALOR", "QUASE R$ 300" e "7 DIAS" viram verde;
   - os blocos viram laranja Claude;
   - a chave pode ficar dourada, porque é tesouro (a exceção permitida).
8. **Palavra "valor" na legenda** em verde, não amarelo.

> O item 7 é o único que exige mexer no projeto do Emmanuel: o vídeo dele chega pronto, então trocar cor depois de renderizado fica mal feito. O ideal é ele mudar a paleta no projeto e reexportar a v13.

## Emendas da VSL completa

| Emenda | Como ficou |
|---|---|
| Hook → Parte 2 (≈ 4:05) | O b-roll de 4:06 começa por baixo do Vitor ainda falando, sincronizado com o início da Parte 2. Ele sai na última palavra (corte em L), sem travar no quadro |
| Parte 2 → Parte 3 (≈ 8:36) | Sobreposição de 1,15 s: a Parte 2 se dissolve enquanto a cena da obra da Parte 3 se forma. Pausa de ~0,6 s entre "É o centro de tudo." e "E você pode se perguntar…" |
