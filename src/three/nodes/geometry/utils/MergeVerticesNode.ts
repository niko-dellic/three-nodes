import { BaseThreeNode } from '../../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export class MergeVerticesNode extends BaseThreeNode<
  'geometry',
  'geometry'
> {
  constructor(id: string) {
    super(id, 'MergeVerticesNode', 'Merge Vertices');
    this.addInput({ name: 'geometry', type: PortType.Geometry });
    this.addOutput({ name: 'geometry', type: PortType.Geometry });

    // Property for tolerance
    this.addProperty({
      name: 'tolerance',
      type: 'number',
      value: 0.0001,
      min: 0,
      max: 1,
      step: 0.0001,
      label: 'Tolerance',
    });
  }

  evaluate(_context: EvaluationContext): void {
    const geometry = this.getInputValue<THREE.BufferGeometry>('geometry');
    const tolerance = this.getProperty('tolerance') ?? 0.0001;

    if (!geometry) {
      this.setOutputValue('geometry', undefined);
      return;
    }

    try {
      const merged = mergeVertices(geometry, tolerance);
      this.trackResource(merged);
      this.setOutputValue('geometry', merged);
    } catch (error) {
      console.error('Error merging vertices:', error);
      this.setOutputValue('geometry', geometry); // Return original on error
    }
  }
}
