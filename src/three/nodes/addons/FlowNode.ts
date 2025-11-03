import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';
import { Flow } from 'three/addons/modifiers/CurveModifier.js';

export class FlowNode extends BaseThreeNode<'object3D' | 'curve' | 'segments', 'flow'> {
  constructor(id: string) {
    super(id, 'FlowNode', 'Flow');
    this.addInput({ name: 'object3D', type: PortType.Object3D });
    this.addInput({ name: 'curve', type: PortType.Any });
    this.addInput({ name: 'segments', type: PortType.Number, defaultValue: 10 });
    this.addOutput({ name: 'flow', type: PortType.Any });
  }

  evaluate(_context: EvaluationContext): void {
    const object3D = this.getInputValue<THREE.Object3D>('object3D');
    const curve = this.getInputValue<THREE.Curve<THREE.Vector3>>('curve');
    const segments = this.getInputValue<number>('segments') ?? 10;

    if (!object3D || !curve) {
      console.warn('FlowNode: Missing object3D or curve');
      return;
    }

    // Flow expects a Mesh, so check if object3D is a mesh or has meshes
    if (!(object3D as any).isMesh) {
      console.warn('FlowNode: object3D must be a Mesh');
      return;
    }

    const flow = new Flow(object3D as any);
    flow.updateCurve(0, curve);
    if (segments) {
      // Flow uses the segments for subdivision
      (flow as any).segmentCount = Math.max(1, Math.floor(segments));
    }

    this.setOutputValue('flow', flow as any);
  }
}

