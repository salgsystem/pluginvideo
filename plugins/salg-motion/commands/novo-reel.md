---
description: "Cria um reel ASCII onetake novo a partir do áudio da caixa de entrada gravacao/ e já monta beat sheet, formas, stills e render"
argument-hint: "<pasta do reel, ex.: reels 19 10/reel-dentista> [gravacao/conteudo.wav gravacao/final.wav]"
---

Crie um reel novo no estilo ASCII onetake com estes argumentos: `$ARGUMENTS`

1. Carregue a skill `ascii-onetake` deste plugin e siga o protocolo dela. O motor está na pasta `motor/` dessa skill (caminho base da skill + `/motor/`; no plugin, `${CLAUDE_PLUGIN_ROOT}/skills/ascii-onetake/motor/`).
2. Confirme que a pasta atual é a pasta-mãe dos reels (tem ou vai ter `gravacao/`). Se `gravacao/` estiver vazia e nenhum arquivo foi passado, peça o áudio.
3. Rode, entre aspas porque os caminhos têm espaços:
   `python "<motor>/novo_projeto.py" "<pasta do reel>" [arquivos…]`
   Se forem dois arquivos (conteúdo + finalização), passe na ordem e pergunte qual é qual se não estiver claro.
4. Leia `projeto/roteiro.txt`, corrija nomes próprios e tempos de palavras arrastadas em `words.json` e regenere `words.js`.
5. Escreva `beat-sheet.md` (tempo · frase · forma · cor · o que carrega), com pelo menos um respiro e o estouro ouro + verde só no final.
6. Escreva `projeto/comp.js` partindo do modelo realista (já copiado) e da biblioteca em `exemplos/confeiteira/comp.js` da skill.
7. Cheque a sintaxe, a contagem de agentes e a legenda; gere stills dos momentos-chave e **mostre a prancha ao usuário antes do render final**.
8. Gere o som (`python render.py events` + `python sfx.py`), renderize em `../videos/<Reel> - ASCII onetake (v1).mp4`, faça a cópia crf 19 e meça −14 LUFS / pico ≤ −1,5 dB no MP4.
