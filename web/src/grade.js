import * as THREE from 'three';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

// Gradação de cor de aventura, aplicada depois do OutputPass (valores já em sRGB): ombro suave para o
// bloom não estourar, contraste em S, sombras frias e luzes douradas, vinheta, granulação leve e
// aberração cromática só nas bordas. uDanger (luta contra o chefe) fecha a vinheta, aperta o contraste e
// puxa as sombras para o violeta do Silêncio; uDrain (pouca vida) escoa a cor da tela.
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uRes: { value: new THREE.Vector2(1, 1) },
    uTime: { value: 0 },
    uDanger: { value: 0 },
    uDrain: { value: 0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec2 uRes;
    uniform float uTime, uDanger, uDrain;
    varying vec2 vUv;
    const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec2 d = vUv - 0.5;
      float r = length(d * vec2(uRes.x / uRes.y, 1.0));
      vec2 ca = d * r * (0.0015 + 0.004 * uDanger);
      vec3 c = vec3(texture2D(tDiffuse, vUv + ca).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - ca).b);
      // ombro: acima de 0.85 comprime em direção a 1
      vec3 over = max(c - 0.85, 0.0);
      c = min(c, 0.85) + 0.15 * (1.0 - exp(-over / 0.15));
      float l = dot(c, LUMA);
      c = mix(vec3(l), c, 1.04 - 0.1 * uDanger - 0.6 * uDrain);
      c = mix(c, c * c * (3.0 - 2.0 * c), 0.3 + 0.2 * uDanger);
      l = dot(c, LUMA);
      vec3 shadowTint = mix(vec3(0.84, 0.96, 1.1), vec3(1.0, 0.84, 1.12), uDanger);
      vec3 lightTint = mix(vec3(1.04, 0.99, 0.93), vec3(1.08, 0.95, 0.86), uDanger);
      c *= mix(shadowTint, lightTint, smoothstep(0.12, 0.7, l));
      float vig = smoothstep(1.12 - 0.12 * uDanger, 0.3, r);
      c *= mix(0.5 - 0.12 * uDanger, 1.0, vig);
      c += (hash(vUv * uRes + fract(uTime * 7.13) * 91.7) - 0.5) * 0.028;
      gl_FragColor = vec4(c, 1.0);
    }`,
};

export function createGradePass() {
  const pass = new ShaderPass(GradeShader);
  pass.setSize = (w, h) => pass.uniforms.uRes.value.set(w, h);
  return pass;
}
