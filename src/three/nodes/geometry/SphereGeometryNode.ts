import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

export class SphereGeometryNode extends BaseThreeNode {
  constructor(id: string) {
    super(id, 'SphereGeometryNode', 'Sphere Geometry');
    this.addInput({ name: 'radius', type: PortType.Number, defaultValue: 1 });
    this.addInput({ name: 'widthSegments', type: PortType.Number, defaultValue: 32 });
    this.addInput({ name: 'heightSegments', type: PortType.Number, defaultValue: 16 });
    this.addOutput({ name: 'geometry', type: PortType.Geometry });
  }

  evaluate(_context: EvaluationContext): void {
    // Get all input values (handles array connections)
    const radii = this.getInputValues<number>('radius');
    const widthSegs = this.getInputValues<number>('widthSegments');
    const heightSegs = this.getInputValues<number>('heightSegments');

    // If any input has multiple values, process element-wise
    if (radii.length > 1 || widthSegs.length > 1 || heightSegs.length > 1) {
      const geometries = this.processArrays<THREE.BufferGeometry>(
        { radius: radii, widthSegments: widthSegs, heightSegments: heightSegs },
        (values) => {
          const r = values.radius ?? 1;
          const ws = Math.round(values.widthSegments ?? 32);
          const hs = Math.round(values.heightSegments ?? 16);
          const geom = new THREE.SphereGeometry(r, ws, hs);
          this.trackResource(geom);
          return geom;
        }
      );
      this.setOutputValue('geometry', geometries);
    } else {
      // Single value case
      const radius = radii[0] ?? 1;
      const widthSegments = Math.round(widthSegs[0] ?? 32);
      const heightSegments = Math.round(heightSegs[0] ?? 16);
      const geometry = new THREE.SphereGeometry(radius, widthSegments, heightSegments);
      this.trackResource(geometry);
      this.setOutputValue('geometry', geometry);
    }
  }
}
