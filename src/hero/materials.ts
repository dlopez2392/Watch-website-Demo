import * as THREE from 'three';
import { brushedTexture, leatherTexture, perlageTexture, stripesTexture } from './textures';

/**
 * The signature of the hero: every surface can be drawn in ink or rendered as metal,
 * and anything between. `ink` = 1 is a sepia drawing on toned paper: a tonal wash from
 * the material's own colour, cross-hatching in the shadows and a line at each silhouette.
 * `ink` = 0 is the physically based surface. Between the two, the metal arrives in
 * diagonal strokes, the way a wash is laid down.
 */

export interface InkUniform {
  value: number;
}

export const INK = {
  paper: new THREE.Color('#f3ead6'),
  wash: new THREE.Color('#8a6a48'),
  line: new THREE.Color('#4a3423'),
  sanguine: new THREE.Color('#a3402a'),
};

const shared = {
  uInkPaper: { value: INK.paper },
  uInkWash: { value: INK.wash },
  uInkLine: { value: INK.line },
  uInkLight: { value: new THREE.Vector3(-0.45, 0.62, 0.64).normalize() },
  uDpr: { value: 1 },
};

export const setInkDpr = (dpr: number) => {
  shared.uDpr.value = dpr;
};

const INK_PARS = /* glsl */ `
uniform float uInk;
uniform vec3 uInkPaper;
uniform vec3 uInkWash;
uniform vec3 uInkLine;
uniform vec3 uInkLight;
uniform float uDpr;
vec3 inkAlbedo;
float inkHash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float inkNoise(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(inkHash(i), inkHash(i + vec2(1.0, 0.0)), f.x), mix(inkHash(i + vec2(0.0, 1.0)), inkHash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float inkHatch(vec2 p, float period, float tone){
  float l = abs(fract(p.x / period) - 0.5) * 2.0;
  float w = clamp(tone, 0.0, 1.0) * 0.62;
  return 1.0 - smoothstep(w - 0.16, w + 0.16, l);
}
`;

const INK_BODY = /* glsl */ `
if (uInk > 0.001) {
  vec2 sp = gl_FragCoord.xy / uDpr;
  vec3 inkN = normalize(normal);
  vec3 inkV = normalize(vViewPosition);
  float ndv = abs(dot(inkN, inkV));
  float lum = dot(inkAlbedo, vec3(0.2126, 0.7152, 0.0722));
  float tone = smoothstep(0.2, 0.9, pow(max(lum, 0.0), 0.4545));
  vec3 inkCol = mix(mix(uInkWash, uInkPaper, 0.35), uInkPaper, tone);
  float shade = 1.0 - (dot(inkN, uInkLight) * 0.5 + 0.5);
  shade = smoothstep(0.34, 0.95, shade);
  vec2 hp = vec2(sp.x + sp.y, sp.x - sp.y) * 0.7071;
  float wob = (inkNoise(sp * 0.09) - 0.5) * 1.6;
  float h1 = inkHatch(hp + wob, 4.6, shade * 1.5);
  float h2 = inkHatch(hp.yx + wob, 5.2, (shade - 0.55) * 2.2);
  float hatch = max(h1 * step(0.02, shade), h2 * step(0.55, shade));
  float rim = 1.0 - smoothstep(0.0, 0.3, ndv);
  inkCol = mix(inkCol, uInkLine, clamp(hatch * 0.6 + rim * 0.8, 0.0, 0.9));
  // the metal arrives in diagonal strokes
  float stroke = inkNoise(vec2(hp.x * 0.01, hp.y * 0.07)) * 0.6 + inkNoise(sp * 0.02) * 0.4;
  float k = smoothstep(0.0, 1.0, uInk * 1.5 - 0.25 + (0.5 - stroke) * 0.5);
  gl_FragColor.rgb = mix(gl_FragColor.rgb, inkCol, k);
}
`;

export function applyInk<T extends THREE.Material>(material: T, ink: InkUniform): T {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uInk = ink;
    Object.assign(shader.uniforms, shared);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${INK_PARS}`)
      .replace('#include <map_fragment>', `#include <map_fragment>\ninkAlbedo = diffuseColor.rgb;`)
      .replace('#include <opaque_fragment>', `#include <opaque_fragment>\n${INK_BODY}`);
  };
  material.customProgramCacheKey = () => 'ink-v1';
  return material;
}

export type MatKey =
  | 'steelPolished'
  | 'steelBrushed'
  | 'steelFrosted'
  | 'steelSatin'
  | 'goldSatin'
  | 'goldPolished'
  | 'goldBrushed'
  | 'brass'
  | 'gilt'
  | 'plate'
  | 'bridge'
  | 'blued'
  | 'spring'
  | 'ruby'
  | 'chaton'
  | 'dark';

export interface MatLib {
  /** a material bound to one part's ink uniform */
  get(key: MatKey, ink: InkUniform): THREE.Material;
  custom<T extends THREE.Material>(m: T, ink: InkUniform): T;
  crystal(ink: InkUniform): THREE.Material;
  leather(map: THREE.Texture, ink: InkUniform): THREE.Material;
  dispose(): void;
}

export function createMaterials(): MatLib {
  const brushed = brushedTexture();
  brushed.repeat.set(3, 1);
  const brushedFine = brushed.clone();
  brushedFine.repeat.set(0.09, 0.09);
  brushedFine.needsUpdate = true;
  const perlage = perlageTexture();
  perlage.repeat.set(1, 1);
  const snail = brushed.clone();
  snail.repeat.set(6, 1);
  snail.needsUpdate = true;
  const stripes = stripesTexture();
  stripes.repeat.set(0.7, 0.7);
  stripes.rotation = 0.55;
  const grain = leatherTexture();
  grain.repeat.set(2, 4);

  const std = (p: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(p);
  const defs: Record<MatKey, () => THREE.Material> = {
    steelPolished: () => std({ color: '#d9dadd', metalness: 1, roughness: 0.08 }),
    steelBrushed: () =>
      std({ color: '#cfd0d3', metalness: 1, roughness: 0.36, roughnessMap: brushed, bumpMap: brushed, bumpScale: 0.35 }),
    steelFrosted: () => std({ color: '#c6c7ca', metalness: 1, roughness: 0.42 }),
    steelSatin: () => std({ color: '#d2d3d6', metalness: 1, roughness: 0.72 }),
    goldSatin: () => std({ color: '#dcb671', metalness: 1, roughness: 0.72 }),
    goldPolished: () => std({ color: '#e3bd78', metalness: 1, roughness: 0.09 }),
    goldBrushed: () =>
      std({ color: '#dcb671', metalness: 1, roughness: 0.34, roughnessMap: brushed, bumpMap: brushed, bumpScale: 0.35 }),
    brass: () => std({ color: '#d2a659', metalness: 1, roughness: 0.24, roughnessMap: brushedFine }),
    gilt: () => std({ color: '#dcb86c', metalness: 1, roughness: 0.16 }),
    plate: () =>
      std({ color: '#cfc7b6', metalness: 1, roughness: 0.44, roughnessMap: perlage, bumpMap: perlage, bumpScale: 0.2 }),
    bridge: () =>
      std({ color: '#d3ccbd', metalness: 1, roughness: 0.4, roughnessMap: stripes, bumpMap: stripes, bumpScale: 0.07 }),
    blued: () => std({ color: '#182b72', metalness: 0.92, roughness: 0.2 }),
    spring: () => std({ color: '#5b6f9c', metalness: 1, roughness: 0.24 }),
    ruby: () =>
      new THREE.MeshPhysicalMaterial({
        color: '#b0102f',
        metalness: 0,
        roughness: 0.06,
        clearcoat: 1,
        clearcoatRoughness: 0.04,
        emissive: '#3d000c',
        emissiveIntensity: 0.55,
        ior: 1.76,
      }),
    chaton: () => std({ color: '#e0b970', metalness: 1, roughness: 0.14 }),
    dark: () => std({ color: '#191715', metalness: 0.2, roughness: 0.7 }),
  };

  const all: THREE.Material[] = [];
  const track = <T extends THREE.Material>(m: T): T => {
    all.push(m);
    return m;
  };

  return {
    get(key, ink) {
      const m = defs[key]();
      m.polygonOffset = true;
      m.polygonOffsetFactor = 1;
      m.polygonOffsetUnits = 1;
      return track(applyInk(m, ink));
    },
    custom(m, ink) {
      m.polygonOffset = true;
      m.polygonOffsetFactor = 1;
      m.polygonOffsetUnits = 1;
      return track(applyInk(m, ink));
    },
    crystal(ink) {
      // Sapphire as it behaves: reflections add to what lies behind, which is only slightly dimmed.
      const m = new THREE.MeshPhysicalMaterial({
        color: '#000000',
        metalness: 0,
        roughness: 0.02,
        ior: 1.77,
        specularIntensity: 0.42,
        specularColor: new THREE.Color('#dfe6ff'),
        transparent: true,
        opacity: 0.05,
        depthWrite: false,
        side: THREE.FrontSide,
        blending: THREE.CustomBlending,
        blendSrc: THREE.OneFactor,
        blendDst: THREE.OneMinusSrcAlphaFactor,
        blendSrcAlpha: THREE.OneFactor,
        blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
      });
      m.onBeforeCompile = (shader) => {
        shader.uniforms.uInk = ink;
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', '#include <common>\nuniform float uInk;')
          .replace(
            '#include <opaque_fragment>',
            '#include <opaque_fragment>\ngl_FragColor *= (1.0 - smoothstep(0.0, 0.7, uInk));',
          );
      };
      m.customProgramCacheKey = () => 'crystal-v1';
      return track(m);
    },
    leather(map, ink) {
      const m = std({ color: '#ffffff', map, metalness: 0, roughness: 0.74, bumpMap: grain, bumpScale: 0.5, side: THREE.DoubleSide });
      return track(applyInk(m, ink));
    },
    dispose() {
      all.forEach((m) => m.dispose());
      [brushed, brushedFine, perlage, stripes, grain].forEach((t) => t.dispose());
    },
  };
}
