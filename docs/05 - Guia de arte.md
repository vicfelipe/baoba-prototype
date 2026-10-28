# Guia de arte — ilustração em um mundo 3D

v0.2 · 24/10/2026. Esta é a autoridade visual do P0. Contratos de arquivos e orçamento estão no 07; identidade do herói no 11.

## 1. Direção

**3D com direção hand-drawn:** formas tridimensionais legíveis, acabamento de desenho e pintura, personagens expressivos e câmera livre. Grand Chase é a referência de arte indicada pelo usuário; Tarisland e WoW orientam a experiência espacial e mecânica. A seleção de imagens de cada referência ainda está aberta. Esta interpretação não equivale a um estilo já aprovado.

A produção deve unir três camadas: silhueta modelada, massas de cor com sombra estilizada e traço/pintura de superfície. Cel shading e contorno ajudam, mas sozinhos podem resultar em aparência plástica e genérica. O acabamento manual vem também de bordas pintadas, desenho interno e escolhas de forma.

Não exigir shader sofisticado para começar. Primeiro compor uma cena pequena convincente; adicionar uma técnica somente quando ela resolver um problema visível.

## 2. Matriz de referência

| Referência do usuário | Intenção adotada para o P0 | O que precisa ser escolhido |
| --- | --- | --- |
| Tarisland | Terceira pessoa orbital, leitura de alvo e espaço da luta | Distância, inclinação e presença do herói na tela |
| WoW | Silhuetas de função, preparação de ataques e decisões de posicionamento | Densidade da interface e ritmo de combate desejado |
| Grand Chase | Desenho expressivo de rosto/cabelo, cores ilustradas e personalidade | Versão/época, proporções, espessura de linha e tipo de pintura |

A tabela define como usar a referência; não afirma equivalência exata entre versões desses jogos. Não copiar sua propriedade visual. Uma imagem-alvo anotada deve registrar “adotar” e “evitar” por aspecto, sem usar o nome do jogo como especificação suficiente.

## 3. Regras de aparência

| Elemento | Direção de trabalho | Evitar |
| --- | --- | --- |
| Formas | Grandes massas, leve assimetria, proporção heroica | Personagens feitos de cápsulas separadas como acabamento final; excesso de microdetalhe |
| Contorno | Tinta marrom-escura, hierarquia entre personagem e fundo | Linha grossa em cada folha, contorno tremendo aleatoriamente |
| Cor | Base pintada, dois tons principais, terceiro só em acentos escolhidos | Foto colada, plástico brilhante, brilho metálico realista |
| Pintura | Pinceladas discretas e linhas presas à superfície em UV | Ruído de tela que desliza sobre objetos ou cintila em movimento |
| Rosto | Identidade na geometria e expressão desenhada simples | Transformar o rosto numa máscara genérica de anime |
| Cabelo | Volumes sólidos organizados como tranças e locs | Fios individuais, cartões realistas ou massa sem desenho interno |
| Cenário | Repetição modular disfarçada por composição e paleta | Vegetação densa escondendo jogador e telegráficos |
| Efeitos | Formas gráficas curtas, cor e direção legíveis | Bloom cobrindo a luta, chuva constante de partículas |
| Interface | Painéis claros, tinta e pequenos detalhes de cordel | Fonte decorativa em instruções de combate ou moldura excessiva |

Não há exigência de contorno pós-processado no cenário. Árvores e pedras podem comunicar desenho por silhueta e textura; contorno adicional só se a composição pedir. Oscilação de linha e hachura animada ficam adiadas.

## 4. Paleta e luz da Mata Viva

Paleta inicial herdada do conceito: verde #1F6B4F, turquesa #3FA796, ocre #C9A227, madeira #6B3E26, creme #E8D9B5, tinta #2A1A12. Cores de pele são próprias do personagem e não limitadas às cinco cores ambientais.

Sombras preservam a família de cor; pele escura mantém volume e contraste sem ser clareada ou acinzentada. Luz principal quente, ambiente suficiente para ler rosto e mãos; um único período do dia, sem ciclo dinâmico. Separar fundo, área jogável e personagem por valor e saturação.

O Silêncio usa prata fosca e cinza frio em **materiais marcados**. Sua restauração mistura propriedades desses materiais em 2 s. Não aplicar dessaturação indiscriminada à tela: ela apagaria sinais de combate, pele e interface. Preservar os mesmos assets entre corrompido e restaurado.

## 5. Herói, inimigo e ambiente

Guardião: um adulto negro de físico forte, rosto angular, tranças nagô continuando em locs presos, roupa clara e pés descalços conforme descrição antiga. Escudo oval e lança curta comunicam função. As imagens citadas não estão no workspace; fidelidade visual permanece pendente. Evitar acrescentar armadura e ornamentos antes de recuperar essas referências.

Curupira: pés invertidos visíveis e cabelo de fogo; protetor libertado no desfecho. Duas formas: **corrompido** = monstro de 3 m (casca rachada cinza, luz violeta fria nas fendas, raízes e galhos secos, juba de fogo petrificada e fria) e **liberto** = humanizado de 2,1 m (pele verde viva, juba de fogo quente, folhas crescendo do corpo). Nenhum acessório no estilo do Capoeirista (pulseiras, colar, cordão). Prompts em `SourceArt/Curupira/PROMPT.md`. A forma visual é proposta, sujeita à revisão cultural. Não usar retargeting humanoide convencional como garantia de que pés invertidos irão animar corretamente. O Fragmento do Silêncio é criatura original, sem fingir ser figura do folclore.

Mata Viva: raízes em aletas de sumaúma, trilha, madeira e clareira; a árvore-marco não é um baobá amazônico por conveniência de marca. O nome Baobá continua ligado ao universo das Duas Margens. Água pode aparecer ao fundo como plano simples; não precisa de natação, reflexo ou física.

## 6. Prova visual obrigatória antes de escala

Construir a **Sala de Estilo e Medidas**, uma única cena com herói, árvore, pedra, passarela, inimigo e marcação de perigo. Reutilizar essa cena para importação, câmera e comparação visual.

Capturar em 1920×1080: frente/lado/costas/três quartos do herói; visão padrão de jogo; sombra; área corrompida; restauração. Gravar órbita completa, corrida, defesa e ataque. Avaliar nas distâncias mínima, padrão e máxima do 08.

Critérios de aceite:

- O desenho continua visível ao movimentar a câmera, sem parecer um pôster plano.
- Rosto, cabelo e silhueta se aproximam das referências escolhidas; o tom de pele permanece reconhecível na sombra.
- Linhas internas não borram nem nadam na superfície; contorno não racha nas junções.
- Jogador, chefe e área de perigo se distinguem do chão sem depender só de cor.
- Personagem e ambiente parecem pertencer ao mesmo jogo.
- A direção registra quais aspectos estão aprovados e quais continuam provisórios.

Uma build tecnicamente correta com aparência distante das referências reprova o marco visual. Uma concept art bonita sem esse teste também não o conclui.

## 7. Simplificações permitidas

Roupa fixa, um cabelo, pintura sem normal map, poucos materiais, animações reutilizadas e kit pequeno. Simplificar quantidade e detalhes menores; preservar identidade e deformações principais. Rosto pode começar com olhos e boca estáticos desenhados, sem rig facial ou atlas de dezesseis expressões.

Na falta de arte, usar manequim identificado como provisório para testar mecânicas. Não anunciar manequim como personagem final. Não produzir centenas de variantes para compensar falta de direção.

## 8. Representação e procedência

Registrar nome/origem das referências culturais. Evitar mistura aleatória de símbolos, objetos sagrados como adereço, caricatura de traços e cópia de representações modernas. A ficção não deve ser apresentada como descrição histórica comprovada. Revisão cultural é concentrada no conteúdo realmente presente; não condicionar o blockout a contratar especialistas de regiões que não entram no P0.
