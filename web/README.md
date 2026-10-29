# Baobá — O Eco da Mata (versão web 2.5D)

Protótipo jogável no navegador: Capoeirista (DPS Melee), Cangaceiro (DPS Ranged), Vaqueiro (Tanker) ou Maloka (DPS Stealth), escolhidos na tela de título (ver [classes](<../docs/19 - Classes.md>)), × Curupira na Mata Viva, câmera fixa 2.5D com direção de arte do Lunia (proporção anime, cenário pintado, círculos mágicos) e combate com avisos no chão, interrupção e esquiva (mecânica Tarisland). Decisões em [../docs/16 - Prototipo web 2.5D.md](<../docs/16 - Prototipo web 2.5D.md>).

## Fases

Escolha na tela de título (a escolha fica salva no navegador):

- **Fase 1 · Mata Viva:** trilha com 3 Fragmentos do Silêncio → vestígio → portão de cipós → Curupira, que é libertado.
- **Fase 2 · Sertão Velho:** noite gótica no arraial abandonado; 5 mortos-vivos saem das covas → folheto de cordel no cemitério → portão de ferro do casarão → Mula sem Cabeça no terreiro → amanhece. Ver [documento 24](<../docs/24 - Sertao Velho fase 2.md>).

## Jogar

- **Sem instalar nada:** abra `dist/index.html` no Chrome/Edge (ou dê dois cliques em `Jogar.cmd`).
- **Desenvolvimento:** `npm install` e `npm run dev` (abre em `http://localhost:5173`).
- **Gerar a build:** `npm run build` → `dist/index.html`, arquivo único com tudo embutido.

As fontes vêm do Google Fonts; sem internet, o jogo usa fontes do sistema.

## Controles

| Tecla | Ação |
| --- | --- |
| WASD / setas | Mover (relativo à tela) |
| Clique / J | Sequência de golpes (Martelo → Ponteira → Armada) |
| Q | Rasteira — 65 de dano, interrompe o Chamado do Silêncio |
| E | Meia-lua de compasso — 95 de dano em área |
| Shift | Esquiva (rolê) com invulnerabilidade curta |
| Espaço | Pulo (não protege de áreas no chão) |
| Tab / clique no inimigo | Selecionar alvo |
| F | Interagir com vestígio e memória |
| Roda do mouse | Zoom |
| Esc | Pausa (volume, checkpoint, recomeçar) |

### Celular e tablet

Funciona no PC e no celular com a mesma build. Em aparelhos de toque (ou ao tocar a tela), `src/touch.js` liga os controles de toque; no PC nada muda.

- **Tela deitada:** com o celular em pé, o jogo pausa e pede para girar. No Android, **Iniciar** também abre em tela cheia e trava a horizontal; no iPhone vale só o aviso.
- **Mover:** arraste o polegar na metade esquerda da tela (joystick que nasce onde você toca).
- **Missão:** a aba presa ao painel "Ajuda da Missão" recolhe o painel para fora da tela, pela lateral em que ele fica: direita no PC, esquerda no celular deitado. Sobra só a aba na borda, que pisca quando um objetivo muda. No celular começa recolhida; a escolha fica salva no navegador.
- **HUD limpo no celular:** some o que repete informação (o nome do próprio herói, o papel na moldura, o texto da barra de memória, que vira um fio de 4 px) e o nome da área só aparece por alguns segundos ao entrar numa área nova. O joystick em repouso e a pausa ficam discretos. A barra do chefe vai para o topo e as dicas para uma faixa curta embaixo, entre o joystick e os botões. Com a barra do navegador à mostra (altura de até 360 px), botões, joystick, minimapa e retrato encolhem. No iPhone, a tela de título explica como instalar na Tela de Início para jogar em tela cheia.
- **Ações:** os botões redondos à direita são a barra de habilidades: laranja golpeia, azul é o Q, roxo é o E, verde esquiva, cinza pula e a mira troca o alvo. Toque no inimigo para selecioná-lo, no aviso de interação para usar vestígio e memória, e em ❚❚ para pausar. Um toque na tela pula a cinemática.
- **Desempenho:** em telas de toque a resolução vai até 1,5× e a sombra e o antisserrilhado ficam mais leves.
- **Teste:** `node tools/shot-mobile.mjs` (celular deitado e em pé, mais o PC sem controles de toque).

## Estrutura

| Arquivo | Conteúdo |
| --- | --- |
| `src/config.js` | Números de combate (docs 03 e 14) |
| `src/main.js` | Laço, câmera, fluxo da sessão, checkpoints |
| `src/world.js` | Fase 1: trilha, riacho, vegetação, portão, clareira, ondas de restauração |
| `src/sertao.js`, `src/textures-sertao.js` | Fase 2: arraial de taipa, caatinga seca, cemitério, portão de ferro, terreiro e casarão; noite e amanhecer |
| `src/levels.js` | Textos, chefe e áreas de cada fase |
| `src/player.js` | Heróis e kits (Capoeirista corpo a corpo; Cangaceiro com bacamarte J, peixeira Q que interrompe, pistolas E; Vaqueiro com gancho, laço e berrante; Maloka com navalha J, frasco de veneno Q que interrompe e envenena, cortina de fumaça E que esconde e prepara a emboscada), alvo assistido |
| `src/projectiles.js` | Balas e peixeira do Cangaceiro e frasco de veneno do Maloka: saem da boca da arma (ossos `Muzzle_*`) ou da mão e acertam o primeiro inimigo no caminho |
| `src/enemies.js` / `src/boss.js` | Inimigos comuns (Fragmento do Silêncio e mortos-vivos) e Curupira |
| `src/morto.js` | Mortos-vivos do Sertão: variação procedural do Fragmento (ossada com trapos, coração de lasca); `brasa` explode ao cair |
| `src/capoeirista-asset.js`, `assets/capoeirista.glb` | Herói jogável: Capoeirista do pipeline Lunia (docs 18), material de banda Lunia, contorno com skinning e clipes do combate |
| `src/maloka-asset.js`, `assets/maloka.glb` | Maloka (DPS Stealth, 1,79 m com chapéu): cinco slots, navalha e frasco em ossos próprios sob a mão direita, 34 ossos e 11 clipes; véu translúcido quando escondido na fumaça (docs 24) |
| `src/cangaceiro-asset.js`, `assets/cangaceiro.glb` | Cangaceiro (DPS Ranged, 1,89 m com chapéu): seis slots, três armas em ossos próprios, 56 ossos e 11 clipes; herói jogável (`play()` segue o relógio do combate) |
| `src/curupira-asset.js`, `assets/curupira*.glb` | Curupira corrompido (3 m) e liberto (2,1 m), seis slots, 32 ossos e 11 clipes por forma; transformação após a vitória |
| `src/mula.js`, `src/mula-asset.js`, `assets/mula.glb` | Mula sem Cabeça (chefe quadrúpede, 3 m): 30 ossos e 16 clipes; fogo volumétrico do THREE.Fire (`@wolffo/three-fire`, MIT, textura em `assets/three-fire/`) no pescoço; chefe da fase 2 (Sertão Velho) |
| `src/lutador.js`, `src/fragmento.js` | `buildLutador()` (devolve o Capoeirista), poses legadas e Fragmento procedural |
| `src/toon.js` | Materiais (cel nos personagens, Lambert pintado no cenário), contorno, shader de corrupção |
| `src/textures.js` | Texturas pintadas geradas em canvas (grama, terra, piso, folhagem, samambaia, runas) |
| `src/telegraph.js`, `src/fx.js`, `src/hud.js`, `src/audio.js` | Avisos, efeitos, interface, áudio sintetizado |
| `src/touch.js` | Controles de toque: joystick, botões, pausa, aviso de girar e textos de ajuda sem teclas |

No console do navegador, `__baoba.advance(segundos)` avança a simulação em passos fixos — usado nos testes automáticos.

O botão **Ver personagens · modelos e animações** permite escolher o Capoeirista, o Cangaceiro, o Vaqueiro, o Maloka, uma das duas formas do Curupira ou a Mula sem Cabeça, girar o modelo e percorrer os clipes quadro a quadro. Fontes e processo do chefe: [Curupira — produção e integração](<../docs/20 - Curupira producao e integracao.md>); do Cangaceiro: [documento 21](<../docs/21 - Cangaceiro producao e integracao.md>); da Mula sem Cabeça: [documento 22](<../docs/22 - Mula sem Cabeca producao e integracao.md>).
