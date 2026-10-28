# Especificações técnicas — P0

v0.2 · 24/10/2026. Limites de projeto propostos, não resultados de benchmark. Escopo no 01; aparência no 05; câmera/movimento no 08.

## 1. Base e arquitetura mínima

Unity 6 com URP é a continuidade proposta do planejamento anterior. Fixar a versão exata instalada após um teste de build; não presumir a versão mais recente ou disponibilidade de plugins. Windows x64, uma cena de Sala de Estilo e uma cena de jogo. Sem rede ou serviços externos em tempo de execução.

Separar responsabilidades em componentes pequenos: entrada, movimento, seleção, combate/vida, estados do inimigo, objetivo/checkpoint, apresentação e interface. Regras numéricas simples podem ficar em classes C# testáveis; não construir um servidor, ECS ou framework de simulação independente para justificar um único encontro.

Dados de combate em um arquivo JSON versionado por categoria, importados para estruturas tipadas e validados no carregamento. Scripts não devem manter cópias divergentes dos números. O documento 03 é a especificação; o JSON implementa essa versão e registra sua revisão. Rejeitar IDs duplicados, valores negativos e durações inválidas com erro legível.

Atualização de movimento com passo fixo de física proposto de 0,02 s; timers usam tempo de jogo em segundos. Interpolação visual suaviza movimento. Input capturado a cada frame; nenhuma promessa de determinismo de rede. A lógica de impacto é autoridade; eventos de animação servem para som/VFX e não aplicam dano novamente.

## 2. Renderização hand-drawn viável

Começar com um material toon simples para malhas opacas: cor pintada e duas faixas de iluminação. Escolher shader existente compatível ou implementação pequena após prova de importação. Nenhum pacote de toon em preview é dependência obrigatória.

Contorno do personagem: casco invertido ou solução equivalente já validada. Meta visual aproximada de 2–3 px a 1080p no zoom padrão, ajustável por material; pixels constantes precisam de implementação específica, não surgem automaticamente de uma extrusão em metros. Conferir custo do passe extra e falhas em articulações.

Linhas internas e pinceladas pertencem ao atlas com UVs próprios. **Não colapsar os UVs do corpo em células de paleta** e depois esperar costuras ou pintura local. Paleta pode existir como ferramenta de seleção de cores, mas a textura pintada precisa de coordenadas de superfície utilizáveis.

Sem normal map, displacement, cabelo por fio, reflexos de tela, hachura temporal ou contorno global obrigatório. Uma luz direcional, ambiente e sombras simples. Um período do dia. Corrupção por parâmetro/material só nos objetos marcados; preservar herói, HUD e avisos. Alpha clip para folhagem quando necessário; minimizar transparências sobrepostas.

Se o contorno não funcionar em uma sessão de investigação, manter material pintado para continuar o combate e registrar o defeito; o marco visual continua aberto até corrigir ou adotar alternativa aceita. Falha de shader não justifica redefinir a arte como concluída.

## 3. Orçamentos iniciais

| Elemento | Limite de trabalho do P0 | Observação |
| --- | --- | --- |
| Guardião completo, com lança e escudo | Até 15.000 triângulos | Conta roupa e cabelo; até 3 materiais no conjunto |
| Curupira | Até 12.000 triângulos | Até 3 materiais; esqueleto próprio se necessário |
| Fragmento | Até 1.500 triângulos | 1 material; sem skinning |
| Árvore comum / marco | Até 2.000 / 6.000 triângulos | Considerar folhagem na contagem |
| Pedra, raiz ou módulo de passarela | Até 1.000 triângulos por design | Reuso de atlas |
| Texturas do herói / chefe | Até 1024² por atlas | Aumentar apenas com problema visível documentado |
| Atlas de cenário / folhagem | Até 2048² / 1024² | Mipmaps; padding compatível com redução |
| UI | Atlas até 1024² inicialmente | Sem mipmaps, texto renderizado como texto |
| Cena visível | Referência de até 250 mil triângulos e 300 draw calls | Inclui passes extras; medir, não garantia de FPS |
| Partículas simultâneas | Até 200 | Priorizar leitura da mecânica |

P0 usa um LOD por asset e enquadramento limitado. LODs adicionais entram somente se a medição justificar, não como requisito de cada export. Nenhum número mobile é critério de aceite atual. Limites de triângulos não substituem medir CPU, GPU, memória e overdraw.

## 4. Personagens, rig e animação

1 unidade = 1 metro; frente +Z e cima +Y no Unity; pivô no chão. Herói de 1,80 m com tolerância de 2% na exportação. Máximo de quatro influências por vértice e pesos normalizados. Roupa/cabelo separados são permitidos, mas membros não devem parecer segmentos rígidos soltos.

Não congelar contagem arbitrária de ossos. Primeiro validar hierarquia, articulações e mapeamento. Herói pode usar Humanoid; Curupira pode usar rig Generic pela orientação dos pés. Ambos exigem revisão visual; retargeting não garante anatomia correta.

Autoria a 30 FPS como convenção, locomoção no lugar; o controlador move o personagem. Não impor número fixo de quadros ao ciclo sem conferir velocidade e contato dos pés. Q, defesa e ataques precisam acompanhar os tempos de 03; poses e loops acomodam preparação e recuperação. Cabelo sem física no P0. Rosto simples sem rig facial.

## 5. Formatos e fontes

Fontes `.blend`, imagens editáveis quando disponíveis e PNG; exportar FBX para personagens, animações **e objetos estáticos** neste P0. Isso evita adicionar importador glTF só para objetos pequenos. Avaliar GLB depois, se houver benefício concreto.

Cores em sRGB; máscaras em linear; texturas 3D com mipmaps. Definir compressão pela build real e conferir perda de linhas finas. Não comprimir agressivamente o rosto antes da comparação visual. Registrar configuração de importação nos assets versionados.

Estrutura proposta, ainda não criada:

```text
Assets/Baoba/Scenes/
Assets/Baoba/Scripts/
Assets/Baoba/Data/
Assets/Baoba/Art/Characters/
Assets/Baoba/Art/Environment/
Assets/Baoba/Art/Materials/
Assets/Baoba/UI/
Assets/Baoba/Audio/
SourceArt/
Evidence/
```

Manter `.meta` da Unity junto dos arquivos. Fontes binárias grandes em Git LFS quando Git estiver configurado. Não versionar `Library`, `Temp`, caches ou builds como se fossem fontes. Não há repositório Git demonstrado neste workspace; configurar é tarefa futura.

## 6. Medição de desempenho

Meta provisória: 60 FPS em 1920×1080 na máquina-alvo a definir em D04, com p95 de tempo de quadro até 20 ms e sem pausas recorrentes acima de 50 ms durante combate. 60 FPS corresponde a aproximadamente 16,7 ms por quadro; o p95 permite pequenos picos, não substitui registrar a distribuição.

Procedimento: registrar CPU/GPU/RAM, versão de build, resolução e qualidade; aquecer 30 s; capturar pelo menos 120 s com deslocamento e repetição do chefe em executável, não apenas no editor. Registrar mediana, p95, maior pico, uso de memória e observações. Distinguir build de desenvolvimento com profiler de build de entrega.

Se falhar: reduzir vegetação, transparência, sombras e passes; repetir a mesma rota. Não degradar telegráficos para mascarar custo de decoração. Sem hardware registrado, resultado é “medido na máquina de desenvolvimento”, nunca “PC mínimo aprovado”.

## 7. Verificação técnica mínima

Importação: escala, material, orientação, clips e ausência de malha rosa/ausente. Personagem: ombros, cotovelos, quadril, joelhos e pegada. Cena: câmera/colisão, navegação e bordas. Combate: casos do 03. Fluxo: começar, morrer, pausar, reiniciar e concluir.

Testes automatizados focam dano único, recargas, interrupção, pausa e reset; testes visuais focam aparência e legibilidade. Não exigir teste automatizado de toda pequena alteração decorativa. Armazenar falhas e evidências com versão; checklist preenchido sem executar não vale como teste.
