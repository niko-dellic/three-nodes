/**
 * Maps node types to their source file paths for displaying full source code
 */
export const nodeSourceMap: Record<string, string> = {
  // Data nodes
  NumberNode: '/src/three/nodes/data/NumberNode.ts',
  Vector3Node: '/src/three/nodes/data/Vector3Node.ts',
  Vector3DecomposeNode: '/src/three/nodes/data/Vector3DecomposeNode.ts',
  ColorNode: '/src/three/nodes/data/ColorNode.ts',
  
  // Input nodes
  NumberSliderNode: '/src/three/nodes/input/NumberSliderNode.ts',
  ColorPickerNode: '/src/three/nodes/input/ColorPickerNode.ts',
  StringInputNode: '/src/three/nodes/input/StringInputNode.ts',
  BooleanInputNode: '/src/three/nodes/input/BooleanInputNode.ts',
  ButtonNode: '/src/three/nodes/input/ButtonNode.ts',
  PointInputNode: '/src/three/nodes/input/PointInputNode.ts',
  ListInputNode: '/src/three/nodes/input/ListInputNode.ts',
  TextInputNode: '/src/three/nodes/input/TextInputNode.ts',
  IntervalInputNode: '/src/three/nodes/input/IntervalInputNode.ts',
  
  // Geometry nodes
  BoxGeometryNode: '/src/three/nodes/geometry/BoxGeometryNode.ts',
  SphereGeometryNode: '/src/three/nodes/geometry/SphereGeometryNode.ts',
  PlaneGeometryNode: '/src/three/nodes/geometry/PlaneGeometryNode.ts',
  CylinderGeometryNode: '/src/three/nodes/geometry/CylinderGeometryNode.ts',
  TorusGeometryNode: '/src/three/nodes/geometry/TorusGeometryNode.ts',
  ConeGeometryNode: '/src/three/nodes/geometry/ConeGeometryNode.ts',
  
  // Material nodes
  MeshBasicMaterialNode: '/src/three/nodes/material/MeshBasicMaterialNode.ts',
  MeshStandardMaterialNode: '/src/three/nodes/material/MeshStandardMaterialNode.ts',
  MeshPhysicalMaterialNode: '/src/three/nodes/material/MeshPhysicalMaterialNode.ts',
  MeshMatcapMaterialNode: '/src/three/nodes/material/MeshMatcapMaterialNode.ts',
  
  // Scene nodes
  SceneNode: '/src/three/nodes/scene/SceneNode.ts',
  PerspectiveCameraNode: '/src/three/nodes/scene/PerspectiveCameraNode.ts',
  OrthographicCameraNode: '/src/three/nodes/scene/OrthographicCameraNode.ts',
  AmbientLightNode: '/src/three/nodes/scene/AmbientLightNode.ts',
  DirectionalLightNode: '/src/three/nodes/scene/DirectionalLightNode.ts',
  PointLightNode: '/src/three/nodes/scene/PointLightNode.ts',
  SpotLightNode: '/src/three/nodes/scene/SpotLightNode.ts',
  CreateMeshNode: '/src/three/nodes/scene/CreateMeshNode.ts',
  SceneCompilerNode: '/src/three/nodes/scene/SceneCompilerNode.ts',
  SceneOutputNode: '/src/three/nodes/scene/SceneOutputNode.ts',
};

/**
 * Get the source file path for a node type
 */
export function getNodeSourcePath(nodeType: string): string | undefined {
  return nodeSourceMap[nodeType];
}

