import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

/**
 * Updatable Object Node
 * Wraps an Object3D with a custom update function
 * The update function is defined as JavaScript code in the properties panel
 */
export class UpdatableObjectNode extends BaseThreeNode {
  private updateFunction: ((deltaTime: number, elapsedTime: number) => void) | null = null;
  private wrappedObject: any = null;

  constructor(id: string) {
    super(id, 'UpdatableObjectNode', 'Updatable Object');

    this.addInput({ name: 'object', type: PortType.Object3D });
    this.addOutput({ name: 'updatable', type: PortType.Any });

    // Property for update code
    this.addProperty({
      name: 'updateCode',
      type: 'string',
      value:
        '// this.object is the Object3D\n// deltaTime: time since last frame (seconds)\n// elapsedTime: total elapsed time (seconds)\n\n// Example:\n// this.object.rotation.y += deltaTime;',
      label: 'Update Code',
      multiline: true,
      rows: 10,
    });
  }

  evaluate(_context: EvaluationContext): void {
    const object = this.getInputValue<THREE.Object3D>('object');

    if (!object) {
      this.setOutputValue('updatable', undefined);
      return;
    }

    // Compile update function if code has changed
    const updateCode = this.getProperty('updateCode') || '';
    this.compileUpdateFunction(updateCode);

    // Create wrapper object with update function
    this.wrappedObject = {
      object: object,
      update: (deltaTime: number, elapsedTime: number) => {
        if (this.updateFunction) {
          try {
            this.updateFunction.call(this.wrappedObject, deltaTime, elapsedTime);
          } catch (error) {
            console.error('Error executing update function:', error);
          }
        }
      },
    };

    this.setOutputValue('updatable', this.wrappedObject);
  }

  private compileUpdateFunction(code: string): void {
    try {
      // Create function from code
      // The function has access to 'this.object', deltaTime, and elapsedTime
      const functionBody = `
        const deltaTime = arguments[0];
        const elapsedTime = arguments[1];
        ${code}
      `;

      this.updateFunction = new Function(functionBody) as any;
    } catch (error) {
      console.error('Error compiling update function:', error);
      this.updateFunction = null;
    }
  }

  dispose(): void {
    this.updateFunction = null;
    this.wrappedObject = null;
    super.dispose();
  }
}
