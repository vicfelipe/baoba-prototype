import * as THREE from 'three';
import { CINEMATIC } from './config.js';

// Cinemáticas do Curupira (doc 20). Os planos são montados na linha herói → chefe
// no instante em que a cinemática começa: u aponta do herói ao chefe, s é a lateral.
// Eventos recebem skip = true quando o jogador pula: só aplicam o estado de jogo.

function framer(G) {
  const B = G.boss.pos.clone().setY(0), P = G.player.pos.clone().setY(0);
  const u = B.clone().sub(P).setY(0).normalize(), s = new THREE.Vector3(u.z, 0, -u.x);
  const at = (back, side, up) => B.clone().addScaledVector(u, -back).addScaledVector(s, side).setY(up);
  const look = (y) => B.clone().setY(y);
  G.player.facing = Math.atan2(u.x, u.z);
  G.player.moving = 0;
  return { B, at, look };
}

// Encontro: plano geral do gigante adormecido, ele desperta, aproximação baixa até o
// rugido (tremor, pulso), cartela com nome e epíteto, volta à câmera de jogo.
// Textos do chefe ativo (boss.card); o Curupira usa os padrões.
const CURUPIRA_CARD = { area: 'Chefe · Clareira da Mata Viva', name: 'Curupira corrompido', epithet: 'Guardião da mata, tomado pelo Silêncio',
  sleep: '[Sistema] Algo dorme no centro da clareira…', wake: '[Sistema] O Curupira corrompido desperta!' };

export function encounterCinematic(G, cine, onEnd) {
  const E = CINEMATIC.encounter, { at, look } = framer(G), card = G.boss.card || CURUPIRA_CARD;
  const roar = E.awakenAt + 2.3 * E.awaken / 3.2;
  const head = () => G.boss.pos.clone().setY(G.boss.height * 0.85);
  return {
    duration: E.duration, blendIn: 1.0, blendOut: 1.2, onEnd,
    shots: [
      { t: 0, pos: at(10, 5, 3.6), look: look(1.2) },
      { t: E.awakenAt, pos: at(8.5, 4.2, 3.0), look: look(1.2) },
      { t: roar - 0.5, pos: at(5.8, 2.6, 1.6), look: look(2.3) },   // ¾ baixo: o rosto aparece mesmo com a cabeça para trás
      { t: roar + 0.6, pos: at(5.0, 1.9, 1.8), look: look(2.5) },
      { t: E.duration - 1.2, pos: at(6.2, -1.6, 1.8), look: look(2.3) },
      { t: E.duration, pos: at(7, -2, 2.2), look: look(2.2) },
    ],
    events: [
      { t: 0.3, fn: (skip) => { if (!skip) G.hud.log(card.sleep, 'sys'); } },
      { t: E.awakenAt, fn: (skip) => {
        G.hud.log(card.wake, 'bad');
        if (skip) return;
        G.boss.awaken();
        G.fx.burst(card.burst || 'corrupt', G.boss.pos.clone().setY(1.2), { n: 24 });
      } },
      { t: roar - 0.1, fn: (skip) => {
        if (skip) return;
        G.audio.play('roar');
        cine.shake(0.12, 1.0);
        G.hud.pulseFlash();
        G.fx.burst(card.burst || 'corrupt', head(), { n: 40 });
      } },
      { t: roar + 0.7, fn: (skip) => { if (!skip) cine.nameCard(card.area, card.name, card.epithet); } },
      { t: E.duration - 1.0, fn: () => cine.hideCard() },
    ],
  };
}

// Libertação: a corrupção é arrancada (release), clarão e troca de forma, a cor volta à
// clareira, o liberto se ergue e olha a própria mão (close), plano aberto da mata viva.
export function liberationCinematic(G, cine, onEnd) {
  const L = CINEMATIC.liberation, { B, at, look } = framer(G), swap = L.release;
  return {
    duration: L.duration, blendIn: 0.6, blendOut: 1.4, onEnd,
    shots: [
      { t: 0, pos: at(6, 3.2, 2.2), look: look(1.8) },
      { t: swap - 0.3, pos: at(5, 2.4, 1.6), look: look(1.6) },
      { t: swap + 1.2, pos: at(3.6, 1.2, 1.4), look: look(1.3) },
      { t: swap + 2.6, pos: at(2.3, 0.5, 1.75), look: look(1.65) },
      { t: L.duration - 1.8, pos: at(9, 5, 5.5), look: look(1.0) },
      { t: L.duration, pos: at(10, 5.5, 6), look: look(1.0) },
    ],
    events: [
      { t: 0, fn: (skip) => {
        if (skip) return;
        G.audio.play('interrupt');
        G.fx.burst('interrupt', B.clone().setY(2));
        cine.shake(0.08, 0.5);
      } },
      { t: 0.6, fn: (skip) => { if (!skip) G.fx.burst('corrupt', B.clone().setY(1.6), { n: 50 }); } },
      { t: swap - 0.08, fn: (skip) => { if (!skip) cine.flash(); } },
      { t: swap, fn: (skip) => {
        G.world.restoreAll();
        G.audio.setMusic('victory');
        if (skip) return;
        G.audio.play('restore');
        G.fx.burst('restore', B.clone().setY(1.5), { n: 60 });
        cine.shake(0.05, 0.4);
      } },
      { t: swap + 2.0, fn: (skip) => { if (!skip) G.hud.banner('O Curupira foi libertado!', 'A cor volta à Mata Viva', 3.5); } },
      { t: swap + 2.1, fn: () => G.hud.log('O Curupira foi libertado! A corrupção se desfaz.', 'good') },
      { t: L.duration - 2.2, fn: (skip) => {
        const fm = G.world.finalMemory;
        if (fm.visible) return;
        fm.visible = true;
        if (skip) return;
        G.fx.burst('restore', fm.position.clone().setY(1.4), { n: 30 });
        G.audio.play('chime');
      } },
    ],
  };
}
