import { BaseThreeNode } from '../../BaseThreeNode';
import { PortType } from '@/types';
import { EvaluationContext } from '@/core';
import * as THREE from 'three';

/**
 * Camera Component Node
 * Creates and manages a camera instance for use in the scene
 */
export class CameraComponentNode extends BaseThreeNode<
  never,
  'camera'
> {
  private camera: THREE.Camera | null = null;

  constructor(id: string) {
    super(id, 'CameraComponentNode', 'Camera Component');

    // Properties
    this.addProperty({
      name: 'cameraType',
      type: 'list',
      value: 'Perspective',
      label: 'Camera Type',
      options: {
        Perspective: 'Perspective',
        Orthographic: 'Orthographic',
      },
    });

    // Perspective properties
    this.addProperty({
      name: 'fov',
      type: 'number',
      value: 75,
      min: 1,
      max: 180,
      step: 1,
      label: 'FOV',
    });
    this.addProperty({
      name: 'aspect',
      type: 'number',
      value: 1.777,
      min: 0.1,
      max: 10,
      step: 0.01,
      label: 'Aspect Ratio',
    });
    this.addProperty({
      name: 'near',
      type: 'number',
      value: 0.1,
      min: 0.01,
      max: 10,
      step: 0.01,
      label: 'Near Plane',
    });
    this.addProperty({
      name: 'far',
      type: 'number',
      value: 1000,
      min: 1,
      max: 10000,
      step: 10,
      label: 'Far Plane',
    });

    // Orthographic properties
    this.addProperty({
      name: 'left',
      type: 'number',
      value: -10,
      min: -100,
      max: 0,
      step: 0.5,
      label: 'Left',
    });
    this.addProperty({
      name: 'right',
      type: 'number',
      value: 10,
      min: 0,
      max: 100,
      step: 0.5,
      label: 'Right',
    });
    this.addProperty({
      name: 'top',
      type: 'number',
      value: 10,
      min: 0,
      max: 100,
      step: 0.5,
      label: 'Top',
    });
    this.addProperty({
      name: 'bottom',
      type: 'number',
      value: -10,
      min: -100,
      max: 0,
      step: 0.5,
      label: 'Bottom',
    });

    this.addOutput({ name: 'camera', type: PortType.Camera });
  }

  evaluate(_context: EvaluationContext): void {
    const cameraType = this.getProperty('cameraType') || 'Perspective';

    // Create camera if it doesn't exist or type changed
    if (!this.camera || this.needsRecreation(cameraType)) {
      if (this.camera) {
        // Dispose old camera
        this.camera = null;
      }

      this.camera = this.createCamera(cameraType);
      this.trackResource(this.camera);
    }

    // Update camera properties
    this.updateCameraProperties(this.camera, cameraType);

    this.setOutputValue('camera', this.camera);
  }

  private needsRecreation(cameraType: string): boolean {
    if (!this.camera) return true;

    if (cameraType === 'Perspective' && !(this.camera instanceof THREE.PerspectiveCamera)) {
      return true;
    }

    if (cameraType === 'Orthographic' && !(this.camera instanceof THREE.OrthographicCamera)) {
      return true;
    }

    return false;
  }

  private createCamera(cameraType: string): THREE.Camera {
    if (cameraType === 'Orthographic') {
      const left = this.getProperty('left') ?? -10;
      const right = this.getProperty('right') ?? 10;
      const top = this.getProperty('top') ?? 10;
      const bottom = this.getProperty('bottom') ?? -10;
      const near = this.getProperty('near') ?? 0.1;
      const far = this.getProperty('far') ?? 1000;

      return new THREE.OrthographicCamera(left, right, top, bottom, near, far);
    } else {
      const fov = this.getProperty('fov') ?? 75;
      const aspect = this.getProperty('aspect') ?? 1.777;
      const near = this.getProperty('near') ?? 0.1;
      const far = this.getProperty('far') ?? 1000;

      return new THREE.PerspectiveCamera(fov, aspect, near, far);
    }
  }

  private updateCameraProperties(camera: THREE.Camera, cameraType: string): void {
    if (cameraType === 'Perspective' && camera instanceof THREE.PerspectiveCamera) {
      camera.fov = this.getProperty('fov') ?? 75;
      camera.aspect = this.getProperty('aspect') ?? 1.777;
      camera.near = this.getProperty('near') ?? 0.1;
      camera.far = this.getProperty('far') ?? 1000;
      camera.updateProjectionMatrix();
    } else if (cameraType === 'Orthographic' && camera instanceof THREE.OrthographicCamera) {
      camera.left = this.getProperty('left') ?? -10;
      camera.right = this.getProperty('right') ?? 10;
      camera.top = this.getProperty('top') ?? 10;
      camera.bottom = this.getProperty('bottom') ?? -10;
      camera.near = this.getProperty('near') ?? 0.1;
      camera.far = this.getProperty('far') ?? 1000;
      camera.updateProjectionMatrix();
    }
  }

  dispose(): void {
    this.camera = null;
    super.dispose();
  }
}
