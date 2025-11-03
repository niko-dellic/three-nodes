import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

export class CapsuleGeometryNode extends BaseThreeNode<
  'radius' | 'length' | 'capSegments' | 'radialSegments',
  'geometry'
> {
  constructor(id: string) {
    super(id, 'CapsuleGeometryNode', 'Capsule Geometry');
    this.addInput({ name: 'radius', type: PortType.Number, defaultValue: 1 });
    this.addInput({ name: 'length', type: PortType.Number, defaultValue: 1 });
    this.addInput({ name: 'capSegments', type: PortType.Number, defaultValue: 4 });
    this.addInput({ name: 'radialSegments', type: PortType.Number, defaultValue: 8 });
    this.addOutput({ name: 'geometry', type: PortType.Geometry });
  }

  evaluate(_context: EvaluationContext): void {
    const radius = this.getInputValue<number>('radius') ?? 1;
    const length = this.getInputValue<number>('length') ?? 1;
    const capSegments = this.getInputValue<number>('capSegments') ?? 4;
    const radialSegments = this.getInputValue<number>('radialSegments') ?? 8;

    const geometry = new THREE.CapsuleGeometry(radius, length, capSegments, radialSegments);
    this.trackResource(geometry);
    this.setOutputValue('geometry', geometry);
  }
}

