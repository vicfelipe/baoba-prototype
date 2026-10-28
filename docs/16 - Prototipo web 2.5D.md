# Protótipo web 2.5D — Lutador × Curupira

25/10/2026 · Pedido do usuário: criar o jogo a partir desta documentação, **2.5D como Lunia**, para navegador, com **Tarisland** como referência de mecânica e **Lunia** como referência de direção de arte, desconsiderando as ferramentas do documento 09. A implementação está em [`web/`](../web/README.md).

## Decisões desta entrega

| Tema | Decisão | Substitui |
| --- | --- | --- |
| Plataforma | Navegador (Three.js + Vite); `web/dist/index.html` é um arquivo único que abre sem servidor | Executável Windows/Unity como entrega (01, 07, 09) |
| Câmera | De ação (Tarisland/WoW, 26/10): direção fixa, 10,5 m do herói, 38° para baixo, FOV 42°, mira no peito; zoom pela roda (0,65–1,6×). Nos chefes, enquadramento pela altura do chefe (seção "Câmera de chefe") | Câmera orbital do 08 |
| Arte | Referência Lunia (ver seção abaixo): proporção anime adulta, cenário pintado, círculos mágicos, bloom, HUD no layout do Lunia | Modelos do 15; a primeira versão web chibi foi rejeitada |
| Mecânica | Kit do Lutador e Curupira do 14; Fragmento do 03; alvo assistido (Tab/clique), avisos no chão, barra de conjuração interrompível | — |
| Escopo | Sessão do 01: entrada → trilha com 3 Fragmentos → vestígio → portão de cipós → clareira (checkpoint) → Curupira → libertação → memória final | Arena isolada do 14 |

O workspace continha apenas `docs/`: projeto Unity, `arts/` e modelos citados em 14 e 15 não estavam presentes. Os personagens web foram desenhados a partir das descrições textuais (Lutador: pele escura, camiseta clara, bermuda cinza, tranças nagô em locs presos, pés descalços, corda de capoeira; Curupira: corpo verde com grafismos, olhos amarelos, cabelo de fogo, saia de folhas, braceletes de madeira e corda, pés virados para trás).

## Direção de arte — revisão Lunia (25/10)

A primeira versão web usava personagens chibi; o usuário a considerou infantil e enviou capturas do Lunia como referência. Leitura adotada das capturas:

| Aspecto do Lunia | Como entrou no jogo |
| --- | --- |
| Personagens anime com ~7 cabeças, pequenos na tela | Lutador com 1,80 m e cabeça pequena; Curupira esguio de ~3 m com juba de fogo; sombreamento cel suave (4 tons) e contorno fino |
| Câmera alta e afastada | Substituída em 26/10 por câmera de ação mais próxima e baixa: herói com ~20% da altura da tela |
| Superfícies pintadas à mão | Texturas geradas em canvas: grama mesclada com florzinhas, terra com seixos, piso de pedra trançado, casca, folhagem; chão por camadas com máscara |
| Floresta exuberante | Copas volumosas com folhagem pintada, samambaias azul-esverdeadas, folhas largas, capim, cogumelos turquesa luminosos, raízes enormes da sumaúma, raios de luz |
| Pátios e ruínas | Clareira do Curupira como santuário de piso trançado, meio-fio de pedra, pilares antigos e runas gravadas que acendem na libertação |
| Aura sob o personagem e círculos de magia | Círculo de runas dourado/rosado sob o herói; alvo marcado por runas vermelhas; avisos do chefe como círculos mágicos com runas girando e raios no impacto |
| Brilho e partículas | Bloom no pós-processamento |
| HUD | Moldura com retrato e barra vermelha no canto superior esquerdo, minimapa e "Ajuda da Missão" à direita, registro de eventos à esquerda, barra de habilidades e barra longa do chefe embaixo, faixa de progresso ("Memória da Mata") na base, nomes sob os personagens |

Não foram copiados personagens, cenários, ícones ou interface do Lunia; só a linguagem visual. O link de anexo do fórum enviado junto com as capturas não foi aberto.

## Corrupção e restauração

O cenário é cinza-arroxeado fora da clareira de entrada. Um shader aplicado aos materiais marcados dessatura e esfria a cor; "ondas" em espaço de mundo devolvem a cor com uma borda dourada. O vestígio restaura a trilha; a libertação do Curupira restaura toda a mata. Interface, pele do herói e avisos de combate não são afetados (05, seção 4). Cristais do Silêncio somem quando a onda passa.

## Regras verificadas

Rodadas com `__baoba.advance()` (simulação em passos fixos de 1/60 s), 19 de 19 aprovadas, também após a revisão de arte:

- golpe de 34 aplicado uma vez; Rasteira fora de alcance não gasta recarga;
- cone do Fragmento causa 15; esquiva no impacto evita o dano;
- espera inicial de 2 s; Varredura causa 24; recuperação de 2 s; sair do círculo das raízes zera o dano;
- Chamado completo causa 20 em toda a arena; Rasteira durante o Chamado causa 65, interrompe e abre 3 s de recuperação;
- derrota no chefe volta à entrada da clareira com Corrupção cheia, vida cheia e trilha concluída;
- libertação cancela avisos pendentes, sem dano posterior; a memória final aparece.

Correção encontrada pelos testes: a morte do jogador durante um aviso deixava o chefe num estado sem marca no chão. Agora a morte cancela avisos e impactos futuros de chefe e Fragmentos (03, seção 6).

## Limites

- Desempenho medido apenas em renderização por software (SwiftShader, ~2 FPS); não há medição numa GPU real. A revisão Lunia acrescentou bloom, texturas e milhares de instâncias de vegetação, o que aumenta o custo.
- Sem playtest humano: dificuldade, sensação do combo e legibilidade em movimento continuam a avaliar (D10, D12).
- Personagens montados com primitivas (sem escultura nem rig de pele); a fidelidade ao acabamento do Lunia é limitada por isso.
- Uma tentativa de reproduzir a folha de personagem pintada enviada pelo usuário (físico heroico, locs em rabo de cavalo) foi interrompida e revertida por não atingir a qualidade da referência com primitivas. Para essa fidelidade é preciso um modelo 3D esculpido (.glb/.fbx) integrado ao rig atual.
- Animações são poses procedurais (ginga, martelo, galopante, armada, rasteira, meia-lua de compasso, rolê), não capturas de capoeira validadas por especialista.
- Áudio sintetizado (berimbau, caxixi, atabaque, efeitos); nenhum asset externo além das fontes Google Fonts, carregadas pela rede.
- A representação do Curupira segue as restrições do 01/08 (protetor, não demônio) e ainda precisa da revisão cultural de D08 antes de divulgação.

## Câmera de chefe (26/10/2026)

Pedido do usuário: os chefes devem mostrar tamanho de **gigante a colossal** em relação ao jogador, com a câmera mais próxima, como em Tarisland e WoW, para valorizar a leitura das mecânicas.

- **Exploração:** câmera de ação a 10,5 m, 38° para baixo, mirando o peito (1,4 m). O herói ocupa cerca de 20% da altura da tela; antes eram 16,5 m, 50° e 12%. A roda vai de 0,65× a 1,6× (1,6× ≈ câmera alta antiga).
- **Luta contra chefe** (`frameBoss` em `web/src/main.js`):
  - **Âncora:** o herói fica com os pés acima das barras do rodapé (NDC −0,32).
  - **Mira:** avança em direção ao chefe só até onde o herói continua visível.
  - **Distância:** a câmera recua apenas o necessário para o topo do chefe caber (NDC 0,86). O pitch cai 6° para o chefe se erguer sobre o herói, e a mira sobe 12 cm por metro de altura do chefe. Transições suaves.
  - **Altura usada:** a de `boss.height` (Curupira: 3,4 m), então a mesma câmera serve para chefes maiores sem ajuste.
- **Verificação** (`tools/shot-capoeirista.mjs`, capturas em `Evidence/`):
  - `capoeirista-boss.png`: entrada, chefe a 9 m.
  - `capoeirista-boss-melee.png`: corpo a corpo; o cone da varredura fica legível.
  - `capoeirista-boss-colossal.png`: o Curupira escalado para 10 m, só no teste; o chefe domina o quadro e o herói continua visível com o aviso no chão.

O Curupira corrompido tem 3 m no prompt (`SourceArt/Curupira/PROMPT.md`), cerca de 1,7× o herói. Para chegar a "gigante" de verdade, considerar de 5 a 6 m na forma corrompida; a câmera já se ajusta.

## Chão, água e shaders do cenário (27/10/2026)

Revisão dos tiles do chão com efeitos em shader, sem dependências novas (o `injectCorruption` de `toon.js` já faz o papel do three-custom-shader-material: estende os materiais do three por `onBeforeCompile`).

| Problema encontrado | Solução |
| --- | --- |
| Emendas retas na terra e na grama | Bug em `textures.js`: o sorteio de cor/raio acontecia dentro do `wrap()`, então cada cópia de borda saía diferente. A cor agora é sorteada antes |
| Chão chapado, sem relevo | Cada textura pintada gera também normal + altura (`tex.userData.nh`, Sobel sobre um canvas de altura): pedras do piso com chanfro e lascas, seixos em cúpula, grama pela luminância. Oclusão pintada escurece juntas e vãos entre seixos |
| Repetição visível | Grama e terra usam a técnica 3 de anti-repetição de Íñigo Quilez (duas amostras deslocadas, escolhidas por ruído lento). O piso trançado é regular demais para isso e varia por manchas e tons |
| Transições borradas e bordas em círculo perfeito | Máscara amostrada com domínio deformado por ruído e mistura por altura (Booth/Heitz): a terra entra pelas juntas antes de cobrir as pedras, e a grama invade a terra pelas folhinhas. Musgo e terra assentados nas juntas |
| Luz uniforme | Manchas de luz filtrada pelas copas, derivando devagar |
| Corrupção só dessaturava | Rachaduras roxas (Voronoi F2−F1) pulsam no chão do Silêncio e somem quando a onda de restauração passa |
| Riacho com textura rolando | Shader próprio: raso turquesa nas margens e fundo azul no meio, correnteza em faixas, espuma irregular nas pedras e em linhas que chegam à margem, cintilações para o bloom. A margem é reta, então a distância até ela é analítica (sem depth buffer) |
| Vegetação estática | Vento nos cartões de capim, samambaias e folhas largas (`lambert(..., { wind })`), balançando pela posição de cada instância |

O meio-fio da arena usa a mesma normal do piso (`normalMap`). A textura `noiseTexture()` (fBm periódico, 4 canais) alimenta anti-repetição, deformação, luz das copas, rachaduras e água.

Verificação: `node tools/shot-tiles.mjs <prefixo>` grava `Evidence/tiles-<prefixo>-*.png` em pontos fixos (clareira, trilha, riacho, nicho, área corrompida, arena e as versões restauradas) e falha se a página registrar erro, incluindo erro de compilação de shader. Antes/depois: `tiles-before-*` × `tiles-v4-*`.

Ferramentas avaliadas: three-custom-shader-material (desnecessária aqui), three-landscape (é para React Three Fiber), THREE.Terrain (gera relevo, não é o caso do chão plano). Para pintar texturas fora do código, o Material Maker (gratuito, nós em GLSL) exporta cor + normal + altura no formato que o shader já consome.

### Árvores, vegetação e filtro geral (27/10/2026)

| Antes | Agora |
| --- | --- |
| Copas e arbustos eram esferas irregulares lisas com textura | Miolo escuro low-poly (preenche vãos e projeta a sombra) + casca de cartões de folhas em billboard (`leafShell` + `leafCardMaterial`): cada cartão nasce na superfície da esfera, guarda a normal dela para o volume e abre na tela pelo atributo `leafCorner`. Atlas 2×2 de tufos pintados (`leafClusterAtlas`), tremor por folha e balanço da copa no shader |
| Tronco cilíndrico reto | Sapopemas na base (anéis concentrados embaixo), afinando, leve curva e relevo na casca (`normalMap` do `barkTexture`) |
| Palmeira com esferas achatadas | Frondes arqueadas com folíolos (`palmFrondCard`, dobra em V), vento |
| Sumaúma com bolhas | Mesmos cartões nas copas gigantes |

Filtro geral (`grade.js`, depois do OutputPass, em sRGB): ombro suave para o bloom, contraste em S, sombras frias e luzes douradas, vinheta, granulação leve e aberração cromática só nas bordas. Fica tenso na luta contra o chefe (`uDanger`: sombras violeta, vinheta mais fechada, mais contraste) e escoa a cor com menos de 40% de vida (`uDrain`), somando à vinheta vermelha do HUD. O visualizador de personagens não passa pelo filtro.

Custo medido pelo `shot-tiles.mjs` (linha `instanced`): 1,2 milhão de triângulos instanciados. O miolo das copas ficou low-poly porque os cartões o escondem; antes da revisão eram ~1,5 milhão (estimativa pelas mesmas malhas). Os testes conferem `uDrain` com vida baixa e `uDanger` na luta (`__baoba.grade`).

Ajustes pedidos depois (27/10): capim e samambaias sem pontas (lâminas largas de ponta arredondada, base em verde médio, folíolos em gota, fronde oval e touceira mais baixa e aberta), troncos menos avermelhados com sapopemas discretas e casca com menos relevo, seixos da trilha em menor número e mais baixos, vagalumes/partículas menores e mais raros e aberração cromática do filtro reduzida (era ela que dividia os pontinhos brilhantes em cores).

Cogumelos refeitos: pé torneado com bulbo, chapéu em cúpula com borda virada e lamelas por baixo, pintas pintadas (`mushroomCapTextures`). Pintas e lamelas brilham na cor de cada cogumelo (turquesa, azul ou lilás) e pulsam devagar, cada um na sua fase. A sequência de sorteios do mundo foi mantida, então nada mudou de lugar. Captura: `tiles-*-mushrooms.png`.
