import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

export class SceneNode extends BaseThreeNode {
  private scene: THREE.Scene;

  constructor(id: string) {
    super(id, 'SceneNode', 'Scene');
    this.addOutput({ name: 'scene', type: PortType.Scene });

    // Create the scene
    this.scene = new THREE.Scene();
  }

  evaluate(_context: EvaluationContext): void {
    // Simply output the scene
    this.setOutputValue('scene', this.scene);
  }

  getScene(): THREE.Scene {
    return this.scene;
  }

  dispose(): void {
    // Clear the scene when disposing
    this.scene.clear();
    super.dispose();
  }
}
