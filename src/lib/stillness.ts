/**
 * One switch for everything on the page that moves by itself: the running plates and the film loops.
 * Visitors who ask their system for less motion start with it on; anyone can turn it on from the bar.
 */
import { prefersReducedMotion } from './env';

const KEY = 'valdarno:still';
const subs = new Set<(still: boolean) => void>();

function read(): boolean {
  try {
    const v = window.localStorage.getItem(KEY);
    if (v !== null) return v === '1';
  } catch {
    /* storage may be blocked; fall back to the system setting */
  }
  return prefersReducedMotion();
}

let still = typeof window !== 'undefined' ? read() : false;

export const isStill = () => still;

export function setStill(v: boolean) {
  still = v;
  try {
    window.localStorage.setItem(KEY, v ? '1' : '0');
  } catch {
    /* not remembered, still applied */
  }
  document.documentElement.classList.toggle('is-still', v);
  subs.forEach((f) => f(v));
}

export function onStill(f: (still: boolean) => void): () => void {
  subs.add(f);
  return () => subs.delete(f);
}

if (typeof document !== 'undefined') document.documentElement.classList.toggle('is-still', still);
