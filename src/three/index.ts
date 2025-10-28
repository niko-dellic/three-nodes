import { NodeRegistry } from './NodeRegistry';

// Data nodes
import { NumberNode } from './nodes/data/NumberNode';
import { Vector3Node } from './nodes/data/Vector3Node';
import { ColorNode } from './nodes/data/ColorNode';
import { NumberSliderNode } from './nodes/data/NumberSliderNode';
import { ColorPickerNode } from './nodes/data/ColorPickerNode';

// Geometry nodes
import { BoxGeometryNode } from './nodes/geometry/BoxGeometryNode';
import { SphereGeometryNode } from './nodes/geometry/SphereGeometryNode';

// Material nodes
import { MeshStandardMaterialNode } from './nodes/material/MeshStandardMaterialNode';

// Scene nodes
import { CreateMeshNode } from './nodes/scene/CreateMeshNode';
import { AddToSceneNode } from './nodes/scene/AddToSceneNode';

// Camera nodes
import { PerspectiveCameraNode } from './nodes/camera/PerspectiveCameraNode';

// Light nodes
import { AmbientLightNode } from './nodes/lights/AmbientLightNode';
import { DirectionalLightNode } from './nodes/lights/DirectionalLightNode';

// Output nodes
import { SceneOutputNode } from './nodes/output/SceneOutputNode';

export { NodeRegistry } from './NodeRegistry';
export { BaseThreeNode } from './BaseThreeNode';

// Export node types
export { NumberNode } from './nodes/data/NumberNode';
export { Vector3Node } from './nodes/data/Vector3Node';
export { ColorNode } from './nodes/data/ColorNode';
export { NumberSliderNode } from './nodes/data/NumberSliderNode';
export { ColorPickerNode } from './nodes/data/ColorPickerNode';
export { BoxGeometryNode } from './nodes/geometry/BoxGeometryNode';
export { SphereGeometryNode } from './nodes/geometry/SphereGeometryNode';
export { MeshStandardMaterialNode } from './nodes/material/MeshStandardMaterialNode';
export { CreateMeshNode } from './nodes/scene/CreateMeshNode';
export { AddToSceneNode } from './nodes/scene/AddToSceneNode';
export { PerspectiveCameraNode } from './nodes/camera/PerspectiveCameraNode';
export { AmbientLightNode } from './nodes/lights/AmbientLightNode';
export { DirectionalLightNode } from './nodes/lights/DirectionalLightNode';
export { SceneOutputNode } from './nodes/output/SceneOutputNode';

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
  registry.register(CreateMeshNode, {
    type: 'CreateMeshNode',
    category: 'Scene',
    label: 'Create Mesh',
    description: 'Creates a mesh from geometry and material',
  });

  registry.register(AddToSceneNode, {
    type: 'AddToSceneNode',
    category: 'Scene',
    label: 'Add to Scene',
    description: 'Adds an object to a scene',
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

  return registry;
}
