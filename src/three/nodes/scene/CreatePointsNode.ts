import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

/**
 * Create Points Node
 * Creates a Points object from an array of Vector3 positions and a PointsMaterial
 */
export class CreatePointsNode extends BaseThreeNode<'positions' | 'material', 'points'> {
  constructor(id: string) {
    super(id, 'CreatePointsNode', 'Create Points');

    this.addInput({ name: 'positions', type: PortType.Any }); // Array of Vector3
    this.addInput({ name: 'material', type: PortType.Material });

    this.addOutput({ name: 'points', type: PortType.Object3D });
  }

  evaluate(_context: EvaluationContext): void {
    const positions = this.getInputValue<THREE.Vector3[]>('positions');
    const material = this.getInputValue<THREE.Material>('material');

    if (!positions || !Array.isArray(positions)) {
      console.warn('CreatePointsNode: No positions array provided');
      this.setOutputValue('points', undefined);
      return;
    }

    if (positions.length === 0) {
      console.warn('CreatePointsNode: Positions array is empty');
      this.setOutputValue('points', undefined);
      return;
    }

    if (!material) {
      console.warn('CreatePointsNode: No material provided');
      this.setOutputValue('points', undefined);
      return;
    }

    // Create geometry from points
    const geometry = new THREE.BufferGeometry();
    geometry.setFromPoints(positions);
    this.trackResource(geometry);

    // Create Points object
    const points = new THREE.Points(geometry, material);
    this.trackResource(points);

    this.setOutputValue('points', points);
  }
}
