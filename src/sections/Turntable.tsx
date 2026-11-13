import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import type { WatchSpec } from '../lib/watches';
import { isStill } from '../lib/stillness';
import { buildWatch, type WatchModel } from '../hero/buildWatch';
import { CAMERA_FOV, CAMERA_Z } from '../hero/HeroScene';
import { KeyLight, Pipeline, StudioEnv, pickTier, type FocusRef } from '../hero/Stage';
import { fontsReady } from '../hero/textures';
import { aim, PITCH, type Turn } from '../lib/turn';

/**
 * The parametric watch on a turntable: drag or use the arrow keys to turn it, let go and it settles,
 * leave it and it turns a little in the light. Used by the collection (the head alone) and by the
 * configurator (the whole watch, rebuilt as the choices change). It stops drawing out of view.
 */

const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);

const secondsNow = () => {
  const d = new Date();
  return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds() + d.getMilliseconds() / 1000;
};

interface WatchProps {
  spec: WatchSpec;
  movement: boolean;
  strap: boolean;
  /** case diameter, as a share of the frame height, for a 39 mm watch */
  fit: number;
  /** a vertical offset of the watch, as a share of the frame height */
  lift: number;
  turn: React.MutableRefObject<Turn>;
  onReady(): void;
  onBuilt?(ms: number): void;
}

function Watch({ spec, movement, strap, fit, lift, turn, onReady, onBuilt }: WatchProps) {
  const { size, scene, gl, camera } = useThree();
  const tier = useMemo(() => pickTier(window.innerWidth, window.innerHeight), []);
  const [model, setModel] = useState<WatchModel | null>(null);
  const group = useRef<THREE.Group>(null);
  const focus = useRef<FocusRef>({ distance: CAMERA_Z - 52, strength: 0 });
  const shown = useRef({ yaw: turn.current.yaw, pitch: turn.current.pitch });
  const ready = useRef(false);

  // Build in the background and swap only when the new watch is ready, so a change never blanks the frame.
  useEffect(() => {
    let live = true;
    fontsReady().then(async () => {
      if (!live) return;
      const t0 = performance.now();
      const m = buildWatch(spec, { movement, detail: tier.detail, textureSize: tier.texture });
      if (!strap) for (const p of m.parts) if (p.id === 'strap' || p.id === 'buckle') p.group.visible = false;
      m.pose(() => 0, () => 0);
      if (gl.extensions.has('KHR_parallel_shader_compile')) await gl.compileAsync(m.root, camera, scene).catch(() => {});
      if (!live) return m.dispose();
      onBuilt?.(performance.now() - t0);
      setModel(m);
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spec, movement, strap, tier]);
  // the watch it replaces is let go once the new one is on the table
  useEffect(() => () => model?.dispose(), [model]);

  useFrame((state, dt) => {
    if (!model || !group.current) return;
    model.tick(secondsNow());
    model.ink(() => 0, tier.dpr, size.width * tier.dpr, size.height * tier.dpr);
    model.glass(0.62);
    if (scene.environment) model.matte(scene.environment, 0.5);
    const t = turn.current;
    const still = isStill();
    const idle = !still && performance.now() - t.touched > 2500;
    const drift = idle ? Math.sin(state.clock.elapsedTime * 0.35) * 0.28 : 0;
    const k = still ? 1 : 1 - Math.exp(-dt * 7);
    shown.current.yaw += (t.yaw + drift - shown.current.yaw) * k;
    shown.current.pitch += (t.pitch - shown.current.pitch) * k;
    // turned over, the closed strap would hide the back: it is set aside while the back faces the eye
    if (strap) {
      const facing = Math.cos(-0.3 + shown.current.yaw) * Math.cos(-0.42 + shown.current.pitch);
      const on = facing > 0.08 ? true : facing < -0.08 ? false : null;
      if (on !== null) for (const p of model.parts) if (p.id === 'strap' || p.id === 'buckle') p.group.visible = on;
    }
    const g = group.current;
    g.quaternion
      .setFromAxisAngle(Y, -0.3 + shown.current.yaw)
      .multiply(new THREE.Quaternion().setFromAxisAngle(X, -0.42 + shown.current.pitch));
    const Hw = 2 * CAMERA_Z * Math.tan((CAMERA_FOV * Math.PI) / 360);
    const z = 52;
    const persp = CAMERA_Z / (CAMERA_Z - z);
    // the camera fits the height of the frame; keep the case the same size in any canvas
    const f = (Hw * fit) / (39 * persp);
    const s = spec.diameter / 39;
    g.scale.set(f * s, f * s, f * (spec.thickness / 10.5));
    g.position.set(0, (Hw * lift) / persp, z);
    if (!ready.current) {
      ready.current = true;
      requestAnimationFrame(() => onReady());
    }
  });

  return (
    <>
      <Pipeline tier={tier} focus={focus} />
      <StudioEnv resolution={512} dark />
      <KeyLight tier={tier} extent={strap ? 70 : 44} at={[0, 0, 52]} dir={[0.56, 0.42, 0.72]} intensity={2.4} />
      <group ref={group}>{model && <primitive object={model.root} />}</group>
    </>
  );
}

export interface TurntableProps {
  spec: WatchSpec;
  label: string;
  turn: React.MutableRefObject<Turn>;
  movement?: boolean;
  strap?: boolean;
  fit?: number;
  lift?: number;
  className?: string;
  onEscape?(): void;
  onReady?(): void;
  children?: React.ReactNode;
}

export default function Turntable({ spec, label, turn, movement = false, strap = false, fit = 0.56, lift = 0, className = '', onEscape, onReady, children }: TurntableProps) {
  const box = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [ready, setReady] = useState(false);
  const tier = useMemo(() => pickTier(window.innerWidth, window.innerHeight), []);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // drag to turn: a full sweep of the frame is a little more than half a turn
  const drag = useRef<{ x: number; y: number; id: number } | null>(null);
  const down = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button, a, input, label')) return;
    drag.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    turn.current.touched = performance.now();
  };
  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    const el = box.current;
    if (!d || !el || d.id !== e.pointerId) return;
    const w = el.clientWidth;
    const t = turn.current;
    t.yaw += ((e.clientX - d.x) / w) * 3.6;
    t.pitch = Math.max(PITCH.min, Math.min(PITCH.max, t.pitch + ((e.clientY - d.y) / w) * 2.4));
    t.touched = performance.now();
    d.x = e.clientX;
    d.y = e.clientY;
  };
  const up = () => {
    drag.current = null;
  };
  const key = (e: React.KeyboardEvent) => {
    if (e.target !== e.currentTarget) return;
    const t = turn.current;
    const step = 0.26;
    if (e.key === 'ArrowLeft') t.yaw -= step;
    else if (e.key === 'ArrowRight') t.yaw += step;
    else if (e.key === 'ArrowUp') t.pitch = Math.max(PITCH.min, t.pitch - step);
    else if (e.key === 'ArrowDown') t.pitch = Math.min(PITCH.max, t.pitch + step);
    else if (e.key === 'Home') aim(t, 0);
    else if (e.key === 'End') aim(t, Math.PI);
    else if (e.key === 'Escape' && onEscape) return onEscape();
    else return;
    e.preventDefault();
    t.touched = performance.now();
  };

  return (
    <div
      className={`turntable ${className}`}
      ref={box}
      data-ready={ready}
      tabIndex={0}
      role="img"
      aria-roledescription="3D model"
      aria-label={`${label}. Drag, or use the arrow keys, to turn it; Home faces the dial, End shows the back${onEscape ? '; Escape returns to the photograph' : ''}.`}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onKeyDown={key}
    >
      <Canvas
        dpr={tier.dpr}
        frameloop={visible ? 'always' : 'never'}
        shadows="variance"
        gl={{ alpha: true, antialias: tier.level === 'low', powerPreference: 'high-performance', stencil: false }}
        camera={{ fov: CAMERA_FOV, position: [0, 0, CAMERA_Z], near: 70, far: 700 }}
        style={{ touchAction: 'pan-y' }}
        aria-hidden="true"
      >
        <Watch
          spec={spec}
          movement={movement}
          strap={strap}
          fit={fit}
          lift={lift}
          turn={turn}
          onReady={() => {
            setReady(true);
            onReady?.();
          }}
        />
      </Canvas>
      {children}
    </div>
  );
}
