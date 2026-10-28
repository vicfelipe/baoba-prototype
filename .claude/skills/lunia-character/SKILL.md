---
name: lunia-character
description: Pipeline completo para criar personagens de Baobá no padrão Lunia e colocá-los no jogo web — referências em T-pose → preparo (ComfyUI) → modelo (gerado pelo pipeline ou feito por artista) → validação contra as referências → rig Lunia → animações (capturas Mixamo + autoria no add-on Mixamo Rig) → visual toon + contorno → GLB → integração e testes no web/. Use quando o usuário pedir para modelar, recriar, rigar, texturizar, animar, exportar ou colocar no jogo um personagem/NPC/inimigo "como no Lunia", aplicar um modelo ou animação novos ao Capoeirista, ou ajustar proporções/velocidade de movimentos.
---

# Personagem estilo Lunia — processo completo (`tools/charpipe`)

`$B` = `D:/Tools/blender-5.2.3-windows-x64/blender.exe`. Rode tudo da raiz do projeto. Histórico e números do piloto (Capoeirista): `docs/18 - Pipeline de personagens estilo Lunia.md`. Um personagem completo leva ~2 min de build; o tempo real está nas revisões.

## 0. Regras que valem do início ao fim

- **Só as referências deste personagem.** Use as imagens/arquivos que o usuário enviar para ele. Não reaproveite malhas, scripts, renders ou dados de outras sessões ou personagens. Do Lunia, apenas medidas e convenções (`lunia_study.py`); nunca seus assets.
- **Arquivos do usuário são preservados.** Copie para `SourceArt/<Nome>/...` (referências em `references/`, capturas em `mocap/`) e trabalhe na cópia. Vistas derivadas ficam ao lado da original (`references_original` na ficha).
- **Validar com números e imagens antes de dizer que está pronto:** `review.py`, `filmstrip.py`, `check_glb.py`, `check-capoeirista.mjs`, build, `shot-capoeirista.mjs`. Toda verificação de imagem é feita olhando o PNG gerado. Ao mudar um `.blend` de estágio, renderize de novo; nunca confie numa imagem antiga.
- **Decisões de design ficam com o usuário:** durações de combate (`web/src/config.js`), qual modelo é o herói, licenças. Proponha e explique; não troque sozinho.
- **Licenças:** só modelos e add-ons com uso comercial permitido (ex.: RealESRGAN anime 6B BSD-3; Mixamo Rig GPL-3 é ferramenta, não vai no jogo). Recuse upscalers não comerciais (4x-AnimeSharp).

## 1. Contrato Lunia (medido no cliente; mudar só com decisão registrada)

| Item | Lunia | Baobá |
|---|---|---|
| Slots | `Head, Body, Hand, Leg, Foot, Support, Weapon` (+ Back/Hip/Mask) | mesmos; `<Nome>_<Slot>_000`. Modelo de artista adotado = slot único `Full` |
| Textura | 1 difusa por slot, luz pintada, sem normal/especular | 1024² (Head/Body/Leg), 512² (Hand/Foot/Support); artista: a dele |
| UV | mãos e pés espelhados | idem (`"mirrored": true`) |
| Shader | 2 bandas de luz (sombra ≈ 0,6 da cor) | banda 0,62/1,0, independente da intensidade das luzes |
| Contorno | casco invertido `#232323` (gama), ~0,5% da altura | 0,35% no modelo do pipeline, 0,19% no do artista; cor linearizada no Blender |
| NoSilhouette | variantes sem contorno | máscara por vértice `COLOR_0`: R = contorno, G = banda (0 em acessórios finos, base oculta da cabeça e faixa pendurada) |
| Rig | `Base/Waist/Chest1/Chest2/Neck/Head`, `L_/R_` membros, mão em luva, cadeias de pano, `EffectBaseJoint` | idem (35 ossos) + cadeia `Cord01–03` |
| Pesos | ≤ 2 influências, cabeça rígida | idem (forçado no estágio `rig`) |
| Clipes | ~30 fps | 13 clipes com os nomes do jogo; 100 fps (durações do combate caem em quadros inteiros) |

## 2. Entrada e ficha

1. Referências: 4 vistas ortográficas em **T-pose, palmas para baixo**, fundo cinza liso — `front`, `back`, `side_left` (mostra o lado esquerdo do personagem), `side_right`. Contorno escuro desenhado é necessário quando a roupa é clara (ex.: abadá branco ≈ fundo).
2. `SourceArt/<Nome>/character.json`, partindo de `SourceArt/Capoeirista/character.json`:
   - `height_m`, `references`, `segmentation` (`line_lum_max`, `sat_min`, `gap_px`, `open_px`), `notes`.
   - `build.depth_view` (a lateral mais limpa) e `limb_mirror_from` (lado sem acessório pendurado).
   - `build.parts.<Slot>`: `tris`, `texture`, `voxel`, `mirrored`, `view_gain` por vista.
   - `build.anatomy` (pescoço, queixo, juntas, razões de joelho/cotovelo, mão, orelha), `build.clothing` (cós, barra e inclinação da barra `pants_hem_slope`, cobertura do pulso), `build.accessories` (cinto, nó, ponta do cordão com caminho medido, pulseiras, colar e pingente com pontos medidos).
   - `build.look`, `build.view_sharpness`, `build.relief`, `build.arm_scale`, `build.mocap` (seção 7).
   - Meça detalhes nas imagens com `tools/charpipe/crop.py` (recorte ampliado com grade de pixels) em vez de estimar.

## 3. Preparo das referências

1. **Segmentar e medir:** `$B -b --python tools/charpipe/segment.py -- SourceArt/<Nome>/character.json`. Confira `build/masks/*.png` (rosa = personagem) e `build/measure.json`: o px/m deve bater entre frente e costas. Vazou para o fundo → suba `gap_px` ou baixe `line_lum_max`. Comeu roupa clara → suba `line_lum_max`.
2. **Consistência entre vistas:** `$B -b --python tools/charpipe/ref_consistency.py -- <ficha>`. Esse valor é o teto de qualquer modelo.
3. **Vista inconsistente** (laterais < 0,95): salve `build/measure.json` e `build/masks` como `measure-original.json` / `masks-original` e rode `$B -b --python tools/charpipe/derive_side.py -- <ficha> <vista_ruim> <vista_boa>`. A vista ruim é refeita a partir da boa espelhada, e só entra dela o que é exclusivo daquele lado (`build.derive.<vista>.transplant`: faixas de z e janela de y com cor saturada). Re-segmente. O Capoeirista foi de 0,858 → 0,990.
4. **Texturas nítidas (ComfyUI, `D:\Comfy-Desktop`).**
   - **Servidor headless** (feche o app antes; mesma porta):
     `cd D:/Comfy-Desktop/ComfyUI-Installs/ComfyUI/ComfyUI && ./.venv/Scripts/python.exe main.py --listen 127.0.0.1 --port 8188 --extra-model-paths-config "C:/Users/Victor/AppData/Roaming/Comfy Desktop/instance-model-paths/inst-1793029618597.yaml" --input-directory D:/Comfy-Desktop/ComfyUI-Shared/input --output-directory D:/Comfy-Desktop/ComfyUI-Shared/output --disable-auto-launch` (em segundo plano). A GPU é AMD RX 6600 XT, 8 GB, ROCm.
   - **Upscale:** `python tools/charpipe/comfy.py upscale <ficha> --scale 2` usa RealESRGAN_x4plus_anime_6B e grava `texture_references`. O bake mistura bordas do upscale com cor e sombra da original (transferência de detalhe). Medidas continuam nas originais.
   - **Encerre o servidor no fim** para liberar a GPU.

## 4. Modelo — caminho A (gerado) ou B (adotado)

**A. Gerado pelo pipeline:** `$B -b --python tools/charpipe/build.py -- <ficha> [--stages ...]`, com estágios `geo, fit, bake, rig, anim, look, export`. Cada estágio salva `build/stage-<nome>.blend`; começar de um estágio reabre o anterior.
- **`geo`:** volumes por slot a partir dos perfis medidos (largura da frente, profundidade da lateral, nariz/boca pelo resíduo do perfil), mãos com quatro dedos e polegar, pés com arco e cinco dedos, remesh voxel e QuadriFlow no orçamento.
- **`fit`:** encaixa os vértices de contorno nas silhuetas da frente e da `depth_view`, com teste de oclusão. Aplica o relevo muscular pelo sombreamento das referências (`relief`) e constrói os acessórios medidos.
- **`bake`:** UV e projeção das quatro vistas, ponderada pela visibilidade (`vis^view_sharpness`). A lateral fora da profundidade é registrada linha a linha, e o disco do braço visto de frente é excluído das laterais. Mãos e pés são espelhados.

**B. Modelo feito por artista/editor** (ex.: `capoerista_novo_mod.glb`, objeto `front.png`):
- **Ficha:** `"adopt": {"file", "object", "calibration_from", ...}` (molde `SourceArt/CapoeiristaNovo`).
- **Adoção:** `$B -b --python tools/charpipe/adopt.py -- <ficha>` → `segment.py` na mesma ficha → `build.py --stages rig,anim,look,export`.
- **Correções do adopt:** normaliza para 1,80 m; solda vértices duplicados nas costuras de UV (sem isso o heat weighting falha); recalcula normais; preenche texels pretos voltados para baixo (palmas e axilas não pintadas); acolchoa as ilhas do atlas (fundo preto sem margem gera bordas pretas). Também mede o próprio corpo para posicionar as juntas.
- **Antes de inspecionar:** sempre confira o conteúdo do arquivo (pode vir com o modelo antigo junto) e compare com as peças atuais.

## 5. Validar forma e textura

1. **Comparar com as referências:** `$B -b SourceArt/<Nome>/build/stage-rig.blend --python tools/charpipe/review.py -- <ficha das referências> <rótulo> --look [--original]`.
   - **O que mede:** IoU de silhueta e cor pixel a pixel, por vista e por região (cabeça/tronco/braços/pernas/pés), com erro médio, p90 e % de pixels com |Δ| > 30/255.
   - **Painéis:** referência | sobreposição (vermelho = falta, azul = sobra) | modelo | mapa de calor.
   - **`--original`:** compara com as imagens intocadas do usuário.
   - **Contorno:** não valide com contorno ligado; o traço já está na máscara da referência.
2. **Metas:** IoU ≥ 0,96 nas vistas consistentes, cor divergente ≤ 5% em frente e costas. Quando as imagens discordam, registre o teto (passo 3.2).
3. **Closes em T-pose** (mãos, palma, pés, tronco, costas, com textura e com wireframe): erros de escultura e de detalhe de mãos e pés só aparecem assim, não na silhueta.
4. **Erro de forma se corrige na forma:** ajuste `anatomy`/`clothing`/accessories ou `build_body_parts()`; não pinte por cima.
5. **Pedidos de proporção depois da pintura** (ex.: "braço 15% menor") são feitos no estágio `rig` com `build.arm_scale`. A malha já com UV e as juntas recebem a mesma transformação, então textura e animações continuam encaixadas.

## 6. Rig

Estágio `rig`:
- **Juntas:** calculadas das medidas e das razões em `anatomy`, com nomes Lunia.
- **Pesos:** heat weighting restrito aos ossos de cada slot, com reserva por distância; no máximo 2 influências; cabeça rígida.
- **Cós e acessórios:** `fade_thighs_above_hips` impede a coxa de puxar o cós. Acessórios carregam grupos `rigid_<osso>`.
- **Máscara:** grava `silhouette` (COLOR_0, seção 1).

## 7. Animações

Todos os clipes do jogo vêm de um rig Mixamo: capturas do usuário ou autoria no add-on. `tools/charpipe/clips.py` só gera `PoseTest`/`apose` e serve de reserva.

**Nomes e tempos:** `idle, run, combo0, combo1, combo2, rasteira, meialua, dodge, jump, hit, dead, victory, apose`.
- **`web/src/config.js` é a única fonte das durações e do instante de impacto dos golpes.** O carregador, o visualizador e o teste leem de lá.
- **Ao mudar um tempo:** atualize `duration`/`contact` em `build.mocap` das fichas e regere.

**Capturas Mixamo** (o usuário baixa os FBX):
1. Copie para `SourceArt/<Nome>/mocap/mixamo-<golpe>.fbx`.
2. Inspecione com `$B -b --python tools/charpipe/mocap_inspect.py -- <fbx...>`: duração, deslocamento do quadril, pico de cada pé e quando acontece.
3. Veja no tempo original, com o rastro dos pés: `$B -b <stage-look.blend> --python tools/charpipe/mocap_preview.py -- <dir> <fbx...>`.
4. Configure em `build.mocap.<clipe>`:

| Campo | Para quê |
|---|---|
| `file` | FBX (ou `.blend` + `action`) |
| `duration`, `contact` | reajusta em dois trechos lineares para o impacto cair no tempo do combate |
| `contact_mode` | `height` (pé mais alto: chutes) ou `reach` (maior alcance com pé baixo: rasteira) |
| `source_contact` | instante de impacto manual na captura |
| `segment` | trecho da captura em segundos (capturas que fazem várias coisas, ex.: esquiva → chão → parada de mão) |
| `return_blend` | fração final que volta à pose inicial (trecho que termina deitado/baixo) |
| `sway` | quanto do deslocamento horizontal fica (loops: em torno da média; golpes: tira a viagem início → fim e mantém o movimento local) |
| `blend` | crossfade de loop (0 para ciclos que já fecham) |

- **Ajuste ao nosso esqueleto:** o retarget aplica, osso a osso, a mudança de rotação em relação à T-pose. Uma trava de solo levanta o quadril quando a diferença de proporção afundaria o pé, e a mola do cordão roda por cima.
- **Aceleração:** acima de ~2,5× fica artificial. Prefira `segment` ou proponha durações maiores ao usuário.
- **Captura que viaja muito** (ex.: ginga de 1,5 m): reduza o `sway` ou peça a versão "In Place" do Mixamo.

**Movimentos sem captura — add-on Mixamo Rig:**
1. Instale o add-on, uma vez: `$B -b --online-mode --command extension install mixamo_rig --enable`.
2. Autore: `$B -b --python tools/charpipe/mixamo_author.py -- <mocap/mixamo-*.fbx com T-pose> <mocap_dir>`. Rode sempre sem filtro: o `.blend` é regravado só com os clipes gerados, então um filtro apagaria os demais e os ajustes manuais feitos nele. O script roda `mr.make_rig` com pernas IK e braços FK e escreve poses-chave nos controles (`Ctrl_Hips`, `Ctrl_Foot_IK_*`, `Ctrl_LegPole_IK_*`, `Ctrl_Spine*`, `Ctrl_Neck`/`Head`, braços FK, dedos) no referencial do personagem.
3. As ações ficam em `mocap/authored-rig.blend` (`Authored|<clipe>`, com `act['fps']`).
4. Em `build.mocap`, aponte com `{"file": ".../authored-rig.blend", "action": "Authored|run", "blend": 0}`.
5. Para ajustar à mão: abra o `.blend` no Blender, mexa nos controles pelo painel Mixamo Control Rig, salve e regere.

**Conferir movimento:** `$B -b <stage-look.blend> --python tools/charpipe/filmstrip.py -- <clipe> <t0,t1,...> <out.png>` desenha o caminho dos tornozelos. Confira:
- pé de apoio parado no chão;
- caminho do chute limpo e impacto no quadro certo;
- braço nunca dobrado atrás da cabeça;
- faixa sem atravessar a coxa;
- nenhum quadro em T-pose (início e fim de cada clipe).

## 8. Visual, exportação e verificação do GLB

- **`look`:** material toon (banda + textura, com G da máscara desligando a banda), contorno Solidify com o grupo `silhouette` e renders (`build/renders/`: vistas, rosto, poses, `clip-*`, câmera de jogo). Prancha: `$B -b --python tools/charpipe/sheet.py -- <renders> clip- 5`.
- **`export`:** `export/<Nome>.glb` (materiais de cor base, COLOR_0, clipes, sem a ação de origem do Mixamo), `export/<Nome>-report.json` e `<Nome>.blend`.
- **Verificação:** `$B -b --python tools/charpipe/check_glb.py -- export/<Nome>.glb` deve imprimir `GLB_CHECK PASS` (esqueleto único, skin, ≤ 2 influências, uma textura por malha, altura).
- **Torção das articulações:** `$B -b build/stage-look.blend --python tools/charpipe/joint_twist.py -- build/review/joint-twist.json` deve imprimir `JOINT_TWIST PASS`.
  - Mede a torção local de ombro, cotovelo, pulso, quadril, joelho e tornozelo em todos os clipes.
  - A pose de referência tem que ter torção zero (≤ 3°).
  - Pega pele "enrolada" que a revisão de silhueta não vê.
  - Em 27/10/2026: Curupira FAIL (pernas a 170°, defeito do rig de autoria) e Capoeirista FAIL leve (capturas: `dodge` com mão a 138°).
- **Especificação glTF e orçamento:** `npm --prefix web run check:glb` (`tools/validate-glb.mjs`) usa o Khronos glTF-Validator e o glTF Transform `inspect`.
  - Falha com qualquer erro de especificação.
  - Lista triângulos, clipes e texturas acima de 1024.
  - O aviso `NODE_SKINNED_MESH_NON_ROOT` é esperado na exportação do Blender.
- **Pesos de roupa e acessório:** `tools/charpipe/rwt.py` executa o Robust Weight Transfer (add-on GPL-3, ferramenta) sem interface.
  - Faz o casamento por distância e normal com a pele e depois o inpainting.
  - Instalação e uso estão no cabeçalho do arquivo. Sem as dependências, `available()` devolve False.
  - Meça antes de adotar. Nas ombreiras do Cangaceiro, que ficam a 1–3 cm da pele, só 59% dos vértices casaram e ele não superou a cópia do vértice mais próximo (3,54 contra 3,41 mm). Use em roupa colada ao corpo e em modelos adotados onde o bone heat falha.

## 9. Levar ao jogo (`web/`)

1. Guarde o GLB anterior (`export/...-backup.glb`) e copie o novo para `web/assets/capoeirista.glb` (ou um asset novo, para outro personagem).
2. **Carregador** no molde de `web/src/capoeirista-asset.js`:
   - **Material:** `MeshToonMaterial` com gradiente de 2 tons usado só como máscara de luz, sombra = 0,62 × textura, banda desligada por `COLOR_0.g`.
   - **Contorno:** casco invertido com skinning; espessura `OUTLINE` (0,0063 no modelo do pipeline, 0,0034 no do artista) × `COLOR_0.r`.
   - **Relógio de ataque:** golpes tocam por `progress × duração` (de `config.js`); loops `idle/run/victory`; corrida pela velocidade; pulo toca no tempo de ar.
3. **Testes:**
   - `node tools/check-capoeirista.mjs` deve dar PASS: clipes exigidos, durações = combate, ossos Lunia, geometria finita em todos os clipes, loops, relógio, esqueletos independentes, COLOR_0, texturas embutidas.
   - `npm --prefix web run build`.
   - `node tools/shot-capoeirista.mjs` abre o Chrome headless via DevTools, sem dependências, e passa por título, visualizador, golpe no impacto, jogo, corrida e golpe. Deve terminar com `errors []`; olhe as capturas em `Evidence/capoeirista-*.png`.
4. Nomes de golpes mudaram? Atualize `config.js`, `lutador-studio.js` (rótulos) e `web/README.md`.

## 9b. Etapa de validação (obrigatória antes de dizer que está pronto)

`python tools/charpipe/validate.py SourceArt/<Nome>/character.json [--no-video]` grava `build/review/validation.json` e imprime `VALIDATION PASS/FAIL`.

| Portão | O que mede | Limite |
| --- | --- | --- |
| Referência | `review.py` no `stage-bake` (sem armas), por vista: IoU e % de cor divergente | IoU ≥ concordância das referências − 0,03; cor ≤ 8% (frente/costas), ≤ 15% (laterais); meta 0,96 / 5% |
| Movimento | `motion_check.py` em todos os clipes, a cada 2 quadros | ver abaixo |
| GLB | `check_glb.py` + `validate-glb.mjs` | sem erro |
| Vídeo | `motion_video.py` → `Evidence/<nome>-movimentos.mp4` + quadros | conferência visual |

Verificações de movimento:
- torção por articulação;
- braço dentro do tronco ≤ 2,5 cm;
- chão ≤ 2 cm;
- aba/saia dentro da coxa ≤ 2,5 cm;
- estiramento 0,3–2,0 (arestas ≥ 3 mm, percentis 0,5/99,5).

**Loop de correção:** cada falha leva quadro, osso e malha. Corrija na origem (pesos, pose, geometria), refaça a partir do estágio afetado e rode de novo.
- Para achar as arestas, o script de depuração usado no Cangaceiro foi: as 8 arestas com maior razão, com posição de repouso e pesos.
- Exceção só na ficha (`build.validation`), com `why`; ela aparece no relatório.
- Olhe o vídeo e os quadros: os números não pegam tudo. O perfil do chapéu e a textura sob a aba só apareceram nos closes.

## 10. Registrar

- **No doc 18 (ou doc do personagem):** origem dos arquivos, números de `report.json` e `review`, decisões do usuário e limitações vistas nas revisões.
- **Skill e memória:** atualize esta skill quando surgir uma armadilha nova.

## Armadilhas resolvidas (não reintroduza)

**Chefes e corpos diferentes do piloto (Curupira)**
- Não copie medidas anatômicas do Capoeirista. `curupira_config.py`, `curupira_build.py` e `curupira_motion.py` exemplificam fichas próprias, geometria nova e autoria num esqueleto Mixamo construído com as proporções do chefe; ver doc 20.
- Os nomes de clipe pertencem ao controlador do personagem. Curupira usa 11 clipes de chefe; não recebe os 13 clipes de capoeira. Seus impactos ocorrem no início de `sweepHit`/`rootsHit`.
- Juba/galhos confundem a detecção automática do lado do nariz: use `view_faces` na ficha. Folhas entre as pernas confundem os perfis de membros: descarte spans que cruzem o centro e transicione suavemente para a anatomia coberta.
- `check_glb.py` aceita a altura esperada como segundo argumento (padrão 1,8 m). `ref_consistency.py` usa a altura da ficha. Para review de personagens de outras alturas, os números globais são válidos, mas as regiões do `review.py` ainda usam os cortes do piloto.
- Filmstrip deve resolver o caminho de saída absoluto: Blender e Python podem interpretar caminhos relativos a diretórios diferentes.
- Teste a troca de formas e o reset no jogo. `check-curupira.mjs` verifica geometria e relógios; `shot-curupira.mjs` verifica materiais, estados, interrupção, libertação e reinício no navegador sem cache.
- Não confunda testes técnicos aprovados com aprovação visual: registre explicitamente as metas de fidelidade não atingidas.
- Movimento "robotizado" (Curupira, doc 20): fórmulas por quadro com amplitude mínima, braços travados por `aim`, joelhos estendidos, todas as cadeias em sincronia, juba e saia rígidas, corte seco entre estados. Autore poses-chave com curvas monótonas e defasagem por cadeia, abaixe o quadril para os joelhos flexionarem, simule as molas secundárias e use crossfade só visual (nunca entre aviso e impacto: autore os dois como uma tomada).
- No Blender 5, criar o atributo de cor `silhouette` com o mesmo nome do grupo de vértices gera outro nome: acesse por `color_attributes.active_color`. Grupos auxiliares são normalizados junto com os ossos no rig: guarde marcas de geometria (como `hair_u` e `skirt_k`) em atributos de malha, não em grupos.

**Heróis armados e chapéus (Cangaceiro, doc 21)**
- `segment.py` calibra pela silhueta inteira: com chapéu, `height_m` é a altura até o topo do chapéu (meça o topo da cabeça no `crop.py` e registre na ficha). `check_glb.py` recebe essa altura.
- Laterais que divergem por acessórios assimétricos reais (bolsa só de um lado) não se derivam uma da outra: escolha a mais limpa como `depth_view` e registre o teto.
- Armas: malha por coluna sobre a silhueta da folha de armas, textura = a própria folha projetada de lado, um osso por arma sob a mão (empunhadura no punho, cano nos dedos, topo do lado do polegar) e ossos `Muzzle_*` para o jogo. Mostrar/esconder/soltar é escala do osso gravada no clipe (vai no GLB). Construa as armas depois do bake, para não sujar a revisão de silhueta.
- Duas mãos numa arma pedem `mr.make_rig(ik_arms=True)`: controles `Ctrl_Hand_IK_<lado>`/`Ctrl_ArmPole_IK_<lado>` sem pai. Pose do controle = delta da mão × repouso do controle; meça o erro de alcance por quadro.
- **Esqueleto Mixamo novo + `mr.make_rig`:** os ossos IK do add-on vêm com roll ~180° diferente do nosso, e o `COPY_TRANSFORMS` impõe isso. Resultado: meia volta no pulso e no tornozelo em todos os clipes, que aparece como aba na bota, pulso enrolado e ombreira solta. Use como repouso a pose avaliada com os controles zerados (`pose_bones[...].matrix`), nunca `matrix_local`. Confira a torção local por articulação em todos os clipes; na pose de referência ela tem que ser 0. Antebraço IK é dobradiça: divida com ele a torção da mão.
- **Polo do cotovelo:** atrás/embaixo só serve para mãos baixas. Com a mão alta à frente do peito (arma no ombro), leve o polo para a lateral, senão o cotovelo entra nas costelas. Arma de ombro: empunhadura na frente do ombro, corpo girado ≤ 30°.
- **Pivô do pé:** ponta do pé (frente) e calcanhar (trás). Um pivô atrás dos dedos rígidos afunda a ponta no chão.
- **Molas de saia e abas:** colida com vértices reais da peça (no referencial do osso), não só com a ponta do osso. Os cantos de uma aba larga entram na coxa primeiro.
- **Personagem ainda sem clipes:** gere o `PoseTest` com trava de chão (levante o `Base` pelo vértice mais baixo, quadro a quadro) para o portão de movimento, e remova-o antes da exportação.
- **Pesos de calça:** rampa coxa→pélvis contínua (≥ 10 cm; Vaqueiro: 22 cm, porque com 14 cm o glúteo esticava 2,4× num chute a 85°) e topo da virilha na pélvis. A faixa central da virilha presa à pelve precisa entrar gradualmente também na altura; uma faixa sem transição cria degrau na coxa interna. Com 2 influências, a costura central da virilha não fecha. Se ela ficar coberta, registre a exclusão na ficha.
- **Placas rígidas** (ombreiras): mistura suave ao longo da placa, nunca copiar a borda dura da pele embaixo.
- **Faces viradas para baixo e mal vistas** (sob aba de chapéu, mandíbula): as projeções pintam o que está atrás (rosto, cabelo). Corrija depois do bake, sempre com o critério de visibilidade, não só pela normal (a frente inclinada do chapéu é bem vista).
- **Tomadas Mixamo:**
  - **Rumo:** podem começar viradas (Dodge_Ranged: 62°). Retire o rumo do quadril na postura inicial da tomada, não no início do trecho.
  - **Pulo:** precisa de `airborne` (o jogo faz o arco).
  - **Trava de chão:** cubra pontas dos pés, mãos, cabeça e chapéu, e de novo depois da IK, nas proporções do personagem.
  - **Corrida:** ajuste a duração para que metros por ciclo ÷ duração = velocidade do jogo.
  - **Personagem com cena escrita** (Cangaceiro): passe a tomada pelos controles (`Capture`), sem retarget direto, para manter as mãos na arma, as molas e as armas.
- **Mixamo Rig oficial 1.11.11** (Adobe) não roda no Blender 5.x (`version_char`, camadas de ossos, `action.fcurves`). Use a extensão `mixamo_rig` (porte do mesmo código).
- Completação de textura por modelo gerado: limite o ganho de cor e os slots. Um modelo muito escuro com ganho de 3,9× pintou de cinza a calça escondida sob o saiote.
- Misturar dois alvos de mão: interpole a posição do punho e a rotação, nunca a translação da matriz delta (gira em torno da origem e arremessa a mão).
- Personagem deitado: verifique a altura mínima por quadro de todas as malhas; molas de pano precisam de piso.
- Regex em `config.js`: ancore no nome do campo (`g:` casa com `dmg:`).
- Superfícies que nenhuma referência vê (topo do chapéu, ombros sob a câmera alta) ficam com projeções esticadas. Complete-as com um modelo 3D gerado da mesma frente (TRELLIS online, MIT): `build.completion` no Cangaceiro. O TRELLIS entrega o modelo de frente para −Z do glTF (gire 180°). Ajuste a cor por média e desvio nos texels bem vistos (a regressão achata o detalhe). Exija mais visibilidade onde a vista é de raspão. Nunca troque a pintura do rosto nem a de áreas bem vistas.
- **Gerador de modelos para comparação e rascunho: Hunyuan3D 2.1** (decisão do usuário, 28/10/2026). Cliente `D:/Tools/online3d-work/hunyuan3d.py <frente> <pasta>` (env `D:/Tools/online3d-env`), Space `tencent/Hunyuan3D-2.1`, endpoint `/generation_all` (malha branca + texturizada). O modelo já vem de frente para +Z do glTF (`import_generated.py` sem `--yaw`). Depois: `import_generated.py` → `review.py`.
  - **Licença:** a comunitária da Tencent não vale na UE, no Reino Unido e na Coreia do Sul (resultados incluídos) e pede licença acima de 1 milhão de usuários/mês. **Só protótipo:** nada gerado pelo Hunyuan3D entra num GLB do jogo. Completação de textura e malhas que vão para o jogo (Mula) continuam no TRELLIS (MIT, `trellis.py`).
  - **Cota:** o Space roda em ZeroGPU; uma chamada pede ~270 s e esgota a cota diária gratuita. O resultado fica em `GRADIO_TEMP_DIR` (`D:/Tools/tmp`) mesmo se o script falhar depois.
  - **Revisão:** a cor pixel a pixel não serve para estampas finas (a mínima defasagem vira 75% de divergência); compare pela silhueta e olhando os painéis.

**Herói furtivo com adereço na mão (Maloka, doc 24, `maloka_motion.py`)**
- **Sinal da curvatura dos dedos:** depende do rig. No rig de mãos autorais do Maloka, os dedos fecham sobre a palma em torno do −X local, e `clips.Pose.fist` com ângulo positivo os dobrava para trás (mão aberta segurando a navalha). Antes de chavear a pegada, confira num close; no Maloka foi preciso `CURL = -1`.
- **Faca ou navalha na mão:**
  - **Empunhadura de faca:** cabo no oco do punho fechado (além dos nós, abaixo do osso da mão), segura perto do fim do cabo, com a lâmina saindo entre o polegar e o indicador. Na linha dos dedos, o cabo corre sob a palma e "vaza" da mão.
  - **Ângulo:** ajuste com closes da mão em vários clipes. A 60° do lado do polegar para os dedos, a lâmina aponta para a frente na estocada.
- **Tomada que golpeia com a outra mão** (`Stabbing.fbx` usa a esquerda): espelhe no espaço do esqueleto, D' = S·D·S. Use a mudança de cada osso em relação ao repouso, tirada do osso do outro lado; o roll não interfere. O `pose.paste(flipped=True)` trabalha no espaço do osso e, com os rolls do rig, levantou o braço acima da cabeça.
- **`tame`/`clear_arms` em golpes que cruzam o peito:** a folga de 11 cm levanta o braço até o rosto. Desligue o afastamento só no braço que golpeia.
- **Torção forte do tronco:** divida-a por igual entre `Waist`, `Chest1` e `Chest2`, mantendo `Chest2` (`share_spine`). Concentrada numa junta, ela estica as linhas duras de peso.
- **Referência de `Bone` antes de trocar de modo:** `rig.data.bones[...]` lido antes de `mode_set(EDIT)` e usado depois aponta para memória inválida; a navalha foi parar a 10²⁶ m. Copie `head_local`/`tail_local` antes de trocar de modo.
- **Clipes autorados também passam pelo `reground`:** a queda deitada afundava 5 cm.
- **Testes de jogo com vários inimigos:** tire os já usados do caminho. Um projétil acerta o primeiro inimigo da linha, e um inimigo parado detecta o herói e se vira antes do golpe; para medir dano pelas costas, segure-o com `held`.

**Capturas Mixamo num corpo largo (Vaqueiro, doc 23, `vaqueiro_motion.py`)**
- **Retarget direto** (`clips.bake_mixamo`) serve para herói sem arma de duas mãos. Personagem sem cordão: `Pose.cord` já ignora a falta dos ossos `Cord*`.
- **Depois do retarget, ajuste a tomada ao corpo:**
  - Clavícula a ~30%, compensando o braço, porque os encolhimentos de ombro esticam a axila.
  - Dedos de luva e ponta de bota rígida a ~50%.
  - Braços que abrem ou avançam até sair do tronco medido; avançar nunca pode levar a mão acima do ombro, senão o ajuste "foge" para cima, até o rosto.
  - Torção da canela passada ao pé, e a do pulso limitada.
- **Trava de chão:** rode de novo no fim do ajuste, pelo vértice mais baixo da malha deformada. Pontas de osso com margem não veem a bota rolando sobre a borda.
- **Margens no `bake_mixamo`:** `head_margin` (aba de chapéu) e `ends_extra` (joelhos, ombros, quadril) para rolamentos.
- **Pesos que os golpes exigem:**
  - Ombro: rampa contínua tronco → braço (≥ 20 cm em x), com o peso da clavícula no peito.
  - Luva: polegar suavizado na palma.
  - Bota: transições de canela e de biqueira que não se sobrepõem.
- **Adereço com textura gerada** (`np_img` → imagem em memória): carregue o PNG do disco antes de pôr no material. A imagem gerada não é salva no `.blend` e sai preta no render e no GLB.
- **Adereço preso a um osso** conta na altura do `check_glb` na pose de repouso. Modele-o na posição de repouso dentro da altura (berrante na horizontal) e incline-o no clipe.
- **Chave por constante na escala do osso do adereço,** gravada em todos os clipes. No three.js, um osso que o clipe novo não anima fica com o valor do clipe anterior.
- **Teste de golpe corpo a corpo no navegador:** ponha `home` do inimigo onde ele foi colocado. Fora da coleira ele volta, foge do alcance e se cura.

**Quadrúpedes (Mula sem Cabeça, `SourceArt/MulaSemCabeca/README.md`)**
- CharacterGen só serve para humanoides (treino VRoid, calibra para pose A humana); para animais use o TRELLIS. O cliente `D:/Tools/online3d-work/trellis.py` aceita várias imagens (aba multi-imagem via `/lambda_1`). Gere uma variante por vista e escolha pela silhueta: a lateral costuma vencer.
- `import_generated.py`/`review.py` enquadram um humanoide em pé (cortam um corpo comprido): use `quadruped_render.py` + `quadruped_compare.py` (silhueta normalizada pela caixa) e pinte com `quadruped_bake.py` (lateral espelhada no outro flanco).
- Máscara de referência sem preenchimento de buracos: o fundo cercado por pernas e sombra de contato vira "corpo" e pinta faixas brancas nas pernas.
- Imagem do GLB fica embutida no `.blend`: trocar `pixels` não basta; carregue o PNG pintado numa imagem nova e embuta-a.
- Chama/fogo: G = 0 no `COLOR_0` (sem banda). O C: tem ~300 MB livres: aponte `TEMP`/`GRADIO_TEMP_DIR` para o D: nas chamadas do gradio.

**Referências e medição**
- **Prompt de referência (Vaqueiro, doc 23, `SourceArt/Vaqueiro/PROMPT.md`):** roupa simétrica, nada pendurado de um lado só, armadura colada ao corpo, braços na mesma altura em todas as vistas, aba acima das sobrancelhas, mesmo calçado, adereços numa folha separada. As laterais passaram a concordar em 0,97 (Cangaceiro: 0,88), sem precisar de `derive_side`.
- Sombra de contato ao lado das botas (luminância ~172–184, saturação < 10) entra como corpo se `line_lum_max` ficar acima dela: meça a sombra e o fundo e ponha o limiar entre os dois (Vaqueiro: 160).
- Roupa clara = fundo: o separador é o traço desenhado (barreira escura/saturada + flood fill da borda).
- Colunas da frente perto da axila ainda são tronco: braço e junta do ombro começam em `ARM_X0`. Medir o ombro dentro do tronco põe o pivô no peito ("braço de gorila").
- Laterais geradas por IA divergem: registre a lateral linha a linha, ou derive-a da boa (`derive_side.py`).

**Geometria e textura**
- **Mãos nuas (Maloka, doc 24, `maloka_build.py hands()/paint_hands()`):**
  - **O problema:** remalha em voxel com orçamento baixo funde os dedos numa cunha (Vaqueiro), e a projeção borra o dorso, que nenhuma vista em T-pose vê.
  - **Forma:** peças autorais sem remalha e fora do `fit`. Os dedos ficam com 2 mm de fresta e anéis densos (dobra em 1 cm). A palma arredonda nos nós (uma tampa reta virou degrau).
  - **Textura:** pintada pelas marcas por peça (`hpart`/`hu`).
  - **Pesos:** rampas contínuas sem sobreposição. O braço termina dentro da palma, sob a pulseira.
- **Bermuda/short largo:** tubos que se encostam no centro viram ponte na remalha e rasgam no chute. Deixe ≥ 1,4 cm de folga. O fundo da bermuda pendurado abaixo do quadril segue a pelve, e as paredes internas passam para a coxa ao longo de ~16 cm.
- Personagem com script próprio (`vaqueiro_build.py`) pode usar o `stage_fit` comum: ponha `CL['pants_top_z']` e troque `build_accessories` por um no-op. No Vaqueiro levou a silhueta de 0,92 para 0,98.
- O remesh deixa cascas internas pequenas onde peças se sobrepõem (punho da luva dentro da manga), e o `fit` as arrasta pelo corpo ("o(o)" flutuando no joelho). Descarte ilhas pequenas logo após o `fuse` (`drop_crumbs`).
- Cascas de perna que param abaixo da pelve deixam frestas brancas sob a barra: suba as pernas para dentro da casca da pelve.
- Topo de aba de chapéu (nenhuma vista vê): preencher pela cor mais próxima em ângulo pinta frisos e faixas em listras radiais, que a câmera alta mostra. Use a mediana da cor dominante da borda bem vista por setor.
- QuadriFlow apaga acessórios finos: cascas sem remesh (`voxel` ausente) e acessórios que se afastam da pele (colar, pingente, pulseiras, nó) viram geometria medida.
- Em T-pose, a lateral vê mão, pulseira e deltoide de frente: `side_validity` exclui esse disco (senão pinta mancha no tronco/costas).
- Expoente alto na mistura evita borrão; o limiar de "não visto" é relativo; `view_gain` por slot prioriza a frente no rosto.
- A barra da calça sobre o pé é inclinada (`pants_hem_slope`).
- Constantes de shader do Lunia estão em gama: linearize no Blender.

**Rig e visual**
- Heat weighting falha em malha cortada nas costuras de UV: solde antes (adopt).
- Coxa puxando o cós: `fade_thighs_above_hips`.
- Tiras finas (cordão, fitas) não levam banda toon nem contorno (COLOR_0 G/R); a faixa pendurada é uma mola amortecida movida pelo quadril e empurrada pela coxa.

**Animação**
- Nunca interpole poses-chave osso a osso para golpes: o pé sai da trajetória. Use alvos de pé com IK por amostra ou captura.
- Ao montar poses por script, desatribua a ação (`animation_data.action = None`) e só depois chaveie; com a ação atribuída, cada `view_layer.update()` sobrescreve os ossos.
- `frame_set` no quadro atual não reavalia: vá a outro quadro e volte (renders e amostragem do retarget). Sintoma: T-pose no primeiro quadro.
- A taxa de quadros da cena muda entre importações: leia a da ação (`act['fps']`) ou a do FBX.
- FBX exportado do rig Mixamo com restrições grava a pose animada como repouso: retargete pelo `.blend`.
- Remova a ação de origem do Mixamo antes de exportar (senão vai no GLB). Nomes de ação com "mixamo" são apagados pela limpeza do retarget.
- Capturas com proporção de perna diferente afundam o pé: trava de solo no quadril.

**Ferramentas**
- `cbb-skinned-addon` (importador Lunia) precisa do patch `ActionFCurves` no Blender 5; o exportador dele não funciona no 5.x.
- NumPy 2 removeu `ndarray.ptp`: use `np.ptp`.
- Blender cria `.blend1`: `save_version = 0` em todo save (o reset de fábrica do `geo` restaura o padrão).
