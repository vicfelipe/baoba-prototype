# Guia de arte: personagens, mundo e cenários

> Atualização de produção (24/10/2026): para personagens, seguir `11 - Producao de personagens fieis.md`. Modelagem fiel, retopologia e revisão de pesos são necessárias; geração 3D e auto-rig são auxiliares opcionais. Os blockouts atuais não são arte final aprovada.

Este guia define como desenhar tudo o que aparece em Baobá, para que pessoas e agentes de IA produzam arte coerente. Ele complementa a seção 16 do Game Design (direção de arte), a aba Câmera e escala (proporções e métricas) e as diretrizes culturais da seção 8.

## 1. Pilares visuais

Toda decisão de arte responde a uma pergunta: esta imagem mostra onde o jogador está e o que é ameaça, numa tela de celular? Os cinco pilares abaixo dizem como chegar a isso.

&#91;embedded content: pilares visuais · 5 regras sobre uma base cultural\]

Quando dois pilares entrarem em conflito, a leitura no celular (silhueta e cor) vence o detalhe, e a revisão cultural vence tudo.

## 2. Linguagem de forma, cor e material

Cada lado do mundo tem uma linguagem própria, e o Silêncio Cinzento é sempre o intruso: retas, espelhos e cinza invadindo formas vivas e coloridas. Quem olha uma captura de tela deve saber onde está e se aquilo é amigo ou ameaça antes de ler qualquer texto.

| Elemento | Formas | Cores | Materiais |
| --- | --- | --- | --- |
| Margem Oeste (Pindorama) | Curvas orgânicas, camadas em degraus (terraços, pirâmides), linhas de água | Verdes, turquesas, vermelhos de terra e ouro | Madeira, palha trançada, pedra encaixada, penas, jade e obsidiana |
| Margem Leste (Wagadu) | Massas verticais de barro e pedra, padrões geométricos repetidos, círculos | Ocres, índigo, bronze, branco de cal e de coral | Barro, pedra seca, bronze, tecido estampado, contas |
| Guardiões da Terra | Formas vivas que misturam bicho, planta e elemento (fogo, água, vento) | Saturadas e quentes, com brilho interno | Chamas, folhas, água e luz |
| Silêncio Cinzento | Retas, ângulos duros, espelhos e correntes cortando formas orgânicas | Cinza-prata, preto e um brilho frio azulado; o entorno perde saturação | Metal polido, espelho quebrado, cinza |
| Colossos | Uma silhueta simples e enorme, com 3 a 5 partes alvejáveis destacadas | Partes vulneráveis brilham na cor da mecânica (aba Encontros) | Os do seu bioma, em escala exagerada |

### Regras gerais

- **Três leituras:** a silhueta precisa funcionar a 30 m, os blocos de cor a 10 m e o detalhe a 3 m.
- **Detalhe 70/20/10:** 70% de áreas calmas, 20% de detalhe médio e 10% de detalhe alto, concentrado nos pontos de foco (rosto, arma, emblema, entrada de um edifício).
- **Formas falam:** curvas e círculos para lugares e figuras acolhedoras; triângulos e pontas para ameaças; retângulos para estruturas de poder e do Silêncio.
- **Desenhado e simples:** sombreamento toon em 2 a 3 tons, contorno escuro e cores chapadas da paleta da região; nada de ruído fotográfico nem textura realista (aba Especificações técnicas).
- **Cor com função:** vermelho, azul e amarelo saturados ficam reservados aos telegráficos de combate e nunca dominam um cenário.

## 3. Personagens jogáveis

A classe define a silhueta e o item-assinatura; a Margem de origem e o equipamento definem o acabamento. Assim, um Oráculo continua reconhecível de longe, vista ele roupa do Delta dos Bronzes ou do Altiplano.

### Corpo, pele e cabelo

- **Proporção e escala:** 1,80 m, cerca de 7 cabeças, mãos e pés 20% maiores (aba Câmera e escala, seção 4).
- **Pele:** escala ampla de tons, com espalhamento de luz sob a pele em subtom quente. A pele escura nunca pode acinzentar ou "lavar" sob nenhuma luz do jogo; todo cenário é testado com os tons mais escuros.
- **Rostos:** traços variados dos povos das duas Margens, sem caricatura. A base de rostos é aprovada pelos consultores antes de qualquer geração em massa.
- **Cabelo:** crespos e cacheados com volume de verdade (tipos 3 e 4), black power, tranças nagô, box braids, locs, bantu knots, cabelos lisos indígenas, lenços e turbantes. Cabelo modelado em volumes sólidos, com recortes e sombra toon que mostram a textura dos fios; sem cartões de cabelo.

### Roupas e equipamento

- Cada peça tem nome e origem real anotados na ficha do asset; nada de "tribal genérico".
- Um traje combina referências de uma mesma região, salvo quando a história pede mistura (Porto de Kalunga, Confrarias mistas).
- O equipamento evolui do nível 1 ao 50 e do tier T4 ao T8 ganhando ornamento e material nobre, sem mudar a silhueta da classe.
- Peças de raide carregam o brilho do Eco: linhas de luz que lembram fios tecidos.

### Identidade visual das classes

| Classe | Silhueta-chave | Item-assinatura | Cores dominantes | Referências de vestuário |
| --- | --- | --- | --- | --- |
| Guardião | Ombros largos, triângulo invertido | Escudo oval longo e lança curta | Ocre, preto e branco | Couraças de couro, escudos de couro de gado, braceletes |
| Lutador | Curvas em S, roupas soltas, postura baixa de ginga | Bastões de maculelê e cordão na cintura | Branco, com a cor da Confraria no cordão | Abadá de capoeira, faixas nos pulsos, pés descalços ou alpercatas |
| Caçador | Esguia e baixa, capuz leve ou chapéu de palha | Arco longo e zarabatana | Verdes e marrons de mato | Couro, fibras naturais, bolsa de caça, pinturas corporais discretas revisadas por consultores |
| Oráculo | Arredondada, tecidos em camadas | Cajado de raiz com cabaças e fios de luz | Branco, índigo e dourado | Saias e mantos de algodão, lenço na cabeça, colares de sementes e contas; nenhum símbolo religioso |

## 4. NPCs, criaturas e colossos

Criaturas do folclore precisam ser reconhecidas por quem cresceu ouvindo as lendas: os traços obrigatórios abaixo não mudam, e todo o resto pode ser reinventado em design original.

### NPCs e Confrarias

NPCs podem ter proporções um pouco mais caricatas que os jogadores, sempre dentro das diretrizes da seção 8 do Game Design. Cada Confraria tem emblema e cor próprios, repetidos em bandeiras, uniformes e na interface.

| Confraria | Emblema | Cor |
| --- | --- | --- |
| Confraria dos Livres | Palmeira sobre paliçada | Verde-palmeira |
| Ordem do Caminho do Sol | Disco solar sobre terraços | Vermelho e ouro |
| Casa da Serpente Emplumada | Serpente com penas | Verde-jade |
| Conselho dos Griôs | Kora cruzada com pergaminho | Índigo |
| Clã da Pedra e do Ferro | Pássaro de pedra sobre padrão em zigue-zague | Granito e bronze |
| Liga das Monções | Vela triangular de dhow | Azul-mar e branco |

### Traços obrigatórios das criaturas

| Criatura | Traços obrigatórios | Cuidados |
| --- | --- | --- |
| Curupira | Pés virados para trás, cabelos de fogo, protetor da mata | Não é demônio: a versão de chefe é uma doença do Silêncio |
| Iara | Mulher das águas com cauda de peixe, cabelos longos, canto | Figura poderosa, nunca sexualizada |
| Boitatá | Serpente de fogo com olhos enormes e brilhantes | Protetor dos campos; a coleira de prata é a agressão |
| Mapinguari | Gigante peludo, um olho, boca na barriga |  |
| Saci-Pererê | Uma perna, gorro vermelho, cachimbo, redemoinho | Design aprovado por consultores afro-brasileiros, sem traços caricatos |
| Matinta Perera | Mulher idosa que vira pássaro agourento, assobio |  |
| Mula-sem-cabeça | Corpo de mula, fogo saindo do pescoço |  |
| Cobra Grande | Serpente gigante de rio, olhos que brilham como lanternas |  |
| Pirarucu Gigante | Peixe enorme de escamas avermelhadas na cauda |  |
| Cumacanga | Cabeça de mulher em chamas que voa |  |
| Mãe-do-Ouro | Bola de fogo dourada que pode tomar forma de mulher |  |
| Quibungo | Corpo grande, boca enorme nas costas | Sem traços racializados; revisão de consultor afro-brasileiro |
| Cuca | Velha bruxa que leva quem não dorme | Design próprio, sem o visual de jacaré da TV |

### Estados do Silêncio

| Estado | Como aparece |
| --- | --- |
| Corrompido | Cores 70% dessaturadas, veios de prata metálica, máscara espelhada ou corrente presa ao corpo, partículas de cinza, olhos sem cor |
| Em combate | Fendas de prata nos pontos fracos brilham na cor da mecânica ativa |
| Curado | A cor volta em onda a partir do peito da criatura; flores, vaga-lumes ou chamas quentes surgem no chão em volta |

### Colossos

- Silhueta simples e enorme, sem ruído de superfície; o detalhe fica nos pontos fracos e no rosto.
- Escala comunicada pelo cenário: árvores, ruínas e outros jogadores sempre visíveis no quadro (Game Design, seção 12).
- Animações lentas e pesadas, com preparação longa de 1,5 a 3 s antes de cada golpe, para casar com os tempos da aba Encontros.

## 5. Chefes

Um chefe é desenhado para ser lido em combate: o corpo avisa cada golpe, os pontos fracos brilham e cada troca de fase muda a silhueta. A arte do chefe e a mecânica da aba Encontros nascem juntas, na mesma ficha.

### Regras de design

- **Escala por categoria:** chefe de masmorra de 6 a 12 m, colosso de raide de 25 a 60 m, titã mundial acima de 80 m (Game Design, seção 12).
- **Silhueta única:** nenhum chefe repete a silhueta de um inimigo comum; ele é reconhecível a 50 m.
- **O corpo avisa:** toda habilidade tem uma parte do corpo que se prepara antes (brilha, incha, recua, muda de postura), com a cor e o som da linguagem de mecânicas da aba Encontros.
- **Pontos fracos visíveis:** 3 a 5 por colosso, marcados por fendas de prata que brilham na cor da mecânica ativa.
- **Fase nova, visual novo:** cada troca de fase muda a silhueta ou a cor (a Iara se ergue do lago, o Rei Sem Rosto cresce até virar colosso).
- **Arena desenhada junto:** marco visual, coberturas e objetos da mecânica (pedras, diamantes, altares, pedestais) fazem parte do chefe.
- **Redenção no fim:** guardiões da natureza terminam curados, com a cor voltando em onda; vilões do Silêncio se desfazem em cinza e prata.
- **Animação pesada:** poses-chave legíveis só pela silhueta e preparação de 1,5 a 3 s nos golpes de colosso.

### Ficha de design de chefe

```markdown
Chefe: [nome] — [masmorra | raide | mundial]
Tamanho: [altura ou comprimento em metros]
Lenda de origem: [povo e região; consultor responsável]
Traços obrigatórios: [da seção 4]
Silhueta: [forma-chave em uma frase]
Paleta: [cores da região + cor das fendas de prata]
Estado: [guardião corrompido | servo do Silêncio | criatura hostil da lenda]
Partes alvejáveis: [lista]
O corpo avisa: [habilidade → parte do corpo → sinal visual e sonoro]
Fases: [o que muda na silhueta ou na cor em cada fase]
Arena: [diâmetro, marco visual, coberturas, objetos da mecânica]
Final: [cura | dissolução | fuga]
```

### Raide O Ventre de Prata

Os 8 chefes contam a descida até o coração do Silêncio: começam como capatazes humanos, passam por guardiões acorrentados e terminam no Rei Sem Rosto, o único que muda de escala no meio da luta.

| # | Chefe | Tamanho | Silhueta e visual | O corpo avisa | Arena |
| --- | --- | --- | --- | --- | --- |
| 1 | Os Capatazes Gêmeos | 6 m cada | Ferrão: alto e magro, casaco longo, chicote de prata. Grilheta: baixo e largo, correntes enroladas no corpo. Os dois com máscaras espelhadas | O chicote acende antes do golpe no tanque; as correntes vibram e brilham roxo antes do Grilhão | Pátio de mineração com trilhos e vagonetes; marcas no chão a cada 15 m para separar os gêmeos |
| 2 | A Fornalha dos Nomes | 30 m | Construção viva de bronze e prata em forma de cabeça de forno, com braços de fole; os nomes roubados queimam como chamas azuladas | A boca incha e brilha laranja antes do Sopro; os foles enchem antes do Fole | Câmara circular com 4 altares nas bordas e chão de grade sobre metal derretido |
| 3 | Iara Silenciada | 35 m | Figura das águas erguida do lago, cabelos como correntezas, máscara espelhada cobrindo o rosto | A água sobe de um lado antes da Onda; anéis de som saem da boca antes do Canto; as Zonas de Eco brilham dourado | Anel de pedra em volta do lago, com 4 pedras-abrigo. Ao ser curada, a máscara se parte e os cabelos ganham cor de rio |
| 4 | Boitatá Acorrentado | 120 m de comprimento | Serpente de brasas com olhos enormes; coleira de prata na cabeça e correntes presas a 4 pilares | O capim brilha em linha antes do Rastro; os olhos se estreitam e trocam de cor antes dos Olhos de Fogo | Campo aberto cercado pelos anéis do corpo. Quando a coleira quebra, as chamas viram dourado-azuladas, a cor de aliado |
| 5 | O Conselho dos Papa-Figos | 5 m cada | Três figuras ricas e pálidas, de casaca e bengala de prata, uma cor por chefe: Mor vermelho, Sangradora roxa, Mercador verde | Um fio dourado liga o chefe ao alvo antes da Gordura da Vida; o Empoderado ganha um halo da sua cor | Salão de contabilidade da mina com 4 pilares de prata |
| 6 | O Bicho de Sete Cabeças, Guardião do Cofre | 60 m de comprimento | Fera de sete cabeças de bichos diferentes, couro rachado com veios de prata e diamantes nas testas | A cabeça central recua antes da Cabeçada Esmagadora; o diamante de uma das testas acende e projeta uma linha vermelha antes do Olhar | Caverna com 6 diamantes gigantes e um abismo de um lado; tremores no chão anunciam onde ele emerge na fase 2 |
| 7 | O Cofre dos Mil Nomes | 40 m | Relicário vivo de bronze com centenas de objetos e rostos roubados presos às paredes | As portas começam a fechar com estrondo antes da onda das Portas | Salão circular com 6 pedestais: cabeça de bronze, quipu, códice, manuscrito, pássaro de pedra-sabão e folheto de cordel |
| 8 | O Rei Sem Rosto | 2,2 m na fase 1; 80 m na fase 3 | Fase 1: figura alta de manto cinza com rosto liso e espelhado. Fase 3: colosso de máscaras e rostos roubados que se trocam o tempo todo | A sombra das mãos cresce no chão antes de cada golpe; a boca do rosto se abre e brilha antes do Grito do Silêncio | Plataforma flutuante sobre o Mar de Kalunga escurecido. No fim, os rostos se soltam como luzes e voltam aos donos |

**Cuidado com os Papa-Figos:** na lenda nordestina, o Papa-Figo é um homem rico que vive da vida dos pobres. No jogo, eles representam a ganância do Silêncio e não têm traços de nenhum povo real.

### Chefes de masmorra

Cada masmorra tem três chefes: um da lenda local, um servo do Silêncio e um chefe final que fecha a história da masmorra.

| Masmorra | Chefe | Visual-chave | O corpo avisa |
| --- | --- | --- | --- |
| O Coração da Mata Viva | Matinta Perera | Mulher idosa de xale preto, metade do corpo coberta de penas | As penas se ariçam e ela leva os dedos à boca antes do Assobio |
|  | Mapinguari | Gigante peludo de um olho, boca vertical na barriga | A boca da barriga se abre e brilha antes da Boca do Ventre; ergue o pé antes da Pisada |
|  | Curupira Corrompido | Cabelos de fogo apagados em cinza, pés virados, cipós de prata pelo corpo | Deixa pegadas brilhantes; os cabelos reacendem em cruz antes do Cabelo de Fogo |
| O Arraial do Corpo-Seco | Mula-sem-cabeça | Mula escura com labareda no lugar da cabeça | A chama cresce e fica branca antes da investida |
|  | Corpo-Seco | Corpo ressecado preso a raízes mortas | Raízes racham o chão onde ele vai atacar |
|  | Coronel Quebra-Nome | Terno de linho branco, chapéu de feltro, bengala de prata e um livro de dívidas | Abre o livro e nomes saem como cinzas antes de cada golpe; foge ao fim |
| As Minas do Ventre | Capataz de Prata | Armadura de mineiro com lanterna no peito | A lanterna pisca vermelho antes do golpe |
|  | Papa-Figo Contador | Figura rica e pálida de casaca, com balança de prata | O prato da balança pende para o alvo da drenagem |
|  | Minhocão Cinzento | Verme gigante de couro cinzento que cava as galerias | O chão estufa no ponto onde ele vai emergir |
| A Cidade Submersa | Cabeça de Cuia | Pescador de cabeça em forma de cuia, preso ao rio | A água gira em volta dele antes de puxar alguém |
|  | Pirarucu Gigante | Peixe enorme de escamas avermelhadas | Sobe à superfície para respirar antes de cada investida |
|  | A Mulher de Branco | Mulher de vestido e véu brancos, lágrimas de prata | O choro aumenta e a água sobe; no fim, o véu se desfaz em luz |
| A Biblioteca Queimada | Escriba Sem Voz | Escriba de túnica com a boca costurada por fios de prata | Páginas voam em espiral em volta dele |
|  | Cuca | Velha bruxa de dedos longos e saco de memórias roubadas | Abre o saco antes de roubar a memória de um jogador |
|  | Guardião dos Manuscritos | Constructo de barro em forma de torre de biblioteca, com vigas salientes | As vigas acendem antes de cada onda |
| O Mangue dos Bronzes | Cumacanga | Cabeça de mulher em chamas que voa pelo mangue | A chama cresce e ilumina o alvo antes do mergulho |
|  | Lobisomem | Homem-lobo de pelo escuro, colar de prata quebrado | Uiva antes de cada investida em sequência |
|  | Escultor de Prata | Artesão corrompido que transforma bronze em prata | O martelo brilha antes de petrificar quem estiver perto |
| As Cavernas de Diamante | Capelobo | Criatura peluda de focinho de anta, garras longas | Fareja o ar e aponta o focinho para o alvo antes do bote |
|  | Pisadeira | Velha magra de unhas compridas e pés enormes | Ergue o pé sobre quem ficou parado antes de paralisá-lo |
|  | Supervisor dos Veios | Capataz com picareta de prata e lanterna de cristal | Bate a picareta e o chão racha na direção do golpe |
| O Naufrágio da Monção | Quibungo | Ogro grande com uma boca enorme nas costas | A boca das costas se abre antes de engolir |
|  | Caboclo d'Água | Ser escuro do rio, coberto de algas, que vira barcos | O casco balança antes de ele agarrar a borda |
|  | Capitão Afogado | Capitão de dhow encharcado, com algas e âncora | O navio inclina para o lado da âncora antes do golpe |

### Chefes mundiais

| Chefe | Tamanho | Visual | O corpo avisa | Região |
| --- | --- | --- | --- | --- |
| Cobra Grande (Boiúna) | 150 m de comprimento | Serpente de rio com escamas de lama e olhos de lanterna; o corpo forma ilhas e pontes | O rio ferve e escurece onde ela vai emergir | Mata Viva |
| Mãe-do-Ouro | 90 m | Bola de fogo dourada que vira uma mulher gigante de cabelos de chamas | O chão incendeia em círculos antes de cada salto | Planalto de Pedra |
| Ipupiara | 100 m | Monstro marinho de escamas escuras, nadadeiras como velas e muitos dentes | A maré recua de repente antes de cada ataque | Delta dos Bronzes |
| Minhocão | 120 m de comprimento | Verme gigante de couro grosso que abre canais na montanha | Barrancos desabam e o chão estufa onde ele vai sair | Altiplano do Sol |

### Raides futuras

- **A Cidade Encantada de Jericoacoara:** ruas de uma cidade dourada sob a pedra junto ao mar, cada ala guardada por um chefe; a princesa-serpente de escamas de ouro fecha a raide. Revisão de pesquisadores do folclore cearense.
- **O Reino da Cobra Norato:** o fundo do rio amazônico com cidades de lama e raízes; Maria Caninana como serpente escura e corrompida, Honorato como serpente clara que vira aliado na luta final. Revisão do consultor amazônico.

## 6. Mundo e cenários

Cada região tem paleta, arquitetura, vegetação, luz e um marco visual próprios, todos tirados de referências reais e estilizados. As paletas abaixo são o ponto de partida da bíblia de arte e serão ajustadas nos testes no jogo.

### Princípios

- **Marco visível de longe** em toda região, para o jogador se orientar sem olhar o mapa.
- **Três planos:** frente com contraste forte, meio com contraste médio, fundo clareado pela atmosfera.
- **Caminhos legíveis:** trilhas com cor e textura próprias; a luz sempre puxa o olhar para a próxima área.
- **Kits modulares por cultura** em grade de 1 m, com paredes em módulos de 4 m e portas de 3 m por 3,5 m (aba Câmera e escala, seção 5).
- **Ruínas que contam história:** cada área tem um objeto de memória (mural, quipu, manuscrito, placa de bronze, folheto de cordel) que vira um Eco colecionável.
- **Baobás de território** sempre maiores que a vegetação em volta, com tecidos e estandartes da guilda dona.
- **Arquitetura religiosa real** (igrejas, mesquitas, templos em uso) não aparece como cenário de combate.

### Margem Oeste

| Região | Paleta | Arquitetura | Vegetação e terreno | Luz | Marco visual |
| --- | --- | --- | --- | --- | --- |
| Mata Viva | #1F6B4F, #3FA796, #C9A227, #6B3E26, #E8D9B5 | Palafitas, malocas comunitárias, passarelas de madeira entre árvores | Sumaúmas gigantes, vitórias-régias, floresta alagada, cipós | Feixes de luz filtrada, névoa ao amanhecer | Sumaúma-Mãe, a maior árvore do jogo |
| Sertão Velho | #D98E3A, #A23E2A, #F2E3C6, #4A6A7A, #3B2A1E | Casas de taipa caiadas, paliçadas do Palenque das Palmeiras, feiras com toldos | Mandacaru, xique-xique, juazeiro, caatinga esbranquiçada na seca | Sol a pino duro e pôr do sol longo e alaranjado | Muralha do Palenque das Palmeiras |
| Altiplano do Sol | #8C2F39, #2E5E8C, #D4A017, #7A8C5A, #E6E1D3 | Pedra encaixada sem argamassa, portas trapezoidais, terraços agrícolas, pontes de corda, armazéns de pedra | Capim ichu, árvores queñua, puya raimondii, picos nevados | Luz de altitude, céu muito azul, sombras duras | Terraços de Intipata e o Portal do Sol |
| Lagos Flutuantes | #2F8F9D, #3E6B2F, #B5452B, #E0C27A, #1D2B3A | Templos escalonados, chinampas, calçadas sobre a água, pedra vulcânica vermelha | Ciprestes ahuehuete, milharais, plantas aquáticas, cenotes | Luz dourada e úmida, reflexos no lago | Templos gêmeos de Atlixa |

### Margem Leste

| Região | Paleta | Arquitetura | Vegetação e terreno | Luz | Marco visual |
| --- | --- | --- | --- | --- | --- |
| Delta dos Bronzes | #6E4B2A, #2C5F4F, #C9732D, #E9C46A, #13322B | Palácios com muralhas de barro e placas de bronze, pátios com cisterna de chuva, vilas de palafita no mangue | Mangues, palmeiras de ráfia, canais | Neblina úmida, pôr do sol cor de cobre | Palácio das Placas de Bronze |
| Savana Dourada | #C8A165, #8A5A2B, #E9D8A6, #2B4C7E, #F4A259 | Arquitetura sudano-saheliana de barro com vigas de madeira salientes, celeiros cônicos, bibliotecas com pátios | Baobás, acácias, capim dourado | Luz quente e poeira do harmatã | Grande Biblioteca de Tumbara |
| Planalto de Pedra | #7D7461, #4F6D3A, #B8860B, #A0522D, #DCD3C1 | Muralhas de pedra seca com padrão em zigue-zague, torre cônica, pássaros de pedra-sabão sobre pilares | Bosques de miombo, árvores msasa, morros de granito | Céu limpo e entardecer vermelho | Torre Cônica de Mabwe |
| Costa das Monções | #F2EDE4, #1F7A8C, #C2703D, #2E3F5C, #E3B23C | Casas de pedra de coral caiadas, portas de madeira entalhada, bancos de pedra nas fachadas, barcos dhow | Coqueiros, mangues, baobás na costa | Luz clara de mar e tempestades de monção | Porto de Kisiwa com a frota de dhows |

### Centro e Silêncio

| Lugar | Paleta | Arquitetura e terreno | Luz | Marco visual |
| --- | --- | --- | --- | --- |
| Porto de Kalunga | Mistura das duas Margens, com #0E4D64 (azul-Kalunga) | Fusão das arquiteturas das seis capitais em volta de uma praça | Fim de tarde dourado | Baobá-Mãe no centro da praça |
| Sertão de Kalunga | #2B2F36, #5E8C8A, #E8E2D0, #9FD3E6 | Rocha vulcânica nova, crostas de sal, formações de Pérolas de Eco, fortalezas, quilombos escondidos | Tempestades rápidas e névoa marinha | A Fortaleza de Pedra de cada ilha |
| Silêncio Cinzento | #8A8F98, #C9CDD3, #3C3F45, brilho #B8E0FF | Estruturas retas de metal e espelho cravadas na paisagem; vegetação petrificada | Luz chapada, sem sombras coloridas | Torres espelhadas das Bocas-de-Prata |

## 7. Produção com IA

A IA gera variações e acelera o trabalho, mas todo asset passa por direção de arte e revisão cultural humanas antes de entrar no jogo. Isso protege a qualidade, a autenticidade e o direito autoral (aba Desenvolvimento por IA, seção 5).

### Fluxo de um asset

1. **Ficha do asset:** função no jogo, região, referências reais aprovadas, paleta e orçamento técnico.
2. **Conceito 2D:** a IA gera variações; a direção de arte escolhe, pinta por cima e fecha a folha de modelo (frente, lado e costas).
3. **Revisão cultural** pelos consultores do grupo de origem.
4. **Modelo 3D:** a IA gera a base de objetos e cenário; personagens e criaturas partem da malha-base padrão do projeto, com topologia pronta para animação.
5. **Topologia, mapeamento de textura, esqueleto padrão e níveis de detalhe.**
6. **Cores da paleta e rosto desenhado** aplicados por script, conforme a aba Especificações técnicas; a direção de arte ajusta.
7. **Teste no motor** na Sala de Medidas: silhueta a 8% da altura da tela, leitura no celular de 4 GB e pele escura sob todas as luzes.
8. **Aprovação final** e registro da contribuição humana (quem modificou o quê).

### Modelo de pedido para a IA

```markdown
Asset: [personagem | criatura | cenário | objeto] — [nome]
Função no jogo: [ex.: chefe corrompido do Coração da Mata Viva]
Estilo Baobá: 3D desenhado (toon), cores chapadas, contorno escuro, silhueta clara
que se lê a 30 m, proporção heroica de 7 cabeças (personagens), luz suave pintada.
Referências culturais aprovadas: [lista da ficha, com nomes reais]
Traços obrigatórios: [da seção 4, se for criatura]
Paleta: [códigos da região, seção 6]
Estado: [normal | corrompido pelo Silêncio | curado]
Evitar: tribal genérico, objetos sagrados, caricatura, sexualização, logotipos,
designs de TV ou de outros jogos.
Saída: [folha de modelo frente/lado/costas | conceito de cenário 16:9]
```

### Checklist de aprovação

- Silhueta reconhecível a 8% da altura da tela.
- Traços obrigatórios presentes (criaturas).
- Paleta e linguagem de forma da região respeitadas.
- Referências culturais nomeadas na ficha e aprovadas por consultor.
- Pele escura legível em todas as luzes.
- Dentro do orçamento técnico (aba Especificações técnicas, seção 3).
- Contribuição humana registrada.
- Modelo de IA usado está na lista aprovada pelo jurídico, sem restrição de território.

## 8. O que nunca fazer

Qualquer um destes itens reprova o asset na revisão, venha ele de uma pessoa ou de um agente de IA.

- "Tribal genérico" ou mistura aleatória de símbolos de povos diferentes num mesmo traje.
- Objetos e símbolos sagrados usados como enfeite: máscaras rituais, insígnias de orixás, cocares de lideranças, paramentos religiosos.
- Caricatura de traços faciais, clareamento de pele ou cabelo crespo tratado como "bagunçado".
- Sexualização de figuras do folclore ou de qualquer personagem (classificação alvo de 14 anos).
- Cópia de designs modernos de TV, quadrinhos ou outros jogos.
- Fotos de pessoas ou comunidades reais usadas como textura ou como referência direta de rosto.
- Arquitetura religiosa real como cenário de combate.
- Vermelho, azul ou amarelo saturados no cenário, competindo com os telegráficos de combate.
- Asset gerado por IA entrando no jogo sem passar pelo fluxo da seção 7.
