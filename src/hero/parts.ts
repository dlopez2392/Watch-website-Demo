import * as THREE from 'three';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import type { InkUniform, MatKey, MatLib } from './materials';
import { INK } from './materials';

export type PartId =
  | 'crystal'
  | 'bezel'
  | 'hands'
  | 'secondsHand'
  | 'dial'
  | 'mainplate'
  | 'barrel'
  | 'centreWheel'
  | 'thirdWheel'
  | 'fourthWheel'
  | 'escapeWheel'
  | 'palletFork'
  | 'balance'
  | 'hairspring'
  | 'balanceCock'
  | 'bridges'
  | 'keyless'
  | 'jewels'
  | 'screws'
  | 'crown'
  | 'caseMiddle'
  | 'caseback'
  | 'strap'
  | 'buckle';

export interface Part {
  id: PartId;
  group: THREE.Group;
  /** displacement at full explosion, in the watch's own frame */
  explode: THREE.Vector3;
  ink: InkUniform;
  lineMat: LineMaterial;
  lines: LineSegments2[];
  /** where the leader line lands, in the part's frame */
  anchor: THREE.Vector3;
  /** 0 at the crystal, 1 at the buckle */
  order: number;
  hover: number;
  /** extra internal separation, e.g. the barrel lid lifting off its drum */
  inner?: (e: number) => void;
}

const noRaycast = () => {};

export interface MeshOpts {
  edges?: boolean | number;
  cast?: boolean;
  receive?: boolean;
  parent?: THREE.Object3D;
}

export class PartBuilder {
  readonly part: Part;
  constructor(
    id: PartId,
    private mats: MatLib,
    private detail: number,
    explode: [number, number, number],
    anchor: [number, number, number],
  ) {
    const lineMat = new LineMaterial({
      color: INK.line.getHex(),
      linewidth: 1.2,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      worldUnits: false,
    });
    const group = new THREE.Group();
    group.name = id;
    this.part = {
      id,
      group,
      explode: new THREE.Vector3(...explode),
      ink: { value: 1 },
      lineMat,
      lines: [],
      anchor: new THREE.Vector3(...anchor),
      order: 0,
      hover: 0,
    };
  }

  mat(key: MatKey) {
    return this.mats.get(key, this.part.ink);
  }

  group(parent?: THREE.Object3D): THREE.Group {
    const g = new THREE.Group();
    (parent ?? this.part.group).add(g);
    return g;
  }

  mesh(geo: THREE.BufferGeometry, material: MatKey | THREE.Material | THREE.Material[], opts: MeshOpts = {}): THREE.Mesh {
    const m = typeof material === 'string' ? this.mat(material) : material;
    const mesh = new THREE.Mesh(geo, m);
    mesh.castShadow = opts.cast ?? true;
    mesh.receiveShadow = opts.receive ?? false;
    mesh.raycast = noRaycast;
    (opts.parent ?? this.part.group).add(mesh);
    if (opts.edges !== false) {
      const threshold = typeof opts.edges === 'number' ? opts.edges : 32;
      const e = new THREE.EdgesGeometry(geo, threshold);
      const arr = e.attributes.position.array as Float32Array;
      if (arr.length > 0) {
        const lg = new LineSegmentsGeometry();
        lg.setPositions(arr);
        const line = new LineSegments2(lg, this.part.lineMat);
        line.raycast = noRaycast;
        line.renderOrder = 2;
        line.frustumCulled = false;
        mesh.add(line);
        this.part.lines.push(line);
      }
      e.dispose();
    }
    return mesh;
  }

  /** an unseen, cheap stand-in used only for pointer picking */
  proxy(geo: THREE.BufferGeometry, parent?: THREE.Object3D): THREE.Mesh {
    const mesh = new THREE.Mesh(geo, PROXY_MAT);
    mesh.userData.partId = this.part.id;
    mesh.userData.proxy = true;
    (parent ?? this.part.group).add(mesh);
    return mesh;
  }

  get segs() {
    return this.detail >= 1 ? 128 : 72;
  }
}

export const PROXY_MAT = new THREE.MeshBasicMaterial({ visible: false });

export interface Annotation {
  it: string;
  en: string;
  note: string;
}

/** Stack order, top to bottom, with the hand-lettered notes. */
export const PART_ORDER: PartId[] = [
  'crystal',
  'bezel',
  'hands',
  'secondsHand',
  'dial',
  'mainplate',
  'barrel',
  'centreWheel',
  'thirdWheel',
  'fourthWheel',
  'escapeWheel',
  'palletFork',
  'balance',
  'hairspring',
  'balanceCock',
  'bridges',
  'keyless',
  'jewels',
  'screws',
  'crown',
  'caseMiddle',
  'caseback',
  'strap',
  'buckle',
];

export const ANNOTATIONS: Record<PartId, Annotation> = {
  crystal: { it: 'Vetro zaffiro', en: 'Sapphire crystal', note: 'Domed, and coated on the inside. It bends the light, never the dial.' },
  bezel: { it: 'Lunetta', en: 'Bezel', note: 'A polished ring that holds the crystal under pressure.' },
  hands: { it: 'Lancette', en: 'Hour and minute hands', note: 'Leaf-shaped steel, blued over a flame at 290 °C.' },
  secondsHand: { it: 'Piccoli secondi', en: 'Small-seconds hand', note: 'Rides the fourth wheel directly: one turn each minute.' },
  dial: { it: 'Quadrante', en: 'Dial', note: 'Silvered brass, sector-ruled like a draughtsman’s chart.' },
  mainplate: { it: 'Platina', en: 'Mainplate', note: 'The ground floor. Every pivot is located from this one plate.' },
  barrel: { it: 'Bariletto', en: 'Mainspring barrel', note: 'A coiled spring of 420 mm stores fifty hours of running.' },
  centreWheel: { it: 'Ruota di centro', en: 'Centre wheel', note: 'Turns once an hour and carries the minute hand.' },
  thirdWheel: { it: 'Ruota mediana', en: 'Third wheel', note: 'The intermediary, stepping the hour down towards the minute.' },
  fourthWheel: { it: 'Ruota dei secondi', en: 'Fourth wheel', note: 'One turn a minute. Its arbor is the seconds hand.' },
  escapeWheel: { it: 'Ruota di scappamento', en: 'Escape wheel', note: 'Fifteen teeth let the train go, a sixth of a second at a time.' },
  palletFork: { it: 'Àncora', en: 'Pallet fork', note: 'Two ruby pallets lock and release. This is the tick you hear.' },
  balance: { it: 'Bilanciere', en: 'Balance wheel', note: 'Swings 21,600 times an hour and keeps the whole watch honest.' },
  hairspring: { it: 'Spirale', en: 'Hairspring', note: 'Breathes in and out three times a second.' },
  balanceCock: { it: 'Ponte del bilanciere', en: 'Balance cock', note: 'A single arm over the balance, carrying the regulator.' },
  bridges: { it: 'Ponti', en: 'Bridges', note: 'Striped by hand. They hold the upper pivots true.' },
  keyless: { it: 'Rocchetto', en: 'Ratchet and crown wheels', note: 'They wind the barrel; a click stops the spring running back.' },
  jewels: { it: 'Rubini', en: 'Jewels', note: 'Nineteen synthetic rubies, wherever steel would otherwise wear.' },
  screws: { it: 'Viti azzurrate', en: 'Blued screws', note: 'Heat-blued a tray at a time, until cornflower.' },
  crown: { it: 'Corona e albero', en: 'Crown and stem', note: 'Thirty turns each morning. Pull once to set.' },
  caseMiddle: { it: 'Carrure', en: 'Case middle', note: 'Steel, 39 mm across: brushed flanks, polished bevels.' },
  caseback: { it: 'Fondello', en: 'Display caseback', note: 'A second sapphire, so the work stays in view.' },
  strap: { it: 'Cinturino', en: 'Strap', note: 'Tuscan calf, cut and stitched in Santa Croce.' },
  buckle: { it: 'Fibbia ad ardiglione', en: 'Pin buckle', note: 'Milled from the same steel as the case.' },
};
