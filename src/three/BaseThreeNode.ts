import { Node } from '@/core/Node';
import * as THREE from 'three';

export abstract class BaseThreeNode<
  TInputs extends string = string,
  TOutputs extends string = string,
> extends Node<TInputs, TOutputs> {
  protected resources: Set<THREE.Object3D | THREE.Material | THREE.BufferGeometry | THREE.Texture> =
    new Set();

  // Track resources for cleanup
  protected trackResource(
    resource: THREE.Object3D | THREE.Material | THREE.BufferGeometry | THREE.Texture
  ): void {
    this.resources.add(resource);
  }

  // Dispose of all tracked resources
  dispose(): void {
    for (const resource of this.resources) {
      if ('dispose' in resource && typeof resource.dispose === 'function') {
        resource.dispose();
      }
    }
    this.resources.clear();
  }
}
