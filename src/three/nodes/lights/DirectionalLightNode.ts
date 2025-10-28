import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

export class DirectionalLightNode extends BaseThreeNode<
  'color' | 'intensity' | 'position',
  'light'
> {
  constructor(id: string) {
    super(id, 'DirectionalLightNode', 'Directional Light');
    this.addInput({ name: 'color', type: PortType.Color, defaultValue: new THREE.Color(1, 1, 1) });
    this.addInput({ name: 'intensity', type: PortType.Number, defaultValue: 1 });
    this.addInput({
      name: 'position',
      type: PortType.Vector3,
      defaultValue: new THREE.Vector3(5, 5, 5),
    });
    this.addOutput({ name: 'light', type: PortType.Light });
  }

  evaluate(_context: EvaluationContext): void {
    const color = this.getInputValue<THREE.Color>('color') ?? new THREE.Color(1, 1, 1);
    const intensity = this.getInputValue<number>('intensity') ?? 1;
    const position = this.getInputValue<THREE.Vector3>('position') ?? new THREE.Vector3(5, 5, 5);

    const light = new THREE.DirectionalLight(color, intensity);
    light.position.copy(position);

    this.trackResource(light);
    this.setOutputValue('light', light);
  }
}
