import './style.css';
import { Graph } from '@/core/Graph';
import { createDefaultRegistry } from '@/three';
import { GraphEditor, LiveViewport, ViewModeManager } from '@/ui';
import * as THREE from 'three';

// Create the node registry
const registry = createDefaultRegistry();

// Create the graph
const graph = new Graph();

// Build example scene: A rotating cube
// Node positions are laid out left to right

// 1. Create number inputs for box dimensions
const widthNode = registry.createNode('NumberNode', 'width-node')!;
widthNode.position = { x: 50, y: 100 };
widthNode.label = 'Width';
widthNode.inputs.get('value')!.value = 2;
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
graph.connect(widthNode.outputs.get('result')!, boxGeoNode.inputs.get('width')!);
graph.connect(heightNode.outputs.get('result')!, boxGeoNode.inputs.get('height')!);
graph.connect(depthNode.outputs.get('result')!, boxGeoNode.inputs.get('depth')!);

// 3. Create color for material
const colorNode = registry.createNode('ColorNode', 'color-node')!;
colorNode.position = { x: 300, y: 400 };
colorNode.inputs.get('r')!.value = 0.3;
colorNode.inputs.get('g')!.value = 0.6;
colorNode.inputs.get('b')!.value = 0.9;
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
const scene = new THREE.Scene();

// Add mesh to scene
const addMeshNode = registry.createNode('AddToSceneNode', 'add-mesh')!;
addMeshNode.position = { x: 1050, y: 250 };
addMeshNode.inputs.get('scene')!.value = scene;
graph.addNode(addMeshNode);

graph.connect(meshNode.outputs.get('mesh')!, addMeshNode.inputs.get('object')!);

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

const addAmbientNode = registry.createNode('AddToSceneNode', 'add-ambient')!;
addAmbientNode.position = { x: 800, y: 100 };
addAmbientNode.inputs.get('scene')!.value = scene;
graph.addNode(addAmbientNode);

graph.connect(ambientLightNode.outputs.get('light')!, addAmbientNode.inputs.get('object')!);

const directionalLightPos = registry.createNode('Vector3Node', 'dir-light-pos')!;
directionalLightPos.position = { x: 300, y: 50 };
directionalLightPos.inputs.get('x')!.value = 5;
directionalLightPos.inputs.get('y')!.value = 5;
directionalLightPos.inputs.get('z')!.value = 5;
graph.addNode(directionalLightPos);

const directionalLightNode = registry.createNode('DirectionalLightNode', 'dir-light')!;
directionalLightNode.position = { x: 550, y: 50 };
directionalLightNode.inputs.get('intensity')!.value = 1;
graph.addNode(directionalLightNode);

graph.connect(
  directionalLightPos.outputs.get('vector')!,
  directionalLightNode.inputs.get('position')!
);

const addDirLightNode = registry.createNode('AddToSceneNode', 'add-dir-light')!;
addDirLightNode.position = { x: 800, y: 50 };
addDirLightNode.inputs.get('scene')!.value = scene;
graph.addNode(addDirLightNode);

graph.connect(directionalLightNode.outputs.get('light')!, addDirLightNode.inputs.get('object')!);

// 9. Scene output node
const sceneOutputNode = registry.createNode('SceneOutputNode', 'scene-output')!;
sceneOutputNode.position = { x: 1300, y: 250 };
sceneOutputNode.inputs.get('scene')!.value = scene;
graph.addNode(sceneOutputNode);

graph.connect(cameraNode.outputs.get('camera')!, sceneOutputNode.inputs.get('camera')!);

// Initialize UI
const viewportContainer = document.getElementById('viewport')! as HTMLElement;
const editorContainer = document.getElementById('editor')! as HTMLElement;
const toggleButton = document.getElementById('toggle-button')! as HTMLButtonElement;

// Create graph editor (pass registry for node creation)
const graphEditor = new GraphEditor(editorContainer, graph, registry);

// Create live viewport
const liveViewport = new LiveViewport(viewportContainer, graph);

// Create view mode manager
const viewModeManager = new ViewModeManager(
  graphEditor,
  liveViewport,
  editorContainer,
  toggleButton
);

// Expose to window for debugging
(window as any).graph = graph;
(window as any).registry = registry;
(window as any).viewModeManager = viewModeManager;
