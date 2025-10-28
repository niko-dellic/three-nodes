import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

export class CreateMeshNode extends BaseThreeNode {
  constructor(id: string) {
    super(id, 'CreateMeshNode', 'Create Mesh');
    this.addInput({ name: 'geometry', type: PortType.Geometry });
    this.addInput({ name: 'material', type: PortType.Material });
    this.addOutput({ name: 'mesh', type: PortType.Object3D });
  }

  evaluate(_context: EvaluationContext): void {
    const geometry = this.getInputValue<THREE.BufferGeometry>('geometry');
    const material = this.getInputValue<THREE.Material>('material');

    if (!geometry || !material) {
      this.setOutputValue('mesh', undefined);
      return;
    }

    const mesh = new THREE.Mesh(geometry, material);
    this.trackResource(mesh);
    this.setOutputValue('mesh', mesh);
  }
}
