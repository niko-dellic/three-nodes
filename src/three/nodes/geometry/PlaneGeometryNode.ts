import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

export class PlaneGeometryNode extends BaseThreeNode<
  'width' | 'height' | 'widthSegments' | 'heightSegments',
  'geometry'
> {
  constructor(id: string) {
    super(id, 'PlaneGeometryNode', 'Plane Geometry');
    this.addInput({ name: 'width', type: PortType.Number, defaultValue: 1 });
    this.addInput({ name: 'height', type: PortType.Number, defaultValue: 1 });
    this.addInput({ name: 'widthSegments', type: PortType.Number, defaultValue: 1 });
    this.addInput({ name: 'heightSegments', type: PortType.Number, defaultValue: 1 });
    this.addOutput({ name: 'geometry', type: PortType.Geometry });
  }

  evaluate(_context: EvaluationContext): void {
    const width = this.getInputValue<number>('width') ?? 1;
    const height = this.getInputValue<number>('height') ?? 1;
    const widthSegments = this.getInputValue<number>('widthSegments') ?? 1;
    const heightSegments = this.getInputValue<number>('heightSegments') ?? 1;

    const geometry = new THREE.PlaneGeometry(width, height, widthSegments, heightSegments);
    this.trackResource(geometry);
    this.setOutputValue('geometry', geometry);
  }
}

