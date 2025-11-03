import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

export class TubeGeometryNode extends BaseThreeNode<
  'curve' | 'tubularSegments' | 'radius' | 'radialSegments' | 'closed',
  'geometry'
> {
  constructor(id: string) {
    super(id, 'TubeGeometryNode', 'Tube Geometry');
    this.addInput({ name: 'curve', type: PortType.Any });
    this.addInput({ name: 'tubularSegments', type: PortType.Number, defaultValue: 64 });
    this.addInput({ name: 'radius', type: PortType.Number, defaultValue: 1 });
    this.addInput({ name: 'radialSegments', type: PortType.Number, defaultValue: 8 });
    this.addInput({ name: 'closed', type: PortType.Boolean, defaultValue: false });
    this.addOutput({ name: 'geometry', type: PortType.Geometry });
  }

  evaluate(_context: EvaluationContext): void {
    const curve = this.getInputValue<THREE.Curve<THREE.Vector3>>('curve');
    const tubularSegments = this.getInputValue<number>('tubularSegments') ?? 64;
    const radius = this.getInputValue<number>('radius') ?? 1;
    const radialSegments = this.getInputValue<number>('radialSegments') ?? 8;
    const closed = this.getInputValue<boolean>('closed') ?? false;

    if (!curve) {
      console.warn('TubeGeometryNode: No curve provided');
      return;
    }

    const geometry = new THREE.TubeGeometry(curve, tubularSegments, radius, radialSegments, closed);
    this.trackResource(geometry);
    this.setOutputValue('geometry', geometry);
  }
}

