import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

/**
 * Scene Compiler Node
 *
 * Collects scene, objects, and camera without mutating the scene.
 * Acts as an intermediary that gathers all data needed for the final scene output.
 * Does NOT add objects to the scene - that's done by SceneOutputNode.
 */
export interface CompiledScene {
  scene: THREE.Scene;
  objects: THREE.Object3D[];
  camera: THREE.Camera;
}

export class SceneCompilerNode extends BaseThreeNode<
  'scene' | 'objects' | 'camera',
  'compiled'
> {
  constructor(id: string) {
    super(id, 'SceneCompilerNode', 'Scene Compiler');
    this.addInput({ name: 'scene', type: PortType.Scene });
    this.addInput({ name: 'objects', type: PortType.Object3D });
    this.addInput({ name: 'camera', type: PortType.Camera });
    this.addOutput({ name: 'compiled', type: PortType.Any });
  }

  evaluate(_context: EvaluationContext): void {
    const scene = this.getInputValue<THREE.Scene>('scene');
    const camera = this.getInputValue<THREE.Camera>('camera');
    const objectInputs = this.getInputValues<THREE.Object3D>('objects');

    if (!scene) {
      console.warn('SceneCompilerNode: No scene provided');
      this.setOutputValue('compiled', undefined);
      return;
    }

    if (!camera) {
      console.warn('SceneCompilerNode: No camera provided');
      this.setOutputValue('compiled', undefined);
      return;
    }

    // Flatten all objects (handle both single objects and arrays)
    const objects: THREE.Object3D[] = [];
    for (const obj of objectInputs) {
      if (obj) {
        if (Array.isArray(obj)) {
          // Object input is an array of objects
          objects.push(...obj.filter((o) => o !== null && o !== undefined));
        } else {
          // Single object
          objects.push(obj);
        }
      }
    }

    // Create compiled scene data without mutating anything
    const compiled: CompiledScene = {
      scene,
      objects,
      camera,
    };

    this.setOutputValue('compiled', compiled);
  }
}
