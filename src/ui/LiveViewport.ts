import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Graph } from '@/core/Graph';
import { SceneOutput } from '@/types';

export class LiveViewport {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private graph: Graph;
  private animationId: number | null = null;

  private currentScene: THREE.Scene | null = null;
  private currentCamera: THREE.Camera | null = null;

  constructor(container: HTMLElement, graph: Graph) {
    this.container = container;
    this.graph = graph;

    // Create renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setClearColor(0x1a1a1a);
    container.appendChild(this.renderer.domElement);

    // Create default camera for controls
    const defaultCamera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    defaultCamera.position.set(0, 0, 5);

    // Create orbit controls
    this.controls = new OrbitControls(defaultCamera, this.renderer.domElement);
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
          this.currentCamera = sceneOutput.camera;

          // Update controls camera if we have a new camera
          if (this.currentCamera) {
            this.controls.object = this.currentCamera as THREE.PerspectiveCamera;
          }
          return;
        }
      }
    }
  }

  private startRenderLoop(): void {
    const animate = () => {
      this.controls.update();

      if (this.currentScene && this.currentCamera) {
        this.renderer.render(this.currentScene, this.currentCamera);
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

    if (this.currentCamera && 'aspect' in this.currentCamera) {
      (this.currentCamera as THREE.PerspectiveCamera).aspect = width / height;
      (this.currentCamera as THREE.PerspectiveCamera).updateProjectionMatrix();
    }
  }

  setControlsEnabled(enabled: boolean): void {
    this.controls.enabled = enabled;
  }

  destroy(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    this.renderer.dispose();
  }
}
