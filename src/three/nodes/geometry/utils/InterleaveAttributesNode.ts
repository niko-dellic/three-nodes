import { BaseThreeNode } from '../../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';
import { interleaveAttributes } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export class InterleaveAttributesNode extends BaseThreeNode {
  constructor(id: string) {
    super(id, 'InterleaveAttributesNode', 'Interleave Attributes');
    this.addInput({ name: 'attributes', type: PortType.Any }); // Array of attributes
    this.addOutput({ name: 'interleavedBuffer', type: PortType.Any });
  }

  evaluate(_context: EvaluationContext): void {
    const attributes = this.getInputValues<THREE.BufferAttribute>('attributes');

    if (attributes.length === 0) {
      this.setOutputValue('interleavedBuffer', undefined);
      return;
    }

    try {
      const interleavedBuffer = interleaveAttributes(attributes as any);
      this.setOutputValue('interleavedBuffer', interleavedBuffer as any);
    } catch (error) {
      console.error('Error interleaving attributes:', error);
      this.setOutputValue('interleavedBuffer', undefined);
    }
  }
}
