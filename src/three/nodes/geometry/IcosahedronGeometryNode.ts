import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

export class IcosahedronGeometryNode extends BaseThreeNode<'radius' | 'detail', 'geometry'> {
  constructor(id: string) {
    super(id, 'IcosahedronGeometryNode', 'Icosahedron Geometry');
    this.addInput({ name: 'radius', type: PortType.Number, defaultValue: 1 });
    this.addInput({ name: 'detail', type: PortType.Number, defaultValue: 0 });
    this.addOutput({ name: 'geometry', type: PortType.Geometry });
  }

  evaluate(_context: EvaluationContext): void {
    const radius = this.getInputValue<number>('radius') ?? 1;
    const detail = this.getInputValue<number>('detail') ?? 0;

    const geometry = new THREE.IcosahedronGeometry(radius, detail);
    this.trackResource(geometry);
    this.setOutputValue('geometry', geometry);
  }
}

