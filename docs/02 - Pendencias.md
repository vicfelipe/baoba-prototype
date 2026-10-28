# Pendências e decisões

v0.2 · 24/10/2026. A documentação permite começar o blockout. Pendências não devem ser tratadas como bloqueio universal.

## 1. Confirmado e proposto

**Confirmado pelo usuário:** jogo 3D, direção hand-drawn, referências Tarisland, WoW e Grand Chase, protótipo rápido com produção facilitada por IA.

**Proposto nesta revisão:** P0 Windows solo de 10–15 min; Guardião; Mata Viva; Curupira; câmera orbital; Unity + URP; um encontro com três mecânicas. São decisões de trabalho reversíveis, não aprovação estética ou de produto.

## 2. Decisões abertas que importam agora

Responsáveis abaixo são papéis propostos; não presumem contratação ou equipe existente. Na ausência de equipe, Victor acumula direção e priorização.

| ID | Prioridade / estado | Pergunta ou evidência faltante | Padrão para avançar | Responsável | Quando bloqueia / conclusão |
| --- | --- | --- | --- | --- | --- |
| D01 | P0 / aberto | Qual Grand Chase: arte clássica, ilustrações atuais ou outro recorte? Quais traços de cada referência? | Personagens expressivos, proporção heroica e cores pintadas; cenário 3D simplificado | Victor / arte | Bloqueia aprovação visual, não blockout; fechar com 2–3 imagens anotadas e captura aprovada no motor |
| D02 | P0 / aberto | Windows primeiro atende ao primeiro teste ou Android precisa entrar já? | Só Windows; mobile fica adiado | Victor | Antes de congelar prazo e HUD; Android obrigatório exige novo orçamento e aparelho concreto |
| D03 | P0 / aberto | Onde estão as referências do Guardião citadas no documento antigo? | Preservar identidade textual; manequim temporário para controle | Victor / arte | Bloqueia alegar fidelidade; concluir com imagens presentes, origem e vistas comparáveis |
| D04 | P0 / aberto | Qual CPU, GPU, RAM e resolução da máquina-alvo? | Medir 1080p na máquina disponível, identificando-a | Engenharia / Victor | Bloqueia aprovação de desempenho no alvo, não desenvolvimento |
| D05 | P0 / aberto | Qual prazo real, horas disponíveis e orçamento para arte/ferramentas? | Planejar 10–15 dias úteis como hipótese, reestimar após prova visual | Victor | Antes de assumir compromisso de entrega ou compra; registrar teto de horas e R$ |
| D06 | P0 / proposto | Guardião e Mata Viva representam bem a primeira experiência desejada? | Manter ambos pela continuidade com o material anterior | Victor / design | Antes de arte final; trocar exige atualizar 01, 03, 04, 06 e 11 |
| D07 | P0 / não verificado | Editor, módulos Windows e versões de pacotes estão disponíveis e compatíveis? | Seguir 09 e criar build vazia | Engenharia | Bloqueia primeiro executável; registrar versões e log de build |
| D08 | P1 / aberto | Quem revisa a representação do Curupira e as referências locais? | Protótipo interno com texto original, sem símbolos sagrados | Arte / narrativa | Antes de divulgação do conteúdo cultural; não bloqueia mecânica em formas provisórias |
| D09 | P1 / aberto | Qual origem/licença de cada malha, animação, fonte e som usado? | Autoria própria ou material com termos registrados | Produção | Antes de incorporar material externo à entrega; licença desconhecida exige substituição |
| D10 | P1 / a testar | O combate parece RPG com mecânicas ou simples repetição de ataque? | Alvo assistido + cone + área + interrupção | Design / QA | Fecha após teste jogável e feedback; ajustar tempos antes de adicionar habilidades |
| D11 | P1 / a testar | O shader e as texturas mantêm o desenho ao girar e afastar a câmera? | Tinta estável, sombras em dois tons e pintura discreta | Arte / engenharia | Antes de produzir o kit inteiro; vídeo orbital e teste em movimento |
| D12 | P1 / aberto | Quem testa e qual tolerância de dificuldade? | 3–5 pessoas, duas tentativas por pessoa, dados locais | Victor / QA | Antes de chamar o P0 de validado; registrar conclusão, mortes, compreensão e vontade de repetir |

P0 = decisão que pode afetar a fundação; P1 = resolve durante a construção antes do aceite. Isso não significa que todas as P0 precisam de resposta antes de começar.

## 3. Estado real do workspace

Na inspeção desta revisão, a raiz continha apenas `docs`. Não foram encontrados projeto Unity, pasta `Assets`, modelos `.blend`/`.fbx`, imagens do Guardião, script `tools/build_playable_heroes.py` ou `AGENTS.md`.

As marcações antigas “AGENTS.md criado” e “referências preservadas” ficam no histórico; aqui são **não verificadas**. Não inferir arquivos presentes a partir de uma descrição. Também não há shader, build, desempenho ou personagem jogável comprovados.

## 4. Fila de execução

- [ ] Registrar referências visuais e versões do ambiente (D01, D03, D07).
- [ ] Criar build vazia e Sala de Estilo com geometria provisória.
- [ ] Validar câmera e material em uma pequena composição 3D.
- [ ] Implementar movimento, seleção e estocada.
- [ ] Implementar defesa, esquiva, interrupção e inimigo comum.
- [ ] Fechar Curupira com seus três avisos e reset.
- [ ] Integrar trilha, vestígio, checkpoint e restauração.
- [ ] Substituir provisórios indispensáveis e testar personagem em movimento.
- [ ] Registrar teste externo, desempenho, defeitos e build final do P0.

A revisão documental está concluída quando arquivos e vínculos forem verificados; isso não marca nenhuma tarefa de implementação acima como feita.

## 5. Decisões adiadas, sem prazo prometido

Coop ou MMO; campanha completa; classes restantes; migração de progresso; servidores autoritativos; plataforma mobile; economia; monetização; classificação etária; publicação em lojas; nome comercial e marca; consultorias das outras regiões. Reabrir apenas após decisão explícita de expansão.

A visão futura contém conteúdo aproveitável, mas não está pronta para produção: contagens, encontros de grupo, escala dos colossos e premissas comerciais precisam de nova revisão se voltarem ao escopo. Não contratar infraestrutura por antecipação.

## 6. Registro de decisão

Ao resolver um item, acrescentar data, escolha, motivo, documentos afetados e evidência. Exemplo: `D01 | data | referências escolhidas | caminho das imagens + vídeo do motor | aprovado por ...`. “A IA conseguiu gerar” não é critério suficiente de estilo, licença ou deformação.

## 7. Reaproveitamento indicado pelo usuário

**D13 — P0 / a testar:** avaliar o RPG Character Mecanim Animation Pack FREE antes de criar animações genéricas ou controlador equivalente. Responsável: engenharia/animação. Padrão: reutilizar clips e componentes aprovados; manter lança/escudo e lógica do P0. Não bloqueia o ambiente; bloqueia assumir cobertura de animações ou economia de prazo. Fecha com inventário, build e decisão de integração conforme [documento 13](<13 - Avaliacao do pacote de animacoes.md>).


## Atualização da implementação — Lutador × Curupira

D03: referências agora disponíveis em arts/lutador.jpg e arts/curupira.jpg. D06: usuário escolheu Lutador × Curupira. D07: ambiente Unity confirmado e build Windows gerada. D13: clips desarmados extraídos do pacote FREE local e retargeteados; controlador próprio. Evidências e limites no documento 14. A aprovação artística e o playtest humano continuam abertos.

## Atualização — Classes (26/10/2026)

Confirmado pelo usuário: cinco classes, descritas no [documento 19](<19 - Classes.md>). O herói jogável passa a ser o Capoeirista (DPS Melee), que substitui os nomes Guardião e Lutador. Novas pendências:

| ID | Estado | Pergunta | Padrão até decidir | Responsável |
| --- | --- | --- | --- | --- |
| D14 | aberto | DPS Stealth: Maloka, Mateiro ou ambos como variantes? | Manter as duas opções no documento 19 | Victor / design |
| D15 | aberto | Healer: Benzedeiro, Pajé ou ambos? (Pajé pede consultoria cultural antes da arte final) | Manter as duas opções | Victor / design |
| D16 | aberto | Ordem de produção das classes depois do Capoeirista | Nenhuma nova classe no P0 | Victor / produção |

## Atualização — Curupira com duas formas (26/10/2026)

Decisão do usuário: o Curupira corrompido é um **monstro** (chefe, 3 m) e o liberto é **humanizado** (2,1 m); nenhum acessório no estilo do Capoeirista. Os documentos 01, 04, 05 e 11 foram ajustados. Consequências: dois modelos e dois conjuntos de animação no lugar de um modelo com troca de material; a transformação na libertação precisa de efeito (troca de modelo). A D08 (revisão cultural) continua aberta e agora inclui a forma de monstro.
