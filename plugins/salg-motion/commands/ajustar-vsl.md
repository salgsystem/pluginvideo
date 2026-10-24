---
description: "Aplica uma lista de ajustes por minutagem numa VSL Campo Vivo (seção nova no comp.js de cada parte), confere em stills, renderiza e junta de novo"
argument-hint: "<lista de ajustes com minutagem do filme, ou caminho de um arquivo com a lista>"
---

Aplique estes ajustes à VSL: `$ARGUMENTS`

Use a skill `ascii-onetake` deste plugin e o `references/DOC-ESTILO.md` (regras §1–§9; pipeline §11.4–§11.5).

1. **Separe a lista por parte** e converta a minutagem do filme para o tempo de cada parte. A emenda tira a sobreposição: o tempo da Parte 2 é o tempo do filme menos o início dela no filme (na VSL ATS, 245,38 s). Ache a cena de cada item pelo comentário com a frase no `comp.js` e pela transcrição (`words.json`).
2. **Guarde um backup** do `comp.js` de cada parte (`comp_vN_antes_ajustes.js`) e escreva os ajustes numa **seção nova no fim do arquivo** (v8, v9…), que redefine as cenas pelo nome (a última definição vence). Reaproveite o `comum.js` (`C6`). O que servir para as duas partes vai para lá.
3. Siga as regras que o Igor já fixou:
   - sem amarelo;
   - dinheiro em cédula e pagamento em cartão;
   - boneco sempre animado, com o capacete na cabeça;
   - texto inteiro, sem tarja sobre vídeo e sem cobrir o principal;
   - mídia real mantida;
   - Vitor com fade longo e corte em L;
   - passagens fluidas.

   Se um item contradiz uma regra, siga o item e anote no DOC §19.
4. Cheque a sintaxe (`node --check`) e gere **stills de cada item** depois de a fusão terminar. Olhe-os e corrija antes de renderizar.
5. Se alguma key mudou de tempo: `python render.py events && python sfx.py`.
6. Renderize as partes alteradas (`render.py video --out parte.mp4`; `--force` só se o motor mudou) e rode `/juntar-vsl` com a versão nova.
7. Atualize o `DOC-ESTILO.md` (regras novas + §19) e responda item por item: o que foi feito, onde (minutagem) e o que precisa de material do usuário.
