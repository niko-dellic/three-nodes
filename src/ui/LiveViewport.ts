import * as THREE from 'three';
import CameraControls from 'camera-controls';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import {
  EffectComposer,
  RenderPass,
  EffectPass,
  OutlineEffect,
  SMAAEffect,
  EdgeDetectionMode,
  SMAAPreset,
  BlendFunction,
} from 'postprocessing';
import { Graph } from '@/core/Graph';
import { SceneOutput } from '@/types';
import { PreviewManager } from './PreviewManager';
import { ViewportSelectionManager, SelectionMode } from './ViewportSelectionManager';
import { ObjectNodeMapper } from './ObjectNodeMapper';
import { HistoryManager } from './HistoryManager';
import { SelectionManager } from './SelectionManager';
import { ClipboardManager } from './ClipboardManager';

// Install camera-controls
CameraControls.install({ THREE });

export class LiveViewport {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private controls: CameraControls;
  private transformControls: TransformControls;
  private clock: THREE.Clock;
  private raycaster: THREE.Raycaster;
  private graph: Graph;
  private previewManager: PreviewManager | null = null;
  private viewportSelectionManager: ViewportSelectionManager;
  private objectNodeMapper: ObjectNodeMapper;
  private historyManager: HistoryManager | null = null;
  private selectionManager: SelectionManager | null = null;
  private clipboardManager: ClipboardManager | null = null;
  private animationId: number | null = null;

  // Post-processing for selection outline
  private composer: EffectComposer;
  private renderPass: RenderPass;
  private outlineEffect: OutlineEffect;
  private outlinePass: EffectPass;
  private smaaEffect: SMAAEffect | null = null;
  private smaaPass: EffectPass | null = null;

  private currentScene: THREE.Scene | null = null;
  private defaultCamera: THREE.PerspectiveCamera;
  private nodeControlledCamera: THREE.Camera | null = null;
  private isNodeCameraActive: boolean = false;

  // Interaction state
  private isTransformDragging: boolean = false;
  private pointerDownPos: THREE.Vector2 = new THREE.Vector2();
  private readonly CLICK_THRESHOLD = 5; // pixels

  constructor(container: HTMLElement, graph: Graph) {
    this.container = container;
    this.graph = graph;

    // Create renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setClearColor(0x1a1a1a);
    container.appendChild(this.renderer.domElement);

    // Create default camera for controls
    this.defaultCamera = graph.defaultCamera;

    // Create clock for camera controls
    this.clock = new THREE.Clock();

    // Create camera controls
    this.controls = new CameraControls(this.defaultCamera, this.renderer.domElement);

    // Create raycaster for selection
    this.raycaster = new THREE.Raycaster();

    // Create selection manager
    this.viewportSelectionManager = new ViewportSelectionManager();
    this.objectNodeMapper = new ObjectNodeMapper(graph);

    // Create transform controls
    this.transformControls = new TransformControls(this.defaultCamera, this.renderer.domElement);
    this.transformControls.addEventListener('dragging-changed', (event: any) => {
      this.controls.enabled = !event.value;
      this.isTransformDragging = event.value;
    });

    // Handle transform start/end for history
    this.transformControls.addEventListener('mouseDown', () => {
      if (this.historyManager) {
        this.historyManager.beginInteraction();
      }
    });

    this.transformControls.addEventListener('mouseUp', () => {
      if (this.historyManager) {
        this.historyManager.endInteraction();
      }
    });

    // Sync transforms when changed
    this.transformControls.addEventListener('objectChange', () => {
      const attachedObject = this.transformControls.object;
      if (attachedObject) {
        this.objectNodeMapper.syncTransformToNodes(attachedObject);
      }
    });

    // Add transform controls to scene (will be added properly in updateScene)
    // Note: TransformControls needs to be in the scene but not affected by graph changes

    // Create post-processing pipeline for selection outline using postprocessing library
    this.composer = new EffectComposer(this.renderer);

    // Create render pass
    this.renderPass = new RenderPass(this.graph.defaultScene, this.defaultCamera);
    this.composer.addPass(this.renderPass);

    // Create outline effect
    this.outlineEffect = new OutlineEffect(this.graph.defaultScene, this.defaultCamera, {
      blendFunction: BlendFunction.SCREEN,
      edgeStrength: 3,
      pulseSpeed: 0,
      visibleEdgeColor: 0xffffff,
      hiddenEdgeColor: 0x22090a,
      blur: false,
      xRay: true,
    });

    // Add effect pass with outline effect
    this.outlinePass = new EffectPass(this.defaultCamera, this.outlineEffect);
    this.composer.addPass(this.outlinePass);

    // Initialize SMAA anti-aliasing
    this.initializeSMAA();

    // Listen to selection changes to update outline
    this.viewportSelectionManager.onChange(() => {
      this.updateOutline();
    });
  }

  private async initializeSMAA(): Promise<void> {
    try {
      // Create SMAA effect for anti-aliasing the outline edges
      this.smaaEffect = new SMAAEffect({
        preset: SMAAPreset.HIGH,
        edgeDetectionMode: EdgeDetectionMode.COLOR,
      });

      // Set edge detection threshold (lower = more sensitive)
      this.smaaEffect.edgeDetectionMaterial.setEdgeDetectionThreshold(0.05);

      // Add SMAA pass after outline pass
      this.smaaPass = new EffectPass(this.defaultCamera, this.smaaEffect);
      this.composer.addPass(this.smaaPass);

      console.log('SMAA anti-aliasing initialized for outline effect');
    } catch (error) {
      console.warn('Failed to initialize SMAA, outline quality may be reduced:', error);
    }

    // Setup event listeners
    this.setupEventListeners();

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

  private setupEventListeners(): void {
    const canvas = this.renderer.domElement;

    // Pointer events for selection
    canvas.addEventListener('pointerdown', this.onPointerDown.bind(this));
    canvas.addEventListener('pointerup', this.onPointerUp.bind(this));

    // Keyboard events for transform mode and delete
    document.addEventListener('keydown', this.onKeyDown.bind(this));
  }

  private onPointerDown(event: PointerEvent): void {
    // Only handle left mouse button
    if (event.button !== 0) return;

    // Ignore if transform controls are being dragged
    if (this.isTransformDragging) return;

    // Store pointer position for click detection
    this.pointerDownPos.set(event.clientX, event.clientY);
  }

  private onPointerUp(event: PointerEvent): void {
    // Only handle left mouse button
    if (event.button !== 0) return;

    // Ignore if transform controls are being dragged
    if (this.isTransformDragging) return;

    // Check if this was a click (not a drag)
    const dx = event.clientX - this.pointerDownPos.x;
    const dy = event.clientY - this.pointerDownPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > this.CLICK_THRESHOLD) {
      // This was a drag, not a click
      return;
    }

    // Perform raycast selection
    this.performSelection(event);
  }

  private performSelection(event: PointerEvent): void {
    if (!this.currentScene) return;

    // Calculate mouse position in normalized device coordinates
    const rect = this.renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    // Update raycaster
    const activeCamera = this.getActiveCamera();
    this.raycaster.setFromCamera(mouse, activeCamera);

    // Get all intersectable objects from the scene (excluding helpers, controls, etc.)
    const intersectableObjects: THREE.Object3D[] = [];
    this.currentScene.traverse((object) => {
      // Skip transform controls, helpers, and objects without sourceNodeId
      if (!object.userData.sourceNodeId) return;

      // Only intersect with meshes, lines, and points
      if (
        object instanceof THREE.Mesh ||
        object instanceof THREE.Line ||
        object instanceof THREE.Points
      ) {
        intersectableObjects.push(object);
      }
    });

    // Perform raycast
    const intersects = this.raycaster.intersectObjects(intersectableObjects, true);

    if (intersects.length > 0) {
      // Find the root object with sourceNodeId (traverse up the hierarchy)
      let selectedObject = intersects[0].object;
      while (selectedObject && !selectedObject.userData.sourceNodeId && selectedObject.parent) {
        selectedObject = selectedObject.parent;
      }

      if (selectedObject && selectedObject.userData.sourceNodeId) {
        // Determine selection mode based on modifier keys
        let mode: SelectionMode = 'replace';
        if (event.shiftKey) {
          mode = 'add';
        } else if (event.ctrlKey || event.metaKey) {
          mode = 'toggle';
        }

        this.viewportSelectionManager.selectObject(selectedObject, mode);

        // Attach transform controls to primary selection
        const primarySelection = this.viewportSelectionManager.getPrimarySelection();
        if (primarySelection) {
          this.transformControls.attach(primarySelection);
        }
      }
    } else {
      // Click on empty space - deselect all
      if (!event.shiftKey && !event.ctrlKey && !event.metaKey) {
        this.viewportSelectionManager.clearSelection();
        this.transformControls.detach();
      }
    }
  }

  private updateOutline(): void {
    const selectedObjects = this.viewportSelectionManager.getSelectedObjectsArray();

    // Clear previous selection
    this.outlineEffect.selection.clear();

    // Add selected objects to outline effect
    for (const obj of selectedObjects) {
      // Collect all meshes from the selected object hierarchy
      obj.traverse((child) => {
        if (
          child instanceof THREE.Mesh ||
          child instanceof THREE.Line ||
          child instanceof THREE.Points
        ) {
          this.outlineEffect.selection.add(child);
        }
      });
    }
  }

  private onKeyDown(event: KeyboardEvent): void {
    // Ignore if typing in an input
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }

    // Check for modifier + key combinations
    if (event.ctrlKey || event.metaKey) {
      if (event.key === 'c' || event.key === 'C') {
        // Copy
        event.preventDefault();
        this.copySelectedObjects();
        return;
      } else if (event.key === 'v' || event.key === 'V') {
        // Paste
        event.preventDefault();
        this.pasteObjects();
        return;
      } else if (event.key === 'x' || event.key === 'X') {
        // Cut
        event.preventDefault();
        this.cutSelectedObjects();
        return;
      }
    }

    // Transform mode shortcuts (1, 2, 3)
    if (event.key === '1') {
      this.transformControls.setMode('translate');
      console.log('Transform mode: translate');
    } else if (event.key === '2') {
      this.transformControls.setMode('rotate');
      console.log('Transform mode: rotate');
    } else if (event.key === '3') {
      this.transformControls.setMode('scale');
      console.log('Transform mode: scale');
    }

    // Delete selected objects
    if (event.key === 'Delete' || event.key === 'Backspace') {
      this.deleteSelectedObjects();
    }
  }

  private copySelectedObjects(): void {
    if (!this.selectionManager || !this.clipboardManager) {
      console.warn('SelectionManager or ClipboardManager not available');
      return;
    }

    const selectedObjects = this.viewportSelectionManager.getSelectedObjectsArray();
    if (selectedObjects.length === 0) {
      console.log('No objects selected to copy');
      return;
    }

    // Get source node IDs from selected objects
    const nodeIds = new Set<string>();
    for (const obj of selectedObjects) {
      const sourceNodeId = obj.userData.sourceNodeId;
      if (sourceNodeId) {
        nodeIds.add(sourceNodeId);
      }
    }

    if (nodeIds.size === 0) {
      console.log('No source nodes found for selected objects');
      return;
    }

    // Select the nodes in the graph selection manager
    this.selectionManager.selectNodes(Array.from(nodeIds), 'replace');

    // Use clipboard manager to copy
    this.clipboardManager.copy();

    console.log(`Copied ${nodeIds.size} node(s) from viewport`);
  }

  private cutSelectedObjects(): void {
    if (!this.selectionManager || !this.clipboardManager) {
      console.warn('SelectionManager or ClipboardManager not available');
      return;
    }

    const selectedObjects = this.viewportSelectionManager.getSelectedObjectsArray();
    if (selectedObjects.length === 0) {
      console.log('No objects selected to cut');
      return;
    }

    // Get source node IDs from selected objects
    const nodeIds = new Set<string>();
    for (const obj of selectedObjects) {
      const sourceNodeId = obj.userData.sourceNodeId;
      if (sourceNodeId) {
        nodeIds.add(sourceNodeId);
      }
    }

    if (nodeIds.size === 0) {
      console.log('No source nodes found for selected objects');
      return;
    }

    // Select the nodes in the graph selection manager
    this.selectionManager.selectNodes(Array.from(nodeIds), 'replace');

    // Use clipboard manager to cut
    this.clipboardManager.cut();

    // Clear viewport selection
    this.viewportSelectionManager.clearSelection();
    this.transformControls.detach();

    console.log(`Cut ${nodeIds.size} node(s) from viewport`);
  }

  private pasteObjects(): void {
    if (!this.clipboardManager) {
      console.warn('ClipboardManager not available');
      return;
    }

    // Paste at a fixed offset (graph editor will handle node positioning)
    this.clipboardManager.paste();

    console.log('Pasted objects from clipboard');
  }

  private deleteSelectedObjects(): void {
    if (!this.selectionManager) {
      console.warn('SelectionManager not available');
      return;
    }

    const selectedObjects = this.viewportSelectionManager.getSelectedObjectsArray();
    if (selectedObjects.length === 0) return;

    // Get source node IDs from selected objects
    const nodeIds = new Set<string>();
    for (const obj of selectedObjects) {
      const sourceNodeId = obj.userData.sourceNodeId;
      if (sourceNodeId) {
        nodeIds.add(sourceNodeId);
      }
    }

    if (nodeIds.size === 0) {
      console.log('No source nodes found for selected objects');
      return;
    }

    // Remove the nodes from the graph (this will update the scene)
    for (const nodeId of nodeIds) {
      const node = this.graph.getNode(nodeId);
      if (node) {
        this.graph.removeNode(nodeId);
      }
    }

    // Detach transform controls
    this.transformControls.detach();

    // Clear selection
    this.viewportSelectionManager.clearSelection();

    // Record history if available
    if (this.historyManager) {
      this.historyManager.recordState();
    }

    console.log(`Deleted ${nodeIds.size} node(s) from viewport`);
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

          // Add transform controls gizmo to scene
          const gizmo = this.transformControls.getHelper();
          if (this.currentScene && !this.currentScene.children.includes(gizmo)) {
            this.currentScene.add(gizmo);
          }

          // Recreate composer with new scene
          this.recreateComposer(this.currentScene, this.defaultCamera);

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

    // Add transform controls gizmo to default scene
    const gizmo = this.transformControls.getHelper();
    if (this.currentScene && !this.currentScene.children.includes(gizmo)) {
      this.currentScene.add(gizmo);
    }

    // Recreate composer with new scene
    this.recreateComposer(this.currentScene, this.defaultCamera);
  }

  private recreateComposer(scene: THREE.Scene, camera: THREE.Camera): void {
    // Dispose old composer
    this.composer.dispose();
    this.outlineEffect.dispose();

    // Create new composer with updated scene/camera
    this.composer = new EffectComposer(this.renderer);

    this.renderPass = new RenderPass(scene, camera);
    this.composer.addPass(this.renderPass);

    this.outlineEffect = new OutlineEffect(scene, camera, {
      blendFunction: BlendFunction.SCREEN,
      multisampling: Math.min(4, this.renderer.capabilities.maxSamples),
      edgeStrength: 2.5,
      pulseSpeed: 0,
      visibleEdgeColor: 0xffffff,
      hiddenEdgeColor: 0x22090a,
      height: 480,
      blur: false,
      xRay: true,
    });

    this.outlinePass = new EffectPass(camera, this.outlineEffect);
    this.composer.addPass(this.outlinePass);

    // Re-add SMAA if it was initialized
    if (this.smaaEffect && this.smaaPass) {
      this.smaaPass = new EffectPass(camera, this.smaaEffect);
      this.composer.addPass(this.smaaPass);
    }

    // Restore selection
    this.updateOutline();
  }

  private updateControlsCamera(): void {
    // Always use default camera for camera controls
    // This gives the user consistent control over the viewport regardless of preview mode
    this.controls.camera = this.defaultCamera;
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

  setHistoryManager(historyManager: HistoryManager): void {
    this.historyManager = historyManager;
  }

  setSelectionManager(selectionManager: SelectionManager): void {
    this.selectionManager = selectionManager;
  }

  setClipboardManager(clipboardManager: ClipboardManager): void {
    this.clipboardManager = clipboardManager;
  }

  private startRenderLoop(): void {
    const animate = () => {
      // Only update controls if not using node-controlled camera
      if (!this.isNodeCameraActive) {
        const delta = this.clock.getDelta();
        this.controls.update(delta);
      }

      // Render the scene with post-processing
      if (this.currentScene) {
        // Render with post-processing (includes outline)
        this.composer.render();
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
    this.composer.setSize(width, height);

    // Update outline effect resolution (scale down for performance)
    this.outlineEffect.resolution.height = Math.min(height, 720);

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

  /**
   * Get the viewport selection manager for external access
   */
  getViewportSelectionManager(): ViewportSelectionManager {
    return this.viewportSelectionManager;
  }

  /**
   * Get the object node mapper for external access
   */
  getObjectNodeMapper(): ObjectNodeMapper {
    return this.objectNodeMapper;
  }

  /**
   * Fit camera to selected objects with preview geometry
   */
  fitToSelectedObjects(): void {
    if (!this.selectionManager || !this.previewManager) {
      console.warn('SelectionManager or PreviewManager not available for fit-to-sphere');
      return;
    }

    // Get selected node IDs
    const selectedNodeIds = this.selectionManager.getSelectedNodes();
    console.log('selectedNodeIds', selectedNodeIds);
    if (selectedNodeIds.size === 0) {
      console.log('No nodes selected');
      return;
    }

    // Collect all objects that have preview geometry from selected nodes
    const objectsToFit: THREE.Object3D[] = [];

    // First, check viewport selection (objects directly selected in 3D view)
    const viewportSelectedObjects = this.viewportSelectionManager.getSelectedObjectsArray();
    objectsToFit.push(...viewportSelectedObjects);

    // If no viewport selection, search the current scene for objects with matching sourceNodeId
    if (objectsToFit.length === 0 && this.currentScene) {
      for (const nodeId of selectedNodeIds) {
        // Traverse the scene to find objects with this sourceNodeId
        this.currentScene.traverse((obj) => {
          if (obj.userData.sourceNodeId === nodeId) {
            // Only add meshes, lines, and points (not helpers or other objects)
            if (
              obj instanceof THREE.Mesh ||
              obj instanceof THREE.Line ||
              obj instanceof THREE.Points ||
              obj instanceof THREE.Group
            ) {
              objectsToFit.push(obj);
            }
          }
        });
      }
    }

    if (objectsToFit.length === 0) {
      console.log('No preview geometry found for selected nodes');
      return;
    }

    // Calculate bounding sphere for all selected objects
    const box = new THREE.Box3();
    for (const obj of objectsToFit) {
      box.expandByObject(obj);
    }

    if (box.isEmpty()) {
      console.log('Bounding box is empty');
      return;
    }

    const sphere = new THREE.Sphere();
    box.getBoundingSphere(sphere);

    // Fit camera to the bounding sphere with animation
    this.controls.fitToSphere(sphere, true);

    console.log(`Fitted camera to ${objectsToFit.length} object(s)`);
  }

  destroy(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    this.controls.dispose();
    this.transformControls.dispose();
    this.outlineEffect.dispose();
    if (this.smaaEffect) {
      this.smaaEffect.dispose();
    }
    this.composer.dispose();
    this.renderer.dispose();
  }
}
