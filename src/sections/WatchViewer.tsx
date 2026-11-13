import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { watchById, type WatchId } from '../lib/watches';
import { prefersReducedMotion } from '../lib/env';
import { buildWatch, type WatchModel } from '../hero/buildWatch';
import { CAMERA_FOV, CAMERA_Z } from '../hero/HeroScene';
import { KeyLight, Pipeline, StudioEnv, pickTier, type FocusRef } from '../hero/Stage';
import { fontsReady } from '../hero/textures';

/**
 * The same parametric watch as the hero, in the hand: drag to turn it, let go and it settles.
 * Mounted only while open, and only one at a time; it stops drawing when scrolled out of view.
 */

const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
export interface Turn {
  yaw: number;
  pitch: number;
  /** last time the visitor touched it, for the idle drift */
  touched: number;
}

const secondsNow = () => {
  const d = new Date();
  return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds() + d.getMilliseconds() / 1000;
};

function Watch({ id, turn, onReady }: { id: WatchId; turn: React.MutableRefObject<Turn>; onReady(): void }) {
  const spec = watchById(id);
  const { size, scene, gl } = useThree();
  const tier = useMemo(() => pickTier(window.innerWidth, window.innerHeight), []);
  const [model, setModel] = useState<WatchModel | null>(null);
  const group = useRef<THREE.Group>(null);
  const focus = useRef<FocusRef>({ distance: CAMERA_Z - 52, strength: 0 });
  const shown = useRef({ yaw: 0, pitch: 0 });
  const still = useMemo(() => prefersReducedMotion(), []);
  const ready = useRef(false);

  useEffect(() => {
    let m: WatchModel | null = null;
    let live = true;
    fontsReady().then(() => {
      if (!live) return;
      m = buildWatch(spec, { movement: id === 'codice', detail: tier.detail, textureSize: tier.texture });
      // the head alone: a closed strap would hide the back, and the photograph already shows it on the wrist
      for (const p of m.parts) if (p.id === 'strap' || p.id === 'buckle') p.group.visible = false;
      m.pose(() => 0, () => 0);
      setModel(m);
    });
    return () => {
      live = false;
      m?.dispose();
    };
  }, [id, spec, tier]);

  useFrame((state, dt) => {
    if (!model || !group.current) return;
    model.tick(secondsNow());
    model.ink(() => 0, tier.dpr, size.width * tier.dpr, size.height * tier.dpr);
    model.glass(0.62);
    if (scene.environment) model.matte(scene.environment, 0.5);
    const t = turn.current;
    // left alone, it turns a little in the light, as a watch does on the wrist
    const idle = !still && performance.now() - t.touched > 2500;
    const drift = idle ? Math.sin(state.clock.elapsedTime * 0.35) * 0.28 : 0;
    const k = 1 - Math.exp(-dt * 7);
    shown.current.yaw += (t.yaw + drift - shown.current.yaw) * k;
    shown.current.pitch += (t.pitch - shown.current.pitch) * k;
    const q = new THREE.Quaternion()
      .setFromAxisAngle(Y, -0.3 + shown.current.yaw)
      .multiply(new THREE.Quaternion().setFromAxisAngle(X, -0.42 + shown.current.pitch));
    const g = group.current;
    g.quaternion.copy(q);
    const Hw = 2 * CAMERA_Z * Math.tan((CAMERA_FOV * Math.PI) / 360);
    const z = 52;
    const persp = CAMERA_Z / (CAMERA_Z - z);
    // the camera fits the height of the frame; keep the case the same size in any canvas
    const fit = (Hw * 0.56) / (39 * persp);
    const s = spec.diameter / 39;
    g.scale.set(fit * s, fit * s, fit * (spec.thickness / 10.5));
    g.position.set(0, 0, z);
    if (!ready.current) {
      ready.current = true;
      requestAnimationFrame(() => onReady());
    }
    void gl;
  });

  return (
    <>
      <Pipeline tier={tier} focus={focus} />
      <StudioEnv resolution={512} dark />
      <KeyLight tier={tier} extent={44} at={[0, 0, 52]} dir={[0.56, 0.42, 0.72]} intensity={2.4} />
      <group ref={group}>{model && <primitive object={model.root} />}</group>
    </>
  );
}

export default function WatchViewer({ id, label, onClose }: { id: WatchId; label: string; onClose(): void }) {
  const box = useRef<HTMLDivElement>(null);
  const turn = useRef<Turn>({ yaw: 0, pitch: 0, touched: 0 });
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
    t.pitch = Math.max(-1.0, Math.min(0.9, t.pitch + ((e.clientY - d.y) / w) * 2.4));
    t.touched = performance.now();
    d.x = e.clientX;
    d.y = e.clientY;
  };
  const up = () => {
    drag.current = null;
  };
  const key = (e: React.KeyboardEvent) => {
    const t = turn.current;
    const step = 0.26;
    if (e.key === 'ArrowLeft') t.yaw -= step;
    else if (e.key === 'ArrowRight') t.yaw += step;
    else if (e.key === 'ArrowUp') t.pitch = Math.max(-1.0, t.pitch - step);
    else if (e.key === 'ArrowDown') t.pitch = Math.min(0.9, t.pitch + step);
    else if (e.key === 'Home') {
      t.yaw = 0;
      t.pitch = 0;
    } else if (e.key === 'End') t.yaw = Math.PI;
    else if (e.key === 'Escape') return onClose();
    else return;
    e.preventDefault();
    t.touched = performance.now();
  };

  return (
    <div
      className="viewer"
      ref={box}
      data-ready={ready}
      tabIndex={0}
      role="img"
      aria-roledescription="3D model"
      aria-label={`${label}. Drag, or use the arrow keys, to turn it; Home faces the dial, End shows the back; Escape returns to the photograph.`}
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
        <Watch id={id} turn={turn} onReady={() => setReady(true)} />
      </Canvas>
      <p className="viewer-note label" aria-hidden="true">
        {ready ? (
          <>
            Drag to turn<span className="viewer-note-more"> · the head, without its strap</span>
          </>
        ) : (
          'Drawing the watch…'
        )}
      </p>
    </div>
  );
}
