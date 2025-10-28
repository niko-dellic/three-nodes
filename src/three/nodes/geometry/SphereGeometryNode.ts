import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

export class SphereGeometryNode extends BaseThreeNode {
  constructor(id: string) {
    super(id, 'SphereGeometryNode', 'Sphere Geometry');
    this.addInput({ name: 'radius', type: PortType.Number, defaultValue: 1 });
    this.addInput({ name: 'widthSegments', type: PortType.Number, defaultValue: 32 });
    this.addInput({ name: 'heightSegments', type: PortType.Number, defaultValue: 16 });
    this.addOutput({ name: 'geometry', type: PortType.Geometry });
  }

  evaluate(_context: EvaluationContext): void {
    const radius = this.getInputValue<number>('radius') ?? 1;
    const widthSegments = this.getInputValue<number>('widthSegments') ?? 32;
    const heightSegments = this.getInputValue<number>('heightSegments') ?? 16;

    const geometry = new THREE.SphereGeometry(radius, widthSegments, heightSegments);
    this.trackResource(geometry);
    this.setOutputValue('geometry', geometry);
  }
}
