# BAOBA — GAMEPLAY_SPEC.md

**Status:** baseline implementável e calibrável • **Owner:** Game Design + Gameplay Engineer.  
**Fonte normativa:** BAOBA v8 / Combat, Progression, Aruanda. Valores são parâmetros iniciais de protótipo.

## 1. Loop e modelos

Explorar → descobrir rota/quest → interpretar ameaça → mover/defender/atacar → obter recurso/item/XP → retornar/restaurar → equipar/salvar. Regras puras usam unidades explícitas, seeds e relógio monotônico. Editor importa Definitions; runtime não codifica números em MonoBehaviours.

## 2. Movimento

`CharacterMotor` recebe `MovementIntent(x,y,jump,dodge,sprint)` e produz posição/velocidade via adapter Unity. O único driver de física deve ser escolhido no sandbox e registrado como ADR-008 (CharacterController recomendado para primeiro protótipo, mas não decidido irrevogavelmente sem teste). Câmera terceira pessoa via Cinemachine, orientação relativa à câmera, soft target + lock-on opcional.

| Parâmetro inicial | Valor | Validação |
|---|---:|---|
| Walk | 2,2 m/s | NPC/hub |
| Run | 4,8 m/s | exploração |
| Sprint | 6,5 m/s | custo de Vigor |
| Jump altura | ~1,1 m | testar gravidade e obstáculos |
| Gravidade | 20 m/s² para baixo | calibrar feeling |
| Dodge duração | 0,55s | animação/colisão |
| Dodge custo | 25 Vigor | combate |
| Dodge i-frames | 0,18s (janela a posicionar) | teste de frames/ticks |
| Input buffer ataque | 0,15s | combo |

Não confundir `Time.deltaTime` de apresentação com autoridade dos timers. Pausa local congela simulação conforme política de pause.

## 3. Estados

Movimento: Grounded, Jumping, Falling, Dodging, Disabled. Combate: Free, Attacking, Blocking, Casting, HitReact, Staggered, KnockedDown, Dead, Interacting. Matriz de permissões por estado: ataque não inicia em Dead/Staggered; interação não inicia com ataque ativo salvo cancelamento explícito; dodge só com Vigor suficiente e janela liberada. Cada ação: Startup→Active→Recovery + cancelWindows.

## 4. Atributos, recursos e dano

- HP = 100 no nível 1; Vigor = 100; Raiz = 0–100.
- Regen Vigor = 20/s, começando 0,8s após último gasto; Raiz é conquistada por ação.
- Power/Defense básicos = 10/10 no nível 1.
- `Raw = BasePower * (1 + AttackPower/100)`.
- `Mitigation = Defense / (Defense + 100)`.
- `Damage = max(1, round(Raw * (1 - Mitigation) * Modifiers))`.
- Modifiers positivos/multiplicativos são auditáveis. Sem crítico ou resistência elemental no MVP. Empates/arredondamento definidos em `DamageResolver` e fixados por teste.

**Exemplo:** BasePower 20, AttackPower 10, Defense alvo 10, modifier 1,0 → raw 22 → mitigação ~0,0909 → dano ~20. Não replicar fórmula em HUD; UI lê resultado/preview do serviço.

## 5. Ações e habilidades

Hit detection via hitboxes/hurtboxes; uma instância de ataque pode acertar um alvo apenas uma vez, salvo metadata multi-hit. `attackInstanceId+targetId` deduplica. VFX/AnimationEvent podem sinalizar início de janela, mas não são fonte final de decisão.

| ActionId | Função | Custo | CD inicial | Contrajogo |
|---|---|---:|---:|---|
| `ATTACK_LIGHT_01..03` | combo baixo stagger | baixo Vigor | sem CD global | sair do alcance / defender |
| `ATTACK_HEAVY_01` | quebra defesa | Vigor alto | sem CD global | ler startup |
| `GRD_ROOT_BASH` | golpe defensivo/stagger | 15 Vigor | 5s | esquivar do cone |
| `GRD_BARK_GUARD` | guarda cronometrada/gera Raiz | postura | 8s | ataque lateral |
| `GRD_BINDING_ROOTS` | controle de área | 40 Raiz | 12s | elite recebe slow/stagger, não root completo |

`DamageApplied` sempre inclui `attackInstanceId`, source/target, raw/final, tags, tick. Hit stop, câmera e áudio têm intensidade configurável, acessibilidade pode reduzir efeitos.

## 6. IA

FSM MVP: `Idle/Patrol → Suspicious → Investigate → Chase → Telegraph → Attack → Recover → Return/Idle`, interrupções `Stagger/Dead`. Leash delimitado por encounter, navegação via NavMesh, line of sight e ranges em dados. Se alvo inalcançável por N segundos, retornar; não teleportar frente ao jogador.

| Entidade | Padrão | Leitura | Como vencer |
|---|---|---|---|
| `ENEMY_ARU_TORN_VINE_001` Cipó Rasgado | skirmisher / salto | telegraph direção e tempo | dodge lateral / janela de recovery |
| `ENEMY_ARU_MUD_SHELL_001` Carapaça de Lodo | frontal armor / cone | prepara slam visível | flanquear / heavy |
| `BOSS_ARU_PETRIFIED_ROOT_001` Raiz Petrificada | sweep, slam radial, linha de raízes | telegraph de solo/arma | posicionamento e dodge; fase 2 em 60% HP |

Boss não usa one-shot em jogador com HP cheio na dificuldade Normal. AI não modifica diretamente loot/inventory: emite derrota resolvida pelo domínio.

## 7. Progressão

Níveis 1–5. XP para subir: L1→2 100; 2→3 160; 3→4 250; 4→5 390. Por nível inicial +8 HP, +2 Power, +2 Defense. Rewards calculados por XP curve e quest rules. Raridade Common/Uncommon/Rare; slots Weapon/Body/Charm; seis tipos básicos de loot. Drops críticos de missão são garantidos pela lógica da quest, não apenas RNG.

TTK inicial para playtest: comum 4–8s, defensivo 8–14s, elite 20–35s, boss 90–180s. Inimigo forte ~20–30% HP em acerto; ataque forte do boss ~30–40%. Esses valores **não** são compromissos de produção: ajustar com telemetria.

## 8. Morte, checkpoints e persistência

Morte → bloquear comandos → animação → tela/respawn → checkpoint ativo. Flags de missão, equipamento, inventário e XP permanecem. Save atômico. Definir política de reset de inimigos por reentrada; não resetar quest concedida.

## 9. Eventos e depuração

Eventos: `CombatActionStarted`, `DamageApplied`, `EntityDefeated`, `XpGranted`, `LevelChanged`, `ItemGranted`, `QuestProgressed`, `CheckpointActivated`. Modo debug: hitbox gizmos, aggro ranges, damage trace, clock/tick, state transitions, encounter seed.

## 10. Critérios de teste

Dano arredondado determinístico; zero hit duplicado; dodge só na janela; cooldown/Vigor independentes de FPS; pausa não corrompe timer; inimigo retorna por leash; dead não age; quest recompensa uma vez; save/load preserva progresso; `Assist` reduz dificuldade sem punir recompensa.
