// Controles de toque (celular e tablet): joystick flutuante na metade esquerda, a barra de habilidades vira
// botões, botão de pausa e aviso para deitar o aparelho. No PC nada muda: o modo toque liga com ponteiro
// grosso (tela de toque como entrada principal) ou ao tocar a tela, e desliga ao clicar com o mouse.

const ACTIONS = { combo: 'attack', rasteira: 'rasteira', meialua: 'meialua', dodge: 'dodge', jump: 'jump', interact: 'interact', target: 'Tab' };
const STICK = { r: 56, dead: 0.18, full: 0.7 };   // raio (px), zona morta e ponto de velocidade máxima (fração do raio)

const portrait = matchMedia('(orientation: portrait)');

export const isTouch = () => document.body.classList.contains('touch');

// Celular em pé: o jogo pausa e pede para girar.
export const blocked = () => isTouch() && portrait.matches;

// Textos de ajuda escritos com teclas viram os botões da tela no modo toque.
const TOUCH_TEXT = [
  [/WASD para mover/, 'Arraste à esquerda para mover'],
  [/Clique ou J/, 'botão laranja'],
  [/^Q (.+?) e E (.+?) causam/, 'Os botões azul ($1) e roxo ($2) causam'],
  [/· Tab troca o alvo/, '· toque no inimigo ou no alvo para trocar'],
  [/^Q \((.+?)\) interrompe/, 'O botão azul ($1) interrompe'],
  [/esquive com Shift/, 'esquive com o botão verde'],
  [/aperte F/, 'toque no aviso que aparece'],
  [/ \(F\)/, ''],
];
export function forTouch(text) {
  if (!isTouch()) return text;
  return TOUCH_TEXT.reduce((s, [re, to]) => s.replace(re, to), text);
}

// Tela cheia e trava na horizontal (Android/Chrome). O iPhone não permite: lá vale o aviso de girar.
export function enterLandscape() {
  const el = document.documentElement;
  if (!isTouch() || document.fullscreenElement || !el.requestFullscreen) return;
  el.requestFullscreen({ navigationUI: 'hide' })
    .then(() => screen.orientation?.lock?.('landscape'))
    .catch(() => {});
}

export function setupTouch(input) {
  const body = document.body;
  body.classList.toggle('touch', matchMedia('(pointer: coarse)').matches);
  window.addEventListener('pointerdown', (e) => body.classList.toggle('touch', e.pointerType !== 'mouse'), true);

  // Joystick: nasce onde o polegar toca; a base em repouso fica no canto como indicação.
  const zone = document.getElementById('stickZone');
  const base = document.getElementById('stickBase');
  const knob = document.getElementById('stickKnob');
  let id = null, ox = 0, oy = 0;
  const place = (el, x, y) => { el.style.left = x + 'px'; el.style.top = y + 'px'; };
  const release = () => {
    id = null;
    input.stick.x = input.stick.z = 0;
    base.classList.remove('on');
    for (const el of [base, knob]) el.style.left = el.style.top = '';
  };
  zone.addEventListener('pointerdown', (e) => {
    if (id !== null) return;
    e.preventDefault();
    id = e.pointerId;
    ox = e.clientX; oy = e.clientY;
    zone.setPointerCapture(id);
    place(base, ox, oy); place(knob, ox, oy);
    base.classList.add('on');
  });
  zone.addEventListener('pointermove', (e) => {
    if (e.pointerId !== id) return;
    let dx = e.clientX - ox, dy = e.clientY - oy;
    const d = Math.hypot(dx, dy);
    if (d > STICK.r) { dx *= STICK.r / d; dy *= STICK.r / d; }
    place(knob, ox + dx, oy + dy);
    const m = Math.min(1, Math.max(0, (d / STICK.r - STICK.dead) / (STICK.full - STICK.dead)));
    input.stick.x = d ? (dx / Math.hypot(dx, dy)) * m : 0;
    input.stick.z = d ? (dy / Math.hypot(dx, dy)) * m : 0;
  });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) zone.addEventListener(ev, (e) => { if (e.pointerId === id) release(); });
  window.addEventListener('blur', release);

  // Botões: cada slot da barra aperta a ação dele; o aviso de interação e a pausa também são tocáveis.
  const tap = (el, action) => {
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      input.press(action);
      el.classList.add('pressed');
    });
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) el.addEventListener(ev, () => el.classList.remove('pressed'));
  };
  for (const s of document.querySelectorAll('#skillbar .slot')) if (ACTIONS[s.dataset.skill]) tap(s, ACTIONS[s.dataset.skill]);
  tap(document.getElementById('interact'), 'interact');
  tap(document.getElementById('btnPause'), 'pause');

  // Toque longo e gestos do navegador (menu, seleção, zoom) atrapalham o combate.
  document.addEventListener('contextmenu', (e) => { if (isTouch()) e.preventDefault(); });
  document.addEventListener('gesturestart', (e) => e.preventDefault());
}
