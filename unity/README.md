# BAOBA — As Raízes de Aruanda

MVP 0.1 de action-RPG 3D, terceira pessoa, Windows offline.
M0 contém a fundação da TASK-000 e o Bootstrap da TASK-010: serviços,
relógio com pausa e catálogo validado por IDs. A entrada é 00_Bootstrap,
que carrega a cena técnica vazia; ainda não há personagem ou combate.

## Ambiente

- Unity **6000.3.27f1**, módulo Windows Build Support, licença autorizada.
- Git + Git LFS; Windows PowerShell 5.1 ou PowerShell 7 para os runners.
- URP e pacotes fixados em Packages/manifest.json e packages-lock.json.
- Resolução inicial de pacotes pode exigir internet. O jogo tem alvo offline.

Abra esta pasta no Unity Hub com a versão exata. Assets, cenas e seus
`.meta` devem ser versionados juntos. Não editar GUIDs manualmente.
Não mova os documentos normativos da raiz para criar cópias em docs/.

## Verificação

Feche o Editor antes de rodar o batch no mesmo projeto.

```powershell
$env:UNITY_EDITOR_PATH = 'D:\Unity\Editors\6000.3.27f1\Editor\Unity.exe'
./Tools/Unity/Invoke-Unity.ps1 -Action All
./Tools/Validation/Test-Repository.ps1
```

Etapas individuais: Import, Validate, EditMode, PlayMode, Build, Smoke.
Logs ficam em Logs/; resultados NUnit em TestResults/; build em
Builds/Windows/BAOBA.exe. Esses outputs são locais e ignorados pelo Git.
Smoke usa -baobaSmoke, aguarda Bootstrap e sua troca de cena, verifica
serviços/câmera e encerra com confirmação no log, sem avaliação visual.
PlayMode usa dispositivo gráfico; EditMode/import/build usam -nographics.
O runner omite -quit nos testes: o Test Framework controla o término.
Isso concretiza os templates não executados de AGENTS.md sem encerrar testes cedo.

Para reconstruir a configuração inicial deliberadamente:
`./Tools/Unity/Invoke-Unity.ps1 -Action Setup`, ou menu
**BAOBA > Project > Configure Foundation**. Setup gera assets/cena via APIs
do Editor e preserva assets existentes. Setup coloca Bootstrap como primeira
cena de build, mantendo as outras entradas.
Não é executado pela CI, para que configuração ausente cause falha.

## CI e licenças

O [workflow](../.github/workflows/unity-foundation.yml) exige runner
Windows próprio com labels self-hosted/Windows/X64, Git LFS e Unity licenciada.
Usa Windows PowerShell e o Editor em D:\Unity\Editors\6000.3.27f1\Editor\Unity.exe;
a variável de repositório UNITY_EDITOR_PATH pode sobrescrever esse caminho.
A integração CI é restrita à branch codex/unity-foundation-ci
e ao proprietário vicfelipe, sem triggers de PR. Não há deploy no workflow.
O usuário cadastrou o runner COMPUTADOR, e a execução de M0 passou no GitHub
Actions. Consulte [CI_REMOTE.md](docs/CI_REMOTE.md) para resultados e operação.
Antes de automatizar PRs,
isolar o runner e definir uma política para código não confiável.

Pacotes Unity: licenças nos respectivos LICENSE.md do PackageCache;
nenhum código desses pacotes é copiado para Assets. Licença do código
original ainda deve ser definida pelo titular. Imagens legadas da origem
local são referências com direitos/revisão cultural pendentes; não foram
copiadas para este snapshot público e não são incluídas na build.

Leia AGENTS.md, ARCHITECTURE.md, MVP_0.1.md, GAMEPLAY_SPEC.md e
ASSET_PIPELINE.md antes de alterar o projeto. Decisões e evidências:
[ADR-0009](docs/ADRs/ADR-0009-project-foundation.md) e
[TASK-000](docs/tasks/TASK-000.md), [TASK-010](docs/tasks/TASK-010.md) e
[SESSAO.md](SESSAO.md).
