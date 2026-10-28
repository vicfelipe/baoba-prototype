# Classes de Baobá

v1.0 · 26/10/2026 · **Confirmado pelo usuário.** Este documento define as cinco classes e a função de cada uma no grupo. Qualquer mudança aqui obriga a atualizar os documentos 01, 03, 05 e 06.

## Composição

As classes formam um grupo equilibrado, com uma classe para cada função da trindade de MMO (tanque, dano, cura). O dano tem três estilos: corpo a corpo, à distância e furtivo. A identidade é coesa: todas vêm de figuras brasileiras — sertão, capoeira, cidade e mata.

| Função | Classe | Estilo |
| --- | --- | --- |
| Tanker | **Vaqueiro** | Armadura de couro resistente, laço de couro cru e berrante para atrair inimigos. |
| DPS Melee | **Capoeirista** | Mobilidade, esquivas rítmicas e chutes devastadores. |
| DPS Ranged | **Cangaceiro** | Carabina/bacamarte, pistolas e arremesso de faca peixeira. |
| DPS Stealth | **Maloka** (urbano) ou **Mateiro** (natureza) | Navalha/faca, venenos, camuflagem e ataques pelas costas. |
| Healer | **Benzedeiro** ou **Pajé** | Magia espiritual, purificação de feitiços/maldições e ervas medicinais. |

## Descrição das classes

### Vaqueiro — Tanker

Protetor do sertão, acostumado a enfrentar o gado bravo de frente.
- **Armadura de couro resistente:** gibão, perneiras e chapéu de couro absorvem o dano e permitem segurar a linha de frente.
- **Laço de couro cru:** puxa, prende e reposiciona inimigos, tirando-os de perto dos aliados.
- **Berrante:** chama os inimigos para si. É a ferramenta de provocação ("aggro").

Papel no grupo: segurar a atenção dos inimigos, controlar a posição deles e proteger os aliados.

### Capoeirista — DPS Melee

Lutador da roda, que transforma a ginga em ataque.
- **Mobilidade:** ginga constante, troca de base e deslocamento rápido em volta do alvo.
- **Esquivas rítmicas:** esquiva baixa e rolê com invulnerabilidade curta; o ritmo da ginga define a janela de defesa.
- **Chutes devastadores:** Martelo, Ponteira, Armada, Meia-lua de compasso e Rasteira, que interrompe conjurações.

Papel no grupo: dano contínuo corpo a corpo, sobrevivendo pela esquiva e não pela armadura. É uma das **classes jogáveis do protótipo** (seção "Estado").

### Cangaceiro — DPS Ranged

Atirador do sertão, com o visual do cangaço.
- **Carabina/bacamarte:** disparos fortes de média e longa distância.
- **Pistolas:** sequência rápida a curta distância.
- **Faca peixeira:** arremesso que alcança alvos fugindo ou conjurando.

Papel no grupo: dano à distância e eliminação de alvos prioritários.

### Maloka ou Mateiro — DPS Stealth

A mesma função furtiva em duas versões, uma urbana e uma da natureza.
- **Maloka (urbano):** navalha, gingado de rua, venenos e sumiço na multidão e nas sombras.
- **Mateiro (natureza):** faca de mato, venenos de plantas, camuflagem na folhagem e conhecimento de trilhas.
- **Comum aos dois:** ataques pelas costas com dano alto, venenos de efeito contínuo e camuflagem para se posicionar.

Papel no grupo: dano explosivo em alvos isolados, entrando e saindo do combate.

### Benzedeiro ou Pajé — Healer

A mesma função de cura em duas tradições espirituais.
- **Benzedeiro:** rezas, ramos e benzeduras do saber popular.
- **Pajé:** conhecimento ancestral indígena, cantos e ligação com os espíritos da mata.
- **Comum aos dois:** magia espiritual que cura e protege, purificação de feitiços e maldições (remove efeitos negativos, como o Silêncio) e ervas medicinais para cura contínua.

Papel no grupo: manter o grupo vivo e anular as maldições dos inimigos.

## Decisões pendentes (documento 02: D14–D16)

- **DPS Stealth:** Maloka ou Mateiro (ou os dois, como variantes da mesma classe).
- **Healer:** Benzedeiro ou Pajé (ou os dois). Se for o Pajé, a representação indígena pede consultoria cultural antes da arte final (documento 02, consultorias).
- **Ordem de produção** das classes depois do Capoeirista.

## Estado

| Classe | Estado |
| --- | --- |
| Capoeirista | **Jogável** no protótipo web (`web/`). Modelo do usuário adotado no pipeline Lunia, esqueleto Lunia, golpes de captura Mixamo e demais movimentos autorados no add-on Mixamo Rig. Kit: Martelo → Ponteira → Armada, Rasteira (interrompe), Meia-lua de compasso (área), esquiva. Detalhes nos documentos 16 e 18. |
| Cangaceiro | **Jogável** no protótipo web desde 27/10/2026, escolhido na tela de título. Kit: bacamarte (J), Peixeira (Q, interrompe conjurações à distância), Pistolas (E, rajada curta), esquiva. Tempos aprovados pelo usuário; dano, alcance e recarga são proposta em `config.js`. Ver documento 21. |
| Vaqueiro | **Jogável** desde 27/10/2026, escolhido na tela de título; no jogo se chama **Peão** desde 28/10/2026 (identificadores e arquivos seguem `vaqueiro`). Kit: gancho (J), Laço (Q, prende e puxa; nos chefes interrompe), Berrante (E, provoca), esquiva; armadura de couro reduz o dano recebido. Números são proposta em `config.js`. Ver documento 23. |
| Maloka | **Jogável** desde 28/10/2026, escolhido na tela de título. Kit: Navalha (J, mais dano pelas costas), Veneno (Q, frasco arremessado que interrompe conjurações e envenena), Fumaça (E, cortina de fumaça: os inimigos comuns perdem o rastro, os chefes não usam o golpe básico nele e o 1º golpe que sai da fumaça é emboscada), esquiva. Números são proposta em `config.js`. Ver documento 24. |
| Mateiro, Benzedeiro/Pajé | Definidas; ainda não produzidas. A escolha Maloka × Mateiro (D14) continua aberta: o Maloka foi produzido primeiro. O escopo do P0 continua com uma classe jogável (documento 01). Cada nova classe segue o pipeline da skill `lunia-character`: referências em T-pose → modelo → rig → animações → jogo. |

O antigo "Guardião" (lança e escudo) e o nome "Lutador" (documentos 05, 06, 11, 14 e 17) são registros anteriores. O herói jogável agora é o Capoeirista.
