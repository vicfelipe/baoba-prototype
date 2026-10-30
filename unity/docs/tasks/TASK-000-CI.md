# TASK-000/CI — Integração remota

Data: 2026-10-29. Status: compilação/CI de M0 validada no GitHub Actions.

Task/US: TASK-000/CI, preparação para TASK-020.
Objetivo: integrar o projeto Unity ao repositório informado, preservar o
protótipo web existente e executar a validação completa no runner autorizado.

Arquivos alterados: .github/workflows/unity-foundation.yml, ignores de runner,
projeto e documentos sob unity/, vercel.json e web/vercel.json somente para
bloquear deploy da branch codex/unity-foundation-ci. Nesta correção: labels
padrão do runner, fallback do Editor e Windows PowerShell disponível.
Sem mudança de gameplay, pacotes, assets culturais ou arquivos de licença.

Decisões/ADR: ADR-0011 atualizada conforme a configuração real do usuário.
Runner COMPUTADOR cadastrado pessoalmente pelo usuário, labels
self-hosted/Windows/X64. Não se presume --ephemeral ou remoção automática.
O workflow continua restrito a repositório/branch/proprietário, sem PR/forks,
sem merge/deploy automático e com GITHUB_TOKEN somente leitura.

PR draft: https://github.com/vicfelipe/baoba-prototype/pull/1.
Fonte validada: f13e9e70d4b6984f0064a61354193d1d7654616c.
Execução: https://github.com/vicfelipe/baoba-prototype/actions/runs/40978249556.
Conclusão real: SUCCESS, 2026-10-29 21:15 -03:00.

Testes executados:

- Projeto original e cópia limpa: Invoke-Unity.ps1 -Action All → PASS local.
- Windows PowerShell 5.1: Test-Repository.ps1 → PASS local.
- GitHub Actions: Invoke-Unity.ps1 -Action All → PASS no COMPUTADOR:
  Import, ContentValidator, EditMode 21/21, PlayMode 3/3, Build, Smoke.
- Metadata antes/depois do import e package lock → PASS, 52 GUIDs únicos,
  sete assemblies, referências pareadas. Nenhuma falha ou teste ignorado.
- Upload de unity-m0-test-results → PASS, artefato id 12942939729.
- Comparação dos vercel.json preservou configurações anteriores; git diff
  --check e exclusão de actions-runner/.credentials → PASS.

Build executada: Windows x64/Mono/StrictMode, Unity 6000.3.27f1 no runner,
exit code 0 → PASS. Smoke confirma Bootstrap, serviços, cena e câmera;
exit code 0 → PASS. Sem avaliação visual, performance ou alegação de gameplay.
Logs do Editor/licenciamento permanecem no host, não em artefatos públicos.

Impacto em save/schema/IDs: nenhum novo ID, migration ou save nesta etapa;
SESSION_ARU_MVP_001 e seed 1442 mantidos. Metadata e GUIDs preservados.

Novas dependências/licenças: nenhum pacote Unity novo. Actions checkout e
upload-artifact fixadas por SHA. Pacote oficial do runner 2.338.2 anteriormente
baixado fora do Git e conferido por SHA-256; cadastro/início efetivo feito
pelo usuário. Não foram versionados tokens, credenciais ou licença privada.

Tentativas corrigidas: 40976646788 cancelada por esperar label inexistente;
40977858453 falhou por pwsh ausente. A rodada 40978249556 passou após usar
Windows PowerShell e as labels disponíveis. UNITY_EDITOR_PATH é opcional e
sobrescreve o caminho padrão D:\Unity\Editors\6000.3.27f1\Editor\Unity.exe.
O comando automático de cadastro havia sido bloqueado por revisão automática;
o usuário resolveu essa etapa manualmente, sem contorno pelo agente.

Riscos conhecidos: runner depende de host/licença/sessão disponíveis e fica
sob gestão do usuário. Actions v4 emitiram aviso de migração Node 20→24,
sem falha da execução. Persistem revisão da PR e ratificações formais, não
inferidas. Main preservada, nenhum merge; consulta do commit validado retornou
zero deployments. A build atual ainda é técnica, sem personagem ou combate.

Critérios de aceite: import/compile, testes, IDs/metadata, build/smoke e CI
real atendidos. Revisão da PR e validação visual são pendências separadas;
não há alegação de que o MVP esteja jogável.

Próxima tarefa sugerida: TASK-020, protótipo de movimento/câmera em sandbox
com comparação do motor e registro da decisão ADR-008. Sem combate nesta task.
