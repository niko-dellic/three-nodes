import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType, SceneOutput } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

export class SceneOutputNode extends BaseThreeNode {
  constructor(id: string) {
    super(id, 'SceneOutputNode', 'Scene Output');
    this.addInput({ name: 'scene', type: PortType.Scene, defaultValue: new THREE.Scene() });
    this.addInput({ name: 'camera', type: PortType.Camera });
    this.addOutput({ name: 'output', type: PortType.Any });
  }

  evaluate(_context: EvaluationContext): void {
    const scene = this.getInputValue<THREE.Scene>('scene') ?? new THREE.Scene();
    const camera = this.getInputValue<THREE.Camera>('camera');

    if (!camera) {
      console.warn('SceneOutputNode: No camera provided');
      this.setOutputValue('output', undefined);
      return;
    }

    const output: SceneOutput = {
      scene,
      camera,
    };

    this.setOutputValue('output', output);
  }
}
