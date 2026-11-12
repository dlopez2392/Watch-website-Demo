import * as THREE from 'three';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import type { InkUniform, MatKey, MatLib } from './materials';
import { INK } from './materials';

import type { PartId } from './partsData';

export type { Annotation, PartId } from './partsData';
export { ANNOTATIONS, PART_ORDER } from './partsData';

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
