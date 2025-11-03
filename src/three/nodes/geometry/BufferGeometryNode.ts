import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

export class BufferGeometryNode extends BaseThreeNode<never, 'geometry'> {
  constructor(id: string) {
    super(id, 'BufferGeometryNode', 'Buffer Geometry');
    this.addOutput({ name: 'geometry', type: PortType.Geometry });
  }

  evaluate(_context: EvaluationContext): void {
    const geometry = new THREE.BufferGeometry();
    this.trackResource(geometry);
    this.setOutputValue('geometry', geometry);
  }
}

