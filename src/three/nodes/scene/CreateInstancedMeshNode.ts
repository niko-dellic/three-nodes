import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

/**
 * Create Instanced Mesh Node
 * Creates an InstancedMesh from a geometry/material and instance count
 */
export class CreateInstancedMeshNode extends BaseThreeNode<
  'geometry' | 'material' | 'count',
  'instancedMesh'
> {
  constructor(id: string) {
    super(id, 'CreateInstancedMeshNode', 'Create Instanced Mesh');

    this.addInput({ name: 'geometry', type: PortType.Geometry });
    this.addInput({ name: 'material', type: PortType.Material });
    this.addInput({ name: 'count', type: PortType.Number, defaultValue: 100 });

    this.addOutput({ name: 'instancedMesh', type: PortType.Object3D });
  }

  evaluate(_context: EvaluationContext): void {
    const geometry = this.getInputValue<THREE.BufferGeometry>('geometry');
    const material = this.getInputValue<THREE.Material>('material');
    const count = Math.max(1, Math.floor(this.getInputValue<number>('count') ?? 100));

    if (!geometry) {
      console.warn('CreateInstancedMeshNode: No geometry provided');
      this.setOutputValue('instancedMesh', undefined);
      return;
    }

    if (!material) {
      console.warn('CreateInstancedMeshNode: No material provided');
      this.setOutputValue('instancedMesh', undefined);
      return;
    }

    // Create InstancedMesh
    const instancedMesh = new THREE.InstancedMesh(geometry, material, count);
    this.trackResource(instancedMesh);

    // Initialize all instances with identity matrix (at origin)
    const matrix = new THREE.Matrix4();
    for (let i = 0; i < count; i++) {
      instancedMesh.setMatrixAt(i, matrix);
    }

    // Update the instance matrix
    instancedMesh.instanceMatrix.needsUpdate = true;

    this.setOutputValue('instancedMesh', instancedMesh);
  }
}
