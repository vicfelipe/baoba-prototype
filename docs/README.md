# Baobá — documentação do protótipo

Revisão v0.3 · 25/10/2026 · Estado: protótipo de combate implementado; revisão artística em avaliação.

## Entrega jogável atual

**Fase 3 — Porto de Santos (28/10):** escolhida na tela de título. Dia de ressaca no cais, no canal, no calçadão e na praia, com 3 afogados do cais e 2 criaturas de coral, uma garrafa com carta e o trapiche até um deque no meio do mar. Lá, a Iara (na água, liberta ao fim) e o Ipupiara (no deque, vencido) lutam juntos, e o mar é a mecânica da dupla: ressaca, maré alta e queda no mar. A vitória acalma o mar e abre o sol. Ver [25 — Porto de Santos](<25 - Porto de Santos fase 3.md>).

**Fase 2 — Sertão Velho (27/10):** escolhida na tela de título. Noite gótica no arraial abandonado, 5 mortos-vivos (variações do Fragmento) saindo das covas, folheto de cordel no cemitério, portão de ferro e a Mula sem Cabeça no terreiro do casarão; a vitória traz o amanhecer. Ver [24 — Sertão Velho](<24 - Sertao Velho fase 2.md>).

**Cangaceiro (26/10):** classe DPS Ranged produzida pelo pipeline Lunia a partir das referências do usuário: modelo, armas (bacamarte, pistolas, peixeira), rig e 11 clipes, no visualizador do protótipo web. Ainda não jogável. Ver [21 — Cangaceiro: produção e integração](<21 - Cangaceiro producao e integracao.md>).

**Curupira (26/10):** duas formas com malhas, texturas, rig e clipes próprios integradas ao protótipo web, transformação após a vitória e visualizador de personagens. Processo, validações e limitações em [20 — Curupira: produção e integração](<20 - Curupira producao e integracao.md>).

O usuário escolheu **Lutador × Curupira** e adicionou as referências em `arts`. O protótipo foi implementado em Unity. Consulte [14 — Protótipo implementado](<14 - Prototipo Lutador e Curupira.md>) e o [README de execução](../README.md). Esta entrega de arena substitui o recorte anterior de Guardião descrito abaixo; ele permanece como registro de planejamento.

**Classes (26/10):** o usuário definiu a composição final — Vaqueiro (Tanker), Capoeirista (DPS Melee), Cangaceiro (DPS Ranged), Maloka ou Mateiro (DPS Stealth) e Benzedeiro ou Pajé (Healer). Ver [19 — Classes](<19 - Classes.md>). Heróis jogáveis no protótipo web, escolhidos na tela de título: **Capoeirista** ([18](<18 - Pipeline de personagens estilo Lunia.md>)), **Cangaceiro** ([21](<21 - Cangaceiro producao e integracao.md>)), **Vaqueiro** ([23](<23 - Vaqueiro producao.md>)) e **Maloka** ([24](<24 - Maloka producao.md>), desde 28/10).

**Versão web 2.5D (25/10):** a pedido do usuário, o jogo foi recriado para navegador em [`web/`](../web/README.md), com câmera fixa 2.5D e direção de arte do Lunia (proporção anime, cenário pintado), mecânica inspirada em Tarisland. Ver [16 — Protótipo web 2.5D](<16 - Prototipo web 2.5D.md>).

A arte vigente da versão Unity está em [15 — Revisão visual dos personagens](<15 - Revisao visual dos personagens.md>): modelos reconstruídos pelas referências, sem limite prévio de triângulos. Esse documento substitui os orçamentos de simplificação anteriores para os dois personagens.

## Direção confirmada pelo usuário

Jogo **3D**, com mecânicas inspiradas em **Tarisland e WoW** e direção **hand-drawn**, usando **Grand Chase como referência artística**. Desenvolvimento assistido por IA e prioridade em chegar rápido a um protótipo próximo dessa intenção.

A interpretação de Grand Chase é desenho expressivo, silhuetas fortes, cores pintadas e acabamento ilustrado aplicado a volumes 3D. A versão/época e as imagens específicas ainda precisam ser escolhidas. Não copiar personagens, roupas ou interfaces dessas franquias.

## O que construir primeiro

**P0 — O Eco da Mata:** sessão solo de aproximadamente 10–15 minutos, Windows, um Guardião com lança e escudo, um trecho da Mata Viva, um inimigo comum reutilizado e um encontro com Curupira corrompido. Combate com alvo assistido, avisos no chão, defesa, esquiva e interrupção. Ao vencer, a corrupção se desfaz e a mata recupera a cor.

Este recorte é uma **proposta operacional da revisão**, não uma confirmação do usuário sobre classe, região, duração ou plataforma exclusiva. Serve para começar sem inventar um MMO inteiro. Os pontos que podem mudar estão no documento 02. A ambição de MMO permanece no histórico, sem comprometer o P0 com sua arquitetura.

## Leitura e autoridade

| Documento | Decide |
| --- | --- |
| [01 — Game Design](<01 - Game Design.md>) | Experiência, escopo, controles e condições de conclusão |
| [02 — Pendências](<02 - Pendencias.md>) | Decisões abertas, responsáveis e quando realmente bloqueiam |
| [03 — Encontros](<03 - Encontros.md>) | Números de combate, estados e roteiro do encontro |
| [04 — Prompts](<04 - Prompts de concept art.md>) | Pedidos pequenos de conceito para o P0 |
| [05 — Guia de arte](<05 - Guia de arte.md>) | Aparência e critérios visuais |
| [06 — Assets](<06 - Lista de assets.md>) | Inventário fechado de produção |
| [07 — Especificações](<07 - Especificacoes tecnicas.md>) | Contratos técnicos e desempenho |
| [08 — Câmera](<08 - Camera e escala.md>) | Enquadramento, escala e circulação |
| [09 — Ferramentas](<09 - Ferramentas.md>) | Dependências mínimas e validação da instalação |
| [10 — Desenvolvimento por IA](<10 - Desenvolvimento por IA.md>) | Ordem de execução, limites e evidências |
| [11 — Personagens](<11 - Producao de personagens fieis.md>) | Identidade, modelagem e deformação |
| [12 — Relatório da revisão](<12 - Relatorio da revisao.md>) | Problemas encontrados, alterações e consequências |
| [13 — Pacote de animações](<13 - Avaliacao do pacote de animacoes.md>) | Avaliação e teste do pacote FREE indicado pelo usuário |
| [14 — Protótipo implementado](<14 - Prototipo Lutador e Curupira.md>) | Entrega atual, controles, regras e limitações |
| [16 — Protótipo web 2.5D](<16 - Prototipo web 2.5D.md>) | Versão de navegador: câmera fixa 2.5D, direção de arte Lunia, sessão completa e regras verificadas |
| [19 — Classes](<19 - Classes.md>) | As cinco classes (Vaqueiro, Capoeirista, Cangaceiro, Maloka/Mateiro, Benzedeiro/Pajé), função no grupo e estado |
| [18 — Pipeline de personagens estilo Lunia](<18 - Pipeline de personagens estilo Lunia.md>) | Como o Lunia monta personagens, o Capoeirista e o pipeline `tools/charpipe` para novos personagens |
| [24 — Maloka: produção](<24 - Maloka producao.md>) | DPS Stealth urbano jogável: referências do Grok, mãos autorais pintadas, chapéu, bermuda larga, navalha e frasco, kit com cortina de fumaça, validação e limites |
| [21 — Cangaceiro: produção e integração](<21 - Cangaceiro producao e integracao.md>) | DPS Ranged: referências, modelo, armas em ossos próprios, mãos em IK guiadas pela arma, clipes, validação e limites |
| [23 — Vaqueiro: produção](<23 - Vaqueiro producao.md>) | Tanker jogável: referências do GLM, modelo, capturas Mixamo ajustadas ao corpo, laço e berrante, kit no jogo e testes |
| [24 — Sertão Velho](<24 - Sertao Velho fase 2.md>) | Fase 2: cenário gótico do sertão, mortos-vivos, Mula como chefe, amanhecer, escolha de fase e testes |
| [25 — Porto de Santos](<25 - Porto de Santos fase 3.md>) | Fase 3: cais, praia e mar em dia de ressaca; afogados e corais; Iara e Ipupiara em dupla no deque do trapiche, com o mar como mecânica; decisões do usuário e testes |

Instruções atuais do usuário prevalecem. Dentro da documentação, 01 define escopo; cada documento especializado é autoridade no seu assunto. Números do combate pertencem ao 03; câmera e movimento ao 08; orçamento ao 07. Alterar uma decisão exige reconciliar os documentos afetados. Exemplos de prompts não ampliam escopo.

**Confirmado** = pedido explícito do usuário. **Proposto** = padrão para executar e testar. **Pendente** = precisa de evidência ou escolha. **Adiado** = fora do P0. Nenhuma proposta equivale a aprovação visual ou medição realizada.

## Histórico preservado

Os 11 originais foram copiados integralmente em [histórico anterior à revisão](<historico/2026-10-24-pre-revisao/README.md>), com manifesto SHA-256. São referências de universo e ambição futura, **não requisitos de implementação**. Afirmações antigas sobre legislação, custos, licenças, ferramentas e mercado não foram revalidadas e não devem orientar contratação ou publicação.

## Primeiro resultado esperado

Uma sala 3D com o Guardião, uma árvore, uma pedra e o material desenhado, na câmera de jogo. Depois, o mesmo personagem deve se mover e enfrentar um ataque telegrafado. Não produzir mais regiões ou personagens antes de comprovar esse conjunto.

