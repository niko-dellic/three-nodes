import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

export class TorusGeometryNode extends BaseThreeNode<
  'radius' | 'tube' | 'radialSegments' | 'tubularSegments',
  'geometry'
> {
  constructor(id: string) {
    super(id, 'TorusGeometryNode', 'Torus Geometry');
    this.addInput({ name: 'radius', type: PortType.Number, defaultValue: 1 });
    this.addInput({ name: 'tube', type: PortType.Number, defaultValue: 0.4 });
    this.addInput({ name: 'radialSegments', type: PortType.Number, defaultValue: 8 });
    this.addInput({ name: 'tubularSegments', type: PortType.Number, defaultValue: 6 });
    this.addOutput({ name: 'geometry', type: PortType.Geometry });
  }

  evaluate(_context: EvaluationContext): void {
    const radius = this.getInputValue<number>('radius') ?? 1;
    const tube = this.getInputValue<number>('tube') ?? 0.4;
    const radialSegments = this.getInputValue<number>('radialSegments') ?? 8;
    const tubularSegments = this.getInputValue<number>('tubularSegments') ?? 6;

    const geometry = new THREE.TorusGeometry(radius, tube, radialSegments, tubularSegments);
    this.trackResource(geometry);
    this.setOutputValue('geometry', geometry);
  }
}

