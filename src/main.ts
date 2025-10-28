import './style.css';
import { Graph } from '@/core/Graph';
import { createDefaultRegistry } from '@/three';
import { GraphEditor, LiveViewport, ViewModeManager, PreviewManager } from '@/ui';

// Create the node registry
const registry = createDefaultRegistry();

// Create the graph
const graph = new Graph();

// Build example scene: A rotating cube
// Node positions are laid out left to right

// 1. Create number inputs for box dimensions

const widthNode = registry.createNode('NumberSliderNode', 'width-node')!;
widthNode.position = { x: 50, y: 100 };
widthNode.label = 'Width';
widthNode.setProperty('default', 2);
(widthNode as any).setValue(2); // Set the current value
graph.addNode(widthNode);

const heightNode = registry.createNode('NumberNode', 'height-node')!;
heightNode.position = { x: 50, y: 200 };
heightNode.label = 'Height';
heightNode.inputs.get('value')!.value = 2;
graph.addNode(heightNode);

const depthNode = registry.createNode('NumberNode', 'depth-node')!;
depthNode.position = { x: 50, y: 300 };
depthNode.label = 'Depth';
depthNode.inputs.get('value')!.value = 2;
graph.addNode(depthNode);

// 2. Create box geometry
const boxGeoNode = registry.createNode('BoxGeometryNode', 'box-geo')!;
boxGeoNode.position = { x: 300, y: 200 };
graph.addNode(boxGeoNode);

// Connect dimensions to box geometry
graph.connect(widthNode.outputs.get('value')!, boxGeoNode.inputs.get('width')!);
graph.connect(heightNode.outputs.get('result')!, boxGeoNode.inputs.get('height')!);
graph.connect(depthNode.outputs.get('result')!, boxGeoNode.inputs.get('depth')!);

// 3. Create color for material
const colorNode = registry.createNode('ColorPickerNode', 'color-picker')!;
colorNode.position = { x: 300, y: 400 };
graph.addNode(colorNode);

// 4. Create material
const materialNode = registry.createNode('MeshStandardMaterialNode', 'material')!;
materialNode.position = { x: 550, y: 350 };
graph.addNode(materialNode);

graph.connect(colorNode.outputs.get('color')!, materialNode.inputs.get('color')!);

// 5. Create mesh
const meshNode = registry.createNode('CreateMeshNode', 'mesh')!;
meshNode.position = { x: 800, y: 250 };
graph.addNode(meshNode);

graph.connect(boxGeoNode.outputs.get('geometry')!, meshNode.inputs.get('geometry')!);
graph.connect(materialNode.outputs.get('material')!, meshNode.inputs.get('material')!);

// 6. Create scene
const sceneNode = registry.createNode('SceneNode', 'scene')!;
sceneNode.position = { x: 800, y: 50 };
graph.addNode(sceneNode);

// 7. Create camera
const cameraPosNode = registry.createNode('Vector3Node', 'camera-pos')!;
cameraPosNode.position = { x: 800, y: 450 };
cameraPosNode.inputs.get('x')!.value = 0;
cameraPosNode.inputs.get('y')!.value = 0;
cameraPosNode.inputs.get('z')!.value = 5;
graph.addNode(cameraPosNode);

const cameraNode = registry.createNode('PerspectiveCameraNode', 'camera')!;
cameraNode.position = { x: 1050, y: 450 };
graph.addNode(cameraNode);

graph.connect(cameraPosNode.outputs.get('vector')!, cameraNode.inputs.get('position')!);

// 8. Add lights
const ambientLightNode = registry.createNode('AmbientLightNode', 'ambient-light')!;
ambientLightNode.position = { x: 550, y: 100 };
ambientLightNode.inputs.get('intensity')!.value = 0.5;
graph.addNode(ambientLightNode);

const directionalLightPos = registry.createNode('Vector3Node', 'dir-light-pos')!;
directionalLightPos.position = { x: 300, y: -25 };
directionalLightPos.setProperty('xDefault', 5);
directionalLightPos.setProperty('yDefault', 5);
directionalLightPos.setProperty('zDefault', 5);

graph.addNode(directionalLightPos);

const directionalLightNode = registry.createNode('DirectionalLightNode', 'dir-light')!;
directionalLightNode.position = { x: 550, y: -50 };
directionalLightNode.inputs.get('intensity')!.value = 1;
graph.addNode(directionalLightNode);

graph.connect(
  directionalLightPos.outputs.get('vector')!,
  directionalLightNode.inputs.get('position')!
);

// 9. Scene Compiler - Collects all objects and camera for the scene
const sceneCompiler = registry.createNode('SceneCompilerNode', 'scene-compiler')!;
sceneCompiler.position = { x: 1050, y: 250 };
graph.addNode(sceneCompiler);

// Connect scene
graph.connect(sceneNode.outputs.get('scene')!, sceneCompiler.inputs.get('scene')!);

// Connect all objects to the compiler (using shift+drag for multiple connections)
graph.connect(meshNode.outputs.get('mesh')!, sceneCompiler.inputs.get('objects')!);
graph.connect(ambientLightNode.outputs.get('light')!, sceneCompiler.inputs.get('objects')!, true);
graph.connect(
  directionalLightNode.outputs.get('light')!,
  sceneCompiler.inputs.get('objects')!,
  true
);

// Connect camera
graph.connect(cameraNode.outputs.get('camera')!, sceneCompiler.inputs.get('camera')!);

// 10. Add update toggle
const updateToggle = registry.createNode('BooleanInputNode', 'update-toggle')!;
updateToggle.position = { x: 1050, y: 450 };
updateToggle.label = 'Update Scene';
// Set initial value to true so scene renders by default
(updateToggle as any).setValue(true);
graph.addNode(updateToggle);

// 11. Scene Output - Finalizes the scene by clearing and rebuilding
const sceneOutputNode = registry.createNode('SceneOutputNode', 'scene-output')!;
sceneOutputNode.position = { x: 1300, y: 250 };
graph.addNode(sceneOutputNode);

// Connect compiled scene and update toggle to output
graph.connect(sceneCompiler.outputs.get('compiled')!, sceneOutputNode.inputs.get('compiled')!);
graph.connect(updateToggle.outputs.get('value')!, sceneOutputNode.inputs.get('update')!);

// Initialize UI - Create containers programmatically
const appContainer = document.getElementById('app')! as HTMLElement;

// Create viewport container (3D view - background layer)
const viewportContainer = document.createElement('div');
viewportContainer.id = 'viewport';
appContainer.appendChild(viewportContainer);

// Create editor container (node editor - overlay layer)
const editorContainer = document.createElement('div');
editorContainer.id = 'editor';
appContainer.appendChild(editorContainer);

// Create graph editor (pass registry and app container for UI creation)
const graphEditor = new GraphEditor(editorContainer, graph, registry, appContainer);

// Create live viewport
const liveViewport = new LiveViewport(viewportContainer, graph);

// Create preview manager and initialize its UI
const previewManager = new PreviewManager(graph, graphEditor.getSelectionManager());
liveViewport.setPreviewManager(previewManager);
graphEditor.setPreviewManager(previewManager); // Connect preview manager to node renderer

// Initialize preview controls in toolbar
const toolbar = graphEditor.getToolbar();
const previewControls = toolbar.querySelector('.preview-controls') as HTMLElement;
previewManager.initializeUI(previewControls);

// Create view mode manager (it will create its own toggle button)
const viewModeManager = new ViewModeManager(
  graphEditor,
  liveViewport,
  editorContainer,
  appContainer
);

// Expose to window for debugging
(window as any).graph = graph;
(window as any).registry = registry;
(window as any).viewModeManager = viewModeManager;
(window as any).previewManager = previewManager;

/*
 * ARRAY SYSTEM USAGE:
 *
 * To create array connections:
 * 1. Hold SHIFT while dragging a connection to an input port
 * 2. This will ADD to existing connections instead of replacing
 * 3. Array connections appear as thicker, orange edges
 *
 * Array manipulation nodes available:
 * - Merge: Combine multiple values into an array
 * - Split: Break an array into individual outputs
 * - Index: Get a value at a specific index
 * - Length: Get the array length
 *
 * Example:
 * - Create 3 NumberSlider nodes with different values (e.g., 2, 3, 4)
 * - Connect first slider to BoxGeometry width (normal drag)
 * - Hold SHIFT and connect second slider to BoxGeometry width
 * - Hold SHIFT and connect third slider to BoxGeometry width
 * - Result: 3 box geometries with widths 2, 3, 4
 */
