# Lutador esquelético — primeira versão integrada

> **Substituído (26/10/2026):** o herói jogável agora é o Capoeirista do pipeline Lunia — ver [18 §5](<18 - Pipeline de personagens estilo Lunia.md>). Este modelo e `assets/lutador.glb` seguem no repositório, fora da build.

26/10/2026. Implementação do personagem piloto: ginga e Martelo prioritários, com cobertura dos outros estados do jogo.

## Arquivos

- `SourceArt/Lutador-source.blend`: cópia preservada de `D:/Projetos/baoba/SourceArt/Lutador.blend`, localizada durante esta implementação. Não foi necessário alterar o projeto original.
- `SourceArt/lutador-reference.jpg`: cópia do desenho original encontrado naquele projeto.
- `SourceArt/Lutador-web.blend`: fonte editável com pintura original, rig e Actions; abre com a ginga selecionada. As pistas NLA ficam silenciadas para facilitar a edição individual.
- `web/assets/lutador.glb`: malha, pesos, materiais, imagem e 13 animações embarcadas.
- `web/src/lutador-asset.js`: carregamento, clones independentes de esqueleto, material pintado, contorno com skinning e reprodução.
- `web/src/lutador-studio.js`: visor do personagem acessível pelo botão **Ver Lutador** na tela inicial.
- `Evidence/lutador-*.png`: renders de revisão do Blender; não são capturas do navegador.

## O que mudou

O herói utiliza a malha original deformável com 22 ossos e aproximadamente 198 mil triângulos antes do contorno. Camiseta, bermuda, rosto e cabelo preservam a referência encontrada. A pintura mantém UV, imagem e máscara de transição do original, interpretadas pelo material do navegador. Outros visualizadores GLB podem não reproduzir o acabamento: o shader de mistura é próprio de Baobá.

Foram criados clips a partir das poses autorais do protótipo e do esqueleto original. Ginga e Martelo receberam solução analítica dos apoios, gravada nos ossos. O Martelo é apresentado no mesmo relógio de 0,42 s do combate, com contato aos 0,16 s; não recebe a suavização exponencial anterior. A corrida acompanha a velocidade de deslocamento. O segundo golpe passou a se chamar Galopante, de acordo com o movimento implementado.

Clips: idle, run, combo0, combo1, combo2, rasteira, meialua, dodge, jump, hit, dead, victory e apose. As demais ações são adaptações do blockout e ainda precisam de refinamento artístico, sobretudo apoios de mão na meia-lua, transições e movimento secundário do cabelo. Os apoios prioritários são baked, sem IK em tempo real.

A lógica de dano, recargas, alvo e deslocamento continua no controlador existente. O GLB é embutido pelo Vite no HTML final para conservar a entrega local em arquivo único. O Curupira não foi substituído nesta etapa.

## Como abrir

Execute `web/Jogar.cmd`. Na tela inicial, escolha **Ver Lutador · animações e modelo**. Selecione a animação, altere a velocidade, pause e arraste o controle de quadro. Há vistas de frente, costas, três quartos e câmera de jogo. **Voltar ao jogo** retorna ao menu.

## Reprodução e verificações

Na raiz:

```powershell
node tools/sample-lutador.mjs
& 'D:/Tools/blender-5.2.3-windows-x64/blender.exe' -b --python tools/export-lutador.py
node tools/check-lutador.mjs
npm --prefix web run build
```

O exportador reconstitui os arquivos derivados a partir da cópia preservada. Preserve edições manuais de `Lutador-web.blend` antes de executá-lo novamente.

Verificado: exportação de 13 clips, textura embarcada, esqueleto independente entre instâncias, coordenadas deformadas finitas em amostras de todos os clips, repetição de loops, relógio de impacto e build Vite. O teste Node substitui a decodificação de imagem e não testa WebGL. Os renders Blender foram inspecionados visualmente.

Limitação: não houve playtest nem captura desta versão rodando no navegador. A abertura de HTML local havia sido bloqueada pela política da ferramenta. Desempenho e aparência exata do shader WebGL ainda precisam de confirmação no navegador do usuário. Trata-se de uma primeira versão de produção apoiada na arte existente, não aprovação artística final nem reprodução exata de Lunia.
