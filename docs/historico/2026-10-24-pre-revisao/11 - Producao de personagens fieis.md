# Produção de personagens fiéis à referência

Decisão de direção de produção: 24/10/2026. O primeiro objetivo é um humano-base fiel às imagens fornecidas pelo usuário, animado e jogável no Unity. Este documento substitui a ideia de que gerar uma malha, reduzir polígonos e aplicar pesos automáticos basta para finalizar um personagem.

## 1. Referências e identidade

Referências preservadas em `Assets/Arte/Referencias/Guardiao/`:

- `ref_guardiao_corpo.png`: vistas gerais para proporção e silhueta.
- `ref_guardiao_detalhes.png`: rosto, anatomia, cabelo e vestuário.

Preservar homem adulto negro, físico forte, rosto angular, tranças nagô continuando em locs presos atrás, camiseta e bermuda claras e pés descalços. A roupa é a referência do corpo-base; escudo e lança entram posteriormente para comunicar a classe Guardião.

As imagens têm perspectiva e não são plantas ortográficas exatas. Preparar vistas alinhadas e pose A ou T, interpretando áreas ocultas com consistência. Não alterar identidade ou estilo para facilitar geração automática. A referência define a aparência; o guia de arte orienta sua adaptação ao jogo.

## 2. Estado do material existente

Os arquivos `chr_hum_guardiao_reference.blend`, `chr_hum_guardiao_slice01.fbx` e as prévias atuais são blockouts técnicos, não uma modelagem fiel aprovada. O script `tools/build_playable_heroes.py` pode fornecer convenções e infraestrutura, mas requer revisão antes de reutilização.

Problemas identificados por inspeção do script e da prévia, ainda sem teste de deformação no Unity:

- Segmentos corporais separados com influência rígida de um único osso; unir objetos não produz topologia contínua.
- Bermuda recebe os pesos do gerador de tronco e fica ligada ao quadril, sem acompanhamento adequado das coxas.
- Joelhos visuais e articulações do esqueleto estão desalinhados.
- Dedos modelados estão presos à mão, sem articulação individual; locs estão presos à cabeça.
- Aparência de rosto, cabelo e anatomia ainda distante dos anexos.

Preservar esses arquivos como histórico. Produzir a nova versão em arquivos distintos até validação. Não há personagem jogável validado nem projeto Unity completo demonstrado neste diretório.

## 3. Ferramentas

| Ferramenta | Função |
| --- | --- |
| Blender | Modelagem e escultura, retopologia, UVs, rig, pesos, animação, LOD e FBX |
| Krita | Paletas, rosto e linhas de roupa/cabelo |
| Mixamo, opcional | Animações-base e primeiro rig; não substitui revisão de deformação |
| Unity 6 com URP | Materiais e personagem jogável |
| Animator e Humanoid | Estados, misturas e redirecionamento de animações |
| Input System e Cinemachine | Entrada PC/mobile e câmera orbital |
| Animation Rigging, posterior | Ajustes de mãos, pés e olhar |
| Git e Git LFS | Histórico de código e fontes binárias |

TRELLIS.2 é opcional para gerar uma base, nunca uma garantia de modelo final. O fluxo oficial consultado exige Linux e GPU NVIDIA com pelo menos 24 GB de VRAM; variantes otimizadas têm requisitos próprios. Não enviar o painel de três figuras como uma foto única; separar vistas e usar múltiplas referências apenas quando o fluxo escolhido as suportar explicitamente.

## 4. Etapas e critérios de conclusão

1. **Referência:** reunir vistas e detalhes; definir escala e partes ocultas. Manter as imagens originais sem modificações.
2. **Modelagem fiel:** acertar silhueta, anatomia e identidade facial; modelar roupa e cabelo separadamente. Comparar renders com os anexos antes de refinar detalhes. Primitivas são permitidas como construção inicial, não como acabamento final.
3. **Retopologia:** criar fluxo de arestas adequado a ombros, cotovelos, quadril, virilha, joelhos e dedos. Preservar volumes ao dobrar. Dividir o corpo em regiões ocultáveis por equipamento.
4. **UVs e materiais:** separar o mapeamento de paleta do mapeamento de rosto e linhas, por canais ou geometria próprios documentados. UVs colapsados em células de cor não servem sozinhos para desenhar costuras. Usar sombras quentes e cabelo sólido; detalhes internos pequenos são desenhados.
5. **Rig e pesos:** alinhar articulações à anatomia; configurar mãos e encaixes. Pesos automáticos são apenas ponto de partida. Normalizar e limitar a 4 influências. Testar braços erguidos, agachamento, rotação do tronco, corrida e pegada de arma. Cabelo pode receber cadeias adicionais, com simulação desligável no mobile.
6. **Animação:** primeiro parado, andar, correr, deslocamento lateral e para trás, pulo em três fases, postura de combate, um ataque, reação e morte. Autoria a 30 fps; locomoção no lugar. Ajustar contato dos pés e pegadas após retargeting. Animações especiais de classe recebem acabamento próprio.
7. **Exportação e Humanoid:** exportar FBX com malha e esqueleto de deformação, animações gravadas nos ossos e eixos/escala conferidos. No Unity, criar Avatar Humanoid, verificar mapeamento e pose T. Ossos adicionais de cabelo não são animados automaticamente pelo retargeting humanoide.
8. **Jogabilidade:** prefab com Animator, controlador de movimento, cápsula, entrada PC/mobile, câmera e estados de combate. Simulação controla movimento, dano e janelas de habilidade; clips sincronizam sons e efeitos. Usar misturas por velocidade e direção, sem depender de root motion para locomoção.
9. **Validação:** capturar frente, lado, costas e três quartos, comparar identidade e silhueta com os anexos; testar deformação, contato dos pés, equipamentos e iluminação. Validar na Sala de Medidas e medir desempenho no dispositivo-alvo com múltiplos personagens.

Inspeção visual e ajustes fazem parte do trabalho autorizado. Revisão de direção não exige interromper cada etapa rotineira para pedir permissão. Mudanças relevantes de identidade ou escopo devem ser explicitadas.

## 5. Contrato consolidado

| Item | Decisão |
| --- | --- |
| Altura-base | 1,80 m; tolerância de exportação de 2% |
| Proporção | 6,5 a 7 cabeças, respeitando a referência |
| Geometria | LOD0 até 15.000; LOD1 até 7.000; LOD2 até 3.000 triângulos para o conjunto completo |
| Materiais | Até 3: paleta, rosto e linhas; medir passes e draw calls reais |
| Cabelo | Volumes sólidos; sem cartões de cabelo no personagem |
| Locomoção | Andar 2,5 m/s; correr 7 m/s; corrida rápida 8 m/s quando habilitada pelo design |
| Colisão | Cápsula de 1,80 m de altura e 0,40 m de raio, independente da aparência |
| Animação | 30 fps na autoria; locomoção no lugar |
| Rosto | Começar com expressões por textura, conforme especificação; geometria deve preservar identidade |

Os 7.000 triângulos do mobile prevalecem sobre a regra aproximada de 50% de redução. As velocidades acima prevalecem sobre os antigos 1,8/6,5 m/s da tabela de clips; ajustar duração/reprodução dos ciclos sem impor números de quadros incompatíveis com o contato dos pés. A contagem exata de ossos deve ser reconciliada entre tabela, hierarquia e exportador antes de congelar o rig; não assumir compatibilidade só pela contagem ou pelos nomes.

## 6. Primeira entrega e evidências

Entregar fonte Blender editável, FBX, texturas, LODs, clips, prefab e cena Unity de validação. Registrar orçamento, versões das ferramentas, comparações visuais e testes realmente executados. O primeiro marco é um personagem fiel com corrida, pulo e um ataque, antes de expandir para todas as classes e equipamentos.

Estados de entrega: **blockout → modelado → rigado → animado → jogável → validado no dispositivo**. Não anunciar uma etapa posterior sem sua evidência. A atualização documental não significa que esses assets ou testes já foram produzidos.

## Fontes técnicas

- Unity Humanoid: https://docs.unity.com/en-us/engine/6000.3/manual/animation-section/animation-mecanim/avatar-creationand-setup
- Mixamo: https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html
- TRELLIS.2: https://github.com/microsoft/TRELLIS.2
- Unity Toon Shader: https://docs.unity3d.com/Packages/com.unity.toonshader@0.13/manual/index.html
- Animation Rigging: https://docs.unity3d.com/Packages/com.unity.animation.rigging@1.4/manual/index.html
