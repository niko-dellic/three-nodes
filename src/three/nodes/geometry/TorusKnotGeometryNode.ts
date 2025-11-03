import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

export class TorusKnotGeometryNode extends BaseThreeNode<
  'radius' | 'tube' | 'tubularSegments' | 'radialSegments' | 'p' | 'q',
  'geometry'
> {
  constructor(id: string) {
    super(id, 'TorusKnotGeometryNode', 'Torus Knot Geometry');
    this.addInput({ name: 'radius', type: PortType.Number, defaultValue: 1 });
    this.addInput({ name: 'tube', type: PortType.Number, defaultValue: 0.4 });
    this.addInput({ name: 'tubularSegments', type: PortType.Number, defaultValue: 64 });
    this.addInput({ name: 'radialSegments', type: PortType.Number, defaultValue: 8 });
    this.addInput({ name: 'p', type: PortType.Number, defaultValue: 2 });
    this.addInput({ name: 'q', type: PortType.Number, defaultValue: 3 });
    this.addOutput({ name: 'geometry', type: PortType.Geometry });
  }

  evaluate(_context: EvaluationContext): void {
    const radius = this.getInputValue<number>('radius') ?? 1;
    const tube = this.getInputValue<number>('tube') ?? 0.4;
    const tubularSegments = this.getInputValue<number>('tubularSegments') ?? 64;
    const radialSegments = this.getInputValue<number>('radialSegments') ?? 8;
    const p = this.getInputValue<number>('p') ?? 2;
    const q = this.getInputValue<number>('q') ?? 3;

    const geometry = new THREE.TorusKnotGeometry(
      radius,
      tube,
      tubularSegments,
      radialSegments,
      p,
      q
    );
    this.trackResource(geometry);
    this.setOutputValue('geometry', geometry);
  }
}

