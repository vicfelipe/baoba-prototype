# BAOBA — Estado da sessão

Última atualização: 2026-10-29 21:20:00 -03:00 (America/Sao_Paulo).
Registro único da última modificação, mantido por solicitação do usuário.

Task/US: TASK-000/CI — validação remota de M0.
Objetivo: executar CI após o cadastro manual do runner pelo usuário.

Última modificação: workflow alinhado às labels self-hosted/Windows/X64,
UNITY_EDITOR_PATH com fallback para a Unity instalada, shell Windows
PowerShell e ignores para actions-runner/. Documentação e relatório atualizados.
Arquivos: .github/workflows/unity-foundation.yml, .gitignore,
unity/.gitignore, README, CI_REMOTE.md, ADR-0011, relatórios TASK-000/010/CI
e este registro. Ignore equivalente aplicado na origem D:\Projetos\baoba.

Decisões: manter escopo Unity em unity/, preservar gameplay web/main e não
fazer merge ou deploy automático. Runner COMPUTADOR cadastrado pelo usuário;
agente não instalou/iniciou seu Listener. Não se presume modo efêmero.

Testes executados: GitHub Actions 40978249556 → SUCCESS real, commit
f13e9e70d4b6984f0064a61354193d1d7654616c. Import/validator PASS, EditMode
21/21, PlayMode 3/3, metadata/lock PASS (52 GUIDs), upload NUnit PASS.
Windows PowerShell 5.1 também verificado localmente. Zero testes ignorados.

Build executada: Windows x64/Mono/StrictMode, Unity 6000.3.27f1 → PASS na CI.
Smoke de Bootstrap/serviços/cena/câmera → PASS, exit code 0.
Artefato unity-m0-test-results publicado no GitHub. Avaliação visual e
performance não executadas; ainda não há personagem, movimento ou combate.

Impacto em save/schema/IDs: nenhum; ID SESSION_ARU_MVP_001 e seed 1442 mantidos.
Novas dependências/licenças: nenhuma dependência Unity. Sem credenciais,
licença privada, novos assets artísticos ou conteúdo cultural versionados.

Riscos: host/licença do runner precisam permanecer disponíveis; estado é
controlado pelo usuário. Aviso Node 20→24 nas Actions, sem falha. Revisão
formal/ratificações não inferidas. Não há merge/deploy realizado pelo agente.

Critérios de aceite: CI/compilação de M0 atendidas com resultado real; MVP
jogável e revisão visual não fazem parte desta entrega.

Estado atual: TASK-000/010 implementadas e validadas localmente e na CI;
Bootstrap, relógio e catálogo presentes. Tentativa anterior sem pwsh falhou
e foi corrigida; rodada antiga com label baoba-unity foi cancelada.

PR draft: https://github.com/vicfelipe/baoba-prototype/pull/1.
CI validada: https://github.com/vicfelipe/baoba-prototype/actions/runs/40978249556.
Checkout: C:\Users\Victor\.codex\worktrees\unity-foundation-ci\baoba; Unity em unity/.
Origem preservada: D:\Projetos\baoba. Não copiar Library/Logs/Builds/runner para o Git.

Próximo passo limitado: TASK-020, movimento e câmera em sandbox, comparar
motor e registrar ADR-008; sem iniciar combate junto.

Relatório: [TASK-000-CI](docs/tasks/TASK-000-CI.md).
