import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType, SceneOutput } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';
import type { CompiledScene } from '../scene/SceneCompilerNode';

/**
 * Scene Output Node
 *
 * Finalizes the scene by:
 * 1. Clearing all objects from the scene
 * 2. Adding fresh objects from the compiled scene data
 * 3. Outputting the final scene and camera
 *
 * This ensures clean rebuilds on every evaluation.
 */
export class SceneOutputNode extends BaseThreeNode<
  'compiled' | 'update',
  'output'
> {
  private previousObjects: THREE.Object3D[] = [];

  constructor(id: string) {
    super(id, 'SceneOutputNode', 'Scene Output');
    this.addInput({ name: 'compiled', type: PortType.Any });
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

    const compiled = this.getInputValue<CompiledScene>('compiled');
    if (!compiled) {
      console.warn('SceneOutputNode: No compiled scene provided');
      this.setOutputValue('output', undefined);
      return;
    }

    const { scene, objects, camera } = compiled;

    if (!scene) {
      console.warn('SceneOutputNode: No scene in compiled data');
      this.setOutputValue('output', undefined);
      return;
    }

    if (!camera) {
      console.warn('SceneOutputNode: No camera in compiled data');
      this.setOutputValue('output', undefined);
      return;
    }

    // CRITICAL: Clear previous objects from the scene
    // This prevents accumulation of objects on every evaluation
    for (const obj of this.previousObjects) {
      if (obj.parent === scene) {
        scene.remove(obj);
      }
    }

    // Clear the tracking array
    this.previousObjects = [];

    // Add all new objects to the scene
    for (const obj of objects) {
      if (obj) {
        // Remove from previous parent if it has one
        if (obj.parent && obj.parent !== scene) {
          obj.parent.remove(obj);
        }

        // Add to scene
        scene.add(obj);

        // Track this object for next evaluation
        this.previousObjects.push(obj);
      }
    }

    const output: SceneOutput = {
      scene,
      camera,
    };

    this.setOutputValue('output', output);
  }

  dispose(): void {
    // Clean up tracked objects
    this.previousObjects = [];
    super.dispose();
  }
}
