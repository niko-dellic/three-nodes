import { BaseThreeNode } from '../../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';
import { toTrianglesDrawMode } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export class ToTrianglesDrawModeNode extends BaseThreeNode {
  constructor(id: string) {
    super(id, 'ToTrianglesDrawModeNode', 'To Triangles Draw Mode');
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
      const triangulated = toTrianglesDrawMode(cloned, THREE.TriangleStripDrawMode);
      this.trackResource(triangulated);
      this.setOutputValue('geometry', triangulated);
    } catch (error) {
      console.error('Error converting to triangles:', error);
      this.setOutputValue('geometry', geometry); // Return original on error
    }
  }
}
