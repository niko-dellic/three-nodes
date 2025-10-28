import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType, SceneOutput } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

export class SceneOutputNode extends BaseThreeNode {
  constructor(id: string) {
    super(id, 'SceneOutputNode', 'Scene Output');
    this.addInput({ name: 'scene', type: PortType.Scene });
    this.addInput({ name: 'camera', type: PortType.Camera });
    this.addInput({ name: 'update', type: PortType.Boolean, defaultValue: false });
    this.addOutput({ name: 'output', type: PortType.Any });
  }

  evaluate(_context: EvaluationContext): void {
    // Check if update is enabled
    const update = this.getInputValue<boolean>('update') ?? false;

    if (!update) {
      // Keep previous output if update is false
      return;
    }

    const scene = this.getInputValue<THREE.Scene>('scene');
    if (!scene) {
      console.warn('SceneOutputNode: No scene provided');
      this.setOutputValue('output', undefined);
      return;
    }

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
