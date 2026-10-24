# motor-campo-vivo: o motor da VSL ATS (estilo "Campo Vivo")

É o motor do pacote do Emmanuel, com textura limpa, boneco articulado, fusão no lugar, câmera parada e o narrador sincronizado pelo áudio. Ele está do jeito que ficou depois dos ajustes do Igor na VSL v4 (24/10/2026).

O documento é `../references/DOC-ESTILO.md`. Este motor é a Parte B dele (§10–§16).

## Peças

| arquivo | para quê | DOC |
|---|---|---|
| `comp.html` | página da composição; carrega `words.js`, `comp.js` e `../../comum.js` | §12 |
| `comum.js` | o que as partes compartilham (`C6`): cédula, cartão, lettering com e sem placa, check/X, risco, TV ligando, página longa em 3D, mockups de notebook e celular, dardo, agentes, artes (cérebro, livro, baú, chave, lâmpada, peão, coroa, escudo, carteira) e registro da mídia comum | §13.2 |
| `render.py` | `stills t1,t2…` · `events` · `video [--start --end --force --workers --out]`. Espera até 4 min a página abrir e não trava se um worker morrer | §15 |
| `sfx.py` | trilha sintetizada a partir de `events.json` → `mix.wav` (−14 LUFS) | §14 |
| `peek.py` | avalia uma expressão JS na página (orçamento de agentes, contagem de pontos) | §3.5 |
| `cortar.py`, `transcribe.py` | corte de silêncios e transcrição (faster-whisper large-v3) | §11.1 |
| `alinhar_takes.py` | acha onde cada take do narrador cai no `vo.wav`, pela forma de onda | §11.3 |
| `prep_vitor.py` | take → quadros do filme (margem de 0,5 s, segura o último quadro) | §11.3 |
| `matte_run.py` | recorte de pessoa (rembg `birefnet-portrait`) de `<nome>_src/` para `<nome>_fg/` | §8 |
| `prep_media.py` | b-roll → quadros JPG a 30 fps; imagem → no máximo 1600 px; tudo em `media_comum/` | §8.4 |
| `juntar.py` | junta as partes (`parte.mp4` de cada uma, mais partes prontas de terceiros) com sobreposição fluida | §15 |
| `requirements.txt` | versões exatas das bibliotecas Python | |
| fontes | as mesmas do motor antigo: `../motor/fonts/` | §5 |

## O `comp.js`

O motor e as cenas moram no mesmo `comp.js`. Para um filme novo, parta de `../exemplos/vsl-ats/parte2/comp.js` (o mais completo: `scene()`/`el()`, `fullAt`, `PART.over`, `dropLbl`), mantenha o motor e troque as cenas, `KEYS`, `NARR`, `PLAY`, `CHUNKS` e `SECTIONS`. Para ajustar um filme já entregue, escreva no fim do arquivo uma seção nova (v6, v7…) que redefina as cenas pelo nome: **a última definição vence** (DOC §11.4).

## Estrutura que o motor espera

```
<projeto>/
  partes/
    comum.js  juntar.py  prep_media.py  prep_vitor.py
    media_comum/                    (gerado pelo prep_media.py)
    <parte>/projeto/
      comp.html  comp.js  words.js  vo.wav  mix.wav  events.json
      render.py  sfx.py  peek.py  vitor_takes.json
      fonts/  assets/vitor/  media/
  imagens/  imagens/Broll vsl/      (origem da mídia)
  video/                            só o filme juntado da versão atual
```

Em cada `render.py`, ajuste `DUR` para a duração do `vo.wav` da parte. Em `prep_media.py`, ajuste `VIDS`/`IMGS` e os caminhos `BR`/`IM`. Em `juntar.py`, ajuste `PARTS` e `OVER`.

## Comandos de sempre

```
python render.py stills 9.0,10.3,24.5          # → stills/sheet.png (olhe depois de a fusão terminar)
python render.py events && python sfx.py        # sempre que o tempo de uma key mudar
python render.py video --workers 6 --out parte.mp4      # só refaz o que falta; --force refaz tudo
python ../../juntar.py "../../../video/VSL - Completa (vN).mp4"
```
