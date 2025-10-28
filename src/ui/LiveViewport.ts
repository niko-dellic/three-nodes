import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Graph } from '@/core/Graph';
import { SceneOutput } from '@/types';
import { PreviewManager } from './PreviewManager';

export class LiveViewport {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private graph: Graph;
  private previewManager: PreviewManager | null = null;
  private animationId: number | null = null;

  private currentScene: THREE.Scene | null = null;
  private defaultCamera: THREE.PerspectiveCamera;
  private nodeControlledCamera: THREE.Camera | null = null;
  private isNodeCameraActive: boolean = false;

  constructor(container: HTMLElement, graph: Graph) {
    this.container = container;
    this.graph = graph;

    // Create renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setClearColor(0x1a1a1a);
    container.appendChild(this.renderer.domElement);

    // Create default camera for controls
    this.defaultCamera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    this.defaultCamera.position.set(0, 0, 5);

    // Create orbit controls
    this.controls = new OrbitControls(this.defaultCamera, this.renderer.domElement);
    this.controls.enableDamping = true;

    // Listen to graph changes
    this.graph.onChange(() => this.updateScene());

    // Start render loop
    this.startRenderLoop();

    // Handle resize
    window.addEventListener('resize', () => this.handleResize());
    this.handleResize();

    // Initial update
    this.updateScene();
  }

  private updateScene(): void {
    // Find SceneOutputNode
    for (const node of this.graph.nodes.values()) {
      if (node.type === 'SceneOutputNode') {
        const output = node.outputs.get('output');
        if (output && output.value) {
          const sceneOutput = output.value as unknown as SceneOutput;
          this.currentScene = sceneOutput.scene;

          // Update preview manager with the current baked scene
          if (this.previewManager) {
            this.previewManager.setBakedScene(this.currentScene);
          }

          // Update controls camera (always uses default camera)
          this.updateControlsCamera();
          return;
        }
      }
    }

    // No scene output found - use default scene for preview
    this.currentScene = this.graph.defaultScene;
    if (this.previewManager) {
      this.previewManager.setBakedScene(null); // null means use default scene
    }
  }

  private updateControlsCamera(): void {
    // Always use default camera for orbit controls
    // This gives the user consistent control over the viewport regardless of preview mode
    this.controls.object = this.defaultCamera;
  }

  setPreviewManager(previewManager: PreviewManager): void {
    this.previewManager = previewManager;
    this.previewManager.onChange(() => {
      this.updateScene();
      this.updateControlsCamera();
    });
    // Immediately update controls camera after setting preview manager
    this.updateControlsCamera();
  }

  private startRenderLoop(): void {
    const animate = () => {
      // Only update controls if not using node-controlled camera
      if (!this.isNodeCameraActive) {
        this.controls.update();
      }

      // Always render the baked scene (with active camera)
      if (this.currentScene) {
        // Use active camera (node-controlled or default)
        const activeCamera = this.getActiveCamera();
        this.renderer.render(this.currentScene, activeCamera);
      } else {
        // Render empty scene
        this.renderer.clear();
      }

      this.animationId = requestAnimationFrame(animate);
    };
    animate();
  }

  private handleResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.renderer.setSize(width, height);

    // Update default camera aspect ratio
    this.defaultCamera.aspect = width / height;
    this.defaultCamera.updateProjectionMatrix();
  }

  setControlsEnabled(enabled: boolean): void {
    this.controls.enabled = enabled;
  }

  /**
   * Set the active camera for the viewport
   * Pass null to release control back to orbit controls
   */
  setActiveCamera(camera: THREE.Camera | null): void {
    this.nodeControlledCamera = camera;
    this.isNodeCameraActive = camera !== null;

    // Disable orbit controls when node camera is active
    this.controls.enabled = !this.isNodeCameraActive;
  }

  /**
   * Get the current active camera (node-controlled or default)
   */
  private getActiveCamera(): THREE.Camera {
    return this.isNodeCameraActive && this.nodeControlledCamera
      ? this.nodeControlledCamera
      : this.defaultCamera;
  }

  destroy(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    this.renderer.dispose();
  }
}
