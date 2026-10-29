// Áudio sintetizado com WebAudio: efeitos, ambiente de mata e um ritmo de berimbau/atabaque.
// Toda pista sonora necessária também tem equivalente visual (doc 01, seção 7).

export class Audio {
  constructor() {
    this.ctx = null;
    this.volume = 0.7;
    this.musicMode = 'off';
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(this.ctx.destination);
    this.sfxBus = this.ctx.createGain();
    this.sfxBus.gain.value = 0.9;
    this.sfxBus.connect(this.master);
    this.musicBus = this.ctx.createGain();
    this.musicBus.gain.value = 0.35;
    this.musicBus.connect(this.master);
    this.ambBus = this.ctx.createGain();
    this.ambBus.gain.value = 0.22;
    this.ambBus.connect(this.master);
    this.noiseBuf = this.ctx.createBuffer(1, this.ctx.sampleRate * 2, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.startAmbient();
    this.beat = 0;
    this.nextBeat = this.ctx.currentTime + 0.1;
  }

  setVolume(v) {
    this.volume = v;
    if (this.master) this.master.gain.value = v;
  }

  now() {
    return this.ctx.currentTime;
  }

  osc(type, freq, t, dur, gain, freqEnd = null, bus = this.sfxBus) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(bus);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  noise(t, dur, gain, filter = 'bandpass', f0 = 1000, f1 = null, q = 1, bus = this.sfxBus) {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = filter;
    f.frequency.setValueAtTime(f0, t);
    if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(bus);
    s.start(t, Math.random());
    s.stop(t + dur + 0.05);
  }

  play(name, arg = 0) {
    if (!this.ctx) return;
    const t = this.now();
    switch (name) {
      case 'swing':
        this.noise(t, 0.16, 0.35, 'bandpass', 900, 3500, 1.2);
        break;
      case 'swingBig':
        this.noise(t, 0.3, 0.45, 'bandpass', 500, 2800, 1);
        break;
      case 'hit':
        this.osc('sine', 180, t, 0.16, 0.6, 60);
        this.noise(t, 0.06, 0.4, 'highpass', 2500);
        break;
      case 'hitBig':
        this.osc('sine', 140, t, 0.3, 0.8, 45);
        this.osc('square', 90, t, 0.12, 0.15, 40);
        this.noise(t, 0.12, 0.5, 'lowpass', 3000, 400);
        break;
      case 'shotBig': // bacamarte: estampido grave com estalo
        this.noise(t, 0.35, 0.7, 'lowpass', 2400, 180);
        this.osc('sine', 110, t, 0.25, 0.7, 40);
        this.noise(t, 0.05, 0.5, 'highpass', 3000);
        break;
      case 'shot': // pistola
        this.noise(t, 0.16, 0.5, 'bandpass', 2600, 500, 0.9);
        this.osc('sine', 200, t, 0.1, 0.35, 70);
        break;
      case 'throw': // peixeira cortando o ar
        this.noise(t, 0.22, 0.35, 'bandpass', 1800, 5200, 2);
        break;
      case 'smoke': // bomba de fumaça do Maloka: estalo abafado e chiado longo da nuvem
        this.osc('sine', 120, t, 0.18, 0.45, 45);
        this.noise(t, 0.06, 0.4, 'highpass', 2500);
        this.noise(t, 1.1, 0.3, 'lowpass', 1400, 300, 0.7);
        break;
      case 'glass': // frasco de veneno estourando
        this.noise(t, 0.12, 0.35, 'highpass', 4500);
        this.osc('triangle', 2400, t, 0.08, 0.12, 3200);
        this.noise(t + 0.03, 0.35, 0.18, 'bandpass', 900, 400, 1.5);
        break;
      case 'hurt':
        this.osc('sawtooth', 160, t, 0.25, 0.25, 70);
        this.noise(t, 0.15, 0.4, 'lowpass', 1200, 200);
        break;
      case 'block':
        this.osc('triangle', 520, t, 0.15, 0.3, 300);
        break;
      case 'dodge':
        this.noise(t, 0.25, 0.3, 'bandpass', 400, 1600, 0.8);
        break;
      case 'jump':
        this.osc('sine', 300, t, 0.12, 0.15, 520);
        break;
      case 'deny':
        this.osc('square', 180, t, 0.08, 0.12);
        this.osc('square', 140, t + 0.09, 0.1, 0.12);
        break;
      case 'warn': // tom crescente com a duração do aviso
        this.osc('triangle', 220, t, arg || 1, 0.18, 440);
        this.osc('sine', 110, t, arg || 1, 0.12, 220);
        break;
      case 'impact':
        this.osc('sine', 90, t, 0.4, 0.8, 35);
        this.noise(t, 0.35, 0.5, 'lowpass', 1600, 150);
        break;
      case 'cast':
        this.osc('sawtooth', 70, t, arg || 3, 0.12, 140);
        this.osc('sine', 300, t, arg || 3, 0.08, 620);
        break;
      case 'pulse':
        this.osc('sine', 60, t, 0.8, 0.9, 30);
        this.noise(t, 0.6, 0.5, 'lowpass', 900, 100);
        this.osc('triangle', 880, t, 0.5, 0.1, 220);
        break;
      case 'interrupt':
        [1318, 1760, 2093].forEach((f, i) => this.osc('triangle', f, t + i * 0.04, 0.4, 0.25));
        this.noise(t, 0.2, 0.4, 'highpass', 4000);
        break;
      case 'shatter':
        for (let i = 0; i < 6; i++) this.osc('triangle', 1200 + Math.random() * 1600, t + i * 0.025, 0.25, 0.12);
        this.noise(t, 0.3, 0.3, 'highpass', 3000);
        break;
      case 'chime':
        [523, 659, 784, 1046].forEach((f, i) => this.osc('sine', f, t + i * 0.09, 0.9, 0.2));
        break;
      case 'restore':
        [392, 523, 659, 784, 1046, 1318].forEach((f, i) => {
          this.osc('sine', f, t + i * 0.12, 1.6, 0.18);
          this.osc('triangle', f * 2, t + i * 0.12, 0.6, 0.05);
        });
        break;
      case 'roar': // rugido do Curupira na cinemática de encontro
        this.noise(t, 1.7, 0.5, 'lowpass', 900, 160, 1.2);
        this.osc('sawtooth', 110, t, 1.5, 0.16, 52);
        this.osc('sawtooth', 83, t + 0.06, 1.6, 0.14, 40);
        this.osc('sine', 55, t, 1.8, 0.3, 38);
        break;
      case 'horn': // berrante do Vaqueiro: toque longo de chifre, subindo no fim
        this.osc('sawtooth', 147, t, 1.1, 0.14, 165);
        this.osc('triangle', 294, t, 1.1, 0.1, 330);
        this.osc('sine', 73, t, 1.2, 0.22, 82);
        this.noise(t, 0.2, 0.12, 'bandpass', 600, 900, 2);
        break;
      case 'rise': // morto-vivo rompendo a terra da cova
        this.noise(t, 0.9, 0.45, 'lowpass', 700, 120, 0.8);
        this.osc('sawtooth', 70, t + 0.2, 0.8, 0.12, 95);
        this.osc('triangle', 260, t + 0.35, 0.6, 0.06, 180);
        break;
      case 'collapse': // ossada desabando
        for (let i = 0; i < 7; i++) this.noise(t + i * 0.05 + Math.random() * 0.03, 0.05, 0.3, 'bandpass', 900 + Math.random() * 1500, null, 3);
        this.osc('sine', 120, t, 0.25, 0.3, 50);
        break;
      // Porto de Santos (doc 25)
      case 'splash': // corpo caindo na água
        this.noise(t, 0.6, 0.5, 'lowpass', 2400, 300, 0.8);
        this.noise(t + 0.05, 0.35, 0.25, 'bandpass', 3200, 1200, 1.5);
        this.osc('sine', 140, t, 0.3, 0.2, 60);
        break;
      case 'wave': // a ressaca quebrando no deque
        this.noise(t, 1.6, 0.6, 'lowpass', 400, 2600, 0.6);
        this.noise(t + 0.4, 1.4, 0.4, 'highpass', 1800, 600, 0.7);
        this.osc('sine', 55, t, 1.2, 0.25, 40);
        break;
      case 'tide': // a maré subindo pela borda
        this.noise(t, 2.2, 0.35, 'lowpass', 300, 1200, 0.8);
        break;
      case 'song': { // Canto da Iara: voz em glissando, duas notas, com eco
        const d = arg || 3.6;
        [440, 523, 494, 587].forEach((f, i) => {
          this.osc('sine', f, t + (i * d) / 4, d / 4 + 0.3, 0.07, f * 1.02);
          this.osc('triangle', f / 2, t + (i * d) / 4 + 0.1, d / 4, 0.03);
        });
        break;
      }
      case 'jet': // jato d'água
        this.noise(t, 0.5, 0.45, 'bandpass', 900, 3000, 1.2);
        break;
      case 'bite': // mordida do Ipupiara
        this.noise(t, 0.08, 0.5, 'bandpass', 1400, null, 2);
        this.osc('square', 180, t, 0.12, 0.12, 90);
        break;
      case 'gate':
        this.noise(t, 1.4, 0.35, 'lowpass', 1800, 200, 0.7);
        this.osc('sine', 80, t, 1.2, 0.3, 50);
        break;
      case 'defeat':
        [392, 330, 262, 196].forEach((f, i) => this.osc('triangle', f, t + i * 0.22, 0.5, 0.2));
        break;
      default:
        break;
    }
  }

  startAmbient() {
    // Vento suave e folhagem
    const s = this.ctx.createBufferSource();
    s.buffer = this.noiseBuf;
    s.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 500;
    const g = this.ctx.createGain();
    g.gain.value = 0.35;
    s.connect(f).connect(g).connect(this.ambBus);
    s.start();
    this.birdTimer = 2;
  }

  // Pássaros esporádicos; silenciam em áreas corrompidas. À noite (Sertão): grilos e, de vez em quando, o
  // grito rasgado da coruja; com a cor de volta, os grilos ficam mais fortes.
  updateAmbient(dt, life) {
    if (!this.ctx) return;
    if (this.ambientKind === 'night') return this.nightAmbient(dt, life);
    if (this.ambientKind === 'sea') return this.seaAmbient(dt, life);
    this.birdTimer -= dt;
    if (this.birdTimer <= 0) {
      this.birdTimer = 1.5 + Math.random() * 4 * (1.5 - life);
      if (Math.random() < 0.25 + life * 0.75) {
        const t = this.now();
        const base = 1800 + Math.random() * 1600;
        const n = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < n; i++) this.osc('sine', base, t + i * 0.11, 0.08, 0.1 * (0.4 + life), base * (1.2 + Math.random() * 0.3), this.ambBus);
      }
    }
  }

  // Porto (doc 25): ondas quebrando em ciclos e, com a cor de volta, gaivotas; na ressaca o vento assobia.
  seaAmbient(dt, life) {
    this.birdTimer -= dt;
    if (this.birdTimer > 0) return;
    this.birdTimer = 2.2 + Math.random() * 2.5;
    const t = this.now();
    this.noise(t, 2.4, 0.18, 'lowpass', 350, 1400, 0.6, this.ambBus);
    if (life < 0.5 && Math.random() < 0.4) this.osc('sine', 700 + Math.random() * 300, t + 0.5, 1.6, 0.012, 900, this.ambBus);
    if (Math.random() < 0.15 + life * 0.6) {
      const f = 1500 + Math.random() * 500;
      for (let i = 0; i < 2 + Math.floor(Math.random() * 2); i++) this.osc('sawtooth', f, t + 0.8 + i * 0.18, 0.14, 0.02 * (0.4 + life), f * 0.75, this.ambBus);
    }
  }

  nightAmbient(dt, life) {
    this.birdTimer -= dt;
    if (this.birdTimer > 0) return;
    this.birdTimer = 0.6 + Math.random() * 1.2;
    const t = this.now();
    const f = 3900 + Math.random() * 500;
    const n = 3 + Math.floor(Math.random() * 4);
    for (let i = 0; i < n; i++) this.osc('sine', f, t + i * 0.055, 0.035, 0.035 * (0.4 + life), null, this.ambBus);
    if (Math.random() < 0.06 * (1.2 - life)) {
      this.noise(t + 0.3, 0.7, 0.12, 'bandpass', 2600, 1800, 4, this.ambBus);
      this.osc('sawtooth', 1300, t + 0.3, 0.6, 0.015, 900, this.ambBus);
    }
  }

  setMusic(mode) {
    this.musicMode = mode;
  }

  // Berimbau (dom/dim), caxixi e, no combate do chefe, atabaque
  updateMusic() {
    if (!this.ctx || this.musicMode === 'off') return;
    const fight = this.musicMode === 'boss';
    // Sertão à noite: mais lento e um tom abaixo, em menor no toque de vitória
    const night = this.ambientKind === 'night';
    const bpm = fight ? 128 : night ? 76 : 92;
    const k = night ? 0.89 : 1;
    const step = 60 / bpm / 2;
    while (this.nextBeat < this.ctx.currentTime + 0.15) {
      const t = this.nextBeat;
      const b = this.beat % 8;
      const bus = this.musicBus;
      if (b === 0 || b === 1 || b === 4 || b === 5) this.noise(t, 0.05, 0.18, 'highpass', 6000, null, 1, bus);
      if (b === 2) this.berimbau(t, 98 * k, fight);
      if (b === 3) this.berimbau(t, 110 * k, fight);
      if (b === 6) this.berimbau(t, 98 * k, fight, true);
      if (fight) {
        if (b === 0 || b === 3 || b === 6) this.drum(t, b === 0 ? 1 : 0.6);
        if (b === 7) this.drum(t, 0.4, 220);
      }
      if (this.musicMode === 'victory' && b % 2 === 0) {
        const notes = night ? [440, 523, 587, 659, 784] : [523, 587, 659, 784, 880];
        this.osc('triangle', notes[Math.floor(Math.random() * notes.length)], t, 0.4, 0.08, null, bus);
      }
      this.beat++;
      this.nextBeat += step;
    }
  }

  berimbau(t, f, loud, buzz = false) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const flt = this.ctx.createBiquadFilter();
    flt.type = 'bandpass';
    flt.frequency.setValueAtTime(f * 6, t);
    flt.frequency.exponentialRampToValueAtTime(f * 3, t + 0.4);
    flt.Q.value = 3;
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(f * (buzz ? 1.06 : 1), t);
    o.frequency.exponentialRampToValueAtTime(f * (buzz ? 1.0 : 1.03), t + 0.25);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(loud ? 0.5 : 0.35, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (buzz ? 0.25 : 0.5));
    o.connect(flt).connect(g).connect(this.musicBus);
    o.start(t);
    o.stop(t + 0.6);
  }

  drum(t, v, f = 90) {
    this.osc('sine', f * 1.6, t, 0.25, 0.5 * v, f * 0.6, this.musicBus);
    this.noise(t, 0.05, 0.15 * v, 'lowpass', 1500, null, 1, this.musicBus);
  }
}
