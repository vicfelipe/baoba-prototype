# Encontros e combate — contrato P0

v0.2 · 24/10/2026. Fonte única dos números de combate. **Valores iniciais para teste**, não balanceamento validado. Movimento e câmera pertencem ao documento 08.

## 1. Regras comuns

Tempo em segundos de jogo, congelado na pausa. Usar estados explícitos; nenhuma regra de dano depende da taxa de quadros ou do número de chamadas de animação. Intervalos abaixo são contados desde a entrada no estado.

Cada ataque possui ID de execução e só aplica dano uma vez a cada alvo. Alcance corpo a corpo mede a menor distância horizontal entre as superfícies das cápsulas de colisão de combate; seleção usa distância entre centros. Obstáculos bloqueiam ataques. Áreas de chão atingem quando o disco horizontal da cápsula do jogador intersecta a forma anunciada, independentemente do pulo. A visualização precisa comunicar a borda real de colisão.

Regra de dano: se alvo válido, vivo, no alcance/área e sem invulnerabilidade ativa, aplicar dano base, multiplicado pela defesa quando cabível. Sem armadura, crítico, resistências, precisão, níveis ou dano aleatório. Vida nunca passa abaixo de zero.

## 2. Kit do Guardião

Vida: **100**. Sem mana ou stamina. A defesa é sustentada, mas reduz movimento; não causa dano passivo.

| Ação | Preparação / execução / recuperação | Resultado | Recarga / limite |
| --- | --- | --- | --- |
| Estocada | 0,20 / impacto único / 0,60 s | 20 de dano no alvo; alcance 2,6 m | Nova ação ofensiva após 0,80 s do início |
| Golpe de escudo (Q) | 0,15 / impacto único / 0,35 s | 40 de dano; alcance 2,6 m; interrompe conjuração marcada como interrompível | 5 s desde a aceitação do comando |
| Defesa (E) | Ativa após 0,10 s; termina ao soltar | Reduz em 70% golpes frontais bloqueáveis num arco total de 120° | Sem recarga; movimento a 40% da velocidade normal |
| Esquiva (Shift) | Deslocamento por 0,25 s; recuperação de 0,15 s | Até 3 m, parando em obstáculos; invulnerabilidade no intervalo [0,05; 0,25) s | 2,5 s desde a aceitação; não atravessa paredes |

Ataque e Q orientam o herói para o alvo no início, sem avançar; retestam alcance no impacto. Se o alvo sair, erram e a recuperação/recarga continuam. Ataque reduz movimento a 60% durante sua ação. Não há recarga global adicional.

Prioridade no mesmo instante: morte → esquiva → defesa → Q → estocada. Esquiva e defesa cancelam a estocada antes do impacto, eliminando seu dano; depois do impacto podem cancelar só a recuperação. Q não cancela estocada. Q só pode ser cancelado por morte, para evitar combinações de dano/defesa instantâneas. Defesa impede ataque e Q até soltar. Não enfileirar comandos; comando rejeitado dá feedback curto.

Durante pulo, movimento continua; não iniciar ataque, Q, defesa ou esquiva até aterrissar. Pulo não pode iniciar durante essas ações. Dano de área não é evitado por estar no ar. É mobilidade de exploração, sem mecânica de plataforma.

## 3. Inimigo comum — Fragmento do Silêncio

Criatura original, pequeno aglomerado de lascas e cinza, sem identidade de entidade cultural. Um prefab, três instâncias ao longo da trilha, no máximo duas em combate. Altura visual 1,2 m; colisão simples. **60 de vida**, deslocamento 2,5 m/s.

Estados: ocioso → perseguir → preparar → atingir → recuperar → perseguir; derrotado encerra tudo. Detecta até 7 m com linha de visão; retorna ao ponto inicial e restaura vida se o jogador se afastar mais de 12 m desse ponto. Navegação restrita ao chão navegável.

Ataque: a até 1,5 m entre superfícies, para, fixa direção, anuncia um cone de 70° e alcance 2 m por 1,0 s, aplica **15 de dano bloqueável**, recupera por 1,2 s. Não gira durante o aviso. Q causa dano, mas não interrompe esse ataque. Sua função é ensinar a sair do cone ou defender; não introduzir uma quarta mecânica.

## 4. Curupira — um encontro solo

Altura visual proposta: **3 m**. Cápsula de combate: altura 3 m e raio 0,65 m. **1.500 de Corrupção**. Arena circular de 24 m de diâmetro. É guardião corrompido, curado ao chegar a zero. Sem adds, fases extras, limite fatal de tempo ou transformação de escala.

Mover a até 2 m/s apenas em intervalos de perseguição. Ao entrar na arena: barreira fecha, barra aparece, chefe espera 2 s. Depois repete a sequência abaixo; nenhum ataque se sobrepõe. Os avisos começam ao entrar em cada estado, não num cronograma global independente.

| Ordem | Estado | Duração e regra | Dano / resposta |
| --- | --- | --- | --- |
| 1 | Aproximar | Até 3 s ou até alcance de 2,6 m; encerra o movimento | Dá tempo para o jogador se orientar |
| 2 | Pancada de cipó | Aviso 1,5 s; cone de 90°, alcance 4 m medido desde o centro do chefe, direção fixada no início | 25, bloqueável; sair pelos lados ou defender de frente |
| 3 | Recuperação | 2 s, sem ataque ou movimento | Janela livre de dano |
| 4 | Raiz cinzenta | Marca posição atual do jogador no chão; círculo de raio 2,5 m; aviso 2 s; centro não persegue | 30, não bloqueável; sair do círculo ou esquivar no impacto |
| 5 | Recuperação | 2 s | Janela de dano |
| 6 | Aproximar para conjurar | Até 3 s ou até alcance de 2,6 m | Evita exigir interrupção fora do alcance sem oportunidade |
| 7 | Chamado do Silêncio | Conjuração parada de 3 s com barra e ícone de escudo; interrompível por Q | Se terminar: pulso único de 20 em toda a arena, não bloqueável; esquiva evita no instante correto |
| 8 | Recuperação | 3 s se interrompido; 2 s se conjuração completou | Volta ao estado 1 |

A duração do ciclo varia com aproximação e interrupção. Cada recuperação começa depois de resolver ou cancelar a ação anterior. Q só interrompe o Chamado; usá-lo para dano pode deixá-lo indisponível, criando uma escolha. Na primeira ocorrência, mostrar “Q interrompe o Chamado — aproxime-se”. Falhar não deve encerrar automaticamente a luta.

## 5. Sinais, feedback e corrupção

Perigo: borda escura nítida, preenchimento crescente, ícone de impacto e som crescente. Conjuração: barra com ícone de escudo e texto “Interromper”. Defesa bem-sucedida: impacto no escudo e número reduzido. Interrupção: barra quebra e chefe recua. Golpe sem alcance: aviso junto da habilidade, sem deslocamento automático.

Paleta do cenário não deve encobrir telegráficos. Não usar somente vermelho/verde para distinguir respostas. Os efeitos respeitam o chão e os obstáculos; não desenhar aviso por cima do herói como efeito de tela cheia.

Corrupção zerada tem prioridade sobre ataques pendentes: cancelar áreas, desligar colisão ofensiva, bloquear dano e iniciar restauração de 2 s nos materiais afetados. O estado final é aliado. Guardar a escolha visual no mesmo modelo, sem duplicar chefe.

## 6. Reset e casos de borda

Morte do jogador cancela todos os avisos e impactos futuros antes do respawn. Voltar ao checkpoint recria estado inicial, posições, vida/corrupção e recargas. Pause congela preparação, invulnerabilidade e movimento. Vitória impede que uma ação atrasada cause derrota.

Se jogador sair da arena por falha de colisão, tratar como reset do chefe. Se cair do mundo, retornar ao checkpoint com o mesmo reset. Na trilha vale o reset inicial descrito no 01. Não há inimigos reaparecendo em áreas já completadas após checkpoint da arena.

## 7. Verificações de aceite

| Caso | Resultado esperado |
| --- | --- |
| Estocada em alcance válido | 20 de dano uma vez, mesmo com múltiplos colliders |
| Pancada defendida de frente | 7,5 de dano; manter valor fracionário internamente |
| Pancada pelas costas com defesa ativa | 25 de dano |
| Q durante Chamado | 40 de dano, conjuração cancelada, recuperação de 3 s |
| Q em recuperação/fora de alcance | Não interrompe nada / não consome recarga quando rejeitado no início |
| Sair do círculo antes do impacto | Zero dano; ficar na borda com cápsula sobreposta ainda conta |
| Cancelar estocada antes/depois do impacto | Zero dano / mantém o único dano já aplicado |
| Pausar, morrer ou curar durante aviso | Nenhum impacto indevido após pausa/reset/vitória |
| Jogar a 30 e 60 FPS | Mesmas durações e resultados dentro da resolução de atualização |

Estimativa para conferir ordem de grandeza: estocada contínua = 25 de dano/s; Q substitui parte desse tempo, não soma DPS livre. 1.500 de Corrupção permite aproximadamente 60–90 s com deslocamento e defesa, hipótese a medir. Se a luta ficar longa, ajustar Corrupção antes de cortar avisos. Se ficar fácil demais, observar compreensão e uso das respostas antes de adicionar mecanismos.
