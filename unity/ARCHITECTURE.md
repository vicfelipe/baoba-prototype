# BAOBA — ARCHITECTURE.md

**Status:** normativa para o MVP 0.1 • **Baseline:** especificação BAOBA v8.0 • **Decisão de engine:** Unity 6.3 LTS, C#, URP, Windows.  
**Última revisão:** 2026-10-29 • **Owner:** Tech Lead • **Alterações:** ADR + PR.

## 1. Objetivo e limites

Esta arquitetura implementa a vertical slice **As Raízes de Aruanda** e deixa contratos substituíveis para multiplayer futuro, **sem** introduzir backend, banco ou sincronização prematuramente. A primeira build deve funcionar **offline**. O projeto não é um MMO funcional nesta etapa. Números de performance são metas de validação, não garantias.

### ADRs vinculantes

| ADR | Decisão | Justificativa | Reconsiderar quando |
|---|---|---|---|
| ADR-001 | Unity 6.3 LTS + C# + URP | Preferência do projeto, ecossistema 3D, automação | mudança explícita de direção |
| ADR-002 | Core de regras em C# com dependências Unity minimizadas | testes rápidos e futura autoridade remota | domínio exigir API do motor |
| ADR-003 | ScriptableObjects para authoring; IDs estáveis para resolução | workflow Unity e conteúdo por IA | catálogo não escalar |
| ADR-004 | Single-player offline no MVP; interface de autoridade | custo controlado, validação de fun | VS multiplayer aprovada |
| ADR-005 | Save versionado + backup + migração | evitar corrupção/perda de progresso | backend autoritativo implantado |
| ADR-006 | Blender + Rigify; Animation Rigging no Unity | ferramentas abertas e reuso humanoide | caso de rig especial comprovado |
| ADR-007 | ProBuilder/graybox antes de arte final | testar navegação e câmera | gate de level design aprovado |

**Precedência:** segurança/licenças/integridade > ADR ratificada > estes cinco arquivos > especificações BAOBA v8 > documentos v7/v6/v4 como histórico. Se conflito não resolvido, parar apenas o trecho impactado e abrir `SPEC_CONFLICT`.

## 2. Módulos e dependências

```text
Baoba.Core (ID, Result, Clock, Events, Math, RNG, Contracts)
     ↑
Baoba.Gameplay (Combat, Inventory, Quests, Progression, SaveModel, AI decisions)
     ↑
Baoba.Unity (MonoBehaviour adapters, input, physics, animator, scenes, UI, audio)
     ↑
Baoba.Editor (generators, validators, build commands)

Baoba.Content (ScriptableObjects, catalog, references)
Baoba.Tests.* (Domain / EditMode / PlayMode)
```

`Core` não depende de UnityEngine. `Gameplay` pode usar tipos de domínio próprios (`Vector3Data`, `DurationMs`) e interfaces em vez de acessar `Time`, `Physics`, `PlayerPrefs` e `Animator` diretamente. `Unity` integra física, renderização e input. Sem framework DI externo no início: composition root explícita e constructor injection para serviços puros.

### Estrutura proposta

```text
Assets/BAOBA/
  Scenes/{00_Bootstrap,10_MainMenu,20_Aruanda_Slice,90_CombatSandbox,91_AnimationSandbox,92_UISandbox}.unity
  Scripts/{Core,Gameplay,Unity,Editor}/
  Content/{Characters,Abilities,Enemies,Items,Quests,Regions,Audio,UI}/
  Art/{Characters,Environment,Props,Materials,Animations,VFX}/
  Audio/  Prefabs/  UI/  Settings/  Tests/{EditMode,PlayMode}/
Docs/{ARCHITECTURE.md,MVP_0.1.md,GAMEPLAY_SPEC.md,ASSET_PIPELINE.md,AGENTS.md,ADRs/}
Tools/{Blender,Unity,Validation}/
.github/workflows/
```

Fixar versões oficiais compatíveis no `Packages/manifest.json`: Input System, Cinemachine, URP, Animation Rigging, AI Navigation, Test Framework e ProBuilder. Addressables somente quando necessidade real de streaming/catalogo for demonstrada. Salvar `ProjectSettings/ProjectVersion.txt` e lock/manifest no Git; `Library/`, `Temp/`, `Logs/` ignorados; binary art no Git LFS.

## 3. Contratos de domínio

| Contrato | Responsabilidade | Implementação no MVP |
|---|---|---|
| `IClock` | tempos monotônicos de gameplay | `UnityGameplayClock` |
| `IRandomSource` | RNG reproduzível | seed estável por sessão/encounter |
| `IContentRepository` | resolve definição por `ContentId` | `ScriptableObjectCatalog` |
| `ICombatAuthority` | valida e resolve comandos de combate | `LocalCombatAuthority` |
| `IInventoryService` | transações de itens e equipamento | serviço local testável |
| `IQuestService` | transição de missão | máquina de estados persistível |
| `ISaveService` | serialização, backup, migração | disco local com escrita atômica |
| `IWorldStateService` | flags, checkpoints, respawn | memória + save |
| `IAudioService` | cue/ambience/music state | adapter AudioMixer |
| `IEventPublisher` | publicação de fatos imutáveis | dispatcher em processo |

Exemplo mínimo de fronteira:

```csharp
public readonly record struct ContentId(string Value);
public readonly record struct AttackCommand(Guid InstanceId, string SourceId,
    string TargetId, ContentId ActionId, long Tick);
public interface ICombatAuthority {
    CombatResult Execute(AttackCommand command);
}
public interface IContentRepository {
    T GetRequired<T>(ContentId id) where T : class;
}
```

Os exemplos são contratos de projeto, **não** código compilado ou testado. C# / APIs concretas devem respeitar a versão exata da Unity e assembly definitions do repositório.

## 4. Caminhos de dados e eventos

**Input → combate:** `Input System → PlayerInputAdapter → Intent → CombatCommand → ICombatAuthority → CombatResult → Presentation (Animator/VFX/SFX/UI)`.

**Quest:** `InteractionCommand → QuestService → QuestProgressed event → SaveDirty flag → HUDPresenter`. Emissões representam **fatos ocorridos**, não substituem chamadas de comando que precisam validação/resposta.

**Loot:** `EnemyDefeated → LootRoll(seed) → InventoryTransaction(transactionId) → ItemGranted → Save`. `transactionId` é persistido/checado para idempotência. Nunca dar item duas vezes por OnTrigger+OnDestroy.

Eventos tipados: `DamageApplied`, `EntityDefeated`, `ItemGranted`, `QuestProgressed`, `CheckpointActivated`, `EquipmentChanged`, `WorldFlagChanged`. Cada evento contém `EventId`, `OccurredAtTick`, `SourceId`; consumidores devem tolerar reexecução quando persistentes. Proibir EventBus universal sem ownership e trace de produtores/consumidores.

## 5. Dados e persistência

Separar **Definition** (ScriptableObject versionado), **Runtime State**, **Persistent State** (DTO serializável), **Presentation** (asset references). IDs ASCII imutáveis; display name localizado é independente. Exemplos: `ENEMY_ARU_TORN_VINE_001`, `QUEST_ARU_FIRST_SPROUT_001`, `ITEM_ARU_ROOTSHIELD_001`. Não mapear automaticamente nações antigas para regiões novas.

`SaveEnvelope`: `formatVersion`, `gameVersion`, `contentVersion`, `saveId`, `createdAtUtc`, `updatedAtUtc`, `checksum` + `CharacterState`, `InventoryState`, `EquipmentState`, `QuestState`, `WorldFlags`, `CheckpointId`, `SettingsState`. **Evitar salvar referência de UnityEngine.Object/MonoBehaviour**. Fluxo: serializar temp → flush → validação/hash → trocar arquivo → backup anterior → read-back em teste. Falha da nova gravação não destrói o save válido. Migration versionada com fixtures; zero `replace` textual cego.

## 6. Rendering e cenas

URP, direção stylized 3D. Alvo inicial PC 1080p/60 FPS em hardware de referência ainda a declarar; medir CPU/GPU p95, memória, GC e chamadas de draw. Sem otimizar por suposição. Usa `CharacterController` **ou** Rigidbody para player após protótipo comparativo; apenas uma solução no runtime final, registrada em ADR-008. AI Navigation/NavMesh para inimigos terrestres. Cinemachine para terceira pessoa e lock-on opcional.

Bootstrap inicializa serviços antes de carregar cena jogável; cenas sandbox isolam gameplay/animation/UI. Art assets não podem conter valores autoritativos de dano, recompensas ou quest.

## 7. Automação, release e segurança

CI PR: importar/compilar, EditMode, validação de IDs/assets, lint/format quando disponíveis. Branch principal: PlayMode + build Windows + smoke + relatórios. Scripts Editor para criar assets/prefabs; preferir AssetDatabase/PrefabUtility em vez de editar `.unity`/`.prefab` e `.meta` como texto. Credenciais/segredos nunca no repositório. Pacotes externos exigem licença, versão fixa e ADR.

## 8. Gates arquiteturais

- **G0:** Unity abre projeto sem erro; packages/assembly definitions importados.
- **G1:** Core/Gameplay testáveis sem carregar cena.
- **G2:** catálogo de conteúdo falha em IDs duplicados/referências ausentes.
- **G3:** combat sandbox reproduz dano/cooldowns em testes.
- **G4:** save→load→migration de fixtures passa.
- **G5:** build e smoke via CLI produzem logs e exit code correto.

## 9. Dívidas explicitamente adiadas

Backend Nakama/PostgreSQL, server-authoritative real, anti-cheat em rede, rollback netcode, grandes mundos, ECS/DOTS, asset streaming avançado, economia/global war, mobile e console. Não confundir interfaces preparatórias com funcionalidades implementadas.
