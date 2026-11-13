import * as THREE from 'three';
import { brushedTexture, leatherTexture, perlageTexture, stripesTexture, weaveTexture } from './textures';

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
  /** 1 when drawing straight to the canvas, where blending happens after colour encoding */
  uDirect: { value: 0 },
};

export const setInkDpr = (dpr: number) => {
  shared.uDpr.value = dpr;
};
export const setDirectOutput = (direct: boolean) => {
  shared.uDirect.value = direct ? 1 : 0;
};

/**
 * The tone curve, shared by every path to the screen: identity up to the knee, so ink and paper
 * arrive exactly as specified, then a long photographic shoulder so that a window reflected in
 * polished steel keeps its shape instead of burning out.
 */
export const KNEE = /* glsl */ `
vec3 softKnee(vec3 c) {
  const float k = 0.6;
  vec3 t = max(c - k, 0.0) / (1.0 - k);
  return min(c, vec3(k)) + (1.0 - k) * t / (1.0 + t);
}`;

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
// the tone curve run backwards, so a colour chosen for the page survives the trip to the screen
vec3 inkUnKnee(vec3 y){
  const float k = 0.6;
  vec3 u = clamp((y - k) / (1.0 - k), 0.0, 0.98);
  return min(y, vec3(k)) + (1.0 - k) * u / (1.0 - u);
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
  gl_FragColor.rgb = mix(gl_FragColor.rgb, inkUnKnee(inkCol), k);
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
  material.customProgramCacheKey = () => 'ink-v2';
  // anisotropic and coated metals need a little more of the pipeline, never less of the ink
  return material;
}

export type MatKey =
  | 'steelPolished'
  | 'steelBrushed'
  | 'steelCircular'
  | 'steelSunray'
  | 'steelFrosted'
  | 'steelSatin'
  | 'goldSatin'
  | 'goldPolished'
  | 'goldBrushed'
  | 'goldCircular'
  | 'brass'
  | 'brassPolished'
  | 'gilt'
  | 'plate'
  | 'bridge'
  | 'bridgeSide'
  | 'bridgeBevel'
  | 'blued'
  | 'bluedScrew'
  | 'spring'
  | 'ruby'
  | 'chaton'
  | 'dark';

export interface MatLib {
  /** a material bound to one part's ink uniform */
  get(key: MatKey, ink: InkUniform): THREE.Material;
  custom<T extends THREE.Material>(m: T, ink: InkUniform): T;
  crystal(ink: InkUniform): THREE.Material;
  leather(map: THREE.Texture, ink: InkUniform, cloth?: boolean): THREE.Material;
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
  // the same scratches wrapped round an axis: circular graining, and laid along the radius: a sunray
  const circular = brushed.clone();
  circular.repeat.set(4, 1);
  circular.needsUpdate = true;
  const sunray = brushed.clone();
  sunray.center.set(0.5, 0.5);
  sunray.rotation = Math.PI / 2;
  sunray.repeat.set(1, 6);
  sunray.needsUpdate = true;
  const stripes = stripesTexture();
  stripes.repeat.set(0.7, 0.7);
  stripes.rotation = 0.55;
  const grain = leatherTexture();
  const extra: THREE.Texture[] = [];
  grain.repeat.set(0.55, 1.1);

  const std = (p: THREE.MeshStandardMaterialParameters) => new THREE.MeshStandardMaterial(p);
  const phy = (p: THREE.MeshPhysicalMaterialParameters) => new THREE.MeshPhysicalMaterial(p);
  // Brushing is a field of fine grooves: the highlight smears across them. `anisotropy` does that;
  // the scratch map only breaks the smear up, so the grain is seen and not just implied.
  // The grooves run along u, so the smear runs along v; a sunray is the same map turned a quarter.
  const brushedMetal = (color: string, map: THREE.Texture, roughness = 0.34, anisotropy = 0.72, across = Math.PI / 2) =>
    phy({ color, metalness: 1, roughness, roughnessMap: map, bumpMap: map, bumpScale: 0.3, anisotropy, anisotropyRotation: across });
  // Faces turned on a lathe keep the scratch map but not the smear: on a flat disc the renderer's
  // approximation folds the reflection back on the camera and the grain is lost in white.
  const turnedMetal = (color: string, map: THREE.Texture, roughness: number) =>
    std({ color, metalness: 1, roughness, roughnessMap: map, bumpMap: map, bumpScale: 0.45 });
  const defs: Record<MatKey, () => THREE.Material> = {
    steelPolished: () => std({ color: '#e4e5e8', metalness: 1, roughness: 0.045 }),
    steelBrushed: () => brushedMetal('#cfd0d4', brushed),
    steelCircular: () => turnedMetal('#d2d3d7', circular, 0.3),
    steelSunray: () => turnedMetal('#d9dadd', sunray, 0.3),
    steelFrosted: () => std({ color: '#c6c7ca', metalness: 1, roughness: 0.42 }),
    steelSatin: () => std({ color: '#d2d3d6', metalness: 1, roughness: 0.72 }),
    goldSatin: () => std({ color: '#dcb671', metalness: 1, roughness: 0.72 }),
    goldPolished: () => std({ color: '#e6c07a', metalness: 1, roughness: 0.06 }),
    goldBrushed: () => brushedMetal('#dcb671', brushed),
    goldCircular: () => turnedMetal('#dfba75', circular, 0.3),
    brass: () => turnedMetal('#dcae62', circular, 0.24),
    brassPolished: () => std({ color: '#e8bf74', metalness: 1, roughness: 0.07 }),
    gilt: () => std({ color: '#dcb86c', metalness: 1, roughness: 0.16 }),
    plate: () =>
      std({ color: '#dcbb76', metalness: 1, roughness: 0.4, roughnessMap: perlage, bumpMap: perlage, bumpScale: 0.3 }),
    bridge: () =>
      std({ color: '#ecd08c', metalness: 1, roughness: 0.36, roughnessMap: stripes, bumpMap: stripes, bumpScale: 0.24 }),
    bridgeSide: () => std({ color: '#d6b46c', metalness: 1, roughness: 0.46 }),
    bridgeBevel: () => std({ color: '#f1d596', metalness: 1, roughness: 0.05 }),
    blued: () => phy({ color: '#0d1f6b', metalness: 1, roughness: 0.14, clearcoat: 0.22, clearcoatRoughness: 0.06 }),
    bluedScrew: () => phy({ color: '#14308f', metalness: 1, roughness: 0.12, clearcoat: 0.3, clearcoatRoughness: 0.05 }),
    spring: () => std({ color: '#5b6f9c', metalness: 1, roughness: 0.24 }),
    ruby: () =>
      phy({
        color: '#b00f3c',
        metalness: 0,
        roughness: 0.05,
        clearcoat: 1,
        clearcoatRoughness: 0.03,
        emissive: '#4a0016',
        emissiveIntensity: 0.6,
        ior: 1.76,
      }),
    chaton: () => std({ color: '#ecc880', metalness: 1, roughness: 0.1 }),
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
        shader.uniforms.uDirect = shared.uDirect;
        // A reflection is light added to what lies behind. Added after colour encoding it is far too strong,
        // so on the direct path the crystal hands over un-encoded values.
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', '#include <common>\nuniform float uInk;\nuniform float uDirect;')
          .replace(
            '#include <opaque_fragment>',
            '#include <opaque_fragment>\ngl_FragColor *= (1.0 - smoothstep(0.0, 0.7, uInk));',
          )
          .replace(
            '#include <colorspace_fragment>',
            '#include <colorspace_fragment>\nif (uDirect > 0.5) gl_FragColor.rgb = pow(max(gl_FragColor.rgb, vec3(0.0)), vec3(2.2)) * 0.62;',
          );
      };
      m.customProgramCacheKey = () => 'crystal-v2';
      return track(m);
    },
    leather(map, ink, cloth = false) {
      if (cloth) {
        // sailcloth: matte, the weave in the bump, a cool sheen off the fibres
        const weave = weaveTexture();
        weave.repeat.set(2.5, 2.5);
        extra.push(weave);
        const m = phy({ color: '#ffffff', map, metalness: 0, roughness: 0.88, roughnessMap: weave, bumpMap: weave, bumpScale: 1.4, side: THREE.DoubleSide, sheen: 0.55, sheenRoughness: 0.75, sheenColor: new THREE.Color('#9fb0d6') });
        m.userData.matte = true;
        return track(applyInk(m, ink));
      }
      const m = phy({ color: '#ffffff', map, metalness: 0, roughness: 0.62, bumpMap: grain, bumpScale: 1.6, side: THREE.DoubleSide, sheen: 0.35, sheenRoughness: 0.5, sheenColor: new THREE.Color('#ffd9b0') });
      m.userData.matte = true;
      return track(applyInk(m, ink));
    },
    dispose() {
      all.forEach((m) => m.dispose());
      [brushed, brushedFine, circular, sunray, perlage, stripes, grain, ...extra].forEach((t) => t.dispose());
    },
  };
}
