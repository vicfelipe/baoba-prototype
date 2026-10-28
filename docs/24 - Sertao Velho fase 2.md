# Sertão Velho — fase 2

27/10/2026. O usuário pediu a fase do próximo nível e decidiu:

- **Região:** Sertão Velho, em **estilo gótico** inspirado no sertão brasileiro.
- **Inimigos:** monstros **mortos-vivos/zumbis**, feitos como **variações do Fragmento**.
- **Acesso:** **só pela tela de título**, sem encadear com a fase 1.

A Mula sem Cabeça ([22](<22 - Mula sem Cabeca producao e integracao.md>)) deixa de ser um desafio avulso na clareira da Mata e vira o chefe desta fase.

## Como se joga

Na tela de título, escolha **Mata Viva** (fase 1) ou **Sertão Velho** (fase 2) e clique em **Iniciar**. A escolha fica salva no navegador. O roteiro é o mesmo da fase 1 (doc 01, seção 4).

**Sentido (pedido do usuário, 27/10):** a fase corre da **esquerda para a direita** da tela, de oeste para leste:

- o arraial fica à esquerda e o terreiro à direita;
- o cemitério fica acima da estrada e o casarão acima do terreiro;
- a câmera é a mesma da Mata.

Na fase 1 o caminho sobe a tela.

| Trecho | O que acontece |
| --- | --- |
| **Arraial abandonado** (entrada) | Casas de taipa caiada em ruínas, poço, candeeiros acesos. Começa com cor |
| **Estrada das Covas** | 5 mortos-vivos, enterrados, saem da terra quando o herói chega perto |
| **Cemitério do Arraial** | O vestígio é um **folheto de cordel** brilhando sobre uma pedra (F). A cor volta ao redor |
| **Portão do casarão** | Portão de ferro entre pilares caiados com crânios de boi. Abre com os 5 mortos derrotados e o cordel lido |
| **Terreiro do Casarão** (checkpoint) | Terra batida com anel de lajes, muros quebrados e o casarão arruinado ao fundo. A Mula desperta na cinemática do encontro e as estacas fecham a entrada |
| **Amanhecer** | Vencida a Mula, a cor volta a todo o mapa e a noite vira manhã em 7 s. A **memória do sertão** aparece no terreiro (F) |
| **Fim** | Tela "Amanheceu no sertão": “Toda noite no sertão termina em aurora.” |

Derrota na estrada recompõe a estrada: os mortos voltam às covas e o cordel se apaga. Derrota no terreiro volta ao portão com a estrada concluída.

## Cenário (`web/src/sertao.js`)

### Leitura gótica do sertão

| Elemento | Como entrou |
| --- | --- |
| Noite de lua fria | Céu e névoa azul-escuros, luz da lua azulada, neblina rasteira animada fora dos caminhos. Sobre a área caminhável a neblina fica rala, para não cobrir os avisos no chão |
| Fogo-fátuo | Luzinhas verde-água flutuando no cemitério e em volta do terreiro. Somem onde a cor voltou |
| Candeeiros | Fogo morno no arraial e no portão, fogo frio (verde) no cemitério e no terreiro. Os frios esquentam quando a onda de cor passa; todos se apagam ao amanhecer |
| Caatinga morta | Árvores secas de galhos retorcidos (3 variações), garranchos, mandacarus em candelabro, touceiras de xique-xique, capim seco, lajedos, ossos |
| Arraial e casarão | Casas de taipa com barra colorida, porta e janelas escuras, venezianas soltas, meio telhado caído com os caibros à mostra. Casarão de dois andares com vãos em arco, sacada de ferro, torre e telhado desabado. Muro de taipa com telhinha no portão |
| Cemitério | Covas rasas de terra com pedras em volta e marcos de **estaca com tábua**, mureta de pedra quebrada, covas abertas de onde saem os mortos. **Sem cruzes, igrejas ou símbolos religiosos** (doc 01, seção 8). Pelo mesmo motivo o terreiro não tem o círculo de runas gravado da clareira: a estrela de seis pontas leria como símbolo oculto à noite |
| Chão | Barro vermelho rachado em placas de seca (Voronoi com bordas levantadas, normal + altura), estrada de terra batida avermelhada, lajes de arenito com poeira por cima. Mesmas técnicas do chão da Mata: anti-repetição, mistura por altura e rachaduras do Silêncio |

Texturas novas, todas geradas em canvas, em `textures-sertao.js`: barro rachado, cal encardida, telha capa-canal, capim seco e costelas do cacto.

### O que é compartilhado com a Mata

- **Arena:** cada fase tem a sua; ao trocar de fase, `main.js` copia o centro dela (`world.arena`) para `WORLD.arenaCenter`, que os chefes leem. O raio é o mesmo (12 m), e a câmera de chefe e as cinemáticas se montam pela linha herói → chefe, então servem às duas fases sem ajuste.
- **Pontos de partida:** cada mundo declara o início da trilha e a entrada da arena (`world.spawn`).
- **API do mundo:** a mesma de `world.js`, então `main.js` troca de fase só trocando o objeto `world`. Cada mundo fica num grupo próprio, e só o da fase escolhida aparece.
- **Atmosfera:** cada mundo declara a sua (`world.atmosphere`: noite e dia, `world.dawn` de 0 a 1). A Mata tem as duas iguais.
- **Tom do Silêncio:** o uniform `uSilent` (cor + brilho mínimo) vem de cada fase:
  - Mata: lilás claro, como antes.
  - Sertão: azul frio, sem clarear as sombras. Do contrário, a noite ficava lavada de lilás.

## Mortos-vivos (`web/src/morto.js`, `enemies.js`, `config.js`)

Variação do Fragmento do Silêncio: o mesmo Silêncio que junta lascas na Mata levanta os mortos do arraial.

**Modelo** (primitivas, animação procedural, como o Fragmento):

- ossada corcunda com trapos de couro e gibão rasgado nas costas;
- coração de lasca brilhando entre as costelas;
- olhos de fogo-fátuo, mandíbula solta, metade com chapéu de couro gasto;
- garras de lasca e quatro lascas do Silêncio orbitando os ombros.

**Animação:** andar arrastado mancando, braços erguidos de zumbi, garras ao alto no aviso e golpe de cima para baixo. Sai da cova arranhando a terra e tomba de cara no chão ao cair.

| | Morto-vivo do Silêncio | Morto-vivo em Brasa |
| --- | --- | --- |
| Quantos | 3 | 2 |
| Vida | 85 | 70 |
| Velocidade | 2,1 m/s (Fragmento: 2,5) | igual |
| Sai da cova | Herói a 6,5 m. Sobe em 1,5 s, sem levar dano nem colidir | igual |
| Golpe | Cone de 80°, 2,2 m; aviso de 1,05 s; 16 de dano; recupera em 1,3 s | igual |
| Ao cair | Desaba e afunda na terra | Arde 0,35 s, anuncia um círculo de 2,6 m por 1,2 s e explode: 18 de dano em quem ficar dentro |

Números em `MORTO` e `BRASA` (`config.js`): **proposta inicial, a validar**.

A morte do herói cancela a explosão pendente, e o reset devolve todos às covas. O laço do Vaqueiro só pega mortos já levantados. O berrante acorda os enterrados ao alcance.

Novas dicas na primeira vez:

- "Os mortos saem das covas quando você chega perto";
- "O morto-vivo em brasa vai explodir — saia do círculo!".

## Interface e áudio

- **Tela de título:** a escolha de fase substitui o botão avulso "Chefe: Mula sem Cabeça". Título, frase, nome da missão e barra de memória ("Memória do Sertão") seguem a fase.
- **Nomes sob os inimigos:** cada um mostra o próprio nome; os enterrados ficam sem nome até saírem.
- **Áudio do Sertão:**
  - Ambiente: grilos e, de vez em quando, o grito rasgado da coruja, mais frequente nas áreas sem cor.
  - Berimbau: mais lento (76 bpm) e um tom abaixo.
  - Efeitos novos: terra rompendo e ossada desabando.

## Verificação

`node tools/shot-sertao.mjs` (Chrome headless, `__baoba.advance`) grava `Evidence/sertao-*.png` e `Evidence/sertao-browser-checks.json`. Confere:

- a escolha da fase na tela de título (mundo, chefe e título);
- início com 5 mortos enterrados e sem alvo;
- saída da cova;
- golpe em cone de 16;
- desabamento;
- explosão da brasa: 18 dentro do círculo, 0 fora;
- cordel lido e portão aberto;
- cinemática da Mula no terreiro e luta com a arena fechada;
- amanhecer e memória final;
- tela de conclusão;
- volta à Mata Viva com Fragmentos, Curupira e céu da fase 1.

`tools/shot-mula.mjs` e `tools/shot-tiles.mjs` foram ajustados: o botão da Mula saiu, e agora usam `__baoba.startMula()`, que abre o Sertão já no checkpoint do terreiro.

## Limites e decisões em aberto

- **Números:** mortos-vivos, explosão e quantidade de inimigos são proposta. A Mula continua com os números de [22](<22 - Mula sem Cabeca producao e integracao.md>), também proposta.
- **Modelo dos mortos-vivos:** feito de primitivas, como o Fragmento, e não pelo pipeline Lunia ([18](<18 - Pipeline de personagens estilo Lunia.md>)). Para o acabamento dos heróis, seriam precisas referências próprias (frente, lado, costas) e o pipeline de personagem.
- **Desempenho:** medido só em renderização por software (SwiftShader). A noite tem até 7 luzes pontuais (candeeiros e memórias) e duas lâminas de neblina transparentes. Falta medir numa GPU real.
- **Sem playtest humano:** a legibilidade dos avisos na noite e a dificuldade da estrada com 5 inimigos estão por avaliar.
- **Revisão cultural (D08):** pendente para o cemitério, os mortos-vivos e a Mula antes de divulgação.
