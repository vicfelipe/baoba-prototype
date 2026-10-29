# SPEC_CONFLICT — sequência de M0

Data: 2026-10-29. Resolução de uma restrição introduzida pelo agente.

O relatório TASK-000 dizia que TASK-010 só poderia começar após CI remota
e ratificação da ADR-0009. Essa condição adicional não veio dos documentos
normativos. MVP_0.1 inclui projeto, CI **e Bootstrap** em M0 e posiciona o
gate de compilação/CI entre M0 e M1 (movimento). AGENTS.md proíbe contornar
gate reprovado; os checks locais de TASK-000 passaram, e a CI remota está
não verificada, sem resultado de reprovação.

Aplicação mínima: continuar TASK-010, ainda dentro de M0, conforme pedido do
usuário para continuar. Não iniciar TASK-020/M1 nesta entrega. TASK-000
continua incompleta quanto à execução remota. Não declarar ADR ratificada
nem CI aprovada; não publicar ou provisionar serviços externos sem destino
e autorização. A frase mais restritiva no relatório anterior é corrigida
por este registro explícito, sem alterar os gates normativos.
