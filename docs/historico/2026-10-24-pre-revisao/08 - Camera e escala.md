# Câmera e escala do personagem

A câmera segue o modelo do Tarisland: terceira pessoa livre, que vai do close atrás do personagem até uma visão alta quase isométrica, com opção de câmera fixa. Os personagens são estilizados, com proporções heroicas que se leem bem numa tela de celular.

## 1. O que a pesquisa mostrou sobre o Tarisland

O Tarisland usava câmera de terceira pessoa com zoom livre, controles de MMO clássico no PC e dois joysticks no celular, com visual estilizado na linha do WoW. A tabela resume o que análises e guias publicados registram.

| Aspecto | O que se sabe do Tarisland | Fonte |
| --- | --- | --- |
| Câmera | Gira livremente, do close em terceira pessoa até uma visão afastada em estilo isométrico; existe opção de câmera fixa | [TapTap](https://www.taptap.io/post/6555708) |
| Controles no PC | WASD move; segurar o botão direito do mouse gira a câmera | [The Tank Club](https://thetankclub.com/tarisland-complete-beginners-guide/) |
| Controles no celular | Joystick esquerdo move e joystick direito gira a câmera; habilidades e pulo no canto inferior direito; na corrida automática, a câmera guia o caminho | [Pocket Gamer](https://www.pocketgamer.com/tarisland/review/) |
| Ajustes | Tremor de tela ajustável; modo foto com câmera posicionável | [The Tank Club](https://thetankclub.com/tarisland-complete-beginners-guide/), [Prima Games](https://primagames.com/?p=269176) |
| Estilo visual | Estilizado, colorido e cartunesco, comparado ao WoW; NPCs em estilo fofo | [TapTap](https://www.taptap.io/post/6555708), [Pocket Gamer](https://www.pocketgamer.com/tarisland/review/) |
| Críticas | Poucas opções de configuração; um esquema em que o cursor define a direção confundiu quem lutava corpo a corpo; customização de personagem limitada | [The Ancient Gaming Noob](https://tagn.wordpress.com/2024/06/22/tarisland-i-hate-it-already/) |

**Limite desta pesquisa:** não consigo assistir a vídeos, então os dados acima vêm de textos. Como os servidores do Tarisland foram desligados em 4 de novembro de 2025, a equipe de arte deve medir as proporções em gravações arquivadas, como o [vídeo de configurações de câmera](https://www.youtube.com/watch?v=NcQ1QbiXWEs), e comparar com os números da seção 2.

### O que levamos do Tarisland

- Zoom livre do close ao quase isométrico, com câmera fixa opcional.
- Dois joysticks no celular, com habilidades no canto inferior direito.
- Visual estilizado de proporções heroicas.

### O que fazemos melhor

- Mais ajustes de câmera: distância, sensibilidade, inversão, alinhamento automático e tremor.
- Modo clássico de MMO como padrão no PC; o modo ação, em que o cursor define a direção, fica opcional.
- Customização rica de corpo e cabelo, já prevista na seção 9 do Game Design.

## 2. Especificação da câmera

Na distância padrão, o personagem ocupa cerca de um quarto da altura da tela, tanto no PC quanto no celular. A câmera orbita um pivô na altura do peito e muda de inclinação conforme o zoom.

&#91;embedded content: geometria da câmera · três posições do zoom\]

| Parâmetro | PC | Celular | Observação |
| --- | --- | --- | --- |
| Tipo | Terceira pessoa em órbita | Igual | Três anéis (perto, padrão, distante) interpolados |
| Pivô | 1,6 m acima dos pés, centralizado | Igual | Personagem centralizado, sem câmera de ombro |
| Distância padrão | 8 m | 9 m | O celular compensa a tela menor com campo de visão mais estreito |
| Zoom mínimo | 3 m | 4 m |  |
| Zoom máximo | 25 m | 20 m | Visão quase isométrica |
| Inclinação para baixo | 10° perto, 20° padrão, 55° distante | 12°, 25°, 55° | Interpola com o zoom |
| Campo de visão vertical | 50° (cerca de 79° na horizontal em 16:9) | 45° (cerca de 84° na horizontal em 19,5:9) |  |
| Girar a câmera | Botão direito gira câmera e personagem; botão esquerdo gira só a câmera | Arrastar na metade direita da tela ou joystick de câmera | Sensibilidade e inversão ajustáveis |
| Zoom | Roda do mouse | Pinça com dois dedos |  |
| Alinhamento automático | Desligado | Liga após 1,0 s andando sem tocar na câmera, a 90°/s | Pode ser desligado |
| Colisão | Raio de 0,3 m; aproxima até o zoom mínimo; objetos pequenos ficam translúcidos | Igual | Outros jogadores não colidem com a câmera |
| Suavização | 0,10 s na posição | 0,15 s |  |
| Tremor de tela | 0 a 100%, padrão 50% | Igual | 0% no modo acessibilidade |

### Tamanho do personagem na tela

| Zoom | PC | Celular |
| --- | --- | --- |
| Mínimo | 64% da altura da tela | 54% |
| Padrão | 24% | 24% |
| Máximo | 8% | 11% |

Os valores vêm da altura visível na distância da câmera, onde *d* é a distância e θ o campo de visão vertical; o personagem tem 1,8 m:

```latex
h = 2\,d\,\tan(\theta/2)
```

## 3. Modos de câmera

O jogador escolhe o modo nas configurações; os modos de colosso, montaria e interiores entram sozinhos e devolvem o controle ao sair da situação.

| Modo | Quando | Comportamento |
| --- | --- | --- |
| Clássico (padrão no PC) | Sempre, até o jogador trocar | Estilo WoW: botão direito gira câmera e personagem, botão esquerdo só a câmera (no Tarisland, o botão direito também girava a câmera) |
| Ação (opcional) | Escolha do jogador | O cursor some e a câmera segue o mouse; o personagem olha para onde a câmera aponta |
| Fixa (opcional) | Escolha do jogador | Ângulo e distância travados atrás do personagem ou em visão alta; só o zoom muda |
| Celular (padrão no celular) | Sempre no celular | Dois joysticks; alinhamento automático atrás do personagem; corrida automática guiada pela câmera |
| Colosso | Ao entrar no encontro com um colosso | Afasta para 18 a 25 m e inclina 30°; enquadra o jogador e a cabeça do chefe ao mesmo tempo; volta ao zoom anterior em 1,5 s ao sair |
| Montaria | Ao montar | +2 m de distância e +5° de campo de visão para dar sensação de velocidade |
| Interiores | Em corredores e salas marcados pelo level design | Distância máxima limitada a 6 m para a câmera não atravessar o teto |
| Foto | Pelo menu | Câmera livre, interface oculta, poses e montaria, como o modo foto do Tarisland |

**Regra para combate:** a câmera nunca trava sozinha no alvo. Um botão opcional "Olhar para o alvo" gira a câmera até o inimigo selecionado, útil para virar rápido no celular.

## 4. Escala e proporções do personagem

O personagem tem 1,80 m no mundo do jogo (1 unidade = 1 metro) e proporções heroicas estilizadas: maior e mais legível que um humano real, mas sem a cabeça gigante do estilo chibi.

| Item | Especificação |
| --- | --- |
| Altura base | 1,80 m; ajuste de 1,65 a 1,95 m na criação |
| Caixa de colisão | Cápsula de 1,80 m de altura e 0,40 m de raio para todos, qualquer que seja a aparência, para o PvP ser justo |
| Proporção | Cerca de 7 cabeças de altura |
| Exageros | Mãos e pés 20% maiores; ombros 15% maiores nas armaduras pesadas; armas entre 120% e 130% do tamanho real |
| Silhueta | Cada classe precisa ser reconhecível só pela silhueta no zoom máximo (8% da altura da tela no PC) |
| Cor | Cor dominante da classe no tronco e nos ombros, a parte mais visível de cima |
| Polígonos (orçamento inicial) | Jogador: 15 mil triângulos no PC e 7 mil no celular; colosso: 60 mil no PC e 25 mil no celular (Especificações técnicas) |
| Níveis de detalhe | 3 níveis de malha (LOD0, LOD1, LOD2), seguidos de ocultação ou silhueta simples; calibrar troca pelo tamanho na tela |
| Cabelo | Volumes sólidos para tranças, locs e demais estilos; ossos adicionais com simulação leve opcional, desligável no mobile |
| NPCs | Podem ter proporções mais caricatas, como no Tarisland, desde que respeitem as diretrizes de representação da seção 8 do Game Design |

O tamanho dos chefes segue a escala colossal da seção 12 do Game Design: colossos de raide de 25 a 60 m e titãs mundiais acima de 80 m.

## 5. Métricas de mundo para level design

Todo cenário é construído com as medidas abaixo, derivadas do personagem de 1,80 m e da câmera padrão de 8 m; quem foge delas precisa justificar na revisão de nível.

| Métrica | Valor | Por quê |
| --- | --- | --- |
| Corredor de exploração | Mínimo de 4 m de largura | Dois jogadores lado a lado e espaço para a câmera girar |
| Corredor de masmorra | Mínimo de 6 m de largura | 5 jogadores e lacaios sem engarrafar |
| Pé-direito em masmorras | Mínimo de 6 m | A câmera padrão não bate no teto; abaixo disso, usar o modo Interiores |
| Portas | 3 m de largura e 3,5 m de altura | Montarias não passam; jogadores passam com folga |
| Degrau | 0,25 m; subida automática até 0,5 m |  |
| Rampa | Até 45° é contínua; acima disso, desliza |  |
| Pulo | 1,2 m de altura e 3,5 m de distância |  |
| Velocidade | Andar 2,5 m/s; correr 7 m/s; montaria 14 m/s | Corrida perto do padrão de MMOs clássicos; montaria com o dobro |
| Alcances | Corpo a corpo 5 m; distância 35 m; cura 40 m; seleção de alvo 40 m; interação 4 m | Casam com o campo de visão da câmera padrão |
| Raios padrão de área | 5, 8 e 12 m | Os mesmos usados nos Encontros (Espalhar a 8 m, Grilhão a 6 m) |
| Arena de chefe de masmorra | 40 a 50 m de diâmetro |  |
| Arena de raide | 60 a 80 m |  |
| Arena de colosso | 100 a 150 m | Espaço para a câmera de colosso e para os golpes de 15 m |
| Área de chefe mundial | 200 m ou mais | Até 40 jogadores |
| Área da Batalha pelo Baobá | 120 m de diâmetro | 20 contra 20 com rotas de flanco |

## 6. Como validar na prática

Os números acima são o ponto de partida; eles só viram regra depois de medidos numa cena de teste e comparados com gravações do Tarisland.

1. Montar a **Sala de Medidas** no Unity: cena cinza com marcas a cada 1 m, portas, corredores, escadas e uma silhueta de colosso de 40 m.
2. Configurar a câmera com os valores da seção 2, usando Cinemachine com três anéis de órbita.
3. Capturar a tela em cada zoom num monitor 1080p e num celular de 6,1 a 6,7 polegadas; medir a altura do personagem em pixels e comparar com a tabela (24% no padrão).
4. Comparar quadro a quadro com gravações arquivadas do Tarisland na mesma situação (cidade, masmorra, chefe) e ajustar distância e inclinação até o enquadramento bater.
5. Testar com 10 jogadores de PC e 10 de celular: eles encontram o próprio personagem num grupo de 20 e leem os telegráficos no zoom padrão?
6. Congelar os valores numa planilha de configuração (Luban, aba Ferramentas), para que design e programação usem a mesma fonte.

## Fontes

- [TapTap: análise do teste fechado do Tarisland](https://www.taptap.io/post/6555708)
- [Pocket Gamer: análise do Tarisland](https://www.pocketgamer.com/tarisland/review/)
- [The Tank Club: guia para iniciantes do Tarisland](https://thetankclub.com/tarisland-complete-beginners-guide/)
- [The Ancient Gaming Noob: impressões do Tarisland](https://tagn.wordpress.com/2024/06/22/tarisland-i-hate-it-already/)
- [Prima Games: modo foto do Tarisland](https://primagames.com/?p=269176)
- [YouTube: como mudar as configurações de câmera no Tarisland](https://www.youtube.com/watch?v=NcQ1QbiXWEs)
