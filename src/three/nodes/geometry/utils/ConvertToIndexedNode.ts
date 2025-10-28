import { BaseThreeNode } from '../../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export class ConvertToIndexedNode extends BaseThreeNode<
  'geometry',
  'geometry'
> {
  constructor(id: string) {
    super(id, 'ConvertToIndexedNode', 'Convert To Indexed');
    this.addInput({ name: 'geometry', type: PortType.Geometry });
    this.addOutput({ name: 'geometry', type: PortType.Geometry });
  }

  evaluate(_context: EvaluationContext): void {
    const geometry = this.getInputValue<THREE.BufferGeometry>('geometry');

    if (!geometry) {
      this.setOutputValue('geometry', undefined);
      return;
    }

    try {
      // If already indexed, return as is
      if (geometry.index !== null) {
        this.setOutputValue('geometry', geometry);
        return;
      }

      // Convert to indexed by merging vertices with zero tolerance
      const indexed = mergeVertices(geometry, 0);
      this.trackResource(indexed);
      this.setOutputValue('geometry', indexed);
    } catch (error) {
      console.error('Error converting to indexed:', error);
      this.setOutputValue('geometry', geometry); // Return original on error
    }
  }
}
