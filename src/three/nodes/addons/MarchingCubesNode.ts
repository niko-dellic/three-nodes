import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';
import { MarchingCubes } from 'three/addons/objects/MarchingCubes.js';

export class MarchingCubesNode extends BaseThreeNode<
  'resolution' | 'material' | 'isolevel' | 'points' | 'strengths' | 'subtract',
  'marchingCubes'
> {
  constructor(id: string) {
    super(id, 'MarchingCubesNode', 'Marching Cubes');
    this.addInput({ name: 'resolution', type: PortType.Number, defaultValue: 28 });
    this.addInput({ name: 'material', type: PortType.Material });
    this.addInput({ name: 'isolevel', type: PortType.Number, defaultValue: 80 });
    this.addInput({ name: 'points', type: PortType.Any, defaultValue: [] });
    this.addInput({ name: 'strengths', type: PortType.Any, defaultValue: [] });
    this.addInput({ name: 'subtract', type: PortType.Any, defaultValue: [] });
    this.addOutput({ name: 'marchingCubes', type: PortType.Object3D });
  }

  evaluate(_context: EvaluationContext): void {
    const resolution = this.getInputValue<number>('resolution') ?? 28;
    const material = this.getInputValue<THREE.Material>('material');
    let points = this.getInputValue<THREE.Vector3[]>('points') ?? [];
    let strengths = this.getInputValue<number[]>('strengths') ?? [];
    let subtract = this.getInputValue<boolean[]>('subtract') ?? [];

    // If no points provided, create a default 5x5 grid for preview
    if (!Array.isArray(points) || points.length === 0) {
      points = [];
      strengths = [];
      subtract = [];
      const numPoints = 30;

      const size = 1;

      for (let i = 0; i < numPoints; i++) {
        const x = THREE.MathUtils.randFloat(0, size);
        const z = THREE.MathUtils.randFloat(0, size);
        const y = THREE.MathUtils.randFloat(0, size);
        points.push(new THREE.Vector3(x, y, z));
        strengths.push(THREE.MathUtils.randFloat(0, 1));
        subtract.push(false);
      }
    }
    const marchingCubes = new MarchingCubes(
      resolution,
      material || new THREE.MeshMatcapMaterial({ color: 0x00ff00 }),
      true,
      true,
      100000
    );
    // Reset the field
    marchingCubes.reset();

    // Add all balls from the arrays
    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      const strength = strengths[i] ?? 1;
      const isSubtract = subtract[i] ?? false;

      marchingCubes.addBall(
        point.x,
        point.y,
        point.z,
        strength,
        isSubtract ? 0 : 1 // 1 = additive, 0 = subtractive
      );
    }

    marchingCubes.update();

    this.trackResource(marchingCubes.geometry);
    this.setOutputValue('marchingCubes', marchingCubes);
  }
}
