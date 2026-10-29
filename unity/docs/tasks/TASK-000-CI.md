# TASK-000/CI — Integração remota

Task/US: TASK-000/CI, fechamento de M0 antes de TASK-020.
Objetivo: integrar a fundação Unity ao repositório informado e preparar CI
Windows, preservando o protótipo web e o projeto local original.

Arquivos alterados: .github/workflows/unity-foundation.yml; nova pasta unity/
com Assets, Packages, ProjectSettings, Tools e documentos operacionais;
vercel.json e web/vercel.json apenas para desabilitar deploy desta branch;
unity/docs/CI_REMOTE.md, ADR-0011, este relatório e SESSAO.md.
Nenhum asset/code de gameplay web foi alterado. Concept arts e legado v7
da origem não são parte do snapshot público.

Decisões/ADR: ADR-0011 e escolha explícita do usuário por CI remota, em
vez de exceção local. Branch codex/unity-foundation-ci baseada na main
912627f2444f67fc88b37d80ebfb286929dcb54a; sem reescrita/merge automático.
Workflow só executa para esse repositório/branch/proprietário. SHA das
Actions confirmado nos tags oficiais; sem jobs de forks/PR ou deploy.

Testes executados:

- Projeto original: Invoke-Unity.ps1 -Action All → PASS em sequência única:
  import, validator, EditMode 21/21, PlayMode 3/3, build e smoke.
- Cópia unity/: Test-Repository.ps1 → PASS, 52 GUIDs únicos, metadata
  pareada, sete assemblies e manifesto/lock alinhados antes de importar.
- Cópia limpa: Invoke-Unity.ps1 -Action All com EditorPath absoluto → PASS:
  Import, Validate, EditMode 21/21, PlayMode 3/3, Build e Smoke em sequência única.
- git diff --check e parse dos dois vercel.json → PASS.

Build executada: projeto original Windows x64/Mono/StrictMode → PASS,
exit code 0 e smoke PASS. Build e smoke da cópia limpa também PASS,
exit code 0; sem afirmar validação visual/performance.
CI GitHub: NÃO VERIFICADO, aguardando runner/variável configurados manualmente.

Impacto em save/schema/IDs: nenhum novo ID, migration ou save; fontes e
metadata Unity copiadas preservando conteúdo e GUIDs. Não salvar referências
Unity no progresso do jogador.

Novas dependências/licenças: sem novo pacote Unity. Ferramentas CI: checkout
v4 e upload-artifact v4 fixados por SHA; runner GitHub oficial 2.338.2 baixado
fora do Git e conferido pelo digest SHA-256
a1f17aa987fc8158bc7521d284912267a0d01b7c2c4684b33c86783b5e8221cc.
Nenhuma credencial/licença privada foi adicionada ao repositório.

Riscos conhecidos: runner inexistente no repositório. Revisão automática de
aprovação bloqueou o comando de variável/cadastro/inicialização do runner;
retornou somente "blocked by policy". O comando não executou. Não há serviço
ou Listener instalado em execução; pacote baixado é apenas ferramenta local.
PR não deve ser mesclada automaticamente. Logs sensíveis não são artefatos
públicos. Editor/PlayMode exigem host Windows e licença autorizados.

Critérios de aceite atendidos/não atendidos: estrutura e workflow preparados,
preservação do protótipo web e isolamento da Unity atendidos. Resultado
remoto/gate M0→M1 não atendidos até execução real; revisão/ratificação pendentes.

Próxima tarefa sugerida: cadastrar manualmente o runner efêmero e variável
conforme CI_REMOTE.md; aguardar PASS real de M0. Não iniciar TASK-020 ainda.
