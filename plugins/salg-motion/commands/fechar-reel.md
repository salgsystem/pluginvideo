---
description: "Fecha um reel postado — marca a versão final, salva referências, limpa os frames e registra as decisões"
argument-hint: "<pasta do reel> <versão postada, ex.: v4>"
---

Feche o reel com estes argumentos: `$ARGUMENTS`

1. Em `<reel>/videos/`, renomeie a cópia postada para `<Reel> - FINAL postado (vN).mp4` e o master para `<Reel> - FINAL master alta (vN).mp4`. Se o Windows recusar (arquivo aberto no player), avise e peça para fechar.
2. Em `<reel>/referencias/`, gere a prancha de quadros-chave do vídeo final (15–20 instantes, 360 px cada, 5 colunas, com o tempo escrito) e 4–6 quadros em tamanho real dos momentos mais importantes.
3. Apague `<reel>/projeto/frames/` e `<reel>/projeto/stills/` (são regeneráveis; ~4 GB).
4. Atualize `<reel>/LEIA-ME.md`: versão postada, data, o que tem em cada pasta.
5. Registre no histórico (`GUIA-DE-ESTILO.md` §13 da pasta-mãe, se existir) o que mudou em cada versão e o que foi aprovado.
6. Se o reel trouxe formas ou regras novas que valem para os próximos, proponha ao usuário levá-las para o modelo (`motor/comp_realista.js` da skill) e para o guia.
