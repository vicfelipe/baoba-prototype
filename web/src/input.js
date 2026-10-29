// Teclado, mouse e toque. Movimento relativo à tela (câmera fixa): W/↑ sobe, S/↓ desce.
// No celular, touch.js preenche `stick` (joystick) e chama press() pelos botões.

const BIND = {
  attack: ['KeyJ', 'Digit1', 'Mouse0'],
  rasteira: ['KeyQ', 'KeyK', 'Digit2'],
  meialua: ['KeyE', 'KeyL', 'Digit3'],
  dodge: ['ShiftLeft', 'ShiftRight'],
  jump: ['Space'],
  interact: ['KeyF'],
  Tab: ['Tab'],
  pause: ['Escape', 'KeyP'],
  confirm: ['Enter', 'NumpadEnter'],
  restart: ['KeyR'],
};

export class Input {
  constructor(canvas) {
    this.down = new Set();
    this.hits = new Set();
    this.wheel = 0;
    this.mouse = { x: 0, y: 0 };
    this.clickPos = null;
    this.stick = { x: 0, z: 0 };
    window.addEventListener('keydown', (e) => {
      if (['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      if (!e.repeat) this.hits.add(e.code);
      this.down.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.down.delete(e.code));
    window.addEventListener('blur', () => this.down.clear());
    // Clique golpeia e seleciona; toque com o dedo só seleciona o alvo (os golpes ficam nos botões) e pula cinemáticas.
    canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      this.hits.add(e.pointerType === 'mouse' ? 'Mouse0' : 'Tap');
      this.clickPos = { x: e.clientX, y: e.clientY };
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('wheel', (e) => {
      this.wheel += Math.sign(e.deltaY);
      e.preventDefault();
    }, { passive: false });
  }

  pressed(action) {
    return (BIND[action] || [action]).some((c) => this.hits.has(c));
  }

  // Botão de toque: equivale a apertar a primeira tecla da ação neste quadro.
  press(action) {
    this.hits.add((BIND[action] || [action])[0]);
  }

  held(code) {
    return this.down.has(code);
  }

  get axisX() {
    return this.stick.x + (this.held('KeyD') || this.held('ArrowRight') ? 1 : 0) - (this.held('KeyA') || this.held('ArrowLeft') ? 1 : 0);
  }

  get axisZ() {
    return this.stick.z + (this.held('KeyS') || this.held('ArrowDown') ? 1 : 0) - (this.held('KeyW') || this.held('ArrowUp') ? 1 : 0);
  }

  endFrame() {
    this.hits.clear();
    this.wheel = 0;
    this.clickPos = null;
  }
}
