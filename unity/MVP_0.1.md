# BAOBA — MVP 0.1: As Raízes de Aruanda

**Status:** escopo congelável após aprovação • **Engine:** Unity 6.3 LTS/C#/URP • **Owner:** Product + Game Design + Tech Lead.  
**Princípio:** uma vertical slice pequena e terminável é mais valiosa que seis regiões incompletas.

## 1. Visão e critérios de sucesso

Jogo 3D terceira pessoa, offline, 20–35 minutos, que demonstre exploração de Aruanda, combate e preservação das memórias da região. Jogador: **Guardião das Raízes**. Gancho narrativo: restaurar o fluxo de água/memória da vila após um desequilíbrio ficcional, sem representar tradições religiosas vivas como inimigos.

**Hipóteses:** locomotion/câmera agradáveis; combate com telegraph e contrajogo; loop falar→explorar→lutar→coletar→restaurar→recompensa claro; conteúdo adicionável por dados.

## 2. Escopo fechado

| Frente | Incluído no MVP | Fora do MVP |
|---|---|---|
| Mundo | uma área útil alvo ~512×512m; 5 zonas; 1 hub; 1 checkpoint | seis regiões, mundo procedural global |
| Jogador | humanoide placeholder/estilizado, walk/run/sprint/jump/dodge, câmera | criador completo, montarias |
| Classe | Guardião: 3 skills + light/heavy/block | todas as outras classes |
| Combate | 2 inimigos comuns, 1 mini-boss, AI e loot | PvP, raid, summons complexos |
| Narrativa | 1 cadeia principal de 4 etapas, 2 NPCs, 2 interações | centenas de quests, voice acting total |
| Sistemas | HP/Vigor/Raiz, níveis 1–5, 3 slots, 6 loots, 1 receita, save/load | mercado, guildas, housing, economias globais |
| Plataforma | Windows, teclado/mouse | mobile, consoles, multiplayer |
| Mídia | um passe visual estilizado, áudio funcional, HUD/menus | assets hero finais de todas as regiões |

Qualquer inclusão requer `CHANGE_REQUEST` com impacto de prazo, risco e teste. Não trocar escopo por arte bonita.

## 3. Jornada principal e pacing

| Etapa | Tempo-alvo | Objetivo do jogador | Ensino |
|---|---:|---|---|
| 1. Vila do Encontro | 0–5 min | falar com Cartógrafa | câmera, movimento, interação |
| 2. Passarela | 5–10 min | atravessar, coletar 3 amostras | coleta, perigos ambientais |
| 3. Mata | 10–20 min | vencer Cipó e Carapaça | light/heavy/block/dodge, lock-on |
| 4. Cataratas/Santuário | 20–35 min | enfrentar Raiz Petrificada, restaurar fluxo | mini-boss, recompensa, save |

Tolerar variação de tempo por habilidade/exploração. Caminho alto/longo/seguro e baixo/curto/hostil, convergindo no checkpoint.

## 4. Histórias de usuário e aceites testáveis

| ID | História | Critérios de aceite |
|---|---|---|
| US-001 | Como jogador, quero iniciar/continuar jogo | Menu Novo/Continuar; Continue habilitado somente com save válido; load sem crash |
| US-002 | Quero mover e enxergar personagem | walk/run/sprint/jump/dodge; câmera não atravessa objetos críticos; input não fica preso ao pausar |
| US-003 | Quero compreender ações disponíveis | HUD mostra HP/Vigor/Raiz/cooldowns; prompt de interação apenas em alcance |
| US-004 | Quero acertar inimigos previsivelmente | hit apenas em active frames/hitbox; sem duplicate hit; SFX/VFX claros |
| US-005 | Quero reagir ao perigo | ao menos 2 telegraphs distinguíveis; dodge/block funcionam nas janelas configuradas |
| US-006 | Quero inimigos coerentes | AI patrulha, detecta, ataca, retorna ao leash e morre sem soft-lock |
| US-007 | Quero completar missão | estados NotStarted/Active/Completed/Rewarded persistem; recompensa única |
| US-008 | Quero usar itens | coletar, empilhar, equipar e refletir stats no HUD; anti-dupe após load |
| US-009 | Quero ter progresso | XP nível 1–5; aumento de stats conforme configuração; inventário preservado |
| US-010 | Quero sobreviver a morte | HP=0→Death→respawn no checkpoint; sem perder itens por bug |
| US-011 | Quero ouvir a ambientação | rios/floresta/combate têm cues, volumes e sliders; telegraph não é apenas sonoro |
| US-012 | Quero acessar com clareza | legendas, tamanho de texto, redução shake, contraste/ícone além de cor |
| US-013 | Como QA, quero reproduzir bugs | seed/session/build version/log; cena sandbox para combate |
| US-014 | Como dev, quero criar conteúdo sem reprogramar | nova ability/item via Definition/validator, IDs estáveis |

## 5. Cenários BDD de referência

```gherkin
Feature: Conclusão idempotente de missão
  Given uma missão está Active e o jogador coletou 3 amostras
  When o jogador entrega as amostras ao NPC
  Then a missão passa a Completed e concede uma única recompensa
  When o jogador salva, carrega e interage novamente
  Then a recompensa não é concedida outra vez

Feature: Janela de esquiva
  Given um inimigo inicia golpe telegráfico
  When o jogador esquiva durante a janela de invulnerabilidade
  Then não recebe dano desse golpe
  When a esquiva ocorre fora da janela
  Then a colisão válida aplica dano
```

## 6. Critérios não funcionais e qualidade

Metas iniciais sujeitas a hardware de referência: 60 FPS a 1080p, CPU frame p95 ≤16,6ms quando CPU-bound, carregamento inicial alvo <15s em SSD de referência, nenhum erro vermelho em happy path. Save atômico com backup; validação de conteúdo sem ID duplicado; build Windows por CLI. Registrar logs/versão/seed nos testes. A meta de frame depende também do GPU; medir separadamente.

## 7. Marcos e entregas

- M0 projeto importável, CI e bootstrap.
- M1 movimento/câmera/input e animation sandbox.
- M2 combate sandbox com 3 habilidades e testes.
- M3 dois inimigos/mini-boss, NavMesh e AI.
- M4 inventário/equipamento/quests/progressão/save.
- M5 Aruanda graybox e golden path.
- M6 UI, áudio, passagem visual básica.
- M7 otimização, acessibilidade, playtests e release candidate.

**Gate de passagem:** M0→M1 compilação/CI; M2→M3 fórmula/hit tests; M4→M5 save+quest idempotentes; M5→M6 walkthrough graybox; M6→M7 zero blockers; RC→entrega smoke+regressão+perfil.

## 8. Definition of Done

Um revisor consegue clonar, instalar versão Unity declarada, abrir e construir o projeto; executar walkthrough; morrer/respawn; usar equipamento; salvar/sair/recarregar; validar recompensa sem duplicação; rodar suíte; localizar logs. Zero Blocker/Critical; pendências culturais marcadas como ficção/revisão e não vendidas como autenticidade comprovada.

## 9. Dependências e riscos

- Arte final não bloqueia testes de lógica (placeholder obrigatório).
- Escopo do mapa é **teto de referência**, podendo encolher se graybox evidenciar vazio/repetição.
- Inputs/motion devem ser validados no hardware real.
- Uso de referências culturais, nomenclaturas e padrões ornamentais requer revisão antes de comunicação pública.
- Multiplayer permanece fora da Definition of Done deste MVP.
