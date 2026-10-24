# Narrador em cena: como o motion se adapta

Regra da VSL: **sempre que o narrador (Vitor) aparece em vídeo, o motion ASCII muda de comportamento** e segue o padrão aprovado no **Hook D v3**. Este documento descreve esse padrão, para repetir em qualquer trecho com o narrador.

> Referência visual: `Hook D - Vitor - narrador + ASCII (v3 final A).mp4`, de 0 a 4,5 s.
> Implementação: `hook-d/comp.js` (busque por `FOOT`, `LAYOUT` e `drawFootage`).

---

## 1. O princípio

Quando o narrador está em cena, **ele é o protagonista**. O motion vira um **comentário visual** da fala: um símbolo pequeno que aparece **acima da cabeça dele**, como um balão de pensamento. Nunca disputa a atenção com o rosto e nunca passa por cima dele.

| | motion sozinho (só áudio) | com narrador em vídeo |
|---|---|---|
| Protagonista | o símbolo ASCII, grande e no centro | **o narrador** |
| Símbolo | escala 1 (cerca de 820 px), centro da tela | **escala 0,36 (cerca de 300 px), acima da cabeça** |
| Glifos | tamanho e brilho cheios | **menores (×0,47) e mais suaves (×0,71)**, para não estourar |
| Poeira de fundo | brilho normal | **metade do brilho** |
| Câmera | operada, com empurrões e chicotes | **quase parada**: só uma deriva lenta (zoom até 1,03 em 4 s) |
| Contadores e callouts | à vontade | **nenhum sobre o corpo dele**; entram só depois que ele sai |
| Legenda | igual | **igual** (mesmo estilo, posição e cores) |
| Selo do topo (HUD) | igual | **igual** |

---

## 2. As camadas (de trás para frente)

```
1. fundo preto + brilho de cor do beat
2. FUNDO DO VÍDEO (o take inteiro, com o narrador)
3. poeira e glifos ASCII + bloom      ← o motion mora aqui
4. NARRADOR RECORTADO (matte)          ← cobre o ASCII sempre que eles se cruzam
5. faixa escura da legenda
6. callouts e contadores (só depois que ele sai)
7. selo do topo (HUD) + legenda
```

O recorte em cima do ASCII garante que, se um glifo passar atrás dele (por exemplo, o $ caindo "no bolso"), ele **some atrás do corpo**, como um objeto real na cena.

---

## 3. Disposição dos símbolos: padrão A, acima da cabeça ✅

Aprovado pelos sócios em 18/10/2026.

- **Posição:** centralizado na horizontal, entre o topo da cabeça e o selo do topo (centro do símbolo em y ≈ 340 px da tela de 1920).
- **Escala:** 0,36 da forma original.
- **Glifos:** tamanho × (0,35 + 0,65 × escala) e brilho × (0,55 + 0,45 × escala). Sem isso, 6.000 glifos num símbolo pequeno viram uma mancha chapada e perdem a textura ASCII.
- **Alternativas guardadas** (só se um take específico pedir): `side`, ao lado esquerdo com escala 0,56, e `behind`, atrás da cabeça com escala 1. Escolha com `--layout`.

```js
const LAYOUTS = { above: { x: 0, y: -462, s: 0.36 }, side: { x: -330, y: -250, s: 0.56 }, behind: { x: 0, y: -190, s: 1 } };
```

### Se o enquadramento do take for diferente
Os valores acima valem para o enquadramento do Hook D (Vitor em plano médio, cabeça no terço superior, topo da cabeça em y ≈ 520). Para outro take:
1. Medir o topo da cabeça num frame (`stills`).
2. Centralizar o símbolo no espaço livre entre o selo do topo (y ≈ 170) e a cabeça, com margem de cerca de 30 px de cada lado.
3. Ajustar a escala para o símbolo caber nesse espaço.

---

## 4. O que o símbolo faz enquanto ele fala

O motion continua **reagindo às palavras**, só que em miniatura e acima da cabeça:

| fala | o que acontece | cor |
|---|---|---|
| "Quanto **dinheiro**…" | a poeira se junta num **$** acima da cabeça | ouro e verde |
| "…já **caiu** no seu bolso" | o $ **despenca** e passa por trás dele (some atrás do corpo) | ouro |
| (respiro) | cerca de 0,3 s só com o narrador | — |
| "…por causa da **IA?**" | um **?** se forma no mesmo lugar | roxo |

Regras:
- Um símbolo por ideia. Com o narrador em cena **não há** cenas complexas (multidão, feed, blocos); elas ficam para os trechos só em áudio.
- O símbolo pousa **na palavra-chave**: o morph começa cerca de 0,25 s antes.
- Um respiro curto sem símbolo é bem-vindo; deixa o narrador "respirar".

---

## 5. Saída do narrador: o vídeo se quebra e o símbolo assume

É a transição característica do Hook D. Não há corte seco:

1. **No fim da última palavra dele** (Hook D: 4,08 s), o vídeo se quebra em **48 faixas horizontais**.
2. Durante **0,36 s**, as faixas **escorregam para os lados** (até 140 px) e **somem aleatoriamente**, com o brilho caindo até 40%.
3. Ao mesmo tempo, **o símbolo que estava acima da cabeça cresce e desce para o centro** (escala 0,36 → 1 em 0,55 s, curva `inOut`) e os glifos voltam ao tamanho e brilho cheios.
4. A câmera dá um pequeno empurrão (`expoOut`, 0,5 s) e o motion segue normalmente.
5. Som: um **glitch curto** (0,4 s) acompanha a quebra.

O símbolo é o fio que liga o trecho com o narrador ao trecho só de motion. **Ele nunca some na troca.**

## 6. Entrada do narrador (quando ele volta no meio do filme)

O Hook D ainda não tem esse caso. **Padrão proposto**, para validar no primeiro trecho que precisar:
- O inverso da saída: o símbolo do motion **encolhe e sobe** para a posição acima da cabeça, enquanto o vídeo **se monta faixa por faixa** (as mesmas 48 faixas, ao contrário).
- Os elementos do motion que não são o símbolo se dissolvem no lugar (como em toda troca de beat).

---

## 7. Áudio no trecho do narrador

- Usar o **som do próprio vídeo** enquanto ele está em cena (sincronia labial perfeita).
- Na troca para o áudio de narração: **igualar o volume** antes (medir os dois com `ebur128`), **crossfade de 20 ms** e **cortar entre duas palavras**.
- O ideal é que todo o áudio da VSL venha do **mesmo microfone**, para o timbre não mudar na troca.
- A trilha sintetizada fica baixa sob a voz (ducking automático), como no resto do filme.

---

## 8. Passo a passo técnico

1. **Recortar o trecho do vídeo** em frames 1080×1920, 30 fps:
   ```
   ffmpeg -ss <início> -t <duração> -i take.MP4 -vf "fps=30,scale=1080:1920:flags=lanczos" -start_number 0 narr/bg/%04d.jpg -q:v 2
   ```
2. **Recortar o narrador** (cerca de 10 s por frame no CPU; rodar em segundo plano):
   ```
   cd narr && python -I matte.py birefnet-portrait
   ```
   Isso gera `narr/fg/%04d.png` (o narrador com fundo transparente).
3. **Montar a voz:** o áudio do vídeo no trecho dele, depois a narração, com volumes igualados (ver §7). Ajustar os tempos das palavras em `words.js` para os do vídeo.
4. **No `comp.js`:**
   - `FOOT = { end: <fim da fala dele>, out: 0.36, n: <nº de frames> }`
   - as formas do trecho usam `LAYOUT` (posição, escala e glifos reduzidos);
   - a forma que sai do trecho cresce para o centro com `lay = 1 - ramp(t, FOOT.end - 0.06, 0.55, E.inOut)`;
   - os contadores e callouts começam **depois** de `FOOT.end`;
   - a câmera fica quase parada até `FOOT.end`;
   - em `events()`, entra um `glitch` de 0,4 s na quebra.
5. **Conferir em stills** nos pontos críticos: símbolo formado, a queda, a quebra (FOOT.end + 0,1 / + 0,2) e o símbolo já no centro.
6. **Render:** `python render.py video --layout above --out <nome>.mp4`.

---

## 9. Checklist do trecho com narrador

- [ ] O símbolo está **acima da cabeça** e **nunca toca o rosto**.
- [ ] Os glifos mantêm a textura ASCII (não viraram mancha).
- [ ] Nenhum contador ou callout sobre o corpo dele.
- [ ] A legenda aparece igual ao resto do filme.
- [ ] O símbolo **sobrevive à saída** e cresce até o centro; o vídeo se quebra em faixas e não há corte seco.
- [ ] Volume e timbre da troca de áudio sem salto perceptível.
- [ ] Recorte limpo (cabelo, óculos, mãos) em todos os frames.
