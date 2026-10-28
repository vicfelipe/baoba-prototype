# 23 — Vaqueiro: produção

27/10/2026. Classe **Tanker** do [documento 19](<19 - Classes.md>), produzida pelo pipeline Lunia (skill `lunia-character`) a partir das referências que o usuário gerou no GLM com `SourceArt/Vaqueiro/PROMPT.md`. Nenhuma malha, textura, medição ou captura de outro personagem foi usada como entrada; as funções comuns (`build.py`: fit, bake, rig, toon, exportação) são reutilizadas como código. `build/source-manifest.json` registra o SHA-256 das imagens lidas.

**Nome no jogo (28/10/2026):** **Peão**, a pedido do usuário. Mudou só o texto que o jogador vê: botão da tela de título, quadro do herói, visualizador de personagens. Arquivos, identificadores e chaves seguem `vaqueiro`, sem acento (`vaqueiro-asset.js`, `vaqueiro.glb`, `data-hero="vaqueiro"`, `SourceArt/Vaqueiro`). Isso evita acento em nomes de arquivo e mantém a escolha salva no navegador.

**Estado (27/10/2026):** **jogável**, escolhido na tela de título. Modelo, rig, 12 clipes, laço e berrante validados (`validate.py` PASS). Números de combate são proposta (seção "Kit no jogo").

## Referências

| Vista | Original | Cópia de trabalho |
|---|---|---|
| Frente | `exec-dee32596…png` | `references/front.png` |
| Costas | `exec-68dc3c98…png` | `references/back.png` |
| Lateral esquerda | `exec-22835ac7…png` | `references/side-left.png` |
| Lateral direita | `exec-08889449…png` | `references/side-right.png` |
| Laço e berrante | `exec-f243804f…png` | `references/props.png` |

O usuário aprovou o couro **verde-petróleo**, embora o prompt pedisse marrom-avermelhado. Nas laterais, a luva aparece de ponta como punho fechado; na frente e nas costas, aberta com a palma para baixo.

**Medidas:** silhueta de 1,88 m (topo do chapéu à sola), com o topo da cabeça em 1,85 m. Na frente: chapéu em y=9, cabeça em y≈22, olhos em y=76, queixo em y=139, sola em y=912, cerca de 7,6 cabeças.

**Concordância entre as referências:** frente e costas espelhadas em **0,9715**, laterais em **0,9712** (o Cangaceiro tinha 0,917 e 0,882). As regras do prompt (roupa simétrica, nada pendurado de um lado só, armadura colada ao corpo, braços na mesma altura) eliminaram a derivação de laterais.

**Segmentação:** `line_lum_max` = 160. Com 185, a sombra de contato ao lado das botas (luminância 172–184, saturação 6–8) entrava como corpo; o fundo fica em ~206.

## Modelo (`tools/charpipe/vaqueiro_build.py`)

Estágios `geo, fit, bake, rig, anim, look, export` (`--from`/`--to`).

| Slot | Conteúdo | Triângulos |
|---|---|---|
| Head | rosto, barba, cabelo e chapéu (copa medida + aba oval inclinada 7°, frente mais alta, borda virada) | 4.506 |
| Body | gibão com gola alta e barra até 0,955, mangas com ombro reto em 1,58 | 6.428 |
| Hand | luvas com punho, esticadas até o alcance medido (1,054) | 1.904 |
| Leg | perneiras e quadril; joelheiras, cadarços e costuras pintados | 3.290 |
| Foot | botas | 1.680 |
| Support | cinto e fivela (rígidos na pelve) | 252 |

Total de **18,1 mil triângulos** (Cangaceiro: 29,7 mil). Mais de 18 mil ainda fica acima do Lunia, mas abaixo dos heróis atuais.

- **`fit`:** usa o `stage_fit` comum, que encaixa o contorno na frente e na lateral esquerda. Foi o que levou a silhueta de 0,92 para 0,98.
- **Antes do `fit`, o remesh é limpo:** o remesh deixava cascas internas pequenas onde o punho da luva entra na manga, e o `fit` arrastava essas cascas até o joelho. `drop_crumbs` descarta ilhas com menos de 10% dos vértices da maior.
- **Topo da aba:** nenhuma vista vê essa superfície, e o preenchimento por ângulo desenhava o friso dourado em listras radiais, visíveis na câmera do jogo. Recebe a mediana do couro verde da borda bem vista, por setor de 15°, um pouco mais escura perto da copa. A parte de baixo da aba recebe a cor de cima, sombreada; a de baixo do queixo, a pele vizinha.

## Validação (`validate.py`, VALIDATION PASS)

| Vista | IoU (limite) | Cor divergente (limite) |
|---|---|---|
| Frente | **0,984** (0,942) | 4,8% (8%) |
| Costas | **0,968** (0,942) | 2,6% (8%) |
| Lateral esquerda | **0,985** (0,941) | 11,4% (15%) |
| Lateral direita | **0,969** (0,941) | 14,0% (15%) |

A meta de silhueta (0,96) foi atingida nas quatro vistas. A meta de cor (5%) só na frente e nas costas.

- **Movimento:** PASS no `PoseTest` (braços baixos, agachamento, chute alto a 85°). Torção zero na pose de referência.
  - Pesos do quadril: rampa coxa→pelve de 22 cm. Com 14 cm, o glúteo esticava 2,4× no chute.
  - Faixa central da virilha presa à pelve, entrando gradualmente com a altura. Uma faixa de 5 cm rasgava a costura 3×; uma faixa sem transição criava degrau em 0,78.
  - O `PoseTest` recebeu trava de chão: o `Base` sobe quadro a quadro o quanto o vértice mais baixo afunda.
  - O `PoseTest` é clipe de inspeção e é removido antes da exportação.
- **GLB:** `check_glb` PASS (32 ossos, ≤ 2 influências, cabeça rígida, 1,88 m) e glTF-Validator sem erros.
- **Vídeo:** `Evidence/vaqueiro-movimentos.mp4` e quadros.

## Limitações

- **Couraça nas laterais:** a lateral desenha a couraça cobrindo ~11 cm do flanco; a frente a desenha com ±0,10 m. As duas não cabem no mesmo modelo. A frente prevalece, e o tronco lateral fica com 20–23% de cor divergente (dentro do limite total).
- **Mão vista de ponta:** a lateral mostra punho fechado, e o modelo tem a luva aberta. Essa região já é excluída da projeção lateral.
- **Têmporas:** entre a bochecha e a aba, a orelha é uma continuação lisa da cabeça; a pintura ali vem de vistas de raspão.
- **Luva:** forma simplificada, com uma fenda escura perto do polegar no close.
- **Sem aprovação visual do usuário** nem teste no jogo.

## Movimento e adereços (`tools/charpipe/vaqueiro_motion.py`, estágio `anim`)

Capturas Mixamo baixadas pelo usuário (27/10/2026), copiadas para `mocap/`. O pulo usa a mesma tomada genérica `Jump.fbx` do Cangaceiro (cópia de `SourceArt/Cangaceiro/mocap`).

| Clipe | Fonte | Trecho / tempo |
|---|---|---|
| `attack` | `Punching.fbx` (gancho de direita) | 0,6 s, impacto em 0,26 (mão mais à frente em 0,40 s da tomada) |
| `lasso` | `Throw.fbx` | 0,2–1,3 s → 0,8 s, soltura em 0,42 (0,86 s da tomada) |
| `pull` | `Pulling A Rope.fbx` | uma puxada, 4,3–5,9 s → 0,7 s; a corda sai pelo lado esquerdo |
| `taunt` | `Standing Yell.fbx` (mãos em concha na boca) | 0,9–2,55 s → 1,4 s |
| `dodge` | `Standing Dive Forward.fbx` | 0,1–1,25 s → 0,44 s |
| `run` | `Running.fbx` | ciclo de 2,16 m → 0,46 s, para a passada bater com 4,4 m/s |
| `jump` | `Jump.fbx` | 0,66–1,34 s → 0,6 s (tempo de voo do jogo) |
| `idle`, `hit`, `dead`, `victory` | autorados com as chaves do `clips.py` | postura própria de tanque: em pé, base larga, braços abertos para não entrar no gibão |

**Adereços:**
- **Laço enrolado:** anel no osso `R_Laco`, sob a mão direita. Fica visível no `lasso` até a soltura.
- **Berrante:** loft por coluna na folha, preso no osso `Berrante`, sob a cabeça, com o bocal na boca. Aparece no `taunt` enquanto as mãos estão na boca.
- **Visibilidade:** é a escala do osso, gravada em todos os clipes.
- **Repouso:** o berrante fica na horizontal, para não passar da altura do chapéu.
- **Texturas:** recortes de `props.png`, carregados do PNG. A imagem gerada em memória não é salva no `.blend` e ficava preta.

**Ajuste das capturas ao corpo do Vaqueiro (`tame`, `untwist`, `reground`).** Cada item foi medido no `motion_check` e corrigido na origem:
- **Clavícula a 30%,** com o braço mantendo a direção no mundo. Os encolhimentos de ombro das tomadas esticavam a axila 6–12×.
- **Dedos da luva e ponta da bota a 50%:** luva tipo mitene e bota rígida.
- **Braços abrem ou avançam** até sair do tronco medido. O corpo Mixamo é mais estreito, e os cotovelos entravam no gibão; na puxada, o antebraço entrava 6,7 cm no peito. Avançar o braço nunca leva a mão acima do ombro: uma versão sem essa trava levava as mãos ao rosto.
- **Torção:** a da canela passa para o pé (até 66°; o limite é 30°), e a do pulso fica limitada a ±80° (chegava a 139°).
- **Trava de chão:** primeiro pelos ossos (cabeça com aba de 0,2, joelhos, ombros, costas, quadril; `bake_mixamo` ganhou `head_margin` e `ends_extra`). Depois de novo, pelo vértice mais baixo da malha deformada, porque a bota rolava sobre a borda.

**Pesos refeitos para os golpes** (`vaqueiro_build.py`, `rigging`):
- **Ombro:** rampa contínua Chest2 → UpperArm de x 0,16 a 0,38. O peso da clavícula vai para o Chest2, e abaixo da axila o tronco segue a coluna.
- **Luva:** cada parte tem o seu peso — punho, palma, dedos ao longo do comprimento e polegar suavizado na palma.
- **Bota:** cano no osso da canela e biqueira no do pé, com transições que não se sobrepõem.
- **Joelho:** transição de 16 cm.

**Validação:** `validate.py` PASS em todos os portões (referência, movimento, GLB, vídeo `Evidence/vaqueiro-movimentos.mp4`). O GLB tem 8 malhas, 34 ossos, 12 clipes e 21,2 mil triângulos (6 slots do corpo, mais 1,2 mil do laço e 2,0 mil do berrante). O `PoseTest` fica só no `.blend`.

## Kit no jogo (`web/`)

Pedido do usuário: ataque básico, laço que prende (exceto chefes) e puxa, berrante que provoca, esquiva e dano reduzido por ser tanque. A armadura de couro que absorve dano vem do documento 19. **Os números de `VAQUEIRO` em `config.js` são proposta, não balanceamento:**

| Tecla | Habilidade | Proposta |
|---|---|---|
| J / clique | Gancho | 20 de dano, alcance 2,9, 0,6 s: ~33 de dano/s (Capoeirista ~60) |
| Q | Laço | alcance 9 m, 8 de dano, recarga 7 s. Inimigo comum: preso 2,5 s e arrastado até 1,7 m à frente em 0,7 s, com o vaqueiro de lado (clipe `pull`). Chefe: só interrompe a conjuração |
| E | Berrante | raio 10 m: os inimigos perseguem o vaqueiro por 5 s, mesmo além da coleira. Recarga 10 s |
| Shift | Esquiva | a mesma dos outros heróis |
| — | Armadura de couro | dano recebido × 0,7 |
| — | Velocidade | 4,4 m/s (os outros: 5,1) |

**Em aberto:** se os chefes também devem poder ser puxados. Hoje o laço só os interrompe.

- **Código:**
  - `vaqueiro-asset.js` é o carregador.
  - `player.js` tem o kit: corda visível da mão até o alvo, preso, arrasto e provocação.
  - `enemies.js` implementa `hold` e `taunt` no Fragmento. Os chefes não têm `taunt` e não são presos.
  - `audio.js` ganhou o toque `horn`. O HUD mostra o papel e os ícones por herói. O visualizador e a tela de título incluem o Vaqueiro.
- **Testes:**
  - `node tools/check-vaqueiro.mjs` (PASS) verifica: 8 malhas, 12 clipes, altura, pés, pesos, chão, relógios, soltura do laço, mãos no berrante e adereços escondidos.
  - `node tools/shot-vaqueiro.mjs` (`errors []`) verifica no navegador: escolha do herói, HUD, gancho (20), laço (8, preso e puxado a 2,15 m), berrante (Fragmento a 9 m passa a perseguir), armadura (20 → 14), laço interrompendo o chefe sem movê-lo e volta ao Capoeirista.
  - Capoeirista e Cangaceiro continuam PASS e `errors []`.

## Reprodução

```powershell
$B = 'D:/Tools/blender-5.2.3-windows-x64/blender.exe'; $env:PYTHONDONTWRITEBYTECODE='1'
& $B -b --python tools/charpipe/segment.py -- SourceArt/Vaqueiro/character.json
& $B -b --python tools/charpipe/ref_consistency.py -- SourceArt/Vaqueiro/character.json
& $B -b --python tools/charpipe/vaqueiro_build.py -- SourceArt/Vaqueiro/character.json
python tools/charpipe/validate.py SourceArt/Vaqueiro/character.json
Copy-Item SourceArt/Vaqueiro/export/Vaqueiro.glb web/assets/vaqueiro.glb
node tools/check-vaqueiro.mjs; npm --prefix web run build; node tools/shot-vaqueiro.mjs
```
