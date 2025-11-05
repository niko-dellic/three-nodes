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
import { Node as GraphNode } from '@/core/Node';
import { SceneOutput } from '@/types';
import { PreviewManager } from './PreviewManager/PreviewManager';
import { ViewportSelectionManager, SelectionMode } from './ViewportSelectionManager';
import { ObjectNodeMapper } from './ObjectNodeMapper';
import { ViewModeManager } from './ViewModeManager';
import { SelectionManager } from './SelectionManager';
import { NodeRegistry } from '@/three/NodeRegistry';

export class LiveViewport {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private controls: CameraControls;
  public transformControls: TransformControls;
  private clock: THREE.Clock;
  private raycaster: THREE.Raycaster;
  private graph: Graph;
  private registry: NodeRegistry; // Will be used for future viewport copy/paste implementation
  private previewManager: PreviewManager | null = null;
  private viewportSelectionManager: ViewportSelectionManager;
  private objectNodeMapper: ObjectNodeMapper;
  private viewModeManager: ViewModeManager | null = null;
  private graphSelectionManager?: SelectionManager;
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

  // Track pending transform node ID to reselect after scene update
  private pendingTransformNodeId: string | null = null;

  constructor(graph: Graph, registry: NodeRegistry, appContainer: HTMLElement) {
    // Create viewport container (3D view - background layer)
    this.container = document.createElement('div');
    this.container.id = 'viewport';
    appContainer.appendChild(this.container);

    this.graph = graph;
    this.registry = registry;

    // Create renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setClearColor(0x1a1a1a);
    this.container.appendChild(this.renderer.domElement);

    // Create default camera for controls
    this.defaultCamera = graph.camera;

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

    // Update transform nodes when transform operation completes (not during dragging)
    this.transformControls.addEventListener('mouseUp', () => {
      const attachedObject = this.transformControls.object;
      if (attachedObject && attachedObject.userData.sourceNodeId) {
        // Store reference before detaching
        const originalObject = attachedObject;

        // Detach transform controls before scene updates
        this.transformControls.detach();

        // Create or update transform nodes and get the transform node ID
        const transformNodeId = this.ensureTransformNodes(originalObject);

        // Store the transform node ID to track when scene updates
        if (transformNodeId) {
          this.pendingTransformNodeId = transformNodeId;
        }

        // Wait for scene to update, then find and select the new object
        // This applies both when creating new nodes and updating existing ones
        requestAnimationFrame(() => {
          this.reselectTransformedObject(originalObject);
        });
      }
    });

    // Add transform controls to scene (will be added properly in updateScene)
    // Note: TransformControls needs to be in the scene but not affected by graph changes

    // Create post-processing pipeline for selection outline using postprocessing library
    this.composer = new EffectComposer(this.renderer);

    // Create render pass
    this.renderPass = new RenderPass(this.graph.scene, this.defaultCamera);
    this.composer.addPass(this.renderPass);

    // Create outline effect
    this.outlineEffect = new OutlineEffect(this.graph.scene, this.defaultCamera, {
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

          // Add gizmo to scene when attaching to an object
          const gizmo = this.transformControls.getHelper();
          if (this.currentScene && !this.currentScene.children.includes(gizmo)) {
            this.currentScene.add(gizmo);
          }
        }
      }
    } else {
      // Click on empty space - deselect all
      if (!event.shiftKey && !event.ctrlKey && !event.metaKey) {
        this.viewportSelectionManager.clearSelection();
        this.transformControls.detach();

        // Remove gizmo from scene when detaching
        const gizmo = this.transformControls.getHelper();
        if (this.currentScene && this.currentScene.children.includes(gizmo)) {
          this.currentScene.remove(gizmo);
        }
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
    // Only allow copy in viewport mode to prevent double-pasting
    if (!this.viewModeManager || this.viewModeManager.getCurrentMode() !== 'viewport') {
      return;
    }

    const selectedObjects = this.viewportSelectionManager.getSelectedObjectsArray();
    if (selectedObjects.length === 0) {
      console.log('No objects selected to copy in viewport');
      return;
    }

    // Get source node IDs from selected objects
    const sourceNodeIds = new Set<string>();
    for (const obj of selectedObjects) {
      if (obj.userData.sourceNodeId) {
        sourceNodeIds.add(obj.userData.sourceNodeId);
      }
    }

    if (sourceNodeIds.size === 0) {
      console.log('No source nodes found for selected objects');
      return;
    }

    // Collect all nodes in the dependency chain for each source node
    const nodesToCopy = new Set<string>();
    const visitedNodes = new Set<string>();

    const collectDependencies = (nodeId: string) => {
      if (visitedNodes.has(nodeId)) return;
      visitedNodes.add(nodeId);

      const node = this.graph.getNode(nodeId);
      if (!node) return;

      nodesToCopy.add(nodeId);

      // Traverse all input connections to find upstream nodes
      for (const input of node.inputs.values()) {
        for (const edge of input.connections) {
          const upstreamNodeId = edge.source.node.id;
          collectDependencies(upstreamNodeId);
        }
      }
    };

    // Collect dependencies for all selected nodes
    for (const nodeId of sourceNodeIds) {
      collectDependencies(nodeId);
    }

    console.log(`Copied ${nodesToCopy.size} node(s) (including dependencies) from viewport`);
  }

  private cutSelectedObjects(): void {
    // Only allow cut in viewport mode to prevent double-pasting
    if (!this.viewModeManager || this.viewModeManager.getCurrentMode() !== 'viewport') {
      return;
    }

    // Copy first, then delete
    this.copySelectedObjects();

    const selectedObjects = this.viewportSelectionManager.getSelectedObjectsArray();
    if (selectedObjects.length === 0) return;

    // Get source node IDs
    const nodeIds = new Set<string>();
    for (const obj of selectedObjects) {
      if (obj.userData.sourceNodeId) {
        nodeIds.add(obj.userData.sourceNodeId);
      }
    }

    // Delete only the directly selected nodes (not their dependencies)
    for (const nodeId of nodeIds) {
      this.graph.removeNode(nodeId);
    }

    // Clear viewport selection
    this.viewportSelectionManager.clearSelection();
    this.transformControls.detach();

    const gizmo = this.transformControls.getHelper();
    if (this.currentScene && this.currentScene.children.includes(gizmo)) {
      this.currentScene.remove(gizmo);
    }

    console.log(`Cut ${nodeIds.size} node(s) from viewport`);
  }

  private pasteObjects(): void {
    // Only allow paste in viewport mode to prevent double-pasting
    if (!this.viewModeManager || this.viewModeManager.getCurrentMode() !== 'viewport') {
      return;
    }

    // TODO: Implement actual paste from viewport clipboard once copy is storing data
    console.log('Viewport paste: Node chain duplication ready - full implementation pending');
  }

  private deleteSelectedObjects(): void {
    // Allow delete in viewport mode
    if (!this.viewModeManager || this.viewModeManager.getCurrentMode() !== 'viewport') {
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

    // Remove gizmo from scene when detaching
    const gizmo = this.transformControls.getHelper();
    if (this.currentScene && this.currentScene.children.includes(gizmo)) {
      this.currentScene.remove(gizmo);
    }

    // Clear selection
    this.viewportSelectionManager.clearSelection();

    console.log(`Deleted ${nodeIds.size} node(s) from viewport`);
  }

  /**
   * After transforming, find and select the new object output by the TransformNode
   */
  private reselectTransformedObject(originalObject: THREE.Object3D, retryCount = 0): void {
    if (!this.currentScene) return;

    // Maximum retries to prevent infinite loops
    const MAX_RETRIES = 20;
    if (retryCount > MAX_RETRIES) {
      console.warn('Could not find transformed object after maximum retries');
      this.pendingTransformNodeId = null;
      return;
    }

    // Use pending transform node ID if available
    const transformNodeId = this.pendingTransformNodeId;

    if (!transformNodeId) {
      // Fallback: try to find transform node from original object
      const transformNodes = this.objectNodeMapper.findTransformNodes(originalObject);
      const transformNode = transformNodes.transformNode;

      if (!transformNode) {
        // No transform node yet, check if original object is still in scene
        if (this.isObjectInScene(originalObject)) {
          this.viewportSelectionManager.selectObject(originalObject, 'replace');
          this.transformControls.attach(originalObject);
        }
        return;
      }
    }

    // Find the new object in the scene with sourceNodeId matching the TransformNode
    let newObject: THREE.Object3D | null = null;
    const searchId =
      transformNodeId || this.objectNodeMapper.findTransformNodes(originalObject).transformNode?.id;

    if (searchId) {
      this.currentScene.traverse((obj) => {
        if (
          obj.userData.sourceNodeId === searchId &&
          (obj instanceof THREE.Mesh || obj instanceof THREE.Group || obj instanceof THREE.Line)
        ) {
          newObject = obj;
        }
      });
    }

    if (newObject) {
      // Select the new transformed object
      this.viewportSelectionManager.selectObject(newObject, 'replace');
      this.transformControls.attach(newObject);
      this.pendingTransformNodeId = null; // Clear pending ID
      if (retryCount > 0) {
        console.log(`Successfully reselected transformed object (retry ${retryCount})`);
      }
    } else {
      // TransformNode exists but new object not in scene yet - keep retrying
      // This happens when the node is first created and the graph is still evaluating
      requestAnimationFrame(() => {
        this.reselectTransformedObject(originalObject, retryCount + 1);
      });
    }
  }

  /**
   * Check if an object is part of the current scene graph
   */
  private isObjectInScene(object: THREE.Object3D): boolean {
    if (!this.currentScene) return false;

    let current = object;
    while (current.parent) {
      if (current.parent === this.currentScene) {
        return true;
      }
      current = current.parent;
    }
    return false;
  }

  /**
   * Ensure transform nodes exist for an object and insert them if they don't
   * Creates or updates TransformNode with Vector3 nodes based on current transform
   * Returns the TransformNode ID if a transform node exists/was created
   */
  private ensureTransformNodes(object: THREE.Object3D): string | null {
    const sourceNodeId = object.userData.sourceNodeId;
    if (!sourceNodeId) return null;

    const sourceNode = this.graph.getNode(sourceNodeId);
    if (!sourceNode) return null;

    // Check if transform nodes already exist
    const transformNodes = this.objectNodeMapper.findTransformNodes(object);

    // Get current mode from transform controls
    const mode = this.transformControls.getMode();

    // Find or create Transform node and Vector3 nodes
    if (mode === 'translate') {
      if (transformNodes.positionVector3Node) {
        // Update existing Vector3 node
        this.updateVector3Node(
          transformNodes.positionVector3Node,
          object.position,
          transformNodes.transformNode
        );
        return transformNodes.transformNode?.id ?? null;
      } else {
        // Create Transform node if it doesn't exist, or add position to existing
        return this.createOrUpdateTransformNode(sourceNode, object, 'position');
      }
    } else if (mode === 'rotate') {
      if (transformNodes.rotationVector3Node) {
        // Update existing Vector3 node
        this.updateVector3Node(
          transformNodes.rotationVector3Node,
          object.rotation,
          transformNodes.transformNode
        );
        return transformNodes.transformNode?.id ?? null;
      } else {
        // Create Transform node if it doesn't exist, or add rotation to existing
        return this.createOrUpdateTransformNode(sourceNode, object, 'rotation');
      }
    } else if (mode === 'scale') {
      if (transformNodes.scaleVector3Node) {
        // Update existing Vector3 node
        this.updateVector3Node(
          transformNodes.scaleVector3Node,
          object.scale,
          transformNodes.transformNode
        );
        return transformNodes.transformNode?.id ?? null;
      } else {
        // Create Transform node if it doesn't exist, or add scale to existing
        return this.createOrUpdateTransformNode(sourceNode, object, 'scale');
      }
    }

    return null;
  }

  /**
   * Update an existing Vector3 node with new values
   */
  private updateVector3Node(
    vector3Node: GraphNode,
    values: THREE.Vector3 | THREE.Euler,
    transformNode?: GraphNode
  ): void {
    if ('setVector' in vector3Node && typeof vector3Node.setVector === 'function') {
      (vector3Node as any).setVector(values.x, values.y, values.z);
      vector3Node.markDirty();

      // Select the Transform node (not the Vector3) to keep preview visible
      if (this.graphSelectionManager && transformNode) {
        this.graphSelectionManager.selectNode(transformNode.id, 'replace');
      }
    }
  }

  /**
   * Create or update Transform node with Vector3 nodes
   * Returns the TransformNode ID
   */
  private createOrUpdateTransformNode(
    sourceNode: GraphNode,
    object: THREE.Object3D,
    transformType: 'position' | 'rotation' | 'scale'
  ): string | null {
    // Check if a Transform node already exists
    const transformNodes = this.objectNodeMapper.findTransformNodes(object);
    let transformNode = transformNodes.transformNode;

    // Create Transform node if it doesn't exist
    if (!transformNode) {
      const newTransformNode = this.registry.createNode('TransformNode');
      if (!newTransformNode) return null;
      transformNode = newTransformNode;

      transformNode.label = 'Transform';
      transformNode.position = { x: sourceNode.position.x + 150, y: sourceNode.position.y };
      this.graph.addNode(transformNode);

      // Connect source to Transform node
      let sourceOutput = null;
      for (const output of sourceNode.outputs.values()) {
        if (output.type === 'object3d') {
          sourceOutput = output;
          break;
        }
      }

      if (sourceOutput) {
        const transformInput = transformNode.inputs.get('object');
        if (transformInput) {
          this.graph.connect(sourceOutput, transformInput);
        }
      }
    }

    // Create Vector3 node for the specific transform type
    const vector3Node = this.registry.createNode('Vector3Node');
    if (!vector3Node) return transformNode.id;

    let values: THREE.Vector3 | THREE.Euler;
    let yOffset = 0;

    switch (transformType) {
      case 'position':
        vector3Node.label = 'Position';
        values = object.position;
        yOffset = 0;
        break;
      case 'rotation':
        vector3Node.label = 'Rotation';
        values = object.rotation;
        yOffset = 100;
        break;
      case 'scale':
        vector3Node.label = 'Scale';
        values = object.scale;
        yOffset = 200;
        break;
    }

    vector3Node.position = {
      x: transformNode.position.x - 250,
      y: transformNode.position.y + yOffset,
    };

    // Set the values using the setVector method
    if ('setVector' in vector3Node && typeof vector3Node.setVector === 'function') {
      (vector3Node as any).setVector(values.x, values.y, values.z);
    }

    this.graph.addNode(vector3Node);

    // Find Vector3 output port by type
    let vector3Output = null;
    for (const output of vector3Node.outputs.values()) {
      if (output.type === 'vector3') {
        vector3Output = output;
        break;
      }
    }

    // Connect Vector3 to Transform node
    if (vector3Output) {
      const transformInput = transformNode.inputs.get(transformType);
      if (transformInput) {
        this.graph.connect(vector3Output, transformInput);
      }
    }

    // Select the Transform node in the graph editor
    if (this.graphSelectionManager) {
      this.graphSelectionManager.selectNode(transformNode.id, 'replace');
    }

    console.log(`Created/Updated Transform node with ${transformType} for ${sourceNode.label}`);

    return transformNode.id;
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

          // Recreate composer with new scene
          this.recreateComposer(this.currentScene, this.defaultCamera);

          // Update controls camera (always uses default camera)
          this.updateControlsCamera();
          return;
        }
      }
    }

    // No scene output found - use default scene for preview
    this.currentScene = this.graph.scene;
    if (this.previewManager) {
      this.previewManager.setBakedScene(null); // null means use default scene
    }

    // Recreate composer with new scene

    this.recreateComposer(this.currentScene, this.defaultCamera);
  }

  private recreateComposer(scene: THREE.Scene, camera: THREE.Camera): void {
    // Dispose all existing passes before disposing composer
    if (this.composer && this.composer.passes) {
      this.composer.passes.forEach((pass) => {
        if (pass.dispose) {
          pass.dispose();
        }
      });
    }

    // Dispose old composer and effects
    if (this.composer) {
      this.composer.dispose();
    }
    if (this.outlineEffect) {
      this.outlineEffect.dispose();
    }

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
      // Don't call updateScene() here - it unnecessarily recreates the composer
      // when preview overlays change (which happens on every selection change)
      // The scene is already updated via graph.onChange() callback
      this.updateControlsCamera();
    });
    // Immediately update controls camera after setting preview manager
    this.updateControlsCamera();
  }

  /**
   * Set the view mode manager to enable mode-aware copy/paste
   * Copy/paste in viewport only works when in viewport mode (not editor mode)
   */
  setViewModeManager(viewModeManager: ViewModeManager): void {
    this.viewModeManager = viewModeManager;
  }

  setGraphSelectionManager(selectionManager: SelectionManager): void {
    this.graphSelectionManager = selectionManager;
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
    if (!this.previewManager) {
      console.warn('PreviewManager not available for fit-to-sphere');
      return;
    }

    // Get selected objects from viewport selection manager
    const viewportSelectedObjects = this.viewportSelectionManager.getSelectedObjectsArray();
    const selectedNodeIds = new Set<string>();
    for (const obj of viewportSelectedObjects) {
      if (obj.userData.sourceNodeId) {
        selectedNodeIds.add(obj.userData.sourceNodeId);
      }
    }
    console.log('selectedNodeIds', selectedNodeIds);
    if (selectedNodeIds.size === 0) {
      console.log('No nodes selected');
      return;
    }

    // Collect all objects that have preview geometry from selected nodes
    const objectsToFit: THREE.Object3D[] = [];

    // First, check viewport selection (objects directly selected in 3D view)
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
