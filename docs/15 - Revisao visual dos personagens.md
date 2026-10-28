# Revisão visual — Lutador e Curupira

25/10/2026. Pedido vigente: aproximar os personagens dos desenhos em `arts/`, priorizando qualidade e sem limite de triângulos. Substitui a simplificação de arte da primeira build.

## Construção

Os modelos foram reconstruídos a partir de medidas das referências. São malhas tridimensionais fechadas, com profundidade, rig Humanoid e pesos de deformação. A pintura original é aplicada por UV antes da conversão dos braços para a pose de descanso do rig; acompanha a animação. Não são sprites nem imagens voltadas para a câmera.

- **Lutador:** rosto e proporções baseados no turnaround, camiseta e bermuda cinza com os traços do desenho, braços e pernas mais robustos, cabelo preso com mechas volumétricas. Frente e costas usam as vistas correspondentes da referência.
- **Curupira:** anatomia verde com grafismos originais, olhos amarelos e expressão da referência, massa de fogo curvada, folhas sobrepostas, cordas e madeira nos braceletes, pés voltados para trás.
- Materiais combinam a pintura UV, cores de continuidade nas laterais, iluminação estilizada e contorno fino. A textura não deve receber uma segunda camada forte de sombras que apague o desenho.
- Não há decimação para atender ao orçamento anterior: Lutador tem aproximadamente 199 mil triângulos e Curupira, 125 mil, antes da duplicação da malha para o contorno. Valores exatos nos arquivos `Evidence/*-mesh-v2.json`.

## Fontes e reprodução

Fontes editáveis: `SourceArt/Lutador.blend` e `SourceArt/Curupira.blend`. Texturas originais empacotadas nos arquivos Blender e copiadas para `BaobaPrototype/Assets/Baoba/Art/References/`. Os desenhos em `arts/` permanecem intactos.

Gerador vigente: `tools/build_reference_characters.py`, executado com Blender 5.2.3. A versão anterior está preservada em `SourceArt/archive-v1/`. Não executar o gerador antigo sobre a arte atual. Preservar quaisquer alterações manuais antes de regenerar.

A build usa os novos FBX e materiais. `Baoba.exe --art-review` captura os modelos dentro da Unity, incluindo frente, três quartos, costas e rostos; encerra automaticamente. `--demo --smoke` verifica apresentação durante o combate. `--verify` executa os casos dirigidos das mecânicas.

## Pontos de avaliação artística

O Curupira só tem referência frontal; costas e transições laterais são interpretações. Sua imagem tem 542 × 710 pixels: a malha mais densa não cria detalhes de pintura ausentes nessa resolução. A projeção das ilustrações exige avaliação das transições laterais, sobretudo mãos, orelhas, pés e roupas em poses extremas. O cabelo e as partes não cobertas pelo turnaround continuam sujeitos à comparação visual e ao refinamento.

Uma build funcional e testes de combate aprovados não equivalem a aprovação artística. Não declarar reprodução perfeita ou arte final sem essa avaliação.
