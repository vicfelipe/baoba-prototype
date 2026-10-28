# Desenvolvimento por IA

> Atualização de produção (24/10/2026): para personagens, seguir `11 - Producao de personagens fieis.md`. Modelagem fiel, retopologia e revisão de pesos são necessárias; geração 3D e auto-rig são auxiliares opcionais. Os blockouts atuais não são arte final aprovada.

O jogo será desenvolvido por agentes de IA, com pessoas dirigindo, revisando e aprovando. Esta aba avalia se a pilha escolhida funciona bem nesse modelo e o que precisa mudar.

## 1. Veredito

A pilha é fácil para IA em código e dados, média em cenas e difícil em arte 3D. Unity 6 com C# no cliente e .NET no servidor está entre as melhores escolhas para agentes em 2026: tudo é C#, e a Unity passou a oferecer caminhos oficiais para agentes controlarem o editor.

### O que a Unity oferece para agentes

- **Unity AI (beta aberto desde maio de 2026):** assistente no editor com modos Ask, Plan e Agent, um gateway para usar modelos de terceiros como Claude, GPT e Gemini, e um servidor MCP para agentes externos ([Unity](https://unity.com/blog/unity-ai-how-to-get-started)).
- **Servidor MCP na CLI da Unity:** desde junho de 2026, o comando `unity mcp` conecta agentes como o Claude Code a um editor aberto ([explainx](https://explainx.ai/blog/claude-code-unity-mcp-guide-2026)). O servidor MCP de dentro do editor foi descontinuado em favor da CLI ([MCP Playground](https://mcpplaygroundonline.com/blog/unity-mcp-server-guide)).
- **Plugin oficial para agentes:** CLI, servidor MCP e plugin oficial são gratuitos e sem limite de uso simultâneo ([Unity](https://unity.com/features/ai)).
- **Alternativa da comunidade:** o MCP for Unity, da Coplay, tem licença MIT e cerca de 15 mil estrelas no GitHub em outubro de 2026 ([andrew.ooo](https://andrew.ooo/posts/unity-mcp-ai-game-development-bridge/)).

### Onde a IA ainda precisa de gente

Modelos 3D de personagens, animação, "sensação" do combate, autenticidade cultural e balanceamento dependem de direção humana e de testes com jogadores. A seção 4 lista esses papéis.

### E o Godot?

O Godot guarda cenas em texto, o que agrada agentes, mas em 2026 a exportação de C# para navegador ainda é experimental e não há suporte oficial a consoles ([GTSTU](https://gtstu.com/?p=4758)). Com as ferramentas oficiais de IA da Unity, a recomendação continua sendo Unity 6.

## 2. Facilidade para IA de cada ferramenta

Quanto mais uma ferramenta guarda tudo em texto e roda por linha de comando, mais fácil ela é para agentes; ferramentas que dependem de cliques no editor ou de olho artístico ficam com nota baixa.

| Ferramenta | Facilidade para IA | Por quê | Ajuste recomendado |
| --- | --- | --- | --- |
| Unity 6 (cliente) | Alta | C#, servidor MCP oficial e plugin para agentes | Serialização de assets em texto; cenas montadas a partir de código e dados; interface em UI Toolkit (arquivos UXML e USS em texto) em vez de prefabs de interface |
| Servidor .NET (Orleans, MagicOnion, LiteNetLib, DotRecast) | Alta | Só código, testável por linha de comando | Testes automatizados em todo sistema; bots sem interface para testes de carga |
| Luban | Alta com CSV ou JSON; média com Excel | Excel é binário; agentes leem e editam texto com mais segurança | Fontes de dados em CSV ou JSON no Git; Excel só para visualizar |
| Yarn Spinner | Alta | Diálogos em texto simples | Uma pasta por região; revisão cultural antes de entrar no projeto |
| Kubernetes e Agones | Alta | Arquivos YAML e linha de comando | Infraestrutura como código no mesmo repositório |
| Cinemachine | Média | Configurado em componentes de cena | Parâmetros da câmera vindos das planilhas do Luban; ajustes finos via MCP |
| UMA | Baixa | Receitas e assets montados no editor | Testar contra um sistema modular próprio, definido em dados |
| Demo Team Hair | Baixa | Depende de ferramentas de arte e ajuste visual | Fora do caminho dos agentes; só cinemáticas |
| Arte 3D gerada por IA (ex.: Hunyuan3D 2.1) | Média para objetos; baixa para personagens | Gera malhas com textura a partir de imagens, mas personagens ainda precisam de topologia, ossos e revisão; pede cerca de 29 GB de memória de vídeo para forma e textura juntas ([SourcePulse](https://www.sourcepulse.org/projects/10592187)) e usa licença comunitária própria da Tencent ([Hugging Face](https://huggingface.co/moeqbadar/Hunyuan3D-2.1/blob/main/README.md)) | Só para protótipos: a licença não vale na União Europeia, no Reino Unido e na Coreia do Sul, inclusive para os resultados gerados ([Hugging Face](https://huggingface.co/tencent/Hunyuan3D-2/blob/main/LICENSE)). Para arte final, usar modelos sem restrição de território, sempre com direção de arte humana |

## 3. Como organizar o projeto para agentes

Agentes rendem quando tudo está em texto, cada tarefa é pequena e cada mudança é verificada por teste automático. Estas regras valem desde o primeiro dia.

1. **Tudo em texto e no Git:** código, cenas serializadas em texto, dados de design (CSV ou JSON), diálogos, infraestrutura e este documento exportado em Markdown no repositório.
2. **Arquivo de instruções para agentes** na raiz do repositório, com arquitetura, convenções e comandos de teste, atualizado a cada decisão.
3. **Tarefas pequenas e verificáveis:** cada tarefa tem critério de aceite e teste; nada entra sem teste passando.
4. **Cenas a partir de dados:** zonas, encontros e tempos dos chefes (aba Encontros) vêm das planilhas do Luban; o editor fica para ajustes visuais.
5. **Testes em camadas:** unitários em C#, de jogo com o Unity Test Framework em modo sem interface, de carga com bots contra o servidor e de imagem comparando capturas da Sala de Medidas (aba Câmera e escala).
6. **Integração contínua** gera builds de Windows, Android e iOS a cada mudança e roda todos os testes.
7. **Revisão humana obrigatória** em segurança, economia, monetização e qualquer conteúdo cultural.
8. **Agentes com limites:** cada sessão começa com tudo salvo no controle de versão, em ambiente isolado, sem acesso a chaves de produção.
9. **Telemetria desde o slice:** agentes propõem ajustes de balanceamento a partir de dados reais; pessoas aprovam.
10. **Chaves de recurso** para ligar sistemas aos poucos e reverter rápido em produção.

## 4. O que continua humano

Com agentes escrevendo código, dados e boa parte do conteúdo, a equipe central cai para 6 a 9 pessoas, contra 22 no vertical slice tradicional da seção 18 do Game Design. Essas pessoas dirigem, revisam e assinam.

| Papel | Por que a IA não substitui | Dedicação |
| --- | --- | --- |
| Direção de jogo e produto | Decide o que o jogo é e o que vem primeiro | Integral |
| Engenharia líder (1 a 2) | Arquitetura, segurança e revisão do código dos agentes | Integral |
| Direção de arte | Escolhe, corrige e unifica o que a IA gera; garante estilo e autoria humana | Integral |
| Design de sistemas e economia | Balanceamento a partir de testes e telemetria | Integral |
| QA e playtest | Sensação do combate e tempos das mecânicas no celular | Integral, com a comunidade |
| Consultoria cultural (7 grupos) | Autenticidade e respeito, revisão de todo conteúdo cultural | Parcial |
| Jurídico | Licenças, ECA Digital, propriedade intelectual | Externo |
| Operação ao vivo e moderação | Comunidade, denúncias, eventos | A partir do beta |

O custo muda de natureza: menos salários, mais gasto com uso de modelos de IA, computação para gerar assets e ferramentas. O orçamento da seção 18 deve ser refeito na fase de conceito com esse modelo.

## 5. Riscos legais e de plataforma

O maior risco de fazer tudo por IA não é técnico: é a propriedade do que se cria. Material gerado só por IA pode não ter direito autoral, o que enfraquece a marca Baobá contra cópias.

| Risco | O que se sabe | Como lidar |
| --- | --- | --- |
| Direito autoral | O Escritório de Direitos Autorais dos EUA concluiu em janeiro de 2025 que obras geradas inteiramente por IA não têm proteção; seleção, arranjo ou modificação criativa feita por pessoas podem ter ([Skadden](https://skadden.com/insights/publications/2025/02/copyright-office-publishes-report)). No Brasil, a Lei 9.610/1998 define o autor como pessoa física | Direção de arte e roteiro humanos modificam e compõem o material; registrar a contribuição humana de cada asset; parecer jurídico |
| Divulgação no Steam | Desde janeiro de 2026, o Steam exige declarar conteúdo gerado por IA que vai no jogo, na página da loja ou no marketing, e conteúdo gerado durante o jogo; ferramentas de produtividade, como assistentes de código, ficam de fora ([VGC](https://videogameschronicle.com/news/valve-has-significantly-rewritten-steams-rules-for-how-developers-much-disclose-ai-use)) | Declarar com clareza; comunicar que pessoas dirigem e revisam; preferir arte final com forte intervenção humana |
| Reação dos jogadores | Jogos que declaram assets gerados por IA têm enfrentado reação negativa de parte do público ([All Things How](https://allthings.how/?p=53462)) | Transparência desde o anúncio; qualidade visual acima da média; programa Raízes como prova de compromisso cultural |
| Estereótipos | Modelos de IA tendem a repetir clichês visuais e narrativos sobre África e América Latina | Todo conteúdo cultural passa pelos consultores antes de entrar no jogo (seção 8 do Game Design) |
| Licenças dos modelos | Modelos de geração têm licenças próprias, algumas com restrições de território ou de uso comercial | Lista aprovada de modelos e ferramentas, revisada pelo jurídico |
| Lojas de aplicativos | Apple e Google têm regras próprias para conteúdo gerado por IA | Conferir as regras vigentes antes de cada envio |
| Segurança | Agentes com controle do editor executam código no projeto | Controle de versão, ambiente isolado e revisão humana (seção 3) |

## Fontes

- [Unity: como começar com as ferramentas de IA](https://unity.com/blog/unity-ai-how-to-get-started)
- [Unity: página das ferramentas de IA](https://unity.com/features/ai)
- [explainx: Claude Code e o MCP oficial da Unity](https://explainx.ai/blog/claude-code-unity-mcp-guide-2026)
- [MCP Playground: servidor MCP da Unity e a descontinuação no editor](https://mcpplaygroundonline.com/blog/unity-mcp-server-guide)
- [andrew.ooo: MCP for Unity da Coplay](https://andrew.ooo/posts/unity-mcp-ai-game-development-bridge/)
- [GTSTU: Godot 4 em 2026](https://gtstu.com/?p=4758)
- [SourcePulse: Hunyuan3D 2.1](https://www.sourcepulse.org/projects/10592187)
- [Hugging Face: Hunyuan3D 2.1 e licença](https://huggingface.co/moeqbadar/Hunyuan3D-2.1/blob/main/README.md)
- [Skadden: relatório do Escritório de Direitos Autorais dos EUA](https://skadden.com/insights/publications/2025/02/copyright-office-publishes-report)
- [VGC: novas regras do Steam para IA](https://videogameschronicle.com/news/valve-has-significantly-rewritten-steams-rules-for-how-developers-much-disclose-ai-use)
- [All Things How: o debate sobre a divulgação de IA no Steam](https://allthings.how/?p=53462)
