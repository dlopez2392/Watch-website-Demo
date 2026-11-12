import { useRef, useState, useSyncExternalStore } from 'react';
import { ANNOTATIONS, PART_ORDER } from '../hero/partsData';
import { getVersion, setActive, setFocus, shownPart, subscribe } from '../hero/store';
import { romanOf } from './Annotation';

/**
 * A ruler in the margin: one tick per part, crystal at the top. It is also the keyboard's way
 * into the annotations: one tab stop, then the arrow keys walk the stack.
 */
export default function PartsIndex() {
  useSyncExternalStore(subscribe, getVersion);
  const shown = shownPart();
  const [current, setCurrent] = useState(0);
  const list = useRef<HTMLOListElement>(null);

  const move = (to: number) => {
    const n = PART_ORDER.length;
    const i = (to + n) % n;
    setCurrent(i);
    list.current?.querySelectorAll<HTMLButtonElement>('button')[i]?.focus();
  };
  const onKey = (e: React.KeyboardEvent, i: number) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      move(i + 1);
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      move(i - 1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      move(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      move(PART_ORDER.length - 1);
    }
  };

  return (
    <nav className="parts-index" aria-label="Parts of the Codice 39. Use the arrow keys to move through the stack.">
      <ol ref={list}>
        {PART_ORDER.map((id, i) => (
          <li key={id}>
            <button
              type="button"
              tabIndex={i === current ? 0 : -1}
              className={shown === id ? 'is-on' : ''}
              onMouseEnter={() => setActive(id)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => {
                setCurrent(i);
                setFocus(id);
              }}
              onBlur={() => setFocus(null)}
              onKeyDown={(e) => onKey(e, i)}
              aria-label={`${romanOf(i)}. ${ANNOTATIONS[id].it}: ${ANNOTATIONS[id].en}. ${ANNOTATIONS[id].note}`}
            >
              <span className="tick" />
              <span className="num" aria-hidden="true">
                {romanOf(i)}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
