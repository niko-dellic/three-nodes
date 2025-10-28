import { NodeRegistry } from './NodeRegistry';

// Data nodes
import { NumberNode } from './nodes/data/NumberNode';
import { Vector3Node } from './nodes/data/Vector3Node';
import { ColorNode } from './nodes/data/ColorNode';
import { NumberSliderNode } from './nodes/data/NumberSliderNode';
import { ColorPickerNode } from './nodes/data/ColorPickerNode';
import { StringInputNode } from './nodes/data/StringInputNode';
import { BooleanInputNode } from './nodes/data/BooleanInputNode';
import { PointInputNode } from './nodes/data/PointInputNode';
import { ListInputNode } from './nodes/data/ListInputNode';
import { TextInputNode } from './nodes/data/TextInputNode';

// Input nodes (interactive controls)
import { ButtonNode } from './nodes/input/ButtonNode';

// Monitor nodes
import { NumberMonitorNode } from './nodes/monitor/NumberMonitorNode';
import { TextMonitorNode } from './nodes/monitor/TextMonitorNode';

// Geometry nodes
import { BoxGeometryNode } from './nodes/geometry/BoxGeometryNode';
import { SphereGeometryNode } from './nodes/geometry/SphereGeometryNode';

// Material nodes
import { MeshStandardMaterialNode } from './nodes/material/MeshStandardMaterialNode';

// Scene nodes
import { SceneNode } from './nodes/scene/SceneNode';
import { CreateMeshNode } from './nodes/scene/CreateMeshNode';
import { AddToSceneNode } from './nodes/scene/AddToSceneNode';
import { SceneCompilerNode } from './nodes/scene/SceneCompilerNode';

// Camera nodes
import { PerspectiveCameraNode } from './nodes/camera/PerspectiveCameraNode';

// Light nodes
import { AmbientLightNode } from './nodes/lights/AmbientLightNode';
import { DirectionalLightNode } from './nodes/lights/DirectionalLightNode';

// Output nodes
import { SceneOutputNode } from './nodes/output/SceneOutputNode';

// Array nodes
import { MergeNode } from './nodes/array/MergeNode';
import { SplitNode } from './nodes/array/SplitNode';
import { IndexNode } from './nodes/array/IndexNode';
import { LengthNode } from './nodes/array/LengthNode';

export { NodeRegistry } from './NodeRegistry';
export { BaseThreeNode } from './BaseThreeNode';
export { TweakpaneNode } from './TweakpaneNode';

// Export node types
export { NumberNode } from './nodes/data/NumberNode';
export { Vector3Node } from './nodes/data/Vector3Node';
export { ColorNode } from './nodes/data/ColorNode';
export { NumberSliderNode } from './nodes/data/NumberSliderNode';
export { ColorPickerNode } from './nodes/data/ColorPickerNode';
export { StringInputNode } from './nodes/data/StringInputNode';
export { BooleanInputNode } from './nodes/data/BooleanInputNode';
export { PointInputNode } from './nodes/data/PointInputNode';
export { ListInputNode } from './nodes/data/ListInputNode';
export { TextInputNode } from './nodes/data/TextInputNode';
export { ButtonNode } from './nodes/input/ButtonNode';
export { NumberMonitorNode } from './nodes/monitor/NumberMonitorNode';
export { TextMonitorNode } from './nodes/monitor/TextMonitorNode';
export { BoxGeometryNode } from './nodes/geometry/BoxGeometryNode';
export { SphereGeometryNode } from './nodes/geometry/SphereGeometryNode';
export { MeshStandardMaterialNode } from './nodes/material/MeshStandardMaterialNode';
export { SceneNode } from './nodes/scene/SceneNode';
export { CreateMeshNode } from './nodes/scene/CreateMeshNode';
export { AddToSceneNode } from './nodes/scene/AddToSceneNode';
export { SceneCompilerNode } from './nodes/scene/SceneCompilerNode';
export { PerspectiveCameraNode } from './nodes/camera/PerspectiveCameraNode';
export { AmbientLightNode } from './nodes/lights/AmbientLightNode';
export { DirectionalLightNode } from './nodes/lights/DirectionalLightNode';
export { SceneOutputNode } from './nodes/output/SceneOutputNode';
export { MergeNode } from './nodes/array/MergeNode';
export { SplitNode } from './nodes/array/SplitNode';
export { IndexNode } from './nodes/array/IndexNode';
export { LengthNode } from './nodes/array/LengthNode';

// Create and configure the default registry
export function createDefaultRegistry(): NodeRegistry {
  const registry = new NodeRegistry();

  // Register data nodes
  registry.register(NumberNode, {
    type: 'NumberNode',
    category: 'Data',
    label: 'Number',
    description: 'Outputs a number value',
  });

  registry.register(Vector3Node, {
    type: 'Vector3Node',
    category: 'Data',
    label: 'Vector3',
    description: 'Creates a 3D vector from X, Y, Z components',
  });

  registry.register(ColorNode, {
    type: 'ColorNode',
    category: 'Data',
    label: 'Color',
    description: 'Creates a color from R, G, B components',
  });

  registry.register(NumberSliderNode, {
    type: 'NumberSliderNode',
    category: 'Input',
    label: 'Number Slider',
    description: 'Interactive number slider with min/max/step controls',
    icon: '🎚️',
  });

  registry.register(ColorPickerNode, {
    type: 'ColorPickerNode',
    category: 'Input',
    label: 'Color Picker',
    description: 'Interactive color picker',
    icon: '🎨',
  });

  registry.register(StringInputNode, {
    type: 'StringInputNode',
    category: 'Input',
    label: 'String Input',
    description: 'Interactive text input',
    icon: '📝',
  });

  registry.register(BooleanInputNode, {
    type: 'BooleanInputNode',
    category: 'Input',
    label: 'Boolean Input',
    description: 'Interactive checkbox input',
    icon: '☑️',
  });

  registry.register(ButtonNode, {
    type: 'ButtonNode',
    category: 'Input',
    label: 'Button',
    description: 'Trigger button that outputs true when clicked',
    icon: '🔘',
  });

  registry.register(PointInputNode, {
    type: 'PointInputNode',
    category: 'Input',
    label: 'Point Input',
    description: 'Interactive 2D point input',
    icon: '📍',
  });

  registry.register(ListInputNode, {
    type: 'ListInputNode',
    category: 'Input',
    label: 'List Input',
    description: 'Interactive dropdown list',
    icon: '📋',
  });

  registry.register(TextInputNode, {
    type: 'TextInputNode',
    category: 'Input',
    label: 'Text Input',
    description: 'Interactive multiline text input',
    icon: '📄',
  });

  // Register monitor nodes
  registry.register(NumberMonitorNode, {
    type: 'NumberMonitorNode',
    category: 'Monitor',
    label: 'Number Monitor',
    description: 'Displays a number value with optional graph',
    icon: '📊',
  });

  registry.register(TextMonitorNode, {
    type: 'TextMonitorNode',
    category: 'Monitor',
    label: 'Text Monitor',
    description: 'Displays multiline text',
    icon: '📺',
  });

  // Register geometry nodes
  registry.register(BoxGeometryNode, {
    type: 'BoxGeometryNode',
    category: 'Geometry',
    label: 'Box Geometry',
    description: 'Creates a box geometry',
  });

  registry.register(SphereGeometryNode, {
    type: 'SphereGeometryNode',
    category: 'Geometry',
    label: 'Sphere Geometry',
    description: 'Creates a sphere geometry',
  });

  // Register material nodes
  registry.register(MeshStandardMaterialNode, {
    type: 'MeshStandardMaterialNode',
    category: 'Material',
    label: 'Standard Material',
    description: 'Creates a PBR standard material',
  });

  // Register scene nodes
  registry.register(SceneNode, {
    type: 'SceneNode',
    category: 'Scene',
    label: 'Scene',
    description: 'Creates a Three.js scene',
    icon: '🎬',
  });

  registry.register(CreateMeshNode, {
    type: 'CreateMeshNode',
    category: 'Scene',
    label: 'Create Mesh',
    description: 'Creates a mesh from geometry and material',
  });

  registry.register(AddToSceneNode, {
    type: 'AddToSceneNode',
    category: 'Scene',
    label: 'Add to Scene (Legacy)',
    description: '[DEPRECATED] Use Scene Compiler instead',
  });

  registry.register(SceneCompilerNode, {
    type: 'SceneCompilerNode',
    category: 'Scene',
    label: 'Scene Compiler',
    description: 'Compiles scene, objects, and camera for output',
    icon: '📦',
  });

  // Register camera nodes
  registry.register(PerspectiveCameraNode, {
    type: 'PerspectiveCameraNode',
    category: 'Camera',
    label: 'Perspective Camera',
    description: 'Creates a perspective camera',
  });

  // Register light nodes
  registry.register(AmbientLightNode, {
    type: 'AmbientLightNode',
    category: 'Lights',
    label: 'Ambient Light',
    description: 'Creates an ambient light',
  });

  registry.register(DirectionalLightNode, {
    type: 'DirectionalLightNode',
    category: 'Lights',
    label: 'Directional Light',
    description: 'Creates a directional light',
  });

  // Register output nodes
  registry.register(SceneOutputNode, {
    type: 'SceneOutputNode',
    category: 'Output',
    label: 'Scene Output',
    description: 'Outputs the final scene and camera',
  });

  // Register array nodes
  registry.register(MergeNode, {
    type: 'MergeNode',
    category: 'Array',
    label: 'Merge',
    description: 'Combine multiple values into an array',
    icon: '🔗',
  });

  registry.register(SplitNode, {
    type: 'SplitNode',
    category: 'Array',
    label: 'Split',
    description: 'Split an array into individual values',
    icon: '✂️',
  });

  registry.register(IndexNode, {
    type: 'IndexNode',
    category: 'Array',
    label: 'Index',
    description: 'Get value at specific index from array',
    icon: '🔢',
  });

  registry.register(LengthNode, {
    type: 'LengthNode',
    category: 'Array',
    label: 'Length',
    description: 'Get the length of an array',
    icon: '📏',
  });

  return registry;
}
