/** One animation loop for everything on the page that moves by itself: it runs only while someone is listening. */
type Fn = (now: number) => void;
const fns = new Set<Fn>();
let raf = 0;
const loop = (now: number) => {
  raf = requestAnimationFrame(loop);
  fns.forEach((f) => f(now));
};
export function onFrame(fn: Fn): () => void {
  fns.add(fn);
  if (fns.size === 1) raf = requestAnimationFrame(loop);
  return () => {
    fns.delete(fn);
    if (!fns.size) cancelAnimationFrame(raf);
  };
}
