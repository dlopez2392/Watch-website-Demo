import type { PartId } from './partsData';

/** Shared, mutable hero state: written every frame by the scene, read by the DOM overlay without re-rendering React. */
export const hero = {
  /** 0..1 progress through the pinned hero */
  scroll: 0,
  /** 0..1 intro timeline: the drawing lifts off the page */
  intro: 0,
  ready: false,
  inView: true,
  /** hovered or tapped part */
  active: null as PartId | null,
  /** part shown by the quiet auto-tour when nothing is hovered */
  auto: null as PartId | null,
  /** keyboard focus from the parts index */
  focus: null as PartId | null,
  anchor: { x: 0, y: 0, visible: false },
  /** screen-space direction of the stack axis, for label placement */
  axis: { x: 0.9, y: -0.4 },
  /** where the watch lies as a drawing: px centre and px per mm on the page */
  page: { x: 0, y: 0, ppu: 6, scale: 1 },
  lastInteraction: 0,
  dragging: false,
};

type Listener = () => void;
const listeners = new Set<Listener>();
let version = 0;

export const subscribe = (l: Listener) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export const getVersion = () => version;
export const emit = () => {
  version++;
  listeners.forEach((l) => l());
};

export const shownPart = (): PartId | null => hero.focus ?? hero.active ?? hero.auto;

export function setActive(id: PartId | null) {
  if (hero.active === id) return;
  hero.active = id;
  hero.lastInteraction = performance.now();
  emit();
}
export function setAuto(id: PartId | null) {
  if (hero.auto === id) return;
  hero.auto = id;
  emit();
}
export function setFocus(id: PartId | null) {
  if (hero.focus === id) return;
  hero.focus = id;
  hero.lastInteraction = performance.now();
  emit();
}
export function setReady() {
  if (hero.ready) return;
  hero.ready = true;
  emit();
}
