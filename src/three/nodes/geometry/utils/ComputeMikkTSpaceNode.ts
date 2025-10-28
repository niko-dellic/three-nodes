import { BaseThreeNode } from '../../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';
import { computeMikkTSpaceTangents } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export class ComputeMikkTSpaceNode extends BaseThreeNode<
  'geometry',
  'geometry'
> {
  constructor(id: string) {
    super(id, 'ComputeMikkTSpaceNode', 'Compute MikkTSpace');
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
      // Clone geometry to avoid mutation
      const cloned = geometry.clone();
      computeMikkTSpaceTangents(cloned, cloned);
      this.trackResource(cloned);
      this.setOutputValue('geometry', cloned);
    } catch (error) {
      console.error('Error computing tangents:', error);
      this.setOutputValue('geometry', geometry); // Return original on error
    }
  }
}
