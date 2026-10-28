# Baobá — Game Design do protótipo P0

v0.2 · 24/10/2026 · Proposta de execução a partir da direção confirmada no [índice](README.md).

## 1. Experiência desejada

Um RPG 3D em terceira pessoa: escolher um inimigo, ler sua preparação, se posicionar, defender, interromper e atacar. O mundo parece uma ilustração em movimento, com personagens expressivos, massas de cor pintadas e contornos de tinta.

Tarisland e WoW orientam a intenção de combate e câmera; Grand Chase orienta a intenção artística. Essas referências não exigem reproduzir seus sistemas completos. A seleção visual exata está pendente no documento 02.

**Promessa do P0:** recuperar uma memória devolve cor à mata. O jogador enfrenta a corrupção de um guardião e o liberta. O tema deve aparecer numa ação e numa transformação visível, além do texto.

**Classes (confirmado, 26/10/2026):** Vaqueiro (Tanker), Capoeirista (DPS Melee), Cangaceiro (DPS Ranged), Maloka ou Mateiro (DPS Stealth) e Benzedeiro ou Pajé (Healer). Descrições no [documento 19](<19 - Classes.md>). O P0 usa só o Capoeirista; as demais entram quando o escopo crescer.

## 2. Pilares verificáveis

1. **3D de verdade:** personagem, cenário e inimigos têm volume, profundidade, colisão e podem ser observados por uma câmera orbital. Sprites ficam em interface e efeitos.
2. **Mecânicas legíveis:** ataques importantes avisam antes de causar dano; mover e interromper mudam o resultado.
3. **Desenho consistente:** personagem, vegetação, chão e efeitos compartilham paleta, traço e sombreamento; não basta colocar contorno num modelo genérico.
4. **Identidade de Baobá:** Mata Viva, Ecos, Silêncio e libertação do Curupira; manter diversidade humana e origem das referências.
5. **Produção pequena:** repetir um kit validado, com automação para tarefas repetitivas e revisão visual para aparência e animação.

## 3. Escopo fechado proposto

| Área | Entra no P0 | Adiado |
| --- | --- | --- |
| Entrega | Executável local para Windows, mouse/teclado, PT-BR | Steam, launcher, navegador, Android/iOS, controle |
| Personagem | Uma classe jogável: **Capoeirista** (DPS Melee), fixa | As outras quatro classes de [19 — Classes](<19 - Classes.md>), criador, equipamentos intercambiáveis |
| Mundo | Um trecho da Mata Viva, entrada, trilha e clareira final | Mundo aberto, cidade, outras regiões, viagens |
| Combate | Ataque básico, golpe de escudo interruptor, defesa e esquiva | Talentos, suprema, crítico, ameaça, trindade e builds |
| Inimigos | Uma criatura original de Silêncio e um Curupira | Bestiário, masmorra de três chefes, colossos |
| Narrativa | Objetivo curto e uma memória recuperada | Prólogo aquático, campanha de 50 níveis, diálogos ramificados |
| Progresso | Checkpoint da arena em memória durante a sessão | XP, inventário, loot aleatório, save em disco |
| Social | Solo offline | Companheiros, coop, MMO, PvP, guildas e economia |
| Apresentação | HUD, pausa, derrota, vitória, áudio funcional | Dublagem, cinemáticas, minimapa e música adaptativa |

P0 testa a base, não comprova viabilidade de MMO, balanceamento de grupo ou desempenho mobile. Multiplayer futuro exigirá um protótipo próprio; reaproveitar código não elimina esse trabalho.

## 4. Sessão — O Eco da Mata

| Trecho | Meta de tempo, a medir | O jogador faz |
| --- | --- | --- |
| Entrada | 1–2 min | Lê “O Silêncio tomou a clareira. Liberte a memória da mata”, aprende movimento e observa um marco |
| Trilha | 2–3 min | Enfrenta 3 criaturas em pontos separados; aprende alvo, dano e desvio |
| Vestígio | 1 min | Interage com um objeto de memória e vê uma pequena faixa da mata recuperar cor |
| Clareira | 3–6 min, incluindo aprendizado e eventual repetição | Enfrenta o Curupira, aprende cone, área e interrupção |
| Libertação | 1 min | Vê a cura, recupera a memória final e encontra a tela de conclusão |

10–15 minutos é uma hipótese de primeira sessão, não duração mínima obrigatória. Uma luta bem executada dura cerca de 60–90 s; não aumentar vida ou deslocamento só para preencher tempo. A soma será ajustada com testes.

Fluxo: iniciar → trilha → vestígio → checkpoint → chefe → libertação → concluir/reiniciar. O acesso ao chefe exige o vestígio e os três inimigos derrotados; o HUD informa o requisito que falta. O portão é uma barreira simples de cipós que se dissolve, sem quebra-cabeça adicional.

## 5. Combate e entrada

Alvo assistido preserva a intenção de RPG com seleção. Tab percorre inimigos vivos visíveis até 12 m, ordenados por ângulo em relação à câmera e depois distância. Sem alvo, atacar seleciona o mais próximo à frente dentro de 6 m e cone de 90°. Não ataca através de obstáculos nem caminha automaticamente para alcançar o alvo. A câmera não trava no inimigo.

| Entrada | Ação |
| --- | --- |
| WASD | Movimento relativo à câmera; sem entrada diagonal mais rápida |
| Botão direito segurado + mouse | Orbitar câmera; soltar libera cursor |
| Roda | Zoom dentro dos limites do documento 08 |
| Tab | Selecionar/trocar alvo; marcador e barra deixam a seleção clara |
| Botão esquerdo | Uma estocada por clique; sem combo ou ataque automático |
| Q | Golpe de escudo: dano e interrupção quando disponível |
| E segurado | Defesa frontal |
| Shift + direção | Esquiva; sem direção, para trás do personagem |
| Espaço | Pulo simples; não evita dano por si só |
| F | Interagir com memória/ponto final a até 2 m |
| Esc | Pausar e abrir menu; pausar congela combate e recargas |

Ao iniciar um ataque, o personagem olha para o alvo se estiver no alcance e linha de visão. Fora de alcance, mostrar indicação e não gastar recarga. Dano é aplicado uma única vez no instante previsto, com nova checagem de alcance. Números, cancelamentos e prioridades estão no documento 03.

## 6. Estado, derrota e recompensa

Na trilha, derrota reinicia a trilha com seus inimigos e vestígio restaurados ao estado inicial. Ao entrar na clareira, registrar checkpoint em memória. Derrota no chefe retorna à entrada da arena com vida e recargas restauradas, corrupção do chefe cheia e nenhum perigo residual; os objetivos da trilha permanecem completos. Sair do executável perde esse progresso, informado no menu.

O Curupira tem barra de **Corrupção**. Ao zerar, para de atacar, recupera cor e fica aliado, sem cadáver ou saque. A memória final é um objetivo, não item de inventário. Após a interação, exibir “Memória restaurada” e opções de reiniciar ou sair. Repetir a interação não duplica a conclusão.

Texto provisório da memória: “A mata lembra de quem cuida dela.” É ficção do jogo; não atribuir como citação a povos ou tradições reais.

## 7. Interface, áudio e acessibilidade

HUD: vida do jogador, alvo/corrupção, Q e Shift com recarga, estado da defesa e objetivo atual. Uma dica por vez. Sem barra de MMO vazia com nove espaços. Textos mínimos de 18 px a 1080p; perigo comunicado por contorno, preenchimento e ícone, além da cor.

Sons distinguem preparação, impacto, interrupção, erro de alcance e restauração. Toda pista necessária também é visual. Volume ajustável e tremor desligado por padrão. A corrupção afeta materiais do cenário e do chefe, preservando HUD e tom de pele do herói.

## 8. Narrativa e representação

A cosmologia das Duas Margens, Mar de Kalunga, Eco e Grande Silêncio permanece no histórico para expansão. No P0, explicação curta e local: algo apagou a memória da clareira; recuperar o Eco desfaz a corrupção.

Curupira mantém pés invertidos, cabelo de fogo estilizado e papel de protetor. **Duas formas (decisão do usuário, 26/10/2026):** corrompido, ele é um **monstro** de 3 m (o chefe), deformado pelo Silêncio; liberto, volta à **forma humanizada** (2,1 m) e vira aliado. O monstro é a corrupção de um protetor, não um demônio genérico: sem chifres, asas, cauda, fogo infernal ou símbolos religiosos. Religiões vivas e objetos sagrados não entram como inimigos ou recompensas. Não misturar padrões culturais aleatórios para preencher textura. Conteúdo específico deve ter origem registrada e revisão antes de divulgação; o blockout pode avançar com formas neutras.

## 9. O que aprova o P0

- Executável inicia, conclui e reinicia sem depender do editor ou de conexão.
- Jogador consegue selecionar, atacar, desviar, defender e interromper com feedback consistente.
- Três testes completos consecutivos sem travamento de missão, dano duplicado ou perigos após reset.
- A câmera mantém personagem, chefe e área de perigo legíveis durante a luta.
- Capturas e vídeo mostram o estilo no jogo; direção confirma proximidade com as referências escolhidas.
- Teste exploratório com 3–5 pessoas: pelo menos 3 de 5 (ou 2 de 3) identificam sem explicação externa o objetivo e a resposta a duas mecânicas. Registrar também quem falhou e por quê; amostra pequena não comprova mercado.
- Desempenho registrado conforme 07; se a máquina-alvo não foi definida, resultado permanece “não validado no alvo”.

Nada acima foi implementado ou medido nesta revisão. A sequência de construção está no documento 10.
