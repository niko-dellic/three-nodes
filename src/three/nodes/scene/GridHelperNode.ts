import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

/**
 * GridHelper Node
 * Creates a grid helper for visualizing the ground plane
 * Useful for spatial reference and scene orientation
 */
export class GridHelperNode extends BaseThreeNode<
  'size' | 'divisions' | 'colorCenterLine' | 'colorGrid' | 'visible' | 'position' | 'rotation',
  'grid'
> {
  private gridHelper: THREE.GridHelper;

  constructor(id: string) {
    super(id, 'GridHelperNode', 'Grid Helper');

    // Create default grid helper
    this.gridHelper = new THREE.GridHelper(10, 10);

    // Inputs for dynamic customization
    this.addInput({ name: 'size', type: PortType.Number });
    this.addInput({ name: 'divisions', type: PortType.Number });
    this.addInput({ name: 'colorCenterLine', type: PortType.Color });
    this.addInput({ name: 'colorGrid', type: PortType.Color });
    this.addInput({ name: 'visible', type: PortType.Boolean });
    this.addInput({ name: 'position', type: PortType.Vector3 });
    this.addInput({ name: 'rotation', type: PortType.Vector3 });

    this.addOutput({ name: 'grid', type: PortType.Object3D });

    // Properties with default values (used when no input is connected)
    this.addProperty({ name: 'size', type: 'number', value: 10, label: 'Size' });
    this.addProperty({
      name: 'divisions',
      type: 'number',
      value: 10,
      label: 'Divisions',
    });
    this.addProperty({
      name: 'colorCenterLine',
      type: 'color',
      value: '#444444',
      label: 'Center Line Color',
    });
    this.addProperty({
      name: 'colorGrid',
      type: 'color',
      value: '#888888',
      label: 'Grid Color',
    });
    this.addProperty({
      name: 'visible',
      type: 'boolean',
      value: true,
      label: 'Visible',
    });
  }

  evaluate(_context: EvaluationContext): void {
    // Get values from inputs (if connected) or properties (as fallback)
    let size = this.getInputValue<number>('size') ?? this.getProperty('size') ?? 10;
    let divisions = this.getInputValue<number>('divisions') ?? this.getProperty('divisions') ?? 10;
    const colorCenterLine =
      this.getInputValue<THREE.Color | string>('colorCenterLine') ??
      this.getProperty('colorCenterLine') ??
      '#444444';
    const colorGrid =
      this.getInputValue<THREE.Color | string>('colorGrid') ??
      this.getProperty('colorGrid') ??
      '#888888';
    const visible = this.getInputValue<boolean>('visible') ?? this.getProperty('visible') ?? true;
    const position = this.getInputValue<THREE.Vector3>('position');
    const rotation = this.getInputValue<THREE.Vector3>('rotation');

    // Ensure valid values
    size = Math.max(0.1, size); // Minimum size
    divisions = Math.max(1, Math.floor(divisions)); // Must be integer >= 1

    // Recreate grid if size or divisions changed
    const needsRecreation =
      this.gridHelper.userData.size !== size || this.gridHelper.userData.divisions !== divisions;

    if (needsRecreation) {
      // Store old position and rotation
      const position = this.gridHelper.position.clone();
      const rotation = this.gridHelper.rotation.clone();

      // Dispose old grid
      this.gridHelper.geometry.dispose();
      const material = this.gridHelper.material;
      if (Array.isArray(material)) {
        material.forEach((mat: THREE.Material) => mat.dispose());
      } else if (material) {
        material.dispose();
      }

      // Create new grid
      this.gridHelper = new THREE.GridHelper(
        size,
        divisions,
        new THREE.Color(colorCenterLine),
        new THREE.Color(colorGrid)
      );

      // Restore position and rotation
      this.gridHelper.position.copy(position);
      this.gridHelper.rotation.copy(rotation);

      // Store parameters for change detection
      this.gridHelper.userData.size = size;
      this.gridHelper.userData.divisions = divisions;

      // Track for cleanup
      this.trackResource(this.gridHelper);
    } else {
      // Update colors if they changed
      const material = this.gridHelper.material as THREE.LineBasicMaterial;
      if (material && material.color) {
        // GridHelper uses a LineBasicMaterial with vertex colors
        // We need to update the geometry colors
        const colors = this.gridHelper.geometry.attributes.color;
        if (colors) {
          const centerColor = new THREE.Color(colorCenterLine);
          const gridColor = new THREE.Color(colorGrid);

          // Update colors (first 4 vertices are center lines)
          for (let i = 0; i < 4; i++) {
            colors.setXYZ(i, centerColor.r, centerColor.g, centerColor.b);
          }
          for (let i = 4; i < colors.count; i++) {
            colors.setXYZ(i, gridColor.r, gridColor.g, gridColor.b);
          }
          colors.needsUpdate = true;
        }
      }
    }

    // Apply transform if provided
    if (position) {
      this.gridHelper.position.copy(position);
    }

    if (rotation) {
      this.gridHelper.rotation.set(rotation.x, rotation.y, rotation.z);
    }

    // Apply visibility
    this.gridHelper.visible = visible;

    this.setOutputValue('grid', this.gridHelper);
  }

  dispose(): void {
    if (this.gridHelper) {
      this.gridHelper.geometry.dispose();
      const material = this.gridHelper.material;
      if (Array.isArray(material)) {
        material.forEach((mat: THREE.Material) => mat.dispose());
      } else if (material) {
        material.dispose();
      }
    }
    super.dispose();
  }
}
