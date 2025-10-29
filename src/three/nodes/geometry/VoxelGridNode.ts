import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

/**
 * Voxel Grid Node
 * Creates a grid of boxes using InstancedMesh for efficient rendering
 */
export class VoxelGridNode extends BaseThreeNode<
  'xCount' | 'yCount' | 'zCount' | 'spacing' | 'boxSize' | 'material',
  'mesh'
> {
  constructor(id: string) {
    super(id, 'VoxelGridNode', 'Voxel Grid');

    this.addInput({ name: 'xCount', type: PortType.Number, defaultValue: 5 });
    this.addInput({ name: 'yCount', type: PortType.Number, defaultValue: 5 });
    this.addInput({ name: 'zCount', type: PortType.Number, defaultValue: 5 });
    this.addInput({ name: 'spacing', type: PortType.Number, defaultValue: 5 });
    this.addInput({ name: 'boxSize', type: PortType.Number, defaultValue: 5 });
    this.addInput({ name: 'material', type: PortType.Material });

    this.addOutput({ name: 'mesh', type: PortType.Object3D });
  }

  evaluate(_context: EvaluationContext): void {
    const xCount = Math.max(1, Math.floor(this.getInputValue<number>('xCount') ?? 5));
    const yCount = Math.max(1, Math.floor(this.getInputValue<number>('yCount') ?? 5));
    const zCount = Math.max(1, Math.floor(this.getInputValue<number>('zCount') ?? 5));
    const spacing = this.getInputValue<number>('spacing') ?? 2;
    const boxSize = this.getInputValue<number>('boxSize') ?? 1;
    const material = this.getInputValue<THREE.Material>('material');

    // Calculate total number of instances
    const instanceCount = xCount * yCount * zCount;

    // Create geometry for a single box
    const geometry = new THREE.BoxGeometry(boxSize, boxSize, boxSize);
    this.trackResource(geometry);

    // Use provided material or create a default one
    const mat = material || new THREE.MeshStandardMaterial({ color: 0xffffff });
    if (!material) {
      this.trackResource(mat);
    }

    // Create InstancedMesh
    const instancedMesh = new THREE.InstancedMesh(geometry, mat, instanceCount);
    this.trackResource(instancedMesh);

    // Calculate offsets to center the grid
    const xOffset = ((xCount - 1) * spacing) / 2;
    const yOffset = ((yCount - 1) * spacing) / 2;
    const zOffset = ((zCount - 1) * spacing) / 2;

    // Set transformation matrix for each instance
    const matrix = new THREE.Matrix4();
    let index = 0;
    for (let z = 0; z < zCount; z++) {
      for (let y = 0; y < yCount; y++) {
        for (let x = 0; x < xCount; x++) {
          const posX = x * spacing - xOffset;
          const posY = y * spacing - yOffset;
          const posZ = z * spacing - zOffset;

          matrix.setPosition(posX, posY, posZ);
          instancedMesh.setMatrixAt(index, matrix);
          index++;
        }
      }
    }

    // Update the instance matrix
    instancedMesh.instanceMatrix.needsUpdate = true;

    this.setOutputValue('mesh', instancedMesh);
  }
}
