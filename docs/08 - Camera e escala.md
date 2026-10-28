# Câmera e escala — P0

v0.2 · 24/10/2026. Valores iniciais próprios do protótipo, **não medidas extraídas de Tarisland ou WoW**. A intenção é terceira pessoa orbital com leitura de mecânicas.

## 1. Um modo de câmera

| Parâmetro | Padrão proposto |
| --- | --- |
| Projeção | Perspectiva, terceira pessoa centralizada |
| Pivô | 1,3 m acima dos pés |
| Distância | Padrão 7 m; zoom de 4 a 10 m |
| Campo de visão | 50° vertical |
| Inclinação | Padrão 20° para baixo; controle de 10° a 45° |
| Órbita | Botão direito segurado + mouse; yaw livre |
| Zoom | Roda do mouse, suavizado |
| Seguimento | Suavização inicial de 0,10 s; medir sensação |
| Colisão | Sphere cast com raio inicial de 0,25 m, do pivô à posição desejada |
| Tremor | Desligado no padrão |
| Alvo | Não trava câmera automaticamente |

Colisão pode aproximar a câmera **abaixo do zoom mínimo manual** para evitar atravessar paredes. Até 0,5 m do pivô como limite de segurança inicial; se o espaço não permitir, corrigir o cenário. Ignorar o collider do próprio jogador. Recuperar distância gradualmente quando o obstáculo sair. Não acrescentar sistema genérico de transparência de todas as árvores no P0; usar copa alta, composição e colisão.

Sem modo foto, colosso, montaria, câmera fixa opcional ou troca cinematográfica. O chefe de 3 m cabe na mesma câmera de jogo. A luta não deve obrigar o usuário a refazer zoom a cada ataque.

## 2. Presença na tela

Para uma estimativa frontal simplificada de objeto centrado e sem inclinação: fração vertical ≈ altura / (2 × distância × tan(FOV_vertical/2)). Com 1,80 m, 7 m e 50°, dá aproximadamente **27,6%**. A inclinação, o pivô e a profundidade dos pontos do modelo alteram o resultado; a fórmula não substitui captura real.

Meta visual inicial: herói com aproximadamente 22–30% da altura da tela na câmera padrão, vendo chão suficiente para reagir. Medir cabeça até pés em pixels/altura do frame. Não extrapolar porcentagens exatas para zoom/inclinação diferentes sem projetar ou capturar o modelo.

Testar em 1920×1080 e 1280×720, mesma proporção 16:9; verificar recorte e HUD em 21:9 se disponível. Suporte completo a tablets e mobile fica adiado.

## 3. Movimento e escala

| Item | Valor proposto |
| --- | --- |
| Altura / proporção do herói | 1,80 m; 6,5–7 cabeças, sujeito à referência |
| Cápsula do herói | Altura 1,80 m; raio 0,35 m |
| Movimento normal | 5 m/s, sem tecla de sprint |
| Giro | Até 540°/s ao orientar locomoção; direção do ataque segue 01/03 |
| Pulo | Altura-alvo 0,9 m; gravidade inicial −20 m/s² |
| Velocidade vertical inicial | Aproximadamente 6 m/s; calcular por sqrt(2 × gravidade absoluta × altura) |
| Degrau automático / rampa | Até 0,25 m / 35° |
| Interação | Até 2 m, com linha de visão |
| Curupira | Altura visual 3 m; colisão no documento 03 |

Com essa gravidade, tempo ideal no ar é aproximadamente 0,6 s; a 5 m/s, alcance horizontal ideal de 3 m antes de colisão. Sem duplo pulo, coyote time obrigatório, natação, escalada ou plataformas móveis. Deslocamento/defesa/esquiva seguem modificadores do 03; não duplicar números em animações.

As velocidades antigas de 7–8 m/s e cápsula de raio 0,40 m ficam no histórico. A redução aqui é deliberada para arena pequena e aprendizado; recalibrar com animação e sensação de controle.

## 4. Área jogável

Um envelope de aproximadamente **80 × 80 m**, com trilha curvada de 100–150 m e clareira de 24 m de diâmetro. Não significa preencher o quadrado inteiro com conteúdo. A trilha pode atravessar o envelope em curvas; não esticar o percurso para cumprir duração.

Caminho de pelo menos 4 m de largura; passarela de 3 m; vegetação de borda não invade área de ataque. Arena sem obstáculos altos no centro, chefe e telegráficos sempre visíveis. Barreiras naturais simples; evitar interiores e teto baixo, que exigiriam outro comportamento de câmera.

Sumaúma-marco visível da entrada e clareira. Não confundir árvore-marco com limite invisível de colisão. Use pedras/raízes para comunicar limites antes de bloquear o personagem.

## 5. Sala de Estilo e Medidas

A mesma cena do documento 05 inclui chão com marcações de 1 m, herói, alvo de 3 m, passarela, rampa, obstáculo atrás da câmera e círculo de perigo. Capturar câmera padrão, zooms extremos, perto da árvore e no ataque do chefe.

Aceite: sem atravessar chão/parede, sem oscilação persistente, herói visível, borda da área de perigo legível e alvo selecionado identificável. Rodar teste em movimento, na resolução real. Valores só passam de proposta a validados depois dessa evidência.
