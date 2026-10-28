# Especificações técnicas de arte e animação

Manual técnico de todos os elementos visíveis do jogo, do ícone de 64 pixels ao titã de 150 m. Baobá usa 3D com cara de desenho animado de traço forte, tendo como referência oficial o concept do Sertão Velho: contorno escuro e grosso, sombra em blocos duros, cores quentes e saturadas, formas um pouco exageradas. Esse estilo foi escolhido para que agentes de IA consigam gerar, limpar, animar e validar centenas de assets com o mesmo resultado. Os orçamentos desta aba substituem os da aba Câmera e escala, seção 4.

## 1. Referência de estilo: traço forte

O concept do Sertão Velho é a referência de acabamento para todo o jogo; os outros concepts valem como referência de composição e de conteúdo. Toda arte nova é comparada lado a lado com ele antes da aprovação. A imagem deve ser guardada no repositório de arte como `ref_estilo_sertao.png`.

### O que define o estilo

| Elemento | Especificação |
| --- | --- |
| Contorno de personagens e criaturas | Grosso e escuro: 3 px numa tela de 1080 px de altura, crescendo na mesma proporção em telas maiores; afina até 1,5 px com a distância |
| Contorno de cenário | 2 px a 1080 px; some na névoa além de 150 m |
| Cor da linha | A cor mais escura da paleta do material; nunca preto puro. Padrão: marrom-tinta #2A1A12 |
| Linhas internas | 1 a 1,5 px, desenhadas em texturas de decalque: rachaduras, tábuas, dobras de tecido, costuras, mechas de cabelo. Nunca modeladas |
| Sombra | Dois blocos duros (luz e sombra) e um terceiro tom só em oclusão (dobras, sob chapéus, entre dedos); transição quase seca |
| Sombra de cor | A sombra é da mesma família da cor, mais escura e um pouco mais saturada; nunca cinza |
| Brilho | Sem reflexo realista; realce desenhado só em metal, água e olhos |
| Formas | Exagero de 10% a 20% nas silhuetas: chapéus e mãos maiores, pedras arredondadas com rachaduras desenhadas, árvores tortas, casas com cantos levemente irregulares. Linhas retas e perfeitas só no Silêncio |
| Proporção | Heróis com 6,5 a 7 cabeças; NPCs cômicos podem ir a 5 cabeças |
| Céu e fundo | Gradientes simples com nuvens chapadas em 2 tons e contorno suave; névoa colorida |
| Fumaça, fogo e poeira | Bolhas e línguas desenhadas, com contorno, como a fumaça do livro do Coronel no concept |

### O que converter nos outros concepts

| Concept | O que aproveitar | O que mudar |
| --- | --- | --- |
| Mata Viva | Feixes de luz, composição, a Guardiã com escudo de couro | Acabamento realista vira traço forte; incluir palafitas, canoas e vitórias-régias; a árvore-marco deve ter cara de sumaúma (tronco alto com raízes em aletas), não de baobá |
| Sertão Velho | Acabamento, traço, fumaça, Coronel, Mula, paliçada | Variar a paleta além do amarelo (azul seco do céu, barro vermelho); cactos com silhueta de mandacaru e xique-xique; incluir a feira com cordel |
| Porto de Kalunga | Baobá com fitas e lanternas, praça, cais | Remover a igreja barroca e os galeões coloniais, proibidos pelo Guia de arte; trocar pela fusão das seis capitais e por dhows |
| Planalto de Pedra | Muralhas com zigue-zague, torre cônica, morros de granito | Traço forte e cores mais saturadas; incluir pássaros de pedra-sabão e fornos de ferro |
| Ilhas do Limiar | Portal espelhado, mar com as luzes do Despertar | Traço forte; o portal deve ter linhas retas e espelhadas do Silêncio, sem espirais orgânicas; incluir os acampamentos das Confrarias |

## 2. Telas, resolução e desempenho

| Perfil | Resolução | Escala do 3D | Quadros por segundo | Ajustes |
| --- | --- | --- | --- | --- |
| PC mínimo | 1920 × 1080 | 100% | 60 | Sombras com 2 cascatas, contorno de cenário ligado |
| PC recomendado | 2560 × 1440 até 3840 × 2160 | 100% | 60, sem trava até 144 | Sombras com 3 cascatas, vegetação densa |
| Celular médio (4 GB) | Típica de 2400 × 1080 | 70% (interface sempre em 100%) | 30 | Contorno de cenário desligado no modo econômico, 1 cascata de sombra, LOD1 como base |
| Celular alto (8 GB ou mais) | Até 3200 × 1440 | 85% a 100% | 30 ou 60 | Igual ao PC mínimo, com metade da vegetação |

A interface é desenhada na referência de 1920 × 1080 e escala pela altura; precisa funcionar de 4:3 (tablets) a 21:9, respeitando as áreas seguras de entalhes e bordas arredondadas no celular.

**Metas por quadro**

| Recurso | PC | Celular médio |
| --- | --- | --- |
| Chamadas de desenho | Até 2.000 | Até 250 |
| Triângulos na tela | Até 2 milhões | Até 400 mil |
| Personagens com detalhe total | 60 | 20; os demais em LOD reduzido |
| Memória de texturas | Até 2 GB | Até 512 MB |
| Partículas ativas | Até 5.000 | Até 1.000 |
| Camadas transparentes sobrepostas | Até 8 | Até 4 |

## 3. Modelos 3D

### Orçamento por tipo

| Asset | Triângulos no PC (LOD0) | Triângulos no celular | Materiais | Esqueleto |
| --- | --- | --- | --- | --- |
| Personagem jogável completo | 15.000 | 7.000 | 3 (paleta, rosto, decalques de linha) | Humanoide |
| NPC | 8.000 | 4.000 | 3 | Humanoide |
| Eco Companheiro e personagem único | 15.000 | 7.000 | 3 | Humanoide |
| Arma | 1.500 | 800 | 1 | Osso da mão |
| Escudo, instrumento ou bolsa | 1.000 | 500 | 1 | Osso de encaixe |
| Acessório pequeno | 500 | 250 | 1 | Osso de encaixe |
| Mascote | 2.000 | 1.000 | 1 | Quadrúpede ou ave |
| Criatura comum | 5.000 | 2.500 | 2 | Padrão da família |
| Elite | 10.000 | 5.000 | 2 | Padrão da família |
| Montaria | 10.000 | 5.000 | 2 | Quadrúpede ou serpente |
| Chefe de masmorra | 25.000 | 12.000 | 3 | Padrão ou humanoide em escala |
| Colosso de raide (MP) | 60.000, em partes | 25.000 | 4 | Padrão com partes destacáveis |
| Titã mundial | 80.000 | 30.000 | 4 | Padrão da família |
| Peça modular de cenário | 50 a 1.500 | Mesma, com LOD | Atlas da região | — |
| Objeto de cenário (cesto, pote, barril) | 100 a 800 | Mesma, com LOD | Atlas da região | — |
| Árvore grande | 2.000 mais cartões de folhas | 800 | Atlas de vegetação | — |
| Marco visual | 30.000 | 12.000 | Atlas da região mais 1 | — |

### Peças do personagem jogável

| Peça | Triângulos (PC) |
| --- | --- |
| Corpo-base visível (pescoço, braços e pernas expostos) | 2.000 |
| Cabeça e rosto | 1.500 |
| Cabelo em volumes sólidos | 1.500 a 2.500 |
| Peça de cabeça (chapéu, lenço, elmo) | 1.000 |
| Ombros | 1.000 |
| Peito | 3.000 |
| Mãos | 800 |
| Pernas | 2.000 |
| Pés | 700 |
| Total máximo | 15.000 |

Peças de traje escondem as partes do corpo que cobrem; o corpo-base é dividido em regiões que somem por máscara para não atravessar a roupa.

### Níveis de detalhe

Para personagens jogáveis, limites absolutos: LOD0 15.000, LOD1 7.000 e LOD2 3.000 triângulos. Percentuais abaixo são aproximados; os limites absolutos prevalecem.

| Asset | LOD0 | LOD1 (50%) | LOD2 (20%) | Além disso |
| --- | --- | --- | --- | --- |
| Personagens e criaturas | Até 15 m | 15 a 40 m | 40 a 80 m | Some ou vira silhueta simples |
| Chefes e colossos | Até 60 m | 60 a 150 m | Além de 150 m | — |
| Peças de cenário | Até 30 m | 30 a 80 m | 80 a 150 m | Some ou entra no bloco distante da região |
| Árvores e marcos | Até 40 m | 40 a 80 m | — | Impostor (imagem plana) até o fim da visão |

No celular, cada faixa começa um nível abaixo: o LOD1 é o modelo principal.

### Regras de geometria

- Escala real: 1 unidade = 1 m; personagem jogável com 1,80 m.
- Malha toda em triângulos e quadriláteros, sem faces com mais de 4 lados, sem peças soltas nem faces invertidas.
- Densidade de polígonos concentrada na silhueta, nas articulações e no rosto; superfícies planas com o mínimo de triângulos, porque o detalhe vem das linhas desenhadas.
- A cor de vértice é reservada ao contorno: os canais vermelho, verde e azul guardam a normal suavizada, para a linha não rachar nas quinas; o canal alfa guarda a espessura da linha (0 a 1), para afinar em dedos, mechas e pontas.

## 4. Cor, texturas e compressão

### Paleta em vez de textura

Cada região tem uma paleta de 16 por 16 células de cor, em três arquivos com o mesmo desenho: cor base, primeira sombra e segunda sombra, as três cores do Unity Toon Shader. Cada parte do modelo tem as coordenadas de textura (UVs) encolhidas no centro de uma célula: pintar é escolher a célula.

- Linhas da paleta por família: tons de pele (24 células), cabelo, tecidos, couro, madeira, pedra, metais, folhagem, água, linha de contorno, Eco e Silêncio.
- A paleta usa filtragem por ponto (sem suavização) e nenhuma compressão, para uma cor nunca vazar na vizinha.
- Variar um traje, um tier de equipamento ou uma região é trocar a paleta, sem tocar no modelo.

### Rostos desenhados

O rosto é uma folha de 4 por 4 células: 8 expressões de olhos e sobrancelhas (neutra, alegre, brava, triste, surpresa, dor, esforço, olhos fechados), 6 bocas (fechada, sorriso, grito e 3 formas de fala) e 2 células de marcas (rugas, cicatrizes, pinturas). A animação troca as células por eventos, como figurinhas, sem rig facial.

### Tabela de texturas

| Textura | PC | Celular | Compressão PC / celular | Mipmaps |
| --- | --- | --- | --- | --- |
| Paleta (3 arquivos por região) | 256 × 256 | 256 × 256 | Nenhuma / nenhuma | Não |
| Folha de rosto | 1024 × 1024 (células de 256) | 512 × 512 | BC7 / ASTC 4×4 | Sim |
| Decalques de linha do personagem (dobras, costuras, mechas) | 1024 × 1024 por classe | 512 × 512 | BC4 / ASTC 6×6 | Sim |
| Decalques de linha do cenário (rachaduras, tábuas, pedras) | 2048 × 2048 por região | 1024 × 1024 | BC4 / ASTC 6×6 | Sim |
| Padrões de tecido | 512 × 512 por região | 256 × 256 | BC7 / ASTC 6×6 | Sim |
| Atlas de vegetação (folhas e flores com recorte) | 2048 × 2048 por região | 1024 × 1024 | BC7 / ASTC 6×6 | Sim |
| Camadas de terreno (até 4) | 512 × 512 cada | 256 × 256 | BC7 / ASTC 6×6 | Sim |
| Máscara de mistura do terreno | 1 pixel por metro | Igual | BC7 / ASTC 6×6 | Não |
| Nuvens do céu | 2048 × 1024 | 1024 × 512 | BC7 / ASTC 6×6 | Não |
| Espuma e faixas de água | 512 × 512 | 256 × 256 | BC4 / ASTC 6×6 | Sim |
| Impostores de árvores e marcos | 2048 × 2048 (64 vistas de 256) | 1024 × 1024 | BC7 / ASTC 6×6 | Sim |
| Efeitos visuais e interface | Ver seções 8 e 9 |  |  |  |

**Regras:** tamanhos sempre em potência de 2; espaço de cor sRGB para cores e linear para máscaras; 8 pixels de margem entre ilhas nos atlas de decalque; orçamento de até 256 MB de textura por região no celular.

## 5. Contorno, sombreamento e luz

### Contorno

| Onde | Técnica | Espessura a 1080 px | Cor |
| --- | --- | --- | --- |
| Personagens, criaturas, armas e montarias | Casco invertido no shader, com a normal suavizada da cor de vértice | 3 px no LOD0, afinando até 1,5 px com a distância | A cor mais escura da paleta do material (padrão #2A1A12) |
| Chefes e colossos | Casco invertido | 4 px, nunca abaixo de 2 px | Idem |
| Cenário | Pós-processo por profundidade e normais | 2 px, desligado além de 150 m | Cor mais escura da região |
| Linhas internas | Decalques de linha (seção 4) | 1 a 1,5 px aparentes | Mesma da linha externa |

No celular em modo econômico, o contorno de cenário desliga e só personagens, criaturas e objetos interativos mantêm linha.

### Sombreamento

- Unity Toon Shader para personagens, criaturas e armas, com shader próprio em Shader Graph como alternativa, porque o pacote ainda é preview.
- Degrau entre luz e primeira sombra na metade da curva de luz, com transição de 2%; segunda sombra só nas áreas de oclusão desenhadas.
- Borda iluminada fina (rim light) só no lado do contraluz, na cor quente da luz principal.
- Sombras projetadas com borda dura, tingidas com a cor da primeira sombra: 1 cascata de 25 m no celular, 2 a 3 cascatas até 80 m no PC.

### Luz

- Uma luz principal (sol ou lua) e luz ambiente em gradiente de três cores (céu, horizonte, chão) por região.
- Ciclo de dia em 4 estados (manhã, meio-dia, entardecer, noite), cada um com sua paleta de luz por região e transição de 30 s.
- Luzes pontuais (tochas, fogueiras, fornos): até 4 por objeto no PC e 1 no celular.
- Névoa de altura na cor da região para separar os três planos (aba Guia de arte, seção 6).
- O Silêncio Cinzento é um volume de pós-processo: saturação 70% menor, contraste 20% menor e luzes puxadas para #B8E0FF; nenhum asset precisa de versão cinza própria.

## 6. Esqueletos padrão

Quatro esqueletos cobrem quase todo o jogo. Todo modelo novo recebe um deles e herda as animações que já existem para ele.

| Esqueleto | Ossos | Quem usa | O que se compartilha |
| --- | --- | --- | --- |
| Humanoide | 55 de deformação mais 10 de encaixe, com hierarquia compatível com o Unity Humanoid e com o Mixamo | Jogadores, Ecos, NPCs, Papa-Figos, Coronel, Cuca, Pisadeira, Curupira, Saci e, em escala, Lobisomem, Mapinguari e Quibungo | Todo o conjunto-base de animação, por redirecionamento |
| Quadrúpede | 40 | Onça, cavalo, zebra, lhama, capivara, Mula-sem-cabeça, Capelobo e Anhangá | Andar, trotar, correr, atacar, ser atingido, morrer, ser montado |
| Serpente e peixe | Cabeça e mandíbula mais uma cadeia de 20 a 60 segmentos | Cobra Grande, Boitatá, Minhocão, sucuri, Pirarucu, Ipupiara | Movimento por onda calculado no jogo; só ataques e reações são animados |
| Ave | 30 | Gavião, Uirapuru, carcará, condor e Matinta em forma de pássaro | Voar, planar, pousar, decolar, atacar |

**Humanoide em detalhe:** quadril, 3 de coluna, pescoço, cabeça e mandíbula; 4 por braço e 4 por perna; mãos com polegar, indicador e um grupo para os outros três dedos, com 3 falanges cada. Ossos de encaixe: arma direita, arma esquerda, escudo, costas (instrumento, aljava), cintura (bolsas, cabaças), cabeça (chapéus) e 3 ossos de capa, mais 1 de efeito na mão e 1 sobre a cabeça (marcadores).

**Casos especiais**, montados a partir dos padrões: a Cumacanga é uma cabeça que flutua sem esqueleto; a Mãe-do-Ouro alterna entre esfera de fogo (só efeito) e humanoide em escala; o Bicho de Sete Cabeças é um quadrúpede com sete cadeias de pescoço.

**Regras de rig:** no máximo 4 ossos por vértice, pesos normalizados, pose de referência em T para humanoides, capas e cabelos longos com ossos físicos (simulação leve no jogo, desligada no modo econômico do celular).

## 7. Animação

### Regras gerais

- Autoria a **30 quadros por segundo**; o jogo interpola. Compressão por redução de quadros-chave com erro máximo de 0,5%.
- **Locomoção no lugar**, sem deslocamento embutido: quem move o personagem é o núcleo de simulação. Investidas e saltos de habilidade exportam a curva de deslocamento como dados, que o núcleo usa.
- **Eventos em todo clipe:** impacto, passo esquerdo e direito, som, efeito visual, troca de expressão e janela de cancelamento.
- **Estilo cartunesco:** poses fortes e legíveis só pela silhueta; golpes rápidos com 1 a 2 quadros de deformação esticada (smear); estica e achata de até 10% em criaturas e personagens cômicos, nunca nos heróis em combate.
- **Golpes de chefe em quatro partes**, para casar com os tempos de aviso da aba Encontros (2,5 s na Normal, 1,5 s na Mítica, mínimo de 1,2 s): entrada, laço de espera, golpe e recuperação. O laço se repete até completar o tempo de aviso de cada dificuldade, sem precisar de um clipe por dificuldade.

### Esqueleto humanoide: conjunto-base

| Clipe | Quadros | Laço | Observações |
| --- | --- | --- | --- |
| Parado | 60 | Sim | Mais 2 variações de 120 quadros, tocadas a cada 8 a 15 s |
| Parado em combate | 40 | Sim | Uma versão por classe (ver abaixo) |
| Andar | 32 | Sim | Dois passos, ajustar ciclo para 2,5 m/s |
| Correr | 22 | Sim | Ajustar ciclo para 7 m/s |
| Correr rápido (fora de combate) | 18 | Sim | Para 8 m/s |
| Virar parado (90° e 180°) | 15 e 20 | Não |  |
| Pular: impulso, no ar, aterrissar | 8, 12 e 10 | Só o "no ar" | Aterrissagem pesada de 24 quadros para quedas altas |
| Esquiva (4 direções) | 15 cada | Não | Invulnerável do quadro 2 ao 14 (0,4 s) |
| Ser atingido (frente, trás, esquerda, direita) | 10 cada | Não | Aditiva, por cima de qualquer clipe |
| Atordoado | 30 | Sim |  |
| Derrubado e levantar | 20 e 30 | Não |  |
| Morrer | 48 | Não | Termina deitado, sem sangue |
| Ressurgir | 45 | Não |  |
| Sacar e guardar arma | 12 e 12 | Não | Só parte de cima do corpo |
| Nadar parado e nadar | 40 e 36 | Sim |  |
| Montar, desmontar e montado | 30, 20 e 60 | Só "montado" | Um "montado" por família de montaria |
| Coletar: minerar, cortar, colher, esfolar | 45 cada | Sim | Evento de golpe no quadro 20 |
| Fabricar e cozinhar | 60 cada | Sim |  |
| Sentar: entrar, laço, sair | 20, 60 e 20 | Só o laço |  |
| Conversar | 4 clipes de 60 | Sim | Só parte de cima do corpo |
| Danças (emotes) | 6 clipes de 120 a 240 | Sim | Frevo, samba de roda, cumbia, kizomba, azonto, ginga |
| Gestos | 6 clipes de 30 a 60 | Não | Acenar, saudar, rir, aplaudir, apontar, comemorar |

### Por classe

| Clipe | Quadros | Impacto | Observações |
| --- | --- | --- | --- |
| Ataques básicos 1, 2 e 3 | 16, 16 e 24 | Quadros 7, 7 e 11 | Canceláveis 3 quadros depois do impacto |
| Habilidade instantânea | 20 a 30 | Entre os quadros 6 e 10 | Cabe na recarga global de 1,0 s (30 quadros) |
| Habilidade canalizada | Entrada 8, laço 30, saída 10 | Durante o laço |  |
| Habilidade com conjuração | Entrada 10, laço 30, disparo 15 | No disparo | O laço dura o tempo de conjuração |
| Suprema | 60 a 90 | Definido por habilidade | Câmera própria opcional de até 2 s |
| Postura: parado e corrida com a arma | 40 e 22 | — | Substituem os clipes do conjunto-base em combate |

São cerca de 14 clipes por classe e 56 para as 4 classes.

### Rosto e NPCs

- **Piscar:** a cada 2 a 6 s, ao acaso, com 4 quadros (2 com os olhos fechados).
- **Fala:** troca entre as 3 bocas de fala a cada 3 ou 4 quadros enquanto a voz toca, sem sincronia labial exata.
- **Expressões:** trocadas por evento nos clipes e nos diálogos.
- **Ofícios de NPC:** 15 clipes de 60 a 120 quadros em laço (remar, martelar, vender, tecer, varrer, tocar instrumento).

### Criaturas, montarias e chefes

| Clipe | Quadrúpede | Ave | Serpente e peixe |
| --- | --- | --- | --- |
| Parado | 60, laço | 60, laço | Onda procedural |
| Andar ou nadar | 30, laço | — | Onda procedural |
| Trotar | 24, laço | — | — |
| Correr ou voar | 18, laço | 24, laço | Onda procedural mais rápida |
| Planar | — | 60, laço | — |
| Decolar e pousar | — | 24 e 30 | — |
| Ataques (3) | 24 a 40 | 30 | 30 a 60, mais o bote |
| Ser atingido | 10 | 10 | 12 |
| Alerta | 30 | 30 | 30 |
| Especial | 45 | 45 | 60 |
| Morrer | 45 | 45 | 60 |

| Clipe de chefe | Quadros |
| --- | --- |
| Entrada do golpe | 15 |
| Laço de espera | 15 a 30, repetido até o fim do aviso |
| Golpe | 6 a 10 |
| Recuperação | 20 a 30 |
| Troca de fase | 90 a 150 |
| Apresentação na arena | 120 a 300 |
| Morte ou cura (guardiões) | 150 a 300 |

Montarias seguem o quadrúpede, com galope de 18 quadros para 9 m/s, salto de 20 e empinar de 30. É importante que a cadência das patas bata com a velocidade, para os pés não deslizarem.

### De onde vem cada movimento

1. **Bibliotecas prontas** para locomoção e ações comuns: Universal Animation Library da Quaternius (CC0) e Mixamo (gratuito e sem royalties).
2. **Texto para movimento** para habilidades, emotes e ofícios, no esqueleto humanoide.
3. **Poses-chave no Blender** para golpes de assinatura e chefes: o agente posiciona as poses por script, e a pessoa revisora ajusta o ritmo.
4. **Procedural no Unity:** olhar para o alvo, pés no chão em rampas, respiração, ondas de serpentes e física de capas e cabelos.

## 8. Efeitos visuais

Efeitos seguem o mesmo desenho do resto: formas chapadas em 2 tons, contorno quando o efeito é grande, nada de gradientes suaves ou brilho realista. Fogo em línguas desenhadas, fumaça e poeira em bolhas. Sequências de quadros (flipbooks) tocam a 12 ou 15 quadros por segundo, o que dá a sensação de desenho animado.

| Efeito | Textura | Quadros | Partículas (PC / celular) | Duração |
| --- | --- | --- | --- | --- |
| Impacto pequeno (golpe comum) | 512 × 512, grade 4 × 4 | 16 | 20 / 8 | 0,3 s |
| Impacto grande (habilidade forte) | 1024 × 1024, grade 4 × 4 | 16 | 40 / 15 | 0,6 s |
| Fumaça e explosão cartunesca | 1024 × 1024, grade 6 × 6 | 36 | 30 / 12 | 1,5 a 2 s |
| Fogo contínuo | 512 × 512, grade 4 × 4 | 16 | 25 / 10 | Laço |
| Poeira de passo e aterrissagem | 256 × 256, grade 4 × 4 | 16 | 6 / 3 | 0,4 s |
| Faíscas e brilho de item | 256 × 256, grade 4 × 4 | 16 | 15 / 6 | 0,5 s ou laço |
| Projéteis (flecha, dardo, bola de fogo) | Malha mais rastro de 256 × 64 | — | 10 / 5 | Voo |
| Feitiços de área | Malha mais textura rolante de 512 × 512 | — | 60 / 25 | 1 a 8 s |
| Suprema | Combinação dos anteriores | — | 150 / 60 | 2 a 3 s |
| Fios do Eco | Rastro de 512 × 64 | — | 40 / 15 | Laço |
| Silêncio (cinza e faíscas frias) | 512 × 512, grade 4 × 4 | 16 | 30 / 10 | Laço |
| Cura e redenção em onda de cor | Malha em anel mais 512 × 512 | — | 40 / 15 | 1,5 s |
| Telegráficos (círculo, cone, linha, anel, onda) | Decalque de 512 × 512 por forma | — | — | Igual ao tempo de aviso |
| Chuva, poeira do harmatã, neve, folhas | Partículas simples de 128 × 128 | — | 1.500 / 400, num raio de 30 m | Laço |
| Números de dano e cura | Atlas da fonte da interface | — | Até 30 números simultâneos | 0,8 s |

**Regras:** cores tiradas de uma paleta de efeitos de 256 × 256; nenhum efeito comum pode cobrir mais de 30% da tela (supremas, até 50% por 1 s); telegráficos sempre por cima dos outros efeitos, preenchendo a forma do centro para a borda durante o aviso, com as cores e formas fixas da aba Encontros; no modo econômico do celular, cada efeito usa a metade das partículas.

## 9. Interface e ícones

### Regras gerais

- Referência de 1920 × 1080, com layouts separados para PC e celular.
- Molduras inspiradas na xilogravura de cordel: papel creme, tinta marrom (#2A1A12) com contorno de 3 px, acentos de cor por raridade e por classe.
- Alvo de toque no celular de pelo menos 8 mm, cerca de 130 px numa tela de 1080 px de altura.
- Texto com contraste mínimo de 4,5:1 sobre o fundo; nenhuma informação só por cor.
- Animações de interface curtas: abrir e fechar painéis em 6 a 12 quadros (0,2 a 0,4 s); recarga de habilidade em preenchimento radial.

### Tabela de elementos

| Elemento | Autoria | Exibição no PC | Exibição no celular | Observações |
| --- | --- | --- | --- | --- |
| Ícone de habilidade | 256 × 256 | 56 a 64 px | 96 a 120 px | Atlas de 2048 por classe; legível a 32 px |
| Ícone de item | 128 × 128 | 48 px | 72 px | Atlas de 2048 com 256 ícones; moldura de raridade separada |
| Ícone de efeito (bônus e penalidades) | 64 × 64 | 28 a 32 px | 40 px | Borda verde para bônus, vermelha para penalidades |
| Ícone de mapa e minimapa | 64 × 64 | 24 a 32 px | 32 a 40 px |  |
| Marcador de missão sobre NPC | 128 × 128 | 48 px no mundo | 64 px | Sempre de frente para a câmera |
| Moldura de raridade | 128 × 128 em 9 fatias | — | — |  |
| Painéis | 256 × 256 em 9 fatias, bordas de 48 px | — | — |  |
| Botões | 128 × 64 em 9 fatias | — | — | Estados normal, destaque (PC), pressionado e desativado |
| Barras de vida, recurso e experiência | 64 × 16 em 9 fatias | — | — |  |
| Retrato de grupo e de alvo | 256 × 256 | 64 px | 96 px | Recortado do retrato de diálogo |
| Cursor (PC) | 64 × 64 | 32 px | — | 6 estados: normal, atacar, conversar, coletar, saquear, proibido |
| Emblemas de Confraria e de guilda | Vetor e 512 × 512 | — | — | Guildas montam o emblema a partir de 40 formas e 24 cores |
| Logotipo | Vetor e 4096 px de largura | — | — |  |
| Ícone do aplicativo | 1024 × 1024 | — | — | Gera todos os tamanhos pedidos pelas lojas |

### Desenho de ícones

- Um objeto ou ação por ícone, ocupando 70% a 80% da área, com contorno de 8 px na arte de 256 (cerca de 2 px quando exibido a 64).
- Luz vindo de cima à esquerda, igual em todos os ícones.
- Fundo na cor da classe (habilidades) ou da categoria (itens); nenhum texto dentro do ícone.
- Teste em escala de cinza: o ícone precisa ser reconhecível só pelo contraste.
- Cores de raridade: Comum #E8E2D0, Incomum #4F9D4A, Raro #3A7BC8, Épico #8A4FB5, Ancestral #E3A21A.

### Tipografia

- Duas famílias: uma de título inspirada na xilogravura e uma sem serifa muito legível para textos, ambas com licença aberta (OFL) ou própria e com todos os acentos de português, espanhol e inglês.
- Tamanho mínimo de texto corrido: 18 px no PC e 26 px no celular, na referência de 1080 px; números de dano de 28 a 48 px.

### Formato

Atlas de sprites de 2048 × 2048 por grupo de telas, sem mipmaps; compressão BC7 no PC e ASTC 4×4 no celular; arte-fonte em PNG de 32 bits e vetores em SVG.

## 10. Ilustrações 2D, mapas e cinemáticas

Tudo em 2D segue o mesmo traço forte do jogo.

| Elemento | Resolução de autoria | Quantidade | Observações |
| --- | --- | --- | --- |
| Retrato de diálogo (busto) | 1024 × 1024, fundo transparente | 1 por personagem único, com 3 expressões (neutra, alegre, brava) | Mesmo personagem do modelo 3D, com a mesma paleta |
| Tela de carregamento | 3840 × 2160 | 1 por região e 1 por masmorra | Elementos importantes dentro da área segura central de 2560 × 1440, para os cortes de 4:3 a 21:9 |
| Ilustrações de missão em cordel | 2048 × 1536, preto e branco | 1 por missão principal | Estilo de xilogravura |
| Cartas do bestiário (Diário do Griô) | 1024 × 1365 (3:4) | 1 por criatura e chefe |  |
| Mapa-múndi | 8192 × 4096 | 1 | Pintado como um códice, em camadas: base, rios, marcadores e névoa do que não foi explorado |
| Mapa de região | 4096 × 4096 | 1 por região | 1 pixel para cada 0,5 m de terreno, desenhado sobre uma vista de cima gerada no Unity |
| Minimapa | Recorte do mapa de região | — | Exibido em círculo de 256 px no PC e 320 px no celular |
| Arte-chave e imagens das lojas | 3840 × 2160 como base | 1 por temporada | Recortes nos tamanhos atuais pedidos pelo Steam, pela App Store e pelo Google Play |
| Cinemáticas no motor | 1920 × 1080 a 30 quadros por segundo | Prólogo, travessia e Despertar | 30 a 90 s cada, com barras opcionais de 2,39:1; animações e câmeras próprias |

## 11. Pipeline de produção por agentes

Para personagens, o fluxo obrigatório está em `11 - Producao de personagens fieis.md`: referência, modelagem fiel, retopologia, UVs e materiais, rig e pesos revisados, animação, Unity Humanoid, controle jogável e validação visual e de desempenho.

Blender é a ferramenta principal. TRELLIS.2 é opcional para uma base inicial; pesos automáticos e redução automática não substituem acabamento artístico, topologia adequada e testes de deformação. Scripts apoiam exportação, repetição e validação, mas não comprovam fidelidade por si só.

Comparar renders de frente, lado, costas e três quartos com a referência e testar articulações antes de concluir. Preservar fontes e versões anteriores. Para criaturas e objetos, adaptar as mesmas etapas à família de esqueleto e aos requisitos do asset.

O primeiro marco é o humano-base Guardião fiel aos anexos, com corrida, pulo e um ataque no Unity. A produção em volume começa depois da validação desse fluxo.

## 12. Cenário por código e terreno

No cenário, o agente escreve o programa que constrói a peça, em vez de gerar a malha a partir de uma imagem. Isso garante medidas exatas na grade de 1 m e variedade sem esforço extra.

- **Arquitetura modular:** scripts em Python no Blender, ou Geometry Nodes, geram paredes, pisos, telhados, palafitas, muralhas e escadas a partir de parâmetros (largura, altura, estilo da região). Paredes em módulos de 4 m e portas de 3 m por 3,5 m (aba Câmera e escala, seção 5).
- **Vegetação:** troncos gerados por código mais cartões de folhas desenhados; variação por escala, rotação e paleta; vento calculado no shader; grama em cartões desenhados, até 8 por m² no PC e 3 no celular, visível até 50 m e 25 m; árvores viram impostor a partir de 80 m.
- **Terreno:** blocos de 512 × 512 m com mapa de altura de 1 pixel por metro e shader toon de até 4 camadas de cor; pedras e falésias como peças modulares com contorno; distância de visão de 300 m no PC e 150 m no celular.
- **Objetos de cenário:** cestos, potes, canoas e barracas seguem o pipeline da seção 6, com orçamento de peça modular.
- **Marcos visuais:** são os únicos modelados um a um (conceito, TRELLIS.2 e limpeza), sempre com revisão de arte.
- **Montagem das áreas:** o agente posiciona as peças no Unity a partir de um arquivo de layout (dados), e as pessoas ajustam a composição nos marcos e caminhos.

## 13. Formatos, nomes e pastas

- **Formatos:** FBX para tudo o que tem esqueleto e para animações, porque é o formato que o Unity usa para redirecionar animações humanoides; glTF (.glb) para objetos estáticos; PNG para paletas, rostos e decalques.
- **Escala e eixo:** 1 unidade = 1 metro; pivô no chão, no centro do objeto; frente virada para +Z no Unity (o script de exportação converte o eixo do Blender).
- **Fonte da verdade:** o arquivo .blend e o script que o gerou ficam no repositório (com Git LFS para os binários); o FBX ou .glb é sempre gerado de novo, nunca editado à mão.

```markdown
Padrão: tipo_familia_nome_variacao

chr_hum_corpo_a.fbx              corpo-base humanoide A
chr_guardiao_t3_peito.fbx        peça de traje do Guardião, faixa 3
chr_rosto_a_expressoes.png       folha de expressões do rosto A
wpn_guardiao_lanca_t3.glb        arma
crt_qua_onca.fbx                 criatura com esqueleto quadrúpede
bos_mapinguari.fbx               chefe
mnt_cavalo_crioulo.fbx           montaria
env_matav_palafita_parede_4m.glb peça modular da Mata Viva
pal_matav_base.png               paleta da Mata Viva (cor base)
pal_matav_sombra1.png            paleta da Mata Viva (primeira sombra)
anim_hum_correr.fbx              animação do esqueleto humanoide
anim_cls_lutador_martelo.fbx animação de classe
ico_hab_guardiao_escudo_01.png   ícone de habilidade
ico_item_lanca_t3.png            ícone de item
ui_painel_cordel_9f.png          painel em 9 fatias
vfx_impacto_p_4x4.png            sequência de efeito em grade 4 x 4
ill_retrato_kwaku_alegre.png     retrato de diálogo
ill_carga_matav.png              tela de carregamento
map_regiao_matav.png             mapa de região
```

Pastas no Unity: `Assets/Arte/` com subpastas Personagens, Criaturas, Chefes, Armas, Montarias, Cenario, Paletas, Rostos, Animacoes, Efeitos, Interface, Icones, Ilustracoes e Mapas, cada uma separada por região quando fizer sentido.

## 14. Validação automática

Um script confere cada asset no Blender, antes de exportar, e de novo na integração contínua. Se qualquer item falhar, o asset volta para o agente com o motivo.

- Triângulos dentro do orçamento do tipo, nos três níveis de detalhe.
- Escala correta: personagens com 1,80 m, com tolerância de 2%; chefes no tamanho da aba Lista de assets.
- Pivô no chão e frente virada para +Z.
- No máximo 3 materiais em personagens, usando só as paletas da região.
- UVs destinados à paleta dentro das células, sem cair entre duas cores; rosto e linhas usam mapeamento próprio documentado.
- Esqueleto com a hierarquia e os nomes do padrão; no máximo 4 ossos por vértice, pesos normalizados.
- Sem faces invertidas, buracos acidentais, vértices duplicados indesejados ou peças soltas sem função. Separações intencionais de roupa, cabelo e equipamentos devem ser documentadas.
- Nome do arquivo no padrão da seção 13.
- Fotos automáticas de frente, lado e costas e na Sala de Medidas, anexadas ao pedido de revisão.

**Para 2D, interface e efeitos:**

- Tamanho de autoria igual ao da tabela, sempre em potência de 2, com fundo transparente.
- Ícones testados automaticamente a 32 px e em escala de cinza; o revisor confere a leitura.
- Contorno com a espessura certa para o tamanho de autoria (8 px nos ícones de 256).
- Sequências de efeito com a grade exata (4 × 4 ou 6 × 6) e o número de quadros da seção 8.
- Efeito dentro do orçamento de partículas e da área máxima de tela.
- Texto da interface com contraste de pelo menos 4,5:1.

## 15. Ferramentas e licenças

| Ferramenta | Uso | Licença ou custo |
| --- | --- | --- |
| Blender | Modelagem, limpeza, UVs, rig, animação e exportação | Livre e gratuito; os arquivos gerados são do projeto |
| MCP para Blender | Agentes de IA controlam o Blender e rodam scripts Python | MIT ([GitHub](https://github.com/ahujasid/blender-mcp)) |
| TRELLIS.2 (Microsoft) | Imagem para modelo 3D | MIT, uso comercial liberado; fluxo oficial exige Linux e GPU NVIDIA de 24 GB ou mais ([Hugging Face](https://huggingface.co/microsoft/TRELLIS.2-4B/blob/main/README.md), [3D AI Studio](https://www.3daistudio.com/blog/is-trellis-2-free-pricing-how-to-get-started)) |
| UniRig e SkinTokens | Rig automático de criaturas | Código MIT; confirmar a licença dos pesos ([GitHub](https://github.com/VAST-AI-Research/UniRig)) |
| Mixamo (Adobe) | Rig automático humanoide e animações-base | Gratuito e sem royalties para uso comercial; não pode ser usado para treinar IA; sem atualizações ([Adobe](https://community.adobe.com/t5/mixamo-discussions/mixamo-faq-licensing-royalties-ownership-eula-and-tos/m-p/13234775), [Cinevva](https://app.cinevva.com/guides/free-character-animations-rigging)) |
| Universal Animation Library (Quaternius) | Biblioteca de animações | CC0, domínio público ([Cinevva](https://app.cinevva.com/guides/free-character-animations-rigging)) |
| HY-Motion 1.0 (Tencent) | Texto para movimento | Licença comunitária própria, com uso comercial gratuito exceto para plataformas com mais de 100 milhões de usuários; confirmar restrição de território, como no Hunyuan3D ([CGWORLD](https://cgworld.jp/flashnews/01-202601-HY-Motion.html)) |
| Unity Toon Shader | Sombreamento toon com três cores e contorno | Pacote oficial da Unity, ainda em preview ([Unity](https://docs.unity3d.com/Packages/com.unity.toonshader@0.13/manual/index.html)) |
| Animation Rigging (Unity) | Olhar, pés no chão e ajustes procedurais | Pacote oficial da Unity |
| Krita | Pintura de rostos, paletas, decalques, ícones e ilustrações | Livre e gratuito |

**Cuidados:**

- Modelos de movimento treinados em bases de dados só para pesquisa não entram no jogo, mesmo quando o código é aberto.
- O Hunyuan3D continua restrito a protótipos (aba Desenvolvimento por IA).
- O modelo de geração de imagens para os conceitos 2D ainda será escolhido; o critério é licença comercial clara, sem restrição de território.
- Toda licença desta tabela passa pelo parecer jurídico da aba Pendências.
