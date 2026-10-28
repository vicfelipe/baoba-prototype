# Pendências para começar

O documento já define o que o jogo é; falta transformar isso em especificações com números e tarefas que agentes de IA consigam executar. São 14 pendências antes e durante o primeiro mês do vertical slice solo, seguidas das etapas da campanha completa e da fase multiplayer.

## 1. Bloqueia o início (próximas 2 a 4 semanas)

Sem estes itens os agentes não têm o que construir. A matemática do combate vem primeiro, porque quase todo o resto depende dela.

- [ ] **Matemática do combate**
  - Atributos e fórmulas de dano, armadura, crítico, velocidade, cura e ameaça dos tanques; curva de experiência do nível 1 ao 50.
  - Entrega: planilha no Luban com fórmulas e exemplos calculados.
- [ ] **Kits das 4 classes**
  - Guardião, Lutador, Caçador e Oráculo com dano, recarga, custo e alcance de cada habilidade, no padrão do kit de exemplo (Game Design, seção 9). Os mesmos kits servem aos Ecos Companheiros.
  - Atributos dos inimigos da Mata Viva e dos 3 chefes do Coração da Mata Viva (aba Encontros).
- [ ] **Núcleo de simulação**
  - Especificação do núcleo em C# puro: comandos, estado, ticks, sementes e testes (Game Design, seção 17).
  - Estrutura de dados de personagem, inventário e itens, com salvamento local em arquivo.
- [ ] **Ecos Companheiros**
  - Comportamento da IA aliada: seguir o jogador, posicionar-se pelo papel, executar mecânicas nos níveis Tutor e Parceiro e obedecer à roda de comandos (Game Design, seção 12).
- [ ] **Bíblia de arte**
  - Paleta, estilo de material, um personagem-modelo aprovado e o padrão de esqueleto para animação.
  - Pipeline de arte com IA: o que a IA gera, quem modifica e quem aprova (aba Guia de arte, seção 7).
- [ ] **Estrutura para os agentes de IA**
  - Repositório, arquivo de instruções para agentes, definição de pronto e integração contínua com builds de Windows e Android.
  - Backlog do vertical slice quebrado em tarefas pequenas, cada uma com critério de aceite e teste.
- [ ] **Rascunhos de telas**
  - HUD no PC e no celular.
  - Fluxo de telas do slice: criação de personagem, inventário, escolha de Ecos Companheiros e vendedores.
- [ ] **Contas e licenças**
  - Empresa (CNPJ), Unity Personal, conta de desenvolvedor no Google Play para testes no Android e domínio.
  - Busca da marca Baobá no INPI. Apple e Steam ficam para depois.

## 2. Em paralelo no primeiro mês do vertical slice

Estes itens podem correr junto com a programação, mas precisam estar prontos antes do primeiro teste com jogadores.

- [ ] **Roteiro do Ato I na Mata Viva**
  - Missões, diálogos e personagens do nível 1 ao 10, escritos no Yarn Spinner, incluindo as falas dos Ecos Companheiros.
  - Antes de escrever: contratar os consultores amazônico/indígena e afro-brasileiro, já que Curupira, Matinta Perera e Mapinguari entram no slice (Game Design, seção 8).
- [ ] **Mapas em blocos cinza**
  - Mata Viva e a masmorra O Coração da Mata Viva.
  - Seguir as métricas de mundo (aba Câmera e escala, seção 5).
- [ ] **Direção de áudio**
  - Tema musical da Mata Viva, lista de efeitos sonoros, pistas sonoras das mecânicas e vozes dos Ecos (aba Encontros).
- [ ] **Telemetria e testes com jogadores**
  - Lista de eventos: progresso, mortes por mecânica, uso dos Ecos, desempenho por modelo de celular; envio quando houver conexão.
  - Plano de recrutamento para o teste fechado de 500 jogadores.
- [ ] **Metas que aprovam o slice no portão**
  - Quadros por segundo mínimos no Android de 4 GB, taxa de conclusão da masmorra com Ecos, tempo médio do nível 1 ao 10 e notas mínimas de diversão.
- [ ] **Orçamento refeito**
  - Para o modelo com IA e o novo roteiro em duas fases (aba Desenvolvimento por IA, seção 4).

## 3. Slices seguintes da campanha solo

Depois do portão do slice 1, cada faixa de 10 níveis é um vertical slice completo, com teste de jogadores e retrospectiva (Game Design, seção 18). Tudo ainda sem servidor.

- [ ] Decidir entre UMA e um sistema próprio de criação de personagem, antes do slice 2 (aba Ferramentas).
- [ ] **Slice 2 (10 a 20):** Sertão Velho, talentos da Árvore do Baobá, Palenque das Palmeiras, masmorra O Arraial do Corpo-Seco.
- [ ] **Slice 3 (20 a 30):** Porto de Kalunga e Planalto de Pedra, travessia, Relíquias, casa e montarias, masmorra As Cavernas de Diamante.
- [ ] **Slice 4 (30 a 40):** Costa das Monções, culinária, Ecos das duas Margens, masmorra O Naufrágio da Monção.
- [ ] **Slice 5 (40 a 50):** Ilhas do Limiar, missão final O Pacto das Duas Margens e a cinemática do Despertar.
- [ ] **Slices 6 a 9:** caminho da Margem Leste (Delta dos Bronzes, Savana Dourada, Altiplano do Sol, Lagos Flutuantes), em paralelo a partir do slice 3.
- [ ] Build para iOS e decisão de lançar ou não a campanha antes do multiplayer (Game Design, seção 18).

## 4. Fase multiplayer

Começa quando a campanha estiver completa. O núcleo de simulação sai do cliente e passa a rodar nos servidores.

- [ ] Servidores com o núcleo de simulação, sincronização de rede, gerência de interesse e banco de dados central.
- [ ] Decisões da aba Ferramentas: Orleans ou Nakama, arquitetura própria ou SpacetimeDB.
- [ ] Regiões dos megaservidores, após testes de latência nas Áfricas Ocidental, Central e Austral.
- [ ] Masmorras Heroicas, Mítica Ancestral e a raide O Ventre de Prata (aba Encontros).
- [ ] PvP, guerra de Confrarias, Sertão de Kalunga e guerra de guildas.
- [ ] Economia entre jogadores e monetização completa, incluindo o Selo de Patrono.
- [ ] Funções sociais (chat, voz, grupos) com o modo para menores do ECA Digital.
- [ ] Demonstração no navegador, se as métricas de aquisição justificarem.

## Produção do primeiro personagem fiel — 24/10/2026

- [x] Criar `AGENTS.md` com instruções persistentes de criação de personagens.
- [x] Consolidar o fluxo em `11 - Producao de personagens fieis.md` e preservar referências.
- [ ] Modelar humano-base fiel, incluindo rosto, cabelo e roupa; comparar vistas.
- [ ] Refazer topologia e pesos, alinhar articulações e validar poses.
- [ ] Reconciliar contagem de ossos do documento com hierarquia e exportador.
- [ ] Criar materiais toon, animações iniciais, LODs e FBX.
- [ ] Montar projeto Unity e validar Avatar, prefab jogável e Sala de Medidas.
- [ ] Medir desempenho no Android de 4 GB com múltiplos personagens.
