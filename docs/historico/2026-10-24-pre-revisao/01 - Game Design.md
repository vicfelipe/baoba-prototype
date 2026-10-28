# Baobá

Game Concept & Game Design Document · v0.1 · Oct 22, 2026 · @Victor

## 1. Visão geral

Baobá é um MMORPG free-to-play para PC e mobile, com jogo e progresso cruzados, que une masmorras e raides no estilo World of Warcraft a guerras de guildas por território no estilo Albion Online, num mundo de fantasia com o folclore brasileiro no centro e as culturas da América Latina e da África presentes em artefatos, objetos e trajes.

**Duas fases de jogo:** do nível 1 ao 50, Baobá é uma campanha single player, com companheiros controlados por IA nas masmorras. A missão final, O Pacto das Duas Margens, desperta o jogador para o mundo compartilhado, onde começam o multiplayer, as raides, o PvP e as guerras de guildas. O desenvolvimento segue a mesma ordem: primeiro a campanha solo completa, com toda a jogabilidade e todos os modelos; depois o multiplayer.

**High concept:** o oceano entre dois continentes guarda a memória do mundo, e uma fome antiga está apagando essa memória. Os jogadores recuperam histórias perdidas em masmorras e raides e disputam as terras sem lei da Fronteira em guerras de guildas.

### Ficha técnica

| Item | Definição |
| --- | --- |
| Título provisório | Baobá, a árvore da memória. No Senegal, griôs eram sepultados dentro de baobás para que a história não fosse enterrada; no Brasil, a tradição conta que africanos escravizados trouxeram as sementes escondidas na travessia, e o Recife é chamado de capital dos baobás nas Américas. O nome une memória, as duas margens do Atlântico e resistência, e é reconhecido em português, espanhol, inglês e francês (baobab). Registro no INPI a verificar: já existem outras marcas com o nome, como o Fundo Baobá. |
| Gênero | RPG de ação com alvo assistido (tab-target híbrido): campanha single player do nível 1 ao 50 que se abre em MMORPG depois da missão final |
| Plataformas | PC com cliente desktop para Windows (Steam e launcher próprio) e celular com app próprio para Android e iOS, com cross-play e cross-progression. Navegador: versão de teste opcional depois do alfa |
| Modelo de negócio | Free-to-play: loja cosmética, passe de temporada e assinatura de conveniência. Nenhum atributo de poder à venda. |
| Público principal | 18 a 35 anos, jogadores de MMO e RPG mobile na América Latina, na África e na diáspora africana |
| Público secundário | Jogadores globais cansados de fantasia medieval europeia |
| Classificação etária alvo | 14 anos (ClassInd), Teen (ESRB), PEGI 12: violência fantasiosa, sem sangue realista |
| Câmera | Terceira pessoa; livre no PC, com assistência de enquadramento no mobile |
| Idiomas no lançamento | Português (BR), espanhol (LatAm), inglês e francês. Fase 2: suáli e árabe |

### Pilares de design

1. **Memória é poder.** Toda progressão recupera uma história perdida. A lore não é enfeite: ela é o sistema de magia, a moeda das relíquias e o motivo de cada chefe.
2. **Sozinho primeiro, juntos depois.** A campanha do nível 1 ao 50 é solo e ensina o jogo com companheiros de IA. Depois do Despertar, o coração do jogo é o grupo: masmorras de 5, raides de 10 e 20.
3. **A Fronteira é dos jogadores.** No Sertão, guildas constroem, cobram impostos, coletam, perdem tudo e reconquistam. A economia nasce ali.
4. **Justo em qualquer tela.** Mesmo poder no PC e no celular, sem pay-to-win. Quem vence é quem joga melhor e se organiza melhor.

### Diferenciais

- Folclore brasileiro, com raízes indígenas, africanas e ibéricas, como fundação do mundo, e não como skin sobre fantasia genérica.
- Ponte entre PvE e PvP: raides geram Relíquias e materiais raros que só viram equipamento de guerra pelas mãos dos artesãos do Sertão.
- Guerra territorial pensada para mobile: batalhas com teto de participantes e janelas de cerco distribuídas por fuso horário.
- Representatividade real na criação de personagem: cabelos crespos, tranças, locs, black power, pinturas corporais e tecidos como kente, bogolan e aguayo.

### Loop principal

&#91;embedded content: loop principal · PvE, artesãos e guerra\]

O Equipamento de Linhagem do PvE nunca se perde; o que circula e é destruído é o equipamento de guerra, e essa destruição mantém os artesãos sempre com demanda.

### Loops por duração de sessão

| Sessão | Duração | Atividades típicas |
| --- | --- | --- |
| Curta | 10 a 20 min | Missões diárias, coleta, uma masmorra, fila de arena, mercado |
| Média | 30 a 60 min | Masmorra mítica, campo de batalha, expedição de coleta no Sertão |
| Longa (agendada) | 2 a 3 h | Raide, cerco territorial, defesa de quilombo |

## 2. Referências de mercado e lições

A principal lição vem de Tarisland: lançado em 21 de junho de 2024 e desligado em 4 de novembro de 2025, ele prometeu WoW no celular sem pay-to-win e caiu por sensação de jogo mobile no PC, elementos pagos que contradiziam a promessa e falta de conteúdo de longo prazo ([Mein-MMO](https://mein-mmo.de/tarisland-ende-november-2025/)). Baobá precisa fazer o oposto nesses três pontos desde o primeiro dia.

| Referência | O que aproveitar | O que evitar |
| --- | --- | --- |
| [Tarisland](https://mein-mmo.de/tarisland-ende-november-2025/) (Tencent, 2024–2025) | Cross-play PC/mobile, masmorras curtas e raides de 10 desde o início, duas especializações por classe | Interface e limites de habilidade "de celular" no PC; travas de tempo duras com pouco conteúdo entre elas; promessa anti pay-to-win quebrada; silêncio da desenvolvedora ([Massively OP](https://massivelyop.com/2025/09/02/tarisland-has-reportedly-stopped-functioning-on-ios-as-tencents-radio-silence-continues/)) |
| World of Warcraft | Trindade tanque/cura/dano; masmorras com afixos semanais e ranking (estilo Mítica+); raides com três dificuldades; mecânicas de chefe legíveis | Dependência de addons de terceiros; curva de nível longa demais para mobile; conteúdo antigo abandonado a cada expansão |
| Albion Online | "Você é o que veste"; saque total em zonas de risco; economia feita por jogadores; temporadas de guilda; fortificações com janelas de vulnerabilidade ([MMOs.com](https://mmos.com/news/albion-onlines-foundations-update-now-live)); postos avançados para guildas médias ([Massively OP](https://massivelyop.com/?p=235108)) | Domínio de megaguildas; entrada brutal para novatos; batalhas massivas difíceis de ler numa tela de celular |

### Regras que saem dessas lições

1. **Duas interfaces, um jogo.** PC e mobile têm layouts próprios, desenhados em paralelo. Nenhuma tela de PC é a tela do celular ampliada.
2. **Promessa pública e auditável.** Uma "Carta do Jogo Justo" lista o que nunca será vendido. Quebrar a carta exige votar com a comunidade.
3. **Cadência antes do lançamento.** O jogo só lança com 12 meses de conteúdo planejado e 6 meses produzidos.
4. **Comunicação semanal.** Notas de desenvolvimento toda semana, inclusive quando a notícia é ruim.
5. **Novato protegido, veterano desafiado.** O Sertão (PvP com saque total) é opcional e só abre após a campanha inicial.

## 3. Mundo e cosmologia

O mundo do jogo é tecido de histórias: quem perde sua história perde a si mesmo, e o vilão é uma fome que devora nomes e memórias. Dois continentes, as **Duas Margens**, são separados e ligados pelo **Mar de Kalunga**, um oceano feito de memória.

### Cosmologia

- **A Tecelã.** No princípio, a Tecelã teceu o mundo com fios de histórias. Cada ser vivo é um fio; cada povo, um padrão. Inspirações: Anansi, a aranha akan dona de todas as histórias, e os quipus andinos, cordões de nós usados para registrar informação.
- **O Mar de Kalunga.** Na cosmologia bakongo, kalunga é a grande água que separa o mundo dos vivos do mundo dos ancestrais. No jogo, é o oceano entre as Margens, onde as memórias de quem partiu repousam e ainda falam.
- **O Eco.** É a magia do mundo: o poder de despertar a memória de um feito antigo e trazê-lo ao presente. Cada habilidade dos jogadores é um Eco de uma história recuperada.
- **Os Guardiões da Terra.** Espíritos protetores de matas, rios, montanhas e desertos, vindos do folclore (Curupira, Caipora, Anhangá, Boitatá, Iara, entre outros). Eles não são vilões: quando aparecem como inimigos, estão corrompidos e podem ser curados.

### Por que o folclore brasileiro está em toda parte

O folclore brasileiro nasceu do encontro das duas Margens: lendas de raiz indígena (Curupira, Iara, Boitatá), africana (Quibungo, parte do Saci) e ibérica (Mula-sem-cabeça, Lobisomem, Cuca) se misturaram em Pindorama. No jogo, essas criaturas são os Guardiões e as assombrações do mundo inteiro, e o Silêncio as espalha e corrompe nas duas Margens. Os outros povos da América Latina e da África aparecem pela cultura material: arquitetura, trajes, instrumentos, artefatos e relíquias que guardam suas histórias (seção 7).

### O antagonista: o Grande Silêncio

O **Rei Sem Rosto** é um ser que nasceu sem história e tenta preencher esse vazio devorando as histórias dos outros. Onde ele passa, sobra o **Silêncio Cinzento**: terras sem cor, pessoas sem nome, rios sem canto.

- **As Bocas-de-Prata.** Sacerdotes de máscaras espelhadas que extraem nomes como quem extrai minério. São uma alegoria da exploração colonial e da extração de riquezas, como a prata de Potosí.
- **A Companhia do Cerro.** Mercadores e mineradores das duas Margens que serviram ao Rei por ambição. O mal não tem povo nem cor: ele recruta em todo lugar.
- **Coronel Quebra-Nome.** Tenente do Rei no Sertão, um senhor de terras que cobra tributo em memórias. Vilão recorrente da campanha.

### Linha do tempo

| Era | O que aconteceu | Uso no jogo |
| --- | --- | --- |
| Era da Tecelagem | A Tecelã cria o mundo e os Guardiões | Mito de abertura, contado pelo narrador |
| Era dos Reinos | Florescem reinos nas duas Margens: cidades de pedra, bibliotecas, estradas nas montanhas, cidades sobre lagos | Ruínas, masmorras, relíquias |
| Era das Correntes | O Rei Sem Rosto desperta; suas forças cruzam Kalunga arrancando povos e memórias de suas terras | Pano de fundo tratado com consultoria (ver seção 8) |
| A Grande Insurgência | Quilombos, palenques e reinos das duas Margens se unem, quebram as correntes e selam o Rei no Ventre de Prata pelo **Pacto das Duas Margens** | Lenda central; facções nascem dela |
| Era Presente (ano 0) | O selo racha. O Silêncio volta, e ilhas esquecidas emergem no meio de Kalunga: o **Sertão de Kalunga** | Início do jogo; fronteira das guerras de guildas |

### O papel do jogador

O jogador é um **Desperto**: um sobrevivente de um naufrágio em Kalunga que se afogou, ouviu os ancestrais no fundo do mar e voltou capaz de ouvir Ecos. Despertos são raros, e cada um pode recuperar histórias que o Rei roubou.

**Tema central:** memória, resistência e reconstrução. O título vem da árvore que guarda a memória e que atravessou o mar. No jogo, os baobás são âncoras de memória e marcos de território, e o Baobá-Mãe do Porto de Kalunga, nascido de uma semente levada na travessia, é o símbolo do Pacto das Duas Margens. O símbolo adinkra Sankofa ("voltar e buscar o que ficou para trás", do povo akan, em Gana) segue como emblema do Pacto.

## 4. Regiões do mundo

O lançamento tem 8 regiões de campanha (4 por Margem), uma cidade neutra e o arquipélago de guerra; mais 4 regiões chegam nas expansões. O jogador começa na Margem de origem (níveis 1 a 20), atravessa o mar pelo Porto de Kalunga no nível 20, sobe de 20 a 40 em duas regiões da outra Margem e fecha a campanha (40 a 50) nas Ilhas do Limiar, à beira do Sertão. Assim, cada caminho passa pelas duas Margens, e um personagem alternativo da outra origem conhece as quatro regiões que o primeiro não viu.

### Margem Oeste: Pindorama

Pindorama é o nome tupi para "terra das palmeiras". O continente reúne inspirações da Amazônia, dos Andes, da Mesoamérica, do Nordeste brasileiro, do Caribe e do Cone Sul. Nome definitivo a validar com consultores.

| Região | Níveis | Inspiração | Destaques | Fase |
| --- | --- | --- | --- | --- |
| Mata Viva | 1–10 (início Oeste) | Amazônia, rios e igarapés | Curupira, Caipora, Iara, Boto, Mapinguari, Matinta Perera; vilas sobre palafitas; canoas | Lançamento |
| Sertão Velho | 10–20 (caminho Oeste) | Caatinga e Nordeste brasileiro, cordel, cangaço | Mula-sem-cabeça, Corpo-Seco, Lobisomem; capital Palenque das Palmeiras; missões contadas em cordel | Lançamento |
| Altiplano do Sol | 20–30 (caminho Leste) | Andes: terraços, estradas de pedra, lhamas, condores | Minhocão, Papa-Figos, Bradador; capital Intipata; minas de prata do Rei; quipus como objetos de memória | Lançamento |
| Lagos Flutuantes | 30–40 (caminho Leste) | Mesoamérica: cidades sobre lagos, chinampas, cenotes, pirâmides | Cabeça de Cuia, a Mulher de Branco; capital Atlixa; códices e adornos de jade | Lançamento |
| Pampas do Vento Sul | Expansão | Pampa gaúcho | Teiniaguá e a Salamanca do Jarau, Boitatá gaúcho | Expansão 1 |
| Pantanal e Cerrado | Expansão | Pantanal, Cerrado e chapadas | Pé-de-Garrafa, minhocões dos rios | Expansão 2 |
| Ilhas do Alto-Mar | Expansão | Fernando de Noronha e ilhas oceânicas | Alamoa, navio fantasma | Expansão 3 |
|  |  |  |  |  |

### Margem Leste: Wagadu

Wagadu é o nome lendário do antigo Império de Gana na tradição soninké: uma cidade que se perdeu quatro vezes e renasceu. O continente reúne inspirações do Sahel, da bacia do Congo, da África Austral, da costa suáli, do golfo da Guiné e do planalto etíope.

| Região | Níveis | Inspiração | Destaques | Fase |
| --- | --- | --- | --- | --- |
| Delta dos Bronzes | 1–10 (início Leste) | Golfo da Guiné, reinos de Benin e Ifé, mangues e deltas | Ipupiara nos estuários, Cumacanga, Lobisomem; bronzes como relíquias | Lançamento |
| Savana Dourada | 10–20 (caminho Leste) | Sahel e Império do Mali: arquitetura de barro, bibliotecas, caravanas | Capital Tumbara, a Cidade dos Manuscritos; a Cuca; manuscritos e a kora como relíquias | Lançamento |
| Planalto de Pedra | 20–30 (caminho Oeste) | Grande Zimbábue, rio Zambeze, cavernas de diamante | Capital Mabwe; Mãe-do-Ouro, Capelobo, Pisadeira; pássaros de pedra-sabão | Lançamento |
| Costa das Monções | 30–40 (caminho Oeste) | Costa suáli: Kilwa, Zanzibar, Lamu, cidades de pedra de coral, barcos dhow | Capital Kisiwa; Quibungo, Caboclo d'Água; portas entalhadas e dhows | Lançamento |

### Centro: o Mar de Kalunga

- **Porto de Kalunga (nível 20).** Cidade neutra numa ilha no meio do oceano, onde as duas campanhas se encontram. Tem o mercado global, os navios entre as Margens e a ponte para o Sertão.
- **Ilhas do Limiar (níveis 40 a 50).** Ilhas tomadas pelo Silêncio Cinzento, onde a campanha termina diante da entrada do Ventre de Prata, a primeira raide.
- **Sertão de Kalunga (nível 50).** Arquipélago de ilhas que emergiram quando o selo rachou. Terra sem lei, rica em Pérolas de Eco, dividida em territórios de guilda. É o equivalente às Outlands de Albion.

### Zonas de risco

| Zona | PvP | Perda ao morrer | Onde fica |
| --- | --- | --- | --- |
| Terras Mansas | Não (só duelos) | Nenhuma | Regiões de campanha 1–20 e cidades |
| Terras de Disputa | Entre facções (Confrarias) | Durabilidade e parte da bolsa de coleta | Regiões 20–40, rotas entre capitais |
| Terras Bravas | Aberto, com aviso | Todo o equipamento de guerra fica no chão | Bordas das regiões de nível 40+ |
| Sertão de Kalunga | Aberto, guerra de guildas | Todo o equipamento de guerra fica no chão | Arquipélago central |

## 5. Cidades, facções e personagens

Seis capitais, três em cada Margem, sediam as **Confrarias**: facções que os jogadores podem jurar para a guerra de facções nas Terras de Disputa, como as cidades reais de Albion. Cada capital dá bônus de refino a um tipo de material, o que obriga o comércio entre cidades.

| Capital | Margem | Inspiração | Confraria | Bônus de refino |
| --- | --- | --- | --- | --- |
| Palenque das Palmeiras | Oeste | Quilombo dos Palmares (Brasil) e San Basilio de Palenque (Colômbia) | Confraria dos Livres | Couro |
| Intipata | Oeste | Cidades incas, terraços e a rede de estradas andina | Ordem do Caminho do Sol | Tecido (lã de lhama e alpaca) |
| Atlixa | Oeste | Tenochtitlan, chinampas e cidades maias | Casa da Serpente Emplumada | Ervas e obsidiana |
| Tumbara | Leste | Tombuctu e Djenné: bibliotecas e arquitetura de barro | Conselho dos Griôs | Pergaminhos e ouro |
| Mabwe | Leste | Grande Zimbábue: muralhas de pedra sem argamassa | Clã da Pedra e do Ferro | Minério e pedra |
| Kisiwa | Leste | Cidades suális de pedra de coral | Liga das Monções | Madeira e navios |
| Porto de Kalunga | Centro | Portos atlânticos e caribenhos | Neutra | Mercado global, sem bônus |

### Personagens principais

| Personagem | Papel | Descrição |
| --- | --- | --- |
| Kwaku, o Velho Griô | Narrador e mentor | Contador de histórias que guia os Despertos. Guarda a Teia de Anansi, artefato akan que contém todas as histórias; na Temporada 3, a Teia revela seu poder. |
| Comandante Zuri Palmar | Líder da Confraria dos Livres | Estrategista de Palenque, neta de heróis da Grande Insurgência. Aliada principal da campanha Oeste. |
| Amauta Killa | Astrônoma de Intipata | Sábia que lê o céu e os quipus. Descobre que o selo do Pacto está inscrito nas estrelas. |
| Tlacuilo Itzel | Pintora de códices de Atlixa | Escriba que redesenha os mapas apagados pelo Silêncio; guia de Xibalbá. |
| Mansa Kéba | Soberano de Tumbara | Rei-erudito que guarda a maior biblioteca do mundo. Aliado principal da campanha Leste. |
| Capitã Nyokabi | Líder da Liga das Monções | Navegadora que conhece as correntes de Kalunga; leva os jogadores entre as Margens. |
| Mestre Tendé | Ferreiro de Mabwe | Ferreiro-feiticeiro de Mabwe, que forja as armas dos Despertos; Eco Companheiro Lutador. |
| O Rei Sem Rosto | Antagonista | Ser sem história que devora nomes; selado no Ventre de Prata. |
| Coronel Quebra-Nome | Vilão recorrente | Senhor de terras do Sertão a serviço do Rei; foge sempre até o confronto final da Temporada 1. |

Os nomes acima são fictícios e inspirados, não retratos de figuras históricas reais. Heróis históricos (Zumbi, Dandara, Nzinga, Sundiata, Túpac Amaru) podem aparecer apenas como lendas citadas no mundo, com revisão de consultores.

## 6. Enredo principal

A campanha single player tem um prólogo e cinco atos, cerca de 25 a 30 horas do nível 1 ao 50, e termina na missão final que abre o multiplayer. Cada temporada, de cerca de 3 meses (10 semanas de disputa de guildas e um intervalo), continua a história com um capítulo novo.

### Campanha de lançamento

| Ato | Níveis | Título | Resumo |
| --- | --- | --- | --- |
| Prólogo | 1 | O Naufrágio | O navio do jogador afunda numa tempestade cinzenta em Kalunga. No fundo do mar, vozes ancestrais o devolvem à vida como Desperto. Tutorial onírico, debaixo d'água. |
| Ato I | 1–10 | Ecos na Margem | Na Mata Viva ou no Delta dos Bronzes, o jogador aprende a ouvir Ecos e descobre manchas de Silêncio. Primeira masmorra. |
| Ato II | 10–20 | A Cor que Some | Bocas-de-Prata roubam nomes de vilas inteiras. O jogador conhece sua Confraria e chega ao Porto de Kalunga. |
| Ato III | 20–30 | A Outra Margem | Travessia com a Capitã Nyokabi. O jogador aprende a história da Era das Correntes e busca os Fios do Pacto nas duas Margens. Guardiões corrompidos são curados. |
| Ato IV | 30–40 | O Sertão Emerge | As ilhas emergem; Confrarias e mercenários disputam cada uma. Coronel Quebra-Nome tenta controlar as Pérolas de Eco. O plano do Rei aparece: devorar a memória de Kalunga e apagar o passado das duas Margens de uma vez. |
| Ato V | 40–50 | O Ventre de Prata | Nas Ilhas do Limiar, o jogador conduz a missão final, O Pacto das Duas Margens. Ao renovar o Pacto, desperta para o mundo compartilhado e vê pela primeira vez os outros Despertos. |

### O Despertar: da campanha solo ao mundo compartilhado

Até o nível 50, cada jogador vive a campanha no próprio mundo. Na história, o Pacto rompido isolou cada Desperto num eco separado da realidade; os outros Despertos são citados, mas não aparecem. A missão final termina com o Mar de Kalunga se acendendo com milhares de luzes, que são os outros jogadores. A partir daí, o mundo é compartilhado.

| Antes, na campanha solo (níveis 1 a 50) | Depois do Despertar |
| --- | --- |
| Masmorras Normais com Ecos Companheiros controlados por IA | Masmorras Heroicas e Mítica Ancestral com jogadores |
| Chefes de região da campanha, enfrentados sozinho | Chefes mundiais com até 40 jogadores |
| Sem raides | Raides, começando pelo Ventre de Prata |
| Vendedores NPC e fabrico para uso próprio | Mercado entre jogadores e Correio de Monção |
| A Confraria aparece só na história | Guerra de Confrarias, arenas e campos de batalha |
| Ilhas do Sertão só em missões de história | Sertão de Kalunga com guerra de guildas |
| Ecos Companheiros | Grupos, guildas, chat e amigos |

- O personagem, os itens e todo o progresso passam inteiros para o mundo compartilhado.
- Personagens alternativos refazem a campanha solo, subindo 50% mais rápido.
- Funcionalidades sociais (chat, voz, grupos) só aparecem depois do Despertar, o que simplifica o modo para menores exigido pelo ECA Digital durante a campanha.

### Lendas de classe

Cada classe tem uma linha de missões própria, em capítulos a cada 10 níveis, que recupera a história de um herói lendário da classe e termina com uma arma ancestral cosmética. Exemplo: o Oráculo reconstrói um alaúde que só canta depois de ouvir feitos verdadeiros, artefato inspirado na lenda soninké do alaúde de Gassire.

### Plano de temporadas e expansões

| Lançamento | Conteúdo narrativo | Novidade de jogo |
| --- | --- | --- |
| Temporada 1 | O Ventre de Prata: o confronto com o Rei Sem Rosto e Quebra-Nome | Primeira raide, primeira temporada de guildas |
| Temporada 2 | A Cidade Encantada: o Rei se esconde na cidade encantada sob a pedra de Jericoacoara, guardada pela princesa-serpente | Raide da Cidade Encantada, modo PvP Peteca de Guerra |
| Temporada 3 | O Reino da Cobra Norato: as serpentes gêmeas despertam no fundo do rio | Raide da Cobra Norato, o poder da Teia de Anansi |
| Expansão 1 (ano 2) | Pampas do Vento Sul e a Salamanca do Jarau | Nova classe, nível 60 |
| Expansão 2 (ano 2) | Pantanal e Cerrado | Nova região de guerra |
| Expansão 3 (ano 3) | Ilhas do Alto-Mar: a Alamoa e o navio fantasma | Guerra naval |

## 7. Bestiário folclórico

O bestiário é brasileiro, com peso maior para as lendas da Amazônia: 34 criaturas do folclore do Brasil, de raízes indígenas, africanas e ibéricas, fazem o papel de guardiões, assombrações e chefes. Os folclores de outros povos da América Latina e da África aparecem como artefatos, relíquias e acessórios, não como monstros. Toda criatura ganha design original; nenhuma copia representações modernas protegidas, como as de programas de TV.

### Criaturas do folclore brasileiro

| Criatura | Raiz | Na lenda | Papel no jogo |
| --- | --- | --- | --- |
| Curupira | Indígena (Amazônia e todo o país) | Protetor da mata, pés virados para trás, cabelos de fogo | Chefe corrompido no Coração da Mata Viva; depois aliado |
| Caipora | Indígena (tupi) | Protetora dos animais, montada num porco-do-mato | Aliada; guia de caça e coleta |
| Anhangá | Indígena (tupi) | Veado branco de olhos de fogo que protege a caça | Guardião aliado |
| Iara | Indígena (Amazônia) | Mulher das águas que encanta com o canto | Chefe de redenção da raide |
| Boto-cor-de-rosa | Indígena (Amazônia) | Golfinho que vira homem nas festas | NPC de evento (Festa do Boto) |
| Boitatá | Indígena (tupi) | Serpente de fogo que protege os campos | Chefe acorrentado da raide; montaria lendária |
| Mapinguari | Indígena (Amazônia) | Gigante peludo de um olho, boca na barriga | Chefe de masmorra |
| Matinta Perera | Indígena (Pará) | Velha que vira pássaro e assobia à noite | Elite e chefe de masmorra |
| Cobra Grande (Boiúna) | Indígena (Amazônia) | Serpente gigante dos rios | Chefe de região e chefe mundial |
| Cobra Norato e Maria Caninana | Indígena (Amazônia) | Gêmeos transformados em serpentes, um bom e uma má | Raide da Temporada 3 |
| Pirarucu | Indígena (Amazônia) | Guerreiro orgulhoso transformado no peixe gigante | Chefe de masmorra (Pirarucu Gigante) |
| Cumacanga | Amazônia (Pará) | Cabeça de mulher em chamas que voa à noite | Chefe de masmorra |
| Capelobo | Amazônia (Maranhão e Pará) | Criatura de focinho de anta que ataca à noite | Elite e chefe de masmorra |
| Uirapuru | Indígena (Amazônia) | Pássaro cujo canto traz sorte | Mascote raro e amuleto |
| Saci-Pererê | Indígena e africana | Menino de uma perna, gorro vermelho, redemoinho | Mascote do jogo; bandos corrompidos com redemoinhos |
| Quibungo | Africana (banta), Bahia | Ogro de boca nas costas | Elite e chefe de masmorra |
| Mula-sem-cabeça | Ibérica | Mula com fogo no lugar da cabeça | Elite e chefe de masmorra |
| Lobisomem | Ibérica | Homem que vira lobo nas noites de lua | Elite noturna e chefe de masmorra |
| Cuca | Ibérica | Bruxa que leva quem não dorme | Chefe de masmorra, com design próprio |
| Corpo-Seco | Brasileira (Sudeste) | Morto que a terra rejeitou | Inimigo comum e chefe de masmorra |
| Pisadeira | Brasileira (Sudeste) | Velha que pisa no peito de quem dorme de barriga cheia | Elite que paralisa e chefe de masmorra |
| Mãe-do-Ouro | Brasileira (regiões de mineração) | Bola de fogo que guarda o ouro | Chefe de região e chefe mundial |
| Minhocão | Brasileira (Centro-Oeste) | Verme gigante que derruba barrancos de rio | Chefe de região e mundial; versão cinzenta em masmorra |
| Cabeça de Cuia | Brasileira (Piauí) | Pescador amaldiçoado que assombra o rio Parnaíba | Chefe de masmorra |
| Caboclo d'Água | Brasileira (rio São Francisco) | Ser do rio que vira barcos; as carrancas o espantam | Inimigo aquático e chefe de masmorra |
| Ipupiara | Brasileira (crônicas coloniais) | Monstro marinho do litoral | Chefe de região e chefe mundial |
| Bicho de Sete Cabeças | Expressão popular brasileira | O monstro de que todo mundo fala | Chefe da raide, guardião do cofre |
| Papa-Figo | Brasileira (Nordeste) | Figura rica que vive da vida dos pobres | Servos do Silêncio |
| A Mulher de Branco | Brasileira (lenda urbana) | Fantasma de mulher que chora à beira da água | Masmorra de redenção |
| Bradador | Brasileira (Sul e Sudeste) | Alma que grita nas serras | Elite com mecânica de som |
| Princesa-serpente de Jericoacoara | Brasileira (Ceará) | Princesa encantada em serpente de escamas de ouro | Raide da Temporada 2 |
| Pé-de-Garrafa | Brasileira (Centro-Oeste) | Ser da mata que deixa pegadas em forma de garrafa | Expansão Pantanal e Cerrado |
| Teiniaguá | Brasileira (Rio Grande do Sul) | Princesa encantada em lagartixa, da Salamanca do Jarau | Expansão Pampas do Vento Sul |
| Alamoa | Brasileira (Fernando de Noronha) | Mulher-luz que atrai os navegantes | Expansão Ilhas do Alto-Mar |

### Lendas amazônicas em plantas, comidas e amuletos

| Lenda | Como aparece no jogo |
| --- | --- |
| Muiraquitã | Amuleto de sapo em pedra verde, relíquia de sorte e proteção |
| Vitória-régia (Naiá) | Flor rara de coleta e marco das lagoas da Mata Viva |
| Guaraná | Fruto de coleta e bebida de fôlego |
| Açaí (Iaçá) | Fruto de coleta e comida de cura |
| Mandioca (Mani) | Ingrediente-base da culinária da Margem Oeste |

### Outros folclores: artefatos, relíquias e acessórios

| Povo | Figura ou tradição | Como aparece no jogo |
| --- | --- | --- |
| Akan (Gana) | Anansi, a aranha dona das histórias | Teia de Anansi, artefato guardado por Kwaku; fios de teia que o Oráculo usa para curar |
| Akan (Gana) | Símbolos adinkra | Amuletos e ícones de habilidade; Sankofa como emblema do Pacto |
| Bakongo | Kalunga, a grande água entre vivos e ancestrais | O Mar de Kalunga |
| Mandê e soninquê (Mali) | Griôs, kora, alaúde de Gassire, Wagadu | Kwaku e os griôs de Tumbara, a kora, o alaúde da lenda do Oráculo e o nome do continente |
| Benin e Ifé | Arte em bronze | Cabeças e placas de bronze como relíquias |
| Grande Zimbábue | Pássaros de pedra-sabão | Relíquia e marco de Mabwe |
| Gâmbia e Senegal | Ninki Nanka | Escama de Ninki Nanka, relíquia de armadura |
| Xhosa e zulu | Impundulu, o pássaro do relâmpago | Pena de Impundulu, amuleto de raio |
| Andes | Quipus e a serpente Amaru | Quipu como objeto de memória; Escama de Amaru como relíquia |
| Mesoamérica | Nahualismo, códices, jade e obsidiana | Adornos de jade e obsidiana, códices como objetos de memória |
| Maia (Iucatã) | Alux, pequenos guardiões | Estatueta de Alux para a casa do jogador |

## 8. Diretrizes de representação cultural

O jogo só cumpre sua promessa se as culturas que o inspiram se reconhecerem nele com orgulho; por isso a consultoria cultural é paga, creditada e tem poder de veto nos pontos abaixo.

### Regras

1. **Religiões vivas não viram inimigo, saque nem item de loja.** Orixás (candomblé, umbanda, religião iorubá, santería), lwa do vodu haitiano, Pachamama, Ekeko, Mami Wata, máscaras egúngun e objetos sagrados como os minkisi do Congo ficam fora do combate. Onde a história pedir forças divinas, usamos os Guardiões originais do jogo.
2. **Corrompido não é mau.** Guardiões da natureza enfrentados em combate estão doentes de Silêncio e terminam curados e aliados.
3. **Nada de caricatura.** Personagens negros e indígenas são reis, sábios, cientistas, comerciantes e vilões complexos, nunca "selvagens", "místicos mágicos" a serviço do herói ou cenário. O Saci, cuja representação tem histórico racista, recebe design revisado por consultores afro-brasileiros.
4. **Sem raças de fantasia mapeadas em povos reais.** O jogo não tem "raças" jogáveis; qualquer aparência pode ter qualquer classe (ver seção 9).
5. **Escravidão e colonização só como alegoria cuidada.** O jogador nunca acorrenta, compra ou vende pessoas. Não há salvador branco: a libertação é obra dos povos das duas Margens. Textos da Era das Correntes passam por historiadores.
6. **Línguas reais escritas corretamente.** Termos em iorubá, quéchua, náuatle, guarani, quicongo e suáli levam grafia e acentos corretos e são gravados por falantes nativos.
7. **Padrões e tecidos com origem.** Kente, bogolan, aguayo, molas e pinturas ndebele têm significados. Usamos padrões inspirados ou licenciados com as comunidades, com crédito.
8. **Folclore é domínio público; designs modernos não.** Criamos visuais próprios para todas as criaturas.

### Consultoria

| Grupo cultural | Escopo da revisão |
| --- | --- |
| Afro-brasileiro | Quilombos, capoeira, Saci, Nordeste, vocabulário |
| África Ocidental (akan, iorubá, mandê) | Anansi, griôs, Wagadu, Delta dos Bronzes |
| África Central e Austral (bantos) | Kalunga, Mabwe, Congo, criaturas zulus e xhosas |
| África Oriental (suáli) | Costa das Monções |
| Andino (quéchua e aimará) | Intipata, Amaru, Pishtacos, tecidos |
| Mesoamericano (nahua e maia) | Atlixa, Xibalbá, Nahual |
| Indígena amazônico e guarani | Mata Viva, Curupira, Iara, mitos guarani |

Os consultores revisam em quatro momentos: arte conceitual, roteiro, dublagem e itens de loja. Uma parte da receita da linha de trajes tradicionais vai para instituições de preservação cultural parceiras (programa **Raízes**).

## 9. Personagem e classes

O lançamento tem 4 classes, uma para cada vaga do grupo: 1 tanque, 2 de dano e 1 de cura. Não há especializações: cada classe tem 6 habilidades, uma suprema e uma mecânica própria, e a variedade vem dos talentos da Árvore do Baobá e das Relíquias. A **Arma Ancestral** de cada classe evolui na lenda de classe e muda só a aparência.

### Criação de personagem

- **Sem raças de fantasia.** Todos são humanos das Duas Margens; a escolha é de aparência e de Margem de origem (que define a região inicial), nunca de atributos.
- **Pele.** Escala ampla de tons, com iluminação testada em peles escuras para não "lavar" nem acinzentar.
- **Cabelo.** Texturas crespas e cacheadas de verdade (tipos 3 e 4), black power, tranças nagô, box braids, locs, bantu knots, cabelos lisos indígenas, lenços e turbantes (gele, torso).
- **Corpo.** Tipos físicos variados, pinturas corporais inspiradas e marcas opcionais revisadas por consultores.
- **Voz.** Quatro timbres por idioma, sem trava de gênero nas classes.

### Classes

| Classe | Papel | Inspiração | Arma e estilo | Mecânica própria |
| --- | --- | --- | --- | --- |
| Guardião | Tanque | Guerreiros quilombolas e os escudos de couro dos povos bantos | Escudo oval longo e lança curta; segura o chefe e protege o grupo | **Firmeza:** bloquear golpes acumula Firmeza, gasta em escudos para os aliados |
| Lutador | Dano corpo a corpo | Capoeira e maculelê; a mandinga é a malícia de quem engana o adversário na ginga | Golpes de capoeira e bastões de maculelê; esquiva e contra-ataque | **Ritmo do berimbau:** golpes dados no pulso causam 20% a mais de dano |
| Caçador | Dano à distância | Mateiros e caçadores da Amazônia, guias que leem os sinais da mata | Arco longo, zarabatana e armadilhas de mola | **Rastro:** marca um alvo e ganha dano enquanto mantém a marca |
| Oráculo | Cura | Benzedeiras, rezadeiras e raizeiras do Brasil e os griôs guardiões da memória | Cajado de raiz com cabaças, ervas e fios de luz | **Fios do Eco:** liga aliados por fios de luz que curam ao longo do tempo e permitem pré-curar antes de um golpe anunciado |

O Oráculo é inspirado na cultura das curandeiras populares, sem rezas, símbolos ou gestos religiosos, como manda a seção 8.

### Kit completo de exemplo: Lutador

O Lutador joga no ritmo do berimbau: um pulso aparece no HUD a cada 1,5 s, e golpes dados "no toque" ganham 20% de dano. A janela de acerto é de 300 ms, e o modo assistido (acessibilidade) dá metade do bônus sem exigir ritmo.

| Botão | Golpe | Efeito |
| --- | --- | --- |
| 1 | Martelo | Chute rápido; gera 1 Ginga |
| 2 | Meia-lua de compasso | Chute giratório em área; gasta 2 Ginga |
| 3 | Armada | Giro que avança e empurra os alvos |
| 4 | Rasteira | Derruba o alvo por 1,5 s |
| 5 | Bênção | Chute frontal que quebra escudos |
| 6 | Martelo do chão | Finalizador: gasta toda a Ginga |
| Esquiva | Aú | Estrela lateral, invulnerável por 0,4 s |
| Suprema | Roda de Fogo | Abre uma roda no chão: aliados dentro ganham velocidade de ataque por 10 s |

Os kits completos do Guardião, do Caçador e do Oráculo seguem o mesmo formato: 6 habilidades, uma suprema e a mecânica própria da tabela acima (aba Pendências).

### Talentos e Relíquias

- **Árvore do Baobá.** A cada 5 níveis, do 10 ao 50, o jogador escolhe 1 de 3 talentos por classe (9 escolhas). Configurações salvas e troca livre fora de combate.
- **Relíquias.** Três espaços (cabeça, peito, pés). Cada peça de equipamento traz uma habilidade: o peito dá uma ativa, cabeça e pés dão passivas ou utilitários, como em Albion. Isso gera variedade de builds sem inflar a barra de habilidades no celular.

## 10. Combate e controles

O combate é tab-target híbrido: habilidades precisam de alvo, mas posicionamento, esquiva e áreas telegrafadas decidem a luta. Essa escolha garante paridade entre mouse e toque, essencial para PvP justo entre PC e celular.

### Regras de combate

- **Barra fixa e enxuta.** 6 habilidades da arma, 1 suprema, 1 esquiva e 1 ativa de Relíquia: 9 botões no total, iguais nas duas plataformas.
- **Tempo global de recarga** de 1,0 s; habilidades de movimento fora do tempo global.
- **Mira suave.** O alvo trava ao atacar; áreas podem ser arrastadas no celular ou apontadas com o mouse no PC.
- **Telegráfico legível.** Cores fixas para perigo (vermelho), segurança (azul) e mecânica de grupo (amarelo), com modos para daltônicos.
- **Sem addons.** Medidor de dano, linha do tempo de chefes e diário de encontros vêm no jogo (o **Diário do Griô**), para que nenhum jogador precise de ferramentas externas.

### Controles

| Ação | PC | Mobile |
| --- | --- | --- |
| Mover | WASD + mouse | Joystick virtual (esquerda) |
| Habilidades | Teclas 1–6 configuráveis | Arco de 6 botões (direita) |
| Suprema | R | Botão grande acima do arco |
| Esquiva | Espaço ou Shift + direção | Deslizar o polegar no botão de esquiva |
| Trocar alvo | Tab ou clique | Toque no inimigo ou botão de ciclo |
| Câmera | Livre com o mouse | Arrastar com o polegar direito; enquadramento automático opcional |
| Comunicação | Chat e voz | Rodas de comandos rápidos ("Puxar", "Recuar", "Cura!") e chat |
| Controle | Suporte a gamepad no PC e no celular | Suporte a gamepad |

A especificação completa de câmera, tamanho do personagem e métricas de mundo está na aba Câmera e escala.

### Justiça entre plataformas

- Todo o PvE mistura PC e celular sem restrição.
- Arenas ranqueadas têm fila mista por padrão e fila "só toque" opcional.
- Nenhuma habilidade depende de mira de precisão (skill shot pequeno), que favoreceria o mouse.
- A telemetria compara taxa de vitória por plataforma a cada semana; desvios acima de 3 pontos percentuais disparam revisão de balanceamento.

### Rede

Servidor autoritativo, com predição de movimento no cliente. Alvo de 20 atualizações por segundo no mundo aberto e 30 em masmorras, raides e arenas, com tolerância a 150 ms de latência para redes móveis.

## 11. Progressão, itens e profissões

O jogo tem duas trilhas de equipamento que nunca se misturam: o **Equipamento de Linhagem**, do PvE, que nunca se perde, e o **Equipamento de Guerra**, fabricado por jogadores, que se perde ao morrer nas zonas de saque total. É assim que masmorras à la WoW e guerras à la Albion convivem no mesmo jogo.

### Progressão do personagem

| Etapa | Como sobe | Observação |
| --- | --- | --- |
| Nível 1–50 | Campanha, masmorras, eventos de região | 25 a 30 h; personagens alternativos sobem 50% mais rápido |
| Nível de Eco | Equipamento de Linhagem melhorado com Fios de Memória | Equivale ao item level; trava o acesso a dificuldades |
| Renome | Pontos de conta inteira por conquistas e temporadas | Destrava cosméticos e conveniências para todos os personagens |
| Maestria de Ofício | Uso de profissões e armas de guerra | Árvore estilo "destiny board" de Albion; separada por personagem |

### As duas trilhas de equipamento

|  | Equipamento de Linhagem (PvE) | Equipamento de Guerra (PvP e Sertão) |
| --- | --- | --- |
| Origem | Masmorras, raides, missões | Fabricado por jogadores com materiais coletados |
| Comercializável | Não (preso à conta) | Sim, no mercado |
| Perda ao morrer | Nunca | Total nas Terras Bravas e no Sertão |
| Escala de poder | Nível de Eco | Tiers T4 a T8 e lapidações .0 a .3 |
| Onde vale | Terras Mansas, masmorras, raides, arenas | Terras de Disputa, Terras Bravas, Sertão, campos de batalha |

Ao entrar numa zona de guerra, o jogo troca automaticamente para o conjunto de guerra salvo. A ponte entre as trilhas são os **Artefatos**: peças raras que caem em masmorras míticas e raides e só viram equipamento pelas mãos de um artesão. Assim os raiders abastecem o mercado e os guerreiros dependem dos raiders.

### Raridades do Equipamento de Linhagem

Comum, Raro, Épico, Ancestral (raide) e Mítico (raide mítica). Saque pessoal para todos, moeda de raide para comprar a peça desejada após 4 semanas e proteção contra azar, porque depender só da sorte afasta quem tem pouco tempo para jogar.

### Profissões

| Etapa | Profissões | Exemplos de materiais e produtos |
| --- | --- | --- |
| Coleta | Mineração, Lenhadoria, Colheita, Caça, Pesca, Garimpo de Eco (só no Sertão) | Ferro, cobre, obsidiana, ouro; mogno e ébano; algodão, sisal, cacau, ervas; couros; peixes; Pérolas de Eco |
| Refino | Fundição, Serraria, Tecelagem, Curtume, Alquimia | Barras, tábuas, tecidos (estilo kente e aguayo), couro curtido, tinturas e unguentos |
| Fabrico | Ferraria, Marcenaria, Alfaiataria, Couraria, Joalheria, Culinária | Armas e armaduras, arcos e escudos, roupas, contas e amuletos, comidas |

A Culinária dá reforços temporários e celebra as cozinhas das duas Margens: moqueca, feijoada, tamales, arepas, ceviche, jollof, injera com wat, bobotie. As montarias de guerra (lhamas, cavalos crioulos, camelos, zebras de carga) também são fabricadas e podem ser perdidas no Sertão.

### Moradia

Cada jogador tem uma casa instanciada no Porto de Kalunga, e cada guilda pode erguer um Quilombo no Sertão (seção 13).

## 12. PvE: masmorras e raides

O lançamento tem 8 masmorras de 5 jogadores e 1 raide de 8 chefes; cada temporada seguinte traz 1 raide nova e 2 masmorras. Masmorras duram 20 a 30 minutos, um tamanho que cabe numa sessão de celular.

### Ecos Companheiros (masmorras na campanha solo)

Na campanha solo, o jogador completa o grupo de 5 com Ecos Companheiros: personagens da história que lutam ao lado dele, controlados por IA. As masmorras Normais usam os mesmos tempos da aba Encontros; Heroica, Mítica Ancestral, raides e chefes mundiais só abrem depois do Despertar.

| Eco Companheiro | Papel | Classe | Margem |
| --- | --- | --- | --- |
| Kwaku, o Velho Griô | Cura | Oráculo | As duas |
| Comandante Zuri Palmar | Tanque | Guardiã | Oeste |
| Jaci, a Caçadora | Dano à distância | Caçadora | Oeste |
| Mestre Bento | Dano corpo a corpo | Lutador | Oeste |
| Amauta Killa | Dano à distância | Caçadora, com boleadeiras | Oeste |
| Capitã Nyokabi | Tanque | Guardiã | Leste |
| Mestre Tendé | Dano corpo a corpo | Lutador | Leste |
| Ama | Dano corpo a corpo | Lutadora | Leste |
| Mestra Ayo | Dano à distância | Caçadora | Leste |

- Cada Margem tem um tanque, uma cura e três de dano desde a primeira masmorra; a partir do Ato III, os Ecos das duas Margens podem ser combinados.
- O jogador escolhe 4 Ecos que completam o papel que falta no grupo.
- Dois níveis de comportamento: **Tutor** (acertam todas as mecânicas e avisam por voz o que fazer) e **Parceiro** (erram de vez em quando, como um jogador médio).
- Ordens simples pela roda de comandos: Puxar, Esperar, Focar alvo, Recuar.
- Sobem de nível com a história e têm diálogos próprios em cada masmorra, escritos no Yarn Spinner e revisados pelos consultores.
- Depois do Despertar, continuam disponíveis para masmorras Normais feitas sozinho.

### Formatos e dificuldades

| Conteúdo | Jogadores | Composição | Dificuldades |
| --- | --- | --- | --- |
| Masmorra | 5 | 1 tanque, 1 cura, 3 dano | Normal (nivelamento), Heroica (nível 50), Mítica Ancestral |
| Raide | 10 | 2 tanques, 2–3 curas, 5–6 dano | Narrativa (fila automática), Normal, Heroica |
| Raide Mítica | 20 fixos | 2–3 tanques, 4–5 curas, resto dano | Mítica (corrida mundial por temporada) |
| Chefe mundial | até 40 | Livre | Única, semanal |

**Mítica Ancestral** é a versão infinita das masmorras, no estilo Mítica+ do WoW: níveis crescentes com tempo limite, Marcas do Silêncio (afixos) que mudam toda semana e ranking por temporada.

### Masmorras de lançamento

| Masmorra | Região | Chefes | Mecânica-assinatura |
| --- | --- | --- | --- |
| O Coração da Mata Viva | Mata Viva | Matinta Perera, Mapinguari, Curupira Corrompido | Pegadas invertidas: seguir o rastro leva ao lado errado |
| O Arraial do Corpo-Seco | Sertão Velho | Mula-sem-cabeça, Corpo-Seco, Coronel Quebra-Nome (foge) | Fogo que se espalha pela caatinga seca |
| As Minas do Ventre | Altiplano do Sol | Capataz de Prata, Papa-Figo Contador, Minhocão Cinzento | Carrinhos de minério como cobertura e arma |
| A Cidade Submersa | Lagos Flutuantes | Cabeça de Cuia, Pirarucu Gigante, A Mulher de Branco | Nível da água sobe; a última luta é de redenção, não de morte |
| A Biblioteca Queimada | Savana Dourada | Escriba Sem Voz, Cuca, Guardião dos Manuscritos | Proteger páginas: a Cuca rouba a memória de quem se descuida |
| O Mangue dos Bronzes | Delta dos Bronzes | Cumacanga, Lobisomem, Escultor de Prata | Luz e escuridão: a cabeça em chamas da Cumacanga ilumina e queima |
| As Cavernas de Diamante | Planalto de Pedra | Capelobo, Pisadeira, Supervisor dos Veios | A Pisadeira paralisa quem fica parado; desabamentos mudam o terreno |
| O Naufrágio da Monção | Costa das Monções | Quibungo, Caboclo d'Água, Capitão Afogado | Navio inclinando: o chão muda de ângulo |

### Raide da Temporada 1: O Ventre de Prata

| # | Chefe | Mecânica-chave |
| --- | --- | --- |
| 1 | Os Capatazes Gêmeos | Precisam morrer juntos; acorrentam jogadores que ficam longe do grupo |
| 2 | A Fornalha dos Nomes | Jogadores carregam nomes roubados até os altares antes que derretam |
| 3 | Iara Silenciada | Zonas de eco: quem canta de volta (fica nas zonas) reduz o encantamento e cura a Iara |
| 4 | Boitatá Acorrentado | Quebrar correntes enquanto ele queima a arena; na fase final ele luta ao lado da raide |
| 5 | O Conselho dos Papa-Figos | Três chefes que roubam vida do alvo mais forte |
| 6 | O Bicho de Sete Cabeças, Guardião do Cofre | Sete cabeças; diamantes refletem raios que precisam ser direcionados |
| 7 | O Cofre dos Mil Nomes | Devolver relíquias roubadas ao pedestal da cultura certa; cada acerto enfraquece o cofre |
| 8 | O Rei Sem Rosto | Copia as habilidades dos jogadores e, na fase final, "apaga" os ícones da barra por 8 s (o modo acessibilidade mantém ícones e mostra contornos) |

O chefe 7 é o coração temático do jogo: devolver memórias roubadas, uma alegoria do debate sobre repatriação de artefatos africanos e latino-americanos.

Todo chefe tem um desafio mecânico com tempos exatos de aviso, desvio e resposta, como no WoW e em Tarisland. Os roteiros completos estão na aba Encontros.

### Raides seguintes

- **Temporada 2, A Cidade Encantada de Jericoacoara.** Baseada na lenda cearense da cidade encantada sob a pedra junto ao mar: cada chefe guarda uma ala da cidade, e a princesa-serpente de escamas de ouro fecha a raide.
- **Temporada 3, O Reino da Cobra Norato.** Baseada na lenda amazônica das serpentes gêmeas: Maria Caninana, corrompida pelo Silêncio, e Honorato, que luta para se libertar. Os chefes guardam o fundo do rio, e a luta final é contra Maria Caninana, com Honorato como aliado.

### Escala colossal dos chefes

Os grandes chefes são colossos: um chefe de raide tem de 25 a 60 m de altura e um chefe mundial passa de 80 m, para que a dificuldade se veja antes do primeiro golpe. Diante deles, o jogador é pequeno, e é o grupo que torna a vitória possível.

&#91;embedded content: escala dos chefes · altura-alvo por categoria, em metros\]

| Categoria | Como a luta funciona | Exemplos |
| --- | --- | --- |
| Elite | Alvo único, golpes lentos e pesados | Mula-sem-cabeça, Lobisomem, Capelobo |
| Chefe de masmorra | Arena fechada, câmera mais aberta, uma ou duas partes alvejáveis | Mapinguari, Quibungo, Pirarucu Gigante |
| Colosso de raide | Corpo dividido em partes com vida própria; a arena é moldada pelo corpo do chefe | Boitatá Acorrentado, Bicho de Sete Cabeças, Iara Silenciada, Fornalha dos Nomes, princesa-serpente de Jericoacoara, Cobra Norato |
| Titã mundial | Visível de longe no mapa; a luta acontece sobre o corpo e em várias frentes ao mesmo tempo | Cobra Grande, Mãe-do-Ouro, Ipupiara, Minhocão |

O Rei Sem Rosto começa do tamanho de um homem e, na fase final, cresce até virar um colosso feito das máscaras e rostos que roubou: o momento em que a raide descobre o tamanho real da ameaça.

**Regras para lutas colossais**

1. **Partes, não um bloco.** Cabeça, garras, cauda e núcleo têm vida, efeitos e alvo próprios. Tanques seguram a cabeça, o dano ataca pontos fracos, e quebrar uma parte muda a luta, como as correntes do Boitatá. No celular, o toque escolhe a parte mais próxima do centro da tela.
2. **Câmera de colosso.** No encontro, a câmera se afasta e abre o campo de visão para enquadrar o jogador e a cabeça do chefe. O corpo do chefe fica translúcido quando passa na frente da câmera.
3. **Telegráficos em escala.** Golpes de colosso têm preparação de 1,5 a 3 s, sombra do membro no chão e áreas grandes. Ataques fora da tela aparecem como setas na borda.
4. **Peso no movimento.** Colossos se movem devagar e não giram de uma vez; o ritmo rápido vem dos lacaios e das mecânicas de grupo.
5. **Arena feita pelo corpo.** Os anéis do Boitatá viram paredes de fogo, o dorso da Cobra Grande vira plataforma, a Mãe-do-Ouro incendeia o chão em círculos antes de cada salto.
6. **Sensação de tamanho.** Referências de escala no cenário (árvores, ruínas), silhueta visível no horizonte antes do encontro, poeira e onda de choque a cada passo, graves profundos no áudio, tremor de tela e entrada com cinemática curta no próprio motor.
7. **Orçamento técnico.** O colosso é o asset principal do encontro: LOD dedicado e animação na GPU. No celular, partículas e efeitos de outros jogadores são cortados primeiro; a silhueta do colosso nunca é reduzida.
8. **Acessibilidade.** Modo para fotossensibilidade, tremor de tela desligável e equivalente visual para toda pista sonora.

### Calendário semanal

| Dia | Destaque |
| --- | --- |
| Terça | Reset semanal: novas Marcas do Silêncio, travas de raide liberadas |
| Quarta e quinta | Chefes mundiais (rotação entre regiões) |
| Sexta | Corrida de Mítica Ancestral com ranking regional |
| Sábado e domingo | Cercos territoriais no Sertão (seção 13) |
| Todo dia | Missões diárias de Confraria, eventos de região, fila de masmorras |

O localizador de grupo é nativo e entre plataformas, com checagem de papel e tempo de espera visível.

## 13. PvP e guerras territoriais

A guerra de guildas acontece no Sertão de Kalunga, em temporadas de 10 semanas: guildas tomam territórios, erguem Quilombos, cercam Fortalezas de Pedra e pontuam no ranking. O desenho segue Albion (saque total, economia de jogadores, temporadas), com limites explícitos contra megaguildas e batalhas que cabem numa tela de celular.

**Quando abre:** todo o PvP, inclusive as Terras de Disputa, as Terras Bravas e o Sertão de Kalunga, só começa depois do Despertar. Na campanha solo, essas zonas existem apenas como cenário de história, sem outros jogadores.

### Estruturas do Sertão

| Estrutura | O que é | Como se conquista | O que dá |
| --- | --- | --- | --- |
| Território (Baobá) | Região do mapa marcada por um baobá ancestral | Batalha pelo Baobá, com teto por lado (5v5, 10v10 ou 20v20 conforme o tier da região) | Imposto sobre coleta, recursos raros, pontos de temporada |
| Quilombo | Base escondida da guilda: banco, oficinas, ponto de renascimento | Construído pela guilda; fica oculto no mapa até ser descoberto por batedores | Bônus de fabrico, abrigo, logística |
| Forte Avançado | Objetivo médio para guildas de 30 a 80 membros | Cerco com janela de vulnerabilidade | Prêmio semanal de materiais |
| Fortaleza de Pedra | Grande castelo inspirado no Grande Zimbábue | Cerco com declaração 24 h antes e janela regional | Baú de temporada, controle do porto da ilha, bônus da aliança |

### Fluxo de um cerco

1. A guilda atacante planta um **Estandarte de Cerco** dentro da janela de vulnerabilidade do alvo.
2. O defensor recebe alerta no jogo e no celular e tem 20 minutos para reunir defesa.
3. Atacantes derrubam muralhas e portões; defensores usam guardas, torres e Tambores de Guerra (reforço em área).
4. A batalha final acontece no pátio, com teto de participantes por lado.
5. Quem controlar o núcleo ao fim do tempo leva a estrutura. Equipamento de guerra dos mortos fica no chão.

Muralhas, portões e guardas são aprimoráveis, como nas fortificações da atualização Foundations de Albion ([MMOs.com](https://mmos.com/news/albion-onlines-foundations-update-now-live)).

### Contra o domínio das megaguildas

- **Teto de aliança:** no máximo 3 guildas e 300 membros por aliança.
- **Custo crescente:** o custo de manutenção de cada território extra cresce de forma progressiva.
- **Teto por batalha:** objetivos têm vagas fixas por lado; excedentes vão para frentes paralelas.
- **Fôlego do Oprimido:** guildas fora do top 20 ganham bônus de coleta em territórios vizinhos aos da guilda líder (o tema de resistência vira mecânica).
- **Janelas por fuso:** cada ilha tem uma janela de vulnerabilidade diferente (Américas, Europa e África, Ásia), para que nenhuma guilda defenda tudo.
- **Desafios de guilda com PvE:** masmorras, raides e coleta também pontuam, como no Conqueror's Challenge de Albion, para que guildas menores tenham caminho à vitória.

### Escala no celular

| Situação | Teto no lançamento | Como o celular aguenta |
| --- | --- | --- |
| Batalha pelo Baobá | 20 contra 20 | Efeitos visuais simplificados para aliados |
| Cerco de Fortaleza | 50 contra 50 por frente | "Modo Batalha": personagens distantes viram silhuetas, efeitos inimigos priorizados |
| Mundo aberto | Sem teto lógico | Renderização limitada aos 60 jogadores mais próximos |

Os tetos sobem por temporada conforme a telemetria de desempenho.

### Outros modos de PvP

| Modo | Formato | Recompensa |
| --- | --- | --- |
| Arena ranqueada | 3 contra 3, Equipamento de Linhagem normalizado | Títulos e cosméticos de temporada |
| Roda de Guerra (campo de batalha) | 10 contra 10, captura de estandartes em ruínas | Honra de Confraria |
| Peteca de Guerra (Temporada 2) | 5 contra 5, inspirado na peteca indígena: manter a peteca no ar e derrubá-la no campo adversário | Cosméticos da Cidade Encantada |
| Guerra de Confrarias | Aberta nas Terras de Disputa; capturar postos e escoltar Fios até a capital | A Confraria vencedora dá bônus de refino à sua cidade por uma semana |

## 14. Economia

A economia é feita por jogadores: quase todo equipamento de guerra é fabricado, vendido e destruído por eles, e a destruição no Sertão é o principal sumidouro que mantém os preços saudáveis, como em Albion.

**Na campanha solo,** a economia é entre o jogador e NPCs: vendedores com preços fixos, fabrico para uso próprio e nenhuma perda de equipamento. O mercado entre jogadores, os impostos e a destruição de equipamento no Sertão começam no Despertar; os materiais guardados na campanha passam inteiros.

### Moedas

| Moeda | Como se obtém | Uso | Trocável |
| --- | --- | --- | --- |
| Cáuris (búzios) | Saque, missões, vendas no mercado | Moeda principal: mercado, reparos, taxas | Sim |
| Fios de Memória | Masmorras e raides | Melhorar Equipamento de Linhagem | Não |
| Honra de Confraria | Guerra de facções, campos de batalha | Itens e montarias da Confraria | Não |
| Selos de Temporada | Atividades de guilda | Recompensas de fim de temporada | Não |
| Ouro de Kalunga | Compra com dinheiro real | Cosméticos, passe, assinatura | Não (ver seção 15) |

Búzios (cáuris) circularam como moeda real em rotas comerciais da África e do oceano Índico, o que dá à moeda principal uma raiz histórica.

### Mercados

- **Mercados locais** em cada capital, com preços próprios. A diferença de preço entre cidades cria a profissão de caravaneiro: transportar carga por rotas perigosas para lucrar.
- **Mercado global** no Porto de Kalunga, com taxa maior.
- **Correio de Monção:** envio instantâneo entre cidades, caro, para quem não quer arriscar a rota.

### Fontes e sumidouros

| Fontes (entram Cáuris e itens) | Sumidouros (saem Cáuris e itens) |
| --- | --- |
| Saque de criaturas | Destruição de equipamento no Sertão e nas Terras Bravas |
| Recompensas de missão (limitadas por dia) | Reparos e durabilidade |
| Venda de sucata a NPCs (limitada) | Taxas de mercado (anúncio e venda) |
| Baús de temporada | Taxas de fabrico das cidades e dos donos de território |
|  | Manutenção de territórios e Quilombos |
|  | Perda de montarias de guerra |

### Controles

- Painel de economia com índice de preços semanal de 30 itens-chave.
- Meta: inflação do índice abaixo de 5% por temporada.
- Detecção de bots por comportamento (rotas repetidas, tempos de reação) e combate a comércio de moeda por dinheiro real fora do jogo.
- Economista de jogo na equipe a partir do alfa.

## 15. Monetização e aspectos legais

Baobá vende aparência e conveniência, nunca poder, e não tem nenhuma caixa de recompensa paga. Além de ser a promessa central do jogo, isso é exigência legal no Brasil: o ECA Digital (Lei 15.211/2025), em vigor desde 17 de março de 2026, proíbe loot boxes em jogos direcionados ou de provável acesso por menores ([Confidata](https://confidata.com.br/blog/eca-digital-o-que-muda-empresas)).

### Carta do Jogo Justo (pública)

Nunca serão vendidos: atributos, equipamentos, Artefatos, materiais, moeda do jogo (Cáuris), bônus de dano ou de coleta, atalhos de raide e caixas com resultado aleatório.

### O que vendemos

| Produto | Conteúdo | Preço de referência (BR) |
| --- | --- | --- |
| Loja de aparências | Trajes (agbada, boubou, huipil, poncho, capulana), efeitos de arma, montarias cosméticas, emotes de dança (frevo, samba de roda, cumbia, kizomba, azonto) | R$ 10 a R$ 80 por item |
| Cordel da Temporada (passe) | Trilha grátis e trilha premium, com cosméticos e títulos; 10 semanas | R$ 30 a R$ 40 |
| Assinatura Patrono | Conveniências: fila extra de fabrico, banco maior, teleporte mais barato, um cosmético mensal | R$ 25 a R$ 35 por mês |
| Expansões | Conteúdo gratuito; pacotes cosméticos opcionais | R$ 60 a R$ 150 por pacote |

Preços são hipóteses para teste A/B, ajustados por poder de compra em cada país.

**Decisão em aberto: Selo de Patrono trocável.** Um item de assinatura vendável por Cáuris no jogo (modelo do WoW Token) traz receita e combate o comércio ilegal de moeda, mas converte dinheiro em Cáuris de forma indireta. Recomendação: lançar sem ele e decidir na Temporada 2 com consulta à comunidade.

### Pagamentos regionais

- **Brasil:** Pix, boleto, cartão, lojas de aplicativos.
- **América Latina:** meios locais por país e lojas de aplicativos.
- **África:** dinheiro móvel (como M-Pesa e MTN MoMo), cobrança na conta da operadora e lojas de aplicativos.
- No PC, loja própria e Steam; regras de compras entre plataformas a validar com Apple e Google.

### Conformidade com o ECA Digital (Brasil)

| Exigência | Como o jogo atende |
| --- | --- |
| Proibição de loot boxes (Art. 20) | Nenhuma caixa aleatória paga, para nenhuma idade |
| Autodeclaração não basta para verificar idade; jogos online estão na fase 2 do cronograma da ANPD (agosto a novembro de 2026) | Verificação de idade na criação da conta, usando sinais das lojas e um fornecedor certificado |
| Supervisão parental para menores de 16 | Painel de responsáveis: limite de tempo, gastos e chat |
| Proibição de design manipulativo (notificações emocionais, recompensas variáveis) | **Modo Jovem** para menores de 18: notificações neutras, sem ofertas por tempo limitado, limite de gastos |
| Sem publicidade comportamental para menores | O jogo não tem anúncios de terceiros |
| Avaliação de Impacto (AIPD) antes de lançar recursos | AIPD no fim do alfa e a cada sistema social novo |

As multas chegam a 10% do faturamento no Brasil, limitadas a R$ 50 milhões por infração ([Confidata](https://confidata.com.br/blog/eca-digital-o-que-muda-empresas)). Em março de 2026, a Riot bloqueou contas de menores em quase todos os seus jogos no Brasil por causa das loot boxes ([Olhar Digital](https://olhardigital.com.br/2026/03/13/games-e-consoles/riot-games-bloqueia-league-of-legends-para-menores-no-brasil-entenda-a-nova-lei/)), o que mostra o custo de não planejar isso desde o início. Chat de voz começa desligado para menores, e o chat de texto tem filtro e denúncia.

Outros mercados têm leis próprias de dados e proteção de menores (LGPD no Brasil, GDPR na Europa, POPIA na África do Sul, leis de proteção de dados da Nigéria e do Quênia, COPPA nos EUA). Parecer jurídico por mercado antes do beta.

## 16. Arte, áudio e UX

A direção de arte é "realismo mágico ancestral": estilizado semi-realista, texturas pintadas à mão e silhuetas fortes que se leem numa tela de 6 polegadas. Nada de "tribal genérico": cada peça tem uma referência real e nomeada.

**Acabamento:** o jogo é 3D desenhado, com sombreamento toon, contorno escuro e cores chapadas de uma paleta por região, para que agentes de IA consigam produzir modelos e animações em volume. Orçamentos, esqueletos, animação e pipeline estão na aba Especificações técnicas.

### Referências visuais

| Elemento | Referência | Uso |
| --- | --- | --- |
| Interface de missões | Xilogravura e literatura de cordel | Diálogos e diário de missões em estilo de folheto |
| Ícones | Símbolos adinkra (com significado correto) | Ícones de habilidades e conquistas |
| Mapa | Códices mesoamericanos e quipus | Mapa-múndi pintado; marcadores em nós |
| Tecidos e trajes | Kente, bogolan, aguayo, capulana, huipil | Armaduras de tecido e cosméticos |
| Arquitetura | Barro de Djenné, pedra do Grande Zimbábue, terraços andinos, chinampas, palafitas amazônicas | Capitais e ruínas |
| Relíquias | Bronzes de Benin e Ifé, ourivesaria pré-colombiana | Itens lendários e o Cofre dos Mil Nomes |
| Murais | Pintura ndebele | Quilombos e casas de jogador |

Cada região tem paleta própria (verde-água da Mata Viva, ocre da Savana Dourada, azul-prata do Silêncio). O Silêncio Cinzento literalmente tira a saturação da tela, e curar uma área devolve a cor.

As regras detalhadas de design de personagens, criaturas, mundo e cenários estão na aba Guia de arte.

### Personagens

- Iluminação e sombreamento de pele calibrados para tons escuros, testados em todas as regiões.
- Cabelos crespos com técnica de mechas próprias, não volumes sólidos.
- Roupas reais revisadas por consultores, com crédito à origem no jogo.

### Áudio

- **Trilha** com instrumentos das duas Margens: kora, balafon, mbira, djembê, tambor falante, berimbau, atabaque, zabumba, sanfona, charango, quena, zampoña, marimba de chonta e cajón. Compositores das regiões representadas.
- **Música adaptativa:** tambores entram quando o combate esquenta; o berimbau do Lutador e os cantos do Oráculo sincronizam com a trilha.
- **Dublagem** em português, espanhol, inglês e francês, com cantos e falas rituais em iorubá, quéchua, náuatle, guarani, quicongo e suáli gravados por falantes nativos.
- **Áudio como mecânica:** El Silbón, a Matinta Perera e a Iara usam pistas sonoras; todas têm alternativa visual para jogadores surdos.

### UX entre plataformas

- Dois layouts de HUD desenhados em paralelo (PC e celular), com escala de interface ajustável.
- Navegação automática até a missão: opcional, desligada por padrão no PC.
- **Modo Economia** no celular: 30 FPS, efeitos reduzidos, menos consumo de bateria e de dados.
- Download inicial no celular de até 2 GB, com o resto baixado por região sob demanda, porque dados móveis são caros em boa parte da América Latina e da África.
- Acessibilidade: modos para daltônicos, legendas com tamanho ajustável, remapeamento total, modo assistido de ritmo e alternativas visuais para pistas sonoras.

### Alvos de hardware (a validar em protótipo)

| Plataforma | Mínimo | Recomendado |
| --- | --- | --- |
| Android | 4 GB de RAM, chip intermediário de 2020 | 6 GB de RAM, chip intermediário de 2023 |
| iOS | iPhone XR | iPhone 13 |
| PC | GTX 1050 Ti, 8 GB de RAM, SSD | GTX 1660 ou equivalente, 16 GB de RAM |

## 17. Tecnologia e arquitetura

A recomendação é Unity 6 (URP) no cliente e servidores autoritativos próprios em C#/.NET, que compartilham as regras de jogo com o cliente. É a combinação que melhor equilibra PC e celulares Android de entrada; Albion Online, a referência de guerra do projeto, também usa Unity.

&#91;embedded content: arquitetura de servidores · clientes, gateway, zonas, instâncias, serviços e dados\]

PC e celular passam pelo mesmo gateway e jogam nos mesmos servidores; só a interface muda. Instâncias sobem e descem conforme a demanda, o que segura o custo fora do horário de pico.

### Decisão de engine

| Critério | Unity 6 (recomendado) | Unreal Engine 5 |
| --- | --- | --- |
| Celular de entrada (4 GB) | Bom desempenho, builds menores | Exige muitos cortes |
| Visual no PC | Bom com arte estilizada | Excelente |
| Profissionais no Brasil | Ampla oferta | Oferta menor, crescendo |
| Código compartilhado com o servidor | C# nos dois lados | C++ no cliente, servidor separado |

Termos de licença das duas engines devem ser conferidos na versão vigente antes da decisão final.

### PC: desktop ou navegador?

No PC, o jogo deve rodar como cliente desktop para Windows. O navegador entra depois, só como porta de entrada para testar o jogo sem instalar.

| Critério | Cliente desktop | Navegador |
| --- | --- | --- |
| Cercos 50 contra 50 e colossos | Acesso total à GPU e à memória | A Unity 6.6 tirou o WebGPU da fase experimental em setembro de 2026, mas o WebGL 2 segue como padrão e nem todo aparelho com WebGPU se comporta igual ([Cinevva](https://app.cinevva.com/news/2026-09-01-unity-6-6-webgpu-production)) |
| Rede em tempo real | UDP nativo (LiteNetLib) | Exige WebTransport ou WebSocket; o WebTransport só chegou a todos os navegadores em março de 2026 ([Web Platform Features](https://web-platform-dx.github.io/web-features-explorer/features/webtransport)) e ainda tem implementações desiguais ([Semantic UI](https://echo.semantic-ui.com/compat)) |
| Download | Vários GB instalados uma vez, com atualizações por diferença | Tudo carregado pela rede, dentro do limite de memória da aba |
| Proteção contra trapaça | Mais controle sobre o cliente | Código do cliente exposto no navegador |
| Entrada do jogador | Precisa instalar | Um clique, sem instalar |
| Trabalho para a IA | Um alvo de build | Mais um alvo para testar e manter |

**Decisão:** desktop no lançamento, distribuído pelo Steam e por um launcher próprio. Depois do alfa, avaliar uma demonstração no navegador com a Mata Viva, feita com o build web da Unity (WebGPU e WebTransport), se as métricas de aquisição justificarem.

### Celular: app próprio

Apps nativos para Android e iOS, gerados do mesmo projeto Unity, com download inicial de até 2 GB e o resto baixado sob demanda (seção 16). A conta é a mesma do PC. As compras dentro do app seguem as regras de cada loja; uma loja web própria com Pix só entra onde as regras das lojas permitirem, com parecer jurídico.

Como todo o desenvolvimento será feito por IA, a aba Desenvolvimento por IA avalia a pilha nesse modelo.

### Duas fases de arquitetura: núcleo de simulação compartilhado

A campanha solo é desenvolvida primeiro, mas já no formato que o multiplayer vai exigir. Toda a regra do jogo (combate, habilidades, IA dos inimigos e dos Ecos, missões, inventário) mora num **núcleo de simulação em C# puro**, sem depender da Unity. A Unity só desenha a cena e envia os comandos do jogador.

| Fase | Onde o núcleo roda | Salvamento | Rede |
| --- | --- | --- | --- |
| Desenvolvimento da campanha solo | Dentro do cliente Unity, no computador | Arquivo local | Nenhuma |
| Campanha pública, se sair antes do multiplayer | Em servidores de instância pessoal, com o mesmo código | Na nuvem, ligado à conta | Cliente e servidor simples |
| Multiplayer | Servidores de zona e de instância (diagrama acima) | Banco de dados central | LiteNetLib e MagicOnion |

**Regras do núcleo:**

- Nenhuma chamada da Unity: entra comando, sai estado.
- Tempo contado em ticks fixos (20 por segundo), nunca em tempo de quadro.
- Toda aleatoriedade sai de uma semente registrada.
- Todos os dados vêm das planilhas do Luban.
- Cada regra tem teste automático sem interface.

**Por quê:** se a campanha rodasse só no computador do jogador, o progresso poderia ser adulterado, e esse personagem depois entra no mundo compartilhado. Com o núcleo separado desde o começo, o time desenvolve rápido e sem custo no computador, sem servidor nem licença, e depois leva o mesmo código para o servidor sem reescrever o jogo.

### Servidores e regiões

- **Zonas:** cada zona aguenta até 300 jogadores; a passagem entre zonas tem um carregamento curto.
- **Instâncias:** masmorras, raides e arenas rodam em contêineres (Kubernetes com Agones), criados perto do grupo.
- **Gerência de interesse:** cada cliente recebe só o que está por perto; em batalhas grandes, jogadores distantes atualizam com menos frequência.
- **Megaservidores:** um nas Américas (São Paulo) e um no Atlântico Leste (Europa Ocidental ou África do Sul). A escolha sai de testes de latência com jogadores das Áfricas Ocidental, Central e Austral. Eventos especiais podem unir os dois.
- **Antitrapaça:** servidor valida movimento e dano; detecção de root e emuladores no celular; análise de comportamento contra bots.

### LiveOps e ferramentas

- Dados de jogo (itens, habilidades, chefes) versionados, com correções sem atualizar o cliente.
- Chaves de recurso para ligar e desligar sistemas por região.
- Ferramentas internas: editor de encontros de chefe, editor de missões, painel de economia e painel de moderação.
- Localização com variáveis de gênero desde o início, porque português, espanhol e francês flexionam gênero.
- Telemetria de desempenho por modelo de celular, para ajustar a qualidade gráfica automaticamente.

Os frameworks e ferramentas abertos que aceleram cada camada estão na aba Ferramentas.

## 18. Produção: equipe, orçamento e roadmap

Baobá é feito em duas fases: primeiro a campanha solo completa, do nível 1 ao 50, com toda a jogabilidade e todos os modelos; depois o multiplayer. O vertical slice prova a diversão da campanha antes de qualquer investimento em servidores.

&#91;embedded content: roadmap · slices da campanha solo, depois o multiplayer\]

Cada portão é um ponto de decisão: só se avança de fase se o teste daquele portão passar.

### Plano de vertical slices

A campanha solo é construída em faixas de 10 níveis, e cada faixa é um vertical slice completo: jogável do começo ao fim, em qualidade final, testado com jogadores antes de seguir. Assim a equipe sempre tem o jogo inteiro rodando até o ponto atual e sabe o que melhorar a cada etapa.

&#91;embedded content: caminhos da campanha · 9 vertical slices por faixa de nível\]

O caminho de quem começa na Margem Oeste é construído primeiro, porque ele já passa pelas duas Margens e testa as duas linguagens de arte. O caminho da Margem Leste reaproveita os sistemas prontos e pode começar em paralelo a partir do slice 3.

| Slice | Níveis | Região | História | Classes novas | Sistemas novos | Masmorra |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 1 a 10 | Mata Viva | Prólogo e Ato I | Guardião, Lutador, Caçador e Oráculo | Núcleo de simulação, combate, missões, coleta e fabrico básicos, vendedores, Ecos Companheiros, salvamento | O Coração da Mata Viva |
| 2 | 10 a 20 | Sertão Velho | Ato II | Novos talentos | Talentos (Árvore do Baobá), primeira capital (Palenque das Palmeiras), Confrarias na história, mais profissões | O Arraial do Corpo-Seco |
| 3 | 20 a 30 | Porto de Kalunga e Planalto de Pedra | Ato III | Novos talentos | Travessia entre as Margens, Porto como centro, Relíquias, casa do jogador, montarias | As Cavernas de Diamante |
| 4 | 30 a 40 | Costa das Monções | Ato IV | Novos talentos | Culinária completa, profissões de alto nível, Ecos das duas Margens combinados | O Naufrágio da Monção |
| 5 | 40 a 50 | Ilhas do Limiar | Ato V e missão final | Polimento das 4 classes | Equipamento de Linhagem até o nível 50, missão final O Pacto das Duas Margens, cinemática do Despertar | Batalha final da campanha |
| 6 | 1 a 10 | Delta dos Bronzes | Prólogo e Ato I (Leste) | — | Origem na Margem Leste | O Mangue dos Bronzes |
| 7 | 10 a 20 | Savana Dourada | Ato II (Leste) | — | Capital Tumbara | A Biblioteca Queimada |
| 8 | 20 a 30 | Altiplano do Sol | Ato III (Leste) | — | Capital Intipata | As Minas do Ventre |
| 9 | 30 a 40 | Lagos Flutuantes | Ato IV (Leste) | — | Capital Atlixa | A Cidade Submersa |

**O que todo slice entrega**

1. A faixa jogável do começo ao fim, em qualidade final: arte, áudio, história, interface e desempenho no celular de 4 GB.
2. Tudo o que os slices anteriores tinham continua funcionando, garantido por testes automáticos.
3. Um portão com teste de jogadores e metas: diversão, tempo para completar a faixa, conclusão da masmorra com Ecos e quadros por segundo.
4. Uma retrospectiva que gera a lista de melhorias; o que for das faixas anteriores entra como repasse no slice seguinte.
5. Este documento atualizado com o que mudou.

**Ritmo de cada slice:** 2 semanas de planejamento, construção, 2 semanas de testes com jogadores e 1 semana de retrospectiva e repasse. O slice 1 é o mais longo (cerca de 8 meses), porque cria a fundação; os slices 2 a 5 levam cerca de 3 a 4 meses cada, e os slices 6 a 9, cerca de 2 a 3 meses, reaproveitando sistemas.

### Escopo do slice 1 (níveis 1 a 10)

| Item | Escopo |
| --- | --- |
| Região | Mata Viva completa (níveis 1 a 10) |
| Classes | As 4 classes, jogáveis e como Ecos Companheiros |
| PvE | O Coração da Mata Viva com Ecos Companheiros e um chefe de região da campanha |
| Economia | 2 profissões de coleta, 2 de fabrico e vendedores NPC |
| Plataformas | PC e Android (iOS entra na campanha completa) |
| Execução | Núcleo de simulação local, sem servidor; salvamento em arquivo |

**Decisão em aberto:** lançar a campanha solo antes do multiplayer, como acesso antecipado, traz receita e jogadores mais cedo, mas exige servidores de instância pessoal e cria a expectativa de que o multiplayer chegue logo. Decidir no portão da campanha completa.

### Equipe

| Área | Vertical slice | Produção e beta |
| --- | --- | --- |
| Direção e produção | 2 | 5 |
| Game design (sistemas, combate, níveis, narrativa, economia) | 4 | 10 |
| Engenharia de cliente | 4 | 12 |
| Engenharia de servidor e backend | 3 | 10 |
| Infraestrutura e DevOps | 1 | 3 |
| Arte (conceito, personagens, cenários, animação, efeitos, interface) | 6 | 22 |
| Áudio | 1 | 3 |
| QA | 1 | 6 |
| Comunidade, LiveOps e dados | 0 | 4 |
| **Total** | **22** | **75** |

Os 7 consultores culturais trabalham em regime parcial nas duas fases.

**Com desenvolvimento por IA:** a equipe central cai para 6 a 9 pessoas que dirigem e revisam o trabalho dos agentes (aba Desenvolvimento por IA, seção 4). A tabela acima e o orçamento abaixo assumem uma equipe tradicional e o roteiro antigo, sem a fase solo; os dois devem ser refeitos na fase de conceito.

### Orçamento (estimativa aproximada)

Premissa: custo médio de R$ 15 mil a R$ 25 mil por pessoa por mês com encargos, mais 30% para terceirização, servidores, ferramentas e consultoria. Valores a validar com um orçamento detalhado.

| Fase | Duração | Faixa de custo |
| --- | --- | --- |
| Conceito | 3 meses | R$ 0,5 a 1 milhão |
| Vertical slice | 12 meses | R$ 5 a 8 milhões |
| Produção alfa | 18 meses | R$ 22 a 32 milhões |
| Beta | 8 meses | R$ 12 a 18 milhões |
| **Total até o lançamento** | **41 meses** | **R$ 40 a 60 milhões, sem marketing** |

### Financiamento

- **Marco Legal dos Games.** A regulamentação da Lei 14.852/2024, anunciada em outubro de 2026, prevê reduzir o empréstimo mínimo do Fundo Setorial do Audiovisual de R$ 500 mil para R$ 150 mil, juros de TR + 0,5% ao ano, acesso à Lei do Audiovisual e o Rouanet Games, além de linhas do MinC e do MCTI a partir de 2027 ([O POVO](https://mais.opovo.com.br/colunistas/wanderson-trindade/2026/10/15/marco-legal-dos-games-preve-credito-mais-barato-e-amplia-apoio-a-industria-brasileira.html)). A execução ainda depende das regras de acesso de cada instrumento.
- **Mercado.** Segundo o mesmo material, o Brasil teve 123,3 milhões de jogadores em 2025 e US$ 2,7 bilhões em receita, a 9ª posição mundial.
- **Privado.** Publishers interessados em América Latina e África, investidores-anjo para o conceito, acesso antecipado no Steam a partir do alfa.

## 19. Riscos, métricas e próximos passos

O maior risco é o escopo: a maioria dos MMOs que falha tenta lançar grande demais. Por isso o plano prevê portas de saída em cada portão e um vertical slice pequeno, mas completo.

### Riscos principais

| Risco | Impacto | Mitigação |
| --- | --- | --- |
| Escopo de MMO maior que a equipe | Atrasos e orçamento estourado | Vertical slice de 12 meses; portões de decisão; conteúdo modular por temporada |
| Desempenho do celular em guerras grandes | Abandono dos jogadores de celular | Tetos de batalha, Modo Batalha, testes de carga desde o slice |
| Sensação de "jogo de celular" no PC (erro de Tarisland) | Rejeição do público de PC | Duas interfaces, profundidade de sistemas no PC, testes com jogadores de MMO de PC |
| Percepção de pay-to-win | Perda de confiança | Carta do Jogo Justo pública; nada de loot boxes |
| Megaguildas dominando o Sertão | Guildas pequenas abandonam | Tetos de aliança, custos crescentes, Fôlego do Oprimido |
| Bots e venda ilegal de moeda | Economia quebrada | Detecção comportamental, banimentos em onda, economista na equipe |
| Representação cultural equivocada | Crise de imagem nos mercados-alvo | Consultoria com veto, revisão em quatro momentos, programa Raízes |
| Exigências do ECA Digital | Multas e bloqueio de menores | Conformidade desde o design (seção 15), AIPD, parecer jurídico |
| Latência na África | Experiência ruim no público-chave | Testes de rede antes de escolher regiões; instâncias perto do grupo |
| Falta de conteúdo após o nível máximo | Queda de jogadores em 2 a 3 meses | Lançar com 6 meses de conteúdo pronto; Mítica Ancestral infinita; temporadas de guilda |

### Riscos do modelo solo primeiro

- **Jogadores terminam a campanha e vão embora** antes do multiplayer existir. O Despertar só ganha data pública quando o multiplayer estiver em beta; personagens alternativos dão motivo para voltar.
- **Mundo vazio no Despertar:** com poucos jogadores no nível 50, masmorras e raides ficam sem grupo. Os Ecos continuam nas masmorras Normais, as filas juntam PC e celular, e eventos de abertura concentram os jogadores.
- **Arquitetura solo que não escala:** evitada pelo núcleo de simulação compartilhado (seção 17).
- **Balanceamento duplo:** a dificuldade Normal é desenhada para Ecos; Heroica em diante, para jogadores.

### Métricas-alvo (hipóteses a calibrar no alfa)

| Métrica | Meta inicial |
| --- | --- |
| Retenção D1 / D7 / D30 | 40% / 20% / 10% |
| Jogadores que chegam ao nível 50 | 35% dos que passam do nível 10 |
| Espera na fila de masmorra (dano) | Menos de 5 minutos |
| Jogadores de nível máximo ativos no Sertão por semana | 30% |
| Guildas com território que não estão no top 20 | 50% dos territórios |
| Diferença de vitórias entre PC e celular em arena | Até 3 pontos percentuais |
| Inflação do índice de preços | Menos de 5% por temporada |
| Taxa de travamento no celular | Menos de 1% das sessões |
| Latência p95 em masmorras | Menos de 150 ms nas regiões de lançamento |

### Próximos passos (próximos 90 dias)

- [ ] Validar o título e registrar a marca no INPI
- [ ] Contratar os primeiros 3 consultores culturais (afro-brasileiro, África Ocidental, andino)
- [ ] Protótipo de combate com Guardião e Lutador no PC e no Android
- [ ] Protótipo do núcleo de simulação com a masmorra da Mata Viva e os Ecos Companheiros
- [ ] Bíblia de arte com 3 regiões e 4 classes em concept
- [ ] Planilha de economia com fontes, sumidouros e simulação de 10 semanas
- [ ] Parecer jurídico sobre ECA Digital e LGPD
- [ ] Plano de captação: Fundo Setorial do Audiovisual, Rouanet Games e investidores

A lista completa do que falta definir para começar o desenvolvimento está na aba Pendências.

## Fontes

- [Mein-MMO: Tarisland sai do ar em 4 de novembro de 2025](https://mein-mmo.de/tarisland-ende-november-2025/)
- [Massively OP: Tarisland sem comunicação e quebrado no iOS](https://massivelyop.com/2025/09/02/tarisland-has-reportedly-stopped-functioning-on-ios-as-tencents-radio-silence-continues/)
- [MMOs.com: atualização Foundations de Albion Online](https://mmos.com/news/albion-onlines-foundations-update-now-live)
- [Massively OP: temporada de guildas de Albion e postos avançados](https://massivelyop.com/?p=235108)
- [Confidata: o que muda com o ECA Digital](https://confidata.com.br/blog/eca-digital-o-que-muda-empresas)
- [Olhar Digital: Riot bloqueia menores no Brasil](https://olhardigital.com.br/2026/03/13/games-e-consoles/riot-games-bloqueia-league-of-legends-para-menores-no-brasil-entenda-a-nova-lei/)
- [O POVO: regulamentação do Marco Legal dos Games](https://mais.opovo.com.br/colunistas/wanderson-trindade/2026/10/15/marco-legal-dos-games-preve-credito-mais-barato-e-amplia-apoio-a-industria-brasileira.html)
- [CGTN: baobás que guardam os restos de griôs no Senegal](https://news.cgtn.com/news/3d67444f7741444e/share_p.html)
- [Diario de Pernambuco: baobás e a tradição ancestral no Brasil](https://www.diariodepernambuco.com.br/noticia/vidaurbana/2015/04/derrubada-de-baobas-agride-tradicao-ancestral-e-fere-principio-da-sustentabilidade.html)
- [Brasil de Fato: Recife, capital dos baobás nas Américas](https://www.brasildefato.com.br/2023/02/19/mst-de-pernambuco-distribui-mudas-de-baoba-por-diferentes-estados-do-brasil/)
