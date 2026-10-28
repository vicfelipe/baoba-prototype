# Pipeline de personagens estilo Lunia

> **Regra do processo:** o passo a passo atual, consolidado, está na skill `.claude/skills/lunia-character/SKILL.md`. Este documento é o histórico do piloto (Capoeirista), com números e decisões de cada etapa.

26/10/2026. Estudo de como o Lunia monta personagens, modelo do **Capoeirista** feito a partir das 4 referências enviadas pelo usuário, e pipeline reproduzível para os próximos personagens. Skill do projeto: `.claude/skills/lunia-character/SKILL.md`.

Nada desta entrega reaproveita arquivos de sessões anteriores (`tools/build_lutador_20261026.py`, `tools/cbb-skinned-addon-20261026/`, `Evidence/lunia-20261026/`, `SourceArt/Lutador-20261026/`). Esses arquivos continuam no disco, sem uso. Do Lunia vieram apenas medidas e convenções; nenhuma malha, textura, osso ou animação do jogo entra no personagem.

## 1. Como o Lunia faz um personagem

Fonte: cliente em `D:\Jogos\source\Client`. Os personagens jogáveis ficam em `Animation/Player.zip` (protegido por senha; 15.970 arquivos, 18 classes), as texturas em `Mapping/<Classe>/*.dds` e os shaders em `Shaders/Character`. Importação para o Blender com o addon [cbb-skinned-addon](https://github.com/Cardboard-box-a/cbb-skinned-addon), clonado em `tools/cbb-skinned-addon`. No Blender 5.2 ele precisa de um patch de uma linha (remoção de `ActionFCurves` em dois imports); o exportador dele ainda usa `action.fcurves` e não funciona no 5.x.

Estudo reproduzível: `blender -b --python tools/charpipe/lunia_study.py -- Fighter`. Saída em `Evidence/lunia-study/<Classe>/`: `study.json`, renders, renders em wireframe e texturas.

**Montagem por slots.** `<Classe>.xml` lista os modelos (`Name`, `Mesh`, `Material`) e aponta para `<Classe>.animation.xml` (esqueleto + clips a 30 fps). O personagem é a soma de peças trocáveis que compartilham um esqueleto: `Head, Body, Hand, Leg, Foot, Support, Weapon`, mais slots de cosmético (`Back, Hip, Mask, ETC1…`). Cada slot tem de 60 a 150 variantes (`_000`, `_C046`…). O Fighter, por exemplo, tem 1.207 modelos no XML.

**Orçamento.** O total de triângulos das peças `_000` vai de 1.936 (Eir) a 4.011 (Iris). Fighter: 3.174 triângulos (Head 530, Body 490, Hand 336, Leg 350, Foot 476, Support 472, Weapon 520). As malhas são trianguladas, com membros de cerca de 8 lados e mãos em forma de luva com polegar. Proporção do Fighter: 18,5 unidades de altura (≈ 1 un = 10 cm), 6,7 cabeças.

**Textura.** Uma única difusa por slot, DXT1, 256² (Head, Body, Leg, Support, Weapon) e 128² (Hand, Foot). Não há normal map nem especular: luz, brilhos em pinceladas e contornos internos são pintados. O rosto ocupa cerca de ¼ da textura da cabeça (≈ 64 px), e olhos, nariz e boca são pintura sobre uma geometria mínima. Mãos e pés usam UV espelhado, ou seja, os dois lados ocupam o mesmo espaço (sobreposição de UV de 100%).

**Shader** (`Cartoon.MaterialGroup.xml`, `Cartoon.fxc`, `CharacterSilhouette.fxc`, `BandTexture.dds`). Iluminação em bandas a partir de uma rampa 4×4: valores ≈ 0,6 / 0,6 / 0,93 / 1,0, ou seja, sombra ≈ 60% da cor pintada. O contorno é um passe de silhueta por casco invertido com `silhouetteColor` = 0,137 cinza (em espaço gama, como no D3D9) e `silhouetteSize` = 0,1 unidade (≈ 0,5% da altura). Há variantes `NoSilhouette`, `Alpha` e `TwoSided`.

**Esqueleto e pesos.** O Fighter tem 131 ossos: o corpo (`Base, Waist, Chest1, Chest2, Neck, Head, L_/R_Shoulder, UpperArm, ForeArm, Wrist, Hand, Finger1-3, Thumb1-2, Pelvis1-2, Thigh, Calf, Foot, Toe1-2`), ossos de olhos e boca, 8 cadeias de 5 ossos para saia, cadeias de Support (cachecol/capa) e um `EffectBaseJoint` no chão. Cada vértice tem no máximo 2 influências, e a cabeça é rígida num único osso. As emendas entre peças ficam escondidas por roupa (luva, gola, cinto, bota).

## 2. O Capoeirista

Referências: `SourceArt/Capoeirista/references/` (cópias diretas dos anexos). Ficha: `SourceArt/Capoeirista/character.json`.

| Slot | Triângulos | Textura | Pesos |
|---|---|---|---|
| Head (cabeça, orelhas) | 902 | 1024² | rígida em `Head` |
| Body (tronco, pescoço, braços; colar e pingente) | 2.368 | 1024² | heat, ≤ 2 |
| Hand (mãos em luva + polegar, pulseiras; UV espelhado) | 856 | 512² | heat, ≤ 2 |
| Leg (abadá da cintura à barra inclinada) | 1.100 | 1024² | heat, ≤ 2, cós preso à pelve |
| Foot (pés, UV espelhado) | 356 | 512² | heat, ≤ 2 |
| Support (cordão: cinto, nó, ponta, franja) | 796 | 512² | heat, ≤ 2, cadeia `Cord01-03` |
| **Total** | **6.378** | 6 materiais | 35 ossos |

Silhueta contra as referências (IoU), valores atuais após a validação da seção 6: frente 0,969 · costas 0,965 · lateral direita 0,978 · lateral esquerda 0,862. A lateral esquerda gerada mostra o tronco cerca de 2 cm mais inclinado para frente que a direita. É uma inconsistência das imagens; o modelo segue a lateral direita e a pintura da esquerda é registrada linha a linha.

Arquivos:

- `SourceArt/Capoeirista/Capoeirista.blend`: fonte editável com material toon de 2 bandas, contorno por Solidify invertido e ação `PoseTest`.
- `SourceArt/Capoeirista/export/Capoeirista.glb` e `Capoeirista-report.json`.
- `SourceArt/Capoeirista/build/textures/Capoeirista_<Slot>_000.png`: texturas no padrão de nomes do Lunia.
- `SourceArt/Capoeirista/build/renders/`: quatro vistas, rosto, poses 15/30/45 (braços abaixados, ginga, chute alto) e câmera de jogo.
- `SourceArt/Capoeirista/build/review/final-*.png`: referência, sobreposição e modelo lado a lado.

## 3. Pipeline (`tools/charpipe`)

1. `segment.py`: segmenta as 4 vistas. A roupa branca tem a mesma cor do fundo, então o separador é o contorno desenhado: pixels escuros ou saturados formam uma barreira dilatada, o fundo é preenchido a partir da borda, e uma abertura morfológica remove sombras finas no chão. Em seguida calibra px/m pela altura, acha o centro de cada vista, mede os perfis de frente, pernas, braços e laterais e alinha as laterais à vista de profundidade.
2. `build.py --stages geo`: gera volumes por slot a partir dos perfis (anéis superelípticos com largura da frente e profundidade da lateral; nariz, boca e queixo vêm do resíduo do perfil lateral), une por remesh voxel e reduz ao orçamento com QuadriFlow (Decimate como reserva). O Support é feito de cascas simples, sem remesh.
3. `bake`: UV Smart Project. Cada referência é projetada ortograficamente com a própria calibração. O peso de cada vista é a visibilidade (bake de luz direta de um sol na direção da câmera, com sombra de todas as peças) elevada a 4. Antes da projeção, a linha de contorno da referência é removida e a cor interna é estendida para fora; nas vistas laterais, o disco do braço visto de frente é excluído. Mãos e pés são feitos no lado esquerdo e espelhados com UV compartilhado.
4. `rig`: juntas calculadas a partir das medidas e das razões em `anatomy`; nomes no padrão Lunia; heat weighting restrito aos ossos de cada slot, com reserva por distância; limite de 2 influências e normalização.
5. `anim`: 13 clipes do jogo autorados por código em `tools/charpipe/clips.py` (direções de osso no referencial do corpo, IK analítica de perna, cabeça nivelada), a 100 fps para que 0,42/0,55/0,62/0,75/0,38 s caiam em quadros inteiros; contato no tempo de impacto do `config.js`.
6. `look`: material toon (`Shader to RGB` → rampa constante → × textura → emissão) e contorno `#232323` linearizado, 0,35% da altura; renders.
7. `export`: GLB com materiais de cor base e relatório. `check_glb.py` reimporta o arquivo e confere esqueleto, skin, ≤ 2 influências, uma textura por slot e altura. Resultado atual: `GLB_CHECK PASS`.
8. `review.py`: renderiza com o enquadramento exato de cada referência e calcula o IoU da silhueta.

Tempo total: cerca de 1 minuto por personagem na CPU.

## 4. Limitações conhecidas

- A pintura é projeção das referências, não repintura à mão. Laterais e faces de cima dos braços, topo dos ombros e a parte de baixo do queixo vêm de vistas rasantes e ficam borradas. Para chegar ao acabamento Lunia, o próximo passo é repintar por cima das texturas de 512² (o ComfyUI em `D:\Comfy-Desktop` pode ajudar a gerar vistas faltantes ou fazer upscale/repintura).
- O UV Smart Project fragmenta ilhas. Funciona para o bake, mas atrapalha a pintura manual; um UV com costuras autorais facilitaria.
- Topologia do QuadriFlow: deforma bem nos testes, mas não tem loops de articulação desenhados à mão. Poses extremas (meia-lua, aú) ainda não foram testadas.
- A ponta do cordão acompanha a pelve e atravessa a coxa em chutes. A cadeia `Cord01-03` existe para animação secundária, que ainda não foi feita.
- As animações são poses-chave geradas por código (5–7 chaves por golpe), não animação de artista: falta antecipação, sobreposição e peso. Em dobras fortes de cotovelo (braço de guarda da ginga) o antebraço achata; pesos de articulação mais nítidos ou loops dedicados resolveriam.
- Mãos em luva (padrão Lunia): os dedos não se separam.

## 5. No protótipo web (26/10/2026)

O Capoeirista substitui o modelo anterior do Lutador como herói jogável. A classe, o kit e os números do combate continuam os do Lutador (docs 14 e 16).

- `web/assets/capoeirista.glb`: cópia de `SourceArt/Capoeirista/export/Capoeirista.glb`, com 6 slots, 35 ossos, 13 clipes do jogo e `PoseTest`.
- `web/src/capoeirista-asset.js`: carrega o modelo. O material `MeshToonMaterial` usa um gradiente de 2 tons só para detectar o lado iluminado e aplica a banda do Lunia (sombra = 0,62 × textura pintada), independente da intensidade das luzes da cena. Também monta o contorno `#232323` em casco invertido com skinning (6,3 mm) e mantém o mesmo relógio de ataque do modelo anterior.
- `buildLutador()` em `web/src/lutador.js`, o carregamento em `main.js` e o visualizador (botão **Ver Capoeirista · animações e modelo**) apontam para o novo modelo. `lutador-asset.js` e `assets/lutador.glb` continuam no repositório, fora da build; por isso a build caiu de 13,8 MB para 3,0 MB.

Verificação:
- `node tools/check-capoeirista.mjs`: PASS. Os 13 clipes exigidos existem, as durações batem com o combate, os ossos têm nomes Lunia, a geometria com skinning é finita em todos os clipes, loops e relógio de ataque funcionam, e os esqueletos de instâncias diferentes são independentes.
- `npm run build`: OK.
- `node tools/shot-capoeirista.mjs`: abriu `web/dist/index.html` no Chrome headless (SwiftShader), percorreu título, visualizador, ginga, Martelo no contato (0,16 s), início do jogo, corrida e golpe, sem erros de console. Capturas em `Evidence/capoeirista-*.png`.

Ainda não houve uma sessão completa jogada por pessoa, nem medição de FPS em GPU real.

## 6. Validação contra a referência (26/10/2026)

Pedido: o modelo e as texturas precisam ficar idênticos às imagens. Método: `review.py --look` renderiza o modelo com o enquadramento e a escala exatos de cada referência, com textura sem iluminação. Ele mede o IoU da silhueta e a diferença de cor pixel a pixel por região, desconsiderando a borda de 3 px com o traço desenhado. `ref_consistency.py` mede o quanto as próprias referências concordam entre si.

| Vista | IoU antes | IoU agora | Teto da referência | Cor: erro médio / % divergente (antes → agora) |
|---|---|---|---|---|
| Frente | 0,945 | **0,969** | 0,979 (frente×costas) | 5,3 / 3,7% → 5,2 / 4,3% |
| Costas | 0,938 | **0,965** | 0,979 | 5,3 / 4,3% → 5,5 / 5,2% |
| Lateral direita (profundidade) | 0,955 | **0,978** | — | 13,9 / 13,6% → 12,9 / 15,6% |
| Lateral esquerda | 0,837 | **0,862** | **0,858** (esquerda×direita) | 19,5 / 20,3% → 19,5 / 21,9% |

Por região na frente, IoU antes → agora: cabeça 0,94 → 0,98; tronco 0,97 → 0,98; braços 0,93 → 0,96; pernas 0,95 → 0,97; pés 0,73 → 0,87. A cor divergente dos pés caiu de 15,3% para 10,8%.

O que mudou:
- **Etapa `fit`:** encaixa os vértices de contorno de cada peça nas silhuetas da frente e da lateral de profundidade, com teste de oclusão.
- **Pés:** passaram a seguir o perfil medido, e a barra da calça ficou inclinada.
- **Acessórios como geometria:** colar com pingente e pulseiras foram medidos na referência; o nó e a ponta do cordão seguem o caminho e a largura medidos na frente e na lateral.
- **Texturas:** 1024² em Head, Body e Leg (512² nas demais), com mistura entre vistas mais seletiva e prioridade da frente na cabeça.
- **Contorno:** máscara NoSilhouette nos acessórios finos e na base oculta da cabeça.
- **Orçamento:** foi para 6.378 triângulos, acima do Lunia, por causa dos acessórios.

Limites medidos:
- **Lateral esquerda:** as duas laterais da referência discordam entre si (IoU 0,858; o tronco está cerca de 2 cm mais inclinado na esquerda). Nenhum modelo único consegue coincidir com as duas. O modelo segue a lateral direita e já empata com o teto da esquerda.
- **Cor nas laterais e áreas a ~45°:** frente e lateral foram desenhadas com iluminação diferente, e um texel só guarda uma cor. Teste: dar peso 4× às laterais baixa o erro lateral de 15,8% para 12,5%, mas sobe o da frente de 5,2% para 6,7%. Mantive a frente como prioridade. Na cabeça vale a mesma troca: 11,2% na frente e 11,2% na lateral, contra 13,6% / 8,6% antes.
- **Mão vista de frente nas laterais:** a referência mostra dedos e nós dos dedos; o modelo usa mão em luva (padrão Lunia). É a maior fonte restante de cor divergente no tronco lateral (26%).
- O rosto fica levemente mais suave que a referência por causa da reamostragem dupla (imagem → textura → tela).

Para ir além: gerar uma lateral esquerda consistente com a direita (ComfyUI em `D:\Comfy-Desktop`), adicionar vistas ¾ de referência para as áreas a 45°, modelar dedos e repintar à mão as regiões rasantes.

## 7. ComfyUI: lateral coerente e texturas nítidas (26/10/2026)

**Ambiente.** ComfyUI v0.42 em `D:\Comfy-Desktop`, PyTorch ROCm, GPU AMD RX 6600 XT com 8 GB. A instalação veio sem nenhum modelo. Baixei apenas o **RealESRGAN_x4plus_anime_6B** (18 MB, licença BSD-3, do autor do Real-ESRGAN) em `ComfyUI-Shared/models/upscale_models`. O 4x-AnimeSharp foi descartado por ter licença não comercial. O servidor sobe headless e é controlado por API (`tools/charpipe/comfy.py`, só biblioteca padrão do Python); o comando está na skill.

**Lateral esquerda coerente** (`tools/charpipe/derive_side.py`). A lateral direita é espelhada e reamostrada no enquadramento métrico da esquerda. Da esquerda original entram apenas os pixels exclusivos daquele lado: a ponta do cordão abaixo do cinto e o nó, numa janela de y. São 7.877 px transplantados, sem nada gerado por IA. Resultado em `references/derived/side-left-consistent.png`, com a máscara do transplante ao lado. A original continua em `references/side-left.png` (`references_original` no JSON). As duas laterais passaram de 0,858 para **0,990** de concordância. Resta um degrau de 1–2 px nas listras do cinto, na borda da janela do nó.

**Upscale 2×** das quatro vistas no ComfyUI: 4–28 s por imagem na GPU. O bake amostra as imagens ampliadas, com a calibração multiplicada por 2, e aplica **transferência de detalhe**: `U + blur(original − U)`. Assim ficam as bordas nítidas do upscaler e a cor/sombreamento da imagem original, já que o upscaler sozinho alisava os degradês. Segmentação e medidas continuam nas originais.

Resultado (`review.py --look`; a lateral esquerda é comparada com a derivada; entre parênteses, contra a original):

| Vista | IoU | Cor divergente antes → agora | Pés (cor divergente) |
|---|---|---|---|
| Frente | 0,969 | 4,3% → 4,9% | 10,8% → 11,6% |
| Costas | 0,965 | 5,2% → 4,4% | 19,7% → 19,1% |
| Lateral esquerda | 0,862 → **0,977** (0,862) | 21,9% → **8,9%** (28,6%) | 16,5% → 2,8% |
| Lateral direita | 0,978 | 15,6% → 13,8% | 30,6% → **3,8%** |

A frente perdeu 0,6 ponto porque as têmporas passaram a receber a lateral esquerda coerente. Contra a lateral esquerda original o erro sobe, como esperado: o modelo agora segue a versão coerente.

O que ainda difere: a mão vista de frente nas laterais (luva × dedos) e a cor das áreas a ~45°, onde frente e lateral têm iluminação diferente. O próximo uso do ComfyUI seria gerar vistas ¾ e um close das mãos com um modelo de edição/multivista. Isso exige baixar modelos de vários GB e não foi testado nesta GPU.

## 8. Modelo do usuário no jogo (26/10/2026)

O arquivo `SourceArt/Capoeirista/export/capoerista_novo_mod.glb` (exportado por um editor three.js) continha duas coisas. Primeiro, as 6 peças do nosso modelo, com geometria e UV idênticas e as mesmas texturas reamostradas para 2048², sem edição. Segundo, um **modelo novo** (objeto `front.png`, 24.234 triângulos, textura 2048²), sem esqueleto e sem animações. É esse modelo que está no jogo agora.

Adoção (`tools/charpipe/adopt.py`, ficha `SourceArt/CapoeiristaNovo/character.json`):
- Importa só o objeto escolhido e normaliza (1,80 m, pés em z = 0, frente para −Y).
- Mescla 5.101 vértices duplicados nas costuras de UV; sem isso, o heat weighting falhava na malha inteira.
- Recalcula as normais.
- **Corrige a textura sem alterar a pintura.** 161 mil texels pretos (palmas e parte de baixo dos braços, que a geração nunca viu) recebem a cor de pele vizinha, mas só onde a superfície aponta para baixo na T-pose. Depois o atlas é recozido sobre si mesmo com 24 px de margem, porque o fundo preto sem margem criava bordas pretas nas costuras.
- Renderiza as silhuetas do próprio modelo com a calibração das referências; `segment.py` mede esse corpo, então as juntas seguem o modelo do artista.
- `build.py --stages rig,anim,look,export` com o slot único `Full` (todos os ossos): mesmo esqueleto Lunia, 13 clipes do jogo, banda toon, contorno de 0,19% da altura (a superfície com relevo pede um traço mais fino) e GLB de 4,6 MB.

No jogo: `web/assets/capoeirista.glb` é o modelo adotado. `web/src/capoeirista-asset.js` usa contorno de 3,4 mm. O GLB anterior do pipeline ficou em `SourceArt/Capoeirista/export/Capoeirista-pipeline-backup.glb`. `check_glb` PASS, `check-capoeirista.mjs` PASS, build de 7,3 MB e Chrome headless sem erros (capturas em `Evidence/capoeirista-*.png`).

Fidelidade às referências, medida com `review.py --original`: silhueta frente 0,877, costas 0,878, laterais 0,706/0,788; cor divergente de 22–35%. O modelo do pipeline tinha 0,969/0,965/0,862/0,978 e 4–14%. O modelo do usuário é outra interpretação do personagem, com mais volume esculpido e pele mais clara. Ele foi aplicado por decisão do usuário, e o modelo do pipeline continua disponível para voltar.

## 9. Correções pedidas: escultura, mãos, pés, faixa e animações (26/10/2026)

**Animações (v2, `tools/charpipe/clips.py`).**
- **Antes:** cada golpe tinha 5 poses-chave, interpoladas osso a osso, com IK só nas chaves. O pé fazia trajetórias erradas e o pé de apoio deslizava.
- **Agora:** chaves paramétricas (alvos dos pés, quadril, giro, tronco, braços, joelho, pé em ponta), interpolação cúbica monotônica e **IK resolvida a cada 0,02 s**.
- **Pé de apoio:** plantado no mundo, gira sobre si mesmo sem deslizar.
- **Chutes:** cada um segue uma curva de alvo do pé — Martelo circular até a altura do peito, Armada e meia-lua em círculo completo, rasteira rente ao chão.
- **Verificação:** `tools/charpipe/filmstrip.py` gera a sequência de quadros e desenha o caminho dos tornozelos.

**Ginga do Mixamo.** `SourceArt/Capoeirista/mocap/mixamo-capoeira.fbx` (fornecido pelo usuário; licença do Mixamo permite uso em jogos) entra por retarget (`bake_mixamo`).
- **Retarget:** cada osso recebe a mudança de rotação do osso Mixamo correspondente em relação à T-pose; dedo médio vai para a luva, polegar para o polegar.
- **Duração:** 3,4 s, com loop por crossfade.
- **No lugar:** a captura viaja 1,5 m de lado. Fica 35% desse balanço (`mocap_sway`); os pés deslizam um pouco, como em qualquer versão "in place". Se o Mixamo oferecer **In Place** para esta animação, baixar assim elimina o deslizamento.
- **Configuração:** `build.mocap` no `character.json` substitui o clipe `idle` nos dois modelos.

**Faixa (cordão).**
- **Mola:** a ponta é uma mola amortecida movida pelo quadril — atrasa, abre nos giros e é empurrada pela coxa esquerda para não atravessá-la.
- **Sombra:** a "sombra" errada era a banda toon trocando claro/escuro numa tira fina, mais o contorno atravessando a tira. A máscara por vértice (COLOR_0: R = contorno, G = banda) desliga os dois na faixa, no Blender e no shader do jogo. No modelo adotado, a faixa é detectada pela cor da pintura.

**Modelo do pipeline.**
- **Mãos:** palma com quatro dedos de comprimentos diferentes, pontas arredondadas e polegar em três segmentos.
- **Pés:** perfil medido, arco plantar e cinco dedos.
- **Relevo muscular:** sombreamento das referências (passa-alta), até ~1 cm, sobre uma malha mais densa.
- **Orçamento:** 17.904 triângulos.
- **Fidelidade:** silhueta frente 0,969 → 0,978, costas 0,965 → 0,973, pés 0,87 → 0,92.
- **Disco do deltoide:** voltou a ser excluído das laterais, o que eliminou a mancha nas costas.

**No jogo:** continua o modelo do usuário (`SourceArt/CapoeiristaNovo`), agora com os clipes v2 e a ginga do Mixamo. O modelo do pipeline atualizado está em `SourceArt/Capoeirista/export/Capoeirista.glb`; para usá-lo, copie-o para `web/assets/capoeirista.glb` e volte `OUTLINE` para 0,0063 em `capoeirista-asset.js`. `check-capoeirista.mjs` PASS, build OK, Chrome sem erros.

## 10. Golpes do Mixamo: Martelo e Ponteira (26/10/2026)

Arquivos do usuário copiados para `SourceArt/Capoeirista/mocap/`: `mixamo-martelo.fbx` (1,30 s, perna esquerda, pico do pé a 1,60 m em 0,50 s), `mixamo-ponteira.fbx` (1,35 s, perna direita, pico a 1,23 m em 0,57 s) e `mixamo-ginga-au.fbx` (3,75 s, ginga lateral terminando em aú, viaja 1,7 m — guardado, não usado).

- **Martelo → `combo0`, Ponteira → `combo1`.** A Ponteira substitui o Galopante, que não tem captura. `config.js`, o visualizador e o README agora dizem Martelo → Ponteira → Armada; dano e tempos não mudaram.
- **Retiming (`bake_mixamo`, `duration`/`contact` em `build.mocap`).** O pico do pé que chuta é detectado automaticamente e mapeado em dois trechos lineares, para que o contato caia em 0,16 s de um clipe de 0,42 s, como o combate exige. A captura roda cerca de 3× mais rápida que o original.
- **Ajuste ao nosso esqueleto.** Uma trava de solo levanta o quadril quando a diferença de proporção das pernas afundaria o pé de apoio; no Martelo o tornozelo de apoio fica constante em 0,085 m.

Aplicado aos dois modelos. O jogo usa o modelo do usuário, com check PASS, build OK e Chrome sem erros.

Opções em aberto:
- **Ritmo mais fiel:** aumentar a duração dos golpes em `config.js` deixaria a captura menos acelerada. É decisão de design de combate.
- **Aú:** pode virar uma esquiva, mas a esquiva atual dura 0,38 s e o aú da captura dura cerca de 1,2 s.

## 11. Braços 15% mais curtos (26/10/2026)

Pedido do usuário: braço muito longo. `build.arm_scale = 0.85` nos dois modelos. A edição roda no estágio `rig` (`arm_length_edit`), depois da pintura, então a textura não se desalinha.
- **Medida:** o comprimento do ombro à ponta dos dedos cai 15% (−12 cm por braço).
- **Distribuição:** braço e antebraço são comprimidos (fator 0,80); a mão mantém o tamanho e desliza para dentro.
- **Esqueleto:** as juntas do braço recebem a mesma transformação, então pesos e clipes continuam coerentes.
- **Resultado:** envergadura 1,95 → 1,70 m no modelo do usuário (1,68 m no do pipeline), para 1,80 m de altura.

Depois disso, a silhueta frontal do modelo do pipeline deixa de bater com os braços das referências — o desenho original tem braços mais longos.

## 12. Armada, meia-lua, rasteira e esquiva do Mixamo (26/10/2026)

Os arquivos do usuário estão em `SourceArt/Capoeirista/mocap/` (`mixamo-armada`, `-meialua`, `-rasteira`, `-esquiva`). Todos foram encaixados no tempo do combate com `build.mocap`, nos dois modelos:

| Clipe | Captura | Trecho usado | Impacto (captura → jogo) |
|---|---|---|---|
| `combo2` Armada | 1,63 s, viaja 1,9 m | inteiro | pico do pé 1,25 s → 0,30 s |
| `meialua` | 1,73 s, viaja 2,0 m | inteiro | pico do pé 1,25 s → 0,38 s |
| `rasteira` | 2,45 s | 0,3–1,5 s (abaixa, varre, levanta) | maior alcance do pé baixo 0,88 s → 0,22 s |
| `dodge` esquiva | 4,6 s (esquiva → chão → parada de mão → volta) | 1,2–2,1 s, a descida | — ; últimos 35% voltam à pose inicial |

Novos parâmetros em `bake_mixamo`:
- **`segment`:** escolhe o trecho da captura.
- **`contact_mode: 'reach'`:** detecta o impacto de golpes baixos pelo maior alcance horizontal do pé.
- **`source_contact`:** permite informar o instante de impacto manualmente.
- **`return_blend`:** volta à pose inicial no fim do clipe.
- **Remoção do deslocamento:** em golpes que não fazem loop, o deslocamento líquido (início → fim) sai, e o movimento local fica.

`tools/charpipe/mocap_preview.py` mostra qualquer captura no tempo original, com o rastro do quadril e dos pés, para escolher o trecho.

Com isso, todos os golpes, a ginga e a esquiva vêm de captura; corrida, pulo, reação, queda e vitória continuam autorais (`clips.py`). Ainda sem uso: a parte de parada de mão/aú da esquiva (2,4–3,4 s) e `mixamo-ginga-au.fbx`. Check PASS, build OK e Chrome sem erros.

## 13. Golpes mais lentos (26/10/2026)

Pedido do usuário: os movimentos estavam rápidos demais, principalmente os ataques. Os ataques ficaram cerca de 35% mais longos e a esquiva 15%. O instante de impacto acompanha a mesma proporção, e a distância da esquiva continua 4,2 m.

| Ação | Duração (s) | Impacto (s) | Aceleração sobre a captura |
|---|---|---|---|
| Martelo / Ponteira | 0,42 → 0,57 | 0,16 → 0,22 | ~3,1× → ~2,3× |
| Armada | 0,62 → 0,84 | 0,30 → 0,40 | 2,6× → 1,9× |
| Rasteira | 0,55 → 0,74 | 0,22 → 0,30 | 2,2× → 1,6× |
| Meia-lua | 0,75 → 1,00 | 0,38 → 0,51 | 2,3× → 1,7× |
| Esquiva | 0,38 → 0,44 (invulnerável até 0,41) | — | 2,4× → 2,0× |

`web/src/config.js` é agora a única fonte desses tempos: `capoeirista-asset.js`, o visualizador e `check-capoeirista.mjs` leem dele. Ao mudar um valor, ajuste `build.mocap` (`duration`/`contact`) nas fichas e regere os clipes. Dano, recargas e alcance não mudaram, mas o DPS da sequência básica caiu (golpes mais longos); revisar o balanceamento no playtest.

## 14. Demais movimentos refeitos com o add-on Mixamo Rig (26/10/2026)

Add-on [Mixamo Rig](https://extensions.blender.org/add-ons/mixamo-rig) v1.2.2 (GPL-3), instalado no Blender 5.2 com `blender --online-mode --command extension install mixamo_rig --enable`.

`tools/charpipe/mixamo_author.py`:
- **Rig de controle:** importa o esqueleto Mixamo (`mocap/mixamo-capoeira.fbx`, T-pose) e roda `mr.make_rig` com pernas IK e braços FK.
- **Autoria:** cada movimento é escrito como poses-chave nos controles do add-on — `Ctrl_Hips`, `Ctrl_Foot_IK_*`, polos de joelho `Ctrl_LegPole_IK_*`, `Ctrl_Spine*`, `Ctrl_Neck`/`Ctrl_Head`, braços FK e curvatura dos dedos.
- **Saída:** as ações ficam em `SourceArt/Capoeirista/mocap/authored-rig.blend` (`Authored|run`, `jump`, `hit`, `dead`, `victory`), editáveis no Blender pelo painel do add-on.

Movimentos:
- **Corrida (0,48 s, loop):** apoio com contato de calcanhar até a saída na ponta do pé, perna livre elevada, quadril desce após o contato, braços em arco com cotovelo a 90°, torção do tronco.
- **Pulo (0,6 s = tempo no ar):** braços sobem, joelhos encolhem no ápice, pernas procuram o chão e aterrissa em guarda. **No jogo o pulo agora toca** (antes ficava parado no primeiro quadro: `capoeirista-asset.js`).
- **Reação (0,28 s):** tronco e cabeça vão para trás, quadril recua, braços recuam para baixo e ele volta à guarda.
- **Queda (0,65 s):** cambaleia, os joelhos cedem e ele cai de costas, com as pernas estendidas (polos de joelho para cima) e os braços abertos.
- **Vitória (1,57 s, loop):** punho direito erguido, mão esquerda na cintura, balanço de ginga.

Integração: `build.mocap` aponta para `authored-rig.blend` + `action`. `bake_mixamo` agora lê `.blend`: anexa o rig e a ação e avalia o IK ali mesmo. Os FBX exportados desse rig (cheio de restrições) gravavam a pose animada como repouso, o que corrompia o retarget, então foram descartados. Duas armadilhas corrigidas: o primeiro quadro não era reavaliado (`frame_set` no mesmo quadro) e a taxa de quadros da cena ficava em 100 qps depois de outra captura (agora gravada em `action['fps']`). `blend: 0` desliga o crossfade de loops, já que os ciclos autorados fecham sozinhos.

Para ajustar um movimento: abra `authored-rig.blend`, edite os controles (painel Mixamo Control Rig), salve e regere com `build.py --stages anim,look,export`. Para recriar do zero: `mixamo_author.py` (sobrescreve o `.blend`). Aplicado aos dois modelos: check PASS, build OK e Chrome sem erros. Agora todos os clipes do jogo vêm do rig Mixamo (capturas ou autoria); `clips.py` só gera a `PoseTest` e a `apose`.

## 15. Hunyuan3D no lugar do TRELLIS para comparação (28/10/2026)

A pedido do usuário, o gerador de modelos 3D para comparação e rascunho passou a ser o **Hunyuan3D 2.1**, no Space `tencent/Hunyuan3D-2.1`. O cliente é `D:/Tools/online3d-work/hunyuan3d.py`, que faz a mesma chamada do botão "Gen Textured Shape" (`/generation_all`) e grava a malha branca, a texturizada e um `run.json`.

**Limite de licença (decisão do usuário: só protótipo).** A licença comunitária da Tencent não vale na União Europeia, no Reino Unido e na Coreia do Sul, inclusive para os resultados, e exige licença própria acima de 1 milhão de usuários por mês. Por isso nada gerado pelo Hunyuan3D entra num GLB do jogo. A completação de textura (`build.completion`, Cangaceiro) e as malhas que vão para o jogo (Mula sem Cabeça) continuam no TRELLIS (MIT).

**Primeiro uso, no Maloka (`SourceArt/Maloka/hunyuan-front/`).** O modelo foi gerado só da frente e saiu virado para +Z, então dispensa o giro de 180° do TRELLIS. Silhueta contra as referências (`build/review/hunyuan.json`): frente 0,873, costas 0,880, laterais 0,816 e 0,801. Os braços ficam em 0,66, e o modelo sai um pouco mais largo em todo o contorno. A cor pixel a pixel deu 75% de divergência, mas o número não diz muito: a estampa fina da roupa vira divergência com qualquer defasagem. A comparação útil é pela silhueta e pelos painéis.

**Cota.** O Space roda em ZeroGPU. Uma chamada pede ~270 s e esgota a cota diária gratuita da conta (renova em 24 h; o PRO dá 40 min/dia). Na primeira chamada, a cópia falhou porque o arquivo volta embrulhado num dicionário (já corrigido); a geração foi recuperada de `D:/Tools/tmp`.

