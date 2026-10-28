# Ferramentas — mínimo para entregar o P0

v0.2 · 24/10/2026. Escolha por continuidade e redução de integração. Disponibilidade local ainda não verificada. Não instalar tudo que aparece no plano antigo.

## 1. Pilha proposta

| Ferramenta | Uso no P0 | Condição de adoção |
| --- | --- | --- |
| Unity 6 + URP | Cena 3D, materiais, lógica, animação e build Windows | Registrar versão exata e produzir executável vazio antes de conteúdo |
| C# | Movimento, combate, objetivos e validação de dados | Componentes pequenos; sem backend |
| Input System | Ações de mouse/teclado | Fixar versão compatível com editor e salvar mapa de ações |
| Cinemachine | Órbita e seguimento de câmera | Testar requisitos do 08 na versão instalada; não misturar APIs 2.x e 3.x |
| Navegação Unity | Caminhos na trilha e arena | Uma malha navegável local; incluir pacote compatível se necessário |
| Blender | Fonte editável, modelagem, rig, animação e exportação FBX | Importação completa de um personagem e uma peça de cenário |
| Krita ou editor de pintura já disponível | Atlas pintado e linhas internas | Evitar migração de ferramenta só por preferência abstrata |
| JSON | Configuração pequena e legível de combate | Validação no carregamento; sem pipeline de planilha adicional |
| Git + Git LFS | Código, documentação e fontes de arte | Configurar ao criar projeto; versionar .meta e excluir caches |

A Unity descreve URP como pipeline de renderização pré-construído para múltiplas plataformas. Isso é capacidade da ferramenta, não garantia de desempenho do nosso jogo. [Documentação oficial de URP](https://docs.unity3d.com/6000.0/Documentation/Manual/urp/urp-introduction.html).

Cinemachine oferece módulos de controle e composição de câmera e requer instalação separada do editor. A compatibilidade precisa ser testada na versão escolhida. [Documentação oficial de Cinemachine](https://docs.unity3d.com/Packages/com.unity.cinemachine@3.1/manual/index.html).

## 2. Alternativas com limite de esforço

Cinemachine pode ser substituído por controlador orbital pequeno se a integração bloquear a build. Shader toon pode ser próprio ou já existente, desde que a licença e compatibilidade estejam registradas. A decisão é sobre uma prova funcional na Sala de Estilo, não uma disputa de frameworks.

Animações prontas e auto-rig são opcionais; verificar origem, termos aplicáveis e qualidade no modelo real. Não presumir que nome de serviço garante direito de redistribuir arquivos fonte. Se o pacote não puder acompanhar a entrega, documentar instalação e permissões necessárias.

Automação do Blender pode usar scripts Python; integração por MCP é opcional. A produção não depende de um serviço de geração 3D, de GPU específica ou de promessa de “personagem pronto por uma imagem”. Antes de usar qualquer gerador, registrar versão, custo, requisitos e termos dos resultados. Esses dados não foram auditados nesta revisão.

## 3. Fora da pilha do P0

Luban, Yarn Spinner, UMA, simulação de cabelo, Animation Rigging adicional, atualizações de código remoto, DotRecast independente, LiteNetLib, MagicOnion, Orleans, Nakama, SpacetimeDB, Redis, PostgreSQL, Kubernetes, Agones e Open Match. Nenhuma dessas ferramentas é necessária para um único encontro offline conforme especificado.

Diálogos cabem em dados simples; customização não existe; câmera não precisa de oito modos; navegação fica no cliente. Se uma necessidade real surgir, documentar o problema e custo antes de introduzir pacote.

## 4. Verificação inicial do ambiente

1. Identificar editor e módulo Windows disponíveis; registrar em `ProjectVersion.txt` quando o projeto existir.
2. Criar projeto URP e fixar pacotes em `manifest.json` e `packages-lock.json`.
3. Criar cena vazia com luz, chão e input; exportar e abrir o executável local.
4. Importar FBX de teste, textura e clip; verificar escala/material/rig.
5. Testar câmera orbital, colisão e uma navegação curta.
6. Salvar instruções reproduzíveis com caminhos reais. Só então marcar D07 resolvido.

Os nomes acima são arquivos da futura estrutura Unity, não arquivos presentes hoje. Não registrar comando batch genérico como “testado” sem executar na instalação concreta.

## 5. Fontes e limites da revisão

Consulta técnica em 24/10/2026: URP, Cinemachine e importação de rig. Não foi feita comparação completa de engines, auditoria de preços/licenças nem confirmação de ferramentas locais. Mantém-se Unity pela continuidade do projeto, não por suposta superioridade universal para IA.

Para humanoides, Unity usa um Avatar para mapear o esqueleto; rigs Generic usam sua raiz e estrutura própria. A documentação admite necessidade de ajuste manual. [Referência oficial de importação de rig](https://docs.unity3d.com/6000.0/Documentation/Manual/FBXImporter-Rig.html).

As notícias sobre ferramentas de IA, datas de lançamento, estrelas de repositórios, restrições territoriais e legislação do material anterior ficam no histórico como afirmações não revalidadas. Não são base para comprar, publicar ou prometer prazo.

## 6. Candidato prioritário indicado pelo usuário

Avaliar **RPG Character Mecanim Animation Pack FREE** antes de escrever controlador equivalente ou produzir locomoção genérica. O teste deve decidir entre reutilizar apenas clips/Animator ou adaptar também o controlador. Configuração de entrada, câmera e root motion precisa ser reconciliada com a pilha acima; não adicionar soluções concorrentes. Estado: ainda não importado. Evidências e critérios no [documento 13](<13 - Avaliacao do pacote de animacoes.md>).


## Atualização da implementação — Lutador × Curupira

Ambiente utilizado: Unity 6000.3.27f1 e URP 17.3.0. Clips desarmados do pacote FREE já existente localmente, Animator próprio e controle próprio. Entrada desta build usa Input Manager legado, compatível com os comandos usados; a proposta anterior de Input System não foi adotada nesta entrega. Câmera orbital própria, sem Cinemachine. Fontes Cormorant Garamond e DM Sans com licenças OFL.
