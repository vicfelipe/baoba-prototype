# TASK-000 — Fundação do projeto

Atualização 2026-10-29: a pendência de execução remota foi resolvida com
SUCCESS no GitHub Actions 40978249556. Ver TASK-000-CI.md e CI_REMOTE.md.
Os resultados abaixo registram a entrega inicial e suas pendências na época;
não representam o estado atual da CI. Não se infere ratificação formal de ADRs.

Data: 2026-10-29.
Status: implementação e verificação local aprovadas pelos checks executados;
tarefa incompleta para o gate de CI remota e ratificação humana da ADR.

Task/US: TASK-000; infraestrutura que habilita as histórias US-001..014.

Objetivo: criar projeto Unity 6.3 LTS/URP importável, separar assemblies,
fixar dependências e fornecer runners verificáveis de teste/build.
Atualização de sequência: ver `docs/SPEC_CONFLICT-M0-sequencing.md`.
A restrição adicional antes registrada aqui foi corrigida: TASK-010 integra
M0; o gate de compilação/CI para M1 permanece pendente. Não declarar CI
remota executada nem iniciar movimento para contornar esse gate.

Arquivos alterados:

- `.gitignore`, `.gitattributes`, `.editorconfig`: outputs ignorados, LFS,
  serialização textual e regras de formatação. Espaços finais de Markdown
  e YAML gerado pela Unity são aceitos, sem editar metadata manualmente.
- `Packages/{manifest.json,packages-lock.json}`: sete pacotes fixados e módulos.
- `ProjectSettings/`: configurações criadas e salvas pelo Editor instalado.
- `Assets/BAOBA/{Scripts,Content,Tests}`: sete asmdefs, separação Core/Gameplay
  sem UnityEngine, checks EditMode e PlayMode, setup, validator e build command.
- `Assets/BAOBA/Scripts/Unity/InfrastructureSmokeProbe.cs`: probe explícito
  de inicialização, ativado somente pela flag -baobaSmoke fora do Editor.
- `Assets/BAOBA/{Scenes,Settings}`: cena técnica e assets URP via Editor APIs.
- `Assets/DefaultVolumeProfile.asset` e
  `Assets/UniversalRenderPipelineGlobalSettings.asset`: gerados pela URP.
- `.meta` correspondentes: gerados pelo Editor, sem edição manual.
- `Tools/Unity/Invoke-Unity.ps1`, `Tools/Validation/Test-Repository.ps1`:
  runners com timeout/exit codes, resultados NUnit, GUIDs e package lock.
- `.github/workflows/unity-foundation.yml`: CI manual para runner próprio.
- `README.md`, `CLAUDE.md`, `docs/THIRD_PARTY.md`, esta task e ADR-0009:
  setup, estado real, direitos e decisões.

Os cinco documentos normativos e as referências legadas foram preservados.
Git local inicializado em main, Git LFS configurado localmente, arquivos
marcados com intent-to-add para revisão. Sem commit, remote, push ou publicação.

Decisões/ADR: `docs/ADRs/ADR-0009-project-foundation.md`, ratificação pendente.
Aplica a engine/camadas já normativas; ADR-008 continua reservada a movimento.
URP 17.3.0 e Test Framework 1.6.0 confirmados nos pacotes locais do Editor.
Os demais pacotes foram confirmados no registro oficial e no PackageCache.
Build usa backend Mono padrão, Windows x64. CI não é provisionada por código.

Testes executados:

```powershell
./Tools/Unity/Invoke-Unity.ps1 -Action Setup -EditorPath 'D:\Unity\Editors\6000.3.27f1\Editor\Unity.exe'
# PASS final: configuração, assets/cena e validador.

./Tools/Unity/Invoke-Unity.ps1 -Action All -EditorPath 'D:\Unity\Editors\6000.3.27f1\Editor\Unity.exe'
# PASS Import, Validate, EditMode (4), PlayMode (1), Build, Smoke.

./Tools/Validation/Test-Repository.ps1
# PASS: 34 GUIDs únicos, metadata pareada, 7 asmdefs, manifest/lock alinhados.

git -c core.safecrlf=false -c core.autocrlf=false diff --check
# PASS, respeitando atributos para YAML gerado e Markdown.
```

Parser PowerShell: PASS para os dois scripts. `git check-ignore`: PASS para
Library, Temp, Logs, TestResults, Builds e UserSettings.

EditMode: 4/4, zero falhas/ignorados. Fronteiras Core/Gameplay, URP,
renderer e registro da cena técnica. Evidência: `TestResults/editmode.xml`.
PlayMode: 1/1, zero falhas/ignorados. Carregar/descarregar cena e câmera,
sem logs inesperados no teste. Evidência: `TestResults/playmode.xml`.
PlayMode usou dispositivo gráfico; import/EditMode/build usaram -nographics.

Build executada: `-Action All` chama
`Baoba.Editor.BuildCommands.BuildWindows` com Unity 6000.3.27f1
(672d562a42a7), Windows x64, StrictMode. PASS, exit code 0.
Output local: `Builds/Windows/BAOBA.exe` e arquivos acompanhantes.
Smoke: -batchmode -nographics -baobaSmoke, cena carregada e câmera existente
após três frames, marcador BAOBA_INFRASTRUCTURE_SMOKE_PASS, exit code 0.
Não valida renderização, gameplay, performance ou qualidade visual.

Logs: `Logs/{setup,import,validate,editmode,playmode,build,player-smoke}.log`.
Resultados e binários são ignorados pelo Git e não foram publicados.

Tentativas corrigidas antes do PASS final: API de QualitySettings não
disponível na versão instalada; criação aditiva com cena inicial não salva;
smoke com -quit que não encerrou o player e atingiu timeout. A execução
final repetiu a suíte/build após adicionar o probe de término explícito.

Impacto em save/schema/IDs: nenhum save/schema implementado ou migrado;
nenhum ID persistente de conteúdo criado. GUIDs Unity gerados pelo Editor,
sem duplicidade na checagem local. Validação de IDs/referências do futuro
catálogo não está implementada; ContentValidator cobre só a fundação.

Novas dependências/licenças: URP 17.3.0, Input System 1.20.1,
Cinemachine 3.1.7, Animation Rigging 1.4.1, AI Navigation 2.0.16,
Test Framework 1.6.0, ProBuilder 6.1.4 e transitivas do lock.
Licenças declaradas dos sete pacotes diretos inspecionadas: Unity Companion
License; detalhes em `docs/THIRD_PARTY.md`. Licença pública própria pendente
do titular. Arte legada fora da build, sem nova alegação de direitos/cultura.

Riscos conhecidos:

- NÃO VERIFICADO: execução da CI remota; runner, remote e credenciais não
  configurados. Workflow manual exige runner confiável/licenciado.
- Ratificação humana da ADR-0009 pendente; não se presume aprovação formal.
- Logs do Editor registram falha de renovação de access token de licença;
  a licença local permitiu executar todos os comandos com sucesso.
- Cinemachine emite diagnósticos de classes parciais/asmref de samples HDRP;
  não houve erro de compilação ou falha dos checks finais. Não alterar
  fontes de terceiros para suprimir esses diagnósticos.
- NÃO VERIFICADO: avaliação visual interativa e performance. Cena vazia;
  não há Bootstrap, movimento, combate, catálogo ou save.

Critérios de aceite atendidos/não atendidos:

| Aceite | Resultado |
|---|---|
| Projeto abre/importa em batch e compila com a versão fixada | PASS local |
| URP, packages e assemblies importados (G0) | PASS local |
| Assemblies de domínio sem dependência UnityEngine | PASS estrutural; lógica futura |
| EditMode/PlayMode disponíveis e suíte atual executada | PASS 4 + 1 |
| ContentValidator de fundação e checagem de GUIDs | PASS; catálogo futuro |
| Build Windows e smoke CLI com logs/exit codes | PASS local |
| Runner/workflow CI revisável | Implementado |
| CI executada no ambiente remoto autorizado | NÃO VERIFICADO |
| ADR ratificada | Pendente |
| Entrega jogável | Fora desta task |

Próxima tarefa sugerida: TASK-010 dentro de M0, conforme a correção de
sequência registrada. Execução remota/ratificação continuam pendentes;
resolver o gate M0→M1 antes de TASK-020.
