# ADR-0009 — Fundação técnica do projeto

Status: implementada para validação; ratificação humana pendente.
Data: 2026-10-29. Task: TASK-000.

Aplica ADR-001/002/007, já normativas em ARCHITECTURE.md. A numeração
ADR-008 permanece reservada à escolha do motor de movimento.

## Decisão

Usar o Editor instalado 6000.3.27f1 (672d562a42a7), Unity 6.3 LTS,
e URP 17.3.0 fornecido com esse Editor. Fixar Input System 1.20.1,
Cinemachine 3.1.7, Animation Rigging 1.4.1, AI Navigation 2.0.16,
Test Framework 1.6.0 e ProBuilder 6.1.4. As versões e requisitos mínimos
foram consultados no registro oficial packages.unity.com; URP foi
confirmado no package.json local do Editor. O UPM selecionou o Test Framework
1.6.0 integrado ao Editor; o pin foi alinhado ao package.json local após o
primeiro import. O lock é gerado pelo UPM.
Compatibilidade efetiva depende do import e dos testes registrados na task.

Core e Gameplay não referenciam UnityEngine. Content depende de Core;
Unity depende de Core, Gameplay e Content; Editor integra as camadas.
Testes EditMode verificam essas fronteiras e configuração. PlayMode
verifica a entrada/saída da cena técnica, sem implementar gameplay.

Criar somente uma cena técnica vazia, 99_InfrastructureSmoke, por Editor API.
Ela verifica empacotamento; não é Bootstrap nem uma entrega jogável.
Um probe runtime ativado somente por -baobaSmoke verifica cena/câmera após
três frames e encerra o executável com exit code e marcador no log.
Setup é explícito, preserva assets existentes e não roda ao abrir o Editor.
Build falha sem cenas configuradas ou configuração URP válida.

CI usa workflow_dispatch e runner Windows próprio com label baoba-unity,
Editor exato, Git LFS e licença autorizada. Nenhum runner é provisionado
ou registrado automaticamente. PR/push só serão ativados após provisionar
runner confiável; não executar código de forks em máquina pessoal.

Manter os cinco documentos normativos na raiz e ADRs em docs/ADRs:
o layout Docs/ da arquitetura é proposto, não motivo para duplicar documentos.

## Consequências

Não há dependências de backend, Addressables ou DI externo. Pacotes Unity
mantêm suas licenças de distribuição; fontes não são vendorizadas. Setup
inicial requer resolução de pacotes; offline é o alvo de runtime, não uma
garantia de instalação inicial sem downloads. Licença do código do projeto
ainda não foi definida pelo titular; não se presume licença aberta.
