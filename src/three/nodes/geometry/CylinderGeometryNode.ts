import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

export class CylinderGeometryNode extends BaseThreeNode<
  'radiusTop' | 'radiusBottom' | 'height' | 'radialSegments' | 'heightSegments',
  'geometry'
> {
  constructor(id: string) {
    super(id, 'CylinderGeometryNode', 'Cylinder Geometry');
    this.addInput({ name: 'radiusTop', type: PortType.Number, defaultValue: 1 });
    this.addInput({ name: 'radiusBottom', type: PortType.Number, defaultValue: 1 });
    this.addInput({ name: 'height', type: PortType.Number, defaultValue: 1 });
    this.addInput({ name: 'radialSegments', type: PortType.Number, defaultValue: 8 });
    this.addInput({ name: 'heightSegments', type: PortType.Number, defaultValue: 1 });
    this.addOutput({ name: 'geometry', type: PortType.Geometry });
  }

  evaluate(_context: EvaluationContext): void {
    const radiusTop = this.getInputValue<number>('radiusTop') ?? 1;
    const radiusBottom = this.getInputValue<number>('radiusBottom') ?? 1;
    const height = this.getInputValue<number>('height') ?? 1;
    const radialSegments = this.getInputValue<number>('radialSegments') ?? 8;
    const heightSegments = this.getInputValue<number>('heightSegments') ?? 1;

    const geometry = new THREE.CylinderGeometry(
      radiusTop,
      radiusBottom,
      height,
      radialSegments,
      heightSegments
    );
    this.trackResource(geometry);
    this.setOutputValue('geometry', geometry);
  }
}

