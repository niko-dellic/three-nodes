import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

/**
 * Update Instance Positions Node
 * Updates the position of each instance in an InstancedMesh based on an array of Vector3
 */
export class UpdateInstancePositionsNode extends BaseThreeNode<
  'instancedMesh' | 'positions',
  'instancedMesh'
> {
  constructor(id: string) {
    super(id, 'UpdateInstancePositionsNode', 'Update Instance Positions');

    this.addInput({ name: 'instancedMesh', type: PortType.Object3D });
    this.addInput({ name: 'positions', type: PortType.Any }); // Array of Vector3

    this.addOutput({ name: 'instancedMesh', type: PortType.Object3D });
  }

  evaluate(_context: EvaluationContext): void {
    const instancedMesh = this.getInputValue<THREE.InstancedMesh>('instancedMesh');
    const positions = this.getInputValue<THREE.Vector3[]>('positions');

    if (!instancedMesh || !(instancedMesh instanceof THREE.InstancedMesh)) {
      console.warn('UpdateInstancePositionsNode: Invalid or missing InstancedMesh');
      this.setOutputValue('instancedMesh', instancedMesh);
      return;
    }

    if (!positions || !Array.isArray(positions)) {
      console.warn('UpdateInstancePositionsNode: Invalid or missing positions array');
      this.setOutputValue('instancedMesh', instancedMesh);
      return;
    }

    // Get the current matrix for each instance and update only the position
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();

    // Update positions for each instance (limited by array length or instance count)
    const updateCount = Math.min(positions.length, instancedMesh.count);

    for (let i = 0; i < updateCount; i++) {
      const newPosition = positions[i];

      if (newPosition && newPosition instanceof THREE.Vector3) {
        // Get current matrix
        instancedMesh.getMatrixAt(i, matrix);

        // Decompose to get rotation and scale
        matrix.decompose(position, quaternion, scale);

        // Set new position while preserving rotation and scale
        matrix.compose(newPosition, quaternion, scale);

        // Update the instance matrix
        instancedMesh.setMatrixAt(i, matrix);
      }
    }

    // Mark the instance matrix as needing update
    instancedMesh.instanceMatrix.needsUpdate = true;

    this.setOutputValue('instancedMesh', instancedMesh);
  }
}
