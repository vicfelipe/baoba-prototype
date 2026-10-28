# Cangaceiro — produção e integração

26/10/2026. Classe **DPS Ranged** do [documento 19](<19 - Classes.md>), produzida pelo pipeline Lunia (skill `lunia-character`) a partir das referências enviadas pelo usuário. Nenhuma malha, textura, medição, captura ou ação de outro personagem foi usada como entrada. As funções comuns do pipeline (`build.py`: bake, rig, toon, exportação) são reutilizadas como código. `build/source-manifest.json` registra o SHA-256 das imagens lidas.

## Referências

Geradas pelo usuário no Nano Banana a partir de `SourceArt/Cangaceiro/PROMPT.md`. Os originais ficam na raiz de `SourceArt/Cangaceiro/`; as cópias de trabalho ficam em `references/`.

| Vista | Original | Cópia |
| --- | --- | --- |
| Frente | `h3Hqt.jpg` | `references/front.jpg` |
| Costas | `kgrte.jpg` | `references/back.jpg` |
| Lateral esquerda | `Wax59.jpg` | `references/side-left.jpg` |
| Lateral direita | `yBl2u.jpg` | `references/side-right.jpg` |
| Armas | `f84Wr.jpg` | `references/weapons.jpg` |

A primeira lateral esquerda (`0mtgP.jpg`) desenhava sandálias; o usuário a substituiu pela `Wax59.jpg`, com botas. O desenho final difere do prompt em vários pontos, e as referências prevalecem: colete de couro com ombreiras, saiote em abas pontiagudas, botas de cano alto, chapéu de bicos sem lenço e sem bornais bordados.

**Medidas:** altura de 1,89 m, do topo do chapéu à sola, com o topo da cabeça em 1,80 m. Na frente, o chapéu vai de y=3 a y≈38, o queixo fica em y=130 e a sola em y=762, o que dá cerca de 7,9 cabeças. **Concordância entre as referências:** frente e costas espelhadas em 0,917; laterais em 0,882. A lateral direita tem uma bolsa nas costas do quadril e uma curva na aba do chapéu que não aparecem na esquerda. Derivar uma lateral da outra levaria a bolsa para o lado errado, por isso as duas foram mantidas. A lateral esquerda é a vista de profundidade (`depth_view`).

## Produção

`tools/charpipe/cangaceiro_build.py` executa os estágios `geo, bake, rig, anim, look, export`, com `--from` e `--to`. Ficha: `SourceArt/Cangaceiro/character.json`.

1. **Geometria medida nas máscaras:**
   - **Chapéu:** sólido em lente. Cada coluna da frente recebe a profundidade da lateral, estreitando nos bicos; a parede de trás desce até z=1,665, como nas costas.
   - **Cabeça:** anéis com a largura da frente e a profundidade da lateral; o nariz vem do resíduo do perfil.
   - **Tronco e braços:** perfis de frente e lateral; as ombreiras não entram na espessura do braço.
   - **Calça e botas:** perfis das pernas espelhados da direita; o pé da bota abre ~11° para fora, como na frente e nas costas.
   - **Saiote:** oito abas pontiagudas com espessura de 7 mm.
   - **Cinto, fivela, bolsa e ombreiras:** slot Support.
   - **Mão:** `build_hand` com 0,20 m e luva sem dedos.
2. **Bake:** as quatro vistas são projetadas como no piloto. As laterais pesam 0,25 no rosto, para não manchar as bochechas.
3. **Armas** (`tools/charpipe/cangaceiro_weapons.py`): bacamarte, par de pistolas e peixeira, modelados coluna a coluna sobre a silhueta da folha de armas, numa escala única de 1160 px/m (0,92, 0,39 e 0,42 m). A textura é a própria folha projetada de lado.
   - **Ossos:** cada arma tem seu osso sob a mão (`R_Bacamarte`, `R_Pistol`, `L_Pistol`, `R_Peixeira`), com a empunhadura no punho, o cano ao longo dos dedos e o topo da arma do lado do polegar.
   - **Bocas de cano:** os ossos `Muzzle_*` marcam de onde sai o tiro ou o arremesso.
4. **Rig** com 56 ossos de nomes Lunia:
   - 32 do corpo, mais oito cadeias `Skirt<dir>01–02`, quatro ossos de arma e quatro bocas.
   - Cabeça e chapéu rígidos; no máximo duas influências por vértice.
   - Calça e botas com pesos anatômicos e costura comum na virilha.
   - Cada aba pertence inteira a uma cadeia; as ombreiras copiam os pesos da pele sob elas.
5. **Movimento** (`tools/charpipe/cangaceiro_motion.py`): esqueleto Mixamo novo com as proporções do personagem e controles do add-on Mixamo Rig, com **braços e pernas em IK**.
   - **Mãos guiadas pela arma:** cada quadro tem uma pose de arma (punho e mira). A mão direita leva a arma até essa pose; a esquerda apoia por baixo da coronha, com o polegar para o cano.
   - **Alcance:** o erro de alcance das mãos é medido em cada quadro (`build/review/hand-reach.json`) e ficou abaixo de 1 cm em todos os clipes.
   - **Estilo de animação:** poses-chave com curvas monótonas, defasagem pelve → coluna → pescoço → cabeça e pés em IK com pivô no calcanhar e na planta.
   - **Saiote:** molas que não entram nas coxas nem no chão.
   - **Arquivo editável:** `mocap/authored-rig.blend`.
6. **Visibilidade das armas:** é a escala do osso de cada arma, gravada em cada clipe, então vem dentro do GLB. A peixeira some no instante do arremesso.
7. **Visual e exportação:** material toon 0,62/1,0, contorno de 0,19% da altura e GLB em `export/Cangaceiro.glb`.

### Clipes

| Clipe | Duração | Conteúdo |
| --- | --- | --- |
| `idle` | 2,4 s (loop) | Bacamarte atravessado no peito, respiração, troca de peso, olhar |
| `run` | 0,64 s (loop) | Corrida no lugar; o pé de apoio desliza a `CANGACEIRO.speed` |
| `shoot` | 0,9 s | Postura de lado, bacamarte no ombro, disparo aos 0,38 s, coice, retorno |
| `pistols` | 0,84 s | Saque das duas pistolas, tiros alternados aos 0,16, 0,38 e 0,60 s |
| `throw` | 0,7 s | Peixeira armada atrás da cabeça, arremesso aos 0,32 s (a faca sai da mão) |
| `dodge` | 0,44 s | Abaixa e avança, arma junto ao peito |
| `jump` | 0,6 s | Tempo de ar de `PLAYER.jump` |
| `hit`, `dead`, `victory` | 0,4 s, 1,4 s, 2,0 s (loop) | Reação, queda de costas, bacamarte erguido |
| `apose` | — | T-pose sem armas |

**Os tempos são proposta, à espera de validação.** Ficam no bloco `CANGACEIRO` de `web/src/config.js`, que o script de movimento lê. Ainda não há combate do Cangaceiro: dano, alcance e recarga não foram definidos.

## No jogo

`web/src/cangaceiro-asset.js` carrega `web/assets/cangaceiro.glb` com o material e o contorno do Capoeirista. Também oferece `animate(clipe, tempo)` e `muzzle(nome)`, que dá a posição da boca do cano para um projétil futuro. O visualizador da tela inicial ganhou o **Cangaceiro**, com os onze movimentos nomeados em português. O Capoeirista continua sendo o único herói jogável.

## Validação

| Verificação | Resultado |
| --- | --- |
| `check_glb.py ... 1.89` | PASS: 9 malhas, 56 ossos, 9 texturas, máximo de 2 influências, altura 1,89 (refeito depois das melhorias) |
| `node tools/check-cangaceiro.mjs` | PASS: clipes, altura, pés para a frente, pesos, chão, durações = `config.js`, visibilidade das armas, soltura da peixeira, mira no disparo, esqueletos independentes |
| `check-capoeirista.mjs`, `check-curupira.mjs` | PASS (sem regressão) |
| `npm --prefix web run build` | OK |
| `node tools/shot-cangaceiro.mjs` | `errors []`; capturas `Evidence/cangaceiro-*.png` |

Revisão contra as referências (`build/review/final.json`):

| Vista | Silhueta (IoU) | Cor divergente |
| --- | --- | --- |
| Frente | 0,923 | 6,5% |
| Costas | 0,900 | 4,4% |
| Lateral esquerda | 0,925 | 11,4% |
| Lateral direita | 0,840 | 20,1% |

**As metas do pipeline (IoU 0,96 e cor ≤ 5%) não foram atingidas.** Frente e costas ficam perto do teto de concordância das próprias referências (0,917); a lateral direita, abaixo do seu (0,88). As regiões mais fracas são:

- **Braços nas costas (0,77):** nas costas, os braços foram desenhados mais baixos.
- **Pés na frente (0,72):** biqueira e abertura simplificadas.

## Comparação com o TRELLIS e melhorias (26/10/2026)

O CharacterGen não rodou: não há versão online funcionando, e o download local foi cancelado. Em seu lugar, o usuário escolheu o **TRELLIS** online (`trellis-community/TRELLIS`, MIT), alimentado só pela frente. O teste está em `SourceArt/CangaceiroTRELLIS/README.md`.

| Aspecto | Pipeline (jogo) | TRELLIS |
| --- | --- | --- |
| Silhueta nas 4 vistas | 0,923 / 0,900 / 0,925 / 0,840 | 0,874 / 0,869 / 0,816 / 0,813 |
| Cor divergente | 4–20% | 27–53% (pintura escura, costas inventadas) |
| Superfícies que nenhuma referência vê (topo do chapéu, ombros, axilas) | projeções esticadas em listras, visíveis na câmera alta | volume e cor coerentes |
| Rig, slots, armas, clipes | completos | nenhum |
| Triângulos | 35,6 mil | 14,7 mil |

**O que foi incorporado ao personagem do jogo:**

1. **Completação de textura** (`complete_textures` em `cangaceiro_build.py`, configurada em `build.completion` na ficha), executada depois do bake:
   - **Alinhamento:** o modelo do TRELLIS é trazido para o referencial do personagem (giro de 180°, altura de 1,89 m, centro da caixa, depois ICP só de translação; deslocamento de 1,2 cm).
   - **Mapas por slot:** são assadas a posição de cada texel e a melhor visibilidade entre as quatro vistas (cosseno com a direção da vista, com oclusão).
   - **Ajuste de cor:** a cor do TRELLIS é ajustada à paleta da arte do usuário por média e desvio por canal, calculados nos texels bem vistos. A regressão texel a texel tinha correlação fraca e achatava o detalhe.
   - **Onde entra:** a cor completada entra de forma gradual só onde a visibilidade fica abaixo de 0,2–0,45. No chapéu (z > 1,72) o limite sobe para 0,6–0,9, porque a rampa da copa era vista de raspão pelas costas e esticava a pintura.
   - **Exceções:** mãos e pés espelhados não são completados, porque o UV é compartilhado. O rosto continua 100% da referência.
   - **Relatório:** `build/review/completion.json`.
2. **Orçamento:** abas do saiote com malha 9×10 (antes 12×14), chapéu com 45 colunas (antes 61) e armas com passo de 10 px (antes 7). Total de 35,6 → **29,7 mil triângulos**.

**O que não foi incorporado:** a geometria do TRELLIS (o chapéu dele vira um bicorne largo na lateral e o tronco erra a profundidade), a pintura escura e as costas inventadas. As referências do usuário continuam a autoridade em tudo o que elas mostram.

**Efeito medido** (`build/review/final2.json` contra `final.json`): silhueta inalterada (diferença ≤ 0,001). A cor divergente subiu um pouco onde as vistas enxergam de raspão as áreas completadas: costas 4,4 → 5,1%, lateral esquerda 11,4 → 13,1%, lateral direita 20,1 → 21,0%; frente igual (6,5%). Ganho visual na câmera de jogo: o topo do chapéu passa a ler como copa e aba, sem listras. Testes: `check_glb` PASS, `check-cangaceiro.mjs` PASS, Capoeirista e Curupira PASS, build OK, `shot-cangaceiro.mjs` com `errors []`. O GLB anterior está em `export/Cangaceiro-v1-backup.glb`.

## Correções de rig e textura (27/10/2026)

O usuário relatou vários problemas de rig e textura. A revisão em closes (botas, ombros, região sob o saiote, perfil) e a medição da torção de cada articulação em todos os clipes mostraram as causas abaixo.

| Problema visto | Causa | Correção |
| --- | --- | --- |
| Aba pontuda saindo do tornozelo, pé como prancha, pulso e ombro deformados, ombreiras soltas do ombro ao baixar o braço | Os ossos IK do add-on Mixamo Rig têm roll ~180° diferente dos ossos do esqueleto Mixamo novo, e o `COPY_TRANSFORMS` impõe esse roll. Braço e antebraço ficavam a −179°, coxa e canela a +173–176°, e mão e pé a 0°: meia volta concentrada no pulso e no tornozelo, inclusive na pose de referência. | `cangaceiro_motion.py` usa como repouso a pose que o próprio rig avalia com todos os controles zerados, em vez de `matrix_local`. A pose de referência agora é identidade exata. As posições dos membros em todos os clipes não mudam, só a torção. |
| Pulso torcido nas poses de arma (mão até ±172° em relação ao antebraço) | O antebraço IK é uma dobradiça pura, então a pronação da pegada caía toda no pulso | O antebraço assume metade da torção da mão em torno do próprio eixo. O máximo agora é 86° (arremesso). |
| Cunha cinza-clara e faixa marrom solta entre as pernas, sob o saiote | A completação pelo TRELLIS também pintava a calça, com ganho de cor de 3,9×: as sombras escuras do modelo viravam cinza | `build.completion.slots = Head, Body, Support` e ganho limitado a 0,67–1,5 por canal (`gain_range`) |

**Verificação:**
- Torção local por articulação em todos os clipes: na pose de referência é 0 em todas; canela/pé ≤ 3° e coxa ≤ 71°, ou seja, só o giro do quadril.
- Silhueta e cor contra as referências, medidas no `stage-bake`, sem armas: iguais às de antes (frente 0,923/6,5%, costas 0,899/5,1%). A revisão em T-pose não vê as áreas corrigidas.
- `check_glb` PASS, `check-cangaceiro.mjs` PASS, build OK, `shot-cangaceiro.mjs` com `errors []`.
- Backups: `export/Cangaceiro-v2-backup.glb` e `export/cangaceiro-web-before-twistfix.glb`.

**Ferramentas gratuitas avaliadas e integradas (27/10/2026):**

| Ferramenta | Decisão | Motivo |
| --- | --- | --- |
| `tools/charpipe/joint_twist.py` (nosso) | Integrada como etapa da skill | Pega exatamente o defeito desta revisão; Cangaceiro PASS |
| Khronos glTF-Validator + glTF Transform `inspect` (npm, `web` devDependencies, versões fixas) | Integradas: `npm --prefix web run check:glb` | Os 6 GLB do jogo têm 0 erros. Avisos esperados: `NODE_SKINNED_MESH_NON_ROOT`. Texturas acima de 1024: bacamarte 1086×241, Capoeirista 2048², Lutador 2752×1536 |
| Robust Weight Transfer (add-on GPL-3, `D:/Tools/rwt-src`, dependências instaladas na pasta do add-on) | Disponível em `tools/charpipe/rwt.py`, mas fora do build do Cangaceiro | Medido nas ombreiras em todos os clipes: desvio médio da pele de 3,54 mm contra 3,41 mm da cópia do vértice mais próximo; penetração máxima de 12,6% contra 12,4%. Sem ganho para peças afastadas da pele. |
| AccuRIG, UniRig, StableProjectorz | Não integradas | AccuRIG é app de janela que troca o nosso rig. UniRig exige pesos grandes e NVIDIA. StableProjectorz é feito para NVIDIA e tem interface gráfica; a GPU daqui é AMD. |

## Segunda revisão: cabeça, tiro e etapa de validação (27/10/2026)

O usuário apontou três problemas e pediu uma etapa do pipeline que valide a proximidade com as referências, parado e em movimento:

1. Erros na cabeça.
2. Textura do rosto embaixo do chapéu.
3. Braço direito entrando no corpo no tiro.

**Mixamo Rig oficial (1.11.11, enviado pelo usuário):** não roda no Blender 5.2.
- Falha na importação por causa de `bpy.app.version_char`.
- Também usa camadas de ossos, removidas no 4.0, e `action.fcurves`, removido no 5.0.
- O pipeline continua com o porte desse mesmo código para Blender 4.2+/5.x (extensão `mixamo_rig` 1.2.2, "2024 Adobe, Tyler Walker"), que gera o mesmo rig de controle Mixamo.
- O zip extraído ficou em `D:/Tools/mixamo_rig-user`.

### Correções

| Problema | Causa | Correção |
| --- | --- | --- |
| Rosto e cabelo pintados sob a aba e as pontas do chapéu | Nenhuma vista vê essas faces; as projeções de frente e de costas e a completação pintavam o que estava atrás | `head_undersides()` depois do bake: texels do chapéu (atributo `hat`) não virados para cima e mal vistos (visibilidade < 0,4) recebem o couro do topo do chapéu logo acima, sombreado ×0,72. A mandíbula vista de baixo recebe a pele vizinha. Uma primeira versão, só pela normal, apagou os ornamentos da frente; por isso a visibilidade entrou no critério. |
| De perfil, a aba cobria os olhos | As pontas, baixas na vista de frente, ficavam na profundidade do rosto | As pontas foram deslocadas para trás, sobre a orelha (`ear_y`), como nas duas laterais |
| Braço direito 21,6 cm dentro do tronco no tiro | Polo do cotovelo sempre atrás e embaixo; corpo girado 56°, com a empunhadura no centro do peito | O polo vai para a lateral quando a mão sobe à frente do peito. Bacamarte no ombro direito (x = −0,12), corpo girado ~30°. |
| Punho na cintura (`victory`) 6,9 cm dentro; arma colada no ventre (`hit`) 3,2 cm | Alvos da mão encostados no corpo | Alvos afastados |
| Pé 5 cm abaixo do chão no salto | Pivô do pé atrás dos dedos | Pivô na ponta do pé |
| Abas atravessando as coxas (até 8 cm) | A mola testava só a linha central do osso | A mola testa vértices reais de cada aba (até 24 por osso) e gira a aba até todos ficarem fora da coxa e acima do chão |
| Calça rasgando na virilha (8,6×) e no cós (4×) | Costura central com um osso por lado; degrau de 2 cm no cós | Topo da virilha preso à pélvis; rampa coxa→pélvis contínua de 14 cm |
| Ombreira dobrando ao erguer o braço (6×) | Cópia dos pesos da pele, com borda dura entre ombro e braço | Mistura suave ombro→braço ao longo da placa |
| Bota (5×) e axila (4×) esticando | Peito do pé com 65% de canela; bordas duras do bone heat | A parte da canela some na frente do tornozelo; pesos do corpo suavizados e limitados de novo a 2 influências |
| Aba do chapéu 2 cm abaixo do chão na queda | Cabeça reta deitada | Queixo ao peito (`head.pitch` 30) |

### Etapa de validação (nova, `tools/charpipe/validate.py`)

`python tools/charpipe/validate.py SourceArt/Cangaceiro/character.json` executa quatro portões e grava `build/review/validation.json`:

1. **Referência (parado):**
   - Roda o `review.py` no `stage-bake` (sem armas), por vista.
   - O limite de silhueta é a concordância das próprias referências menos 0,03. O limite de cor divergente é 8% na frente e nas costas e 15% nas laterais.
   - A meta continua 0,96 / 5%.
2. **Movimento:** `motion_check.py`, em todos os clipes e a cada 2 quadros.
   - Torção por articulação.
   - Braço dentro do tronco (seção do tronco em repouso): até 2,5 cm.
   - Chão: até 2 cm.
   - Abas dentro das coxas: até 2,5 cm.
   - Estiramento da malha (arestas ≥ 3 mm, percentis 0,5/99,5): 0,3–2,0.
   - Regiões excluídas ficam na ficha, com motivo, e aparecem no relatório: aqui, a costura da virilha. Ela precisaria de 3 ossos, o contrato Lunia permite 2, e fica coberta pelas abas.
3. **GLB:** `check_glb.py` e `validate-glb.mjs`.
4. **Vídeo:** `motion_video.py` gera `Evidence/<nome>-movimentos.mp4` com todos os clipes, câmera orbitando e o nome do clipe na tela, mais os quadros soltos. Serve para a passada visual.

**Resultado final do Cangaceiro:**

| Portão | Resultado |
| --- | --- |
| Movimento | **PASS** em todos os 11 clipes. Braço ≤ 2,2 cm (era 21,6), chão ≤ 0,3 cm (era 5,1), abas 0 cm (era 8,1), estiramento ≤ 1,96 (era 6,9), torção dentro dos limites. |
| GLB | **PASS** |
| Vídeo | `Evidence/cangaceiro-movimentos.mp4`: 19,6 s, 981 quadros |
| Referência: frente / costas / lateral esquerda | **ok**: 0,923 e 6,7% / 0,899 e 5,0% / 0,924 e 12,8% |
| Referência: lateral direita | **FAIL**: 0,839 (limite 0,851) e 20,9% (limite 15%). As duas laterais discordam entre si (0,88: bolsa nas costas, curva da aba), e a geometria segue a esquerda, que é a vista de profundidade. Aproximar da direita pioraria a esquerda. Fica em aberto para decisão: profundidade pelo consenso das duas laterais, ou nova lateral direita. |

Os testes do jogo continuam passando: `check-cangaceiro`, `check-capoeirista`, `check-curupira`, o build e `shot-cangaceiro` com `errors []`. Backup do GLB anterior: `export/Cangaceiro-v3-backup.glb`.

## Cangaceiro jogável (27/10/2026)

O usuário escolheu o Cangaceiro como **herói selecionável** e aprovou os tempos dos golpes.

- **Tela de título:** botões Capoeirista / Cangaceiro. Linha da classe e controles mudam com a escolha, que fica salva em `localStorage`.
- **Mesmas teclas, outro kit** (`player.js`, `KITS`):

  | Tecla | Habilidade | Efeito |
  | --- | --- | --- |
  | J / clique | Bacamarte | 46 de dano, 12 m |
  | Q | Peixeira | Interrompe conjurações; 40 de dano, 14 m, recarga de 6 s |
  | E | Pistolas | 3 × 16 de dano, 8 m, recarga de 4 s |

  A Peixeira fica em Q para que o aviso "Interromper (Q)" dos chefes continue valendo; as dicas dos chefes citam a habilidade do herói.
- **Projéteis** (`projectiles.js`):
  - Saem da boca da arma (ossos `Muzzle_*` do GLB), nos instantes de impacto do `config.js`.
  - Voam até o alvo assistido, ou para a frente se não houver alvo, e acertam o primeiro inimigo no caminho.
  - Param em obstáculos e no fim do alcance. Cada projétil acerta uma vez.
- **Proposta de balanceamento:** dano, alcance, recarga e velocidade dos projéteis são proposta, não balanceamento. O Cangaceiro faz ~50 de dano/s de longe; o Capoeirista, ~60/s de perto.
- **HUD:** nome, papel (DPS Ranged), retrato com chapéu, ícones de bacamarte, peixeira e pistolas, e recargas do kit.
- **Teste** (`shot-cangaceiro.mjs`, parte jogável): escolha na tela de título; dano exato do bacamarte, da rajada e da peixeira num Fragmento; a peixeira interrompe o Chamado do Curupira a 10 m; volta ao Capoeirista sem resíduo. Capturas em `Evidence/cangaceiro-title-pick.png`, `-game-bacamarte.png`, `-game-peixeira.png` e `-game-interrompe.png`.

## Capturas Mixamo do usuário: esquiva, pulo e corrida (27/10/2026)

O usuário baixou quatro tomadas Mixamo em `Downloads`. As cópias de trabalho estão em `mocap/` de cada personagem; os originais não foram tocados.

| Tomada | Personagem | Conteúdo | Trecho → clipe |
| --- | --- | --- | --- |
| `Dodge_Capoeirista.fbx` | Capoeirista | ginga, agachamento e parafuso aéreo | 1,45–2,6 s → `dodge` 0,44 s, com volta à base |
| `Dodge_Ranged.fbx` | Cangaceiro | mergulho com rolamento | 0,1–1,25 s → `dodge` 0,44 s |
| `Jump.fbx` | os dois | agacha, voa, aterrissa | 0,66–1,34 s (decolagem → toque) → `jump` 0,6 s (tempo de voo do jogo) |
| `Running.fbx` | os dois | 3,77 m por ciclo de 0,633 s | ciclo → `run` 0,74 s, para a passada bater com 5,1 m/s |

**Capoeirista** (`build.mocap` + `clips.bake_mixamo`):
- **Pulo:** a opção nova `airborne` tira do quadril a subida da própria tomada (pé ou ponta mais baixa acima do 1º quadro). O jogo já faz o arco, e assim a altura não dobra.
- **Trava de chão:** passou a incluir pontas dos pés, dedos e cabeça, não só os tornozelos.
- **Clipes antigos:** de quebra, melhoraram a `meialua` (11,9 → 3,0 cm abaixo do chão) e o `combo0` (2,5 → 1,2 cm).
- **Configuração anterior:** guardada em `build.mocap_previous`.

**Cangaceiro** (`cangaceiro_motion.py`, classe `Capture`, `build.mocap` na ficha):
- **O que vem da tomada:** quadril, coluna, cabeça, pés e direção dos joelhos acionam os controles do rig de autoria. As mãos seguem segurando o bacamarte (corrida, pulo); no rolamento (`arms: true`), seguem a tomada com a arma na mão direita.
- **Molas e armas:** as abas e a visibilidade das armas continuam.
- **Rumo:** o rumo inicial da tomada é retirado. `Dodge_Ranged` começa virado 62° para o lado e girava o corpo e os joelhos.
- **Trava de chão em duas etapas:**
  - nos pontos da tomada, já na nossa escala, com chapéu e botas;
  - depois da IK, no nosso rig: joelhos, tornozelos, cantos da sola, mãos, costas e cabeça.
- **Pesos das abas:** a pélvis segura só a faixa sob o cinto; o resto gira na dobradiça. Antes, uma coxa erguida furava a metade de cima, presa à pélvis.

**Verificação de movimento** (`motion.json`):

| Clipe | Resultado |
| --- | --- |
| `run` | Chão 0, abas 0, braço 2,8 cm, estiramento da bota 2,02 (limites 2,5 cm e 2,0) |
| `jump` | Chão 0. Abas 7,7 cm no auge, com os joelhos no peito: a coxa horizontal ocupa a faixa logo abaixo do cinto, onde a aba é dobradiça (o couro dobraria) |
| `dodge` | Braços encolhidos no peito (6,2 cm), coxa/braço 106°/138° de torção, chão 4,0 cm, abas 5,6 cm, estiramento 2,3–2,5. É uma acrobacia comprimida 2,6× |

- **Antes das correções**, a esquiva tinha a cabeça 30 cm dentro do chão e o joelho a 157°.
- **Testes:** `check_glb`, `check-*`, `check:glb` e build continuam passando.
- **Backups:** `export/cangaceiro-web-before-mocap.glb` e `CapoeiristaNovo/export/capoeirista-web-before-mocap.glb`.

**Capoeirista (modelo adotado):** a mesma verificação mostra limites antigos, anteriores a esta tarefa, em quase todos os clipes: estiramento até 4×, braço 10,8 cm no `victory`, coxa 101° no `hit`. Ver `SourceArt/CapoeiristaNovo/build/review/motion.json`.

**O mesmo defeito existe no Curupira:** coxa a +170° e pé a −167° em todos os clipes (`curupira_motion.py` usa o mesmo add-on). Ainda não foi corrigido.

**Ainda em aberto no Cangaceiro:**
- Perfil da cabeça: as pontas do chapéu descem até a altura dos olhos, e o rosto fica achatado de lado.
- Abertura dos pés no `idle`: 8–10° somados aos ~11° da malha.
- Mãos: luva simplificada, polegar curto.

## Limitações conhecidas

- **Orçamento acima do Lunia:** 29,7 mil triângulos depois da redução. Support e armas ainda são os maiores.
- **Chapéu sólido:** a copa interna não é côncava; o topo agora usa a cor completada pelo TRELLIS.
- **Mãos:** o polegar é mais curto que o da referência; a luva sem dedos vem só da textura.
- **Queda:** as abas encostam no chão e ainda atravessam até 4 cm durante ~0,1 s no repique.
- **Sem aprovação artística:** não houve aprovação visual do usuário nem playtest. Os tempos dos clipes são proposta.

## Reprodução

```powershell
$B = 'D:/Tools/blender-5.2.3-windows-x64/blender.exe'; $env:PYTHONDONTWRITEBYTECODE='1'
& $B -b --python tools/charpipe/segment.py -- SourceArt/Cangaceiro/character.json
& $B -b --python tools/charpipe/cangaceiro_build.py -- SourceArt/Cangaceiro/character.json
& $B -b --python tools/charpipe/check_glb.py -- SourceArt/Cangaceiro/export/Cangaceiro.glb 1.89
Copy-Item SourceArt/Cangaceiro/export/Cangaceiro.glb web/assets/cangaceiro.glb
node tools/check-cangaceiro.mjs; npm --prefix web run build; node tools/shot-cangaceiro.mjs
```
