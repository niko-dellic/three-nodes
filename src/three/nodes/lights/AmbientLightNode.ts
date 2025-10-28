import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

export class AmbientLightNode extends BaseThreeNode {
  constructor(id: string) {
    super(id, 'AmbientLightNode', 'Ambient Light');
    this.addInput({ name: 'color', type: PortType.Color, defaultValue: new THREE.Color(1, 1, 1) });
    this.addInput({ name: 'intensity', type: PortType.Number, defaultValue: 1 });
    this.addOutput({ name: 'light', type: PortType.Light });
  }

  evaluate(_context: EvaluationContext): void {
    const color = this.getInputValue<THREE.Color>('color') ?? new THREE.Color(1, 1, 1);
    const intensity = this.getInputValue<number>('intensity') ?? 1;

    const light = new THREE.AmbientLight(color, intensity);
    this.trackResource(light);
    this.setOutputValue('light', light);
  }
}
