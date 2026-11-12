/** How the stack sits in the viewport. Pure numbers, shared by the WebGL scene and the drawing on the page behind it. */

export const CAMERA_Z = 300;
export const CAMERA_FOV = 22;

export interface HeroLayout {
  /** visible page height and width in millimetres, at the page plane */
  Hw: number;
  Ww: number;
  portrait: boolean;
  explodeScale: number;
  /** direction of the stack axis on screen, radians from +x */
  psi: number;
  /** tilt of the axis away from the viewer */
  theta: number;
  scale: number;
  centre: [number, number, number];
  scaleAssembled: number;
  centreAssembled: [number, number, number];
  flatScale: number;
  flat: [number, number, number];
  /** CSS pixels per millimetre on the page plane */
  ppu: number;
}

export function computeLayout(width: number, height: number): HeroLayout {
  const aspect = width / height;
  const Hw = 2 * CAMERA_Z * Math.tan((CAMERA_FOV * Math.PI) / 360);
  const Ww = Hw * aspect;
  const portrait = aspect < 0.9;
  const explodeScale = portrait ? 0.72 : aspect < 1.25 ? 0.86 : 1;
  const psi = (portrait ? 82 : aspect < 1.25 ? 46 : aspect > 2.1 ? 13 : 20) * (Math.PI / 180);
  const theta = 54 * (Math.PI / 180);
  const floatZ = portrait ? 30 : 38;
  const persp = CAMERA_Z / (CAMERA_Z - floatZ);
  const len = (119 * explodeScale * Math.sin(theta) + 28) * persp;
  const wid = 54 * persp;
  const needW = len * Math.abs(Math.cos(psi)) + wid * Math.abs(Math.sin(psi));
  const needH = len * Math.abs(Math.sin(psi)) + wid * Math.abs(Math.cos(psi));
  const availW = Ww * (portrait ? 0.98 : 0.82);
  const availH = Hw * (portrait ? 0.6 : 0.88);
  const scale = Math.min(1.25, availW / needW, availH / needH);
  const centre: [number, number, number] = [portrait ? Ww * 0.02 : Ww * 0.05, portrait ? -Hw * 0.15 : -Hw * 0.045, floatZ];
  const perspA = CAMERA_Z / (CAMERA_Z - 46);
  const targetDia = portrait ? Ww * 0.68 : Math.min(Hw * 0.45, Ww * 0.3);
  const scaleAssembled = targetDia / (39 * perspA);
  const centreAssembled: [number, number, number] = [portrait ? 0 : Ww * 0.15, portrait ? Hw * 0.07 : Hw * 0.01, 46];
  const flatScale = Math.min(scale * 1.15, (portrait ? Ww * 0.62 : Hw * 0.5) / 47);
  const flat: [number, number, number] = [portrait ? 0 : Ww * 0.06, portrait ? -Hw * 0.14 : -Hw * 0.04, 0.4];
  const ppu = height / Hw;
  return { Hw, Ww, portrait, explodeScale, psi, theta, scale, centre, scaleAssembled, centreAssembled, flatScale, flat, ppu };
}
