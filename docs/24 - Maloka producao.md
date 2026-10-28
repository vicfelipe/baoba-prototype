# 24 — Maloka: produção do modelo

O Maloka é a versão urbana da classe DPS Stealth (documento 19). Antes se chamava Malandro; o usuário trocou o nome em 28/10/2026. A escolha entre Maloka e Mateiro continua aberta (D14).

## Referências

Geradas pelo usuário no Grok a partir de `SourceArt/Maloka/PROMPT.md` (histórico das versões no próprio arquivo). Fotos de inspiração do usuário em `inspiration/`; rascunhos em `drafts/`; cópias de trabalho em `references/`.

| Vista | Arquivo | Uso |
| --- | --- | --- |
| Frente | `references/front.png` (v4, estampa de fumaça e cortes) | projeção e medidas |
| Costas | `references/back.png` | projeção |
| Laterais | `references/side-left.png`, `side-right.png` | projeção; a esquerda é a vista de profundidade |
| De cima | `references/above.png` | só guia: tem perspectiva e não é projetada |
| Equipamento | `references/props.png` | navalha aberta, navalha fechada e frasco de veneno, numa escala de 4600 px/m |

**Medidas:** 1,79 m do topo do chapéu à sola; topo da cabeça a ~1,75 m, a 1 cm do topo usado no modelo (1,74 m), para a cabeça não atravessar a copa. Escala de 628 a 632 px/m nas quatro vistas. **Concordância entre as referências:** laterais 0,975 (sem `derive_side`), frente e costas 0,947; nas costas os braços saíram ~2% mais longos.

## Produção

`tools/charpipe/maloka_build.py` executa `geo, fit, bake, rig, anim, look, export` (com `--from` e `--to`), sobre o `build.py` comum. Ficha: `SourceArt/Maloka/character.json`.

1. **Geometria medida nas máscaras:**
   - **Chapéu:** copa pelos perfis acima da aba, terminando no plano inclinado da aba. A aba é um cone inclinado 13° com a frente para cima: a borda da frente fica a 1,674 m e a de trás a 1,605 m, como na lateral. Antes, a copa descia além da aba e aparecia como faixas escuras nas têmporas.
   - **Cabeça:** anéis com a largura da frente e a profundidade da lateral, com o nariz pelo resíduo do perfil e o crânio estimado atrás da aba.
   - **Regata e braços:** perfis da frente e da lateral; acima da axila, a lateral mostra o braço de ponta e é limitada.
   - **Bermuda e pernas:** pelve sob a regata e dois tubos largos, com 1,4 cm de folga para o centro. Tubos encostados viravam uma ponte na remalha e rasgavam no chute. Pernas e meias formam um tubo só.
   - **Tênis:** perfil de cima lido na lateral, coluna a coluna, ao longo do eixo do pé aberto ~9°.
2. **Mãos (pedido do usuário: não repetir as do Vaqueiro).** No Vaqueiro, a remalha e a redução de triângulos fundiram os dedos numa cunha. A projeção também borrou o dorso, que nenhuma vista em T-pose mostra. No Maloka:
   - **Peças autorais, sem remalha e sem encaixe na silhueta:** palma arredondada nos nós, quatro dedos com 2 mm de fresta e 15 anéis cada, polegar para a frente e para baixo (frente e vista de cima), pulseira solta no pulso e anéis no indicador, no médio e no polegar.
   - **Textura pintada pela forma:** a pele vem da referência (0,91; 0,73; 0,62), com dorso claro e palma em sombra, dobras nos nós, unhas e dourado nos anéis. A parte de baixo do antebraço junto ao pulso também é repintada, porque a frente tinha posto ali os dedos dobrados do desenho.
   - **Pesos:** saem das marcas `hpart` e `hu` de cada peça, em rampas contínuas: pulso, nós (±1,8 cm) e junta do meio (±1,7 cm). Pulseira e anéis ficam rígidos.
3. **Correções depois do bake:**
   - **Topos do chapéu e da aba:** recebem o preto mediano do pano bem visto, por setor, mais bolinhas brancas geradas como na vista de cima.
   - **Cor de pele e de cabelo vazada para o chapéu:** é repintada de preto.
   - **Partes de baixo:** a aba e a mandíbula recebem a cor vizinha em sombra.
   - **Têmporas sob a aba:** ganham o platinado da nuca.
4. **Rig** com 32 ossos de nomes Lunia, cabeça rígida e no máximo duas influências por vértice. Ajustes de peso:
   - **Bermuda:** uma rampa de quadril de 34 cm. O fundo da bermuda fica 23 cm abaixo do quadril e segue a pelve. As paredes internas passam da pelve à coxa ao longo de 16 cm.
   - **Tronco:** ombro e flanco como no Vaqueiro.
5. **Clipes e adereços:** `tools/charpipe/maloka_motion.py`, chamado no estágio `anim` (seção "Kit, clipes e jogo"). O `PoseTest` serve para a validação e sai antes da exportação.

## Validação (28/10/2026, `build/review/validation.json`)

| Portão | Resultado |
| --- | --- |
| Referência, silhueta | frente 0,965 · costas 0,941 · laterais 0,985 / 0,967, todas acima do limite |
| Referência, cor | **FAIL**: frente 11,9% (limite 8), costas 11,5%, laterais 24% / 30% (limite 15) |
| Movimento | **FAIL**: mão 2,03 no punho fechado (limite 2,0); bermuda 2,84 no chute de 85° |
| GLB | PASS (26 142 triângulos, 32 ossos, 2 influências) |
| Vídeo | `Evidence/maloka-movimentos.mp4` e quadros |

**O que os FAIL significam:**
- **Cor:** a divergência quase toda vem da estampa fina da roupa. Qualquer deslocamento de poucos pixels conta como cor errada, e nos painéis a estampa está no lugar. As laterais somam o deslocamento das linhas entre as vistas.
- **Mão:** a pele do dorso estica na dobra de 70° do punho fechado do `PoseTest`.
- **Bermuda:** no chute alto ela abre como tecido largo, sem rasgo visível nos quadros. Mostra um pouco do vermelho de dentro da perna da bermuda.
- Nenhum dos dois foi isentado na ficha.

**Limitações vistas nos closes:**
- O alto dos braços e dos ombros, que a câmera do jogo mostra, é visto de raspão por todas as vistas. As tatuagens ficam esticadas ali. O caminho já usado é a completação com um modelo do TRELLIS (MIT, `build.completion`, documento 21). O Hunyuan3D é só para protótipo.
- No rosto ainda há uma emenda clara na bochecha esquerda, onde a frente e a lateral se misturam.

## Kit, clipes e jogo (28/10/2026)

O usuário pediu o Maloka no jogo, com uma habilidade de fumaça. O kit abaixo é proposta de Claude, e os números (`MALOKA` em `web/src/config.js`) ainda não foram validados.

| Tecla | Habilidade | O que faz | Números propostos |
| --- | --- | --- | --- |
| J | Navalhada | Estocada de navalha (arco de acerto de 110°) | 24 de dano, 0,6 s com impacto em 0,3 s, alcance 2,8 m; ×1,5 pelas costas |
| Q | Veneno | Frasco arremessado no alvo; acerta o primeiro inimigo do caminho, interrompe conjurações (é o "interromper" do kit) e envenena | 10 no impacto + 6/s por 5 s; alcance 10 m; recarga 7 s |
| E | Fumaça | Bomba de fumaça no chão, à frente dos pés: nuvem de 3,2 m que dura 5 s | escondido dentro dela e 1,2 s depois de sair; 1º golpe que acerta = emboscada ×2; recarga 14 s |
| Shift | Esquiva | A mesma dos outros heróis | — |

**Furtividade e emboscada:**
- **Escondido:** ele fica translúcido (38%), sem contorno nem sombra, e é desenhado por cima da fumaça, para o jogador continuar vendo onde está.
- **Inimigos comuns:** perdem o rastro (estado `lost`). Param, procuram por 2,5 s e voltam para casa se ele não reaparecer. O Berrante do Vaqueiro vence a fumaça.
- **Chefes:** não usam o golpe básico no Maloka escondido. As habilidades com aviso no chão continuam.
- **Golpe pelas costas:** vale contra inimigos virados para o outro lado. Um inimigo parado detecta o Maloka e se vira antes do impacto. O ciclo pensado é: fumaça → o inimigo perde o rastro → contornar → atacar pelas costas.

**Adereços** (`references/props.png`), cada um num osso próprio sob a mão direita. Mostrar e esconder é escala do osso gravada em cada clipe:
- **Navalha:** desenhada um pouco maior que na folha (29 cm), para ler na câmera do jogo. Fica empunhada como faca: segura perto do fim do cabo (3,6 cm atrás da pegada), com o cabo no oco do punho fechado (1,2 cm além dos nós, 2,6 cm abaixo do osso da mão). A lâmina sai entre o polegar e o indicador, girada 60° do lado do polegar para os dedos, e aponta para a frente na estocada.
  - **Montagens descartadas:** na linha dos dedos, segura pelo meio do cabo, o cabo corria sob a palma até o pulso e a lâmina saía por cima dos dedos; o usuário viu a navalha "vazando da mão" (28/10/2026). Saindo reta do lado do polegar, a lâmina ficava atravessada à estocada.
  - **Dedos:** a pegada passou de 0,75 para 0,9 do punho fechado, porque com 0,75 a navalha parecia frouxa.
- **Frasco:** só aparece no arremesso e some na soltura.

**Clipes** (`idle, run, slash, throw, smoke, dodge, jump, hit, dead, victory, apose`):
- **Tomadas Mixamo genéricas que já estavam no projeto**, copiadas para `SourceArt/Maloka/mocap/` (o usuário ainda não baixou tomadas próprias do Maloka):
  - corrida: sprint do Cangaceiro;
  - pulo: o mesmo dos outros heróis;
  - esquiva: rolamento;
  - navalhada: `Stabbing.fbx`, baixado pelo usuário em 28/10/2026 (`mocap/mixamo-stab.fbx`). A tomada golpeia com a mão esquerda: o preparo chega ao máximo em 0,35 s e a mão chega a 0,68 m à frente entre 0,85 s e 0,95 s. Usa o trecho de 0,35 s a 1,4 s, espelhado para a mão da navalha (detalhes no item seguinte). Substituiu o soco de gancho.
  - frasco: o arremesso do laço.
- **Ajuste ao corpo:** as tomadas passam pelos mesmos ajustes do Vaqueiro (`tame`, `untwist`, `reground`).
- **Ajustes da estocada:**
  - **Espelhamento** (`mirror`): cada osso recebe a mudança do osso do outro lado em relação ao repouso, refletida em x no espaço do esqueleto. O `paste flipped` do Blender trabalha no espaço do osso e, com os rolls deste rig, levantava o braço acima da cabeça.
  - **Braço da navalha:** fica de fora do afastamento do tronco do `tame`. Afastar 11 cm do peito levantava a mão 32 cm, até o rosto. O braço livre continua sendo afastado.
  - **Coluna** (`share_spine`): a torção do tronco é dividida por igual entre `Waist`, `Chest1` e `Chest2`. Com uma junta só levando a torção, as linhas de peso sob as axilas e na cintura esticavam até 3,7×. Agora o máximo é 1,93×.
- **Clipes autorados com `clips.py`:** descanso (gingado com a navalha baixa), bomba de fumaça, reação, queda e vitória.
- **Mão direita:** fecha sobre o adereço em todos os clipes. Neste rig os dedos dobram para a palma em torno do −X local; com o sinal de `clips.Pose.fist`, a mão abria para trás.

**Arquivos:** `web/src/maloka-asset.js`, o kit em `player.js`, a nuvem em `fx.js` (tufos `Sprite` com textura suave, cinza com veios vermelhos como a estampa da regata), o frasco em `projectiles.js`, o estado `lost` em `enemies.js` e o golpe básico dos chefes em `boss.js`/`mula.js`.

**Testes:**
- `node tools/check-maloka.mjs`: PASS. Confere clipes, durações = combate, pesos, chão, navalha no punho, soltura do frasco e véu.
- `node tools/shot-maloka.mjs`: `errors []`. Mede navalhada 24, costas 36, veneno 10 + 30, fumaça escondendo e fragmento em `lost`, emboscada 48, frasco interrompendo o Curupira, chefe sem golpe básico e volta ao Capoeirista. Capturas em `Evidence/maloka-*.png`.
- Os testes de Vaqueiro, Cangaceiro, Capoeirista, Mula e golpe básico dos chefes continuam passando.

**Validação depois dos clipes** (`validate.py`):
- **GLB:** PASS (28 526 triângulos, 34 ossos).
- **Referência:** mesmo FAIL de cor da seção anterior.
- **Movimento:** a estocada passa; FAIL na bermuda.
  - **Paredes internas entre as pernas:** chegavam a 4,4× no pulo encolhido. Ficaram fora da medida por exceção na ficha (`build.validation.stretch_ignore`, com o motivo).
  - **Fundo da bermuda, atrás (rampa pelve → coxa):** continua de 2,2× a 3,4× com a coxa a 90° ou mais (pulo, rolamento, queda, corrida).
  - **Nos closes:** o pulo e o rolamento não mostram rasgo; a bermuda abre como pano largo e mostra o forro vermelho.
  - **Correção definitiva:** refazer os pesos da bermuda no estágio `rig`.
- **Corrigido:** a queda afundava 5 cm no chão; os clipes autorados agora também passam pelo `reground`.
- **Mão:** os 2,03× do punho fechado do `PoseTest` continuam.

**Pendências:**
- O usuário validar o kit e os números.
- Tomadas Mixamo próprias para navalhada (corte de faca), arremesso e bomba de fumaça.
- Pesos da bermuda.
- A textura da navalha tem 1159 × 219 px (passa de 1024 só na largura).

## Modelo de comparação

`SourceArt/Maloka/hunyuan-front/` tem o modelo do Hunyuan3D 2.1 gerado só da frente, apenas para comparação (documento 18, seção 15). Silhueta: frente 0,873, costas 0,880, laterais 0,816 e 0,801.

## Versão a partir do modelo do Hunyuan3D (28/10/2026, só protótipo)

A pedido do usuário, o modelo do Hunyuan3D 2.1 foi corrigido com ferramentas gratuitas: o nosso pipeline no Blender, sem créditos do Mixar. Script: `tools/charpipe/maloka_hunyuan_build.py`; ficha: `SourceArt/MalokaHunyuan/character.json`; GLB: `SourceArt/MalokaHunyuan/export/MalokaHunyuan.glb`. Por causa da licença (documento 18, seção 15), esta versão **não** vai para o jogo sem uma decisão nova.

**O que foi corrigido no modelo gerado:**
- **Malha:** 448 pedaços soltos nos cortes de UV foram soldados (5775 vértices) e as normais, refeitas.
- **Silhueta:** era larga e com os braços caídos; o mesmo encaixe nas máscaras a corrigiu.
- **Mãos:** a luva em bloco, com tatuagem borrada, deu lugar às mãos autorais. Os restos do polegar caído sob a pulseira foram apagados.
- **Cabeça e chapéu:** a pintura projetada rasgava o rosto, porque os olhos e o nariz do modelo não ficam onde o desenho põe os seus. Ficaram a cabeça e o chapéu medidos do pipeline; o pescoço do modelo continua sob a mandíbula.
- **Textura:**
  - **Pintura:** refeita a partir das quatro referências, no próprio UV do modelo (`keep_uv`). O UV refeito pelo pipeline usava só 14,5% de uma textura de 2048 px; o do modelo usa 56%.
  - **Cor do modelo:** fica só onde nenhuma vista enxerga bem (visibilidade abaixo de 0,4), ajustada por média e desvio em faixas de 10 cm. Isso resolve o alto dos braços e dos ombros, que na versão do pipeline saía esticado.
- **Pernas grudadas:** as pernas se tocavam no plano x = 0 abaixo do gancho, e as faces dali ligavam uma coxa à outra (48× no chute). Elas foram cortadas e cada lado foi fechado com uma tampa própria. O lado de cada vértice vem da conectividade, porque o sinal de x errava nas paredes internas.
- **Regata e bermuda emendadas:** o alto da bermuda e a barra da regata passam a seguir a pelve.

| | Versão do pipeline | Versão do Hunyuan |
| --- | --- | --- |
| Silhueta (frente, costas, laterais) | 0,965 · 0,941 · 0,985 · 0,967 | 0,962 · 0,945 · 0,956 · 0,937 |
| Cor divergente (frente, laterais) | 11,9% · 24% / 30% | 12,0% · 19,7% / 24,8% |
| Esticão no `PoseTest` | mão 2,03 · bermuda 2,84 | mão 2,03 · corpo 3,0 |
| Triângulos | 26 142 | 46 216 |
| Alto dos braços e ombros | esticado | completado com a cor do modelo |
| Licença | livre | só protótipo |

**Limitações vistas:**
- Um pequeno triângulo escuro no gancho, na vista de frente: a tampa das pernas pegou a cor do vão entre as pernas no desenho.
- A malha tem quase o dobro de triângulos da versão do pipeline.
