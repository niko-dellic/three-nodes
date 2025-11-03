import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

export class ConeGeometryNode extends BaseThreeNode<
  'radius' | 'height' | 'radialSegments',
  'geometry'
> {
  constructor(id: string) {
    super(id, 'ConeGeometryNode', 'Cone Geometry');
    this.addInput({ name: 'radius', type: PortType.Number, defaultValue: 1 });
    this.addInput({ name: 'height', type: PortType.Number, defaultValue: 1 });
    this.addInput({ name: 'radialSegments', type: PortType.Number, defaultValue: 8 });
    this.addOutput({ name: 'geometry', type: PortType.Geometry });
  }

  evaluate(_context: EvaluationContext): void {
    const radius = this.getInputValue<number>('radius') ?? 1;
    const height = this.getInputValue<number>('height') ?? 1;
    const radialSegments = this.getInputValue<number>('radialSegments') ?? 8;

    const geometry = new THREE.ConeGeometry(radius, height, radialSegments);
    this.trackResource(geometry);
    this.setOutputValue('geometry', geometry);
  }
}

