# BAOBA — AGENTS.md

**Instruções mandatórias para agentes de IA que alteram este repositório.**  
**Escopo:** Unity 6.3 LTS + C# + URP • MVP 0.1 As Raízes de Aruanda • Windows offline.  
Este arquivo não autoriza execução de comandos destrutivos fora do repositório nem publicação/deploy sem permissão.

## 1. Ordem de autoridade

1. Segurança, integridade de arquivos, licenças e direitos de terceiros.
2. ADR aprovada e contratos/schema versionados.
3. `AGENTS.md`, `ARCHITECTURE.md`, `MVP_0.1.md`, `GAMEPLAY_SPEC.md`, `ASSET_PIPELINE.md` (se divergirem, registrar conflito; não escolher silenciosamente).
4. Baseline BAOBA v8 e especificações de domínio.
5. Docs legados v7/v6/v4 apenas como história.
6. Sugestões geradas por IA não aprovadas.

Diante de ambiguidade: usar solução mínima reversível que respeite os contratos; abrir `docs/ADRs/ADR-XXXX.md` ou issue `SPEC_CONFLICT`. Não ampliar escopo por conta própria.

## 2. Não negociáveis

- Engine **Unity 6.3 LTS**, C#, URP; não gerar GDScript/Godot nem dependências de Unreal.
- Alvo inicial **offline**; não implementar multiplayer/Nakama/PostgreSQL sem task aprovada.
- IDs persistentes imutáveis; nunca salvar referência direta UnityEngine.Object.
- Core/Gameplay desacoplados de apresentação; damage/loot/quest via serviços/commands.
- Scene/Prefab por Editor APIs quando possível; jamais editar `.meta` manualmente; preservar GUIDs e referências.
- Nunca copiar IP de jogos de terceiros ou costumes/arte sagrada sem validação. Conteúdo cultural pesquisável exige metadata e revisão.
- Não incluir segredo, token ou licença privada em código/commits.
- Não alegar 'compila', 'testado' ou 'jogável' sem executar o comando/ambiente correspondente.

## 3. Ciclo obrigatório de trabalho

**Antes:** ler os cinco docs, `ProjectVersion.txt`, `manifest.json`, ADRs, árvore de diretórios e testes relevantes. Escolher uma história `US-###` / task; listar arquivos impactados, dependências e critérios de aceite. Confirmar APIs/packages na versão fixada por inspeção local; não inventar classes/métodos.

**Durante:** mudança pequena; Definition antes de hardcode; adicionar tests junto com lógica; preservar namespaces/asmdefs e formatação; gerar assets com seed e metadata; logging em pontos de erro; não modificar systems adjacentes sem motivo.

**Depois:** verificar import/compilação, EditMode, PlayMode afetados, ContentValidator; revisar diff, `.meta`, IDs/migrations e licenças; produzir relatório objetivo e um próximo passo limitado.

## 4. Ordem das tasks

1. `TASK-000` repositório, versionamento, packages, assemblies e CI.
2. `TASK-010` Bootstrap, service composition root, clock/catalog.
3. `TASK-020` player locomotion, câmera/input, graybox sandbox.
4. `TASK-030` combate (resolver/actions/hitboxes/testes).
5. `TASK-040` AI 2 inimigos e boss sandbox.
6. `TASK-050` inventário/equipment/XP/quest/save.
7. `TASK-060` graybox de Aruanda e golden path.
8. `TASK-070` pipeline Blender/rig/animations e art pass.
9. `TASK-080` áudio, HUD/menus/acessibilidade.
10. `TASK-090` regressão, performance e build candidata.

Não iniciar tarefa futura para contornar gate reprovado.

## 5. Comandos e automação (templates, não executados)

A localização do executável da Unity é configurável via `UNITY_EDITOR_PATH`. Usar paths absolutos nos runners CI, e `-logFile` para capturar erros.

```bash
"$UNITY_EDITOR_PATH" -batchmode -nographics -quit -projectPath "$PWD"   -runTests -testPlatform EditMode -testResults TestResults/editmode.xml   -logFile Logs/editmode.log
"$UNITY_EDITOR_PATH" -batchmode -nographics -quit -projectPath "$PWD"   -executeMethod Baoba.Editor.BuildCommands.BuildWindows   -logFile Logs/build-windows.log
```

`Baoba.Editor.BuildCommands.BuildWindows` é **contrato a implementar**, não método já existente. `-nographics` pode ter limitações em PlayMode/render tests; registrar ambiente. A CI precisa de agente licenciado/autorizado e Unity instalada; GitHub Actions gratuito não equivale a editor Unity pré-instalado.

## 6. Testes mínimos por mudança

| Alteração | Obrigatório |
|---|---|
| Damage/action | unit fórmula, state/iframes, PlayMode hit |
| Quest/loot/inventory | ID validation, idempotência, save→reload |
| Scene/nav | PlayMode traversal/AI, smoke graybox |
| Character rig | avatar, skeleton/socket/scale, animation sandbox |
| UI | eventos/hud, foco, resolução, pseudo-localization |
| Audio | mixer/cues/concurrency e acessibilidade |
| Save/schema | fixture migrada e round-trip, backup |
| Package/Unity version | ADR, import/compile, full suite |

Quando não houver Unity/Blender/CI disponível, executar só verificações possíveis e relatar: `NÃO VERIFICADO: build/PlayMode`, com razão. Nunca inferir aprovação.

## 7. Qualidade e performance

Sem `Find` ou allocations desnecessárias em `Update` de combate; profiling antes de otimizar. Sem ECS/DOTS prematuro. Usar pooling apenas diante de perfil/escala. Dados e constantes em Definitions. Toda função crítica deve explicitar erro/estado inválido e ser testável. Preferir composição e contracts pequenos a hierarquias enormes.

## 8. Formato obrigatório de relatório de PR/tarefa

```text
Task/US:
Objetivo:
Arquivos alterados:
Decisões/ADR:
Testes executados: [comando] → [PASS/FAIL/NÃO VERIFICADO]
Build executada: [comando/ambiente/resultado]
Impacto em save/schema/IDs:
Novas dependências/licenças:
Riscos conhecidos:
Critérios de aceite atendidos/não atendidos:
Próxima tarefa sugerida:
```

## 9. Definition of Done de uma tarefa

Compila quando aplicável; testes relevantes passam; mudança revisável e pequena; documentação atualizada; sem duplicidade de IDs; sem alteração silenciosa de contrato; logs úteis; licenças verificadas; aceites registrados. Se não executou, marcar como incompleto/não verificado, nunca como concluído.

## 10. Registro de sessão obrigatório

- Antes de começar, ler `SESSAO.md` e conferir seu estado com os arquivos reais. O registro não substitui os documentos normativos nem autoriza passar gates.
- Ao final de toda alteração no projeto, atualizar `SESSAO.md` antes do relatório ao usuário, inclusive para mudanças apenas em documentação.
- Manter uma única fotografia atual da sessão: substituir a última modificação e o estado atual, sem acumular um histórico de entradas. O histórico completo pertence ao Git e aos relatórios de tasks.
- Registrar data/hora com fuso, Task/US, objetivo, arquivos alterados, decisões/ADR, verificações realmente executadas, build, impacto em save/schema/IDs, dependências/licenças, riscos, aceites e próximo passo limitado.
- Separar fatos executados de planos. Se houver interrupção, na retomada conferir o disco e registrar o ponto real de parada; nunca marcar trabalho apenas anunciado como implementado.
- Não registrar segredos, tokens, credenciais ou conteúdo integral de logs sensíveis.
