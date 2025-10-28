import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

export class PerspectiveCameraNode extends BaseThreeNode {
  constructor(id: string) {
    super(id, 'PerspectiveCameraNode', 'Perspective Camera');
    this.addInput({ name: 'fov', type: PortType.Number, defaultValue: 75 });
    this.addInput({ name: 'aspect', type: PortType.Number, defaultValue: 1.5 });
    this.addInput({ name: 'near', type: PortType.Number, defaultValue: 0.1 });
    this.addInput({ name: 'far', type: PortType.Number, defaultValue: 1000 });
    this.addInput({
      name: 'position',
      type: PortType.Vector3,
      defaultValue: new THREE.Vector3(0, 0, 5),
    });
    this.addOutput({ name: 'camera', type: PortType.Camera });
  }

  evaluate(_context: EvaluationContext): void {
    const fov = this.getInputValue<number>('fov') ?? 75;
    const aspect = this.getInputValue<number>('aspect') ?? 1.5;
    const near = this.getInputValue<number>('near') ?? 0.1;
    const far = this.getInputValue<number>('far') ?? 1000;
    const position = this.getInputValue<THREE.Vector3>('position') ?? new THREE.Vector3(0, 0, 5);

    const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
    camera.position.copy(position);

    this.setOutputValue('camera', camera);
  }
}
