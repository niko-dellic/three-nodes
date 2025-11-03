import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';
import { MarchingCubes } from 'three/addons/objects/MarchingCubes.js';

export class MarchingCubesNode extends BaseThreeNode<
  'resolution' | 'material' | 'isolevel',
  'marchingCubes'
> {
  constructor(id: string) {
    super(id, 'MarchingCubesNode', 'Marching Cubes');
    this.addInput({ name: 'resolution', type: PortType.Number, defaultValue: 28 });
    this.addInput({ name: 'material', type: PortType.Material });
    this.addInput({ name: 'isolevel', type: PortType.Number, defaultValue: 80 });
    this.addOutput({ name: 'marchingCubes', type: PortType.Object3D });
  }

  evaluate(_context: EvaluationContext): void {
    const resolution = this.getInputValue<number>('resolution') ?? 28;
    const material = this.getInputValue<THREE.Material>('material');
    const isolevel = this.getInputValue<number>('isolevel') ?? 80;

    const marchingCubes = new MarchingCubes(
      resolution,
      material || new THREE.MeshStandardMaterial(),
      true,
      true,
      100000
    );
    
    marchingCubes.isolation = isolevel;
    this.trackResource(marchingCubes.geometry);
    this.setOutputValue('marchingCubes', marchingCubes);
  }
}

