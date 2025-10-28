import { BaseThreeNode } from '../../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';
import { estimateBytesUsed } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export class EstimateBytesUsedNode extends BaseThreeNode {
  constructor(id: string) {
    super(id, 'EstimateBytesUsedNode', 'Estimate Bytes Used');
    this.addInput({ name: 'geometry', type: PortType.Geometry });
    this.addOutput({ name: 'bytes', type: PortType.Number });
  }

  evaluate(_context: EvaluationContext): void {
    const geometry = this.getInputValue<THREE.BufferGeometry>('geometry');

    if (!geometry) {
      this.setOutputValue('bytes', 0);
      return;
    }

    try {
      const bytes = estimateBytesUsed(geometry);
      this.setOutputValue('bytes', bytes);
    } catch (error) {
      console.error('Error estimating bytes:', error);
      this.setOutputValue('bytes', 0);
    }
  }
}
