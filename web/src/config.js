// Números de combate. Fonte: docs 03 (regras comuns e Fragmento) e 14 (kit do Capoeirista, ex-Lutador, e Curupira).
// Classes: docs 19. Heróis jogáveis: Capoeirista (DPS Melee), Cangaceiro (DPS Ranged), Vaqueiro (Tanker) e Maloka (DPS Stealth).
// Valores iniciais de teste, não balanceamento validado.

export const PLAYER = {
  hp: 100,
  speed: 5.1,
  radius: 0.4,
  // Sequência de golpes: dano, duração total, instante do impacto
  combo: [
    { dmg: 34, dur: 0.57, hit: 0.22, name: 'Martelo' },
    { dmg: 34, dur: 0.57, hit: 0.22, name: 'Ponteira' },
    { dmg: 52, dur: 0.84, hit: 0.4, name: 'Armada' },
  ],
  comboWindow: 1.5,
  reach: 3.25, // distância entre centros (doc 14)
  rasteira: { dmg: 65, cd: 5, dur: 0.74, hit: 0.3 },
  meiaLua: { dmg: 95, cd: 7, dur: 1.0, hit: 0.51, radius: 3.4 },
  dodge: { cd: 2.2, dur: 0.44, dist: 4.2, iStart: 0.03, iEnd: 0.41 },
  jump: { v: 6, g: -20 },
  attackMoveMul: 0.35,
};

// Cangaceiro (DPS Ranged, doc 19/21), herói selecionável na tela de título. Tempos dos clipes aprovados
// pelo usuário (27/10/2026); dano, alcance, recarga e velocidade dos projéteis são proposta inicial, não
// balanceamento: o Capoeirista faz ~60 de dano/s de perto, o Cangaceiro ~50/s de longe.
// Mesmas teclas do Capoeirista: J/clique bacamarte, Q peixeira (interrompe, como a Rasteira), E pistolas.
export const CANGACEIRO = {
  speed: 5.1,
  bacamarte: { dur: 0.9, hit: 0.38, dmg: 46, range: 12, shot: 34 },              // tiro forte, média/longa distância
  pistolas: { dur: 0.84, hits: [0.16, 0.38, 0.6], dmg: 16, range: 8, shot: 38, cd: 4 },   // rajada curta
  peixeira: { dur: 0.7, hit: 0.32, dmg: 40, range: 14, shot: 24, cd: 6 },        // arremesso que interrompe
  dodge: { dur: 0.44 },
  moveMul: 0.25,
};

// Vaqueiro (Tanker, doc 19/23), herói selecionável. Kit pedido pelo usuário (27/10/2026): ataque básico,
// laço que prende (exceto chefes) e puxa, berrante que provoca e esquiva; dano reduzido por ser tanque.
// Números são proposta inicial, não balanceamento: ~33 de dano/s de perto (Capoeirista ~60/s); a armadura
// de couro (doc 19) absorve 30% do dano recebido. Nos chefes o laço só interrompe a conjuração.
// Mesmas teclas: J/clique ataque, Q laço, E berrante. Os clipes do GLB usam estes tempos (vaqueiro_motion.py).
export const VAQUEIRO = {
  speed: 4.4,
  armor: 0.7,                                                    // dano recebido × 0,7
  attack: { dur: 0.6, hit: 0.26, dmg: 20, reach: 2.9 },          // gancho de direita
  laco: { dur: 0.8, hit: 0.42, dmg: 8, range: 9, cd: 7, hold: 2.5, rope: 30 },   // rope: m/s do laço no ar
  pull: { dur: 0.7, to: 1.7 },                                   // arrasta o preso até 1,7 m à frente
  berrante: { dur: 1.4, hit: 0.3, radius: 10, taunt: 5, cd: 10 },
  dodge: { dur: 0.44 },
};

// Maloka (DPS Stealth urbano, doc 19/24), herói selecionável. Kit proposto (28/10/2026), números a validar:
// navalhada (J) com dano extra pelas costas; frasco de veneno (Q) arremessado, interrompe conjurações e deixa
// dano contínuo; cortina de fumaça (E): nuvem nos pés, os inimigos comuns perdem o rastro de quem está
// dentro (e por `linger` s depois de sair) e o 1º golpe que sai da fumaça é crítico. ~40 de dano/s de perto,
// mais o veneno e os bônus de emboscada. Os clipes do GLB usam estes tempos (maloka_motion.py).
export const MALOKA = {
  speed: 5.4,
  navalha: { dur: 0.6, hit: 0.3, dmg: 24, reach: 2.8, back: 1.5 },    // estocada (Stabbing.fbx); back: × pelas costas
  veneno: { dur: 0.7, hit: 0.36, dmg: 10, range: 10, shot: 16, cd: 7, dps: 6, last: 5 },    // 6/s por 5 s
  fumaca: { dur: 0.6, hit: 0.3, radius: 3.2, last: 5, linger: 1.2, crit: 2, cd: 14 },
  dodge: { dur: 0.44 },
};

export const FRAGMENTO = {
  hp: 60,
  speed: 2.5,
  radius: 0.45,
  detect: 7,
  leash: 12,
  attackRange: 1.5, // entre superfícies
  cone: { angle: 70, range: 2.0, warn: 1.0, dmg: 15, recover: 1.2 },
};

// Mortos-vivos do Sertão Velho (fase 2, doc 24): variações do Fragmento, mesmo ciclo de cone com aviso.
// Proposta inicial, a validar: saem da cova quando o herói chega perto (rise, sem levar dano enquanto sobem),
// são mais lentos e aguentam mais que o Fragmento. O 'brasa' explode ao cair: círculo com aviso no chão.
export const MORTO = {
  hp: 85,
  speed: 2.1,
  radius: 0.45,
  detect: 6.5,
  leash: 12,
  attackRange: 1.5,
  rise: 1.5,
  cone: { angle: 80, range: 2.2, warn: 1.05, dmg: 16, recover: 1.3 },
};
export const BRASA = {
  ...MORTO,
  hp: 70,
  burst: { delay: 0.35, warn: 1.2, radius: 2.6, dmg: 18 },
};

// Porto de Santos (fase 3, doc 25): afogados do cais (variação do morto-vivo: sobem do mar pela beira do cais),
// coral do Silêncio (variação do Fragmento, de perto) e craca do Silêncio (cospe água de longe: círculo sob o
// herói, mantendo distância). Proposta inicial, a validar.
export const AFOGADO = {
  ...MORTO,
  hp: 80,
  speed: 2.2,
  rise: 1.4,
  cone: { angle: 70, range: 2.4, warn: 1.0, dmg: 15, recover: 1.2 },
};
export const CORAL = { ...FRAGMENTO, hp: 70, speed: 2.3 };
export const CRACA = {
  ...FRAGMENTO,
  hp: 55,
  speed: 2.0,
  detect: 9,
  spit: { range: 9, keep: 5, warn: 1.3, radius: 1.8, dmg: 14, cd: 3.2 },
};

export const CURUPIRA = {
  corruption: 2400,
  radius: 0.85,
  speed: 2,
  startWait: 2,
  approachMax: 3,
  approachRange: 2.6,
  sweep: { warn: 1.65, angle: 100, range: 4.2, dmg: 24 },
  roots: { warn: 2, radius: 2.5, dmg: 28 },
  call: { cast: 3.4, dmg: 20 },
  // Ataque básico (garrada da mão esquerda) entre as habilidades, com o herói perto. Golpe comum, como os
  // dos heróis: sem marcação no chão nem som de aviso; acerta no fim do preparo (windup) dentro de alcance e arco.
  // Proposta (27/10/2026), a validar: dano menor que as habilidades; recarga própria.
  basic: { windup: 0.6, hit: 0.4, angle: 90, range: 2.6, dmg: 12, cd: 2.6 },
  recover: 2,
  recoverInterrupted: 3,
};

// Mula sem Cabeça (chefe, SourceArt/MulaSemCabeca). Proposta inicial, a validar pelo usuário: vida,
// golpes, dano e tempos. Os clipes do GLB são gerados com estes tempos (tools/charpipe/mula_rig.py).
// Ciclo: aproximar → coice → recuperar → investida → recuperar → aproximar → empinada → Labareda → recuperar.
// Entre as habilidades, com o herói perto, a patada (basic) ao se aproximar e na 2ª metade da recuperação.
export const MULA = {
  hp: 2600,
  radius: 1.1,
  speed: 2.2,          // passo (clipe walk, 1,2 s por passada)
  startWait: 1.5,
  approachMax: 3,
  approachRange: 2.2,
  kick: { warn: 1.3, angle: 80, range: 4.6, dmg: 26 },                 // coice: cone atrás da garupa
  charge: { warn: 1.7, width: 2.4, length: 15, speed: 14, dmg: 30 },   // investida em linha; a chama cresce e fica branca
  stomp: { warn: 1.6, radius: 4.2, reach: 1.6, dmg: 28 },              // empinada: círculo à frente do peito
  blaze: { cast: 3.2, dmg: 22 },                                       // Labareda: pulso na arena, Rasteira interrompe
  basic: { windup: 0.55, hit: 0.45, angle: 80, range: 2.8, dmg: 14, cd: 2.4 }, // patada com o casco dianteiro, sem aviso (proposta)
  recover: 1.8,
  recoverInterrupted: 3,
};

// Iara e Ipupiara (chefes em dupla do Porto de Santos, doc 25). Proposta inicial, a validar: vida, golpes, dano
// e tempos. Barras separadas, sem vida ligada (decisão do usuário, 28/10/2026); a luta acaba com os dois resolvidos.
// Ipupiara: corpo a corpo no deque. Ciclo aproximar → rabada → recuperar → arremetida → recuperar; mordida (basic,
// sem aviso) com o herói perto. shove: metros que o golpe empurra o herói (para fora do deque = cai no mar).
export const IPUPIARA = {
  hp: 1900,
  radius: 1.2,
  speed: 2.4,
  startWait: 1.5,
  approachMax: 3,
  approachRange: 2.4,
  tail: { warn: 1.4, angle: 140, range: 5, dmg: 22, shove: 5 },                 // rabada: cone atrás
  lunge: { warn: 1.6, width: 2.6, length: 12, speed: 13, dmg: 26, shove: 4 },     // arremetida em linha
  basic: { windup: 0.5, hit: 0.4, angle: 70, range: 3, dmg: 14, cd: 2.4 },       // mordida, sem aviso
  recover: 1.8,
};
// Iara: na água, a `edge` m do centro do deque. Ciclo nadar → jato → recuperar → jato → nadar → Canto → recuperar.
// Canto: conjuração; puxa o herói `pull` m/s em direção a ela e, se terminar, arrasta `drag` m (para o mar). Q interrompe.
export const IARA = {
  corruption: 1500,
  radius: 1.0,
  edge: 13.2,
  swim: 4,                     // m/s ao longo da borda
  startWait: 3,
  jet: { warn: 1.5, radius: 2.2, dmg: 18 },
  song: { cast: 3.6, pull: 1.6, drag: 7, dmg: 16 },
  basic: { windup: 0.5, hit: 0.4, angle: 90, range: 2.6, dmg: 10, cd: 2.6 },   // rabanada, sem aviso
  recover: 2.2,
  recoverInterrupted: 3,
};
// O mar (mecânica da dupla): relógio próprio enquanto houver chefe de pé. Ressaca: faixa larga que atravessa o
// deque mirando o herói; a espuma corre a `speed` m/s, causa dano e empurra no sentido da onda. Maré alta (a cada
// `every`º evento): o anel entre `inner` e a borda fica coberto por `last` s. Cair no mar: dano e `swim` s na água.
export const MAR = {
  first: 9,
  every: 11,
  wave: { warn: 2.0, width: 7, dmg: 18, shove: 5, speed: 16 },
  tide: { warn: 2.4, inner: 7.5, last: 5, dps: 8, slow: 0.6, every: 3 },
  fall: { dmg: 12, swim: 1.4 },
};

// Cinemáticas do chefe (doc 20). Tempos visuais, fora do combate; os clipes
// dormant/awaken/release/rise do Curupira são gerados com estas durações.
export const CINEMATIC = {
  encounter: { duration: 7.2, awakenAt: 1.4, awaken: 3.2 },   // rugido aos ~2,3 s do despertar
  liberation: { duration: 8.4, release: 2.2, rise: 3.0 },     // troca de forma ao fim de release
};

export const WORLD = {
  arenaCenter: { x: 0, z: -66 },
  arenaRadius: 12,
  gateZ: -52,
};
