# Ferramentas e frameworks

> Atualização de produção (24/10/2026): para personagens, seguir `11 - Producao de personagens fieis.md`. Modelagem fiel, retopologia e revisão de pesos são necessárias; geração 3D e auto-rig são auxiliares opcionais. Os blockouts atuais não são arte final aprovada.

O GitHub tem peças prontas para quase todas as camadas da arquitetura proposta; a pilha recomendada usa 8 projetos abertos, deixa 6 em avaliação no vertical slice e descarta 1 como base.

## 1. Pilha recomendada

A pilha mantém C# de ponta a ponta: Unity no cliente e .NET no servidor, o que deixa programadores trocarem de lado e compartilharem regras de jogo.

&#91;embedded content: pilha recomendada · ferramentas por camada\]

Kubernetes, PostgreSQL, Redis, NATS e ClickHouse já constavam da arquitetura e são padrões de mercado; a tabela abaixo detalha os projetos do GitHub específicos para jogos.

**Por fase:** na campanha solo, a pilha se resume ao cliente e aos dados: Unity, Cinemachine, Luban, Yarn Spinner, UMA (em avaliação) e DotRecast, que já vai dentro do núcleo de simulação. As camadas de rede, servidor e infraestrutura (LiteNetLib, MagicOnion, Orleans, Nakama, SpacetimeDB, Agones, Open Match, Kubernetes e os bancos de dados) entram na fase multiplayer.

## 2. Ferramentas por camada

As ferramentas marcadas como Usar resolvem uma peça inteira da arquitetura sem amarrar o projeto; as marcadas como Avaliar precisam provar valor num protótipo antes de entrar.

| Ferramenta | Camada | O que resolve no projeto | Licença | Recomendação |
| --- | --- | --- | --- | --- |
| [Cinemachine](https://github.com/Unity-Technologies/com.unity.cinemachine) | Cliente | Câmera em órbita com três anéis, colisão, transições e enquadramento do jogador junto com a cabeça do colosso | Pacote oficial da Unity | Usar |
| [UMA](https://github.com/umasteeringgroup/UMA) | Cliente | Criação e customização de personagem; junta malhas, texturas e ossos do corpo e do equipamento para gastar menos chamadas de desenho | MIT na origem; ver repositório | Avaliar contra um pipeline próprio |
| [Demo Team Hair](https://github.com/Unity-Technologies/com.unity.demoteam.hair) | Cliente | Cabelo por mechas simulado na GPU, bom para cabelos crespos realistas | Ver repositório | Avaliar só para cinemáticas e criação de personagem no PC |
| [Yarn Spinner](https://github.com/YarnSpinnerTool/YarnSpinner-Unity) | Cliente e narrativa | Roteiristas escrevem diálogos e missões ramificadas em texto simples, com localização | MIT; a versão paga apoia o projeto | Usar |
| [HybridCLR](https://github.com/focus-creative-games/hybridclr) | Cliente | Atualiza código C# sem nova build em todas as plataformas IL2CPP, inclusive iOS | MIT | Avaliar com cuidado: conferir as regras das lojas sobre código baixado |
| [Luban](https://github.com/focus-creative-games/luban) | Dados de design | Designers editam planilhas (itens, habilidades, tempos dos Encontros, métricas de câmera); a ferramenta valida referências e gera código e dados para cliente e servidor | MIT | Usar: vira a fonte única do design |
| [LiteNetLib](https://github.com/RevenantX/LiteNetLib) | Rede | UDP confiável e leve para movimento e combate nas zonas e instâncias | Ver repositório | Usar |
| [MagicOnion](https://github.com/Cysharp/MagicOnion) | Rede | RPC e tempo real sobre gRPC com contratos em C# compartilhados entre Unity e servidor; serve a mercado, guilda e chat | Ver repositório | Usar |
| [Orleans](https://github.com/dotnet/orleans) | Servidor | Atores virtuais distribuídos para o estado de guildas, territórios, mercado e contas; sustentou os serviços de Halo 4 e Halo 5 | MIT | Usar |
| [DotRecast](https://github.com/ikpil/DotRecast) | Servidor | Malha de navegação e cálculo de caminhos no servidor, em C#, para lacaios e chefes | zlib | Usar |
| [Nakama](https://github.com/heroiclabs/nakama) | Servidor | Contas, amigos, grupos e guildas, chat e placares prontos | Apache 2.0 | Avaliar: acelera o slice, mas sobrepõe o papel do Orleans |
| [SpacetimeDB](https://github.com/clockworklabs/SpacetimeDB) | Servidor e dados | Banco e servidor num só; todo o backend do MMO BitCraft roda nele, com módulos em C# e cliente Unity | BSL 1.1, que passa a AGPL v3 com exceção de ligação após alguns anos | Avaliar como arquitetura alternativa; exige análise jurídica |
| [Agones](https://github.com/googleforgames/agones) | Infraestrutura | Sobe, monitora e escala os servidores de instância (masmorras, raides, arenas) no Kubernetes | Ver repositório | Usar |
| [Open Match](https://github.com/googleforgames/open-match) | Infraestrutura | Matchmaking escalável para filas de masmorra e arena | Apache 2.0 | Avaliar contra um matchmaker próprio no Orleans |
| [ET](https://github.com/egametang/ET) | Framework completo | Framework distribuído Unity e C# usado em MMOs chineses | Ver repositório | Não usar como base: o autor avisou que não manterá mais a versão aberta; estudar como referência |

## 3. Cuidados e decisões em aberto

Nenhuma ferramenta substitui o protótipo: as três maiores escolhas (Orleans ou Nakama, arquitetura própria ou SpacetimeDB, UMA ou pipeline próprio) se decidem no vertical slice, com medição.

- **Atividade dos projetos.** DotRecast e HybridCLR tiveram atualizações em março de 2026 ([GitTrend: DotRecast](https://gittrend.io/repo/ikpil/DotRecast), [GitTrend: HybridCLR](https://gittrend.io/repo/focus-creative-games/hybridclr)); o Open Match teve a última atualização registrada em novembro de 2025 ([Good First Issue](https://www.goodfirstissue.org/googleforgames/open-match)). Conferir de novo antes de adotar.
- **Licenças.** Pacotes da Unity (Cinemachine, Demo Team Hair) seguem os termos da Unity; SpacetimeDB usa BSL. Ambos passam pelo parecer jurídico.
- **Uma linguagem só.** Nakama roda em Go, com lógica em Go, Lua ou TypeScript; adotá-lo quebra a regra de C# de ponta a ponta.
- **Celular primeiro nos testes.** Toda ferramenta de cliente é testada no Android de 4 GB antes de ser aprovada.

### Próximos passos

- [ ] Montar o pipeline do Luban com a tabela de habilidades do Lutador e os tempos do Boitatá
- [ ] Prototipar o núcleo de simulação com DotRecast e a masmorra O Coração da Mata Viva
- [ ] Testar UMA com 3 classes e cabelos crespos num celular de 4 GB
- [ ] Parecer jurídico sobre licenças e sobre atualização de código nas lojas
- [ ] Na fase multiplayer: protótipo de 2 semanas com 200 bots, comparando LiteNetLib e Orleans com SpacetimeDB, e decisão entre Orleans e Nakama

## Fontes

- [Cinemachine no GitHub](https://www.github.com/Unity-Technologies/com.unity.cinemachine)
- [UMA no Unity Asset Store (licença de origem)](https://assetstore-fallback.unity.com/packages/3d/characters/uma-2-35611)
- [Demo Team Hair no OpenUPM](https://openupm.com/packages/com.unity.demoteam.hair/)
- [Yarn Spinner para Unity](https://github.com/YarnSpinnerTool/YarnSpinner-Unity)
- [HybridCLR](https://www.Github.com/focus-creative-games/hybridclr)
- [Luban (README em inglês)](https://fr.github.com/focus-creative-games/luban/blob/main/README_EN.md)
- [LiteNetLib](https://github.com/RevenantX/LiteNetLib)
- [MagicOnion](https://github.com/neuecc/MagicOnion/blob/master/README.md)
- [Microsoft Research: Orleans](https://www.microsoft.com/research/project/orleans-virtual-actors)
- [DotRecast](https://github.com/ikpil/DotRecast)
- [Nakama: anúncio da Heroic Labs](https://heroiclabs.com/blog/announcing-nakama/)
- [SpacetimeDB (README e licença)](https://github.com/nutgitdate/SpacetimeDB)
- [Agones](https://github.com/googleforgames/agones)
- [Open Match](https://github.com/googleforgames/open-match)
- [ET](https://github.com/egametang/Egametang)
