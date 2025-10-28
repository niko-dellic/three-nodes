import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

/**
 * Active Camera Node
 * Controls which camera is active in the viewport
 * When update is true, takes control of the viewport camera
 * When update is false, releases control back to orbit controls
 */
export class ActiveCameraNode extends BaseThreeNode {
  constructor(id: string) {
    super(id, 'ActiveCameraNode', 'Active Camera');

    this.addInput({ name: 'camera', type: PortType.Camera });
    this.addInput({ name: 'update', type: PortType.Boolean, defaultValue: false });
    this.addInput({ name: 'position', type: PortType.Vector3 });
    this.addInput({ name: 'target', type: PortType.Vector3 });

    this.addOutput({ name: 'camera', type: PortType.Camera });
  }

  evaluate(context: EvaluationContext): void {
    const camera = this.getInputValue<THREE.Camera>('camera');
    const update = this.getInputValue<boolean>('update') ?? false;
    const position = this.getInputValue<THREE.Vector3>('position');
    const target = this.getInputValue<THREE.Vector3>('target');

    if (!camera) {
      console.warn('ActiveCameraNode: No camera provided');
      this.setOutputValue('camera', undefined);
      return;
    }

    // Update camera position if provided
    if (position) {
      camera.position.copy(position);
    }

    // Update camera look-at target if provided
    if (target) {
      camera.lookAt(target);
    }

    // If update is enabled, notify context that this camera should be active
    if (update && context.graph) {
      // Store active camera in context for LiveViewport to pick up
      (context as any).activeCamera = camera;
      (context as any).activeCameraEnabled = true;
    } else {
      // Release control
      (context as any).activeCamera = null;
      (context as any).activeCameraEnabled = false;
    }

    this.setOutputValue('camera', camera);
  }
}
