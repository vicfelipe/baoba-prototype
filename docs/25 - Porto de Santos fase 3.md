# Porto de Santos — fase 3

28/10/2026. O usuário pediu o próximo mapa:

- **Região:** inspirada no **Porto de Santos**, na **praia** e no **mar**.
- **Chefes:** a **Iara** e o **Ipupiara**, **juntos**, numa **arena com o mar em volta**. A luta deve ter mecânicas novas, **parecidas com as dos lobos gêmeos do Tarisland**.

## Decisões do usuário (28/10)

| Pergunta | Decisão |
| --- | --- |
| Mecânica da dupla | **Só o mar como perigo**, por enquanto. Ondas varrem a arena com aviso no chão, a maré cobre a borda e os empurrões jogam o herói na água, onde ele leva dano e é puxado de volta. "Vamos manter simples" |
| Sentido da fase | **Da direita para a esquerda** da tela: o cais do porto fica à direita e a arena no mar à esquerda. A câmera é a mesma das outras fases |
| Inimigos do caminho | **Mistura:** afogados do porto no cais e criaturas de coral na praia |
| Modelos dos chefes | **Primitivas agora**, com animação procedural. O pipeline Lunia ([18](<18 - Pipeline de personagens estilo Lunia.md>)) entra quando o usuário mandar referências |
| Clima | **Ressaca → céu limpo:** mar de ressaca, céu cinza-chumbo, garoa e vento. Ao vencer, as nuvens abrem e o sol do fim de tarde doura o mar |
| Arena | **Deque do trapiche:** plataforma circular de madeira no fim de um píer velho, com estacas e cordas. O píer desaba atrás do herói |
| Desfecho | **A Iara é libertada:** barra de Corrupção e volta aliada, como o Curupira. **O Ipupiara é vencido:** afunda derrotado, como a Mula |
| Papéis | **Ipupiara de perto:** corpo a corpo no deque (mordida, cauda, empurrão para o mar). **Iara de longe:** fica na água, na borda do deque, com jatos d'água e o Canto. O Canto é uma conjuração que puxa o herói para o mar e é interrompida com Q. Ela muda de ponto na borda, e o herói a alcança da beirada |

**Sobre a referência do Tarisland:** não foi encontrado guia escrito da luta dos lobos gêmeos. As buscas só acharam vídeos do chefe "Forest Gemini", e o jogo foi encerrado em 4/11/2025. As quatro mecânicas oferecidas ao usuário foram propostas da revisão, montadas a partir de padrões comuns de luta contra dois chefes, e não de um guia: vida ligada, distância entre eles, revezamento entre terra e mar, e mar como perigo. As outras três ficam registradas como possibilidades futuras e só entram se o usuário pedir.

## Roteiro

O roteiro segue a fase 1 (doc 01, seção 4): trilha com inimigos → vestígio → portão → arena (checkpoint) → chefes → memória final. O acesso é pela tela de título (**Porto de Santos**, fase 3), como o Sertão Velho.

| Trecho | O que acontece |
| --- | --- |
| **Cais do Porto** (entrada, à direita) | Calçada de paralelepípedo, trilhos do porto, cabeços de amarração e cordas. Ao fundo (acima na tela), armazéns numerados, pilhas de contêineres e guindastes. O mar fica na frente (abaixo na tela) |
| **Afogados do cais** | 3 estivadores afogados tomados pelo Silêncio sobem do mar pela beira do cais quando o herói chega perto |
| **Canal e jardim da orla** | Um canal atravessa o caminho, com uma ponte baixa. Depois vem o jardim da orla: grama, canteiros e árvores |
| **Praia** | Faixa de areia com ondas quebrando em primeiro plano. 2 criaturas de coral do Silêncio: a **de coral** golpeia de perto e a **de craca** cospe água de longe |
| **Vestígio** | Uma **garrafa com uma carta antiga** encalhada na areia, brilhando (F). A cor volta ao redor |
| **Portão do trapiche** | Corrente com boias atravessada na entrada do píer. Abre com os 5 inimigos derrotados e a carta lida |
| **Trapiche** (checkpoint) | Píer estreito de tábuas sobre a água até o deque circular. Ao entrar no deque, o píer desaba atrás do herói e a luta começa |
| **Céu limpo** | Com os dois chefes resolvidos, a ressaca acalma, a garoa para, as nuvens abrem e o sol do fim de tarde doura o mar. A **memória do mar** aparece no deque (F) |
| **Fim** | Tela "O mar se acalmou": “O mar devolve o que a gente lembra.” |

O objeto do vestígio, os nomes dos trechos e a frase final são **proposta**.

Derrota no caminho recompõe o caminho: os inimigos voltam e a carta se apaga. Derrota no deque volta à entrada do trapiche, com o caminho concluído.

## Luta: Iara e Ipupiara

Os dois têm barras separadas, sem vida ligada (decisão do usuário). A luta termina quando a Iara for libertada **e** o Ipupiara for vencido, em qualquer ordem:

- **Iara liberta primeiro:** a máscara se parte, ela para de atacar e fica na água, cantando baixinho.
- **Ipupiara vencido primeiro:** afunda, e a Iara continua sozinha.

O mar segue agitado até os dois caírem.

### O mar (mecânica da dupla)

O mar não pertence a nenhum dos dois chefes. Tem um relógio próprio, que corre enquanto houver chefe de pé:

| Evento | Aviso | Efeito |
| --- | --- | --- |
| **Ressaca** | A faixa larga atravessa o deque de lado a lado, mirando o herói. A água sobe daquele lado | Uma parede de espuma corre pela faixa: dano e **empurrão** no sentido da onda |
| **Maré alta** (a cada 3º evento) | Anel na borda do deque; só o miolo fica seguro | A água cobre o anel por alguns segundos: dano contínuo e passo mais lento para quem fica nele |
| **Cair no mar** | — | Empurrado para fora da borda (onda, cauda, arremetida ou o fim do Canto), o herói cai na água, leva dano e a corrente o devolve à beirada |

### Ipupiara (corpo a corpo, no deque)

Monstro marinho das crônicas coloniais do litoral de São Vicente, vizinha a Santos: escamas escuras, nadadeiras como velas e muitos dentes.

- **Ciclo:** aproximar → **rabada** → recuperar → **arremetida** → recuperar.
- **Rabada:** vira a cauda e acerta um cone largo atrás. Empurra para fora.
- **Arremetida:** corre em linha pela faixa avisada. Empurra no sentido da corrida.
- **Mordida:** ataque básico, um golpe comum **sem aviso no chão**, como os dos outros chefes. Sai entre as habilidades, quando o herói está perto.

### Iara (de longe, na água)

Guardiã das águas corrompida pelo Silêncio. É uma figura poderosa e não sexualizada (guia de arte histórico): corpo coberto por uma veste de fibra trançada e escamas, cabelos longos como correntezas e uma **máscara espelhada** do Silêncio cobrindo o rosto. Libertada, a máscara se parte e o cabelo ganha cor de rio.

- **Ciclo:** nadar pela borda → **jato d'água** → recuperar → **jato d'água** → nadar → **Canto** → recuperar.
- **Jato d'água:** círculo sob o herói.
- **Canto:** conjuração com barra. Enquanto dura, puxa o herói devagar em direção a ela. Se terminar, arrasta o herói de uma vez para o mar. **Q interrompe**; quem luta de perto precisa ir até a borda.
- **Rabanada:** ataque básico sem aviso, só quando o herói encosta na borda perto dela.
- O laço do Vaqueiro não puxa nenhum dos dois chefes; neles, só interrompe.

### Números (`IPUPIARA`, `IARA`, `MAR` em `config.js`)

**Proposta inicial, a validar.**

| | Valor |
| --- | --- |
| Ipupiara | 1900 de vida. Rabada: 22 de dano, cone de 140°, 5 m. Arremetida: 26. Mordida: 14 |
| Iara | 1500 de Corrupção. Jato: 18. Canto: 3,6 s de conjuração; no fim, 16 de dano e arrasto até o mar. Rabanada: 10 |
| Ressaca | Primeira aos 9 s de luta, depois a cada 11 s. Aviso de 2 s, 18 de dano, empurrão de 5 m |
| Maré alta | Aviso de 2,4 s. Cobre de 7,5 m até a borda (12 m) por 5 s, com 8 de dano/s e passo × 0,6 |
| Cair no mar | 12 de dano e 1,4 s na água até a corrente devolver o herói |

Os inimigos do caminho estão em `AFOGADO`, `CORAL` e `CRACA`, também como proposta:

| | Afogado do cais | Coral do Silêncio | Craca do Silêncio |
| --- | --- | --- | --- |
| Quantos | 3 | 1 | 1 |
| Base | Morto-vivo da fase 2: sobe do mar em vez da cova | Fragmento | Fragmento |
| Ataque | Cone de perto | Cone de perto | Cuspe d'água: círculo sob o herói, mantendo distância |

## Como se joga

Na tela de título, escolha **Porto de Santos** (fase 3) e clique em **Iniciar**. A escolha fica salva no navegador, como nas outras fases.

## Cenário (`web/src/porto.js`)

**Leiaute (proposta da revisão, 28/10):** a fase corre da direita para a esquerda, como o usuário pediu. O mar fica ao **norte**, no alto da tela, e a cidade ao sul, entre o caminho e a câmera. Na primeira versão o mar ficava ao sul. Com a câmera fixa olhando para o norte, ele ficava atrás dela e quase não aparecia no caminho. Por isso:

- ao sul do caminho só há coisas baixas: jardim, bancos, trilhos;
- o que é alto fica ao norte: navio, guindastes, palmeiras, postes, posto de guarda-vidas;
- a outra margem da baía aparece no horizonte.

| Trecho | Como entrou |
| --- | --- |
| Cais | Calçada de paralelepípedo de granito com juntas molhadas, muro de pedra na beira do mar, meio-fio, cabeços de amarração e trilhos com dormentes ao sul. Um **navio cargueiro atracado** tem contêineres no convés e cordas até os cabeços. O **Armazém 5** e pilhas de contêineres ficam no canto leste |
| Terminal | Na outra margem do canal do porto, ao fundo: plataforma, pilhas de contêineres e 3 guindastes de pórtico com as lanças sobre a água |
| Canal | Canal com muros de pedra entrando no mar e ponte baixa de granito com guarda-corpo branco |
| Calçadão e jardim | Calçadão de pedra, canteiros baixos com flores e bancos de frente para o mar ao sul, palmeiras vergadas pelo vento e postes acesos na beira da areia |
| Praia | Areia com marcas de vento, que desce em rampa até a água e fica molhada e escura na beira. Ao norte: canoa caiçara encalhada, varas com rede de pesca, troncos trazidos pelo mar, posto de guarda-vidas com bandeira vermelha (amarela depois da vitória) e pedras |
| Ponta da Praia | A terra acaba em pedras grandes ao norte da entrada do trapiche e em pedras pequenas ao sul |
| Trapiche | Píer de tábuas com estacas e corda. A corrente com boias e a placa "TRAPICHE" fecham a entrada. Ao abrir, a corrente cai na água. Na luta, o trecho junto ao deque desaba em cascata |
| Deque | Disco de tábuas de 12 m de raio sobre estacas, com corda velha do lado norte (a do sul se perdeu na ressaca), barris, rolo de corda e boia. **Mar em volta**, com espuma batendo na borda |
| Horizonte | Morros e prédios da outra margem da baía, na névoa |

**Atmosfera:** a ressaca usa o mesmo mecanismo do Sertão (`world.atmosphere`, `world.dawn`):

| | Durante a ressaca | Depois da vitória (7 s de transição) |
| --- | --- | --- |
| Céu e luz | Céu e névoa cinza-chumbo, luz fria | Céu dourado de fim de tarde |
| Garoa | Riscos inclinados pelo vento (`LineSegments` animados no shader, uma chamada de desenho) | Para |
| Mar | Ondulação alta, espuma nas cristas, linhas de arrebentação andando até a costa e espuma no deque | Fica calmo, verde-azulado, com cintilação do sol |
| Postes | Acesos | Apagam |

A espuma da costa usa uma textura de distância até a linha d'água. O tom do Silêncio (`uSilent`) é cinza-chumbo.

**Texturas novas** (`textures-porto.js`), geradas em canvas:

- areia com marcas de vento e conchinhas;
- tábuas lavadas pelo sal;
- chapa ondulada dos contêineres e armazéns.

O calçadão usa a calçada da Mata e o jardim usa a grama da Mata.

## Inimigos do caminho

| | Afogado do cais (3) | Coral do Silêncio (1) | Craca do Silêncio (1) |
| --- | --- | --- | --- |
| Modelo | Variação do morto-vivo (`morto.js`, tipo `afogado`): ossada esverdeada com cracas, camisa e macacão molhados, boné, algas, corda no ombro, gancho de carga na mão direita | Variação do Fragmento (`coral.js`): galhos de coral rosado orbitando o núcleo | Cracas acinzentadas e um tubo de cuspir na frente |
| Comportamento | Sobe do mar pela beira do cais, com espirro d'água, quando o herói chega a 6,5 m | Cone de perto | Para a 5 m do herói e cospe: círculo azul sob ele. De perto, golpeia em cone |

## Chefes

- **`ipupiara.js`:** modelo e animação procedural (andar, rabada, arremetida, mordida, salto do mar, queda e afundamento). Na cinemática do encontro, salta da água para o deque.
- **`iara.js`:** modelo e animação procedural (boiar, nadar, jato, Canto de braços abertos, rabanada, libertação). Emerge do mar do outro lado do deque, sempre no lado norte ou nos lados, à vista da câmera. Na libertação, a máscara se parte, o rosto aparece e o cabelo fica cor de rio. Ela fica na água como aliada, com o nome "Iara" no rótulo verde.
- **`duo.js`:** a dupla vira um chefe só para o jogo (encontro, câmera, música), com duas partes (alvos) e duas barras no HUD (azul para a Corrupção da Iara, vermelha para a vida do Ipupiara). O controlador também cuida do mar: ressaca (parede de espuma correndo pela faixa) e maré alta (lâmina d'água no anel).
- **Herói (`player.js`):**
  - empurrão (`shove`), que cancela a ação em curso;
  - queda no mar (`fall`): escorrega para a água além da borda, boia afundado até o peito e a corrente o devolve à beirada;
  - sem controle enquanto está empurrado ou na água (`adrift`), e os chefes não o atacam nesse tempo;
  - passo mais lento na maré (`moveMul`).
- **Aviso em anel** (`telegraph.js`, parâmetro `inner`) para a maré alta: enche de fora para dentro, como a água subindo.

A barra de conjuração passou a mostrar o nome de cada conjuração: Chamado do Silêncio, Labareda ou Canto da Iara. Antes dizia "Chamado do Silêncio" também na Labareda da Mula.

**Áudio:**

- **Ambiente do mar:** ondas em ciclos, assobio do vento na ressaca e gaivotas quando a cor volta.
- **Efeitos novos:** queda na água, ressaca quebrando, maré subindo, Canto da Iara (voz em glissando), jato d'água e mordida.

## Verificação

`node tools/shot-porto.mjs` (Chrome headless, `__baoba.advance`) grava `Evidence/porto-*.png` e `Evidence/porto-browser-checks.json`. Com o argumento `scenery`, só fotografa o cenário. O teste confere:

- a escolha da fase na tela de título;
- o início com 3 afogados submersos e coral e craca na praia;
- o afogado subindo do mar e o golpe de gancho (15);
- o cuspe da craca de longe (14);
- a carta lida e a corrente solta;
- o trapiche desabando na cinemática;
- a luta com os dois alvos, as duas barras e o deque fechado;
- a ressaca: 18 e empurrão no meio do deque; na borda, queda no mar (18 + 12) e volta pela corrente;
- a maré alta: dano e passo × 0,6 no anel, nada no meio, e a água escoando;
- o Canto: puxa o herói para a Iara e é quebrado pela interrupção; completo, arrasta para o mar (16 + 12);
- a rabada do Ipupiara (22) com empurrão;
- a Iara liberta com a luta seguindo contra o Ipupiara;
- o Ipupiara vencido: mar calmo, garoa parada, céu limpo e memória;
- a tela "O mar se acalmou";
- a ordem inversa (Ipupiara primeiro), que também encerra a luta;
- a derrota no deque, que volta ao trapiche com o píer inteiro;
- o Sertão e a Mata, que continuam carregando.

Resultado em 28/10: todas as verificações passaram, sem erros na página. `shot-sertao`, `shot-mula`, `shot-curupira` e `shot-mobile` também passaram depois das mudanças compartilhadas (HUD, avisos, herói).

Atalho dos testes: `__baoba.startDuo()` abre o Porto já na entrada do trapiche.

## Limites e decisões em aberto

- **Proposta, a validar:**
  - todos os números (`IPUPIARA`, `IARA`, `MAR`, `AFOGADO`, `CORAL`, `CRACA`);
  - o objeto do vestígio, os nomes dos trechos, os textos e a frase final;
  - o leiaute com o mar ao norte.
- **Mecânicas de dupla:** só o mar como perigo, por decisão do usuário. Vida ligada, distância entre eles e revezamento terra/mar ficam para quando o usuário pedir.
- **Modelos:** Iara, Ipupiara, afogados e criaturas de coral são de primitivas com animação procedural. Para o acabamento dos heróis, faltam referências do usuário (frente, lado, costas) e o pipeline Lunia ([18](<18 - Pipeline de personagens estilo Lunia.md>)).
- **Desempenho:** medido só em renderização por software (SwiftShader). A fase tem até 4 luzes pontuais, mar com ondulação no vértice (19 mil vértices) e 5 mil riscos de garoa. Falta medir numa GPU real e no celular.
- **Sem playtest humano:** estão por avaliar a dificuldade da dupla (rabada e arremetida empurrando para o mar enquanto a Iara joga jatos), a legibilidade do aviso azul da ressaca sobre o deque cinza e o alcance da Iara para heróis de perto.
- **Revisão cultural (D08):** pendente para Iara e Ipupiara antes de divulgação. A Iara foi mantida não sexualizada (veste fechada, gola alta), e não há símbolos religiosos na fase. O búzio foi evitado como vestígio por seu uso religioso.
