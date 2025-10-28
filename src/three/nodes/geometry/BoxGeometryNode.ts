import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

export class BoxGeometryNode extends BaseThreeNode {
  constructor(id: string) {
    super(id, 'BoxGeometryNode', 'Box Geometry');
    this.addInput({ name: 'width', type: PortType.Number, defaultValue: 1 });
    this.addInput({ name: 'height', type: PortType.Number, defaultValue: 1 });
    this.addInput({ name: 'depth', type: PortType.Number, defaultValue: 1 });
    this.addOutput({ name: 'geometry', type: PortType.Geometry });
  }

  evaluate(_context: EvaluationContext): void {
    // Get all input values (handles array connections)
    const widths = this.getInputValues<number>('width');
    const heights = this.getInputValues<number>('height');
    const depths = this.getInputValues<number>('depth');

    // If any input has multiple values, process element-wise
    if (widths.length > 1 || heights.length > 1 || depths.length > 1) {
      const geometries = this.processArrays<THREE.BufferGeometry>(
        { width: widths, height: heights, depth: depths },
        (values) => {
          const w = values.width ?? 1;
          const h = values.height ?? 1;
          const d = values.depth ?? 1;
          const geom = new THREE.BoxGeometry(w, h, d);
          this.trackResource(geom);
          return geom;
        }
      );
      this.setOutputValue('geometry', geometries);
    } else {
      // Single value case
      const width = widths[0] ?? 1;
      const height = heights[0] ?? 1;
      const depth = depths[0] ?? 1;
      const geometry = new THREE.BoxGeometry(width, height, depth);
      this.trackResource(geometry);
      this.setOutputValue('geometry', geometry);
    }
  }
}
