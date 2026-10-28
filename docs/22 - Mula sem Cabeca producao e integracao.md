# Mula sem Cabeça — produção e integração

26–27/10/2026. Chefe quadrúpede, feito a partir das duas imagens enviadas pelo usuário (`SourceArt/MulaSemCabeca/references/`: lateral esquerda e frente). Não usa nenhuma malha, textura, medida ou animação de outro personagem.

## Modelo e pintura

O processo completo e os números estão em `SourceArt/MulaSemCabeca/README.md`. Resumo:

- **Malha:** gerada pelo TRELLIS online (MIT) a partir da lateral. Tem 11.150 triângulos e mede 3,0 m do casco à ponta da chama (altura proposta).
- **CharacterGen:** não foi usado. Só gera humanoides e os pesos nunca foram baixados.
- **Textura:** repintada com as imagens do usuário (`tools/charpipe/quadruped_bake.py`). Na lateral, a cor divergente caiu de 44% para 10,5%.
- **Visual do jogo:** banda 0,62/1,0 e contorno `#232323` (`quadruped_look.py`). A chama não recebe banda de sombra.

## Esqueleto e clipes (`tools/charpipe/mula_rig.py`)

- **Orientação:** a malha é girada para olhar para +Z no glTF, a frente do jogo. Os ossos `L_` ficam no lado esquerdo do animal (+X).
- **Esqueleto:** 30 ossos.

  | Grupo | Ossos |
  | --- | --- |
  | Coluna | `Root`, `Hips`, `Spine1`, `Spine2`, `Chest` |
  | Pescoço e chama | `Neck1`, `Neck2`, `Flame` (âncora do fogo) |
  | Cauda | `Tail1–4` |
  | Pernas dianteiras, por lado | `Scapula`, `FUpper`, `FFore`, `FCannon`, `FHoof` |
  | Pernas traseiras, por lado | `Thigh`, `Gaskin`, `HCannon`, `HHoof` |

  As juntas foram medidas na malha: centro de cada perna em 0,26, 0,62 e 0,98 m e cascos no chão.
- **Pesos:**
  - O heat weighting falha na malha do TRELLIS, que é aberta e se cruza. Ele é resolvido numa cópia remalhada em voxel (3,5 cm, fechada) e transferido para a malha pintada.
  - Só 18 vértices caem no osso mais próximo.
  - A chama é rígida no `Flame`.
  - Uma perna não puxa o lado oposto.
  - No máximo 2 influências por vértice, como no contrato Lunia.
- **Movimento:**
  - **Construção:** cada quadro vem de fórmulas: corpo, cadeias por FK com atraso (coluna, pescoço, chama, cauda) e IK analítica das pernas. Na IK, o osso de cima acompanha o balanço da perna e uma IK de dois ossos vai do cotovelo/joelho ao boleto, com o casco plano no apoio.
  - **Alcance da dianteira:** na pose da arte a perna dianteira está quase reta, então a escápula gira só o necessário para alcançar.
  - **Locomoção no lugar:** o chão desliza para trás na velocidade do clipe, e o jogo move a raiz.
- **Clipes** (100 fps, tempos de `web/src/config.js` `MULA` e `CINEMATIC`):

| Clipe | Duração | Uso |
| --- | --- | --- |
| `idle`, `walk`, `gallop` | 2,4 / 1,0 / 0,45 s (loops) | Repouso, passo em quatro tempos a 2,2 m/s, galope da investida a 14 m/s |
| `kickWarn` → `kickHit` | 1,3 + 0,6 s (uma tomada) | Coice: agrupa e dá o coice com as duas patas no instante do impacto |
| `chargeWarn`, `chargeEnd` | 1,7 / 0,7 s | Investida: escava duas vezes, baixa o pescoço; freada |
| `stompWarn` → `stompHit` | 1,6 + 0,7 s (uma tomada) | Empinada: ergue-se, pateia no ar, pisa no impacto |
| `cast`, `stagger`, `recover` | 1,6 / 1,0 / 2,0 s (loops) | Labareda, interrompida, recuperação |
| `dormant`, `awaken`, `dead`, `apose` | 2,0 / 3,2 / 2,4 / 0,1 s | Cinemática do encontro, queda de lado, pose de referência |

**Cascos plantados:** com o casco no chão, o deslize é zero em todos os clipes, exceto no passo, onde os traseiros deslizam 1,1 a 1,2 cm. No teste, os cascos correm para trás a −2,20 m/s no passo e −13,84 m/s no galope; o jogo move a Mula a 2,2 e 14 m/s.

## Fogo (THREE.Fire)

- **Biblioteca:** `@wolffo/three-fire` 1.4.0 (typeWolffo/THREE.Fire, MIT), versão GLSL `FireMesh`.
- **Textura:** a `Fire.png`, que não vem no pacote npm, foi copiada do repositório com a licença para `web/assets/three-fire/`.
- **Posição:** a caixa do raymarching (0,9 × 1,9 m) segue o osso `Flame` a cada quadro e fica sempre de pé, porque fogo sobe. A base fica dentro do pescoço, para o corpo esconder o fundo reto da caixa.
- **Chama da malha:** a coroa pintada do TRELLIS é recolhida pelo osso `Flame` (escala 0,42) e vira a brasa do pescoço; a chama visível é a da biblioteca. O corpo mede 2,6 m e o fogo leva a Mula aos ~3 m.
- **Cor:** a `Fire.png` já é laranja; a cor normal só clareia, e a branca passa de 1 para brilhar com o bloom. 32 passos de raymarching (com 20, apareciam faixas na câmera alta).
- **Dois ajustes no shader da biblioteca** (`mula-asset.js`, aplicados por substituição de texto no `fragmentShader`, que acusa erro se a biblioteca mudar):
  - **Base:** a base da gota esmaece. A caixa tem fundo reto, e o teste de profundidade só esconde a face, não o volume.
  - **Branco:** o uniform `heat` mistura a cor até o branco. A `Fire.png` não tem azul, então só multiplicar pela cor deixava a chama "branca" amarela.
- **Profundidade:** a biblioteca desliga o teste de profundidade; no jogo ele foi religado, para o herói poder passar na frente.

O tamanho e a cor seguem o estado:

| Estado | Chama |
| --- | --- |
| Adormecida | Brasa |
| Despertar | Acende |
| Antes e durante a investida | Cresce e fica **branca** (guia de arte antigo: "a chama cresce e fica branca antes da investida") |
| Labareda | Cresce e esquenta |
| Queda | Apaga |

## No jogo

- **Entrada:** botão **Chefe: Mula sem Cabeça** na tela de título. A partida começa na entrada da Clareira da Mata Viva com o portão aberto, e o Curupira fica oculto. Entrar na clareira abre a cinemática do encontro, com textos e brasas da Mula. **Iniciar** volta à campanha do Curupira.
- **Ciclo** (`web/src/mula.js`): aproximar → coice → recuperar → investida → recuperar → aproximar → empinada → Labareda → recuperar.

  | Ataque | Aviso no chão | Efeito |
  | --- | --- | --- |
  | Coice | Cone vermelho atrás da garupa: ela vira as costas para o herói | Dano no cone |
  | Investida | Faixa laranja até a borda da arena. É um tipo novo de aviso, a faixa, em `telegraph.js` | Ela corre a faixa e acerta uma vez quem estiver nela quando o peito passa |
  | Empinada | Círculo rosa à frente do peito | Dano no círculo e anel de fogo |
  | Labareda | Conjuração de 3,2 s | Pulso em toda a arena; a Rasteira interrompe |

- **Vitória:** a Mula cai de lado, a chama se apaga e a tela final traz o texto dela. **Jogar de novo** repete o desafio.
- **Visualizador:** **Ver personagens** inclui a Mula, com o fogo e todos os clipes.

## Verificação

- `node tools/check-mula.mjs`, PASS. Confere:
  - 16 clipes, corpo de 2,6 m com o fogo passando de 3 m e a base do fogo dentro da brasa, frente em +Z;
  - no máximo 2 influências;
  - geometria finita e nada abaixo do chão em todos os clipes;
  - durações iguais às de `config.js`;
  - cascos plantados na velocidade do jogo;
  - fogo preso ao osso `Flame`;
  - esqueletos independentes.
- `node tools/shot-mula.mjs` (Chrome headless). Percorre:
  - carregamento, visualizador e início do desafio;
  - cinemática do encontro;
  - ciclo real de ataques (coice, investida, empinada);
  - interrupção, vitória, reinício e volta à campanha.

  Deve terminar com `errors []`. As capturas ficam em `Evidence/mula-*.png`.

## Decisões do usuário em aberto

- **Números:** todo o bloco `MULA` em `config.js` (vida 2600, golpes, dano e tempos) é **proposta**, assim como a altura de 3,0 m.
- **Onde ela entra na campanha:** decidido em 27/10/2026: é o chefe da fase 2, o Sertão Velho ([24](<24 - Sertao Velho fase 2.md>)). O botão avulso da tela de título saiu; a seção "No jogo" acima descreve o desafio antigo.
- **Forma da chama:** a chama visível é o fogo volumétrico, sempre de pé e com o mesmo formato de gota da biblioteca; a labareda recortada e alta da arte não é reproduzida. Ajustar o formato pediria outra textura de forma (`fireTex`) desenhada a partir da sua frente.

## Ataque básico (27/10/2026)

O usuário pediu um ataque básico: antes, o herói só levava dano das habilidades.

- **Golpe:** a **patada**: casco dianteiro direito erguido e batido à frente, mais baixa que a empinada da Pisada. Clipes `basicWarn` + `basicHit` em `mula_rig.py`.
- **Aviso:** cone vermelho curto à frente (80°, 2,8 m além do raio).
- **Números** (`MULA.basic`, proposta a validar): preparo de 0,55 s (`windup`), 14 de dano e recarga de 2,4 s. Golpe comum como os dos heróis: **sem marcação no chão nem som de aviso** (pedido do usuário, 27/10/2026); acerta no impacto dentro de alcance e arco.
- **Quando ataca:** com o herói perto, enquanto se aproxima e na 2ª metade da recuperação. A 1ª metade continua sendo a janela de punição.
- **Ciclo:** o golpe não estica o ciclo; o chefe volta ao estado anterior com o tempo já corrido.
- **Teste:** `tools/shot-boss-basic.mjs` cobre ausência de marcação, dano exato, esquiva, volta ao ciclo e janela de punição.
- **Backups:** `export/*-before-basic.glb`.
