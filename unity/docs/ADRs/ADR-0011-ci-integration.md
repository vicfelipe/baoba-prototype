# ADR-0011 — Integração da CI remota de M0

Data: 2026-10-29. Task: TASK-000/CI.
Status: implementação para revisão; CI remota escolhida explicitamente pelo usuário.

O usuário informou vicfelipe/baoba-prototype e preferiu configurar CI remota
antes de movimento. O remoto contém um protótipo web com histórico próprio.

## Decisão

Preservar o protótipo existente e adicionar Unity em unity/, numa branch
codex/unity-foundation-ci baseada na main existente. Não reescrever histórico,
substituir README raiz, mover assets web ou mesclar automaticamente. O projeto
original em D:\Projetos\baoba continua preservado; a integração tem checkout
separado. Tools/ da Unity fica sob unity/ para não colidir com tools/ do web.

Publicar somente fontes/configuração Unity e seus documentos operacionais.
Concept arts e documento legado v7 da origem ficam fora desse snapshot por
não serem necessários à build e terem revisão de direitos/cultura pendente.

Workflow com push restrito à branch de integração e proprietário vicfelipe;
sem triggers de forks/PR. Checkout e upload-artifact fixados por SHA. Token
do job somente leitura, checkout sem persistência de credenciais. Artefatos
públicos limitados aos relatórios NUnit; logs de licença/runner ficam locais.

Execução exige Windows x64 com Editor Unity instalado/licenciado e variável
de repositório UNITY_EDITOR_PATH. Não copiar licença/segredo para o GitHub.
Runner efêmero com label baoba-unity permite um job e se desregistra, sem
serviço Windows ou tarefa agendada permanente.

Cadastro automático foi bloqueado pela revisão automática de aprovação
("blocked by policy"). Não contornar. Fornecer configuração revisável e
instruções para cadastro manual em CI_REMOTE.md; nenhuma execução remota
é presumida. Download local do runner oficial 2.338.2 teve hash conferido.

Os dois arquivos vercel.json recebem somente git.deploymentEnabled=false
para esta branch, preservando configurações e comportamento de outras
branches. Workflow não publica o jogo/site. Gate M0→M1 permanece pendente
até haver resultado real da CI; aprovação formal das ADRs não é inferida.
