import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, advance, useFrame, useThree } from '@react-three/fiber';
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/cormorant-garamond/600.css';
import '@fontsource/cormorant-garamond/500-italic.css';
import '@fontsource-variable/jost';
import { watchById, type WatchId } from '../lib/watches';
import { buildWatch, type WatchModel } from '../hero/buildWatch';
import HeroScene, { CAMERA_FOV, CAMERA_Z } from '../hero/HeroScene';
import { KeyLight, Pipeline, ShadowCatcher, StudioEnv, type FocusRef, type Tier } from '../hero/Stage';
import { fontsReady } from '../hero/textures';
import type { PartId } from '../hero/parts';

/**
 * The studio is how the site photographs itself. Product stills, the workshop film and the
 * reduced-motion illustration are all rendered from the same parametric watch as the hero:
 *   /?studio=still&watch=tirreno&view=front
 *   /?studio=hero&intro=1&scroll=0
 */

declare global {
  interface Window {
    __studio?: { ready: boolean; setTime(t: number): void };
  }
}

const TIER: Tier = { level: 'high', dpr: 1, shadow: 2048, detail: 1, texture: 2048 };
const TEN_EIGHT = 10 * 3600 + 8 * 60 + 36.5;
const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);
const clock = { t: 0 };


function Still({ id, view }: { id: WatchId; view: string }) {
  const spec = watchById(id);
  const { size } = useThree();
  const [model, setModel] = useState<WatchModel | null>(null);
  const group = useRef<THREE.Group>(null);
  const focus = useRef<FocusRef>({ distance: CAMERA_Z - 40, strength: 0 });
  const shadow = useRef(0.34);

  useEffect(() => {
    let m: WatchModel | null = null;
    fontsReady().then(() => {
      m = buildWatch(spec, { movement: id === 'codice', detail: 1, textureSize: 2048 });
      setModel(m);
    });
    return () => m?.dispose();
  }, [id, spec]);

  useFrame(() => {
    if (!model || !group.current) return;
    model.tick(TEN_EIGHT);
    model.pose(() => 0, () => 0);
    model.ink(() => 0, 1, size.width, size.height);
    model.glass(0.3);
    const g = group.current;
    const Hw = 2 * CAMERA_Z * Math.tan((CAMERA_FOV * Math.PI) / 360);
    const s = spec.diameter / 39;
    const back = view === 'back';
    const q = new THREE.Quaternion();
    if (back) {
      q.setFromAxisAngle(Y, Math.PI + 0.34).multiply(new THREE.Quaternion().setFromAxisAngle(X, 0.42));
    } else {
      q.setFromAxisAngle(Y, -0.36).multiply(new THREE.Quaternion().setFromAxisAngle(X, -0.5)).multiply(new THREE.Quaternion().setFromAxisAngle(Z, 0.05));
    }
    g.quaternion.copy(q);
    const z = 52;
    const persp = CAMERA_Z / (CAMERA_Z - z);
    const fit = (Hw * 0.5) / (39 * persp);
    g.scale.set(fit * s, fit * s, fit * (spec.thickness / 10.5));
    g.position.set(-Hw * 0.02, Hw * 0.06, z);
    focus.current.distance = CAMERA_Z - z - 6;
    focus.current.strength = 9;
    if (window.__studio) window.__studio.ready = true;
  });

  return (
    <>
      <Pipeline tier={TIER} focus={focus} />
      <StudioEnv resolution={1024} />
      <KeyLight tier={TIER} />
      <ShadowCatcher opacity={shadow} />
      <group ref={group}>{model && <primitive object={model.root} />}</group>
    </>
  );
}

export default function Studio() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const mode = params.get('studio') ?? 'still';
  const id = (params.get('watch') ?? 'codice') as WatchId;
  const view = params.get('view') ?? 'front';
  const bg = params.get('bg');

  useEffect(() => {
    document.documentElement.style.background = bg ? `#${bg}` : 'transparent';
    document.body.style.background = 'transparent';
    window.__studio = {
      ready: false,
      setTime(t: number) {
        clock.t = t;
        advance(performance.now());
      },
    };
    const raf = { id: 0 };
    // settle fonts, textures and the baked environment, then hold
    let n = 0;
    const loop = () => {
      advance(performance.now());
      if (++n < 24) raf.id = requestAnimationFrame(loop);
    };
    raf.id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.id);
  }, [bg]);

  const frozen = {
    intro: Number(params.get('intro') ?? 1),
    scroll: Number(params.get('scroll') ?? 0),
    time: TEN_EIGHT,
    spin: Number(params.get('spin') ?? 0.6),
    inkFloor: Number(params.get('ink') ?? 0),
    part: (params.get('part') as PartId | null) ?? undefined,
  };

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Canvas
        dpr={1}
        frameloop="never"
        shadows="variance"
        gl={{ alpha: true, antialias: false, preserveDrawingBuffer: true, stencil: false }}
        camera={{ fov: CAMERA_FOV, position: [0, 0, CAMERA_Z], near: 70, far: 700 }}
      >
        {mode === 'hero' ? <HeroScene tier={TIER} frozen={frozen} /> : <Still id={id} view={view} />}
      </Canvas>
    </div>
  );
}
