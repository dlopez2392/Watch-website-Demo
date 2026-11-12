import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { createStudioEnvironment } from './studioEnv';
import { KNEE, setDirectOutput, setInkDpr } from './materials';

export interface Tier {
  /** 'high' renders through a float target with depth of field; 'low' renders straight to the canvas */
  level: 'high' | 'low';
  dpr: number;
  shadow: number;
  detail: number;
  texture: number;
}

export function pickTier(width: number, height: number): Tier {
  const dprDevice = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  // ?tier=high or ?tier=low forces a path, for testing
  const forced = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('tier') : null;
  const coarse = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
  const small = Math.min(width, height) < 700 || width < 900;
  const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4;
  if (forced !== 'high' && (forced === 'low' || coarse || small || cores <= 4)) {
    return { level: 'low', dpr: Math.min(dprDevice, 1.5, Math.sqrt(1.5e6 / (width * height))), shadow: 1024, detail: 0, texture: 1024 };
  }
  return { level: 'high', dpr: Math.min(dprDevice, 2, Math.sqrt(3.4e6 / (width * height))), shadow: 2048, detail: 1, texture: 2048 };
}

let tonePatched = false;
export function patchToneMapping() {
  if (tonePatched) return;
  tonePatched = true;
  THREE.ShaderChunk.tonemapping_pars_fragment = THREE.ShaderChunk.tonemapping_pars_fragment.replace(
    'vec3 CustomToneMapping( vec3 color ) { return color; }',
    `${KNEE}\nvec3 CustomToneMapping( vec3 color ) { return softKnee( color * toneMappingExposure ); }`,
  );
}

export interface FocusRef {
  distance: number;
  /** blur radius in CSS pixels at one focus-distance away from the focal plane */
  strength: number;
}

const POST_VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const POST_FRAG = /* glsl */ `
precision highp float;
#include <packing>
varying vec2 vUv;
uniform sampler2D tColor;
uniform sampler2D tDepth;
uniform vec2 uTexel;
uniform float uNear;
uniform float uFar;
uniform float uFocus;
uniform float uStrength;
uniform float uMaxBlur;
${KNEE}
float viewDist(vec2 uv) {
  float d = texture2D(tDepth, uv).x;
  return -perspectiveDepthToViewZ(d, uNear, uFar);
}
float cocAt(float dist) {
  return clamp(abs(dist - uFocus) / uFocus * uStrength, 0.0, uMaxBlur);
}
void main() {
  float centreDist = viewDist(vUv);
  float centreCoc = cocAt(centreDist);
  vec4 acc = texture2D(tColor, vUv);
  float total = 1.0;
  if (uMaxBlur > 0.5) {
    float radius = 0.9;
    float ang = 0.0;
    for (int i = 0; i < 44; i++) {
      if (radius > uMaxBlur) break;
      ang += 2.39996323;
      vec2 uv = vUv + vec2(cos(ang), sin(ang)) * uTexel * radius;
      float sd = viewDist(uv);
      float sc = cocAt(sd);
      if (sd > centreDist) sc = clamp(sc, 0.0, centreCoc * 2.0);
      float m = smoothstep(radius - 0.5, radius + 0.5, sc);
      acc += mix(acc / total, texture2D(tColor, uv), m);
      total += 1.0;
      radius += 0.9 / radius;
    }
  }
  vec4 c = acc / total;
  float a = clamp(c.a, 0.0, 1.0);
  vec3 rgb = a > 0.0001 ? c.rgb / max(c.a, 0.0001) : vec3(0.0);
  rgb = softKnee(max(rgb, 0.0));
  rgb = mix(rgb * 12.92, 1.055 * pow(rgb, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, rgb));
  gl_FragColor = vec4(rgb * a, a);
}`;

/** Takes over rendering: scene to a multisampled float target, then one pass for depth of field and tone. */
export function Pipeline({ tier, focus }: { tier: Tier; focus: React.MutableRefObject<FocusRef> }) {
  const { gl, size, scene, camera } = useThree();
  // the float target needs these; without them fall back to drawing straight to the canvas
  const floatOk = gl.capabilities.isWebGL2 && (gl.extensions.has('EXT_color_buffer_float') || gl.extensions.has('EXT_color_buffer_half_float'));
  const high = tier.level === 'high' && floatOk;

  const post = useMemo(() => {
    if (!high) return null;
    const target = new THREE.WebGLRenderTarget(4, 4, {
      type: THREE.HalfFloatType,
      samples: 4,
      depthBuffer: true,
      depthTexture: new THREE.DepthTexture(4, 4),
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      generateMipmaps: false,
    });
    const material = new THREE.ShaderMaterial({
      vertexShader: POST_VERT,
      fragmentShader: POST_FRAG,
      uniforms: {
        tColor: { value: target.texture },
        tDepth: { value: target.depthTexture },
        uTexel: { value: new THREE.Vector2() },
        uNear: { value: 1 },
        uFar: { value: 1000 },
        uFocus: { value: 260 },
        uStrength: { value: 0 },
        uMaxBlur: { value: 0 },
      },
      depthTest: false,
      depthWrite: false,
      blending: THREE.NoBlending,
      toneMapped: false,
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    quad.frustumCulled = false;
    const postScene = new THREE.Scene();
    postScene.add(quad);
    const postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    return { target, material, quad, postScene, postCamera };
  }, [high]);

  useEffect(() => {
    gl.setClearColor(0x000000, 0);
    setInkDpr(tier.dpr);
    setDirectOutput(!high);
    if (!high) {
      patchToneMapping();
      gl.toneMapping = THREE.CustomToneMapping;
      gl.toneMappingExposure = 1;
    }
    return () => {
      post?.target.dispose();
      post?.material.dispose();
      post?.quad.geometry.dispose();
    };
  }, [gl, high, post, tier.dpr]);

  useEffect(() => {
    if (!post) return;
    const w = Math.max(2, Math.round(size.width * tier.dpr));
    const h = Math.max(2, Math.round(size.height * tier.dpr));
    post.target.setSize(w, h);
    post.material.uniforms.uTexel.value.set(1 / w, 1 / h);
  }, [post, size.width, size.height, tier.dpr]);

  useFrame(() => {
    if (!post) {
      // R3F puts its own filmic curve back whenever the canvas is reconfigured; ours must win at draw time
      if (gl.toneMapping !== THREE.CustomToneMapping) gl.toneMapping = THREE.CustomToneMapping;
      gl.render(scene, camera);
      return;
    }
    const cam = camera as THREE.PerspectiveCamera;
    const u = post.material.uniforms;
    u.uNear.value = cam.near;
    u.uFar.value = cam.far;
    u.uFocus.value = focus.current.distance;
    u.uStrength.value = focus.current.strength * tier.dpr;
    u.uMaxBlur.value = focus.current.strength > 0.01 ? 7 * tier.dpr : 0;
    gl.setRenderTarget(post.target);
    gl.clear();
    gl.render(scene, camera);
    gl.setRenderTarget(null);
    gl.render(post.postScene, post.postCamera);
  }, 1);

  return null;
}

/** Installs the painted studio as the scene's environment. Nothing is downloaded. */
export function StudioEnv({ dark = false, resolution = 512, intensity = 1 }: { dark?: boolean; resolution?: number; intensity?: number }) {
  const { gl, scene } = useThree();
  useEffect(() => {
    const target = createStudioEnvironment(gl, dark, resolution);
    scene.environment = target.texture;
    scene.environmentIntensity = intensity;
    return () => {
      scene.environment = null;
      target.dispose();
    };
  }, [gl, scene, dark, resolution, intensity]);
  return null;
}

/**
 * The key. `extent` is the half-width of the area its shadow map covers: the tighter it is drawn
 * round the watch, the finer the shadows, down to the one a hand throws on the dial.
 */
export function KeyLight({
  tier,
  intensity = 1.0,
  extent = 170,
  at = [0, 0, 0],
  dir = [-52, 78, 340],
  light,
}: {
  tier: Tier;
  intensity?: number;
  extent?: number;
  at?: [number, number, number];
  /** towards the light; the hero keeps it near the eye so shadows fall straight back onto the page */
  dir?: [number, number, number];
  light?: React.MutableRefObject<THREE.DirectionalLight | null>;
}) {
  const ref = useRef<THREE.DirectionalLight>(null);
  useEffect(() => {
    const l = ref.current;
    if (!l) return;
    if (light) light.current = l;
    const k = 352 / Math.hypot(dir[0], dir[1], dir[2]);
    l.position.set(at[0] + dir[0] * k, at[1] + dir[1] * k, at[2] + dir[2] * k);
    l.target.position.set(at[0], at[1], at[2]);
    l.target.updateMatrixWorld();
    const c = l.shadow.camera;
    c.left = -extent;
    c.right = extent;
    c.top = extent * 0.77;
    c.bottom = -extent * 0.77;
    // a short range keeps the depth precise enough to separate a hand from the dial beneath it
    c.near = extent < 100 ? 200 : 60;
    c.far = extent < 100 ? 520 : 700;
    c.updateProjectionMatrix();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extent, at[0], at[1], at[2], dir[0], dir[1], dir[2], light]);
  return (
    <directionalLight
      ref={ref}
      intensity={intensity}
      color="#fff3e2"
      castShadow
      shadow-mapSize={[tier.shadow, tier.shadow]}
      shadow-radius={tier.level === 'high' ? 7 : 5}
      shadow-blurSamples={tier.level === 'high' ? 16 : 8}
      shadow-bias={extent < 100 ? -0.0004 : -0.0006}
    />
  );
}

/** The page itself is the DOM; this plane only receives the shadows that fall on it. */
export function ShadowCatcher({ opacity }: { opacity: React.MutableRefObject<number> }) {
  const mat = useRef<THREE.ShadowMaterial>(null);
  useFrame(() => {
    if (mat.current) mat.current.opacity = opacity.current;
  });
  return (
    <mesh position={[0, 0, 0]} receiveShadow raycast={() => null}>
      <planeGeometry args={[900, 700]} />
      <shadowMaterial ref={mat} color="#3a2414" transparent opacity={0.3} depthWrite={false} />
    </mesh>
  );
}
