import { Graph } from '@/core';
import {
  BoxGeometryNode,
  ColorPickerNode,
  CreateMeshNode,
  SceneNode,
  Vector3Node,
  AmbientLightNode,
  DirectionalLightNode,
  SceneCompilerNode,
  SceneOutputNode,
  ButtonNode,
  Vector3DecomposeNode,
  NumberSliderNode,
  MeshMatcapMaterialNode,
  GridHelperNode,
  ActiveCameraNode,
  BooleanInputNode,
  NodeRegistry,
} from '@/three';

export function buildBasicGraph(graph: Graph, registry: NodeRegistry) {
  // Build example scene: A rotating cube
  // Node positions are laid out left to right

  // 1. Create number inputs for box dimensions

  const dimsNode = registry.insertNode(Vector3Node, 'dims-node');

  dimsNode.position = { x: -450, y: 200 };
  dimsNode.setVector(2, 2, 2);
  graph.addNode(dimsNode);

  const decomposeNode = registry.insertNode(Vector3DecomposeNode, 'decompose-node');
  decomposeNode.position = { x: 0, y: 200 };
  graph.addNode(decomposeNode);

  graph.connect(dimsNode.output('vector'), decomposeNode.input('vector'));
  // 2. Create box geometry
  const boxGeoNode = registry.insertNode(BoxGeometryNode, 'box-geo');
  boxGeoNode.position = { x: 300, y: 200 };
  graph.addNode(boxGeoNode);

  // Connect dimensions to box geometry
  graph.connect(decomposeNode.output('x'), boxGeoNode.input('width'));
  graph.connect(decomposeNode.output('y'), boxGeoNode.input('height'));
  graph.connect(decomposeNode.output('z'), boxGeoNode.input('depth'));

  // 3. Create color for material
  const colorNode = registry.insertNode(ColorPickerNode, 'color-picker');
  colorNode.position = { x: 100, y: 350 };
  graph.addNode(colorNode);

  // 4. Create material
  const materialNode = registry.insertNode(MeshMatcapMaterialNode, 'material');
  materialNode.position = { x: 550, y: 350 };
  graph.addNode(materialNode);

  graph.connect(colorNode.output('color'), materialNode.input('color'));

  // 5. Create mesh
  const meshNode = registry.insertNode(CreateMeshNode, 'mesh');
  meshNode.position = { x: 800, y: 250 };
  graph.addNode(meshNode);

  graph.connect(boxGeoNode.output('geometry'), meshNode.input('geometry'));
  graph.connect(materialNode.output('material'), meshNode.input('material'));

  // 6. Create scene
  const sceneNode = registry.insertNode(SceneNode, 'scene');
  sceneNode.position = { x: 1100, y: 100 };
  graph.addNode(sceneNode);

  // 7. Create camera
  const cameraPosNode = registry.insertNode(Vector3Node, 'camera-pos');
  cameraPosNode.position = { x: 800, y: 450 };
  cameraPosNode.setVector(10, 10, 10);
  graph.addNode(cameraPosNode);

  const booleanToggleNode = registry.insertNode(BooleanInputNode, 'update-camera');
  booleanToggleNode.position = { x: 850, y: 400 };
  booleanToggleNode.setProperty('default', true);
  graph.addNode(booleanToggleNode);

  const cameraNode = registry.insertNode(ActiveCameraNode, 'camera');
  cameraNode.position = { x: 1150, y: 450 };
  graph.addNode(cameraNode);

  graph.connect(cameraPosNode.output('vector'), cameraNode.input('position'));
  graph.connect(booleanToggleNode.output('value'), cameraNode.input('update'));
  // 8. Add lights
  const ambientLightNode = registry.insertNode(AmbientLightNode, 'ambient-light');
  ambientLightNode.position = { x: 550, y: 100 };
  ambientLightNode.input('intensity').value = 0.5;
  graph.addNode(ambientLightNode);

  // Using insertNode with Vector3Node for type safety
  const directionalLightPos = registry.insertNode(Vector3Node, 'dir-light-pos');
  directionalLightPos.position = { x: 100, y: -25 };
  directionalLightPos.setVector(10, 10, 10);
  graph.addNode(directionalLightPos);

  const directionaLightIntensity = new NumberSliderNode('dir-light-intensity', 1);
  directionaLightIntensity.position = { x: 0, y: -100 };
  graph.addNode(directionaLightIntensity);

  const directionalLightNode = registry.insertNode(DirectionalLightNode, 'dir-light');
  directionalLightNode.position = { x: 550, y: -50 };
  directionalLightNode.input('intensity').value = 1;
  graph.addNode(directionalLightNode);

  graph.connect(directionalLightPos.output('vector'), directionalLightNode.input('position'));
  graph.connect(directionaLightIntensity.output('value'), directionalLightNode.input('intensity'));

  const gridHelperNode = registry.insertNode(GridHelperNode, 'grid-helper');
  gridHelperNode.position = { x: 850, y: -150 };
  graph.addNode(gridHelperNode);

  // 9. Scene Compiler - Collects all objects and camera for the scene
  const sceneCompiler = registry.insertNode(SceneCompilerNode, 'scene-compiler');
  sceneCompiler.position = { x: 1350, y: 250 };
  graph.addNode(sceneCompiler);

  // Connect scene
  graph.connect(sceneNode.output('scene'), sceneCompiler.input('scene'));

  // Connect all objects to the compiler (using shift+drag for multiple connections)
  graph.connect(meshNode.output('mesh'), sceneCompiler.input('objects'));
  graph.connect(ambientLightNode.output('light'), sceneCompiler.input('objects'), true);
  graph.connect(directionalLightNode.output('light'), sceneCompiler.input('objects'), true);

  // Connect camera
  graph.connect(cameraNode.output('camera'), sceneCompiler.input('camera'));

  // add to compiler
  graph.connect(gridHelperNode.output('grid'), sceneCompiler.input('objects'), true);

  // 10. Add update toggle
  // Using insertNode for type safety
  const updateButton = registry.insertNode(ButtonNode, 'update-button');
  updateButton.position = { x: 1350, y: 400 };
  updateButton.label = 'Update Scene';
  graph.addNode(updateButton);

  // 11. Scene Output - Finalizes the scene by clearing and rebuilding
  const sceneOutputNode = registry.insertNode(SceneOutputNode, 'scene-output');
  sceneOutputNode.position = { x: 1600, y: 250 };
  graph.addNode(sceneOutputNode);

  // Connect compiled scene and update toggle to output
  graph.connect(sceneCompiler.output('compiled'), sceneOutputNode.input('compiled'));
  graph.connect(updateButton.output('trigger'), sceneOutputNode.input('update'));
}
