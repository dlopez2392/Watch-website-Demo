import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { watchById } from '../lib/watches';
import { buildWatch, type WatchModel } from './buildWatch';
import type { Part, PartId } from './parts';
import { KeyLight, Pipeline, ShadowCatcher, StudioEnv, type FocusRef, type Tier } from './Stage';
import { hero, setActive, setAuto, setReady, shownPart } from './store';
import { fontsReady } from './textures';
import { CAMERA_FOV, CAMERA_Z, SCROLL, computeLayout } from './layout';

export { CAMERA_FOV, CAMERA_Z };

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const damp = (cur: number, target: number, lambda: number, dt: number) => mix(cur, target, 1 - Math.exp(-lambda * dt));
const wrapPi = (a: number) => {
  let x = (a + Math.PI) % (Math.PI * 2);
  if (x < 0) x += Math.PI * 2;
  return x - Math.PI;
};

const TOUR: PartId[] = ['dial', 'barrel', 'hands', 'centreWheel', 'crystal', 'mainplate', 'fourthWheel', 'bezel', 'secondsHand'];
const INTRO_SECONDS = 5.2;

const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
const Z = new THREE.Vector3(0, 0, 1);

export interface HeroSceneProps {
  tier: Tier;
  reduced?: boolean;
  /** freeze into a given state: used for stills and the reduced-motion illustration */
  frozen?: { intro: number; scroll: number; time: number; spin: number; inkFloor?: number; part?: PartId };
}

export default function HeroScene({ tier, frozen }: HeroSceneProps) {
  const { size, camera, gl } = useThree();
  const [model, setModel] = useState<WatchModel | null>(null);
  const poseGroup = useRef<THREE.Group>(null);
  const offsetGroup = useRef<THREE.Group>(null);
  const focus = useRef<FocusRef>({ distance: CAMERA_Z - 40, strength: 0 });
  const shadowOpacity = useRef(0);

  useEffect(() => {
    let alive = true;
    let built: WatchModel | null = null;
    fontsReady().then(() => {
      if (!alive) return;
      built = buildWatch(watchById('codice'), { movement: true, detail: tier.detail, textureSize: tier.texture });
      setModel(built);
    });
    return () => {
      alive = false;
      built?.dispose();
    };
  }, [tier.detail, tier.texture]);

  /* ---------- layout: how the stack sits in the viewport ---------- */
  const layout = useMemo(() => {
    const L = computeLayout(size.width, size.height);
    const qExploded = new THREE.Quaternion()
      .setFromAxisAngle(Z, L.psi - Math.PI / 2)
      .multiply(new THREE.Quaternion().setFromAxisAngle(X, -L.theta));
    const qAssembled = new THREE.Quaternion()
      .setFromAxisAngle(Y, -0.3)
      .multiply(new THREE.Quaternion().setFromAxisAngle(X, -0.36));
    return {
      ...L,
      centre: new THREE.Vector3(...L.centre),
      centreAssembled: new THREE.Vector3(...L.centreAssembled),
      flat: new THREE.Vector3(...L.flat),
      qExploded,
      qAssembled,
    };
  }, [size.width, size.height]);

  useEffect(() => {
    hero.page.x = size.width / 2 + layout.flat.x * layout.ppu;
    hero.page.y = size.height / 2 - layout.flat.y * layout.ppu;
    hero.page.ppu = layout.ppu;
    hero.page.scale = layout.flatScale;
    hero.axis.x = Math.cos(layout.psi);
    hero.axis.y = -Math.sin(layout.psi);
    window.dispatchEvent(new CustomEvent('valdarno:layout'));
  }, [layout, size.width, size.height]);

  /* ---------- pointer: tilt, drag to orbit ---------- */
  const pointer = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const orbit = useRef({ yaw: 0, pitch: 0, vy: 0, vp: 0, last: 0, downX: 0, downY: 0, moved: false, id: -1 });
  useEffect(() => {
    if (frozen) return;
    const el = gl.domElement;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      pointer.current.tx = ((e.clientX - r.left) / r.width) * 2 - 1;
      pointer.current.ty = ((e.clientY - r.top) / r.height) * 2 - 1;
      const o = orbit.current;
      if (o.id === e.pointerId) {
        const dx = e.clientX - o.downX;
        const dy = e.clientY - o.downY;
        if (!o.moved && Math.hypot(dx, dy) > 6) {
          o.moved = true;
          hero.dragging = true;
          el.style.cursor = 'grabbing';
        }
        if (o.moved) {
          o.yaw += e.movementX * 0.0075;
          if (e.pointerType !== 'touch') o.pitch += e.movementY * 0.0075;
          o.pitch = Math.max(-1.1, Math.min(1.1, o.pitch));
          o.last = performance.now();
          hero.lastInteraction = o.last;
        }
      }
    };
    const onDown = (e: PointerEvent) => {
      const o = orbit.current;
      o.id = e.pointerId;
      o.downX = e.clientX;
      o.downY = e.clientY;
      o.moved = false;
    };
    const onUp = (e: PointerEvent) => {
      const o = orbit.current;
      if (o.id !== e.pointerId) return;
      o.id = -1;
      hero.dragging = false;
      el.style.cursor = '';
      o.last = performance.now();
    };
    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [gl, frozen]);

  /* ---------- the frame ---------- */
  const clock = useRef({ start: 0, spin: 0.5, tour: 0, tourIndex: -1, firstFrame: true, focus: 0, started: false });
  const q = useMemo(() => ({ a: new THREE.Quaternion(), b: new THREE.Quaternion(), user: new THREE.Quaternion(), tmp: new THREE.Quaternion(), v: new THREE.Vector3(), flat: new THREE.Quaternion() }), []);

  useFrame((state, delta) => {
    if (!model || !poseGroup.current || !offsetGroup.current) return;
    const dt = Math.min(delta, 0.05);
    const now = performance.now();
    const c = clock.current;
    if (c.firstFrame) {
      c.firstFrame = false;
      c.start = now + 500;
      setReady();
    }

    /* progress */
    let p: number;
    let s: number;
    let wall: number;
    if (frozen) {
      p = frozen.intro;
      s = frozen.scroll;
      wall = frozen.time;
      c.spin = frozen.spin;
    } else {
      p = Math.min(1, Math.max(0, (now - c.start) / (INTRO_SECONDS * 1000)));
      s = hero.scroll;
      const d = new Date();
      wall = d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds() + d.getMilliseconds() / 1000;
    }
    hero.intro = p;
    const lift = smooth(0.04, 0.62, p);
    const introExplode = smooth(0.22, 1, p);
    const sPose = smooth(SCROLL.close0 + 0.01, SCROLL.close1, s);
    const rest = lift * (1 - sPose);

    /* time: the watch always runs */
    model.tick(wall);

    /* the descent: scrolling walks down the stack, one part at a time */
    const u = Math.min(1, Math.max(0, (s - SCROLL.travel0) / (SCROLL.travel1 - SCROLL.travel0)));
    const n = model.parts.length;
    const travelling = s >= SCROLL.travel0 && s < SCROLL.travel1;
    const stop = Math.min(n - 1, Math.floor(u * n));
    const f = Math.min(n - 1, Math.max(0, u * n - 0.5));
    const i0 = Math.floor(f);
    const i1 = Math.min(n - 1, i0 + 1);
    const k = layout.explodeScale;
    const heightOf = (part: Part) => part.explode.z + part.anchor.z / k;
    const along = mix(heightOf(model.parts[i0]), heightOf(model.parts[i1]), f - i0);
    const focusTarget = Math.max(layout.focusBottom, Math.min(layout.focusTop, along));
    c.focus = c.started ? damp(c.focus, focusTarget, 3.4, dt) : focusTarget;
    c.started = true;

    /* explosion, with each part slightly out of phase */
    const t = now / 1000;
    model.pose(
      (part: Part) => {
        const lag = Math.abs(part.order - 0.45) * 0.1;
        const close = smooth(SCROLL.close0 + lag, SCROLL.close1 - 0.06 + lag, s);
        const bob = 1 + 0.008 * Math.sin(t * 0.55 + part.order * 21) * rest;
        return introExplode * (1 - close) * k * bob;
      },
      (part: Part) => 0.07 * Math.sin(t * 0.33 + part.order * 17.3) * introExplode * (1 - sPose),
    );

    /* ink resolves into metal as each part leaves the page */
    for (const part of model.parts) {
      const target = shownPart() === part.id ? 1 : 0;
      part.hover = damp(part.hover, target, 7, dt);
    }
    const inkFloor = frozen?.inkFloor ?? 0;
    model.ink(
      (part: Part) => {
        const start = 0.2 + part.order * 0.36;
        const v = 1 - smooth(start, start + 0.34, p);
        return Math.max(v, inkFloor * smooth(0.25, 0.85, part.order));
      },
      tier.dpr,
      size.width * tier.dpr,
      size.height * tier.dpr,
    );

    /* pose: flat on the page, floating exploded, assembled */
    if (!frozen) c.spin += dt * 0.085 * rest;
    const spin = wrapPi(c.spin) * (1 - smooth(SCROLL.close0, SCROLL.close1 - 0.04, s));
    q.a.copy(layout.qExploded).multiply(q.tmp.setFromAxisAngle(Z, spin));
    q.b.copy(q.flat).slerp(q.a, smooth(0.06, 0.6, p));
    q.b.slerp(layout.qAssembled, sPose);

    const pt = pointer.current;
    pt.x = damp(pt.x, pt.tx, 3.2, dt);
    pt.y = damp(pt.y, pt.ty, 3.2, dt);
    const o = orbit.current;
    if (o.id === -1 && now - o.last > 2600) {
      o.yaw = damp(o.yaw, 0, 1.6, dt);
      o.pitch = damp(o.pitch, 0, 1.6, dt);
    }
    const live = lift;
    q.user
      .setFromAxisAngle(Y, (pt.x * 0.16 + o.yaw) * live)
      .multiply(q.tmp.setFromAxisAngle(X, (pt.y * 0.11 + o.pitch) * live));
    poseGroup.current.quaternion.copy(q.user).multiply(q.b);

    q.v.copy(layout.flat).lerp(layout.centre, lift).lerp(layout.centreAssembled, sPose);
    poseGroup.current.position.copy(q.v);
    const sc = mix(mix(layout.flatScale, layout.scale, lift), layout.scaleAssembled, sPose);
    const flatten = mix(0.035, 1, smooth(0.02, 0.36, p));
    poseGroup.current.scale.set(sc, sc, sc * flatten);

    /* turn about the part in view, not about the dial */
    const openness = introExplode * (1 - smooth(SCROLL.close0, SCROLL.close1 - 0.04, s));
    offsetGroup.current.position.z = mix(1.5, -c.focus * k, openness);
    model.glass(mix(0.1, 0.3, smooth(0.3, 1, openness)));

    shadowOpacity.current = 0.24 * smooth(0.1, 0.7, p);
    focus.current.distance = CAMERA_Z - q.v.z;
    focus.current.strength = tier.level === 'high' ? mix(0, mix(19, 7, sPose), smooth(0.3, 0.9, p)) : 0;

    /* which part is being spoken about: the scroll's while descending, a quiet tour at rest */
    if (!frozen) {
      const idle = now - hero.lastInteraction > 3200;
      if (travelling && p > 0.6) {
        setAuto(model.parts[stop].id);
        c.tour = now;
      } else if (p >= 1 && s < SCROLL.travel0 && idle && !hero.active && !hero.focus && hero.inView) {
        if (now - c.tour > 5200) {
          c.tour = now;
          c.tourIndex = (c.tourIndex + 1) % TOUR.length;
          setAuto(TOUR[c.tourIndex]);
        } else if (now - c.tour > 4200 && hero.auto) {
          setAuto(null);
        }
      } else if (hero.auto) {
        setAuto(null);
        c.tour = now - 3000;
      }
    } else if (frozen.part) {
      setAuto(frozen.part);
    }

    /* where the leader line lands */
    const shown = shownPart();
    const part = shown ? model.byId.get(shown) : undefined;
    if (part && s < SCROLL.close0) {
      poseGroup.current.updateMatrixWorld(true);
      q.v.copy(part.anchor);
      part.group.localToWorld(q.v);
      q.v.project(camera);
      hero.anchor.x = (q.v.x * 0.5 + 0.5) * size.width;
      hero.anchor.y = (-q.v.y * 0.5 + 0.5) * size.height;
      hero.anchor.visible = true;
    } else {
      hero.anchor.visible = false;
    }
    if (frozen && (window as unknown as { __studio?: { ready: boolean } }).__studio) (window as unknown as { __studio: { ready: boolean } }).__studio.ready = true;
    void state;
  });

  const interactive = !frozen;
  const onOver = (e: ThreeEvent<PointerEvent>) => {
    if (!interactive || hero.dragging || hero.scroll > SCROLL.close0 || hero.intro < 0.9) return;
    if (e.pointerType === 'touch') return;
    e.stopPropagation();
    setActive(e.object.userData.partId as PartId);
    gl.domElement.style.cursor = 'pointer';
  };
  const onOut = (e: ThreeEvent<PointerEvent>) => {
    if (!interactive) return;
    if (hero.active === e.object.userData.partId) setActive(null);
    if (!hero.dragging) gl.domElement.style.cursor = '';
  };
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (!interactive || orbit.current.moved || hero.scroll > SCROLL.close0) return;
    e.stopPropagation();
    const id = e.object.userData.partId as PartId;
    setActive(hero.active === id ? null : id);
  };

  return (
    <>
      <Pipeline tier={tier} focus={focus} />
      <StudioEnv resolution={tier.level === 'high' ? 512 : 256} />
      <KeyLight tier={tier} />
      <ShadowCatcher opacity={shadowOpacity} />
      <group ref={poseGroup}>
        <group ref={offsetGroup}>
          {model && (
            <primitive
              object={model.root}
              onPointerOver={onOver}
              onPointerOut={onOut}
              onClick={onClick}
              onPointerMissed={() => interactive && setActive(null)}
            />
          )}
        </group>
      </group>
    </>
  );
}
