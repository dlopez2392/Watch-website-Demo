/** How the stack sits in the viewport. Pure numbers, shared by the WebGL scene and the drawing on the page behind it. */

export const CAMERA_Z = 300;
export const CAMERA_FOV = 22;

/** Scroll, as a fraction of the pinned hero: rest, the descent through the parts, the closing, the watch. */
export const SCROLL = { travel0: 0.035, travel1: 0.62, close0: 0.63, close1: 0.88 };
/** within the closing: the parts come home first, seen from the back; then the watch is turned to its dial */
export const CLOSE = { home: 0.6, turn: 0.46 };

export interface HeroLayout {
  /** visible page height and width in millimetres, at the page plane */
  Hw: number;
  Ww: number;
  portrait: boolean;
  /** how far apart the parts stand, as a multiple of their nominal spacing */
  explodeScale: number;
  /** direction of the stack axis on screen, radians from +x */
  psi: number;
  /** tilt of the axis away from the viewer */
  theta: number;
  /** the same, once the movement has been turned over to show its bridges */
  thetaBack: number;
  scale: number;
  centre: [number, number, number];
  scaleAssembled: number;
  centreAssembled: [number, number, number];
  flatScale: number;
  flat: [number, number, number];
  /** which height of the stack sits at the pivot at the start and at the end of the descent */
  focusTop: number;
  focusBottom: number;
  /** CSS pixels per millimetre on the page plane */
  ppu: number;
}

export function computeLayout(width: number, height: number): HeroLayout {
  const aspect = width / height;
  const Hw = 2 * CAMERA_Z * Math.tan((CAMERA_FOV * Math.PI) / 360);
  const Ww = Hw * aspect;
  const portrait = aspect < 0.9;
  const explodeScale = portrait ? 1.08 : 1.3;
  const psi = Math.PI / 2;
  const theta = (portrait ? 56 : 57) * (Math.PI / 180);
  const thetaBack = Math.PI - theta + 0.02;
  const floatZ = 40;
  const persp = CAMERA_Z / (CAMERA_Z - floatZ);
  // the watch is large: the stack is taller than the window, and scrolling walks down it
  const disc = portrait ? Ww * 0.62 : Math.min(Hw * 0.44, Ww * 0.3);
  const scale = disc / (39 * persp);
  const centre: [number, number, number] = [portrait ? 0 : Ww * (aspect < 1.3 ? 0.2 : 0.17), 0, floatZ];
  // half the window, measured along the stack in the stack's own units
  const span = Hw / 2 / (scale * persp * Math.sin(theta) * explodeScale);
  const top = 52;
  const bottom = -150;
  const focusTop = top - span * (portrait ? 0.12 : 0.74);
  const focusBottom = Math.min(focusTop, bottom + span * 0.82);
  const perspA = CAMERA_Z / (CAMERA_Z - 46);
  const targetDia = portrait ? Ww * 0.7 : Math.min(Hw * 0.5, Ww * 0.32);
  const scaleAssembled = targetDia / (39 * perspA);
  const centreAssembled: [number, number, number] = [portrait ? 0 : centre[0], portrait ? Hw * 0.07 : Hw * 0.01, 46];
  const flatScale = scale * persp;
  const flat: [number, number, number] = [centre[0], portrait ? -Hw * 0.16 : -Hw * 0.02, 0.4];
  const ppu = height / Hw;
  return { Hw, Ww, portrait, explodeScale, psi, theta, thetaBack, scale, centre, scaleAssembled, centreAssembled, flatScale, flat, focusTop, focusBottom, ppu };
}
