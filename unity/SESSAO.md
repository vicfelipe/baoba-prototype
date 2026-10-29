# BAOBA — Estado da sessão

Última atualização: 2026-10-29 20:58 -03:00 (America/Sao_Paulo).
Registro único da última modificação; atualizar conforme AGENTS.md, seção 10.

Task/US: TASK-000/CI — fechamento de M0, sem iniciar movimento.
Objetivo: configurar CI no repositório informado pelo usuário, preservando
seu protótipo web existente e o projeto original em D:\Projetos\baoba.

Arquivos alterados: .github/workflows/unity-foundation.yml na raiz do
repositório; nova pasta unity/ com o projeto M0 validado e seus documentos;
vercel.json e web/vercel.json apenas com o bloqueio de deploy da branch
codex/unity-foundation-ci. CI_REMOTE.md, ADR-0011, TASK-000-CI.md e esta sessão.
Concept arts e legado v7 da origem não foram copiados para o snapshot público.

Decisões/ADR: usuário escolheu CI remota antes de movimento e informou
https://github.com/vicfelipe/baoba-prototype. ADR-0011 registra integração
sem reescrever histórico. Branch baseada na main existente, sem merge
ou deploy automático; workflow restrito a branch/repositório/proprietário.

Testes executados: no projeto original e na cópia limpa, Invoke-Unity.ps1
-Action All com EditorPath D:\Unity\Editors\6000.3.27f1\Editor\Unity.exe
→ PASS: Import, Validate, EditMode 21/21, PlayMode 3/3, Build e Smoke.
Test-Repository.ps1 → PASS antes de importar, 52 GUIDs únicos e lock alinhado.
Parse/comparação dos vercel.json → PASS, somente guard de branch adicionado.
Git diff --check → PASS antes de publicar.

Build executada: Unity 6000.3.27f1, Windows x64/Mono/StrictMode → PASS nos
dois checkouts. Smoke de Bootstrap/serviços/cena/câmera → PASS, exit code 0.
NÃO VERIFICADO: execução remota GitHub, avaliação visual e performance.

Impacto em save/schema/IDs: nenhum ID/migration novo nesta integração;
SESSION_ARU_MVP_001 e seed 1442 mantidos, metadata copiada sem editar GUIDs.
Novas dependências/licenças: nenhum pacote Unity. Actions fixadas por SHA;
runner oficial 2.338.2 baixado fora do Git e validado por SHA-256.
Nenhuma credencial ou licença privada no repositório.

Riscos conhecidos: revisão automática de aprovação bloqueou o comando de
configuração de variável e cadastro/inicialização do runner, com motivo
"blocked by policy" sem detalhes adicionais. Não foi executado; não há
runner registrado/Listener ativo pelo agente. Não contornar o bloqueio.

Critérios de aceite: layout/validação local atendidos. CI remota e gate M0→M1
pendentes de execução real; revisão/ratificações formais não inferidas.

Estado atual: TASK-000 e TASK-010 implementadas e validadas localmente.
Bootstrap, relógio e catálogo presentes; sem movimento, combate ou jogo
jogável. Integração preparada na branch codex/unity-foundation-ci, em checkout
separado; main remota e arquivos web de gameplay preservados.

Próximo passo limitado: abrir/revisar PR e cadastrar pessoalmente o runner
Windows efêmero e a variável UNITY_EDITOR_PATH conforme docs/CI_REMOTE.md.
Aguardar resultado remoto antes de TASK-020. Não fazer merge automático.

Relatório: [TASK-000-CI](docs/tasks/TASK-000-CI.md).
