import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

export class BoxGeometryNode extends BaseThreeNode {
  constructor(id: string) {
    super(id, 'BoxGeometryNode', 'Box Geometry');
    this.addInput({ name: 'width', type: PortType.Number, defaultValue: 1 });
    this.addInput({ name: 'height', type: PortType.Number, defaultValue: 1 });
    this.addInput({ name: 'depth', type: PortType.Number, defaultValue: 1 });
    this.addOutput({ name: 'geometry', type: PortType.Geometry });
  }

  evaluate(_context: EvaluationContext): void {
    const width = this.getInputValue<number>('width') ?? 1;
    const height = this.getInputValue<number>('height') ?? 1;
    const depth = this.getInputValue<number>('depth') ?? 1;

    const geometry = new THREE.BoxGeometry(width, height, depth);
    this.trackResource(geometry);
    this.setOutputValue('geometry', geometry);
  }
}
