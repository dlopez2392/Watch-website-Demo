import { useRef, useState } from 'react';
import { watchById, type WatchId } from '../lib/watches';
import { newTurn, type Turn } from '../lib/turn';
import Turntable from './Turntable';

/**
 * The same parametric watch as the hero, in the hand: the head alone, without its strap, so the back
 * can be seen. Mounted only while open, and only one at a time.
 */
export default function WatchViewer({ id, label, onClose }: { id: WatchId; label: string; onClose(): void }) {
  const turn = useRef<Turn>(newTurn());
  const [ready, setReady] = useState(false);
  return (
    <Turntable className="viewer" spec={watchById(id)} movement={id === 'codice'} label={label} turn={turn} onEscape={onClose} onReady={() => setReady(true)}>
      <p className="viewer-note label" aria-hidden="true">
        {ready ? (
          <>
            Drag to turn<span className="viewer-note-more"> · the head, without its strap</span>
          </>
        ) : (
          'Drawing the watch…'
        )}
      </p>
    </Turntable>
  );
}
