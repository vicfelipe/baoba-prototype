# TASK-010 — Bootstrap, composition root, clock e catálogo

Data: 2026-10-29. Status: implementada e validada localmente e na CI.
Atualização: GitHub Actions 40978249556 SUCCESS; ver TASK-000-CI.md.
O critério técnico de compilação/CI de M0 foi atendido. As seções abaixo
registram a entrega inicial; ratificação formal de ADRs não é inferida.

Task/US: TASK-010; base técnica para US-013/US-014, sem declarar essas
histórias completas ou implementar histórias de gameplay.

Objetivo: compor serviços antes de trocar de cena, manter tempo monotônico
com pausa e resolver conteúdo por ID estável, detectando erros de authoring.

Arquivos alterados:

- Core: `ContentId.cs`, `SimulationClock.cs`, `ContentIndex.cs` — valores,
  contratos e lógica puros, sem UnityEngine.
- Content: `ContentDefinition.cs`, `SessionDefinition.cs`,
  `ScriptableObjectCatalog.cs`, `BootstrapDefinition.cs` e três assets
  `Session_MVP.asset`, `Catalog_MVP.asset`, `Bootstrap_MVP.asset`.
- Unity: `GameBootstrap.cs`, `GameServices.cs`, `UnityGameplayClock.cs`,
  `InfrastructureSmokeProbe.cs` — composição, ciclo de vida e smoke.
- Editor: `BootstrapSetup.cs`, `ProjectSetup.cs`, `ContentValidator.cs` —
  geração/configuração por APIs e validação do catálogo e da ligação na cena.
- `Assets/BAOBA/Scenes/00_Bootstrap.unity`, metadata correspondente,
  `ProjectSettings/EditorBuildSettings.asset`: Bootstrap antes da cena técnica.
- Testes: `CoreServicesTests.cs`, `ContentAuthoringTests.cs`, `BootstrapTests.cs`
  e referências Core/Content no asmdef PlayMode existente.
- `Tools/Unity/Invoke-Unity.ps1`: descrição do smoke atualizado.
- README, CLAUDE, SESSAO, relatório TASK-000, SPEC_CONFLICT-M0-sequencing e
  ADR-0010: estado, sequência, contratos e evidências.

Decisões/ADR: `docs/ADRs/ADR-0010-bootstrap-clock-catalog.md`, sem ratificação
formal registrada. Implementa contratos normativos sem novos pacotes. A
restrição adicional introduzida no relatório anterior foi corrigida em
`docs/SPEC_CONFLICT-M0-sequencing.md`: Bootstrap ainda faz parte de M0;
não se declara CI aprovada nem se avança para TASK-020/M1.

`IClock.Tick` é expresso em milissegundos; o acumulador preserva frações
com ticks de TimeSpan. Update converte delta não escalado para ticks, evitando
arredondamento precoce a milissegundos. Pausa explícita descarta o tempo
pausado. Não há menu de pausa nem dependência implícita de Time.timeScale.

O catálogo rejeita IDs inválidos, duplicados, referências ausentes e tipo
incompatível. O validador também abre uma cena de preview para conferir a
referência real do componente Bootstrap, sem editar YAML manualmente.
O contexto de serviços é explícito; não há container DI ou event bus universal.

Testes executados:

```powershell
./Tools/Unity/Invoke-Unity.ps1 -Action Setup -EditorPath 'D:\Unity\Editors\6000.3.27f1\Editor\Unity.exe'
# PASS após corrigir o binding da cena gerada.

./Tools/Unity/Invoke-Unity.ps1 -Action All -EditorPath 'D:\Unity\Editors\6000.3.27f1\Editor\Unity.exe'
# Import PASS, Validate PASS, EditMode 21/21 PASS.
# Esta tentativa parou no PlayMode; não é reportada como All PASS.

foreach ($stage in @('PlayMode','Build','Smoke')) {
    ./Tools/Unity/Invoke-Unity.ps1 -Action $stage -EditorPath 'D:\Unity\Editors\6000.3.27f1\Editor\Unity.exe'
}
# Execução final: PlayMode 3/3 PASS, Build PASS, Smoke PASS.

./Tools/Validation/Test-Repository.ps1
# PASS final, após fechar o Editor: 52 GUIDs únicos, metadata pareada,
# 7 assemblies, manifest/lock alinhados.

git -c core.safecrlf=false -c core.autocrlf=false diff --check
# PASS.
```

EditMode: 21/21, sem falhas/ignorados. IDs, igualdade ordinal, fracionamento
do tempo, pausa/retomada sem catch-up, negativa/overflow sem mutação,
resolução/tipo, duplicatas, referências ausentes e authoring Unity.
Esses testes não carregam cena de gameplay. Evidência: TestResults/editmode.xml.

PlayMode: 3/3, sem falhas/ignorados. Inclui teste anterior de cena/câmera;
os novos testes cobrem configuração ausente sem serviços publicados,
serviços prontos antes da cena de destino, persistência na troca, relógio
avançando/pausando/retomando, descarte de duplicata e limpeza do proprietário.
Evidência: TestResults/playmode.xml. Executado com dispositivo gráfico.

Tentativas corrigidas: primeiro PlayMode detectou binding nulo na cena;
gerador passou a salvar/recarregar o asset antes de ligá-lo ao componente e
a reparar somente binding ausente. Depois, NoUnexpectedReceived sinalizou
logs informativos de sucesso; o teste passou a esperá-los explicitamente.
Nenhuma falha foi ignorada para obter o resultado final.

Build executada: `-Action Build`, Unity 6000.3.27f1 (672d562a42a7),
Windows x64/Mono/StrictMode, -batchmode -nographics, exit code 0 → PASS.
Output: Builds/Windows/BAOBA.exe e arquivos acompanhantes.
Smoke -baobaSmoke: logs BAOBA_BOOTSTRAP_READY (seed 1442),
BAOBA_BOOTSTRAP_SCENE_READY e BAOBA_INFRASTRUCTURE_SMOKE_PASS, exit code 0.
Após esperar o Bootstrap, verifica câmera/serviços com mais três frames.
Não é avaliação visual, teste de performance ou slice jogável.

Impacto em save/schema/IDs: nenhum save ou migration implementado; novo ID
de conteúdo `SESSION_ARU_MVP_001`, imutável. Seed de authoring 1442; não há
RNG implementado. Não há persistência de referências UnityEngine.Object.
Cenas/assets e metadata foram criados/salvos pelo Editor, sem edição manual
de .meta; referência da cena técnica existente mantida.

Novas dependências/licenças: nenhuma; manifesto/versões não alterados. Nenhum
asset artístico ou conteúdo cultural novo foi criado. Configurações geradas
são assets nativos de authoring do projeto, sem material de terceiros copiado.

Riscos conhecidos:

- NÃO VERIFICADO: CI remota, ratificação formal das ADRs, avaliação visual,
  performance. Não há remote/runner configurado; não houve push/publicação.
- Permanecem os diagnósticos do Editor de renovação de token de licença e
  samples/classes parciais Cinemachine, sem impedir os checks locais.
- Bootstrap deve ser o ponto de entrada; abrir diretamente a cena técnica
  não cria serviços automaticamente. Não há fallback silencioso.
- Pausa é uma API explícita do relógio; HUD/menu/áudio e sua integração
  ficam para suas respectivas tasks. Não há gameplay, inventário ou save.

Critérios de aceite atendidos/não atendidos:

| Aceite | Resultado |
|---|---|
| Serviços compostos antes da troca de cena e persistentes | PASS PlayMode + smoke |
| Bootstrap inválido falha com log e sem serviços publicados | PASS PlayMode |
| Duplicata não recria serviços | PASS PlayMode |
| Relógio monotônico, pausa/retomada, guardas de erro | PASS EditMode/PlayMode |
| Catálogo por ID/tipo e rejeição de duplicatas/referências ausentes (G2) | PASS |
| Core testável em EditMode sem cena de gameplay (G1) | PASS |
| Import/compilação, build Windows e smoke | PASS local |
| Metadata/IDs e diff revisados | PASS local |
| CI remota e ratificações | Pendentes; não inferidas |
| Movimento, combate e experiência jogável | Fora desta task |

Próxima tarefa sugerida: resolver CI/ratificações de M0 antes de TASK-020.
Depois do gate, TASK-020 deve comparar o motor de movimento em sandbox e
registrar ADR-008 antes de fixar a solução; não implementar combate junto.
