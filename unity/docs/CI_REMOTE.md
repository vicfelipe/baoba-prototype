# CI remota de M0

Repositório: https://github.com/vicfelipe/baoba-prototype
Branch de integração: codex/unity-foundation-ci.

O projeto Unity está em unity/, separado do protótipo web existente. A pasta
docs/concept-art e o documento legado v7 da origem não foram publicados nesta
integração: são referências fora do runtime e com revisão de direitos pendente.
Não há mudança de gameplay web nem merge automático em main.

## Workflow

.github/workflows/unity-foundation.yml valida metadata/lock antes de importar,
executa Invoke-Unity.ps1 -Action All e confere metadata novamente. Inclui
import/compile, ContentValidator, EditMode, PlayMode, build Windows e smoke.
Os resultados NUnit são guardados por sete dias. Logs do Editor, runner e
licenciamento permanecem locais; não são publicados como artefatos públicos.

Actions checkout e upload-artifact estão fixadas por SHA oficial. O job só
aceita este repositório, branch de integração e usuário vicfelipe. Não há
trigger de pull_request/pull_request_target, deploy ou acesso de escrita do
GITHUB_TOKEN. Checkout não persiste suas credenciais. Os dois vercel.json
desabilitam deployment somente desta branch de integração.

UNITY_EDITOR_PATH é uma variável opcional do repositório, com caminho absoluto
do Editor. Na ausência dela, usa D:\Unity\Editors\6000.3.27f1\Editor\Unity.exe.
O runner verifica a versão exata em ProjectVersion.txt. É necessária
uma instalação licenciada/autorizada de Unity 6000.3.27f1 com Windows Build
Support, Windows PowerShell 5.1, Git e Git LFS, além de sessão gráfica para
PlayMode. Os scripts também foram executados localmente em PowerShell 7.

## Runner cadastrado pelo usuário

O usuário cadastrou o runner COMPUTADOR (id 2), online, com labels padrão
self-hosted/Windows/X64. O workflow foi alinhado a essas labels; não exige
baoba-unity. O agente não instalou nem iniciou o processo Listener.
O estado do runner é gerenciado pelo usuário; não se presume remoção ao final
do job, pois a configuração observada não registra o modo ephemeral.

Para rodadas futuras, manter o runner autorizado online ou provisionar outro
com essas labels. Preferir --ephemeral em hosts descartáveis quando aplicável.
Credenciais e estado do runner ficam fora do Git; /actions-runner/ foi
adicionado aos ignores da origem, repositório e projeto Unity.
Depois de merge, revisar os triggers e
o guard de branch em conjunto com uma política de runner confiável; não
habilitar execução automática de código de forks numa máquina pessoal.

Fontes: [runners efêmeros](https://docs.github.com/en/actions/reference/runners/self-hosted-runners),
[API de runners](https://docs.github.com/en/rest/actions/self-hosted-runners),
[Git configuration Vercel](https://vercel.com/docs/project-configuration/git-configuration).

## Histórico de configuração e operação

A revisão automática de aprovação bloqueou o comando que configuraria a
variável do Editor e cadastraria/iniciaria o runner. Motivo retornado:
"blocked by policy", sem explicação adicional. O comando não foi executado.
O usuário realizou o cadastro manualmente; essa pendência foi resolvida sem
contornar o bloqueio pelo agente.

1. Se o Editor estiver em outro caminho, em Settings > Secrets and variables >
   Actions > Variables, criar UNITY_EDITOR_PATH com seu caminho absoluto.
2. Em Settings > Actions > Runners > New self-hosted runner, selecionar
   Windows/x64. O pacote 2.338.2 já foi baixado e teve SHA-256 conferido
   localmente em D:\Projetos\baoba\Logs\gha. Em outro host autorizado, seguir
   o download e a conferência indicados pelo próprio GitHub.
3. No host autorizado, executar pessoalmente o comando de configuração da
   página, mantendo as labels padrão. Usar --ephemeral se o host for destinado
   a um único job.
   Não usar --runasservice. O token temporário da página não deve ser salvo
   no repositório nem enviado pelo chat.
4. Executar run.cmd sob o usuário com licença Unity e aguardar o job desta
   branch. Ele foi configurado para disparar por push na branch de integração;
   se já tiver expirado, usar Re-run jobs no GitHub. Somente uma inscrição
   criada com --ephemeral é removida automaticamente após um job.

O guard de proprietário/branch deve permanecer ativo. workflow_dispatch só
fica disponível normalmente após o workflow existir na branch padrão; não
fazer merge automático apenas para habilitar o botão.

## Resultado real

[Execução 40978249556](https://github.com/vicfelipe/baoba-prototype/actions/runs/40978249556)
no commit f13e9e70d4b6984f0064a61354193d1d7654616c: SUCCESS em 2026-10-29,
21:15 -03:00. Checkout, metadata, import/compile, ContentValidator, EditMode
21/21, PlayMode 3/3, build Windows, smoke e upload de relatórios passaram.
Artefato unity-m0-test-results publicado; sem deploy ou merge automático.

Tentativas anteriores: rodada antiga cancelada por aguardar label que não
existia; rodada 40977858453 falhou por pwsh ausente. O workflow foi corrigido
para Windows PowerShell disponível no host e então passou integralmente.
