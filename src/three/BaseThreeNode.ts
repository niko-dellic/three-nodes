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

  // Get the raw source code for this node
  getRawCode(): string {
    // Get the class source code from the constructor
    const constructor = this.constructor;

    if (constructor && typeof constructor === 'function') {
      try {
        // Get the full class source code
        const classCode = constructor.toString();

        // If the class code is available and not native code
        if (classCode && !classCode.includes('[native code]')) {
          return classCode;
        }
      } catch (error) {
        console.warn('Failed to get class source code:', error);
      }
    }

    // Fallback: try to get evaluate method if class source is not available
    if (typeof (this as any).evaluate === 'function') {
      const evaluateFunc = (this as any).evaluate;
      let code = evaluateFunc.toString();

      // Remove the function wrapper to show just the body
      code = code
        .replace(/^[^{]*{/, '')
        .replace(/}[^}]*$/, '')
        .trim();

      return code || '// No implementation';
    }

    return '// No code available';
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
