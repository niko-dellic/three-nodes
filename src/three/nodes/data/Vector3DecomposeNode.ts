import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

export class Vector3DecomposeNode extends BaseThreeNode<'vector', 'x' | 'y' | 'z'> {
  constructor(id: string) {
    super(id, 'Vector3DecomposeNode', 'Vector3 Decompose');

    // Add input port for Vector3
    this.addInput({ name: 'vector', type: PortType.Vector3 });

    // Add output ports for individual components
    this.addOutput({ name: 'x', type: PortType.Number });
    this.addOutput({ name: 'y', type: PortType.Number });
    this.addOutput({ name: 'z', type: PortType.Number });
  }

  evaluate(_context: EvaluationContext): void {
    // Get the input vector
    const vector = this.getInputValue<THREE.Vector3>('vector');

    if (vector) {
      // Extract and output individual components
      this.setOutputValue('x', vector.x);
      this.setOutputValue('y', vector.y);
      this.setOutputValue('z', vector.z);
    } else {
      // If no input, output zeros
      this.setOutputValue('x', 0);
      this.setOutputValue('y', 0);
      this.setOutputValue('z', 0);
    }
  }
}
