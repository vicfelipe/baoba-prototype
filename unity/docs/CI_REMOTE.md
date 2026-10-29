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

UNITY_EDITOR_PATH é uma variável do repositório, com caminho absoluto do
Editor. O runner verifica a versão exata em ProjectVersion.txt. É necessária
uma instalação licenciada/autorizada de Unity 6000.3.27f1 com Windows Build
Support, PowerShell 7, Git e Git LFS, além de sessão gráfica para PlayMode.

## Runner temporário

O primeiro job requer um runner efêmero Windows x64 sob o usuário que já possui
o Editor/licença instalado. Não é instalado serviço nem tarefa agendada.
A inscrição --ephemeral permite um único job e o GitHub remove o registro
ao final. O processo precisa estar online enquanto o workflow executa.
O pacote oficial do runner tem SHA-256 conferido antes da extração.
Credenciais de registro são obtidas pela API e não entram no Git.

Após esse job não haverá runner permanente online. Para rodadas futuras,
provisionar outro runner autorizado e efêmero com label baoba-unity e então
fazer push na branch de integração. Depois de merge, revisar os triggers e
o guard de branch em conjunto com uma política de runner confiável; não
habilitar execução automática de código de forks numa máquina pessoal.

Fontes: [runners efêmeros](https://docs.github.com/en/actions/reference/runners/self-hosted-runners),
[API de runners](https://docs.github.com/en/rest/actions/self-hosted-runners),
[Git configuration Vercel](https://vercel.com/docs/project-configuration/git-configuration).

## Ação manual necessária

A revisão automática de aprovação bloqueou o comando que configuraria a
variável do Editor e cadastraria/iniciaria o runner. Motivo retornado:
"blocked by policy", sem explicação adicional. O comando não foi executado;
não há runner registrado ou processo Listener ativo. Não contornar esse bloqueio.

1. Em Settings > Secrets and variables > Actions > Variables, criar
   UNITY_EDITOR_PATH com o caminho absoluto do Editor instalado, por exemplo
   D:\Unity\Editors\6000.3.27f1\Editor\Unity.exe.
2. Em Settings > Actions > Runners > New self-hosted runner, selecionar
   Windows/x64. O pacote 2.338.2 já foi baixado e teve SHA-256 conferido
   localmente em D:\Projetos\baoba\Logs\gha. Em outro host autorizado, seguir
   o download e a conferência indicados pelo próprio GitHub.
3. No host autorizado, executar pessoalmente o comando de configuração da
   página, acrescentando --unattended --labels baoba-unity --ephemeral.
   Não usar --runasservice. O token temporário da página não deve ser salvo
   no repositório nem enviado pelo chat.
4. Executar run.cmd sob o usuário com licença Unity e aguardar o job desta
   branch. Ele foi configurado para disparar por push na branch de integração;
   se já tiver expirado, usar Re-run jobs no GitHub. Após um job, a inscrição
   efêmera é removida automaticamente. Não há serviço permanente instalado.

O guard de proprietário/branch deve permanecer ativo. workflow_dispatch só
fica disponível normalmente após o workflow existir na branch padrão; não
fazer merge automático apenas para habilitar o botão.

Resultado do primeiro job remoto: pendente; preencher após conclusão real.
