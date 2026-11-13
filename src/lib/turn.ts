/** How a watch on a turntable is held: shared by the page and the 3D scene, without loading the latter. */

export const PITCH = { min: -1.0, max: 0.9 };

export interface Turn {
  yaw: number;
  pitch: number;
  /** last time the visitor (or the page, on their behalf) moved it; the idle drift waits for this */
  touched: number;
}

export const newTurn = (): Turn => ({ yaw: 0, pitch: 0, touched: 0 });

/** Turn to face a yaw, the short way round from wherever the visitor has left it. */
export function aim(t: Turn, yaw: number, pitch = 0) {
  const k = Math.round((t.yaw - yaw) / (Math.PI * 2));
  t.yaw = yaw + k * Math.PI * 2;
  t.pitch = pitch;
  t.touched = performance.now();
}
