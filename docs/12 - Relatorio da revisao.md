# Relatório da revisão documental

24/10/2026 · v0.2 · Abrangência: os 11 documentos originais em `docs`, substituídos por especificações ativas do P0; originais preservados integralmente no histórico.

## 1. Diagnóstico

A identidade temática de Baobá é forte: memória como magia, Silêncio que retira a cor, guardiões libertados e fantasia enraizada no Brasil. O problema para o objetivo atual era a distância entre essa identidade e um primeiro resultado executável.

O material anterior planejava campanha de 25–30 horas, quatro classes, oito regiões de campanha, centenas de modelos, companheiros, múltiplas plataformas e MMO posterior. Seu primeiro slice ainda incluía quatro classes, profissões, aliados de IA e uma região completa. Isso continuava sendo uma produção grande, mesmo antes do multiplayer.

O pedido atual confirma jogo 3D com mecânicas, direção hand-drawn, referências Tarisland/WoW/Grand Chase e prototipagem rápida. A revisão transforma essa direção em um recorte testável. Ela não transforma o plano de MMO em promessa de que poderá ser entregue logo após o P0.

## 2. Achados e correções

| Gravidade para o protótipo | Evidência no material anterior | Correção aplicada | Efeito / limite |
| --- | --- | --- | --- |
| Alta | 01, seção 18: slice inicial com quatro classes, região, masmorra, coleta/fabrico e Ecos | Um Guardião, trecho da Mata Viva, inimigo reutilizável e um chefe | Reduz volume sem retirar combate com mecânicas |
| Alta | 06: estimativa de cerca de 600 modelos e centenas de peças de cenário | Lista fechada de 16 designs 3D, dois rigs no máximo | Ainda depende de modelagem/animação; não é geração instantânea |
| Alta | 01 descreve semi-realismo e cabelo por mechas; 05/07 exigem toon e volumes sólidos | Uma direção ilustrada 3D, cabelo sólido, pintura e hierarquia de contorno | Estilo específico de Grand Chase ainda precisa de imagens |
| Alta | 07 exige paleta com UVs colapsados, mas também linhas e costuras locais | Atlas pintado com UV de superfície; paleta como apoio | Torna o hand-drawn de superfície implementável |
| Alta | 01/09/10 carregam escolhas de backend e ferramentas mesmo com primeiro jogo solo | Pilha local pequena e dados JSON | Evita preparar infraestrutura que o P0 não exercita |
| Alta | 02 marca AGENTS.md/referências como feitos; 11 descreve modelos e script ausentes | Estado “não verificado”; nenhum asset anunciado como existente | Fidelidade depende de recuperar D03 |
| Alta | 07/08 combinam números exatos e metas de múltiplos dispositivos sem medição | Hipóteses explícitas, uma plataforma e protocolo de profiling | Não há garantia de FPS por contagem de polígonos |
| Média | 08 usa fórmula frontal como proporção exata com câmera inclinada | Fórmula aproximada e meta a medir por captura | Evita falsa precisão de enquadramento |
| Média | 07 prevê efeito global de dessaturação; 05 exige pele sempre legível | Corrupção nos materiais selecionados | Preserva pele, HUD e sinais de combate |
| Média | 07 sugere reusar humanoide para anatomias muito diferentes | Herói Humanoid; Curupira com rig adequado e testes próprios | Pés invertidos deixam de ser detalhe ignorado |
| Média | 03 contém mecânicas de grupo, troca de tanque e vários chefes | Máquina de estados solo: cone, área e interrupção | Estratégia testável sem construir aliados |
| Média | 01 e 03 divergem no efeito do Rei Sem Rosto e na escala/descritivos de chefes | Conteúdo de raide retirado do contrato ativo | Histórico preservado, mas não “corrigido e pronto para implementar” |
| Média | Especificações exigem LODs, dezenas de animações e modos de câmera desde cedo | Um LOD, um modo, clips mínimos e roupa fixa | Otimizar depois de medir o gargalo real |
| Média | 07 usa GLB para estáticos sem fechar importação na pilha | FBX para o P0 inteiro | Reduz uma integração opcional |
| Média | 10 afirma vantagens atuais de IA, redução de equipe e licenças com fontes heterogêneas | Retirar essas certezas do plano; verificar instalação e origem de cada asset | Ferramentas não substituem orçamento, direção e QA |
| Média | Referências a “embedded content” não têm diagrama acessível | Fluxo e critérios descritos em texto/tabelas | Nenhum requisito depende de conteúdo incorporado ausente |

As correções são decisões documentais, não correções de um jogo já implementado.

## 3. Mudança por documento

| Arquivo | Resultado |
| --- | --- |
| 01 — Game Design | Experiência, controles, escopo incluído/adiado, checkpoint, vitória e aceite do P0 |
| 02 — Pendências | 12 decisões rastreáveis com padrão de trabalho, responsável e momento de bloqueio |
| 03 — Encontros | Valores iniciais, prioridades de ação, geometria de acerto, chefe solo e casos de teste |
| 04 — Prompts | Pedidos curtos para composição, herói, chefe e kit; sem produção de onze regiões |
| 05 — Guia de arte | Matriz Tarisland/WoW/Grand Chase, pintura em 3D e validação em movimento |
| 06 — Assets | Inventário contado, fontes, reuso, mínimos e ordem de cortes |
| 07 — Especificações | Materiais, UV, rigs, formatos, arquitetura local e protocolo de medição |
| 08 — Câmera | Um modo orbital, medidas próprias, colisão e cálculo de presença na tela corrigido |
| 09 — Ferramentas | Pilha mínima, dependências adiadas e fontes técnicas oficiais delimitadas |
| 10 — Desenvolvimento por IA | Marcos M0–M5, tarefas pequenas, evidências e estimativa condicional |
| 11 — Personagens | Identidade preservada, referências ausentes explícitas, provisório separado de fiel |

Adicionados: `README.md` como entrada, este relatório e índice/manifesto do histórico. Nenhum arquivo original foi descartado. Os 11 originais podem ser comparados pelos hashes do manifesto.

## 4. Escolhas que ainda são propostas

Windows primeiro, Guardião, Mata Viva, Curupira de 3 m, controles, 16 designs, 10–15 minutos de sessão e 10–15 dias úteis de esforço são propostas desta revisão. O usuário confirmou as referências e a intenção 3D/hand-drawn, não cada número ou recorte. O documento 02 deixa essas diferenças explícitas.

O risco principal restante é **arte de personagem fiel**: dois rigs e aparência específica podem exceder o prazo. Não há imagem do Guardião ou seleção de Grand Chase disponível para comparar. A mitigação é construir o combate com provisórios enquanto se valida uma composição pequena e recuperar referências antes de modelagem final.

O segundo risco é **sensação de combate**. Números de dano, recarga, câmera e movimento são pontos de partida. Nenhuma revisão de texto demonstra que o jogo diverte. O encontro precisa ser jogado por quem não participou da documentação.

## 5. Critério de expansão

Só expandir depois de: uma partida completa, estilo validado no motor, reset sem falhas e teste exploratório registrado. Escolher então uma nova hipótese — segunda classe, outro chefe, mobile ou coop — em vez de retomar toda a lista histórica.

A visão de MMO, regiões, lore e economia continua disponível para consulta. Reativá-la exige novo escopo, capacidade de produção, validação técnica e atualização das fontes pertinentes.

## 6. O que esta revisão verificou

Leitura e reorganização documental; existência dos arquivos no workspace; preservação dos originais; referências internas e coerência de números/escopo. Consulta externa delimitada aos manuais oficiais de URP, Cinemachine e rig, citados no documento 09.

Não foram executados Unity, build, shader, modelagem, animação, profiling ou playtest. Não foram revalidadas afirmações históricas, jurídicas, financeiras e de mercado do arquivo antigo. O histórico não equivale a um relatório factual atualizado.

## 7. Complemento após indicação de pacote

O usuário indicou uma biblioteca de animação e controle de personagem. Acrescentado documento 13 e atualizado o plano de ferramentas, assets, personagens, tarefas e pendências (D13) para priorizar teste de reaproveitamento. A consulta ao fabricante e à loja está registrada no 13; não houve importação. O escopo do jogo permanece igual e a cobertura de lança/escudo continua aberta.
