import { NodeRegistry } from './NodeRegistry';

// Data nodes
import { NumberNode } from './nodes/data/NumberNode';
import { Vector3Node } from './nodes/data/Vector3Node';
import { Vector3DecomposeNode } from './nodes/data/Vector3DecomposeNode';
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
import { MeshBasicMaterialNode } from './nodes/material/MeshBasicMaterialNode';
import { MeshPhongMaterialNode } from './nodes/material/MeshPhongMaterialNode';
import { MeshToonMaterialNode } from './nodes/material/MeshToonMaterialNode';
import { MeshMatcapMaterialNode } from './nodes/material/MeshMatcapMaterialNode';
import { PointsMaterialNode } from './nodes/material/PointsMaterialNode';
import { LineBasicMaterialNode } from './nodes/material/LineBasicMaterialNode';
import { LineDashedMaterialNode } from './nodes/material/LineDashedMaterialNode';
import { SpriteMaterialNode } from './nodes/material/SpriteMaterialNode';

// Scene nodes
import { SceneNode } from './nodes/scene/SceneNode';
import { CreateMeshNode } from './nodes/scene/CreateMeshNode';
import { AddToSceneNode } from './nodes/scene/AddToSceneNode';
import { SceneCompilerNode } from './nodes/scene/SceneCompilerNode';
import { Object3DNode } from './nodes/scene/Object3DNode';

// Camera nodes
import { PerspectiveCameraNode } from './nodes/camera/PerspectiveCameraNode';
import { CameraComponentNode } from './nodes/camera/CameraComponentNode';
import { ActiveCameraNode } from './nodes/camera/ActiveCameraNode';

// Light nodes
import { AmbientLightNode } from './nodes/lights/AmbientLightNode';
import { DirectionalLightNode } from './nodes/lights/DirectionalLightNode';

// Output nodes
import { SceneOutputNode } from './nodes/output/SceneOutputNode';

// Array nodes
import { MergeNode } from './nodes/array/MergeNode';
import { ExtractNode } from './nodes/array/ExtractNode';
import { IndexNode } from './nodes/array/IndexNode';
import { LengthNode } from './nodes/array/LengthNode';

// Animation nodes
import { FrameNode } from './nodes/animation/FrameNode';
import { UpdatableObjectNode } from './nodes/animation/UpdatableObjectNode';

// Math nodes
import { DEG2RADNode } from './nodes/math/DEG2RADNode';
import { RAD2DEGNode } from './nodes/math/RAD2DEGNode';
import { ClampNode } from './nodes/math/ClampNode';
import { LerpNode } from './nodes/math/LerpNode';
import { InverseLerpNode } from './nodes/math/InverseLerpNode';
import { DampNode } from './nodes/math/DampNode';
import { MapLinearNode } from './nodes/math/MapLinearNode';
import { SmoothstepNode } from './nodes/math/SmoothstepNode';
import { SmootherStepNode } from './nodes/math/SmootherStepNode';
import { PingPongNode } from './nodes/math/PingPongNode';
import { EuclideanModuloNode } from './nodes/math/EuclideanModuloNode';
import { RandomNode } from './nodes/math/RandomNode';
import { RandIntNode } from './nodes/math/RandIntNode';
import { IsPowerOfTwoNode } from './nodes/math/IsPowerOfTwoNode';
import { CeilPowerOfTwoNode } from './nodes/math/CeilPowerOfTwoNode';
import { FloorPowerOfTwoNode } from './nodes/math/FloorPowerOfTwoNode';

// Math operation nodes
import { AddNode } from './nodes/math/operations/AddNode';
import { SubtractNode } from './nodes/math/operations/SubtractNode';
import { MultiplyNode } from './nodes/math/operations/MultiplyNode';
import { DivideNode } from './nodes/math/operations/DivideNode';
import { PowerNode } from './nodes/math/operations/PowerNode';
import { SqrtNode } from './nodes/math/operations/SqrtNode';
import { AbsNode } from './nodes/math/operations/AbsNode';
import { MinNode } from './nodes/math/operations/MinNode';
import { MaxNode } from './nodes/math/operations/MaxNode';
import { DistanceNode } from './nodes/math/operations/DistanceNode';
import { DotProductNode } from './nodes/math/operations/DotProductNode';
import { CrossProductNode } from './nodes/math/operations/CrossProductNode';

// Geometry utility nodes
import { MergeGeometriesNode } from './nodes/geometry/utils/MergeGeometriesNode';
import { MergeVerticesNode } from './nodes/geometry/utils/MergeVerticesNode';
import { InterleaveAttributesNode } from './nodes/geometry/utils/InterleaveAttributesNode';
import { ComputeMikkTSpaceNode } from './nodes/geometry/utils/ComputeMikkTSpaceNode';
import { ComputeMorphedAttributesNode } from './nodes/geometry/utils/ComputeMorphedAttributesNode';
import { DeepCloneAttributeNode } from './nodes/geometry/utils/DeepCloneAttributeNode';
import { EstimateBytesUsedNode } from './nodes/geometry/utils/EstimateBytesUsedNode';
import { ToTrianglesDrawModeNode } from './nodes/geometry/utils/ToTrianglesDrawModeNode';
import { ConvertToIndexedNode } from './nodes/geometry/utils/ConvertToIndexedNode';

// Transform nodes
import { PositionNode } from './nodes/transform/PositionNode';
import { MoveToNode } from './nodes/transform/MoveToNode';
import { RotationNode } from './nodes/transform/RotationNode';
import { ScaleNode } from './nodes/transform/ScaleNode';
import { Matrix4Node } from './nodes/transform/Matrix4Node';

// Loader nodes
import { GLTFLoaderNode } from './nodes/loaders/GLTFLoaderNode';
import { Rhino3dmLoaderNode } from './nodes/loaders/Rhino3dmLoaderNode';

export { NodeRegistry } from './NodeRegistry';
export { BaseThreeNode } from './BaseThreeNode';
export { TweakpaneNode } from './TweakpaneNode';

// Export node types
export { NumberNode } from './nodes/data/NumberNode';
export { Vector3Node } from './nodes/data/Vector3Node';
export { Vector3DecomposeNode } from './nodes/data/Vector3DecomposeNode';
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
export { MeshBasicMaterialNode } from './nodes/material/MeshBasicMaterialNode';
export { MeshPhongMaterialNode } from './nodes/material/MeshPhongMaterialNode';
export { MeshToonMaterialNode } from './nodes/material/MeshToonMaterialNode';
export { MeshMatcapMaterialNode } from './nodes/material/MeshMatcapMaterialNode';
export { PointsMaterialNode } from './nodes/material/PointsMaterialNode';
export { LineBasicMaterialNode } from './nodes/material/LineBasicMaterialNode';
export { LineDashedMaterialNode } from './nodes/material/LineDashedMaterialNode';
export { SpriteMaterialNode } from './nodes/material/SpriteMaterialNode';
export { SceneNode } from './nodes/scene/SceneNode';
export { CreateMeshNode } from './nodes/scene/CreateMeshNode';
export { AddToSceneNode } from './nodes/scene/AddToSceneNode';
export { SceneCompilerNode } from './nodes/scene/SceneCompilerNode';
export { Object3DNode } from './nodes/scene/Object3DNode';
export { PerspectiveCameraNode } from './nodes/camera/PerspectiveCameraNode';
export { CameraComponentNode } from './nodes/camera/CameraComponentNode';
export { ActiveCameraNode } from './nodes/camera/ActiveCameraNode';
export { AmbientLightNode } from './nodes/lights/AmbientLightNode';
export { DirectionalLightNode } from './nodes/lights/DirectionalLightNode';
export { SceneOutputNode } from './nodes/output/SceneOutputNode';
export { MergeNode } from './nodes/array/MergeNode';
export { ExtractNode } from './nodes/array/ExtractNode';
export { IndexNode } from './nodes/array/IndexNode';
export { LengthNode } from './nodes/array/LengthNode';
export { FrameNode } from './nodes/animation/FrameNode';
export { UpdatableObjectNode } from './nodes/animation/UpdatableObjectNode';
export { PositionNode } from './nodes/transform/PositionNode';
export { MoveToNode } from './nodes/transform/MoveToNode';
export { RotationNode } from './nodes/transform/RotationNode';
export { ScaleNode } from './nodes/transform/ScaleNode';
export { Matrix4Node } from './nodes/transform/Matrix4Node';
export { GLTFLoaderNode } from './nodes/loaders/GLTFLoaderNode';
export { Rhino3dmLoaderNode } from './nodes/loaders/Rhino3dmLoaderNode';

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

  registry.register(Vector3DecomposeNode, {
    type: 'Vector3DecomposeNode',
    category: 'Data',
    label: 'Vector3 Decompose',
    description: 'Decomposes a Vector3 into X, Y, Z components',
    icon: '🔀',
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

  registry.register(MeshBasicMaterialNode, {
    type: 'MeshBasicMaterialNode',
    category: 'Material',
    label: 'Basic Material',
    description: 'Creates a basic (unlit) material',
  });

  registry.register(MeshPhongMaterialNode, {
    type: 'MeshPhongMaterialNode',
    category: 'Material',
    label: 'Phong Material',
    description: 'Creates a Phong material with specular highlights and emissive properties',
    icon: '✨',
  });

  registry.register(MeshToonMaterialNode, {
    type: 'MeshToonMaterialNode',
    category: 'Material',
    label: 'Toon Material',
    description: 'Creates a toon-shaded material',
  });

  registry.register(MeshMatcapMaterialNode, {
    type: 'MeshMatcapMaterialNode',
    category: 'Material',
    label: 'Matcap Material',
    description: 'Creates a matcap material',
  });

  registry.register(PointsMaterialNode, {
    type: 'PointsMaterialNode',
    category: 'Material',
    label: 'Points Material',
    description: 'Creates a material for points',
  });

  registry.register(LineBasicMaterialNode, {
    type: 'LineBasicMaterialNode',
    category: 'Material',
    label: 'Line Basic Material',
    description: 'Creates a basic line material',
  });

  registry.register(LineDashedMaterialNode, {
    type: 'LineDashedMaterialNode',
    category: 'Material',
    label: 'Line Dashed Material',
    description: 'Creates a dashed line material',
  });

  registry.register(SpriteMaterialNode, {
    type: 'SpriteMaterialNode',
    category: 'Material',
    label: 'Sprite Material',
    description: 'Creates a sprite material',
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

  registry.register(Object3DNode, {
    type: 'Object3DNode',
    category: 'Scene',
    label: 'Object3D',
    description: 'Empty Object3D container for grouping and transforms',
    icon: '📦',
  });

  // Register camera nodes
  registry.register(PerspectiveCameraNode, {
    type: 'PerspectiveCameraNode',
    category: 'Camera',
    label: 'Perspective Camera',
    description: 'Creates a perspective camera',
  });

  registry.register(CameraComponentNode, {
    type: 'CameraComponentNode',
    category: 'Camera',
    label: 'Camera Component',
    description: 'Creates a configurable camera (perspective/orthographic)',
    icon: '📷',
  });

  registry.register(ActiveCameraNode, {
    type: 'ActiveCameraNode',
    category: 'Camera',
    label: 'Active Camera',
    description: 'Controls which camera is active in the viewport',
    icon: '🎥',
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

  registry.register(ExtractNode, {
    type: 'ExtractNode',
    category: 'Array',
    label: 'Extract',
    description: 'Extract element(s) from array by index. Returns single value or array of values.',
    icon: '🔍',
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

  // Register animation nodes
  registry.register(FrameNode, {
    type: 'FrameNode',
    category: 'Animation',
    label: 'Frame Loop',
    description: 'Animation loop with deltaTime and elapsedTime outputs',
    icon: '🎬',
  });

  registry.register(UpdatableObjectNode, {
    type: 'UpdatableObjectNode',
    category: 'Animation',
    label: 'Updatable Object',
    description: 'Wraps an object with a custom update function',
    icon: '⚙️',
  });

  // Register math utility nodes
  registry.register(DEG2RADNode, {
    type: 'DEG2RADNode',
    category: 'Math',
    label: 'DEG2RAD',
    description: 'Degrees to radians constant',
  });

  registry.register(RAD2DEGNode, {
    type: 'RAD2DEGNode',
    category: 'Math',
    label: 'RAD2DEG',
    description: 'Radians to degrees constant',
  });

  registry.register(ClampNode, {
    type: 'ClampNode',
    category: 'Math',
    label: 'Clamp',
    description: 'Clamps value between min and max',
  });

  registry.register(LerpNode, {
    type: 'LerpNode',
    category: 'Math',
    label: 'Lerp',
    description: 'Linear interpolation between two values',
  });

  registry.register(InverseLerpNode, {
    type: 'InverseLerpNode',
    category: 'Math',
    label: 'Inverse Lerp',
    description: 'Inverse linear interpolation',
  });

  registry.register(DampNode, {
    type: 'DampNode',
    category: 'Math',
    label: 'Damp',
    description: 'Smooth damping between values',
  });

  registry.register(MapLinearNode, {
    type: 'MapLinearNode',
    category: 'Math',
    label: 'Map Linear',
    description: 'Maps value from one range to another',
  });

  registry.register(SmoothstepNode, {
    type: 'SmoothstepNode',
    category: 'Math',
    label: 'Smoothstep',
    description: 'Smooth interpolation with easing',
  });

  registry.register(SmootherStepNode, {
    type: 'SmootherStepNode',
    category: 'Math',
    label: 'Smoother Step',
    description: 'Smoother interpolation with easing',
  });

  registry.register(PingPongNode, {
    type: 'PingPongNode',
    category: 'Math',
    label: 'Ping Pong',
    description: 'Ping-pong between 0 and length',
  });

  registry.register(EuclideanModuloNode, {
    type: 'EuclideanModuloNode',
    category: 'Math',
    label: 'Euclidean Modulo',
    description: 'Euclidean modulo operation',
  });

  registry.register(RandomNode, {
    type: 'RandomNode',
    category: 'Math',
    label: 'Random',
    description: 'Random float between low and high',
  });

  registry.register(RandIntNode, {
    type: 'RandIntNode',
    category: 'Math',
    label: 'Random Integer',
    description: 'Random integer between low and high',
  });

  registry.register(IsPowerOfTwoNode, {
    type: 'IsPowerOfTwoNode',
    category: 'Math',
    label: 'Is Power of Two',
    description: 'Check if value is power of two',
  });

  registry.register(CeilPowerOfTwoNode, {
    type: 'CeilPowerOfTwoNode',
    category: 'Math',
    label: 'Ceil Power of Two',
    description: 'Round up to next power of two',
  });

  registry.register(FloorPowerOfTwoNode, {
    type: 'FloorPowerOfTwoNode',
    category: 'Math',
    label: 'Floor Power of Two',
    description: 'Round down to previous power of two',
  });

  // Register math operation nodes
  registry.register(AddNode, {
    type: 'AddNode',
    category: 'Math/Operations',
    label: 'Add',
    description: 'Add two numbers',
    icon: '➕',
  });

  registry.register(SubtractNode, {
    type: 'SubtractNode',
    category: 'Math/Operations',
    label: 'Subtract',
    description: 'Subtract two numbers',
    icon: '➖',
  });

  registry.register(MultiplyNode, {
    type: 'MultiplyNode',
    category: 'Math/Operations',
    label: 'Multiply',
    description: 'Multiply two numbers',
    icon: '✖️',
  });

  registry.register(DivideNode, {
    type: 'DivideNode',
    category: 'Math/Operations',
    label: 'Divide',
    description: 'Divide two numbers',
    icon: '➗',
  });

  registry.register(PowerNode, {
    type: 'PowerNode',
    category: 'Math/Operations',
    label: 'Power',
    description: 'Raise base to exponent',
  });

  registry.register(SqrtNode, {
    type: 'SqrtNode',
    category: 'Math/Operations',
    label: 'Square Root',
    description: 'Square root of value',
  });

  registry.register(AbsNode, {
    type: 'AbsNode',
    category: 'Math/Operations',
    label: 'Absolute Value',
    description: 'Absolute value',
  });

  registry.register(MinNode, {
    type: 'MinNode',
    category: 'Math/Operations',
    label: 'Minimum',
    description: 'Minimum of two values',
  });

  registry.register(MaxNode, {
    type: 'MaxNode',
    category: 'Math/Operations',
    label: 'Maximum',
    description: 'Maximum of two values',
  });

  registry.register(DistanceNode, {
    type: 'DistanceNode',
    category: 'Math/Operations',
    label: 'Distance',
    description: 'Distance between two Vector3s',
  });

  registry.register(DotProductNode, {
    type: 'DotProductNode',
    category: 'Math/Operations',
    label: 'Dot Product',
    description: 'Dot product of two Vector3s',
  });

  registry.register(CrossProductNode, {
    type: 'CrossProductNode',
    category: 'Math/Operations',
    label: 'Cross Product',
    description: 'Cross product of two Vector3s',
  });

  // Register geometry utility nodes
  registry.register(MergeGeometriesNode, {
    type: 'MergeGeometriesNode',
    category: 'Geometry/Utils',
    label: 'Merge Geometries',
    description: 'Merge multiple geometries into one',
  });

  registry.register(MergeVerticesNode, {
    type: 'MergeVerticesNode',
    category: 'Geometry/Utils',
    label: 'Merge Vertices',
    description: 'Merge duplicate vertices',
  });

  registry.register(InterleaveAttributesNode, {
    type: 'InterleaveAttributesNode',
    category: 'Geometry/Utils',
    label: 'Interleave Attributes',
    description: 'Interleave geometry attributes',
  });

  registry.register(ComputeMikkTSpaceNode, {
    type: 'ComputeMikkTSpaceNode',
    category: 'Geometry/Utils',
    label: 'Compute MikkTSpace',
    description: 'Compute tangent space using MikkTSpace',
  });

  registry.register(ComputeMorphedAttributesNode, {
    type: 'ComputeMorphedAttributesNode',
    category: 'Geometry/Utils',
    label: 'Compute Morphed Attributes',
    description: 'Compute morphed attributes for mesh',
  });

  registry.register(DeepCloneAttributeNode, {
    type: 'DeepCloneAttributeNode',
    category: 'Geometry/Utils',
    label: 'Deep Clone Attribute',
    description: 'Deep clone a geometry attribute',
  });

  registry.register(EstimateBytesUsedNode, {
    type: 'EstimateBytesUsedNode',
    category: 'Geometry/Utils',
    label: 'Estimate Bytes Used',
    description: 'Estimate memory usage of geometry',
  });

  registry.register(ToTrianglesDrawModeNode, {
    type: 'ToTrianglesDrawModeNode',
    category: 'Geometry/Utils',
    label: 'To Triangles',
    description: 'Convert geometry to triangle draw mode',
  });

  registry.register(ConvertToIndexedNode, {
    type: 'ConvertToIndexedNode',
    category: 'Geometry/Utils',
    label: 'Convert To Indexed',
    description: 'Convert geometry to indexed format',
  });

  // Register transform nodes
  registry.register(PositionNode, {
    type: 'PositionNode',
    category: 'Transform',
    label: 'Position',
    description: 'Set position of an Object3D',
    icon: '📍',
  });

  registry.register(MoveToNode, {
    type: 'MoveToNode',
    category: 'Transform',
    label: 'Move To',
    description: 'Move Object3D relative to current position',
    icon: '➡️',
  });

  registry.register(RotationNode, {
    type: 'RotationNode',
    category: 'Transform',
    label: 'Rotation',
    description: 'Set rotation of an Object3D',
    icon: '🔄',
  });

  registry.register(ScaleNode, {
    type: 'ScaleNode',
    category: 'Transform',
    label: 'Scale',
    description: 'Set scale of an Object3D',
    icon: '📏',
  });

  registry.register(Matrix4Node, {
    type: 'Matrix4Node',
    category: 'Transform',
    label: 'Matrix4',
    description: 'Apply Matrix4 transformation to an Object3D',
    icon: '🔢',
  });

  // Register loader nodes
  registry.register(GLTFLoaderNode, {
    type: 'GLTFLoaderNode',
    category: 'Loaders',
    label: 'GLTF Loader',
    description: 'Load GLTF/GLB 3D models with animations',
    icon: '📦',
  });

  registry.register(Rhino3dmLoaderNode, {
    type: 'Rhino3dmLoaderNode',
    category: 'Loaders',
    label: 'Rhino 3DM Loader',
    description: 'Load Rhino 3dm files',
    icon: '🦏',
  });

  return registry;
}
