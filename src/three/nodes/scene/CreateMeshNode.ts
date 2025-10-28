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
    const geometries = this.getInputValues<THREE.BufferGeometry>('geometry');
    const materials = this.getInputValues<THREE.Material>('material');

    // Check if we have arrays
    const hasArrayGeometry = geometries.length > 1 || Array.isArray(geometries[0]);
    const hasArrayMaterial = materials.length > 1 || Array.isArray(materials[0]);

    // Flatten arrays if needed
    const flatGeometries =
      hasArrayGeometry && Array.isArray(geometries[0]) ? (geometries[0] as any[]) : geometries;
    const flatMaterials =
      hasArrayMaterial && Array.isArray(materials[0]) ? (materials[0] as any[]) : materials;

    if (flatGeometries.length === 0 || flatMaterials.length === 0) {
      this.setOutputValue('mesh', undefined);
      return;
    }

    // If either input is an array, create multiple meshes
    if (flatGeometries.length > 1 || flatMaterials.length > 1) {
      const meshes = this.processArrays<THREE.Mesh>(
        { geometry: flatGeometries, material: flatMaterials },
        (values) => {
          if (!values.geometry || !values.material) return null as any;
          const mesh = new THREE.Mesh(values.geometry, values.material);
          this.trackResource(mesh);
          return mesh;
        }
      ).filter((m) => m !== null);

      this.setOutputValue('mesh', meshes);
    } else {
      // Single mesh case
      const geometry = flatGeometries[0];
      const material = flatMaterials[0];

      if (!geometry || !material) {
        this.setOutputValue('mesh', undefined);
        return;
      }

      const mesh = new THREE.Mesh(geometry, material);
      this.trackResource(mesh);
      this.setOutputValue('mesh', mesh);
    }
  }
}
