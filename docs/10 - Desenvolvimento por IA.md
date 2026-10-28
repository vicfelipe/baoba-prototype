# Desenvolvimento assistido por IA — plano de execução

v0.2 · 24/10/2026. Entregar um protótipo curto com aparência e combate próximos da direção do usuário. IA acelera código, dados e repetição; qualidade de personagem, câmera e combate precisa de inspeção no motor.

## 1. Como tornar o trabalho executável

Uma tarefa deve produzir algo observável: “selecionar um inimigo e aplicar dano uma vez”, “importar um rig e correr sem deformar joelho”, “ler o círculo de perigo com câmera girando”. Não delegar “fazer o MMO” nem pedir todos os assets de uma vez.

Separar código/dados/apresentação o suficiente para testar; sem construir abstrações para futuros servidores. Geradores de cena devem ser repetíveis, preservar ajustes manuais em áreas próprias e não duplicar objetos a cada execução. Scripts de arte ajudam em escala, pivô, materiais e exportação; não garantem identidade ou pesos corretos.

Antes de implementação, criar instruções do projeto na raiz com escopo, versões e comandos realmente testados. Esse arquivo ainda não existe; esta revisão altera apenas documentação. A execução pode ser sequencial por um agente; não depende de uma equipe de agentes paralelos.

## 2. Marcos e ordem de dependências

**Hipótese de planejamento: 10–15 dias úteis**, com dedicação regular, ambiente disponível e reaproveitamento viável de animações. Não é compromisso de prazo nem estimativa baseada em implementação existente. Arte customizada fiel pode ultrapassar essa faixa; reestimar após M1 e ao localizar as referências. Não converter dias em orçamento sem horas disponíveis e custo real (D05).

| Marco | Esforço inicial | Entrega | Aceite / dependência |
| --- | --- | --- | --- |
| M0 — ambiente | 0,5–1 dia | Projeto, versões fixas e executável vazio | Abre fora do editor; resolve D07 |
| M1 — aparência e espaço | 1,5–2 dias | Sala de Estilo, câmera, material e herói provisório | Vídeo orbital e captura de jogo; direcionar D01/D03 antes de arte extensa |
| M2 — controle e combate básico | 2–3 dias | Movimento, alvo, ataque, Q, defesa, esquiva e Fragmento | Casos de combate aplicáveis do 03; feedback claro |
| M3 — experiência completa em blockout | 2–3 dias | Trilha, vestígio, Curupira, checkpoint, cura e final | Partida completa e reset reproduzível, mesmo com arte provisória |
| M4 — substituir provisórios essenciais | 2–3 dias | Herói/chefe, kit mínimo, UI e áudio consistentes | Deformação e estilo conforme 05/11; mecânicas preservadas |
| M5 — teste e entrega | 2–3 dias | Build, evidências, correções prioritárias e relatório | Critérios do 01 e medição do 07; pendências residuais declaradas |

Soma de referência: 10–15 dias. M1 aprova uma direção inicial; M4 confirma a aplicação aos assets finais do P0. Uma cápsula basta para M2/M3 técnicos, mas não fecha M1 visual nem M4 artístico. Tarefas técnicas podem avançar enquanto referências são reunidas, sem anunciar aparência aprovada.

## 3. Primeiras tarefas pequenas

| Tarefa | Entrada | Saída verificável |
| --- | --- | --- |
| T01 | Ferramentas do 09 | Executável com chão, luz e saída |
| T02 | 05, 07 e 08 | Sala com árvore, pedra, herói provisório e câmera; imagens com resolução identificada |
| T03 | 01 e 03 | Um alvo, seleção e dano único, com teste de fora de alcance |
| T04 | 03 | Cone de ataque que pode ser evitado ou defendido |
| T05 | 03 | Q interrompe conjuração; cooldown não é consumido em comando inicialmente inválido |
| T06 | 01 e 03 | Derrota e reinício limpam perigos e restauram estado |
| T07 | 01 | Vestígio libera arena; cura libera interação final; conclusão só uma vez |
| T08 | 11 | Herói importado com fonte e vídeo de deformação |
| T09 | 05 e 07 | Comparação visual e perfil do executável |

Nenhuma tarefa acima foi executada nesta revisão documental.

## 4. Contrato de tarefa para IA

```text
Objetivo: comportamento visível que falta.
Escopo: arquivos e componentes envolvidos.
Entradas: documento vigente, dados e referências realmente presentes.
Restrições: P0 Windows solo, sem pacote novo sem necessidade demonstrada.
Entrega: código/asset/dado com fonte editável quando aplicável.
Aceite: procedimento e resultado esperado.
Evidência: comando executado, log, captura ou vídeo e versão.
Pendências: o que permanece desconhecido ou exige direção.
```

Ao terminar, dizer o que foi modificado, o que foi verificado e o que falhou. Não inventar caminhos de imagens, não marcar build como pronta pelo sucesso da geração de script, não apresentar render de conceito como captura do jogo.

## 5. Automação útil e trabalho visual

| A IA pode acelerar | Ainda precisa de avaliação no resultado |
| --- | --- |
| Componentes C#, JSON, reset, validações | Sensação do movimento, escolha de alvo e ritmo |
| Montagem repetível de cenário e materiais | Composição, contorno, pintura e legibilidade |
| Export, nomes, pivôs e relatório de malha | Identidade, topologia e deformação |
| Seleção inicial e adaptação de clips | Contato de pés, pegada e preparação de ataques |
| Registro de testes locais | Compreensão por pessoas que não conhecem o design |

Não prometer redução de equipe para “6–9 pessoas” nem custo fixo por ser feito com IA. O gargalo pode migrar de código para seleção de arte e correção. Registrar horas por categoria nos primeiros marcos e ajustar o plano com isso.

## 6. Validação proporcional

Testes automatizados para regras que quebram o fluxo: dano uma vez, recarga, interrupção, pausa e reset. Smoke test da build após mudanças de integração. Revisão visual para mudanças de câmera, shader, personagem e UI; não criar teste artificial de cada detalhe decorativo.

Registro de playtest: build, equipamento, duração, conclusão, tentativas, mortes por mecânica, momentos de confusão e comentário sobre visual. Dados locais, sem serviço de telemetria ou cadastro. Registrar duas perguntas: “O que parecia necessário fazer?” e “O que mais aproximou ou afastou o visual das referências?”.

## 7. Quando cortar ou reestimar

Se M0 falha por instalação, resolver o ambiente antes de produzir conteúdo. Se M1 não parece hand-drawn, corrigir material/composição antes de duplicar assets. Se M3 não diverte, ajustar alcance, aviso e ritmo antes de adicionar classe. Se a arte fiel exceder o prazo, entregar separadamente o blockout técnico e declarar o marco artístico em aberto; não substituir identidade silenciosamente.

Depois do P0, escolher uma expansão: segundo encontro, segunda classe, prova mobile ou prova coop. Uma por vez. A campanha de 50 níveis e o MMO não entram automaticamente após uma demo bem-sucedida.

## 8. Atualização — teste de reaproveitamento antes de produção própria

Inserir **T02A** após M0, durante M1 e antes de consolidar M2: executar o teste do [pacote de animações indicado pelo usuário](<13 - Avaliacao do pacote de animacoes.md>). Limite inicial proposto: um dia útil de investigação dentro dos marcos existentes; se ultrapassar, reestimar em vez de esconder custo. Reutilizar antes de reimplementar o equivalente. Registrar clips cobertos, lacunas de lança/escudo e rota de integração. O prazo só diminui após evidência de economia real.
