# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Estado atual do repositório

BAOBA — MVP 0.1 "As Raízes de Aruanda": action-RPG 3D em terceira pessoa, **offline**, Windows, Unity 6.3 LTS + C# + URP.

A fundação da `TASK-000` foi iniciada: projeto Unity 6000.3.27f1, URP,
pacotes fixados, assemblies, testes de infraestrutura, runners e Git local.
TASK-010 adiciona Bootstrap, serviços, relógio com pausa e catálogo de IDs.
O destino continua uma cena técnica vazia; ainda não há gameplay.
Leia `SESSAO.md`, `docs/tasks/TASK-010.md` e
`docs/SPEC_CONFLICT-M0-sequencing.md` para resultados e gates pendentes.
Antes de supor que algo existe, verifique no disco;
não invente classes, métodos ou packages.

| Arquivo | Papel |
|---|---|
| `AGENTS.md` | **Regras obrigatórias para agentes**: ciclo de trabalho, ordem das tasks, testes mínimos por tipo de mudança, formato do relatório, DoD. Ler antes de qualquer alteração. |
| `ARCHITECTURE.md` | Módulos, ADR-001..007, contratos de domínio, fluxos de dados, save, gates G0–G5 |
| `MVP_0.1.md` | Escopo fechado, histórias US-001..014 com critérios de aceite, marcos M0–M7 |
| `GAMEPLAY_SPEC.md` | Parâmetros de movimento, fórmula de dano, ações, FSM de IA, curva de XP |
| `ASSET_PIPELINE.md` | Metadata de assets, unidades, Blender/Rigify → FBX, orçamento de polígonos, gates A0–A7 |
| Legado v7 da origem local | Não copiado para o snapshot público. Só histórico; não prevalece sobre os documentos normativos. |
| Concept arts da origem local | Não copiadas para o snapshot público; direitos/revisão cultural pendentes. |

Precedência em conflito: segurança/licenças > ADR aprovada > os cinco docs da raiz > baseline v8 > legado. Divergência entre docs → registrar `SPEC_CONFLICT` ou ADR, não escolher em silêncio. Mudança de escopo → `CHANGE_REQUEST`.

## Comandos

O runner `Tools/Unity/Invoke-Unity.ps1` implementa Import, Setup, Validate,
EditMode, PlayMode, Build, Smoke e All. Use `UNITY_EDITOR_PATH` apontando
para o Editor exato. Os comandos abaixo concretizam os templates de AGENTS.md:

```bash
# EditMode tests
"$UNITY_EDITOR_PATH" -batchmode -nographics -projectPath "$PWD" \
  -runTests -testPlatform EditMode -testResults TestResults/editmode.xml -logFile Logs/editmode.log
# PlayMode: -testPlatform PlayMode (-nographics pode limitar render/PlayMode; registrar ambiente)
# Teste único / subconjunto: adicionar -testFilter "<Namespace.Classe.Metodo>" (regex aceita)
# Build Windows — BuildCommands.BuildWindows implementado na TASK-000
"$UNITY_EDITOR_PATH" -batchmode -nographics -quit -projectPath "$PWD" \
  -executeMethod Baoba.Editor.BuildCommands.BuildWindows -logFile Logs/build-windows.log
```

Omitir `-quit` nos testes: Test Framework controla o término. Smoke verifica
cena/câmera após três frames com -baobaSmoke. Sem Unity disponível, rodar só o que der
para verificar e reportar `NÃO VERIFICADO: <item>` com a razão. Nunca afirmar
"compila/testado/jogável" sem ter executado.

## Arquitetura (resumo dos docs)

**Camadas e direção de dependência** (assembly definitions presentes; responsabilidades de gameplay ainda previstas):

```
Baoba.Core      — ID, Result, Clock, Events, RNG, contracts. SEM UnityEngine.
  ↑
Baoba.Gameplay  — Combat, Inventory, Quests, Progression, SaveModel, decisões de IA.
                  Usa tipos próprios (Vector3Data, DurationMs) e interfaces; não toca
                  Time/Physics/PlayerPrefs/Animator diretamente.
  ↑
Baoba.Unity     — adapters MonoBehaviour: input, física, Animator, cenas, UI, áudio.
  ↑
Baoba.Editor    — geradores, validadores, build commands.
Baoba.Content   — ScriptableObject Definitions + catálogo.
Baoba.Tests.*   — Domain / EditMode / PlayMode.
```

Sem framework de DI: composition root explícita na cena `00_Bootstrap`, que inicializa os serviços antes de carregar a cena jogável; constructor injection nos serviços puros. Contratos centrais: `IClock`, `IRandomSource`, `IContentRepository` (resolve Definition por `ContentId`), `ICombatAuthority` (`LocalCombatAuthority` no MVP — a interface existe para autoridade remota futura, que **não** deve ser implementada), `IInventoryService`, `IQuestService`, `ISaveService`, `IWorldStateService`, `IAudioService`, `IEventPublisher`.

**Fluxos que cortam várias camadas:**
- Combate: `Input System → PlayerInputAdapter → Intent → CombatCommand → ICombatAuthority → CombatResult → apresentação (Animator/VFX/SFX/UI)`. Animator e AnimationEvents só *sinalizam* janelas; nunca são a fonte de decisão. A UI lê preview/resultado do serviço e não replica a fórmula.
- Loot: `EnemyDefeated → LootRoll(seed) → InventoryTransaction(transactionId) → ItemGranted → Save`. O `transactionId` persistido garante idempotência (anti-dupe após load, sem conceder duas vezes por OnTrigger+OnDestroy). A IA emite a derrota; nunca mexe em loot/inventário direto.
- Quest: `InteractionCommand → QuestService → QuestProgressed → SaveDirty → HUDPresenter`. Estados NotStarted/Active/Completed/Rewarded; a recompensa é única.
- Eventos são fatos imutáveis tipados (`EventId`, `OccurredAtTick`, `SourceId`) e consumidores persistentes precisam tolerar reexecução. Eventos não substituem comandos que exigem validação. EventBus universal sem ownership é proibido.
- Hits: deduplicados por `attackInstanceId + targetId`; acerto só em active frames. Cada ação segue Startup → Active → Recovery + cancelWindows, com uma matriz de permissões por estado.
- Timers (cooldown, i-frames, regen) vêm de `IClock` monotônico/ticks, não de `Time.deltaTime`, e precisam ser independentes de FPS e corretos com pausa.

**Dados:** separar Definition (ScriptableObject) / Runtime State / Persistent State (DTO) / Presentation. IDs ASCII imutáveis no padrão `TIPO_REGIAO_NOME_NNN` (`ENEMY_ARU_TORN_VINE_001`, `QUEST_ARU_FIRST_SPROUT_001`, região `REG_ARUA`). Números de gameplay ficam em Definitions, nunca em MonoBehaviours ou em art assets. O catálogo deve falhar com ID duplicado ou referência ausente.

**Save:** `SaveEnvelope` com `formatVersion/gameVersion/contentVersion/checksum`. Escrita atômica: temp → flush → hash → swap → backup anterior. Migrações versionadas com fixtures. Nunca serializar referências a `UnityEngine.Object`.

**Decisões em aberto:** `CharacterController` vs Rigidbody para o player (ADR-008, depende de protótipo no sandbox — CharacterController é o recomendado inicial). Addressables só se houver necessidade comprovada. Os ADR-001..007 estão listados em `ARCHITECTURE.md`, mas ainda não existem arquivos ADR. Novos ADRs vão em `docs/ADRs/ADR-XXXX.md`.

**Layout previsto:** `Assets/BAOBA/{Scenes,Scripts/{Core,Gameplay,Unity,Editor},Content,Art,Prefabs,UI,Settings,Tests}`, `Tools/{Blender,Unity,Validation}`, `.github/workflows`. Cenas sandbox (`90_CombatSandbox`, `91_AnimationSandbox`, `92_UISandbox`) isolam sistemas para teste. Obs.: `ARCHITECTURE.md` propõe `Docs/` para os docs, mas eles estão hoje na raiz; não mover sem decisão.

## Restrições de trabalho que mais pegam

- Cenas e prefabs via Editor APIs (`AssetDatabase`, `PrefabUtility`); nunca editar `.meta` nem YAML de `.unity`/`.prefab` à mão. Preservar GUIDs.
- Fora do escopo: multiplayer, Nakama/PostgreSQL/backend, ECS/DOTS, pooling sem profiling, Addressables. Não implementar sem task aprovada.
- Assets exportáveis exigem manifesto JSON/YAML (`assetId`, `seed`, `license`, `rightsStatus`, `culturalStatus`…); 1 unit = 1 m; sockets com nomes fixos (`socket_weapon_r`, etc.).
- Conteúdo cultural: não copiar padrões ou arte sagrada nem representar tradições religiosas vivas como inimigos; marcar o que é ficção ou está pendente de revisão. Não usar IP de outros jogos (o legado v7 cita Aika/Elyndra apenas como comparação).
- Identificadores, código e nomes de interfaces em inglês; docs e relatórios em português.
- Todo relatório de tarefa segue o template da seção 8 de `AGENTS.md`.
