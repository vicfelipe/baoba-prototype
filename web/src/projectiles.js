import * as THREE from 'three';

// Projéteis do Cangaceiro (bala de bacamarte, balas de pistola, peixeira arremessada) e o frasco de veneno
// do Maloka: saem da boca da arma (ou da mão), voam em linha reta na altura do disparo e acertam o
// primeiro inimigo cruzado pelo caminho (círculo do inimigo + raio do projétil), param em obstáculos e
// somem no fim do alcance. onHit(inimigo, posição) roda depois do dano (veneno do frasco).
const geo = {
  ball: new THREE.SphereGeometry(1, 8, 6),
  trail: new THREE.CylinderGeometry(0.35, 1, 1, 6, 1, true).rotateX(Math.PI / 2),
  blade: new THREE.BoxGeometry(0.035, 0.012, 0.3),
  flask: new THREE.SphereGeometry(0.065, 10, 8),
  cork: new THREE.CylinderGeometry(0.022, 0.026, 0.06, 8).translate(0, 0.08, 0),
};
const mat = {
  ball: new THREE.MeshBasicMaterial({ color: '#fff3c4' }),
  trail: new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0.55, depthWrite: false }),
  blade: new THREE.MeshBasicMaterial({ color: '#dfe4e8' }),
  flask: new THREE.MeshBasicMaterial({ color: '#4cff3a' }),
  cork: new THREE.MeshBasicMaterial({ color: '#8a5a32' }),
};

export class Projectiles {
  constructor(G) {
    this.G = G;
    this.list = [];
    this.seq = 1e6;   // ids de golpe próprios: cada projétil acerta uma vez (takeHit ignora id repetido)
  }

  // { from, dir, speed, range, dmg, kind: 'bullet'|'knife'|'flask', interrupts, heavy, size, onHit }
  fire(o) {
    const obj = new THREE.Group();
    if (o.kind === 'knife') obj.add(new THREE.Mesh(geo.blade, mat.blade));
    else if (o.kind === 'flask') {
      const spin = new THREE.Group();
      spin.add(new THREE.Mesh(geo.flask, mat.flask), new THREE.Mesh(geo.cork, mat.cork));
      obj.add(spin);
    } else {
      const s = o.size ?? 0.05;
      const ball = new THREE.Mesh(geo.ball, mat.ball); ball.scale.setScalar(s);
      const tr = new THREE.Mesh(geo.trail, mat.trail); tr.scale.set(s, s, s * 14); tr.position.z = -s * 7;
      obj.add(ball, tr);
    }
    const dir = o.dir.clone().setY(0).normalize();
    obj.position.copy(o.from);
    obj.lookAt(o.from.clone().add(dir));
    this.G.scene.add(obj);
    this.list.push({ ...o, dir, obj, travelled: 0, id: ++this.seq, spin: 0 });
  }

  update(dt) {
    const G = this.G;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      const step = Math.min(p.speed * dt, p.range - p.travelled);
      const a = p.obj.position.clone(), b = a.clone().addScaledVector(p.dir, step);
      let hit = null, best = Infinity;
      for (const e of G.enemies()) {
        if (!e.alive || !e.targetable) continue;
        // distância do centro do inimigo ao segmento a→b, no chão
        const ex = e.pos.x - a.x, ez = e.pos.z - a.z;
        const t = Math.max(0, Math.min(step, ex * p.dir.x + ez * p.dir.z));
        const d = Math.hypot(ex - p.dir.x * t, ez - p.dir.z * t);
        if (d <= e.radius + 0.12 && t < best) { best = t; hit = e; }
      }
      if (hit) {
        hit.takeHit(p.dmg, { interrupts: !!p.interrupts, from: p.from, heavy: !!p.heavy, actionId: p.id });
        G.audio.play(p.heavy ? 'hitBig' : 'hit');
        p.onHit?.(hit, p.obj.position.clone());
        this.remove(i);
        continue;
      }
      p.obj.position.copy(b);
      p.travelled += step;
      if (p.kind === 'knife') { p.spin += dt * 26; p.obj.children[0].rotation.x = p.spin; }
      if (p.kind === 'flask') { p.spin += dt * 14; p.obj.children[0].rotation.x = p.spin; }
      if (!G.world.walkable(b.x, b.z) || p.travelled >= p.range - 1e-4) {
        G.fx.burst('dust', b.clone().setY(Math.max(0.1, b.y)), { n: 4 });
        this.remove(i);
      }
    }
  }

  remove(i) {
    this.G.scene.remove(this.list[i].obj);
    this.list.splice(i, 1);
  }

  clear() {
    for (let i = this.list.length - 1; i >= 0; i--) this.remove(i);
  }
}
